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
import { MockServerConfig, MockServerTool, ApiDefinition, ApiSpecType, detectSpecType, ApiPlatformConfig } from '@wso2/api-designer-core';
import { logger } from '../../../utils/logger';

export interface UseMockConfigReturn {
    config: MockServerConfig;
    hasConfig: boolean;
    mockServerPath: string | undefined;
    isGenerating: boolean;
    setConfig: (config: MockServerConfig | ((prev: MockServerConfig) => MockServerConfig)) => void;
    setHasConfig: (has: boolean) => void;
    setMockServerPath: (path: string | undefined) => void;
    generateConfig: () => Promise<void>;
    saveMockServerPath: (path?: string) => Promise<void>;
}

/**
 * Hook for managing mock server configuration
 */
export function useMockConfig(fileUri: string): UseMockConfigReturn {
    const { rpcClient } = useVisualizerContext();
    const [config, setConfigState] = useState<MockServerConfig>({
        tool: MockServerTool.PRISM,
        port: 4010,
        host: 'localhost',
        specType: 'openapi',
        features: {
            validation: true,
            dynamicExamples: true,
            cors: true,
            errors: false
        }
    });
    const [hasConfig, setHasConfig] = useState(false);
    const [mockServerPath, setMockServerPath] = useState<string | undefined>(undefined);
    const [isGenerating, setIsGenerating] = useState(false);

    // Load config and auto-detect mock server path
    useEffect(() => {
        if (!rpcClient || !fileUri) return;

        const loadConfig = async () => {
            try {
                const apiDefResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApiDefinition({
                    filePath: fileUri
                });

                const apiFileName = fileUri.split('/').pop() || fileUri.split('\\').pop() || 'openapi.yaml';
                const expectedServerFileName = apiFileName.replace(/\.(yaml|yml|json)$/i, '') + '.mock-server.js';
                const lastSlash = Math.max(fileUri.lastIndexOf('/'), fileUri.lastIndexOf('\\'));
                const specDir = lastSlash > 0 ? fileUri.substring(0, lastSlash) : fileUri;
                const expectedServerPath = `${specDir}/${expectedServerFileName}`;

                if (apiDefResponse.success && apiDefResponse.apiDefinition) {
                    setHasConfig(true);
                    const savedPath = apiDefResponse.apiDefinition.mockServerPath;
                    
                    if (savedPath) {
                        setMockServerPath(savedPath);
                    } else {
                        // Try to auto-detect
                        try {
                            const fileResponse = await rpcClient.getApiDesignerVisualizerRpcClient().readFile({
                                filePath: expectedServerPath
                            });
                            
                            if (fileResponse.success && fileResponse.content) {
                                logger.info(`Auto-detected mock server file: ${expectedServerFileName}`);
                                
                                const workspaceRoot = specDir;
                                const configResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApiPlatformConfig({
                                    workspaceUri: workspaceRoot,
                                    filePath: fileUri
                                });
                                
                                if (configResponse.success && configResponse.config) {
                                    const platformConfig = configResponse.config;
                                    const apiDef = platformConfig.api;
                                    
                                    if (apiDef) {
                                        apiDef.mockServerPath = expectedServerFileName;
                                        
                                        const updateResponse = await rpcClient.getApiDesignerVisualizerRpcClient().updateApiPlatformConfig({
                                            workspaceUri: workspaceRoot,
                                            config: platformConfig
                                        });
                                        
                                        if (updateResponse.success) {
                                            setMockServerPath(expectedServerFileName);
                                            logger.info(`Auto-saved mock server path to config: ${expectedServerFileName}`);
                                        } else {
                                            setMockServerPath(expectedServerFileName);
                                            logger.warn('Failed to auto-save config, but using detected server path');
                                        }
                                    } else {
                                        setMockServerPath(expectedServerFileName);
                                    }
                                } else {
                                    setMockServerPath(expectedServerFileName);
                                }
                            } else {
                                setMockServerPath(undefined);
                            }
                        } catch (fileError: any) {
                            // Silently handle ENOENT - file doesn't exist, which is expected
                            if (fileError?.code === 'ENOENT' || fileError?.message?.includes('ENOENT')) {
                                // File doesn't exist - this is expected, don't log
                            } else {
                                logger.debug('Error checking mock server file:', fileError);
                            }
                            setMockServerPath(undefined);
                        }
                    }
                } else {
                    // Try to auto-detect the mock server file
                    try {
                        const fileResponse = await rpcClient.getApiDesignerVisualizerRpcClient().readFile({
                            filePath: expectedServerPath
                        });
                        
                        if (fileResponse.success && fileResponse.content) {
                            logger.info(`Auto-detected mock server file: ${expectedServerFileName}`);
                            
                            const workspaceRoot = specDir;
                            const specResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getAPISpecContent({
                                filePath: fileUri
                            });
                            const detection = detectSpecType(specResponse.content);
                            
                            const apiDef: ApiDefinition = {
                                [detection.type === ApiSpecType.ASYNCAPI ? 'asyncapi' : 'openapi']: apiFileName,
                                mockServerPath: expectedServerFileName
                            };
                            
                            const platformConfig: ApiPlatformConfig = {
                                version: '1.0',
                                api: apiDef,
                                spectralRulesets: []
                            };
                            
                            const updateResponse = await rpcClient.getApiDesignerVisualizerRpcClient().updateApiPlatformConfig({
                                workspaceUri: workspaceRoot,
                                config: platformConfig
                            });
                            
                            if (updateResponse.success) {
                                setHasConfig(true);
                                setMockServerPath(expectedServerFileName);
                                logger.info(`Auto-saved mock server path to config: ${expectedServerFileName}`);
                            } else {
                                setHasConfig(false);
                                setMockServerPath(expectedServerFileName);
                                logger.warn('Failed to auto-save config, but using detected server path');
                            }
                        } else {
                            setHasConfig(false);
                            setMockServerPath(undefined);
                        }
                    } catch (fileError: any) {
                        // Silently handle ENOENT - file doesn't exist, which is expected
                        if (fileError?.code === 'ENOENT' || fileError?.message?.includes('ENOENT')) {
                            // File doesn't exist - this is expected, don't log
                        } else {
                            logger.debug('Error checking mock server file:', fileError);
                        }
                        setHasConfig(false);
                        setMockServerPath(undefined);
                    }
                }
            } catch (error) {
                logger.error('Failed to load config:', error);
                setHasConfig(false);
                setMockServerPath(undefined);
            }
        };

        loadConfig();
    }, [rpcClient, fileUri]);

    const generateConfig = useCallback(async () => {
        if (!rpcClient || !fileUri) return;

        // For AI-generated JS, this should not be called
        if (config.tool === MockServerTool.AI_GENERATED_JS) {
            return;
        }

        setIsGenerating(true);
        try {
            const response = await rpcClient.generateMockConfig({
                filePath: fileUri,
                config
            });

            if (response.success) {
                logger.info(`Config generated: ${response.configPath}`);
                rpcClient.showInfoNotification(`Configuration file created: ${response.configPath}`);
            } else {
                logger.error(`Failed to generate config: ${response.message}`);
                rpcClient.showErrorNotification(response.message || 'Failed to generate configuration');
            }
        } catch (error) {
            logger.error('Failed to generate config:', error);
            rpcClient.showErrorNotification('Failed to generate configuration');
        } finally {
            setIsGenerating(false);
        }
    }, [rpcClient, fileUri, config]);

    const saveMockServerPath = useCallback(async (path?: string) => {
        if (!rpcClient || !fileUri) return;

        // Prompt user for the mock server file path if not provided
        let serverPath = path;
        if (!serverPath) {
            const input = await rpcClient.showInputBox({
                title: 'Enter the path to the AI-generated mock server file (relative to the OpenAPI spec directory)',
                value: mockServerPath || 'mock-server.js',
                placeholder: 'mock-server.js'
            });
            if (!input) return;
            serverPath = input;
        }

        try {
            // Get workspace root from fileUri
            const lastSlash = Math.max(fileUri.lastIndexOf('/'), fileUri.lastIndexOf('\\'));
            const workspaceRoot = lastSlash > 0 ? fileUri.substring(0, lastSlash) : fileUri;
            
            // Get API filename
            const apiFileName = fileUri.split('/').pop() || fileUri.split('\\').pop() || '';
            
            // Try to get existing config
            let configResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApiPlatformConfig({
                workspaceUri: workspaceRoot,
                filePath: fileUri
            });

            let platformConfig = configResponse.config;
            let apiDef: ApiDefinition | undefined;

            if (configResponse.success && platformConfig) {
                apiDef = platformConfig.api;
            }

            // If config doesn't exist or API definition not found, create them
            if (!platformConfig || !apiDef) {
                if (!platformConfig) {
                    platformConfig = {
                        version: '1.0',
                        spectralRulesets: []
                    };
                }

                if (!apiDef) {
                    const specResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getAPISpecContent({
                        filePath: fileUri
                    });
                    const detection = detectSpecType(specResponse.content);
                    
                    apiDef = {
                        [detection.type === ApiSpecType.ASYNCAPI ? 'asyncapi' : 'openapi']: apiFileName
                    };
                    platformConfig.api = apiDef;
                }
            }

            // Update the mockServerPath
            apiDef.mockServerPath = serverPath;

            // Save the updated config
            const updateResponse = await rpcClient.getApiDesignerVisualizerRpcClient().updateApiPlatformConfig({
                workspaceUri: workspaceRoot,
                config: platformConfig
            });

            if (updateResponse.success) {
                setMockServerPath(serverPath);
                setHasConfig(true);
                rpcClient.showInfoNotification(`Mock server path saved: ${serverPath}`);
            } else {
                rpcClient.showErrorNotification(updateResponse.message || 'Failed to save mock server path');
            }
        } catch (error) {
            logger.error('Failed to save mock server path:', error);
            rpcClient.showErrorNotification('Failed to save mock server path');
        }
    }, [rpcClient, fileUri, mockServerPath]);

    const setConfig = useCallback((configOrUpdater: MockServerConfig | ((prev: MockServerConfig) => MockServerConfig)) => {
        if (typeof configOrUpdater === 'function') {
            setConfigState(configOrUpdater);
        } else {
            setConfigState(configOrUpdater);
        }
    }, []);

    return {
        config,
        hasConfig,
        mockServerPath,
        isGenerating,
        setConfig,
        setHasConfig,
        setMockServerPath,
        generateConfig,
        saveMockServerPath
    };
}

