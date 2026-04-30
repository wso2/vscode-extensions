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

import { postMessage } from './vscode-api';

/**
 * Logger utility for webview that forwards logs to the extension host.
 * This ensures all logs are properly captured in the VS Code output channel.
 */
export const logger = {
    /**
     * Log a debug message
     */
    debug: (message: string, ...args: any[]): void => {
        postMessage({
            command: 'webviewLog',
            level: 'debug',
            data: message,
            args: args.length > 0 ? args : undefined
        });
    },

    /**
     * Log an info message
     */
    info: (message: string, ...args: any[]): void => {
        postMessage({
            command: 'webviewLog',
            level: 'info',
            data: message,
            args: args.length > 0 ? args : undefined
        });
    },

    /**
     * Log a warning message
     */
    warn: (message: string, ...args: any[]): void => {
        postMessage({
            command: 'webviewLog',
            level: 'warn',
            data: message,
            args: args.length > 0 ? args : undefined
        });
    },

    /**
     * Log an error message
     */
    error: (message: string, ...args: any[]): void => {
        postMessage({
            command: 'webviewLog',
            level: 'error',
            data: message,
            args: args.length > 0 ? args : undefined
        });
    }
};

