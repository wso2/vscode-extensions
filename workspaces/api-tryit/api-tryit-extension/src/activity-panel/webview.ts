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

export class ActivityPanel implements vscode.WebviewViewProvider {
	public static readonly viewType = 'api-tryit.activity.panel';
	private _view?: vscode.WebviewView;

	constructor(private readonly _extensionContext: vscode.ExtensionContext) { }

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext<unknown>,
		_token: vscode.CancellationToken
	): void | Promise<void> {
		this._view = webviewView;
		const isDevMode = process.env.WEB_VIEW_WATCH_MODE === 'true';
		const devHost = process.env.WEB_VIEW_DEV_HOST || 'http://localhost:8080';

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: isDevMode
				? [
					this._extensionContext.extensionUri,
					vscode.Uri.parse(devHost)
				]
				: [
					this._extensionContext.extensionUri
				]
		};

		webviewView.webview.html = this._getWebviewContent(webviewView.webview);
	}

    private _getWebviewContent(webview: vscode.Webview) {
        const scriptUris = getComposerJSFiles(this._extensionContext, 'ApiTryItVisualizer', webview);

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <title>WSO2 API TryIt</title>
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root">
                Loading ....
            </div>
            ${scriptUris.map(jsFile => `<script charset="UTF-8" src="${jsFile}"></script>`).join('\n')}
            <script>
                window.addEventListener('DOMContentLoaded', function() {
                    if (typeof apiTryItVisualizerWebview !== 'undefined' && apiTryItVisualizerWebview.renderActivityPanel) {
                        apiTryItVisualizerWebview.renderActivityPanel(document.getElementById("root"));
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
