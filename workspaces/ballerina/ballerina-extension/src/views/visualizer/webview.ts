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

import * as vscode from "vscode";
import * as path from "path";
import { Uri, ViewColumn, Webview } from "vscode";
import { RPCLayer } from "../../RPCLayer";
import { debounce } from "lodash";
import { WebViewOptions, getComposerWebViewOptions, getLibraryWebViewContent } from "../../utils/webview-utils";
import { extension } from "../../BalExtensionContext";
import { StateMachine, updateView } from "../../stateMachine";
import { LANGUAGE } from "../../core";

export class VisualizerWebview {
    public static currentPanel: VisualizerWebview | undefined;
    public static readonly viewType = "ballerina.visualizer";
    public static readonly ballerinaTitle = "Ballerina Visualizer";
    public static readonly biTitle = "WSO2 Integrator: BI";
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];

    constructor() {
        this._panel = VisualizerWebview.createWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getWebviewContent(this._panel.webview);
        RPCLayer.create(this._panel);

        // Handle the text change and diagram update with rpc notification
        const sendUpdateNotificationToWebview = debounce(async (refreshTreeView?: boolean) => {
            if (this._panel) {
                updateView(refreshTreeView);
            }
        }, 500);

        vscode.workspace.onDidChangeTextDocument(async (document) => {
            const state = StateMachine.state();
            const machineReady = typeof state === 'object' && 'viewActive' in state && state.viewActive === "viewReady";
            // Save the document only if it is not already opened in a visible editor or the webview is active
            const isOpened = vscode.window.visibleTextEditors.some(editor => editor.document.uri.toString() === document.document.uri.toString());
            if (!isOpened || this._panel?.active) {
                await document.document.save();
            }
            if (this._panel?.active && machineReady && document && document.document.languageId === LANGUAGE.BALLERINA) {
                sendUpdateNotificationToWebview();
            } else if (machineReady && document?.document && document.document.languageId === LANGUAGE.TOML && document.document.fileName.endsWith("Config.toml") &&
                vscode.window.visibleTextEditors.some(editor => editor.document.fileName === document.document.fileName)) {
                sendUpdateNotificationToWebview(true);
            }
        }, extension.context);

        vscode.workspace.onDidDeleteFiles(() => {
            sendUpdateNotificationToWebview();
        });

        this._panel.onDidChangeViewState(() => {
            vscode.commands.executeCommand('setContext', 'isBalVisualizerActive', this._panel?.active);
            // Refresh the webview when becomes active
            const state = StateMachine.state();
            const machineReady = typeof state === 'object' && 'viewActive' in state && state.viewActive === "viewReady";
            if (this._panel?.active && machineReady) {
                sendUpdateNotificationToWebview(true);
            }
        });

        this._panel.onDidDispose(() => {
            vscode.commands.executeCommand('setContext', 'isBalVisualizerActive', false);
        });
    }

    public static get webviewTitle(): string {
        const biExtension = vscode.extensions.getExtension('wso2.ballerina-integrator');
        return biExtension ? VisualizerWebview.biTitle : VisualizerWebview.ballerinaTitle;
    }

    private static createWebview(): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            VisualizerWebview.viewType,
            VisualizerWebview.webviewTitle,
            { viewColumn: ViewColumn.Active, preserveFocus: true },
            {
                enableScripts: true,
                localResourceRoots: [Uri.file(path.join(extension.context.extensionPath, "resources"))],
                retainContextWhenHidden: true,
            }
        );
        const biExtension = vscode.extensions.getExtension('wso2.ballerina-integrator');
        panel.iconPath = {
            light: vscode.Uri.file(path.join(extension.context.extensionPath, 'resources', 'icons', biExtension ? 'light-icon.svg' : 'ballerina.svg')),
            dark: vscode.Uri.file(path.join(extension.context.extensionPath, 'resources', 'icons', biExtension ? 'dark-icon.svg' : 'ballerina-inverse.svg'))
        };
        return panel;
    }

    public getWebview(): vscode.WebviewPanel | undefined {
        return this._panel;
    }

    private getWebviewContent(webView: Webview) {
        const body = `<div class="container" id="webview-container">
                <div class="loader-wrapper">
                    <div class="welcome-content">
                        <div class="logo-container">
                            <div class="loader"></div>
                        </div>
                        <h1 class="welcome-title">WSO2 Integrator: BI</h1>
                        <p class="welcome-subtitle">Setting up your workspace and tools</p>
                        <div class="loading-text">
                            <span class="loading-dots">Loading</span>
                        </div>
                    </div>
                </div>
            </div>`;
        const bodyCss = ``;
        const styles = `
            .container {
                background-color: var(--vscode-editor-background);
                height: 100vh;
                width: 100%;
                display: flex;
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
            /* New welcome view styles */
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
            function loadedScript() {
                function renderDiagrams() {
                    visualizerWebview.renderWebview("visualizer", document.getElementById("webview-container"));
                }
                renderDiagrams();
            }
        `;

        const webViewOptions: WebViewOptions = {
            ...getComposerWebViewOptions("Visualizer", webView),
            body,
            scripts,
            styles,
            bodyCss,
        };

        return getLibraryWebViewContent(webViewOptions, webView);
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
        StateMachine.resetToExtensionReady();
    }
}
