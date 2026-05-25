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
import { Uri, ViewColumn, workspace } from 'vscode';
import { getComposerJSFiles } from '../util';
import { RPCLayer } from '../RPCLayer';
import { extension } from '../MIExtensionContext';
import { StateMachineAI } from './aiMachine';
import { AI_EVENT_TYPE } from '@wso2/mi-core';
import { disposeProjectResourcesIfOrphaned } from '../util/projectResources';

export class AiPanelWebview {
    public static currentPanel: AiPanelWebview | undefined;
    public static readonly viewType = 'micro-integrator.ai-panel';
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];
    private projectUri: string | undefined;

    constructor() {
        this._panel = AiPanelWebview.createWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getWebviewContent(this._panel.webview);
        // TODO: Fix projectUri handling for multiple workspaces
        this.projectUri = workspace.workspaceFolders?.[0].uri.fsPath;
        RPCLayer.create(this._panel, this.projectUri!);
    }

    // Sibling-cleanup check used by other panels' dispose paths to avoid
    // tearing down shared per-project resources while the AI panel is alive.
    public static isOpenForProject(projectUri: string): boolean {
        return AiPanelWebview.currentPanel?.projectUri === projectUri;
    }

    private static createWebview(): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            AiPanelWebview.viewType,
            "WSO2 Integrator Copilot",
            ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [Uri.file(path.join(extension.context.extensionPath, 'resources'))],
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
          <title>WSO2 Integrator: MI</title>
         
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
                Loading ....
            </div>
            <script>
            function render() {
                visualizerWebview.renderWebview(
                    document.getElementById("root"), "ai"
                );
            }
            render();
        </script>
        </body>
        </html>
      `;
    }

    public dispose() {
        AiPanelWebview.currentPanel = undefined;
        StateMachineAI.sendEvent(AI_EVENT_TYPE.DISPOSE);
        this._panel?.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }

        // The per-project state machines and shared messenger are reused by sibling
        // webviews (visualizer, runtime services panel). Delegate cleanup to the helper
        // which self-skips while siblings remain — whichever panel closes last performs
        // the teardown.
        if (this.projectUri) {
            disposeProjectResourcesIfOrphaned(this.projectUri);
        }
        this._panel = undefined;
    }
}
