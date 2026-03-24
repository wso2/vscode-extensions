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
const WI_EXPLORER_VIEW_ID = 'wso2-integrator.explorer';

export function activate(context: vscode.ExtensionContext) {
    const alreadyShown = context.globalState.get<boolean>(DEPRECATION_SHOWN_KEY);
    if (!alreadyShown) {
        vscode.window.showWarningMessage(
            'WSO2 Integrator: BI has been deprecated. ' +
            'WSO2 Integrator (WI) has been installed and provides all the same functionality with continued updates.',
            'Open WSO2 Integrator'
        ).then(action => {
            if (action === 'Open WSO2 Integrator') {
                vscode.commands.executeCommand(`${WI_EXPLORER_VIEW_ID}.focus`);
            }
        });
        context.globalState.update(DEPRECATION_SHOWN_KEY, true);
    }
}

export function deactivate() { }
