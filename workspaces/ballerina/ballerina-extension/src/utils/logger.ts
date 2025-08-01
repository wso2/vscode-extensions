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
import {getPluginConfig} from'../utils/config';

export const outputChannel = vscode.window.createOutputChannel("Ballerina");
const logLevelDebug: boolean = getPluginConfig().get('debugLog') === true;

function withNewLine(value: string) {
    if (typeof value === 'string' && !value.endsWith('\n')) {
        return value += '\n';
    }
    return value;
}

// This function will log the value to the Ballerina output channel only if debug log is enabled
export function debug(value: string): void {
    const output = withNewLine(value);
    console.log(output);
    if (logLevelDebug) {
        outputChannel.append(output);
    }
}

// This function will log the value to the Ballerina output channel
export function log(value: string): void {
    const output = withNewLine(value);
    console.log(output);
    outputChannel.append(output);
}

export function getOutputChannel() {
    if (logLevelDebug) {
        return outputChannel;
    }
}
