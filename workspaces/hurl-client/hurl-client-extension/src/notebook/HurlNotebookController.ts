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
import { composeHurlDocumentWithBoundaries, parseHurlDocument } from '@wso2/api-tryit-hurl-parser';
import { getHurlBinaryManager } from '../hurl/hurl-binary-manager';

const CONTROLLER_ID = 'HurlClient-controller';
const NOTEBOOK_TYPE = 'HurlClient';
const CONTROLLER_LABEL = 'Hurl Client Runner';
const SHARED_VARIABLES_FILE_NAME = 'hurl.vars';
// hurl's raw stderr heading is "Undefined variable", but the per-entry
// errorMessage report-parser extracts is just the detail line beneath it
// ("you must set the variable X") - match both forms.
const UNDEFINED_VARIABLE_PATTERN = /undefined variable|you must set the variable/i;

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
 * Every submitted cell with non-empty content runs together, combined into
 * one temp file and executed as a single `hurl` invocation - a Chained Run,
 * so a variable captured by an earlier entry is available to later ones,
 * matching hurl's own native behavior. When only one cell is submitted
 * (running it alone via its own play button), this reduces to that cell
 * running by itself - an Isolated Run in effect, since there's nothing else
 * to combine with or capture from.
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
        this.controller.executeHandler = this.executeCells.bind(this);

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

    private async executeCells(
        cells: vscode.NotebookCell[],
        notebook: vscode.NotebookDocument,
        controller: vscode.NotebookController
    ): Promise<void> {
        const executions: Array<{ execution: vscode.NotebookCellExecution; content: string }> = [];

        for (const cell of cells) {
            const execution = controller.createNotebookCellExecution(cell);
            execution.start(Date.now());
            execution.clearOutput();

            const content = cell.document.getText().trim();
            if (!content) {
                execution.end(true, Date.now());
                continue;
            }

            executions.push({ execution, content });
        }

        if (executions.length === 0) {
            return;
        }

        let tempDir: string | undefined;
        try {
            const runOptions = await this.resolveRunOptions(notebook);
            // A "cell" here isn't guaranteed to be exactly one request - e.g. a
            // notebook's leading comment block becomes its own code cell with
            // no request line at all. Boundaries (not array position) are what
            // let a zero-entry cell sit anywhere in the chain without shifting
            // every entry after it onto the wrong cell.
            const { document: combinedContent, boundaries } = composeHurlDocumentWithBoundaries(
                executions.map(item => item.content)
            );

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

            // boundaries is built from executions in order with no filtering
            // (every execution's content is already non-empty), so boundaries
            // and outcomes always line up 1:1 with executions by position.
            const outcomes = mapFileResultToCellOutcomes(
                fileResult,
                boundaries.map(b => ({ startLine: b.startLine, endLine: b.endLine }))
            );

            for (let index = 0; index < executions.length; index++) {
                const { execution, content } = executions[index];
                const entries = outcomes[index].entries;

                if (entries.length === 0) {
                    const hasRequest = cellHasRequest(content);
                    const laterEntryExists = outcomes.slice(index + 1).some(o => o.entries.length > 0);
                    await execution.appendOutput([this.buildSkippedOutput(fileResult, hasRequest, laterEntryExists)]);
                    execution.end(!hasRequest, Date.now());
                    continue;
                }

                const outputs = entries.map(entry =>
                    this.buildEntryOutput(entry, fileResult, this.resolveResponseBody(entry, fileResult))
                );
                if (entries.some(entry => entry.status !== 'passed' && this.isUndefinedVariableEntryFailure(entry, fileResult))) {
                    outputs.push(this.buildUndefinedVariableHintOutput());
                }
                await execution.appendOutput(outputs);
                execution.end(entries.every(entry => entry.status === 'passed'), Date.now());
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
     * flag settings once per run from the notebook's configuration scope.
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
        const sharedPath = path.join(fileRoot, SHARED_VARIABLES_FILE_NAME);
        const perFilePath = `${notebookPath}.vars`;

        const [sharedExists, perFileExists] = await Promise.all([pathExists(sharedPath), pathExists(perFilePath)]);

        const paths: string[] = [];
        if (sharedExists) {
            paths.push(sharedPath);
        }
        if (perFileExists) {
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

    /**
     * hurl surfaces an undefined variable either on the entry itself, or (for
     * a run with only one entry) on the file-level stderr/errorMessage. We
     * only trust the file-level signal for a single-entry run, so a failure
     * in one cell's request is never misattributed to a sibling cell that
     * happened to share the same combined invocation.
     */
    private isUndefinedVariableEntryFailure(entry: HurlEntryResult, fileResult: HurlFileResult): boolean {
        if (UNDEFINED_VARIABLE_PATTERN.test(entry.errorMessage || '')) {
            return true;
        }
        if (fileResult.entries.length === 1) {
            return UNDEFINED_VARIABLE_PATTERN.test(fileResult.stderr || '') || UNDEFINED_VARIABLE_PATTERN.test(fileResult.errorMessage || '');
        }
        return false;
    }

    private buildUndefinedVariableHintOutput(): vscode.NotebookCellOutput {
        const md = '> 💡 This request references a variable that has not been set. If it depends on a value captured by an earlier request, run all cells (or select a range starting from the capturing request) so captured variables are available.';
        return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(md, 'text/markdown')
        ]);
    }

    /**
     * A single-entry run's `-i` stdout is exactly that one response, so it's
     * a safe fallback when the report itself didn't capture a body. For a
     * multi-entry run there's no reliable way to slice stdout back into
     * per-entry chunks, so entries beyond the first only ever get a body
     * from the report.
     */
    private resolveResponseBody(entry: HurlEntryResult, fileResult: HurlFileResult): string | undefined {
        return entry.responseBody
            ?? (fileResult.entries.length === 1 ? extractResponseBody(fileResult.stdout) : undefined);
    }

    private buildSkippedOutput(fileResult: HurlFileResult, hasRequest: boolean, laterEntryExists: boolean): vscode.NotebookCellOutput {
        if (!hasRequest) {
            const md = '##### ℹ️ NO REQUEST\n\nThis cell has no request to run.';
            return new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text(md, 'text/markdown')
            ]);
        }

        if (laterEntryExists) {
            // A later cell in the same run did produce an entry, so the run
            // didn't stop - hurl reached this request and skipped or failed
            // to parse/execute it specifically, which is a different problem
            // than the run being cut short.
            const md = '##### ⚠️ NOT EXECUTED\n\nHurl could not run this request (it was skipped or failed to parse), but later requests in this run still executed.';
            return new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text(md, 'text/markdown')
            ]);
        }

        const detail = fileResult.errorMessage || fileResult.stderr;
        const detailBlock = detail ? `\n\n\`\`\`\n${detail}\n\`\`\`` : '';
        const md = `##### ⏭️ NOT RUN\n\nThis request was not executed because the run stopped before reaching it.${detailBlock}`;
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
        // report-parser already attributes assertions to entries by name or
        // line range, so entry.assertions being empty usually just means
        // this entry genuinely has none. This fallback only matters for a
        // stray assertion with no entryName at all - attribute it to
        // whichever entry's own line is the closest one at or before it,
        // rather than always assuming the first entry in the run (which only
        // held true before chaining, when a run always had one entry).
        return fileResult.assertions.filter(a => {
            if (a.entryName) {
                return entry.name === a.entryName;
            }
            return this.findEntryForLine(fileResult, a.line) === entry;
        });
    }

    private findEntryForLine(fileResult: HurlFileResult, line: number | undefined): HurlEntryResult | undefined {
        if (typeof line !== 'number') {
            return fileResult.entries[0];
        }
        let closest: HurlEntryResult | undefined;
        for (const candidate of fileResult.entries) {
            if (typeof candidate.line !== 'number' || candidate.line > line) {
                continue;
            }
            if (!closest || (closest.line ?? -Infinity) < candidate.line) {
                closest = candidate;
            }
        }
        return closest ?? fileResult.entries[0];
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

/** Does this cell's own text contain an actual hurl request, or is it just comments/notes? */
function cellHasRequest(content: string): boolean {
    return parseHurlDocument(content).blocks.length > 0;
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
