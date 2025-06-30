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
import * as path from 'path';
import { Uri, ViewColumn } from 'vscode';
import { getComposerJSFiles } from '../util';
import { RPCLayer } from '../RPCLayer';
import { extension } from '../MIExtensionContext';
import { miServerRunStateChanged } from '@wso2/mi-core';

export class RuntimeServicesWebview {
    public static webviews: Map<string, RuntimeServicesWebview> = new Map();
    public static readonly viewType = 'micro-integrator.runtime-services-panel';
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];

    constructor(private projectUri: string) {
        this._panel = this.createWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getWebviewContent(this._panel.webview);
        this._panel?.onDidChangeViewState(() => {
            if (this._panel?.active || this._panel?.visible) {
                RPCLayer._messengers.get(this.projectUri)?.sendNotification(
                    miServerRunStateChanged,
                    { type: 'webview', webviewType: 'micro-integrator.runtime-services-panel' },
                    extension.isServerStarted ? 'Running' : 'Stopped');
            }
        });

        RPCLayer.create(this._panel, projectUri);
    }

    private createWebview(): vscode.WebviewPanel {
        let title = "Runtime Services";
        const workspaces = vscode.workspace.workspaceFolders;
        const projectName = workspaces && workspaces.length > 1 ? path.basename(this.projectUri) : '';
        if (projectName) {
            title = `${title} - ${projectName}`;
        }
        const panel = vscode.window.createWebviewPanel(
            RuntimeServicesWebview.viewType,
            title,
            ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [Uri.file(path.join(extension.context.extensionPath, 'resources'))], // TODO: check the correct one
                retainContextWhenHidden: true,
            }
        );
        return panel;
    }

    public getWebview(): vscode.WebviewPanel | undefined {
        return this._panel;
    }

    private getWebviewContent(webview: vscode.Webview) {
        // The JS file from the React build output
        const scriptUri = getComposerJSFiles(extension.context, 'Visualizer', webview).map(jsFile =>
            '<script charset="UTF-8" src="' + jsFile + '"></script>').join('\n');

        // const codiconUri = webview.asWebviewUri(Uri.joinPath(extension.context.extensionUri, "resources", "codicons", "codicon.css"));
        // const fontsUri = webview.asWebviewUri(Uri.joinPath(extension.context.extensionUri, "node_modules", "@wso2", "font-wso2-vscode", "dist", "wso2-vscode.css"));

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <title>Micro Integrator</title>
         
          <style>
            body, html, #root {
                height: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
                --vscode-textPreformat-foreground: var(--vscode-minimap-findMatchHighlight);
            }
          </style>
          ${scriptUri}
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root">
                Loading ....
            </div>
            <script>
            function render() {
                visualizerWebview.renderWebview(
                    document.getElementById("root"), "runtime-services"
                );
            }
            render();
        </script>
        </body>
        </html>
      `;
    }

    public dispose() {
        RuntimeServicesWebview.webviews.delete(this.projectUri);
        this._panel?.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }

        this._panel = undefined;
    }
}
