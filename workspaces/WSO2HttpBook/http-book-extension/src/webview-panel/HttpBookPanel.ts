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
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { createExtensionTransportManager } from 'vscode-webview-network-bridge/extension';
import { createRequestRouter } from 'vscode-webview-network-bridge/router';
import { createHurlRunner } from '@wso2/api-tryit-hurl-runner';
import type {
    HttpBookRequest,
    HttpBookResponse,
    NotebookCellInfo,
    NotebookCellResult
} from '@wso2/http-book-core';
import { getHurlBinaryManager } from '../hurl/hurl-binary-manager';

const VIEW_TYPE = 'wso2-http-book-panel';

export class HttpBookPanel {
    private readonly panel: vscode.WebviewPanel;
    private readonly transport: ReturnType<typeof createExtensionTransportManager<HttpBookRequest, HttpBookResponse>>;
    private cells: NotebookCellInfo[] = [];
    private title: string | undefined;

    private constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        title: string | undefined,
        cells: NotebookCellInfo[]
    ) {
        this.panel = panel;
        this.cells = cells;
        this.title = title;

        // Build router for handling requests from the webview
        const router = createRequestRouter<HttpBookRequest, HttpBookResponse>();
        router.register('runNotebookCell', async (req: HttpBookRequest) => {
            if (req.action !== 'runNotebookCell') {
                throw new Error('Unknown action');
            }
            const result = await this.runCell(req.cellIndex, req.content);
            return { type: 'notebookCellResult', result } as HttpBookResponse;
        });

        // Create transport: initialResponse delivers notebook data when webview connects
        this.transport = createExtensionTransportManager<HttpBookRequest, HttpBookResponse>({
            handleRequest: (req: HttpBookRequest) => router.handle(req),
            initialResponse: () => ({
                type: 'openNotebook',
                title: this.title,
                cells: this.cells
            } as HttpBookResponse)
        });

        this.transport.registerWebviewPanel(panel);

        // Set up the HTML once
        panel.webview.html = this.buildHtml(panel.webview, context);

        panel.onDidDispose(() => {
            this.transport.dispose();
        });
    }

    /**
     * Open (or reveal) the HttpBook webview panel for a parsed notebook.
     */
    static open(
        context: vscode.ExtensionContext,
        title: string | undefined,
        cells: NotebookCellInfo[]
    ): HttpBookPanel {
        const panel = vscode.window.createWebviewPanel(
            VIEW_TYPE,
            title || 'Hurl Notebook',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'resources', 'jslibs')
                ]
            }
        );

        return new HttpBookPanel(panel, context, title, cells);
    }

    private async runCell(cellIndex: number, content: string): Promise<NotebookCellResult> {
        const hurlContent = content.trim();

        if (!hurlContent) {
            return {
                cellIndex,
                status: 'skipped',
                durationMs: 0,
                entries: [],
                assertions: []
            };
        }

        let tempDir: string | undefined;
        const startTime = Date.now();
        try {
            const commandPath = await getHurlBinaryManager().resolveCommandPath({
                promptOnFailure: true
            });

            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'http-book-'));
            const tempFile = path.join(tempDir, 'cell.hurl');
            await fs.writeFile(tempFile, hurlContent, 'utf-8');

            const runner = createHurlRunner();
            const result = await runner.run(
                { collectionPath: tempDir, includePatterns: ['cell.hurl'] },
                { commandPath, includeResponseOutput: true, continueOnError: true }
            );

            const fileResult = result.files[0];
            if (!fileResult) {
                return {
                    cellIndex,
                    status: 'error',
                    durationMs: Date.now() - startTime,
                    entries: [],
                    assertions: [],
                    errorMessage: 'No output returned from hurl execution.'
                };
            }

            return {
                cellIndex,
                status: fileResult.status as NotebookCellResult['status'],
                durationMs: fileResult.durationMs ?? Date.now() - startTime,
                entries: fileResult.entries ?? [],
                assertions: fileResult.assertions ?? [],
                errorMessage: fileResult.errorMessage,
                stderr: fileResult.stderr,
                stdout: fileResult.stdout
            };
        } catch (error) {
            return {
                cellIndex,
                status: 'error',
                durationMs: Date.now() - startTime,
                entries: [],
                assertions: [],
                errorMessage: error instanceof Error ? error.message : String(error)
            };
        } finally {
            if (tempDir) {
                await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
            }
        }
    }

    private buildHtml(webview: vscode.Webview, context: vscode.ExtensionContext): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(context.extensionUri, 'resources', 'jslibs', 'HttpBookVisualizer.js')
        );
        const nonce = getNonce();

        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   script-src 'nonce-${nonce}';
                   style-src 'unsafe-inline';
                   font-src ${webview.cspSource};
                   img-src ${webview.cspSource} data:;" />
    <title>WSO2 HttpBook</title>
    <style>
        body, html {
            margin: 0; padding: 0;
            height: 100%; width: 100%;
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            font-family: var(--vscode-font-family);
        }
        #root { height: 100%; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
    <script nonce="${nonce}">
        if (typeof httpBookWebview !== 'undefined' && httpBookWebview.renderNotebook) {
            httpBookWebview.renderNotebook(document.getElementById('root'));
        }
    </script>
</body>
</html>`;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
