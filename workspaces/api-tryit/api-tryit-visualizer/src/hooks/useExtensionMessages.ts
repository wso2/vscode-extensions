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

import { useEffect } from 'react';
import { ApiRequestItem } from '@wso2/api-tryit-core';

// Get VS Code API instance
declare const acquireVsCodeApi: any;
const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;

interface ExtensionMessage {
    type: string;
    data?: any;
}

interface MessageHandlers {
    onApiRequestSelected?: (item: ApiRequestItem) => void;
}

/**
 * Custom hook to handle messages from VS Code extension
 */
export const useExtensionMessages = (handlers: MessageHandlers) => {
    useEffect(() => {
        // Notify extension that webview is ready
        if (vscode) {
            vscode.postMessage({ type: 'webviewReady' });
        }

        // Listen for messages from the extension
        const messageHandler = (event: MessageEvent<ExtensionMessage>) => {
            const { type, data } = event.data;
            
            if (type === 'apiRequestItemSelected' && handlers.onApiRequestSelected) {
                const item = data as ApiRequestItem;
                // Ensure arrays are initialized
                const normalizedItem: ApiRequestItem = {
                    ...item,
                    request: {
                        ...item.request,
                        queryParameters: item.request.queryParameters || [],
                        headers: item.request.headers || []
                    }
                };
                handlers.onApiRequestSelected(normalizedItem);
            }
        };

        window.addEventListener('message', messageHandler);

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('message', messageHandler);
        };
    }, [handlers]);
};
