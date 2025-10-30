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

import { Uri, type Webview } from "vscode";
import * as vscode from "vscode";
import { ProjectActivityView } from "./ProjectActivityView";

export function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
	if (shouldUseWebViewDevMode(pathList)) {
		return process.env.WEB_VIEW_DEV_HOST_CHOREO;
	}
	return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

function shouldUseWebViewDevMode(pathList: string[]): boolean {
	return pathList[pathList.length - 1] === "main.js" && process.env.WEB_VIEW_DEV_MODE_CHOREO === "true" && process.env.WEB_VIEW_DEV_HOST_CHOREO !== undefined;
}

export function activateActivityWebViews(context: vscode.ExtensionContext) {
	const projectActivityViewProvider = new ProjectActivityView(context.extensionUri);

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(ProjectActivityView.viewType, projectActivityViewProvider));
}
