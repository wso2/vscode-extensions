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

/**
 * VS Code Webview API interface
 */
export interface VSCodeAPI {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
}

/**
 * Global declaration for acquireVsCodeApi function
 */
declare const acquireVsCodeApi: (() => VSCodeAPI) | undefined;

let vscodeApiInstance: VSCodeAPI | null = null;

/**
 * Get or create the VS Code API instance.
 * This function safely handles the acquireVsCodeApi() call which can only be called once.
 * 
 * @returns VS Code API instance or null if not available
 */
export function getVSCodeAPI(): VSCodeAPI | null {
    if (vscodeApiInstance) {
        return vscodeApiInstance;
    }

    if (typeof acquireVsCodeApi === 'function') {
        try {
            vscodeApiInstance = acquireVsCodeApi();
            return vscodeApiInstance;
        } catch (error) {
            console.error('Failed to acquire VS Code API:', error);
            return null;
        }
    }

    return null;
}

/**
 * Send a message to the extension host via VS Code API
 * 
 * @param message - Message to send
 * @returns true if message was sent, false otherwise
 */
export function postMessage(message: any): boolean {
    const api = getVSCodeAPI();
    if (api) {
        api.postMessage(message);
        return true;
    }
    return false;
}

/**
 * Get the current state from VS Code API
 * 
 * @returns Current state or null if not available
 */
export function getState(): any {
    const api = getVSCodeAPI();
    return api ? api.getState() : null;
}

/**
 * Set state in VS Code API
 * 
 * @param state - State to set
 * @returns true if state was set, false otherwise
 */
export function setState(state: any): boolean {
    const api = getVSCodeAPI();
    if (api) {
        api.setState(state);
        return true;
    }
    return false;
}

