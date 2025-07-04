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
import * as os from 'os';
import * as fs from 'fs';
import { Uri, ViewColumn } from 'vscode';
import { getComposerJSFiles } from '../util';
import { RPCLayer } from '../RPCLayer';
import { extension } from '../APIDesignerExtensionContext';
import { debounce } from 'lodash';
import { navigate, StateMachine } from '../stateMachine';
import { MACHINE_VIEW } from '@wso2/api-designer-core';
import { COMMANDS } from '../constants';

export class VisualizerWebview {
    public static currentPanel: VisualizerWebview | undefined;
    public static readonly viewType = 'api-designer.visualizer';
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];

    constructor(beside: boolean = false) {
        this._panel = VisualizerWebview.createWebview(beside);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getWebviewContent(this._panel.webview);
        RPCLayer.create(this._panel);

        const sendUpdateNotificationToWebview = debounce(() => {
            if (this._panel) {
                console.log('Sending update notification to webview');
            }
        }, 500);

        // Handle the text change and diagram update with rpc notification
        const refreshDiagram = debounce(async () => {
            if (this.getWebview()) {
                navigate();
            }
        }, 500);

        vscode.workspace.onDidChangeTextDocument(async function (document) {
            if (VisualizerWebview.currentPanel?.getWebview()?.active) {
                await document.document.save();
                refreshDiagram();
            }
        }, extension.context);

        vscode.workspace.onDidSaveTextDocument(async function (document) {
            const projectUri = StateMachine.context().projectUri!;
            refreshDiagram();
        }, extension.context);

        this._panel.onDidChangeViewState((e) => {
            // Enable the Run and Build Project, Open AI Panel commands when the webview is active
            if (this._panel?.active) {
                refreshDiagram();
                vscode.commands.executeCommand('setContext', 'isViewOpenAPI', true);
            }
        });

        this._panel.onDidDispose(() => {
            // Enable the Run and Build Project, Open AI Panel commands when the webview is active
            vscode.commands.executeCommand('setContext', 'isViewOpenAPI', undefined);
        });

        // this._panel.onDidChangeViewState(() => {
        //     vscode.commands.executeCommand('setContext', 'isBalVisualizerActive', this._panel?.active);
        //     // Refresh the webview when becomes active
        //     if (this._panel?.active) {
        //         sendUpdateNotificationToWebview();
        //     }
        // });
    }

    private static createWebview(beside: boolean): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            VisualizerWebview.viewType,
            "API Designer",
            beside ? ViewColumn.Beside : ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(os.homedir())
                ]
            }
        );
        panel.iconPath = {
            light: Uri.file(path.join(extension.context.extensionPath, 'assets', 'light-icon.svg')),
            dark: Uri.file(path.join(extension.context.extensionPath, 'assets', 'dark-icon.svg'))
        };
        return panel;
    }

    public getWebview(): vscode.WebviewPanel | undefined {
        return this._panel;
    }

    public getIconPath(iconPath: string, name: string): string | undefined {
        const panel = this.getWebview();
        let iconPathUri;

        // Check if PNG file exists
        if (fs.existsSync(path.join(iconPath, name + '.png'))) {
            iconPathUri = vscode.Uri.file(path.join(iconPath, name + '.png').toString());
        } else {
            // If PNG does not exist, use GIF
            iconPathUri = vscode.Uri.file(path.join(iconPath, name + '.gif').toString());
        }

        if (panel) {
            const iconUri = panel.webview.asWebviewUri(iconPathUri);
            return iconUri.toString();
        }
    }

    private getWebviewContent(webview: vscode.Webview) {
        // The JS file from the React build output
        const scriptUri = getComposerJSFiles(extension.context, 'Visualizer', webview).map(jsFile =>
            '<script charset="UTF-8" src="' + jsFile + '"></script>').join('\n');

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <title>Open API Designer</title>
         
          <style>
            body, html, #root {
                height: 100%;
                margin: 0;
                padding: 0px;
                overflow: hidden;
            }
          </style>
          ${scriptUri}
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root">
            </div>
            <script>
            function render() {
                visualizerWebview.renderWebview(
                    document.getElementById("root"), "visualizer"
                );
            }
            render();
        </script>
        </body>
        </html>
      `;
    }

    public dispose() {
        VisualizerWebview.currentPanel = undefined;
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
