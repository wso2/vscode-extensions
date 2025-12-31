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

export class TryItPanel {
	public static currentPanel: TryItPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	private constructor(panel: vscode.WebviewPanel, extensionContext: vscode.ExtensionContext) {
		this._panel = panel;

		this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionContext);

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		
		// Set up message handling from webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.type) {
					case 'webviewReady':
						ApiTryItStateMachine.sendEvent(EVENT_TYPE.WEBVIEW_READY);
						break;
				}
			},
			null,
			this._disposables
		);
		
		// Listen for API selection events and post to webview
		const subscription = ApiTryItStateMachine.onApiSelection((data) => {
			this._panel.webview.postMessage({
				type: 'apiRequestItemSelected',
				data: data
			});
		});
		
		this._disposables.push(subscription);
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

	public dispose() {
		TryItPanel.currentPanel = undefined;

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
                    if (typeof apiTryItVisualizerWebview !== 'undefined' && apiTryItVisualizerWebview.renderEditorPanel) {
                        apiTryItVisualizerWebview.renderEditorPanel(document.getElementById("root"));
                    } else {
                        console.error('apiTryItVisualizerWebview not loaded');
                        document.getElementById("root").innerHTML = 'Error: Failed to load API TryIt visualizer';
                    }
                });
            </script>
        </body>
        </html>
      `;
	}
}
