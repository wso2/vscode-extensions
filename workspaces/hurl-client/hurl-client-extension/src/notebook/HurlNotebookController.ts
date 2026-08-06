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
import {
    createHurlRunner,
    mapFileResultToCellOutcomes,
    HurlFileResult,
    HurlEntryResult,
    HurlAssertionResult,
    HurlRunOptions
} from '@wso2/api-tryit-hurl-runner';
import { composeHurlDocument } from '@wso2/api-tryit-hurl-parser';
import { getHurlBinaryManager } from '../hurl/hurl-binary-manager';

const CONTROLLER_ID = 'HurlClient-controller';
const NOTEBOOK_TYPE = 'HurlClient';
const CONTROLLER_LABEL = 'Hurl Client Runner';
const SHARED_VARIABLES_FILE_NAME = 'hurl.vars';
const UNDEFINED_VARIABLE_PATTERN = /undefined variable/i;

interface ResolvedRunOptions {
    commandPath: string;
    fileRoot: string;
    variablesFilePaths: string[];
    insecure: boolean;
    followRedirects: boolean;
    extraArgs: string[];
}

/**
 * Notebook controller that executes Hurl request cells.
 *
 * A single cell run is an Isolated Run: its text is written to its own temp
 * file and executed on its own, with no variables captured by other cells.
 * Running more than one cell together (Run All, or a selected range) is a
 * Chained Run: the cells are combined into one temp file and executed as a
 * single `hurl` invocation, so a variable captured by an earlier entry is
 * available to later ones - matching hurl's own native behavior.
 *
 * Results are rendered as Markdown in each cell's own output area.
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
        notebook: vscode.NotebookDocument,
        controller: vscode.NotebookController
    ): Promise<void> {
        if (cells.length <= 1) {
            for (const cell of cells) {
                await this.executeIsolatedCell(cell, notebook, controller);
            }
            return;
        }

        await this.executeChainedRun(cells, notebook, controller);
    }

    /**
     * Runs a single cell alone, in its own `hurl` process. No Captured
     * Variables from other cells are available; if the cell depends on one,
     * hurl reports it as an undefined variable and the output hints at
     * running all cells instead.
     */
    private async executeIsolatedCell(
        cell: vscode.NotebookCell,
        notebook: vscode.NotebookDocument,
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
            const runOptions = await this.resolveRunOptions(notebook);
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'http-book-'));
            const tempFile = path.join(tempDir, 'cell.hurl');
            await fs.writeFile(tempFile, hurlContent, 'utf-8');

            const runner = createHurlRunner();
            const result = await runner.run(
                { collectionPath: tempDir, includePatterns: ['cell.hurl'] },
                { ...this.toHurlRunOptions(runOptions), includeResponseOutput: true, continueOnError: true }
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
            if (fileResult.status !== 'passed' && this.isUndefinedVariableFailure(fileResult)) {
                outputs.push(this.buildUndefinedVariableHintOutput());
            }
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

    /**
     * Runs every cell with non-empty content together as a single `hurl`
     * invocation over their combined source, so a variable captured by an
     * earlier entry is available to later ones (a Chained Run). Cells with
     * empty content are skipped and end immediately, matching the isolated
     * path's behavior for empty cells.
     */
    private async executeChainedRun(
        cells: vscode.NotebookCell[],
        notebook: vscode.NotebookDocument,
        controller: vscode.NotebookController
    ): Promise<void> {
        const executions: Array<{ cell: vscode.NotebookCell; execution: vscode.NotebookCellExecution; content: string }> = [];

        for (const cell of cells) {
            const execution = controller.createNotebookCellExecution(cell);
            execution.start(Date.now());
            execution.clearOutput();

            const content = cell.document.getText().trim();
            if (!content) {
                execution.end(true, Date.now());
                continue;
            }

            executions.push({ cell, execution, content });
        }

        if (executions.length === 0) {
            return;
        }

        let tempDir: string | undefined;
        try {
            const runOptions = await this.resolveRunOptions(notebook);
            const combinedContent = composeHurlDocument('', executions.map(item => item.content));

            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'http-book-'));
            const tempFile = path.join(tempDir, 'combined.hurl');
            await fs.writeFile(tempFile, combinedContent, 'utf-8');

            const runner = createHurlRunner();
            const result = await runner.run(
                { collectionPath: tempDir, includePatterns: ['combined.hurl'] },
                { ...this.toHurlRunOptions(runOptions), includeResponseOutput: true, continueOnError: true }
            );

            const fileResult = result.files[0];
            if (!fileResult) {
                for (const { execution } of executions) {
                    await execution.appendOutput([
                        new vscode.NotebookCellOutput([
                            vscode.NotebookCellOutputItem.text(
                                '> No output returned from hurl execution.',
                                'text/markdown'
                            )
                        ])
                    ]);
                    execution.end(false, Date.now());
                }
                return;
            }

            const outcomes = mapFileResultToCellOutcomes(fileResult, executions.length);
            for (let index = 0; index < executions.length; index++) {
                const { execution } = executions[index];
                const outcome = outcomes[index];

                if (outcome.skipped || !outcome.entry) {
                    await execution.appendOutput([this.buildSkippedOutput(fileResult)]);
                    execution.end(false, Date.now());
                    continue;
                }

                const output = this.buildEntryOutput(outcome.entry, fileResult, outcome.entry.responseBody);
                await execution.appendOutput([output]);
                execution.end(outcome.entry.status === 'passed', Date.now());
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            for (const { execution } of executions) {
                await execution.appendOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.error({ name: 'HurlNotebookError', message })
                    ])
                ]);
                execution.end(false, Date.now());
            }
        } finally {
            if (tempDir) {
                await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
            }
        }
    }

    /**
     * Resolves commandPath, fileRoot, the Variables File(s), and the CLI
     * flag settings once per run (isolated or chained) from the notebook's
     * configuration scope.
     */
    private async resolveRunOptions(notebook: vscode.NotebookDocument): Promise<ResolvedRunOptions> {
        const commandPath = await getHurlBinaryManager().resolveCommandPath({ promptOnFailure: true });
        const config = vscode.workspace.getConfiguration('hurl-client', notebook.uri);

        const configuredFileRoot = config.get<string>('fileRoot');
        const notebookPath = notebook.uri.fsPath;
        const fileRoot = configuredFileRoot || path.dirname(notebookPath);

        const insecure = config.get<boolean>('insecure') ?? false;
        const followRedirects = config.get<boolean>('followRedirects') ?? false;
        const extraArgs = config.get<string[]>('extraArgs') ?? [];
        const variablesFilePaths = await this.resolveVariablesFilePaths(fileRoot, notebookPath);

        return { commandPath, fileRoot, variablesFilePaths, insecure, followRedirects, extraArgs };
    }

    /**
     * A shared Variables File applies to every `.hurl` file under fileRoot;
     * an optional per-file Variables File next to the notebook overrides it
     * for the values it defines. Both are hurl's own native
     * `--variables-file` format, so hurl parses them - we only check
     * whether each one exists.
     */
    private async resolveVariablesFilePaths(fileRoot: string, notebookPath: string): Promise<string[]> {
        const paths: string[] = [];

        const sharedPath = path.join(fileRoot, SHARED_VARIABLES_FILE_NAME);
        if (await pathExists(sharedPath)) {
            paths.push(sharedPath);
        }

        const perFilePath = `${notebookPath}.vars`;
        if (await pathExists(perFilePath)) {
            paths.push(perFilePath);
        }

        return paths;
    }

    private toHurlRunOptions(resolved: ResolvedRunOptions): HurlRunOptions {
        return {
            commandPath: resolved.commandPath,
            fileRoot: resolved.fileRoot,
            variablesFilePaths: resolved.variablesFilePaths,
            insecure: resolved.insecure,
            followRedirects: resolved.followRedirects,
            extraArgs: resolved.extraArgs
        };
    }

    private isUndefinedVariableFailure(fileResult: HurlFileResult): boolean {
        if (UNDEFINED_VARIABLE_PATTERN.test(fileResult.stderr || '') || UNDEFINED_VARIABLE_PATTERN.test(fileResult.errorMessage || '')) {
            return true;
        }
        return fileResult.entries.some(entry => UNDEFINED_VARIABLE_PATTERN.test(entry.errorMessage || ''));
    }

    private buildUndefinedVariableHintOutput(): vscode.NotebookCellOutput {
        const md = '> 💡 This request references a variable that has not been set. If it depends on a value captured by an earlier request, run all cells (or select a range starting from the capturing request) so captured variables are available.';
        return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(md, 'text/markdown')
        ]);
    }

    private buildOutputs(fileResult: HurlFileResult): vscode.NotebookCellOutput[] {
        if (fileResult.entries.length > 0) {
            return fileResult.entries.map(entry => {
                const responseBody = entry.responseBody
                    ?? (fileResult.entries.length === 1 ? extractResponseBody(fileResult.stdout) : undefined);
                return this.buildEntryOutput(entry, fileResult, responseBody);
            });
        }

        return [this.buildNoEntryOutput(fileResult)];
    }

    private buildNoEntryOutput(fileResult: HurlFileResult): vscode.NotebookCellOutput {
        const statusIcon = fileResult.status === 'passed' ? '✅' : '❌';
        const detail = fileResult.errorMessage || fileResult.stderr || 'No response data available.';
        const md = `## ${statusIcon} ${fileResult.status.toUpperCase()}\n\n\`\`\`\n${detail}\n\`\`\``;
        return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(md, 'text/markdown')
        ]);
    }

    private buildSkippedOutput(fileResult: HurlFileResult): vscode.NotebookCellOutput {
        const detail = fileResult.errorMessage || fileResult.stderr;
        const detailBlock = detail ? `\n\n\`\`\`\n${detail}\n\`\`\`` : '';
        const md = `##### ⏭️ NOT RUN\n\nThis request was not executed because the chained run stopped before reaching it.${detailBlock}`;
        return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(md, 'text/markdown')
        ]);
    }

    private buildEntryOutput(
        entry: HurlEntryResult,
        fileResult: HurlFileResult,
        responseBody: string | undefined
    ): vscode.NotebookCellOutput {
        const entryAssertions = this.assertionsForEntry(entry, fileResult);
        const md = this.formatEntry(entry, entryAssertions, responseBody);
        return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(md, 'text/markdown')
        ]);
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
        responseBody?: string
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

async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fs.stat(filePath);
        return true;
    } catch {
        return false;
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
