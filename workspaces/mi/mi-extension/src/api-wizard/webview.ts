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

import * as path from 'path';
import { ExtensionContext, Uri, ViewColumn, Webview, WebviewPanel, window, workspace } from 'vscode';
import { debounce } from "lodash";
import { getComposerJSFiles } from '../util';

let apiWizardWebview: WebviewPanel | undefined;

export function createApiWizardWebview(context: ExtensionContext) {
    if (apiWizardWebview && apiWizardWebview.active) {
        apiWizardWebview.reveal();
        return;
    }

    // Create a new webview panel
    const panel = window.createWebviewPanel(
        'diagram',
        'Micro Integrator API Wizard',
        ViewColumn.Active,
        {
            enableScripts: true,
            localResourceRoots: [Uri.file(path.join(context.extensionPath, 'resources'))]
        }
    );
    apiWizardWebview = panel;

    const scripts = getComposerJSFiles(context, 'MIDiagram', panel.webview).map(jsFile =>
        '<script charset="UTF-8" src="' + jsFile + '"></script>').join('\n');

    // const rpc = new RegisterWebViewPanelRpc(context, panel);

    // const refreshDiagram = debounce(() => {
    //     if (apiWizardWebview) {
    //         rpc.getMessenger().sendNotification(refresh, { type: 'webview', webviewType: 'diagram' });
    //     }
    // }, 500);


    // workspace.onDidChangeTextDocument(function() {
    //     refreshDiagram();
    // }, context);

    apiWizardWebview.onDidDispose(() => {
        apiWizardWebview = undefined;
    });

    panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
                    <meta name="theme-color" content="#000000">
                    <title>Micro Integrator API Wizard</title>
                </head>
                <body>
                    <noscript>You need to enable JavaScript to run this app.</noscript>
                    <div id="mi-api-wizard-container"></div>
                </body>
                ${scripts}
                <script>
                    function render() {
                        MIDiagram.renderAPIWizard(
							document.getElementById("root")
						);
                    }
                    render();
                </script>
            </html>
          `;
}
