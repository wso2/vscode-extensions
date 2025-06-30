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
import { RuntimeServicesWebview } from './webview';
import { COMMANDS } from '../constants';
import { askForProject } from '../util/workspace';

export function activateRuntimeService(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.OPEN_RUNTIME_VIEW, async (projectUri: string) => {
            if (!projectUri) {
                projectUri = await askForProject();
            }
            openRuntimeServicesWebview(projectUri);
        })
    );
}

export function openRuntimeServicesWebview(projectUri: string) {
    if (!RuntimeServicesWebview.webviews.has(projectUri)) {
        const webview = new RuntimeServicesWebview(projectUri);
        RuntimeServicesWebview.webviews.set(projectUri, webview);
    } else {
        const webview = RuntimeServicesWebview.webviews.get(projectUri);
        if (webview) {
            webview.getWebview()?.reveal();
        }
    }
}
