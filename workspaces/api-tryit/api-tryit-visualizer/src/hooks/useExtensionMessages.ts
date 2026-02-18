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

import { useEffect, useRef } from 'react';
import { ApiRequestItem, ApiRequest, HttpRequestOptions, HttpResponseResult } from '@wso2/api-tryit-core';
import { getVSCodeAPI } from '../utils/vscode-api';

// Get VS Code API instance (singleton)
const vscode = getVSCodeAPI();

interface ExtensionMessage {
    type: string;
    data?: any;
}

interface MessageHandlers {
    onApiRequestSelected?: (item: ApiRequestItem) => void;
    onShowCreateCollectionForm?: () => void;
    onCreateCollectionResult?: (result: { success: boolean; message?: string }) => void;
}

/**
 * Custom hook to handle messages from VS Code extension
 */
export const useExtensionMessages = (handlers: MessageHandlers) => {
    // Use ref to store latest handlers without causing re-renders
    const handlersRef = useRef(handlers);
    
    // Update ref when handlers change
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);
    
    useEffect(() => {
        // Notify extension that webview is ready
        if (vscode) {
            vscode.postMessage({ type: 'webviewReady' });
        }

        // Listen for messages from the extension
        const messageHandler = (event: MessageEvent<ExtensionMessage>) => {
            const { type, data } = event.data;
            console.log('[useExtensionMessages] Received message:', type, data);
            
            if (type === 'apiRequestItemSelected' && handlersRef.current.onApiRequestSelected) {
                const item = data as ApiRequestItem;
                // Normalize request safely (handle missing request or non-array fields)
                const req: ApiRequest = item && item.request ? item.request : {
                    id: item?.id || `new-${Date.now()}`,
                    name: item?.name || 'New Request',
                    method: 'GET',
                    url: '',
                    queryParameters: [],
                    headers: []
                } as ApiRequest;
                const mergedAssertions = Array.isArray(req.assertions)
                    ? req.assertions
                    : (Array.isArray(item?.assertions) ? (item!.assertions as string[]) : undefined);
                const normalizedItem: ApiRequestItem = {
                    ...item,
                    request: {
                        ...req,
                        queryParameters: Array.isArray(req.queryParameters) ? req.queryParameters : [],
                        headers: Array.isArray(req.headers) ? req.headers : [],
                        ...(mergedAssertions ? { assertions: mergedAssertions } : {})
                    }
                };
                handlersRef.current.onApiRequestSelected(normalizedItem);
            }

            if (type === 'showCreateCollectionForm' && handlersRef.current.onShowCreateCollectionForm) {
                console.log('[useExtensionMessages] Calling onShowCreateCollectionForm handler');
                handlersRef.current.onShowCreateCollectionForm();
            }

            // Treat 'requestUpdated' like a selection so UI updates the current request form after a save
            if (type === 'requestUpdated' && handlersRef.current.onApiRequestSelected) {
                const item = data as ApiRequestItem;
                const req: ApiRequest = item && item.request ? item.request : {
                    id: item?.id || `new-${Date.now()}`,
                    name: item?.name || 'New Request',
                    method: 'GET',
                    url: '',
                    queryParameters: [],
                    headers: []
                } as ApiRequest;
                const mergedAssertions = Array.isArray(req.assertions)
                    ? req.assertions
                    : (Array.isArray(item?.assertions) ? (item!.assertions as string[]) : undefined);
                const normalizedItem: ApiRequestItem = {
                    ...item,
                    request: {
                        ...req,
                        queryParameters: Array.isArray(req.queryParameters) ? req.queryParameters : [],
                        headers: Array.isArray(req.headers) ? req.headers : [],
                        ...(mergedAssertions ? { assertions: mergedAssertions } : {})
                    }
                };
                handlersRef.current.onApiRequestSelected(normalizedItem);
            }

            if (type === 'createCollectionResult' && handlersRef.current.onCreateCollectionResult) {
                handlersRef.current.onCreateCollectionResult(data as { success: boolean; message?: string });
            }
        };

        window.addEventListener('message', messageHandler);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('message', messageHandler);
        };
    }, []); // Empty dependency array - only run once
    
    // Return functions to communicate with extension
    return {
        updateRequest: (item: ApiRequestItem) => {
            if (vscode) {
                try {
                    // Serialize and deserialize to ensure clean JSON (removes functions, etc.)
                    const cleanItem = JSON.parse(JSON.stringify(item));
                    vscode.postMessage({ 
                        type: 'requestUpdated', 
                        data: cleanItem 
                    });
                } catch (error) {
                    console.error('Failed to serialize request item:', error);
                }
            }
        },
        sendHttpRequest: async (options: HttpRequestOptions): Promise<HttpResponseResult> => {
            return new Promise((resolve, reject) => {
                if (!vscode) {
                    reject(new Error('VS Code API not available'));
                    return;
                }

                const requestId = `http-request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                // Set up a one-time listener for the response
                const messageHandler = (event: MessageEvent) => {
                    const { type, requestId: responseRequestId, data } = event.data;
                    if (type === 'httpRequestResponse' && responseRequestId === requestId) {
                        window.removeEventListener('message', messageHandler);
                        resolve(data as HttpResponseResult);
                    }
                };

                window.addEventListener('message', messageHandler);

                // Send the HTTP request to the extension
                vscode.postMessage({
                    type: 'sendHttpRequest',
                    requestId,
                    data: options
                });

                // Timeout after 30 seconds
                setTimeout(() => {
                    window.removeEventListener('message', messageHandler);
                    reject(new Error('HTTP request timeout'));
                }, 30000);
            });
        }
    };
};
