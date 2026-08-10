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

import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel;

/**
 * Initialize the logger with an output channel
 */
export function initLogger(): void {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel("API Designer");
    }
}

/**
 * Get the output channel instance
 */
export function getOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        initLogger();
    }
    return outputChannel;
}

/**
 * Show the output channel
 */
export function showOutputChannel(): void {
    getOutputChannel().show(true);
}

/**
 * Check if debug logging is enabled
 */
function isDebugEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('apiDesigner');
    return config.get('debugLog', false);
}

/**
 * Format message with timestamp
 */
function formatMessage(message: string, level?: string): string {
    const timestamp = new Date().toISOString();
    const levelPrefix = level ? `[${level}]` : '';
    return `[${timestamp}] ${levelPrefix} ${message}`;
}

/**
 * Log informational message
 */
export function log(...args: any[]): void {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    const formattedMessage = formatMessage(message);
    console.log(formattedMessage);
    getOutputChannel().appendLine(formattedMessage);
}

/**
 * Log debug message (only if debug is enabled)
 */
export function logDebug(...args: any[]): void {
    if (isDebugEnabled()) {
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
        const formattedMessage = formatMessage(message, 'DEBUG');
        console.log(formattedMessage);
        getOutputChannel().appendLine(formattedMessage);
    }
}

/**
 * Log warning message
 */
export function logWarning(message: string, error?: any): void {
    const errorDetails = error ? `: ${error.message || error}` : '';
    const fullMessage = `${message}${errorDetails}`;
    const formattedMessage = formatMessage(fullMessage, 'WARN');
    console.warn(formattedMessage);
    getOutputChannel().appendLine(formattedMessage);
}

/**
 * Log error message
 */
export function logError(message: string, error?: any): void {
    const errorDetails = error ? `: ${error.message || error}` : '';
    const fullMessage = `${message}${errorDetails}`;
    const formattedMessage = formatMessage(fullMessage, 'ERROR');
    
    console.error(formattedMessage);
    getOutputChannel().appendLine(formattedMessage);
    
    if (error?.stack && isDebugEnabled()) {
        getOutputChannel().appendLine(`Stack trace: ${error.stack}`);
    }
}

/**
 * Log info message with specific label
 */
export function logInfo(message: string, label?: string): void {
    const formattedMessage = formatMessage(message, label || 'INFO');
    console.log(formattedMessage);
    getOutputChannel().appendLine(formattedMessage);
}

/**
 * Dispose the output channel
 */
export function disposeLogger(): void {
    if (outputChannel) {
        outputChannel.dispose();
    }
}

