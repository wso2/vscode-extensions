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
import { createHurlRunner, HurlFileResult, HurlEntryResult, HurlAssertionResult } from '@wso2/api-tryit-hurl-runner';
import { getHurlBinaryManager } from '../hurl/hurl-binary-manager';

const CONTROLLER_ID = 'HurlClient-controller';
const NOTEBOOK_TYPE = 'HurlClient';
const CONTROLLER_LABEL = 'Hurl Client Runner';

/**
 * Notebook controller that executes individual Hurl request cells.
 *
 * Each cell's text is written to a temporary `.hurl` file and executed via
 * `hurl-runner`. The result is rendered as Markdown in the cell output area.
 */
export class HurlNotebookController {
    private readonly controller: vscode.NotebookController;
    private readonly affinityListener: vscode.Disposable;

    constructor() {
        this.controller = vscode.notebooks.createNotebookController(
            CONTROLLER_ID,
            NOTEBOOK_TYPE,
            CONTROLLER_LABEL
        );
        this.controller.supportedLanguages = ['plaintext', 'hurl'];
        this.controller.supportsExecutionOrder = true;
        this.controller.executeHandler = this.executeHandler.bind(this);

        // Auto-select this controller as the preferred kernel for every notebook of our type,
        // so VS Code never shows the "Select Kernel" prompt.
        const setPreferred = (notebook: vscode.NotebookDocument) => {
            if (notebook.notebookType === NOTEBOOK_TYPE) {
                this.controller.updateNotebookAffinity(notebook, vscode.NotebookControllerAffinity.Preferred);
            }
        };
        vscode.workspace.notebookDocuments.forEach(setPreferred);
        this.affinityListener = vscode.workspace.onDidOpenNotebookDocument(setPreferred);
    }

    dispose(): void {
        this.affinityListener.dispose();
        this.controller.dispose();
    }

    private async executeHandler(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        controller: vscode.NotebookController
    ): Promise<void> {
        for (const cell of cells) {
            await this.executeCell(cell, controller);
        }
    }

    private async executeCell(
        cell: vscode.NotebookCell,
        controller: vscode.NotebookController
    ): Promise<void> {
        const execution = controller.createNotebookCellExecution(cell);
        execution.start(Date.now());
        execution.clearOutput();

        const hurlContent = cell.document.getText().trim();
        if (!hurlContent) {
            execution.end(true, Date.now());
            return;
        }

        let tempDir: string | undefined;
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
                await execution.appendOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.text(
                            '> No output returned from hurl execution.',
                            'text/markdown'
                        )
                    ])
                ]);
                execution.end(false, Date.now());
                return;
            }

            const outputs = this.buildOutputs(fileResult);
            await execution.appendOutput(outputs);
            execution.end(fileResult.status === 'passed', Date.now());
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await execution.appendOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.error({ name: 'HurlNotebookError', message })
                ])
            ]);
            execution.end(false, Date.now());
        } finally {
            if (tempDir) {
                await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
            }
        }
    }

    private buildOutputs(fileResult: HurlFileResult): vscode.NotebookCellOutput[] {
        const outputs: vscode.NotebookCellOutput[] = [];

        if (fileResult.entries.length > 0) {
            for (const entry of fileResult.entries) {
                const entryAssertions = this.assertionsForEntry(entry, fileResult);
                const md = this.formatEntry(entry, entryAssertions, fileResult.entries.length === 1 ? fileResult.stdout : undefined);
                outputs.push(
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.text(md, 'text/markdown')
                    ])
                );
            }
        } else {
            const statusIcon = fileResult.status === 'passed' ? '✅' : '❌';
            const detail = fileResult.errorMessage || fileResult.stderr || 'No response data available.';
            const md = `## ${statusIcon} ${fileResult.status.toUpperCase()}\n\n\`\`\`\n${detail}\n\`\`\``;
            outputs.push(
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.text(md, 'text/markdown')
                ])
            );
        }

        return outputs;
    }

    private assertionsForEntry(
        entry: HurlEntryResult,
        fileResult: HurlFileResult
    ): HurlAssertionResult[] {
        const entryAssertions = entry.assertions || [];
        if (entryAssertions.length > 0) {
            return entryAssertions;
        }
        return fileResult.assertions.filter(a =>
            (entry.name && a.entryName === entry.name) ||
            (!a.entryName && fileResult.entries.indexOf(entry) === 0)
        );
    }

    private formatEntry(
        entry: HurlEntryResult,
        assertions: HurlAssertionResult[],
        stdout?: string
    ): string {
        const lines: string[] = [];

        const statusIcon = entry.status === 'passed' ? '✅' : entry.status === 'error' ? '⚠️' : '❌';
        const duration = entry.durationMs !== undefined ? ` *(${entry.durationMs}ms)*` : '';
        const label = 'Request';

        if (entry.statusCode !== undefined) {
            lines.push(`**Status:** \`${entry.statusCode} ${httpStatusText(entry.statusCode)}\``);
        }

        if (entry.errorMessage) {
            lines.push(`**Error:** ${entry.errorMessage}`);
        }

        if (assertions.length > 0) {
            lines.push('');
            lines.push('**Assertions:**');
            lines.push('| | Expression | Expected | Actual |');
            lines.push('|--|-----------|----------|--------|');
            for (const a of assertions) {
                const icon = a.status === 'passed' ? '✅' : '❌';
                const expr = escapeMarkdownTable(a.expression);
                const expected = escapeMarkdownTable(a.expected || '');
                const actual = escapeMarkdownTable(a.actual || '');
                lines.push(`| ${icon} | \`${expr}\` | ${expected} | ${actual} |`);
            }
        }

        const responseBody = extractResponseBody(stdout);
        if (responseBody) {
            lines.push('');
            const { lang, text } = formatBody(responseBody);
            lines.push('```' + lang);
            lines.push(text);
            lines.push('```');
        }
        lines.push(`##### ${statusIcon} ${label}${duration}`);

        return lines.join('\n');
    }
}

/**
 * Extract the response body from hurl's `-i` stdout output.
 * The output format is: status line + headers + blank line + body.
 * Returns undefined if there is no body or the stdout is empty.
 */
function extractResponseBody(stdout: string | undefined): string | undefined {
    if (!stdout) { return undefined; }
    // Find the first blank line (separates HTTP headers from body)
    const match = stdout.match(/\r?\n\r?\n([\s\S]*)/);
    const body = match ? match[1].trim() : stdout.trim();
    return body || undefined;
}

/** Detect content type and pretty-print body if JSON. */
function formatBody(body: string): { lang: string; text: string } {
    try {
        const parsed = JSON.parse(body);
        return { lang: 'json', text: JSON.stringify(parsed, null, 2) };
    } catch {
        return { lang: '', text: body };
    }
}

function escapeMarkdownTable(value: string): string {
    return value.replace(/\|/g, '\\|');
}

function httpStatusText(statusCode: number): string {
    const texts: Record<number, string> = {
        200: 'OK', 201: 'Created', 204: 'No Content',
        301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
        400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
        404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict',
        422: 'Unprocessable Entity', 429: 'Too Many Requests',
        500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable'
    };
    return texts[statusCode] || '';
}
