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

export const outputServerChannel = vscode.window.createOutputChannel("Micro Integrator Server");

export function showServerOutputChannel() {
    outputServerChannel.show(true);
}

// This function will log the value to the MI server output channel
export function serverLog(value: string): void {
    console.log(value);
    outputServerChannel.append(value);
}

export function getOutputChannel() {
    return outputServerChannel;
}

