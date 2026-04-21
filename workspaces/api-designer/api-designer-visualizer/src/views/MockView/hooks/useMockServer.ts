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
import { MockServerStatus, MockServerConfig, MockServerTool } from '@wso2/api-designer-core';
import { logger } from '../../../utils/logger';

export interface UseMockServerReturn {
    serverStatus: MockServerStatus;
    isStarting: boolean;
    startServer: (config: MockServerConfig, mockServerPath?: string) => Promise<void>;
    stopServer: () => Promise<void>;
    refreshStatus: () => Promise<void>;
    setServerStatus: (status: MockServerStatus) => void;
    setIsStarting: (starting: boolean) => void;
}

/**
 * Hook for managing mock server operations (start, stop, status)
 */
export function useMockServer(fileUri: string): UseMockServerReturn {
    const { rpcClient } = useVisualizerContext();
    const [serverStatus, setServerStatus] = useState<MockServerStatus>({ isRunning: false });
    const [isStarting, setIsStarting] = useState(false);

    const startServer = useCallback(async (config: MockServerConfig, mockServerPath?: string) => {
        if (!rpcClient || !fileUri) return;

        // Validate the spec before attempting to start — an invalid or empty spec
        // causes the server to start but report no operations.
        try {
            const specResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getAPISpecContent({
                filePath: fileUri
            });

            if (!specResponse.content) {
                rpcClient.showErrorNotification('Cannot start mock server: failed to read the API specification file.');
                return;
            }

            const { detectSpecType, SpecificationFactory } = await import('@wso2/api-designer-core');
            const detection = detectSpecType(specResponse.content);

            if (!detection.type) {
                rpcClient.showErrorNotification('Cannot start mock server: the file does not appear to be a valid OpenAPI specification.');
                return;
            }

            const service = SpecificationFactory.getService(detection.type);
            const parsed = service.parse(specResponse.content);

            if (!parsed.success || !parsed.spec) {
                rpcClient.showErrorNotification('Cannot start mock server: the specification has structural errors and could not be parsed. Fix the errors in the Design view first.');
                return;
            }

            const endpoints = service.getEndpoints(parsed.spec);
            if (endpoints.length === 0) {
                rpcClient.showErrorNotification('Cannot start mock server: no operations found in the specification. Add at least one path and operation in the Design view first.');
                return;
            }
        } catch (validationError) {
            logger.warn('Spec validation before mock start failed:', validationError);
            // Don't block on unexpected validation errors — fall through and let the server attempt give a real error
        }

        // For AI-generated JS, use the path from config or auto-detect
        if (config.tool === MockServerTool.AI_GENERATED_JS) {
            let serverPathToUse = mockServerPath;
            
            if (!serverPathToUse) {
                // Try to auto-detect the server file
                const apiFileName = fileUri.split('/').pop() || fileUri.split('\\').pop() || 'openapi.yaml';
                const expectedServerFileName = apiFileName.replace(/\.(yaml|yml|json)$/i, '') + '.mock-server.js';
                const lastSlash = Math.max(fileUri.lastIndexOf('/'), fileUri.lastIndexOf('\\'));
                const specDir = lastSlash > 0 ? fileUri.substring(0, lastSlash) : fileUri;
                const expectedServerPath = `${specDir}/${expectedServerFileName}`;
                
                try {
                    const fileResponse = await rpcClient.getApiDesignerVisualizerRpcClient().readFile({
                        filePath: expectedServerPath
                    });
                    
                    if (fileResponse.success && fileResponse.content) {
                        serverPathToUse = expectedServerFileName;
                        logger.info(`Auto-detected mock server file before start: ${expectedServerFileName}`);
                    }
                } catch (fileError: any) {
                    // Silently handle ENOENT - file doesn't exist, which is expected
                    if (fileError?.code === 'ENOENT' || fileError?.message?.includes('ENOENT')) {
                        // File doesn't exist - this is expected, don't log
                    } else {
                        logger.debug('Error checking mock server file:', fileError);
                    }
                }
            }
            
            if (!serverPathToUse) {
                rpcClient.showErrorNotification('Mock server path not configured. Please generate the server with AI and save the path first.');
                return;
            }
        }

        setIsStarting(true);
        try {
            const response = await rpcClient.startMockServer({
                filePath: fileUri,
                config
            });

            if (response.success) {
                logger.info(`Server start command sent: ${response.url}`);
                
                // Start checking status immediately with very fast polling
                // The backend now checks Docker container status directly, so we get immediate updates
                let pollCount = 0;
                const MAX_POLLS = 15; // More polls for better coverage
                const POLL_INTERVALS = [200, 200, 200, 300, 300, 300, 500, 500, 500, 1000, 1000, 1000, 2000, 2000, 2000]; // Very fast initial polling
                
                const pollStatus = async () => {
                    try {
                        const statusResponse = await rpcClient.checkMockServerStatus({
                            filePath: fileUri
                        });
                        
                        setServerStatus(statusResponse.status);
                        
                        if (statusResponse.status.isRunning) {
                            // Server is running - show notification and stop polling
                            rpcClient.showInfoNotification(`Mock server started on ${response.url}`);
                            return; // Stop polling
                        } else if (pollCount < MAX_POLLS) {
                            // Still starting - continue polling
                            pollCount++;
                            setTimeout(pollStatus, POLL_INTERVALS[pollCount - 1] || 2000);
                        } else {
                            // Max polls reached - server might still be starting (e.g., pulling image)
                            // Don't show error - user can see status in terminal
                            logger.info('Mock server status check completed - server may still be starting (check terminal for details)');
                        }
                    } catch (error) {
                        logger.error('Failed to verify server status:', error);
                        if (pollCount < MAX_POLLS) {
                            pollCount++;
                            setTimeout(pollStatus, POLL_INTERVALS[pollCount - 1] || 2000);
                        } else {
                            setServerStatus({ isRunning: false });
                            // Don't show error - user can see status in terminal
                            logger.info('Mock server status check completed - server may still be starting (check terminal for details)');
                        }
                    }
                };
                
                // Start polling immediately (no initial delay)
                pollStatus();
            } else {
                logger.error(`Failed to start server: ${response.message}`);
                rpcClient.showErrorNotification(response.message || 'Failed to start mock server');
            }
        } catch (error) {
            logger.error('Failed to start server:', error);
            rpcClient.showErrorNotification('Failed to start mock server');
        } finally {
            setIsStarting(false);
        }
    }, [rpcClient, fileUri]);

    const stopServer = useCallback(async () => {
        if (!rpcClient || !fileUri) return;

        try {
            const response = await rpcClient.stopMockServer({
                filePath: fileUri
            });

            if (response.success) {
                logger.info('Server stopped');
                rpcClient.showInfoNotification('Mock server stopped');
                setServerStatus({ isRunning: false });
            } else {
                logger.error(`Failed to stop server: ${response.message}`);
                rpcClient.showErrorNotification(response.message || 'Failed to stop mock server');
            }
        } catch (error) {
            logger.error('Failed to stop server:', error);
            rpcClient.showErrorNotification('Failed to stop mock server');
        }
    }, [rpcClient, fileUri]);

    const refreshStatus = useCallback(async () => {
        if (!rpcClient || !fileUri) return;

        try {
            const response = await rpcClient.checkMockServerStatus({
                filePath: fileUri
            });
            setServerStatus(response.status);
        } catch (error) {
            logger.error('Failed to refresh status:', error);
        }
    }, [rpcClient, fileUri]);

    // Check server status periodically
    useEffect(() => {
        if (!rpcClient || !fileUri) return;

        const checkStatus = async () => {
            try {
                const response = await rpcClient.checkMockServerStatus({
                    filePath: fileUri
                });
                
                logger.debug(`[MockView] Status check for ${fileUri}: isRunning=${response.status.isRunning}, port=${response.status.port}`);
                setServerStatus(response.status);
            } catch (error) {
                logger.error('Failed to check server status:', error);
                setServerStatus({ isRunning: false });
            }
        };

        const initialTimeout = setTimeout(checkStatus, 500);
        const interval = setInterval(checkStatus, 3000);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, [rpcClient, fileUri]);

    return {
        serverStatus,
        isStarting,
        startServer,
        stopServer,
        refreshStatus,
        setServerStatus,
        setIsStarting
    };
}

