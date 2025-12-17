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
import * as fs from 'fs';

export function getComposerJSFiles(
	context: vscode.ExtensionContext,
	composerName: string,
	webview: vscode.Webview
): string[] {
	// Check if we're in dev mode (hot reload)
	const isDevMode = process.env.WEB_VIEW_WATCH_MODE === 'true';
	const devHost = process.env.WEB_VIEW_DEV_HOST || 'http://localhost:8080';

	if (isDevMode) {
		// Load from webpack-dev-server for hot reload
		return [`${devHost}/${composerName}.js`];
	}

	// Production mode: load from local files
	const jsLibsPath = path.join(context.extensionPath, 'resources', 'jslibs');
	const jsFiles: string[] = [];

	if (fs.existsSync(jsLibsPath)) {
		const files = fs.readdirSync(jsLibsPath);
		files.forEach(file => {
			if (file.startsWith(composerName) && file.endsWith('.js')) {
				const jsFilePath = vscode.Uri.file(path.join(jsLibsPath, file));
				jsFiles.push(webview.asWebviewUri(jsFilePath).toString());
			}
		});
	}

	return jsFiles;
}
