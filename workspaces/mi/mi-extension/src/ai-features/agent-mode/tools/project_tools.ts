/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { ToolResult } from './types';
import { MiVisualizerRpcManager } from '../../../rpc-managers/mi-visualizer/rpc-manager';
import { MILanguageClient } from '../../../lang-client/activator';
import { getMIVersionFromPom } from '../../../util/onboardingUtils';
import { APIS } from '../../../constants';
import { DependencyDetails } from '@wso2/mi-core';
import * as path from 'path';
import * as fs from 'fs';
import { logDebug, logError } from '../../copilot/logger';

// ============================================================================
// Execute Function Types
// ============================================================================

export type AddConnectorExecuteFn = (args: {
    connector_names: string[];
}) => Promise<ToolResult>;

export type RemoveConnectorExecuteFn = (args: {
    connector_names: string[];
}) => Promise<ToolResult>;

export type ValidateCodeExecuteFn = (args: {
    file_paths: string[];
}) => Promise<ToolResult>;

// ============================================================================
// Execute Functions
// ============================================================================

/**
 * Creates the execute function for add_connector tool
 */
export function createAddConnectorExecute(projectPath: string): AddConnectorExecuteFn {
    return async (args: { connector_names: string[] }): Promise<ToolResult> => {
        const { connector_names } = args;

        logDebug(`[AddConnectorTool] Adding ${connector_names.length} connector(s): ${connector_names.join(', ')}`);

        if (connector_names.length === 0) {
            return {
                success: false,
                message: 'At least one connector name must be provided.',
                error: 'Error: No connector names provided'
            };
        }

        try {
            const miVisualizerRpcManager = new MiVisualizerRpcManager(projectPath);

            // Get MI runtime version from pom.xml
            const runtimeVersion = await getMIVersionFromPom(projectPath);
            logDebug(`[AddConnectorTool] Runtime version: ${runtimeVersion}`);

            // Fetch connector store data
            const connectorStoreResponse = await fetch(
                APIS.MI_CONNECTOR_STORE_BACKEND.replace('${version}', runtimeVersion ?? '')
            );

            logDebug(`[AddConnectorTool] Fetching connectors from: ${APIS.MI_CONNECTOR_STORE_BACKEND.replace('${version}', runtimeVersion ?? '')}`);
            logDebug(`[AddConnectorTool] Fetching connectors from: ${APIS.MI_CONNECTOR_STORE_BACKEND}`);

            if (!connectorStoreResponse.ok) {
                const errorMsg = `Failed to fetch connector store: ${connectorStoreResponse.status} ${connectorStoreResponse.statusText}`;
                logError(`[AddConnectorTool] ${errorMsg}`);
                return {
                    success: false,
                    message: errorMsg
                };
            }

            const connectorStoreData = await connectorStoreResponse.json();

            // Validate that response is an array
            if (!Array.isArray(connectorStoreData)) {
                logError('[AddConnectorTool] Connector store API did not return an array', connectorStoreData);
                return {
                    success: false,
                    message: 'Invalid response from connector store API'
                };
            }

            logDebug(`[AddConnectorTool] Fetched ${connectorStoreData.length} connectors from store`);

            const results: Array<{ name: string; success: boolean; error?: string }> = [];

            // Add each connector
            for (const connectorName of connector_names) {
                try {
                    // Match by connectorName field (case-insensitive)
                    const connector = connectorStoreData.find(
                        (c: any) => c.connectorName?.toLowerCase() === connectorName.toLowerCase()
                    );

                    if (!connector) {
                        results.push({
                            name: connectorName,
                            success: false,
                            error: 'Connector not found in connector store'
                        });
                        continue;
                    }

                    // Prepare dependency details
                    const dependencies: DependencyDetails[] = [{
                        groupId: connector.mavenGroupId,
                        artifact: connector.mavenArtifactId,
                        version: connector.version?.tagName,
                        type: "zip"
                    }];

                    logDebug(`[AddConnectorTool] Adding connector: ${connectorName} (${connector.mavenArtifactId}:${connector.version?.tagName})`);

                    // Add dependency to pom.xml
                    const response = await miVisualizerRpcManager.updateAiDependencies({
                        dependencies,
                        operation: 'add'
                    });

                    if (response) {
                        results.push({ name: connectorName, success: true });
                    } else {
                        results.push({
                            name: connectorName,
                            success: false,
                            error: 'Failed to update pom.xml'
                        });
                    }
                } catch (error) {
                    results.push({
                        name: connectorName,
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }

            logDebug(`[AddConnectorTool] Results: ${JSON.stringify(results)}`);

            // Update connector dependencies (refresh connector list)
            try {
                await miVisualizerRpcManager.updateConnectorDependencies();
                logDebug('[AddConnectorTool] Connector dependencies updated');
            } catch (updateError) {
                logError('[AddConnectorTool] Failed to update connector dependencies', updateError);
            }

            // Reload dependencies after adding connectors
            try {
                await miVisualizerRpcManager.reloadDependencies();
                logDebug('[AddConnectorTool] Dependencies reloaded successfully');
            } catch (error) {
                logDebug(`[AddConnectorTool] Warning: Failed to reload dependencies: ${error instanceof Error ? error.message : String(error)}`);
            }

            // Build response message
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            let message = '';
            if (successful.length > 0) {
                message += `Successfully added ${successful.length} connector(s):\n`;
                successful.forEach(r => {
                    message += `  ✓ ${r.name}\n`;
                });
            }

            if (failed.length > 0) {
                message += `\nFailed to add ${failed.length} connector(s):\n`;
                failed.forEach(r => {
                    message += `  ✗ ${r.name}: ${r.error}\n`;
                });
            }

            logDebug(`[AddConnectorTool] Added ${successful.length}/${connector_names.length} connectors`);

            return {
                success: successful.length > 0,
                message: message.trim()
            };
        } catch (error) {
            logError(`[AddConnectorTool] Error adding connectors: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: 'Failed to add connectors',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    };
}

/**
 * Creates the execute function for remove_connector tool
 */
export function createRemoveConnectorExecute(projectPath: string): RemoveConnectorExecuteFn {
    return async (args: { connector_names: string[] }): Promise<ToolResult> => {
        const { connector_names } = args;

        logDebug(`[RemoveConnectorTool] Removing ${connector_names.length} connector(s): ${connector_names.join(', ')}`);

        if (connector_names.length === 0) {
            return {
                success: false,
                message: 'At least one connector name must be provided.',
                error: 'Error: No connector names provided'
            };
        }

        try {
            const miVisualizerRpcManager = new MiVisualizerRpcManager(projectPath);

            // Get MI runtime version from pom.xml
            const runtimeVersion = await getMIVersionFromPom(projectPath);
            logDebug(`[RemoveConnectorTool] Runtime version: ${runtimeVersion}`);

            // Fetch connector store data
            const connectorStoreResponse = await fetch(
                APIS.MI_CONNECTOR_STORE_BACKEND.replace('${version}', runtimeVersion ?? '')
            );

            if (!connectorStoreResponse.ok) {
                const errorMsg = `Failed to fetch connector store: ${connectorStoreResponse.status} ${connectorStoreResponse.statusText}`;
                logError(`[RemoveConnectorTool] ${errorMsg}`);
                return {
                    success: false,
                    message: errorMsg
                };
            }

            const connectorStoreData = await connectorStoreResponse.json();

            // Validate that response is an array
            if (!Array.isArray(connectorStoreData)) {
                logError('[RemoveConnectorTool] Connector store API did not return an array', connectorStoreData);
                return {
                    success: false,
                    message: 'Invalid response from connector store API'
                };
            }

            logDebug(`[RemoveConnectorTool] Fetched ${connectorStoreData.length} connectors from store`);

            const results: Array<{ name: string; success: boolean; error?: string }> = [];

            // Remove each connector
            for (const connectorName of connector_names) {
                try {
                    // Match by connectorName field (case-insensitive)
                    const connector = connectorStoreData.find(
                        (c: any) => c.connectorName?.toLowerCase() === connectorName.toLowerCase()
                    );

                    if (!connector) {
                        results.push({
                            name: connectorName,
                            success: false,
                            error: 'Connector not found in connector store'
                        });
                        continue;
                    }

                    // Prepare dependency details
                    const dependencies: DependencyDetails[] = [{
                        groupId: connector.mavenGroupId,
                        artifact: connector.mavenArtifactId,
                        version: connector.version?.tagName,
                        type: "zip"
                    }];

                    logDebug(`[RemoveConnectorTool] Removing connector: ${connectorName} (${connector.mavenArtifactId}:${connector.version?.tagName})`);

                    // Remove dependency from pom.xml
                    const response = await miVisualizerRpcManager.updateAiDependencies({
                        dependencies,
                        operation: 'remove'
                    });

                    if (response) {
                        results.push({ name: connectorName, success: true });
                    } else {
                        results.push({
                            name: connectorName,
                            success: false,
                            error: 'Failed to update pom.xml'
                        });
                    }
                } catch (error) {
                    results.push({
                        name: connectorName,
                        success: false,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }

            logDebug(`[RemoveConnectorTool] Results: ${JSON.stringify(results)}`);

            // Update connector dependencies (refresh connector list)
            try {
                await miVisualizerRpcManager.updateConnectorDependencies();
                logDebug('[RemoveConnectorTool] Connector dependencies updated');
            } catch (updateError) {
                logError('[RemoveConnectorTool] Failed to update connector dependencies', updateError);
            }

            // Reload dependencies after removing connectors
            try {
                await miVisualizerRpcManager.reloadDependencies();
                logDebug('[RemoveConnectorTool] Dependencies reloaded successfully');
            } catch (error) {
                logDebug(`[RemoveConnectorTool] Warning: Failed to reload dependencies: ${error instanceof Error ? error.message : String(error)}`);
            }

            // Build response message
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            let message = '';
            if (successful.length > 0) {
                message += `Successfully removed ${successful.length} connector(s):\n`;
                successful.forEach(r => {
                    message += `  ✓ ${r.name}\n`;
                });
            }

            if (failed.length > 0) {
                message += `\nFailed to remove ${failed.length} connector(s):\n`;
                failed.forEach(r => {
                    message += `  ✗ ${r.name}: ${r.error}\n`;
                });
            }

            logDebug(`[RemoveConnectorTool] Removed ${successful.length}/${connector_names.length} connectors`);

            return {
                success: successful.length > 0,
                message: message.trim()
            };
        } catch (error) {
            logError(`[RemoveConnectorTool] Error removing connectors: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: 'Failed to remove connectors',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    };
}

/**
 * Creates the execute function for validate_code tool
 */
export function createValidateCodeExecute(projectPath: string): ValidateCodeExecuteFn {
    return async (args: { file_paths: string[] }): Promise<ToolResult> => {
        const { file_paths } = args;

        logDebug(`[ValidateCodeTool] Validating ${file_paths.length} file(s)`);

        if (file_paths.length === 0) {
            return {
                success: false,
                message: 'At least one file path must be provided.',
                error: 'Error: No file paths provided'
            };
        }

        try {
            const langClient = await MILanguageClient.getInstance(projectPath);
            if (!langClient) {
                return {
                    success: false,
                    message: 'Language client not available',
                    error: 'Error: Language client not initialized'
                };
            }

            const results: Array<{
                file: string;
                diagnostics: any[];
                hasErrors: boolean;
                hasWarnings: boolean;
            }> = [];

            // Validate each file
            for (const filePath of file_paths) {
                try {
                    // Resolve relative paths against project path
                    const absolutePath = path.isAbsolute(filePath)
                        ? filePath
                        : path.join(projectPath, filePath);

                    // Check if file exists
                    if (!fs.existsSync(absolutePath)) {
                        results.push({
                            file: filePath,
                            diagnostics: [{
                                severity: 1, // Error
                                message: 'File not found',
                                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
                            }],
                            hasErrors: true,
                            hasWarnings: false
                        });
                        continue;
                    }

                    // Get diagnostics from language server
                    const diagnosticsResponse = await langClient.getDiagnostics({
                        documentUri: absolutePath
                    });

                    const diagnostics = diagnosticsResponse.diagnostics || [];
                    const hasErrors = diagnostics.some((d: any) => d.severity === 1);
                    const hasWarnings = diagnostics.some((d: any) => d.severity === 2);

                    results.push({
                        file: filePath,
                        diagnostics: diagnostics,
                        hasErrors,
                        hasWarnings
                    });
                } catch (error) {
                    results.push({
                        file: filePath,
                        diagnostics: [{
                            severity: 1,
                            message: error instanceof Error ? error.message : String(error),
                            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
                        }],
                        hasErrors: true,
                        hasWarnings: false
                    });
                }
            }

            // Build response message
            const filesWithErrors = results.filter(r => r.hasErrors);
            const filesWithWarnings = results.filter(r => r.hasWarnings && !r.hasErrors);
            const filesClean = results.filter(r => !r.hasErrors && !r.hasWarnings);

            let message = '';

            if (filesClean.length > 0) {
                message += `✓ ${filesClean.length} file(s) validated successfully with no issues:\n`;
                filesClean.forEach(r => {
                    message += `  - ${r.file}\n`;
                });
            }

            if (filesWithWarnings.length > 0) {
                message += `\n⚠ ${filesWithWarnings.length} file(s) have warnings:\n`;
                filesWithWarnings.forEach(r => {
                    message += `  - ${r.file}: ${r.diagnostics.length} warning(s)\n`;
                    r.diagnostics.forEach((d: any, idx: number) => {
                        if (idx < 3) { // Show first 3 warnings
                            message += `    • Line ${d.range?.start?.line || 0}: ${d.message}\n`;
                        }
                    });
                    if (r.diagnostics.length > 3) {
                        message += `    ... and ${r.diagnostics.length - 3} more\n`;
                    }
                });
            }

            if (filesWithErrors.length > 0) {
                message += `\n✗ ${filesWithErrors.length} file(s) have errors:\n`;
                filesWithErrors.forEach(r => {
                    const errorDiagnostics = r.diagnostics.filter((d: any) => d.severity === 1);
                    message += `  - ${r.file}: ${errorDiagnostics.length} error(s)\n`;
                    errorDiagnostics.forEach((d: any, idx: number) => {
                        if (idx < 3) { // Show first 3 errors
                            message += `    • Line ${d.range?.start?.line || 0}: ${d.message}\n`;
                        }
                    });
                    if (errorDiagnostics.length > 3) {
                        message += `    ... and ${errorDiagnostics.length - 3} more\n`;
                    }
                });
            }

            logDebug(`[ValidateCodeTool] Validation complete: ${filesClean.length} clean, ${filesWithWarnings.length} warnings, ${filesWithErrors.length} errors`);

            return {
                success: true,
                message: message.trim()
            };
        } catch (error) {
            logError(`[ValidateCodeTool] Error validating files: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                message: 'Failed to validate files',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    };
}

// ============================================================================
// Tool Definitions (Vercel AI SDK format)
// ============================================================================

const addConnectorInputSchema = z.object({
    connector_names: z.array(z.string())
        .min(1)
        .describe('Array of connector names to add to the project (e.g., ["AI", "Salesforce", "Gmail"])'),
});

const removeConnectorInputSchema = z.object({
    connector_names: z.array(z.string())
        .min(1)
        .describe('Array of connector names to remove from the project (e.g., ["AI", "Salesforce"])'),
});

const validateCodeInputSchema = z.object({
    file_paths: z.array(z.string())
        .min(1)
        .describe('Array of file paths to validate (relative to project root or absolute paths). Example: ["src/main/wso2mi/artifacts/apis/MyAPI.xml"]'),
});

/**
 * Creates the add_connector tool
 */
export function createAddConnectorTool(execute: AddConnectorExecuteFn) {
    return (tool as any)({
        description: `
            Adds MI connectors or inbound endpoints to the project.

            This tool:
            - Fetches connector metadata from the MI Connector Store
            - Adds connector dependencies to pom.xml
            - Updates project configuration
            - Reloads dependencies to ensure connectors are available

            Usage:
            - Use this tool when you need to add connectors that are referenced in Synapse configurations
            - The connector must exist in the available connectors list
            - Common connectors: AI, Salesforce, Gmail, File, HTTP, SOAP, etc.

            When to use:
            - After writing Synapse XML that uses connector operations (e.g., <salesforce.query>)
            - Before validating code that references connectors
            - When the user explicitly requests to add a connector

            Important:
            - Connector names should match the available connectors list (see <AVAILABLE_CONNECTORS>)
            - The tool automatically handles Maven dependency resolution
            - Dependencies are reloaded after adding connectors

            Example:
            - To add AI and Salesforce connectors: connector_names: ["AI", "Salesforce"]`,
        inputSchema: addConnectorInputSchema,
        execute
    });
}

/**
 * Creates the remove_connector tool
 */
export function createRemoveConnectorTool(execute: RemoveConnectorExecuteFn) {
    return (tool as any)({
        description: `
            Removes MI connectors or inbound endpoints from the project.

            This tool:
            - Removes connector dependencies from pom.xml
            - Updates project configuration
            - Reloads dependencies to reflect changes

            Usage:
            - Use this tool to clean up unused connectors
            - Helps reduce project size and dependency conflicts

            When to use:
            - When removing Synapse configurations that use specific connectors
            - When the user explicitly requests to remove a connector
            - During project cleanup

            Important:
            - Only removes connectors that are currently in the project
            - Dependencies are reloaded after removing connectors
            - Removing a connector will cause validation errors if it's still used in Synapse configs

            Example:
            - To remove AI connector: connector_names: ["AI"]`,
        inputSchema: removeConnectorInputSchema,
        execute
    });
}

/**
 * Creates the validate_code tool
 */
export function createValidateCodeTool(execute: ValidateCodeExecuteFn) {
    return (tool as any)({
        description: `
            Validates Synapse XML configuration files using the LemMinx XML Language Server.

            This tool:
            - Checks XML syntax and structure
            - Validates against Synapse schema
            - Reports errors and warnings with line numbers
            - Works with any Synapse artifact type (API, Sequence, Endpoint, etc.)

            Usage:
            - Use this tool after creating or editing Synapse XML files
            - Validates multiple files in a single call
            - Returns detailed diagnostics for each file

            When to use:
            - After using file_write or file_edit tools
            - Before completing a task to ensure code quality
            - When the user requests validation
            - To check for errors in existing files

            Important:
            - File paths can be relative to project root or absolute
            - Standard Synapse artifact paths:
              * APIs: src/main/wso2mi/artifacts/apis/
              * Sequences: src/main/wso2mi/artifacts/sequences/
              * Endpoints: src/main/wso2mi/artifacts/endpoints/
              * Proxy Services: src/main/wso2mi/artifacts/proxy-services/
            - Ensure required connectors are added before validating files that use them

            Example:
            - Validate an API: file_paths: ["src/main/wso2mi/artifacts/apis/UserAPI.xml"]
            - Validate multiple files: file_paths: ["src/main/wso2mi/artifacts/apis/UserAPI.xml", "src/main/wso2mi/artifacts/sequences/ProcessUser.xml"]`,
        inputSchema: validateCodeInputSchema,
        execute
    });
}
