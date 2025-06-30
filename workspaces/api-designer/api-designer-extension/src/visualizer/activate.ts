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
import { openView } from '../stateMachine';
import { COMMANDS } from '../constants';
import { EVENT_TYPE, MACHINE_VIEW } from '@wso2/api-designer-core';



export function activateVisualizer(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.OPEN_WELCOME, async (fileUri: vscode.Uri | string) => {
            let file: string | undefined;
            const activeDocument = vscode.window.activeTextEditor?.document;
            if (typeof fileUri === 'string') {
                file = fileUri;
            } else if (fileUri?.fsPath) {
                file = fileUri.fsPath;
            } else if (activeDocument) {
                file = activeDocument.fileName;
                // If the active document is not a yaml or json file, show an error message
                if (!file.endsWith('.yaml') && !file.endsWith('.yml') && !file.endsWith('.json')) {
                    vscode.window.showErrorMessage("No API definition found to visualize");
                    return;
                }
            } else {
                vscode.window.showErrorMessage("No file found to visualize");
                return;
            }
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Welcome, documentUri: file });
        })
    );
}
