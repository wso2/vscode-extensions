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

import type { ComponentConfig, ComponentFormWebviewProps } from "@wso2/wso2-platform-core";
import * as vscode from "vscode";
import { ext } from "../extensionVariables";
import { dataCacheStore } from "../stores/data-cache-store";
import { webviewStateStore } from "../stores/webview-state-store";
import { WebViewPanelRpc } from "./WebviewRPC";
import { getUri } from "./utils";

export type IComponentCreateFormParams = Omit<ComponentFormWebviewProps, "type" | "existingComponents">;

/** Single component creation params - kept for backward compatibility */
export type ISingleComponentCreateFormParams = Omit<IComponentCreateFormParams, "components"> & ComponentConfig;

export class ComponentFormView {
	public static currentPanel: ComponentFormView | undefined;
	private _panel: vscode.WebviewPanel | undefined;
	private _disposables: vscode.Disposable[] = [];
	private _rpcHandler: WebViewPanelRpc;

	constructor(
		extensionUri: vscode.Uri,
		params: IComponentCreateFormParams | ISingleComponentCreateFormParams,
		rootDirectory: string
	) {
		this._panel = ComponentFormView.createWebview();
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		// Convert legacy single component params to new format if needed
		const normalizedParams = this.normalizeParams(params);
		this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri, normalizedParams, rootDirectory);
		this._rpcHandler = new WebViewPanelRpc(this._panel);
	}

	/**
	 * Normalizes params to ensure they use the new components array format.
	 * Supports backward compatibility with single component params.
	 */
	private normalizeParams(params: IComponentCreateFormParams | ISingleComponentCreateFormParams): IComponentCreateFormParams {
		// Check if params already has components array (new format)
		if ("components" in params && Array.isArray(params.components)) {
			return params as IComponentCreateFormParams;
		}

		// Convert legacy single component format to new format
		const legacyParams = params as ISingleComponentCreateFormParams;
		return {
			organization: legacyParams.organization,
			project: legacyParams.project,
			extensionName: legacyParams.extensionName,
			components: [
				{
					directoryUriPath: legacyParams.directoryUriPath,
					directoryFsPath: legacyParams.directoryFsPath,
					directoryName: legacyParams.directoryName,
					initialValues: legacyParams.initialValues,
					isNewCodeServerComp: legacyParams.isNewCodeServerComp,
					supportedIntegrationTypes: legacyParams.supportedIntegrationTypes,
				},
			],
			rootDirectory: legacyParams.rootDirectory,
		};
	}

	private static createWebview(): vscode.WebviewPanel {
		const extName = webviewStateStore.getState().state?.extensionName;
		const panel = vscode.window.createWebviewPanel(
			"create-new-component",
			extName === "Devant" ? "Deploy Integration" : "Create Component",
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			},
		);

		panel.iconPath = {
			light: vscode.Uri.joinPath(ext.context.extensionUri, "resources", "icons", extName === "Devant" ? "devant-2-black.svg" : "choreo-2-black.svg"),
			dark: vscode.Uri.joinPath(ext.context.extensionUri, "resources", "icons", extName === "Devant" ? "devant-2-white.svg" : "choreo-2-white.svg"),
		};

		return panel;
	}

	public getWebview(): vscode.WebviewPanel | undefined {
		return this._panel;
	}

	private _getWebviewContent(
		webview: vscode.Webview,
		extensionUri: vscode.Uri,
		params: IComponentCreateFormParams,
		rootDirectory: string
	) {
		// The JS file from the React build output
		const scriptUri = getUri(webview, extensionUri, ["resources", "jslibs", "main.js"]);

		const codiconUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "resources", "codicons", "codicon.css"));

		const webviewProps: ComponentFormWebviewProps = {
			type: "NewComponentForm",
			existingComponents: dataCacheStore.getState().getComponents(params.organization.handle, params.project.handler),
			organization: params.organization,
			project: params.project,
			extensionName: params.extensionName,
			components: params.components,
			rootDirectory: rootDirectory,
		};

		return /*html*/ `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
              <meta name="theme-color" content="#000000">
              <title>WSO2 Platform Webview Wizard</title>
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
                  	${JSON.stringify(webviewProps)}
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
