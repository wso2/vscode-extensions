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

const DEPRECATION_SHOWN_KEY = 'bi.deprecation.noticeShown';
const BI_EXTENSION_ID = 'wso2.ballerina-integrator';
const CMD_UNINSTALL_EXTENSION = 'workbench.extensions.uninstallExtension';
const CMD_RELOAD_WINDOW = 'workbench.action.reloadWindow';
const BTN_REMOVE = 'Remove BI Extension';
const BTN_RELOAD = 'Reload Window';

export function activate(context: vscode.ExtensionContext) {
    const alreadyShown = context.globalState.get<boolean>(DEPRECATION_SHOWN_KEY);
    if (!alreadyShown) {
        vscode.window.showWarningMessage(
            'WSO2 Integrator is now installed and ready to use. ' +
            'This replaces the "WSO2 Integrator: BI extension" which is no longer needed. ' +
            'You can safely remove the "WSO2 Integrator: BI extension" from VS Code Editor.',
            BTN_REMOVE
        ).then(async action => {
            await context.globalState.update(DEPRECATION_SHOWN_KEY, true);
            if (action === BTN_REMOVE) {
                try {
                    await vscode.commands.executeCommand(CMD_UNINSTALL_EXTENSION, BI_EXTENSION_ID);
                    const reload = await vscode.window.showInformationMessage(
                        'WSO2 Integrator: BI extension has been uninstalled. Please reload the window to complete the process.',
                        BTN_RELOAD
                    );
                    if (reload === BTN_RELOAD) {
                        await vscode.commands.executeCommand(CMD_RELOAD_WINDOW);
                    }
                } catch (error) {
                    console.error('Failed to uninstall WSO2 Integrator: BI extension:', error);
                    await vscode.window.showErrorMessage('Failed to uninstall "WSO2 Integrator: BI extension". Please uninstall it manually from the Extensions view.');
                }
            }
        });
    }
}

export function deactivate() { }
