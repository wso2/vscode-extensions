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
import { hasActiveDocumentInWorkspace } from '../util/workspace';

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
                    vscode.Uri.file(os.homedir()),
                    vscode.Uri.file(extension.context.extensionPath)
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
        console.debug("Generating webview content for MI Visualizer");
        // The JS file from the React build output
        const jsFiles = getComposerJSFiles(extension.context, 'Visualizer', webview);
        console.debug('JS files to be included:', jsFiles);

        const scriptUri = jsFiles.map(jsFile => {
            const scriptTag = '<script charset="UTF-8" src="' + jsFile + '"></script>';
            console.debug('Generated script tag:', scriptTag);
            return scriptTag;
        }).join('\n');

        // const codiconUri = webview.asWebviewUri(Uri.joinPath(extension.context.extensionUri, "resources", "codicons", "codicon.css"));
        // const fontsUri = webview.asWebviewUri(Uri.joinPath(extension.context.extensionUri, "node_modules", "@wso2", "font-wso2-vscode", "dist", "wso2-vscode.css"));

        const body = `<div class="container" id="root">
            <div class="loader-wrapper">
                <div class="welcome-content">
                    <div class="logo-container">
                        <div class="loader"></div>
                    </div>
                    <h1 class="welcome-title">WSO2 Integrator: MI</h1>
                    <p class="welcome-subtitle">Setting up your workspace and tools</p>
                    <div class="loading-text">
                        <span class="loading-dots">Loading</span>
                    </div>
                </div>
            </div>
        </div>`;

        const styles = `
            .container {
                background-color: var(--vscode-editor-background);
                height: 100vh;
                width: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
            }
            .loader-wrapper {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                height: 100%;
                width: 100%;
                padding-top: 30vh;
            }
            .loader {
                width: 32px;
                aspect-ratio: 1;
                border-radius: 50%;
                border: 4px solid var(--vscode-button-background);
                animation:
                    l20-1 0.8s infinite linear alternate,
                    l20-2 1.6s infinite linear;
            }
            @keyframes l20-1{
                0%    {clip-path: polygon(50% 50%,0       0,  50%   0%,  50%    0%, 50%    0%, 50%    0%, 50%    0% )}
                12.5% {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100%   0%, 100%   0%, 100%   0% )}
                25%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 100% 100%, 100% 100% )}
                50%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
                62.5% {clip-path: polygon(50% 50%,100%    0, 100%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
                75%   {clip-path: polygon(50% 50%,100% 100%, 100% 100%,  100% 100%, 100% 100%, 50%  100%, 0%   100% )}
                100%  {clip-path: polygon(50% 50%,50%  100%,  50% 100%,   50% 100%,  50% 100%, 50%  100%, 0%   100% )}
            }
            @keyframes l20-2{ 
                0%    {transform:scaleY(1)  rotate(0deg)}
                49.99%{transform:scaleY(1)  rotate(135deg)}
                50%   {transform:scaleY(-1) rotate(0deg)}
                100%  {transform:scaleY(-1) rotate(-135deg)}
            }
            .welcome-content {
                text-align: center;
                max-width: 500px;
                padding: 2rem;
                animation: fadeIn 1s ease-in-out;
                font-family: var(--vscode-font-family);
            }
            .logo-container {
                margin-bottom: 2rem;
                display: flex;
                justify-content: center;
            }
            .welcome-title {
                color: var(--vscode-foreground);
                margin: 0 0 0.5rem 0;
                letter-spacing: -0.02em;
                font-size: 1.5em;
                font-weight: 400;
                line-height: normal;
            }
            .welcome-subtitle {
                color: var(--vscode-descriptionForeground);
                font-size: 13px;
                margin: 0 0 2rem 0;
                opacity: 0.8;
            }
            .loading-text {
                color: var(--vscode-foreground);
                font-size: 13px;
                font-weight: 500;
            }
            .loading-dots::after {
                content: '';
                animation: dots 1.5s infinite;
            }
            @keyframes fadeIn {
                0% { 
                    opacity: 0;
                }
                100% { 
                    opacity: 1;
                }
            }
            @keyframes dots {
                0%, 20% { content: ''; }
                40% { content: '.'; }
                60% { content: '..'; }
                80%, 100% { content: '...'; }
            }
        `;

        const scripts = `
            function render() {
                visualizerWebview.renderWebview(
                    document.getElementById("root"), "visualizer"
                );
            }
            render();
        `;

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
            <meta name="theme-color" content="#000000">
            <title>WSO2 Integrator: MI</title>
            <style>
                ${styles}
            </style>
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            ${body}
            ${scriptUri}
            <script>${scripts}</script>
        </body>
        </html>
      `;
    }

    public async dispose() {
        webviews.delete(this.projectUri);
        deleteStateMachine(this.projectUri);
        deletePopupStateMachine(this.projectUri);
        RPCLayer._messengers.delete(this.projectUri);
        const hasActiveDocument = hasActiveDocumentInWorkspace(this.projectUri);

        if (!hasActiveDocument) {
            await MILanguageClient.stopInstance(this.projectUri);
        }

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
