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
    WEBVIEW_READY = 'WEBVIEW_READY'
}

// Context interface for the state machine
export interface ApiTryItContext {
    selectedItem?: ApiRequestItem;
    webviewReady: boolean;
}

// Event interface
interface ApiItemSelectedEvent {
    type: 'API_ITEM_SELECTED';
    data: ApiRequestItem;
}

interface WebviewReadyEvent {
    type: 'WEBVIEW_READY';
}

type ApiTryItEvent = ApiItemSelectedEvent | WebviewReadyEvent;

// State machine definition
const apiTryItMachine = createMachine<ApiTryItContext, ApiTryItEvent>({
    id: 'apiTryIt',
    initial: 'idle',
    predictableActionArguments: true,
    context: {
        webviewReady: false
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
                        selectedItem: (_context: ApiTryItContext, event: ApiItemSelectedEvent) => event.data
                    })
                }
            }
        },
        ready: {
            on: {
                API_ITEM_SELECTED: {
                    target: 'itemSelected',
                    actions: assign({
                        selectedItem: (_context: ApiTryItContext, event: ApiItemSelectedEvent) => event.data
                    })
                }
            }
        },
        itemSelected: {
            on: {
                API_ITEM_SELECTED: {
                    target: 'itemSelected',
                    actions: assign({
                        selectedItem: (_context: ApiTryItContext, event: ApiItemSelectedEvent) => event.data
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

// Event emitter for webview communication
export const apiSelectionEmitter = new vscode.EventEmitter<ApiTryItContext['selectedItem']>();

// Export the state machine service and utilities
export const ApiTryItStateMachine = {
    service: stateMachineService,
    
    sendEvent: (eventType: EVENT_TYPE, data?: ApiTryItContext['selectedItem']) => {
        if (eventType === EVENT_TYPE.API_ITEM_SELECTED && data) {
            stateMachineService.send({ type: 'API_ITEM_SELECTED', data });
            apiSelectionEmitter.fire(data);
        } else if (eventType === EVENT_TYPE.WEBVIEW_READY) {
            stateMachineService.send({ type: 'WEBVIEW_READY' });
        }
    },
    
    getContext: () => {
        return stateMachineService.getSnapshot().context;
    },
    
    getState: () => {
        return stateMachineService.getSnapshot().value;
    },
    
    onApiSelection: (callback: (data: ApiTryItContext['selectedItem']) => void) => {
        return apiSelectionEmitter.event(callback);
    }
};
