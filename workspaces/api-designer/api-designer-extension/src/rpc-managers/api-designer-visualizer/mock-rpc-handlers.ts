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

import * as vscode from 'vscode';
import * as path from 'path';
import { readFile, writeFile, access } from 'fs/promises';
import { constants } from 'fs';
import { Messenger } from 'vscode-messenger';
import {
    CheckMockServerStatusRequest,
    CheckMockServerStatusResponse,
    GenerateMockConfigRequest,
    GenerateMockConfigResponse,
    GetAvailablePortRequest,
    GetAvailablePortResponse,
    MockServerTool,
    StartMockServerRequest,
    StartMockServerResponse,
    StopMockServerRequest,
    StopMockServerResponse,
    checkMockServerStatus,
    generateMockConfig,
    getAvailablePort,
    startMockServer,
    stopMockServer
} from '@wso2/api-designer-core';
import { generateMockConfig as generateConfig } from '../../mock/mock-config-generators';
import { MockServerManager } from '../../mock/mock-server-manager';
import { logInfo, logError } from '../../util/logger';
import {
    buildAIGeneratedDockerCommand,
    buildPrismDockerCommand,
    buildMokapiDockerCommand
} from '../../mock/docker-utils';
import { generatePackageJson } from '../../mock/dependency-detector';

const CONTEXT = 'MockRpcHandlers';

/**
 * Register mock server RPC handlers
 */
export function registerMockRpcHandlers(messenger: Messenger): void {
    const mockServerManager = MockServerManager.getInstance();

    // Generate mock configuration
    messenger.onRequest(generateMockConfig, async (request: GenerateMockConfigRequest): Promise<GenerateMockConfigResponse> => {
        try {
            logInfo(`${CONTEXT}: Generating mock config for ${request.filePath}`);

            const { configContent, startCommand, configFileName } = await generateConfig(
                request.filePath,
                request.config
            );

            // Determine output path
            const openApiDir = path.dirname(request.filePath);
            const configPath = request.config.outputPath || path.join(openApiDir, configFileName);

            // Write config file
            await writeFile(configPath, configContent, 'utf8');

            logInfo(`${CONTEXT}: Mock config generated at ${configPath}`);

            return {
                success: true,
                configPath,
                startCommand,
                message: `Configuration file created at ${configFileName}`
            };
        } catch (error) {
            logError(`${CONTEXT}: Failed to generate mock config`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to generate configuration'
            };
        }
    });

    // Start mock server
    messenger.onRequest(startMockServer, async (request: StartMockServerRequest): Promise<StartMockServerResponse> => {
        try {
            logInfo(`${CONTEXT}: Starting mock server for ${request.filePath}`);

            // Get workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace folder open');
            }

            const openApiDir = path.dirname(request.filePath);
            let startCommand: string;
            let configContent: string | undefined;
            let configFileName: string | undefined;

            // For AI-generated JS, get the path from config or auto-detect
            if (request.config.tool === MockServerTool.AI_GENERATED_JS) {
                // Get API definition to find mockServerPath
                const { SpecContentManager } = await import('./managers/spec-content-manager');
                const { ProjectManager } = await import('./managers/project-manager');
                const specContentManager = new SpecContentManager();
                const projectManager = new ProjectManager(specContentManager);
                const apiDefResponse = await projectManager.getApiDefinition({
                    filePath: request.filePath
                });

                let mockServerPath = apiDefResponse.apiDefinition?.mockServerPath;

                // If mockServerPath is not in config, try to auto-detect it
                if (!mockServerPath) {
                    const apiFileName = path.basename(request.filePath);
                    const expectedServerFileName = apiFileName.replace(/\.(yaml|yml|json)$/i, '') + '.mock-server.js';
                    const expectedServerPath = path.join(openApiDir, expectedServerFileName);
                    
                    // Check if the file exists (silently handle ENOENT)
                    try {
                        await access(expectedServerPath, constants.F_OK);
                        mockServerPath = expectedServerFileName;
                        logInfo(`${CONTEXT}: Auto-detected mock server file: ${expectedServerFileName}`);
                        
                        // Try to save it to config (non-blocking)
                        try {
                            const configResponse = await projectManager.getApiPlatformConfig({
                                workspaceUri: openApiDir,
                                filePath: request.filePath
                            });
                            
                            if (configResponse.success && configResponse.config) {
                                const config = configResponse.config;
                                let apiDef = config.api;
                                
                                if (!apiDef) {
                                    // Detect spec type
                                    const specContent = await readFile(request.filePath, 'utf8');
                                    const { detectSpecType, ApiSpecType } = await import('@wso2/api-designer-core');
                                    const detection = detectSpecType(specContent);
                                    
                                    apiDef = {
                                        [detection.type === ApiSpecType.ASYNCAPI ? 'asyncapi' : 'openapi']: apiFileName
                                    };
                                    config.api = apiDef;
                                }
                                
                                apiDef.mockServerPath = expectedServerFileName;
                                
                                await projectManager.updateApiPlatformConfig({
                                    workspaceUri: openApiDir,
                                    config: config,
                                    filePath: request.filePath
                                });
                                
                                logInfo(`${CONTEXT}: Auto-saved mock server path to config: ${expectedServerFileName}`);
                            }
                        } catch (configError) {
                            logInfo(`${CONTEXT}: Failed to auto-save config, but using detected path: ${configError}`);
                        }
                    } catch {
                        // File doesn't exist, continue without auto-detection
                    }
                }

                if (!mockServerPath) {
                    throw new Error('Mock server path not configured. Please generate the server with AI and save the path first.');
                }
                // Resolve the full path
                const serverFilePath = path.isAbsolute(mockServerPath) 
                    ? mockServerPath 
                    : path.join(openApiDir, mockServerPath);

                try {
                    await access(serverFilePath, constants.F_OK);
                } catch {
                    throw new Error(`Mock server file not found: ${serverFilePath}. Please generate the server with AI first.`);
                }

                // Generate package.json content for AI-generated server (for Docker)
                // We'll create it inside the container, not in the workspace, to avoid workspace pollution
                let packageJsonContent: string | undefined;
                try {
                    packageJsonContent = await generatePackageJson(serverFilePath, openApiDir);
                    logInfo(`${CONTEXT}: Generated package.json content for AI-generated mock server (will be created inside Docker container)`);
                } catch (error) {
                    logError(`${CONTEXT}: Failed to generate package.json, continuing anyway:`, error);
                }

                // Build Docker command for AI-generated server
                // package.json will be created inside the container, not in the workspace
                const port = request.config.port || 4010;
                const host = request.config.host || 'localhost';
                startCommand = buildAIGeneratedDockerCommand(serverFilePath, openApiDir, port, host, packageJsonContent);
                logInfo(`${CONTEXT}: Starting AI-generated mock server with Docker: ${startCommand}`);
            } else {
                // For other tools, use Docker commands
                const port = request.config.port || 4010;
                const host = request.config.host || 'localhost';
                
                if (request.config.tool === MockServerTool.PRISM) {
                    startCommand = buildPrismDockerCommand(
                        request.filePath,
                        openApiDir,
                        port,
                        host,
                        request.config.features || {}
                    );
                    logInfo(`${CONTEXT}: Starting Prism mock server with Docker: ${startCommand}`);
                } else if (request.config.tool === MockServerTool.MOKAPI) {
                    startCommand = buildMokapiDockerCommand(
                        request.filePath,
                        openApiDir,
                        port,
                        host
                    );
                    logInfo(`${CONTEXT}: Starting AsyncAPI Studio mock server with Docker: ${startCommand}`);
                } else {
                    // Fallback: generate config for other tools (shouldn't happen with current supported tools)
                    const result = await generateConfig(request.filePath, request.config);
                    startCommand = result.startCommand;
                    configContent = result.configContent;
                    configFileName = result.configFileName;
                }
            }

            // Start the server using Docker
            const result = await mockServerManager.startServerWithDocker(
                startCommand,
                request.config,
                request.filePath, // Pass filePath for per-spec tracking
                openApiDir
            );

            return {
                success: true,
                port: result.port,
                url: result.url,
                terminalName: `Docker: ${path.basename(request.filePath)} (${result.containerId.substring(0, 12)})`,
                message: `Mock server started on ${result.url} using Docker`
            };
        } catch (error) {
            logError(`${CONTEXT}: Failed to start mock server`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to start mock server'
            };
        }
    });

    // Check mock server status
    messenger.onRequest(checkMockServerStatus, async (request: CheckMockServerStatusRequest): Promise<CheckMockServerStatusResponse> => {
        try {
            // Require filePath - no port-based fallback
            if (!request.filePath) {
            return {
                status: {
                    isRunning: false
                }
            };
            }
            const status = await mockServerManager.checkServerStatusByFilePath(request.filePath);
            return { status };
        } catch (error) {
            logError(`${CONTEXT}: Failed to check mock server status`, error);
            return {
                status: {
                    isRunning: false
                }
            };
        }
    });

    // Stop mock server
    messenger.onRequest(stopMockServer, async (request: StopMockServerRequest): Promise<StopMockServerResponse> => {
        try {
            // Require filePath - no port-based fallback
            if (!request.filePath) {
                return {
                    success: false,
                    message: 'filePath is required to stop mock server'
                };
            }
            
            logInfo(`${CONTEXT}: Stopping mock server for ${request.filePath}`);
            const success = await mockServerManager.stopServerByFilePath(request.filePath);
            const message = success ? `Mock server for ${request.filePath} stopped` : `Failed to stop mock server for ${request.filePath}`;

            return {
                success,
                message
            };
        } catch (error) {
            logError(`${CONTEXT}: Failed to stop mock server`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to stop mock server'
            };
        }
    });

    // Get available port
    messenger.onRequest(getAvailablePort, async (request: GetAvailablePortRequest): Promise<GetAvailablePortResponse> => {
        try {
            const port = await mockServerManager.findAvailablePort(request.preferredPort);
            return { port };
        } catch (error) {
            logError(`${CONTEXT}: Failed to find available port`, error);
            // Return a default port if we can't find one
            return { port: 4010 };
        }
    });

    logInfo(`${CONTEXT}: Mock server RPC handlers registered`);
}

