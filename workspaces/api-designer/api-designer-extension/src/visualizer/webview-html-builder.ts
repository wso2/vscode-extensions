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

import { randomBytes } from 'crypto';
import * as vscode from 'vscode';
import { extension } from '../APIDesignerExtensionContext';
import { getComposerJSFiles } from '../utils';
import { logDebug } from '../utils/logger';

function getNonce(): string {
    return randomBytes(16).toString('base64');
}

export class WebviewHtmlBuilder {
    static build(webview: vscode.Webview, viewType: string, initialFileUri: string): string {
        const nonce = getNonce();

        const scripts = getComposerJSFiles(extension.context, 'Visualizer', webview);
        logDebug(`WebviewHtmlBuilder: Loading ${scripts.length} script(s): ${JSON.stringify(scripts)}`);
        logDebug(`WebviewHtmlBuilder: Webview content with viewType: ${viewType}`);

        const scriptTags = scripts
            .filter(uri => uri)
            .map(jsFile => `<script nonce="${nonce}" charset="UTF-8" src="${jsFile}"></script>`)
            .join('\n');

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource} data:; connect-src ${webview.cspSource} ws: wss: http: https:;">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <title>API</title>

          <style>
            body, html, #root {
                height: 100%;
                margin: 0;
                padding: 0px;
                overflow: hidden;
            }
          </style>
          <script nonce="${nonce}">
            // CRITICAL FIX: Make acquireVsCodeApi() safe to call multiple times
            // This prevents Visualizer.js from crashing when it tries to acquire the API
            (function() {
                // Store the original function
                const originalAcquire = window.acquireVsCodeApi;
                let apiInstance = null;

                // Replace with a wrapper that returns the same instance every time
                window.acquireVsCodeApi = function() {
                    if (!apiInstance && originalAcquire) {
                        apiInstance = originalAcquire();
                    }
                    return apiInstance;
                };

                // Also store it globally for easy access
                window.vscodeApi = window.acquireVsCodeApi();
            })();
          </script>
          ${scriptTags}
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root"></div>
            <script nonce="${nonce}">
            (function() {
                // Render React app
                function render() {
                    if (typeof visualizerWebview !== 'undefined') {
                        try {
                            const viewType = ${JSON.stringify(viewType)};
                            const initialFileUri = ${JSON.stringify(initialFileUri)};
                            visualizerWebview.renderWebview(
                                document.getElementById("root"),
                                { viewType: viewType, initialFileUri: initialFileUri }
                            );
                        } catch (e) {
                            console.error('[Webview] Error rendering webview:', e);
                        }
                    } else {
                        setTimeout(render, 100);
                    }
                }
                render();
            })();
        </script>
        </body>
        </html>
      `;
    }
}
