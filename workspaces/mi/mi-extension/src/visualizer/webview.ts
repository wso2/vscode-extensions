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
import { extension } from '../MIExtensionContext';
import { deleteStateMachine, getStateMachine } from '../stateMachine';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { refreshDiagram } from './activate';
import { MILanguageClient } from '../lang-client/activator';
import { deletePopupStateMachine } from '../stateMachinePopup';

export const webviews: Map<string, VisualizerWebview> = new Map();
export class VisualizerWebview {
    // public static currentPanel: VisualizerWebview | undefined;
    public static readonly viewType = 'micro-integrator.visualizer';
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];
    private beside: boolean;
    private projectUri: string;

    constructor(view: MACHINE_VIEW, projectUri: string, beside: boolean = false) {
        this.projectUri = projectUri;
        this.beside = beside;
        this._panel = this.createWebview(view, beside);
        this._panel.onDidDispose(async () => await this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getWebviewContent(this._panel.webview);
        RPCLayer.create(this._panel, projectUri);

        this._panel.onDidChangeViewState(() => {
            // Enable the Run and Build Project, Open AI Panel commands when the webview is active
            vscode.commands.executeCommand('setContext', 'isVisualizerActive', this._panel?.active);

            if (this._panel?.active && getStateMachine(projectUri).context().view === MACHINE_VIEW.DataMapperView) {
                refreshDiagram(projectUri);
            }
        });
    }

    private createWebview(view: MACHINE_VIEW, beside: boolean): vscode.WebviewPanel {
        let title: string = view ?? 'Design View';
        const workspaces = vscode.workspace.workspaceFolders;
        const projectName = workspaces && workspaces.length > 1 ? path.basename(this.projectUri) : '';
        if (projectName) {
            title = `${title} - ${projectName}`;
        }
        const panel = vscode.window.createWebviewPanel(
            VisualizerWebview.viewType,
            title,
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

    public getProjectUri(): string {
        return this.projectUri;
    }

    public isBeside(): boolean {
        return this.beside;
    }

    public getIconPath(iconPath: string, name: string): string | undefined {
        const panel = this.getWebview();
        let iconPathUri;

        // Check if PNG file exists
        if (fs.existsSync(path.join(iconPath, name + '.png'))) {
            iconPathUri = vscode.Uri.file(path.join(iconPath, name + '.png').toString());
        } else if (fs.existsSync(path.join(iconPath, name + '.svg'))) {
            // Check for SVG
            iconPathUri = vscode.Uri.file(path.join(iconPath, name + '.svg').toString());
        } else if (fs.existsSync(path.join(iconPath, name + '.gif'))) {
            // Use GIF
            iconPathUri = vscode.Uri.file(path.join(iconPath, name + '.gif').toString());
        } else {
            return undefined;
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

    public async dispose() {
        webviews.delete(this.projectUri);
        deleteStateMachine(this.projectUri);
        deletePopupStateMachine(this.projectUri);
        RPCLayer._messengers.delete(this.projectUri);
        await MILanguageClient.stopInstance(this.projectUri);
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
