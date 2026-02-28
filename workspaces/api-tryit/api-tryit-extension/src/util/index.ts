/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
	const devHost = process.env.TRY_VIEW_DEV_HOST || 'http://localhost:9092';

	if (isDevMode) {
		// Load from webpack-dev-server for hot reload.
		// Only the dev bundle is loaded — loading both dev + local bundles in the same
		// webview causes the bundle to execute twice, which makes acquireVsCodeApi()
		// be called a second time and throws "An instance of the VS Code API has already
		// been acquired".
		return [`${devHost}/${composerName}.js`];
	}

	return getLocalComposerJSFiles(context, composerName, webview);
}

function getLocalComposerJSFiles(
	context: vscode.ExtensionContext,
	composerName: string,
	webview: vscode.Webview
): string[] {

	// Production mode: load only the exact deterministic bundle (e.g. ApiTryItVisualizer.js).
	// Using startsWith() can match stale hashed chunks left over from previous builds and
	// inject them all, causing bootstrap code (including acquireVsCodeApi) to run twice.
	const jsLibsPath = path.join(context.extensionPath, 'resources', 'jslibs');
	const exactBundlePath = path.join(jsLibsPath, `${composerName}.js`);

	if (fs.existsSync(exactBundlePath)) {
		const jsFilePath = vscode.Uri.file(exactBundlePath);
		return [webview.asWebviewUri(jsFilePath).toString()];
	}

	return [];
}
export { curlToApiRequestItem } from './curl-converter';
export { hurlToApiRequestItem } from './hurl-converter';
export { normalizeHurlCollectionPayload } from '@wso2/api-tryit-hurl-parser';