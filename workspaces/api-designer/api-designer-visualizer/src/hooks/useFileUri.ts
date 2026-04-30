/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { useState, useEffect, useRef } from 'react';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { postMessage as postVSCodeMessage } from '../utils/vscode-api';

const PLACEHOLDER_URI = 'file:///placeholder';
const MAX_RETRIES = 10;
const RETRY_INTERVAL = 500;

/**
 * Hook for managing fileUri state across views
 * Handles:
 * - Initial fileUri from props
 * - RPC fallback to get fileUri from extension host
 * - Message-based updates (setFileUri, switchView, switchToEditor, openDesigner)
 * - Retry mechanism for RPC calls
 * 
 * @param propFileUri - Optional fileUri passed as prop
 * @returns Current fileUri value
 */
export function useFileUri(propFileUri?: string): string {
    const { rpcClient } = useVisualizerContext();
    const [fileUri, setFileUri] = useState<string>(propFileUri || '');
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef<number>(0);

    // Update fileUri when prop changes
    useEffect(() => {
        if (propFileUri && propFileUri !== fileUri && propFileUri !== PLACEHOLDER_URI) {
            setFileUri(propFileUri);
            retryCountRef.current = 0; // Reset retry count on successful prop update
        }
    }, [propFileUri, fileUri]);

    // Try to get fileUri from RPC client if not available (with retries)
    useEffect(() => {
        if (!fileUri && rpcClient) {
            const tryGetFileUri = () => {
                rpcClient.getVisualizerState()
                    .then((state) => {
                        if (state.documentUri && 
                            state.documentUri !== fileUri && 
                            state.documentUri !== PLACEHOLDER_URI) {
                            setFileUri(state.documentUri);
                            retryCountRef.current = 0; // Reset on success
                        } else if (!fileUri && retryCountRef.current < MAX_RETRIES) {
                            // Retry if we still don't have fileUri
                            retryCountRef.current++;
                            retryTimeoutRef.current = setTimeout(tryGetFileUri, RETRY_INTERVAL);
                        }
                    })
                    .catch(() => {
                        // Retry on error if we haven't exceeded max retries
                        if (retryCountRef.current < MAX_RETRIES) {
                            retryCountRef.current++;
                            retryTimeoutRef.current = setTimeout(tryGetFileUri, RETRY_INTERVAL);
                        }
                    });
            };

            retryCountRef.current = 0;
            tryGetFileUri();
        }

        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        };
    }, [rpcClient, fileUri]);

    // Listen for fileUri messages from extension host
    useEffect(() => {
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            switch (message.command) {
                case 'setFileUri':
                    if (message.data && 
                        message.data !== fileUri && 
                        message.data !== PLACEHOLDER_URI) {
                        setFileUri(message.data);
                        retryCountRef.current = 0; // Reset retry count on successful message
                    }
                    break;
                case 'openDesigner':
                case 'switchToEditor':
                    if (message.filePath && 
                        message.filePath !== fileUri && 
                        message.filePath !== PLACEHOLDER_URI) {
                        setFileUri(message.filePath);
                        retryCountRef.current = 0;
                    }
                    break;
                case 'switchView':
                    if (message.fileUri && 
                        message.fileUri !== fileUri && 
                        message.fileUri !== PLACEHOLDER_URI) {
                        setFileUri(message.fileUri);
                        retryCountRef.current = 0;
                    }
                    break;
            }
        };

        window.addEventListener('message', messageHandler);

        // Request fileUri from extension host if we don't have it
        if (!fileUri) {
            postVSCodeMessage({ command: 'requestFileUri' });
        }

        return () => window.removeEventListener('message', messageHandler);
    }, [fileUri]);

    return fileUri;
}

