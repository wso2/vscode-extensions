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

import { createMachine, assign, interpret } from 'xstate';
import * as vscode from 'vscode';
import { ApiRequestItem } from '@wso2/api-tryit-core';

// Event types for the state machine
export const enum EVENT_TYPE {
    API_ITEM_SELECTED = 'API_ITEM_SELECTED',
    REQUEST_UPDATED = 'REQUEST_UPDATED',
    WEBVIEW_READY = 'WEBVIEW_READY'
}

// Context interface for the state machine
export interface ApiTryItContext {
    selectedItem?: ApiRequestItem;
    selectedFilePath?: string; // File path of the selected request
    webviewReady: boolean;
    savedItems: Map<string, ApiRequestItem>; // Cache of edited items by ID
}

// Event interface
interface ApiItemSelectedEvent {
    type: 'API_ITEM_SELECTED';
    data: ApiRequestItem;
    filePath?: string; // Optional file path where this request is stored
}

interface RequestUpdatedEvent {
    type: 'REQUEST_UPDATED';
    data: ApiRequestItem;
}

interface WebviewReadyEvent {
    type: 'WEBVIEW_READY';
}

type ApiTryItEvent = ApiItemSelectedEvent | RequestUpdatedEvent | WebviewReadyEvent;

// State machine definition
const apiTryItMachine = createMachine<ApiTryItContext, ApiTryItEvent>({
    id: 'apiTryIt',
    initial: 'idle',
    predictableActionArguments: true,
    context: {
        webviewReady: false,
        savedItems: new Map()
    },
    states: {
        idle: {
            on: {
                WEBVIEW_READY: {
                    target: 'ready',
                    actions: assign({
                        webviewReady: true
                    })
                },
                API_ITEM_SELECTED: {
                    target: 'itemSelected',
                    actions: assign({
                        selectedItem: (_context: ApiTryItContext, event: ApiItemSelectedEvent) => event.data,
                        selectedFilePath: (_context: ApiTryItContext, event: ApiItemSelectedEvent) => event.filePath
                    })
                }
            }
        },
        ready: {
            on: {
                API_ITEM_SELECTED: {
                    target: 'itemSelected',
                    actions: assign({
                        selectedItem: (context: ApiTryItContext, event: ApiItemSelectedEvent) => {
                            // Check if we have a saved version of this item
                            const savedItem = context.savedItems.get(event.data.id);
                            return savedItem || event.data;
                        }
                    })
                }
            }
        },
        itemSelected: {
            on: {
                API_ITEM_SELECTED: {
                    target: 'itemSelected',
                    actions: assign({
                        selectedItem: (context: ApiTryItContext, event: ApiItemSelectedEvent) => {
                            // Check if we have a saved version of this item
                            const savedItem = context.savedItems.get(event.data.id);
                            return savedItem || event.data;
                        },
                        selectedFilePath: (_context: ApiTryItContext, event: ApiItemSelectedEvent) => event.filePath
                    })
                },
                REQUEST_UPDATED: {
                    actions: assign({
                        selectedItem: (context: ApiTryItContext, event: RequestUpdatedEvent) => event.data,
                        savedItems: (context: ApiTryItContext, event: RequestUpdatedEvent) => {
                            // Save the updated item to cache
                            const newMap = new Map(context.savedItems);
                            newMap.set(event.data.id, event.data);
                            return newMap;
                        }
                    })
                },
                WEBVIEW_READY: {
                    actions: assign({
                        webviewReady: true
                    })
                }
            }
        }
    }
});

// Service to manage state machine instances
const stateMachineService = interpret(apiTryItMachine).start();

// Store reference to webview panel for posting messages
let webviewPanel: vscode.WebviewPanel | undefined;

// Export the state machine service and utilities
export const ApiTryItStateMachine = {
    service: stateMachineService,
    
    registerWebview: (panel: vscode.WebviewPanel) => {
        webviewPanel = panel;
    },
    
    unregisterWebview: () => {
        webviewPanel = undefined;
    },
    
    sendEvent: (eventType: EVENT_TYPE, data?: ApiTryItContext['selectedItem'], filePath?: string) => {
        if (eventType === EVENT_TYPE.API_ITEM_SELECTED && data) {
            stateMachineService.send({ type: 'API_ITEM_SELECTED', data, filePath });
            
            // Post message to webview if registered
            // Get the actual selected item from context (which may be the saved version)
            if (webviewPanel) {
                const context = stateMachineService.getSnapshot().context;
                webviewPanel.webview.postMessage({
                    type: 'apiRequestItemSelected',
                    data: context.selectedItem
                });
            }
        } else if (eventType === EVENT_TYPE.REQUEST_UPDATED && data) {
            stateMachineService.send({ type: 'REQUEST_UPDATED', data });
            // Request updated in state machine
        } else if (eventType === EVENT_TYPE.WEBVIEW_READY) {
            stateMachineService.send({ type: 'WEBVIEW_READY' });
            
            // If there's a pending selection, send it to the now-ready webview
            const context = stateMachineService.getSnapshot().context;
            if (context.selectedItem && webviewPanel) {
                webviewPanel.webview.postMessage({
                    type: 'apiRequestItemSelected',
                    data: context.selectedItem
                });
            }
        }
    },
    
    getContext: () => {
        return stateMachineService.getSnapshot().context;
    },
    
    getState: () => {
        return stateMachineService.getSnapshot().value;
    }
};
