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

import type { WebviewProps } from "@wso2/choreo-core";
import * as vscode from "vscode";
import { ext } from "../extensionVariables";
import { contextStore } from "../stores/context-store";
import { WebViewViewRPC } from "./WebviewRPC";
import { getUri } from "./utils";

export class ProjectActivityView implements vscode.WebviewViewProvider {
	public static readonly viewType = "choreo.activity.project";

	private _view?: vscode.WebviewView;
	private _rpc?: WebViewViewRPC;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
		this._view = webviewView;
		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [this._extensionUri],
		};
		webviewView.webview.html = this._getWebviewContent(webviewView.webview);
		this._rpc = new WebViewViewRPC(webviewView);
		// this.updateProjectInfo();

		contextStore.subscribe((store) => {
			webviewView.title = store?.state?.selected?.project?.name ?? "Project";
			// webviewView.description = store?.state?.selected?.org?.name;
		});
	}

	private _getWebviewContent(webview: vscode.Webview) {
		// The JS file from the React build output
		const scriptUri = getUri(webview, ext.context.extensionUri, ["resources", "jslibs", "main.js"]);

		const codiconUri = webview.asWebviewUri(vscode.Uri.joinPath(ext.context.extensionUri, "resources", "codicons", "codicon.css"));

		return /*html*/ `
			  <!DOCTYPE html>
			  <html lang="en">
				<head>
				  <meta charset="utf-8">
				  <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
				  <meta name="theme-color" content="#000000">
				  <title>Choreo Webview Wizard</title>
				  <link rel="stylesheet" href="${codiconUri}">
				  <script src="${scriptUri}"></script>
				</head>
				<body>
				  <noscript>You need to enable JavaScript to run this app.</noscript>
				  <div id="root"></div>
				</body>
				<script>
				  function render() {
					choreoWebviews.renderChoreoWebViews(
						document.getElementById("root"), 
						${JSON.stringify({
							type: "ComponentsListActivityView",
							directoryFsPath: vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath,
						} as WebviewProps)}
					);
				  }
				  render();
				</script>
			  </html>
			`;
	}
}

// TODO: move common html content to different file!
