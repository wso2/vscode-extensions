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
import { getComposerJSFiles } from '../util';
import { ApiTryItStateMachine, EVENT_TYPE } from '../stateMachine';
import { ApiRequestItem } from '@wso2/api-tryit-core';
import { Messenger } from 'vscode-messenger';
import { registerApiTryItRpcHandlers } from '../rpc-managers';

export class TryItPanel {
	public static currentPanel: TryItPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];
	private static _messenger: Messenger = new Messenger();

	private constructor(panel: vscode.WebviewPanel, extensionContext: vscode.ExtensionContext) {
		this._panel = panel;

		// Register messenger with webview panel
		TryItPanel._messenger.registerWebviewPanel(this._panel);

		this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionContext);

		// Register webview with state machine
		ApiTryItStateMachine.registerWebview(this._panel);

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Set up message handling from webview
		this._panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.type) {
					case 'webviewReady':
						ApiTryItStateMachine.sendEvent(EVENT_TYPE.WEBVIEW_READY);
						break;
					case 'requestUpdated':
						ApiTryItStateMachine.sendEvent(EVENT_TYPE.REQUEST_UPDATED, message.data);
						break;
					case 'saveRequest':
						// Handle save request using the RPC manager
						try {
							const { filePath, request, response } = message.data;

							// Get the current state to check for persisted file path
							const stateContext = ApiTryItStateMachine.getContext();
							let targetFilePath = filePath || stateContext.selectedFilePath;

							if (!targetFilePath) {
								// First, prompt user to select a folder
								const folderUris = await vscode.window.showOpenDialog({
									canSelectFolders: true,
									canSelectFiles: false,
									canSelectMany: false,
									defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
									openLabel: 'Select Folder for API Requests'
								});

								if (!folderUris || folderUris.length === 0) {
									// User cancelled folder selection
									this._panel.webview.postMessage({
										type: 'saveRequestResponse',
										data: { success: false, message: 'Folder selection cancelled by user' }
									});
									break;
								}

								const selectedFolder = folderUris[0];

								// Now show save dialog in the selected folder
								const fileUri = await vscode.window.showSaveDialog({
									defaultUri: vscode.Uri.joinPath(selectedFolder, 'api-request.yaml'),
									filters: {
										'YAML files': ['yaml', 'yml']
									},
									saveLabel: 'Save API Request'
								});

								if (!fileUri) {
									// User cancelled file save
									this._panel.webview.postMessage({
										type: 'saveRequestResponse',
										data: { success: false, message: 'Save cancelled by user' }
									});
									break;
								}

								targetFilePath = fileUri.fsPath;
							}

							// Import the RPC manager here to avoid circular dependencies
							const { ApiTryItRpcManager } = await import('../rpc-managers/rpc-manager');
							const rpcManager = new ApiTryItRpcManager();
							const saveResponse = await rpcManager.saveRequest({ 
								filePath: targetFilePath, 
								request,
								response
							});

							// Send response back to webview
							this._panel.webview.postMessage({
								type: 'saveRequestResponse',
								data: saveResponse
							});

							if (saveResponse.success) {
								vscode.window.showInformationMessage(`Request saved successfully to: ${targetFilePath}`);
								// Refresh explorer so new/updated request files are reloaded
								vscode.commands.executeCommand('api-tryit.refreshExplorer');
								// Inform state machine about the saved request so it can update caches and notify webviews
								try {
									const savedItem: ApiRequestItem = {
										id: request.id,
										name: request.name,
										request,
										filePath: targetFilePath
									};
									ApiTryItStateMachine.sendEvent(EVENT_TYPE.REQUEST_UPDATED, savedItem);
								} catch {
									vscode.window.showErrorMessage('Failed to notify state machine about saved request');
								}
							} else {
								vscode.window.showErrorMessage(`Failed to save request: ${saveResponse.message}`);
							}
						} catch (error: unknown) {
							this._panel.webview.postMessage({
								type: 'saveRequestResponse',
								data: { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
							});
							vscode.window.showErrorMessage(`Error saving request: ${error instanceof Error ? error.message : 'Unknown error'}`);
						}
						break;
				}
			},
			null,
			this._disposables
		);
	}

	public static init() {
		// Register RPC handlers
		registerApiTryItRpcHandlers(TryItPanel._messenger);
	}

	public static show(extensionContext: vscode.ExtensionContext) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (TryItPanel.currentPanel) {
			TryItPanel.currentPanel._panel.reveal(column);
			return;
		}

		const isDevMode = process.env.WEB_VIEW_WATCH_MODE === 'true';
		const devHost = process.env.WEB_VIEW_DEV_HOST || 'http://localhost:8080';

		const panel = vscode.window.createWebviewPanel(
			'apiTryIt',
			'API TryIt',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: isDevMode
					? [extensionContext.extensionUri, vscode.Uri.parse(devHost)]
					: [extensionContext.extensionUri]
			}
		);

		TryItPanel.currentPanel = new TryItPanel(panel, extensionContext);
	}

	public static sendRequestToWebview(requestItem: unknown) {
		if (TryItPanel.currentPanel) {
			TryItPanel.currentPanel._panel.webview.postMessage({
				type: 'loadRequest',
				data: requestItem
			});
		}
	}

	public dispose() {
		TryItPanel.currentPanel = undefined;

		// Unregister webview from state machine
		ApiTryItStateMachine.unregisterWebview();

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	private _getWebviewContent(webview: vscode.Webview, extensionContext: vscode.ExtensionContext) {
		const scriptUris = getComposerJSFiles(extensionContext, 'ApiTryItVisualizer', webview);

		return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <title>API TryIt</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              height: 100vh;
              overflow: hidden;
            }
            #root {
              height: 100%;
              width: 100%;
            }
          </style>
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root">
                Loading ....
            </div>
            ${scriptUris.map(jsFile => `<script charset="UTF-8" src="${jsFile}"></script>`).join('\n')}
            <script>
                window.addEventListener('DOMContentLoaded', function() {
                    console.log('DOM loaded, checking for apiTryItVisualizerWebview...');
                    console.log('window.apiTryItVisualizerWebview:', typeof window.apiTryItVisualizerWebview);
                    
                    if (typeof apiTryItVisualizerWebview !== 'undefined' && apiTryItVisualizerWebview.renderEditorPanel) {
                        console.log('Found apiTryItVisualizerWebview.renderEditorPanel, calling it...');
                        apiTryItVisualizerWebview.renderEditorPanel(document.getElementById("root"));
                    } else {
                        console.error('apiTryItVisualizerWebview not loaded or renderEditorPanel not available');
                        console.error('apiTryItVisualizerWebview:', apiTryItVisualizerWebview);
                        document.getElementById("root").innerHTML = 'Error: Failed to load API TryIt visualizer. Check console for details.';
                    }
                });
            </script>
        </body>
        </html>
      `;
	}
}
