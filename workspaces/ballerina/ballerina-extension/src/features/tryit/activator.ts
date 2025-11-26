/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { commands, window, workspace, FileSystemWatcher, Disposable, Uri } from "vscode";
import { clearTerminal, PALETTE_COMMANDS } from "../project/cmds/cmd-runner";
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { BallerinaExtension } from "src/core";
import { clientManager, findRunningBallerinaProcesses, handleError, waitForBallerinaService } from "./utils";
import { createBrunoCollectionStructure } from "./bruno-utils";
import { BIDesignModelResponse, OpenAPISpec } from "@wso2/ballerina-core";
import { getProjectWorkingDirectory } from "../../utils/file-utils";
import { startDebugging } from "../editor-support/activator";
import { v4 as uuidv4 } from "uuid";
import { createGraphqlView } from "../../views/graphql";
import { StateMachine } from "../../stateMachine";
import { getCurrentProjectRoot } from "../../utils/project-utils";

const BRUNO_EXTENSION_ID = 'bruno-api-client.bruno';

/**
 * Check if Bruno extension is installed
 */
function isBrunoInstalled(): boolean {
    return vscode.extensions.getExtension(BRUNO_EXTENSION_ID) !== undefined;
}

/**
 * Prompt user to install Bruno extension
 */
async function promptBrunoInstallation(): Promise<boolean> {
    const choice = await vscode.window.showWarningMessage(
        'The Bruno extension is required for the Try It feature. Would you like to install it?',
        'Install Bruno',
        'Cancel'
    );

    if (choice === 'Install Bruno') {
        try {
            await vscode.commands.executeCommand('workbench.extensions.installExtension', BRUNO_EXTENSION_ID);
            vscode.window.showInformationMessage('Bruno extension installed successfully. Please reload VS Code.');
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to install Bruno extension: ${error}`);
            return false;
        }
    }

    return false;
}

export function activateTryItCommand(ballerinaExtInstance: BallerinaExtension) {
    try {
        clientManager.setClient(ballerinaExtInstance.langClient);

        // Register try it command handler
        const disposable = commands.registerCommand(PALETTE_COMMANDS.TRY_IT, async (withNotice: boolean = false, resourceMetadata?: ResourceMetadata, serviceMetadata?: ServiceMetadata, filePath?: string) => {
            try {
                await openTryItView(withNotice, resourceMetadata, serviceMetadata, filePath);
            } catch (error) {
                handleError(error, "Opening Try It view failed");
            }
        });

        return disposable;
    } catch (error) {
        handleError(error, "Activating Try It command");
    }
}

async function openTryItView(withNotice: boolean = false, resourceMetadata?: ResourceMetadata, serviceMetadata?: ServiceMetadata, filePath?: string): Promise<void> {
    try {
        if (!clientManager.hasClient()) {
            throw new Error('Ballerina Language Server is not connected');
        }

        const currentProjectRoot = await getCurrentProjectRoot();
        if (!currentProjectRoot) {
            throw new Error('Please open a workspace first');
        }

        // If currentProjectRoot is a file (single file project), use its directory
        // Otherwise, use the current project root
        let projectPath: string;
        try {
            projectPath = getProjectWorkingDirectory(currentProjectRoot);
        } catch (error) {
            throw new Error(`Failed to determine working directory`);
        }

        let services: ServiceInfo[] | null = await getAvailableServices(projectPath);

        // if the getDesignModel() LS API is unavailable, create a ServiceInfo from ServiceMetadata to support Try It functionality. (a fallback logic for Ballerina versions prior to 2201.12.x)
        if (services == null && serviceMetadata && filePath) {
            const service = createServiceInfoFromMetadata(serviceMetadata, projectPath, filePath);
            services = [service];
        }

        if (!services || services.length === 0) {
            vscode.window.showInformationMessage('No services found in the project');
            return;
        }

        if (withNotice) {
            const selection = await vscode.window.showInformationMessage(
                `${services.length} service${services.length === 1 ? '' : 's'} found in the integration. Test with Try It Client?`,
                "Test",
                "Cancel"
            );

            if (selection !== "Test") {
                return;
            }
        } else {
            const processesRunning = await checkBallerinaProcessRunning(projectPath);
            if (!processesRunning) {
                return;
            }
        }

        let selectedService: ServiceInfo;
        // If in resource try it mode, find the service containing the resource path
        if (resourceMetadata) {
            const matchingService = await findServiceForResource(services, resourceMetadata, serviceMetadata);
            if (!matchingService) {
                vscode.window.showErrorMessage(`Could not find a service containing the resource path: ${resourceMetadata.pathValue}`);
                return;
            }

            selectedService = matchingService;
        } else if (services.length > 1) {
            if (serviceMetadata) {
                const matchingService = services.find(service =>
                    service.basePath === serviceMetadata.basePath && compareListeners(service.listener, serviceMetadata.listener)
                );

                if (matchingService) {
                    selectedService = matchingService;
                }
            } else {
                const quickPickItems = services.map(service => ({
                    label: `'${service.basePath}' on ${service.listener.name}`,
                    description: `${service.type} Service`,
                    service
                }));

                const selected = await vscode.window.showQuickPick(quickPickItems, {
                    placeHolder: 'Select a service to try out',
                    title: 'Available Services'
                });

                if (!selected) {
                    return;
                }
                selectedService = selected.service;
            }
        } else {
            selectedService = services[0];
        }

        // Safety check to ensure we have a selected service
        if (!selectedService) {
            vscode.window.showErrorMessage('Failed to select a service for Try It');
            return;
        }

        const targetDir = path.join(projectPath, 'target');
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir);
        }

        if (selectedService.type === ServiceType.HTTP) {
            // Check if Bruno extension is installed
            if (!isBrunoInstalled()) {
                const installed = await promptBrunoInstallation();
                if (!installed) {
                    vscode.window.showInformationMessage('Bruno extension is required for Try It. Please install it to continue.');
                    return;
                }
            }

            const openapiSpec: OAISpec = await getOpenAPIDefinition(selectedService);
            const selectedPort: number = await getServicePort(projectPath, selectedService, openapiSpec);
            selectedService.port = selectedPort;

            // Create Test Directory
            const testDirPath = path.join(projectPath, 'test-api');
            if (!fs.existsSync(testDirPath)) {
                fs.mkdirSync(testDirPath);
            }
            const collectionDirUri = await generateTryItFileContent(testDirPath, openapiSpec, selectedService, resourceMetadata);
            if (collectionDirUri) {
                // Open the Bruno collection directory
                await vscode.commands.executeCommand('vscode.openFolder', collectionDirUri, false);
                vscode.window.showInformationMessage(`Bruno collection created at: ${collectionDirUri.fsPath}`);
            }
        } else if (selectedService.type === ServiceType.GRAPHQL) {
            const selectedPort: number = await getServicePort(projectPath, selectedService);
            const port = selectedPort;
            const path = selectedService.basePath;
            const service = `http://localhost:${port}${path}`;
            await createGraphqlView(service);
        } else if (selectedService.type === ServiceType.MCP) {
            const selectedPort: number = await getServicePort(projectPath, selectedService);
            selectedService.port = selectedPort;
            const path = selectedService.basePath;
            const serviceUrl = `http://localhost:${selectedPort}${path}`;

            await openMcpInspector(serviceUrl);
        } else {
            const selectedPort: number = await getServicePort(projectPath, selectedService);
            selectedService.port = selectedPort;

            await openChatView(selectedService.basePath, selectedPort.toString());
        }
    } catch (error) {
        handleError(error, "Opening Try It view");
    }
}

// Generic utility function for opening files in split view
async function openInSplitView(fileUri: vscode.Uri, editorType: string = 'default') {
    try {
        // Ensure we have a two-column layout
        await vscode.commands.executeCommand('workbench.action.editorLayoutTwoColumns');

        // Focus right editor group explicitly
        await vscode.commands.executeCommand('workbench.action.focusSecondEditorGroup');

        // Open the file with specified editor type in the current (right) group
        if (editorType === 'default') {
            await vscode.commands.executeCommand('vscode.open', fileUri);
        } else {
            await vscode.commands.executeCommand('vscode.openWith', fileUri, editorType);
        }

        // Focus left editor group to return to the original editor
        await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
    } catch (error) {
        handleError(error, "Opening file in split view");
    }
}

async function openChatView(basePath: string, port: string) {
    try {
        const baseUrl = `http://localhost:${port}`;
        const chatPath = "chat";

        const serviceEp = new URL(basePath, baseUrl);
        const cleanedServiceEp = serviceEp.pathname.replace(/\/$/, '') + "/" + chatPath.replace(/^\//, '');
        const chatEp = new URL(cleanedServiceEp, serviceEp.origin);

        const sessionId = uuidv4();

        commands.executeCommand("ballerina.open.agent.chat", { chatEp: chatEp.href, chatSessionId: sessionId });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to call Chat-Agent: ${error}`);
    }
}

async function openMcpInspector(serverUrl: string) {
    const extensionId = 'wso2.mcp-server-inspector';

    const extension = vscode.extensions.getExtension(extensionId);

    if (extension) {
        try {
            await vscode.commands.executeCommand('mcpInspector.openInspectorWithUrl', {
                serverUrl: serverUrl,
                transport: "streamable-http"
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open MCP Inspector: ${error}`);
        }
    } else {
        const choice = await vscode.window.showInformationMessage(
            'MCP Inspector extension is required. Would you like to install it?',
            'Install',
            'Cancel'
        );

        if (choice === 'Install') {
            vscode.commands.executeCommand('workbench.extensions.search', extensionId);
        }
    }
}

async function findServiceForResource(services: ServiceInfo[], resourceMetadata: ResourceMetadata, serviceMetadata: ServiceMetadata): Promise<ServiceInfo | undefined> {
    try {
        // Normalize path values for comparison
        const targetPath = resourceMetadata.pathValue?.trim();
        if (!targetPath) {
            return undefined;
        }

        // check all services' OpenAPI specs to see which one contains the path
        // TODO: Optimize this by checking only the relevant service once we have the lang server support for that
        for (const service of services) {
            try {
                if (serviceMetadata && (service.basePath !== serviceMetadata.basePath || !compareListeners(service.listener, serviceMetadata.listener))) {
                    continue;
                }

                const openapiSpec: OAISpec = await getOpenAPIDefinition(service);
                const matchingPaths = Object.keys(openapiSpec.paths || {}).filter((specPath) => {
                    return comparePathPatterns(specPath, targetPath);

                });

                if (matchingPaths.length > 0) {
                    return service;
                }
            } catch (error) {
                continue;
            }
        }

        return undefined;
    } catch (error) {
        handleError(error, "Finding service for resource", false);
        return undefined;
    }
}

async function getAvailableServices(projectDir: string): Promise<ServiceInfo[] | null> {
    try {
        // const langClient = clientManager.getClient();
        const langClient = StateMachine.langClient();

        const response: BIDesignModelResponse = await langClient.getDesignModel({
            projectPath: projectDir
        }).catch((error: any) => {
            throw new Error(`Failed to get design model: ${error.message || 'Unknown error'}`);
        });

        const services = response.designModel.services
            .filter(({ type }) => {
                const lowerType = type.toLowerCase();
                return lowerType.includes('http') || lowerType.includes('ai') || lowerType.includes('graphql') || lowerType.includes('mcp');
            })
            .map(({ displayName, absolutePath, location, attachedListeners, type }) => {
                const trimmedPath = absolutePath.trim();
                const name = displayName || (trimmedPath.startsWith('/') ? trimmedPath.substring(1) : trimmedPath);

                let serviceType: ServiceType;
                const lowerType = type.toLowerCase();
                if (lowerType.includes('http')) {
                    serviceType = ServiceType.HTTP;
                } else if (lowerType.includes('graphql')) {
                    serviceType = ServiceType.GRAPHQL;
                } else if (lowerType.includes('mcp')) {
                    serviceType = ServiceType.MCP;
                } else {
                    serviceType = ServiceType.AGENT;
                }

                const listener = {
                    name: attachedListeners
                        .map(listenerId => response.designModel.listeners.find(l => l.uuid === listenerId)?.symbol)
                        .filter(Boolean)
                        .join(','),
                    port: attachedListeners
                        .map(listenerId => response.designModel.listeners.find(l => l.uuid === listenerId)?.args.find(arg => arg.key === 'port')?.value)
                        .filter(Boolean)
                        .join(','),
                };

                return {
                    name,
                    basePath: trimmedPath ? trimmedPath : '/',
                    filePath: location.filePath,
                    type: serviceType,
                    listener,
                };
            });

        return services || [];
    } catch (error) {
        return null;
    }
}

async function generateTryItFileContent(targetDir: string, openapiSpec: OAISpec, service: ServiceInfo, resourceMetadata?: ResourceMetadata): Promise<vscode.Uri | undefined> {
    try {
        // Create Bruno collection structure
        const collectionDir = createBrunoCollectionStructure(
            targetDir,
            openapiSpec,
            service.name || 'ballerina-service',
            service.port,
            service.basePath,
            resourceMetadata
        );

        // Return the collection directory URI to open in Bruno
        return vscode.Uri.file(collectionDir);
    } catch (error) {
        handleError(error, "Bruno collection initialization failed");
        return undefined;
    }
}

// Helper function to compare path patterns, considering path parameters
function comparePathPatterns(specPath: string, targetPath: string): boolean {
    const specSegments = specPath.split('/').filter(Boolean);
    const targetSegments = targetPath.split('/').filter(Boolean);

    if (specSegments.length !== targetSegments.length) {
        return false;
    }

    // Compare segments, allowing for path parameters
    for (let i = 0; i < specSegments.length; i++) {
        const specSeg = specSegments[i];
        const targetSeg = sanitizeBallerinaPathSegment(targetSegments[i]);

        // TODO - improve path parameter matching with exact type comparison
        if (specSeg.startsWith('{') && specSeg.endsWith('}') && targetSeg.startsWith('[') && targetSeg.endsWith(']')) {
            continue;
        }

        if (specSeg !== targetSeg) {
            return false;
        }
    }

    return true;
}

async function getOpenAPIDefinition(service: ServiceInfo): Promise<OAISpec> {
    try {
        const langClient = clientManager.getClient();

        const openapiDefinitions: OpenAPISpec | 'NOT_SUPPORTED_TYPE' = await langClient.convertToOpenAPI({
            documentFilePath: service.filePath
        });

        if (openapiDefinitions === 'NOT_SUPPORTED_TYPE') {
            throw new Error(`OpenAPI spec generation failed for the service with base path: '${service.basePath}'`);
        } else if (openapiDefinitions.error) {
            throw new Error(openapiDefinitions.error);
        }

        const matchingDefinition = (openapiDefinitions as OpenAPISpec).content?.filter(content =>
            content.serviceName.toLowerCase() === service?.name.toLowerCase()
            || (service.basePath !== "" && service?.name === '' && content.spec?.servers[0]?.url?.endsWith(service.basePath))
            || (service?.name === '' && content.spec?.servers[0]?.url == undefined) // TODO: Update the condition after fixing the issue in the OpenAPI tool
            || extractPath(content.spec?.servers[0]?.url) === extractPath(service.basePath));

        if (matchingDefinition.length === 0) {
            throw new Error(`Failed to find matching OpenAPI definition: No service matches the base path '${service.basePath}' ${service.name !== '' ? `and service name '${service.name}'` : ''}`);
        }

        if (matchingDefinition.length > 1) {
            throw new Error(`Ambiguous service reference: Multiple matching OpenAPI definitions found for ${service.name !== '' ? `service '${service.name}'` : `base path '${service.basePath}'`}`);
        }

        return matchingDefinition[0].spec as OAISpec;
    } catch (error) {
        handleError(error, "Getting OpenAPI definition", false);
        throw error; // Re-throw to be caught by the caller
    }
}

async function getServicePort(projectDir: string, service: ServiceInfo, openapiSpec?: OAISpec): Promise<number> {
    try {
        // If the service has an anonymous listener, directly use the port defined inline
        if (service.listener.port && !isNaN(parseInt(service.listener.port))) {
            return parseInt(service.listener.port);
        }

        // Try to get default port from OpenAPI spec first
        let portInSpec: number;
        const portInSpecStr = openapiSpec?.servers?.[0]?.variables?.port?.default;
        if (portInSpecStr) {
            const parsedPort = parseInt(portInSpecStr);
            portInSpec = !isNaN(parsedPort) ? parsedPort : undefined;
        }

        const balProcesses = await findRunningBallerinaProcesses(projectDir)
            .catch(error => {
                throw new Error(`Failed to find running Ballerina processes: ${error.message}`);
            });

        if (!balProcesses?.length) {
            throw new Error('No running Ballerina processes found. Please run your service first.');
        }

        const uniquePorts: number[] = [...new Set(balProcesses.flatMap(process => process.ports))];
        if (portInSpec && uniquePorts.includes(portInSpec)) {
            return portInSpec;
        }

        if (uniquePorts.length === 0) {
            throw new Error('No service ports found in running Ballerina processes');
        }

        if (uniquePorts.length === 1) {
            return uniquePorts[0];
        }

        // If multiple ports, prompt user to select one
        const portItems = uniquePorts.map(port => ({
            label: `Port ${port}`, port
        }));

        const selected = await vscode.window.showQuickPick(portItems, {
            placeHolder: `Multiple service ports found. Select the port of the service '${service.name || service.basePath}'`,
            title: 'Select Service Port'
        });

        if (!selected) {
            throw new Error('No port selected for the service');
        }

        return selected.port;
    } catch (error) {
        handleError(error, "Getting service port", false);
        throw error;
    }
}

/**
 * Helper function to detect running Ballerina processes and, prompt the user to run the program if not found
 */
async function checkBallerinaProcessRunning(projectDir: string): Promise<boolean> {
    try {
        const balProcesses = await findRunningBallerinaProcesses(projectDir)
            .catch(error => {
                throw new Error(`Failed to find running Ballerina processes: ${error.message}`);
            });

        if (!balProcesses?.length) {
            const selection = await vscode.window.showWarningMessage(
                'The "Try It" feature requires a running Ballerina service. Would you like to run the integration first?',
                'Run Integration',
                'Cancel'
            );

            if (selection === 'Run Integration') {
                // Execute the run command
                clearTerminal();
                await startDebugging(Uri.file(projectDir), false, false, true);

                // Wait for the Ballerina service(s) to start
                const newProcesses = await waitForBallerinaService(projectDir).then(() => {
                    return findRunningBallerinaProcesses(projectDir);
                });

                return newProcesses?.length > 0;
            }

            return false;
        }

        return true;
    } catch (error) {
        handleError(error, "Checking Ballerina processes", false);
        return false;
    }
}

// helper function to compare listeners
function compareListeners(serviceInfoListener: { name: string, port?: string }, serviceMetadataListener: string): boolean {
    // named listeners
    if (serviceInfoListener.name && serviceMetadataListener === serviceInfoListener.name) {
        return true;
    }

    // anonymous listeners
    if (serviceMetadataListener.startsWith('new http:Listener') && serviceInfoListener.port) {
        // Extract port from 'http:Listener(9090)'
        const portMatch = serviceMetadataListener.match(/new http:Listener\((\d+)\)/);
        if (portMatch && portMatch[1]) {
            const port = parseInt(portMatch[1], 10);
            return port === parseInt(serviceInfoListener.port);
        }
    }

    return false;
}

function sanitizeBallerinaPathSegment(pathSegment: string): string {
    let sanitized = pathSegment.trim();
    // Remove escaped characters
    sanitized = sanitized.replace(/\\/g, '');
    // Remove leading single quote if present
    if (sanitized.startsWith("'")) {
        sanitized = sanitized.substring(1);
    }
    return sanitized;
}

function extractPath(url) {
    let match;

    // Remove escaping backslashes
    url = url.replace(/\\(.)/g, '$1');

    // If the string starts with one or more slashes, remove them.
    if (url.startsWith("/")) {
        return url.replace(/^\/+/, '');
    }

    if (url.includes("://")) {
        // For URLs with a protocol, remove the protocal and host.
        match = url.match(/^(?:[^\/]*:\/\/[^\/]+\/)(.*)$/);
        return match ? match[1] : "";
    } else {
        // For strings without a protocol, discards the part up to the first "/" and returns everything after.
        match = url.match(/^(?:[^\/]+\/)(.*)$/);
        return match ? match[1] : "";
    }
}

function sanitizePath(path) {
    if (!path) { return ''; }

    // Remove leading/trailing whitespace and escape backslashes
    return path.trim().replace(/\\(.)/g, '$1');
}

// Service information interface
enum ServiceType {
    HTTP = 'HTTP',
    AGENT = 'AI Agent',
    GRAPHQL = 'GraphQL',
    MCP = 'MCP'
}

interface ServiceInfo {
    name?: string;
    basePath: string;
    filePath: string;
    port?: number;
    type: ServiceType;
    listener: {
        name: string;
        port?: string;
    };
}

// Main OpenAPI specification interface
interface OAISpec {
    openapi: string;
    info: Info;
    servers?: Server[];
    paths: Record<string, Record<string, Operation>>;
    components?: Components;
}

interface Contact {
    name?: string;
    url?: string;
    email?: string;
}

interface License {
    name: string;
    url?: string;
}

interface Info {
    title: string;
    description?: string;
    version: string;
    contact?: Contact;
    license?: License;
}

interface Schema {
    $ref?: string;
    type?: string;
    properties?: Record<string, Schema>;
    items?: Schema;
    description?: string;
    format?: string;
    default?: any;
    enum?: any[];
}

interface Server {
    url: string;
    description?: string;
    variables?: Record<string, ServerVariable>;
}

interface ServerVariable {
    default: string;
    description?: string;
    enum?: string[];
}

interface Property {
    type: string;
    description?: string;
}

interface Operation {
    summary?: string;
    description?: string;
    parameters?: Parameter[];
    requestBody?: RequestBody;
    responses: Record<string, Response>;
}

interface Parameter {
    name: string;
    in: string;
    description?: string;
    required?: boolean;
    schema?: Schema;
}

interface Content {
    schema: Schema;
}

interface RequestBody {
    description?: string;
    content: Record<string, Content>;
}

interface Response {
    description: string;
    content?: Record<string, Content>;
}

interface Components {
    schemas?: Record<string, Schema>;
}

interface ResourceMetadata {
    methodValue: string;
    pathValue: string;
}

interface ServiceMetadata {
    basePath: string;
    listener: string;
}

function createServiceInfoFromMetadata(serviceMetadata: ServiceMetadata, workspaceRoot: string, filepath?: string): ServiceInfo {
    let listenerPort: string | undefined;
    let listenerName = serviceMetadata.listener;

    // Check if it's an anonymous listener format like 'new http:Listener(9090)'
    const anonymousListenerMatch = serviceMetadata.listener.match(/new http:Listener\((\d+)\)/);
    if (anonymousListenerMatch) {
        listenerPort = anonymousListenerMatch[1];
        listenerName = serviceMetadata.listener;
    }

    // Determine service type - default to HTTP for now since we don't have type info in metadata
    // This could be enhanced to detect other types based on listener or basePath patterns
    const serviceType = ServiceType.HTTP;

    // Generate a service name from the basePath
    const serviceName = serviceMetadata.basePath === '/' ? '/' : serviceMetadata.basePath.replace(/^\/+|\/+$/g, '').replace(/\//g, '_') || 'Service';

    return {
        name: serviceName,
        basePath: serviceMetadata.basePath,
        filePath: filepath ? filepath : workspaceRoot,
        type: serviceType,
        listener: {
            name: listenerName,
            port: listenerPort
        }
    };
}
