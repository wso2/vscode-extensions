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
import child_process from 'child_process';
import { CommandResponse } from '@wso2/ballerina-core';

export async function runBackgroundTerminalCommand(command: string) {
    return new Promise<CommandResponse>(function (resolve) {
        child_process.exec(`${command}`, async (err, stdout, stderr) => {
            if (err) {
                resolve({
                    error: true,
                    message: stderr
                });
            } else {
                resolve({
                    error: false,
                    message: stdout
                });
            }
        });
    });
}

export function openExternalUrl(url:string){
    vscode.env.openExternal(vscode.Uri.parse(url));
}
