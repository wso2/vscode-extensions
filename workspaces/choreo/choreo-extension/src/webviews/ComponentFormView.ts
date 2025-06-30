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

import type { NewComponentWebviewProps, Organization, Project } from "@wso2/choreo-core";
import * as vscode from "vscode";
import { ext } from "../extensionVariables";
import { dataCacheStore } from "../stores/data-cache-store";
import { WebViewPanelRpc } from "./WebviewRPC";
import { getUri } from "./utils";

export type IComponentCreateFormParams = Omit<NewComponentWebviewProps, "type" | "existingComponents">;

export class ComponentFormView {
	public static currentPanel: ComponentFormView | undefined;
	private _panel: vscode.WebviewPanel | undefined;
	private _disposables: vscode.Disposable[] = [];
	private _rpcHandler: WebViewPanelRpc;

	constructor(extensionUri: vscode.Uri, params: IComponentCreateFormParams) {
		this._panel = ComponentFormView.createWebview();
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri, params);
		this._rpcHandler = new WebViewPanelRpc(this._panel);
	}

	private static createWebview(): vscode.WebviewPanel {
		const panel = vscode.window.createWebviewPanel("create-new-component", "Create Component", vscode.ViewColumn.One, {
			enableScripts: true,
			retainContextWhenHidden: true,
		});

		panel.iconPath = vscode.Uri.joinPath(ext.context.extensionUri, "resources", "icons", "choreo-2.svg");

		return panel;
	}

	public getWebview(): vscode.WebviewPanel | undefined {
		return this._panel;
	}

	private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, params: IComponentCreateFormParams) {
		// The JS file from the React build output
		const scriptUri = getUri(webview, extensionUri, ["resources", "jslibs", "main.js"]);

		const codiconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "resources", "codicons", "codicon.css"));

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
											type: "NewComponentForm",
											existingComponents: dataCacheStore.getState().getComponents(params.organization.handle, params.project.handler),
											...params,
										} as NewComponentWebviewProps)}
                );
              }
              render();
            </script>
          </html>
        `;
	}

	public dispose() {
		ComponentFormView.currentPanel = undefined;
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
