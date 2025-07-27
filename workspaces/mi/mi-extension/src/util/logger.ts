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

export const outputChannel = vscode.window.createOutputChannel("WSO2 Integrator: MI");
export const ERROR_LOG = 'ERROR';
export const INFO_LOG = 'INFO';

function withNewLine(value: string) {
    if (typeof value === 'string' && !value.endsWith('\n')) {
        return value += '\n';
    }
    return value;
}

// This function will log the value to the MI output channel
export function log(value: string): void {
    const output = withNewLine(value);
    console.log(output);
    outputChannel.append(output);
}

export function logWithDebugLevel(message: string, debugLabel: string, logLevel: string): void {
    const formattedMessage = `[${new Date().toLocaleString()}] [${debugLabel}] [${logLevel}] ${message}`;
    const output = withNewLine(formattedMessage);
    console.log(output);
    outputChannel.append(output);
}

export function logDebug(message: string, logLevel: string): void {
    logWithDebugLevel(message, 'MI Debug', logLevel);
}

export function getOutputChannel() {
    return outputChannel;
}

