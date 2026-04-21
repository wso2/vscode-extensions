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
import { onFileChanged, onDocumentFileChanged } from '@wso2/api-designer-core';
import { logDebug } from '../util/logger';

export class VisualizerWebview {
    public static currentPanel: VisualizerWebview | undefined;
    public static readonly viewType = 'api-designer.visualizer';
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];
    private _docsWatcher: vscode.FileSystemWatcher | undefined;
    // Track which document files are being saved from webview to prevent circular updates
    private _savingFromWebview: Map<string, boolean> = new Map();
    private _changeDebounceTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(beside: boolean = false) {
        this._panel = VisualizerWebview.createWebview(beside);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getWebviewContent(this._panel.webview);
        RPCLayer.create(this._panel);

        const sendUpdateNotificationToWebview = debounce(() => {
            if (this._panel) {
                logDebug('Sending update notification to webview');
            }
        }, 500);

        // Handle the text change and diagram update with rpc notification
        const refreshDiagram = debounce(async () => {
            if (this.getWebview()) {
                navigate();
            }
        }, 500);

        // Handle text document changes - for both OpenAPI files and document files
        vscode.workspace.onDidChangeTextDocument(async (event) => {
            const document = event.document;
            const filePath = document.uri.fsPath;
            const isDocumentFile = /\.(md|txt)$/i.test(filePath);
            const isInDocsFolder = filePath.includes('/docs/') || filePath.includes('\\docs\\');
            
            // Handle document files (markdown, html, txt) in docs folder
            if (isDocumentFile && isInDocsFolder) {
                // Skip if this change came from the webview to prevent circular updates
                if (VisualizerWebview.currentPanel?.isSavingFromWebview(filePath)) {
                    return;
                }
                
                // Debounce change notifications to avoid rapid updates during typing
                const existingTimer = VisualizerWebview.currentPanel?._changeDebounceTimers.get(filePath);
                if (existingTimer) {
                    clearTimeout(existingTimer);
                }
                
                const timer = setTimeout(() => {
                    logDebug(`Document file changed (user edit): ${filePath}`);
                    // Get current document content for real-time updates
                    const currentContent = document.getText();
                    RPCLayer._messenger.sendNotification(
                        onDocumentFileChanged,
                        { type: 'webview', webviewType: VisualizerWebview.viewType },
                        { filePath, changeType: 'modified', timestamp: Date.now(), content: currentContent } as any
                    );
                    VisualizerWebview.currentPanel?._changeDebounceTimers.delete(filePath);
                }, 500);
                
                VisualizerWebview.currentPanel?._changeDebounceTimers.set(filePath, timer);
            } else {
                // Handle OpenAPI files - original behavior
                if (VisualizerWebview.currentPanel?.getWebview()?.active) {
                    await document.save();
                    refreshDiagram();
                }
            }
        }, null, extension.context.subscriptions);

        vscode.workspace.onDidSaveTextDocument(async function (document) {
            const projectUri = StateMachine.context().projectUri!;
            
            // Notify webview that the file has changed
            if (document.uri.fsPath === projectUri) {
                RPCLayer._messenger.sendNotification(
                    onFileChanged, 
                    { type: 'webview', webviewType: VisualizerWebview.viewType }, 
                    { filePath: document.uri.fsPath, timestamp: Date.now() }
                );
            }
            
            // Check if the saved file is a document file (md, html, txt) in a docs folder
            const filePath = document.uri.fsPath;
            const isDocumentFile = /\.(md|txt)$/i.test(filePath);
            const isInDocsFolder = filePath.includes('/docs/') || filePath.includes('\\docs\\');
            
            // Skip if this save came from the webview to prevent circular updates
            if (isDocumentFile && isInDocsFolder && VisualizerWebview.currentPanel?.isSavingFromWebview(filePath)) {
                return;
            }
            
            if (isDocumentFile && isInDocsFolder) {
                logDebug(`Document file saved: ${filePath}`);
                RPCLayer._messenger.sendNotification(
                    onDocumentFileChanged,
                    { type: 'webview', webviewType: VisualizerWebview.viewType },
                    { filePath, changeType: 'modified', timestamp: Date.now() }
                );
            }
            
            refreshDiagram();
        }, extension.context);

        // Set up file watcher for docs folder
        this.setupDocsWatcher();

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
          <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:; style-src 'self' 'unsafe-inline' https: http:; img-src 'self' data: blob: https: http:; font-src 'self' data: https: http:; connect-src 'self' https: http: ws: wss:; frame-src 'self' blob: data: https: http:;">
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
        this._docsWatcher?.dispose();

        // Clear all debounce timers
        this._changeDebounceTimers.forEach(timer => clearTimeout(timer));
        this._changeDebounceTimers.clear();
        this._savingFromWebview.clear();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }

        this._panel = undefined;
    }

    private setupDocsWatcher() {
        // Watch for document files (md, html, txt) in any docs folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return;
        }

        // Create a watcher for doc files
        const pattern = new vscode.RelativePattern(
            workspaceFolders[0],
            '**/docs/**/*.{md,html,txt}'
        );

        this._docsWatcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);

        const sendDocumentNotification = (filePath: string, changeType: 'created' | 'modified' | 'deleted') => {
            // Skip if this change came from the webview
            if (this.isSavingFromWebview(filePath)) {
                return;
            }
            logDebug(`Document file ${changeType}: ${filePath}`);
            RPCLayer._messenger.sendNotification(
                onDocumentFileChanged,
                { type: 'webview', webviewType: VisualizerWebview.viewType },
                { filePath, changeType, timestamp: Date.now() }
            );
        };

        this._docsWatcher.onDidCreate((uri) => {
            sendDocumentNotification(uri.fsPath, 'created');
        });

        this._docsWatcher.onDidChange((uri) => {
            sendDocumentNotification(uri.fsPath, 'modified');
        });

        this._docsWatcher.onDidDelete((uri) => {
            sendDocumentNotification(uri.fsPath, 'deleted');
        });

        this._disposables.push(this._docsWatcher);
    }

    public markSavingFromWebview(filePath: string) {
        this._savingFromWebview.set(filePath, true);
    }

    public clearSavingFromWebview(filePath: string) {
        this._savingFromWebview.delete(filePath);
    }

    public isSavingFromWebview(filePath: string): boolean {
        return this._savingFromWebview.get(filePath) === true;
    }
}
