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

import { useState, useCallback, useEffect } from 'react';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { MockServerTool, ApiSpecType, detectSpecType, buildMockServerPrompt, SpecificationFactory } from '@wso2/api-designer-core';
import { logger } from '../../../utils/logger';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';

export interface UseMockToolsReturn {
    selectedTool: MockServerTool;
    selectTool: (tool: MockServerTool) => void;
    generateWithAI: (customInstructions?: string) => Promise<void>;
}

/**
 * Hook for managing mock server tool selection and AI generation
 */
export function useMockTools(
    fileUri: string,
    specType: 'openapi' | 'asyncapi' | undefined,
    mockServerPath: string | undefined,
    setMockServerPath: (path: string | undefined) => void,
    setHasConfig: (has: boolean) => void
): UseMockToolsReturn {
    const { rpcClient } = useVisualizerContext();
    const [selectedTool, setSelectedTool] = useState<MockServerTool>(MockServerTool.PRISM);

    // Update default tool based on spec type when it becomes available
    useEffect(() => {
        if (specType && rpcClient) {
            const specService = SpecificationFactory.getServiceFromType(
                specType === 'asyncapi' ? ApiSpecType.ASYNCAPI : ApiSpecType.OPENAPI
            );
            if (specService) {
                const defaultTool = specService.getDefaultMockTool();
                const supportedTools = specService.getSupportedMockTools();
                if (supportedTools.includes(defaultTool)) {
                    setSelectedTool(defaultTool as MockServerTool);
                }
            }
        }
    }, [specType, rpcClient]);

    const selectTool = useCallback((tool: MockServerTool) => {
        setSelectedTool(tool);
    }, []);

    const generateWithAI = useCallback(async (customInstructions?: string) => {
        if (!rpcClient || !fileUri) return;

        try {
            // Get the API spec content for context
            const specResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getAPISpecContent({
                filePath: fileUri
            });
            
            const specContent = specResponse.content;
            const detection = detectSpecType(specContent);
            
            if (detection.type !== ApiSpecType.OPENAPI && detection.type !== ApiSpecType.ASYNCAPI) {
                rpcClient.showErrorNotification('AI-generated JS mock server is only available for OpenAPI and AsyncAPI specifications.');
                return;
            }

            const isOpenAPI = detection.type === ApiSpecType.OPENAPI;
            const specTypeName = isOpenAPI ? 'OpenAPI' : 'AsyncAPI';

            // Generate server filename based on API spec filename
            const apiFileName = fileUri.split('/').pop() || fileUri.split('\\').pop() || (isOpenAPI ? 'openapi.yaml' : 'asyncapi.yaml');
            const serverFileName = apiFileName.replace(/\.(yaml|yml|json)$/i, '') + '.mock-server.js';

            // Build the prompt using centralized prompt builder
            const prompt = buildMockServerPrompt({
                specType: detection.type || ApiSpecType.OPENAPI,
                specFilePath: fileUri,
                mockServerPath: mockServerPath,
                serverFileName: serverFileName,
                customInstructions: customInstructions
            });

            // Open AI chat with the prompt
            postVSCodeMessage({
                command: 'openAIChat',
                data: {
                    context: `${specTypeName} Specification:\n${specContent.substring(0, 1000)}...`,
                    prompt
                }
            });

            // Automatically save the server path to config
            try {
                const lastSlash = Math.max(fileUri.lastIndexOf('/'), fileUri.lastIndexOf('\\'));
                const workspaceRoot = lastSlash > 0 ? fileUri.substring(0, lastSlash) : fileUri;
                
                let configResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApiPlatformConfig({
                    workspaceUri: workspaceRoot,
                    filePath: fileUri
                });

                let platformConfig = configResponse.config;
                let apiDef: any;

                if (configResponse.success && platformConfig) {
                    apiDef = platformConfig.api;
                }

                if (!platformConfig || !apiDef) {
                    if (!platformConfig) {
                        platformConfig = {
                            version: '1.0',
                            spectralRulesets: []
                        };
                    }

                    if (!apiDef) {
                        if (isOpenAPI) {
                            apiDef = {
                                openapi: apiFileName
                            };
                        } else {
                            apiDef = {
                                asyncapi: apiFileName
                            };
                        }
                        platformConfig.api = apiDef;
                    }
                }

                apiDef.mockServerPath = serverFileName;

                const updateResponse = await rpcClient.getApiDesignerVisualizerRpcClient().updateApiPlatformConfig({
                    workspaceUri: workspaceRoot,
                    config: platformConfig
                });

                if (updateResponse.success) {
                    setMockServerPath(serverFileName);
                    setHasConfig(true);
                    logger.info(`Mock server path automatically saved to config: ${serverFileName}`);
                }
            } catch (configError) {
                logger.warn('Failed to auto-save mock server path to config:', configError);
            }
        } catch (error) {
            logger.error('Failed to open AI chat:', error);
            rpcClient.showErrorNotification('Failed to open AI chat. Please ensure AI provider is installed and enabled.');
        }
    }, [rpcClient, fileUri, mockServerPath, setMockServerPath, setHasConfig]);

    return {
        selectedTool,
        selectTool,
        generateWithAI
    };
}

