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
        const executions: Array<{ execution: vscode.NotebookCellExecution; content: string; startedAt: number }> = [];

        for (const cell of cells) {
            const execution = controller.createNotebookCellExecution(cell);
            const startedAt = Date.now();
            execution.start(startedAt);
            execution.clearOutput();

            const content = cell.document.getText().trim();
            if (!content) {
                execution.end(true, startedAt);
                continue;
            }

            executions.push({ execution, content, startedAt });
        }

        if (executions.length === 0) {
            return;
        }

        let tempDir: string | undefined;
        // Tracks how many of `executions` (in order) have already had end()
        // called on them, so the catch block below never re-ends a cell the
        // try block already finished - VS Code's NotebookCellExecution does
        // not support ending or appending to an already-ended execution.
        let endedCount = 0;
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
                    endedCount++;
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

            // Both indexes are whole-run properties, so they're resolved once
            // here rather than re-derived from scratch for every entry.
            const assertionsByEntry = this.buildAssertionIndex(fileResult);
            const undefinedVariableEntries = this.findUndefinedVariableEntries(fileResult);

            for (let index = 0; index < executions.length; index++) {
                const { execution, content, startedAt } = executions[index];
                const entries = outcomes[index].entries;

                if (entries.length === 0) {
                    const kind = classifyCellWithoutResult(content);
                    const laterEntryExists = outcomes.slice(index + 1).some(o => o.entries.length > 0);
                    await execution.appendOutput([this.buildSkippedOutput(fileResult, kind, laterEntryExists)]);
                    // Only a comments-only cell is a success - a cell that
                    // holds a request, or content hurl could not parse, failed.
                    // Report no elapsed time either way, since nothing ran.
                    execution.end(kind === 'comments', startedAt);
                    endedCount = index + 1;
                    continue;
                }

                const outputs = entries.map(entry => this.buildEntryOutput(
                    entry,
                    assertionsByEntry.get(entry) || [],
                    this.resolveResponseBody(entry, fileResult)
                ));
                if (entries.some(entry => undefinedVariableEntries.has(entry))) {
                    outputs.push(this.buildUndefinedVariableHintOutput());
                }
                await execution.appendOutput(outputs);
                execution.end(
                    entries.every(entry => entry.status === 'passed'),
                    cellFinishedAt(startedAt, entries)
                );
                endedCount = index + 1;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            // Only the executions the try block never got to end are still
            // "running" - re-ending ones it already finished would throw.
            for (const { execution } of executions.slice(endedCount)) {
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

        const configuredFileRoot = config.get<string>('fileRoot')?.trim();
        const notebookPath = notebook.uri.fsPath;
        const fileRoot = this.resolveFileRoot(notebook, configuredFileRoot);

        const insecure = config.get<boolean>('insecure') ?? false;
        const followRedirects = config.get<boolean>('followRedirects') ?? false;
        const extraArgs = config.get<string[]>('extraArgs') ?? [];
        const variablesFilePaths = await this.resolveVariablesFilePaths(fileRoot, notebookPath);

        return { commandPath, fileRoot, variablesFilePaths, insecure, followRedirects, extraArgs };
    }

    /**
     * `hurl-client.fileRoot` is free text, so it can be relative. Resolving
     * it here means it lands where the user meant rather than against the
     * extension host's process cwd - which is neither the notebook nor the
     * workspace, and would silently skip the shared Variables File and
     * mis-root file references inside requests. Relative values resolve
     * against the workspace folder owning the notebook (the usual VS Code
     * convention for a resource-scoped path setting), falling back to the
     * notebook's own folder when it sits outside any workspace folder.
     */
    private resolveFileRoot(notebook: vscode.NotebookDocument, configuredFileRoot: string | undefined): string {
        const notebookDir = path.dirname(notebook.uri.fsPath);
        if (!configuredFileRoot) {
            return notebookDir;
        }
        const workspaceRoot = vscode.workspace.getWorkspaceFolder(notebook.uri)?.uri.fsPath ?? notebookDir;
        return path.resolve(workspaceRoot, configuredFileRoot);
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
     * Which entries failed on an unset variable, resolved once for the whole
     * run. hurl normally pins this to the entry itself; when it only reports
     * it at file level (no entry attribution), fall back to flagging the
     * entries that actually failed, so the hint still reaches the user
     * instead of being lost. Passing entries are never flagged, so the hint
     * can't attach to a sibling cell that ran fine.
     */
    private findUndefinedVariableEntries(fileResult: HurlFileResult): Set<HurlEntryResult> {
        const flagged = new Set<HurlEntryResult>();

        for (const entry of fileResult.entries) {
            if (entry.status !== 'passed' && UNDEFINED_VARIABLE_PATTERN.test(entry.errorMessage || '')) {
                flagged.add(entry);
            }
        }
        if (flagged.size > 0) {
            return flagged;
        }

        const fileLevelSignal = UNDEFINED_VARIABLE_PATTERN.test(fileResult.stderr || '')
            || UNDEFINED_VARIABLE_PATTERN.test(fileResult.errorMessage || '');
        if (!fileLevelSignal) {
            return flagged;
        }

        for (const entry of fileResult.entries) {
            if (entry.status !== 'passed') {
                flagged.add(entry);
            }
        }
        return flagged;
    }

    private buildUndefinedVariableHintOutput(): vscode.NotebookCellOutput {
        const md = '> 💡 This request references a variable that has not been set. If it depends on a value captured by an earlier request, run all cells (or select a range starting from the capturing request) so captured variables are available.';
        return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(md, 'text/markdown')
        ]);
    }

    /**
     * Falls back to hurl's `-i` stdout when the report didn't capture a body.
     *
     * hurl writes exactly one response to stdout - the run's last entry -
     * regardless of how many entries the file has, so the fallback belongs to
     * the last entry rather than to a single-entry run (which is just the
     * special case where the only entry is also the last). Earlier entries
     * are absent from stdout entirely, so there is nothing to fall back to
     * for them. When the last entry got no response at all, hurl leaves
     * stdout empty rather than emitting an earlier entry's body, so this
     * can't attribute someone else's response to it.
     */
    private resolveResponseBody(entry: HurlEntryResult, fileResult: HurlFileResult): string | undefined {
        if (entry.responseBody !== undefined) {
            return entry.responseBody;
        }
        const isLastEntry = fileResult.entries.length > 0
            && entry === fileResult.entries[fileResult.entries.length - 1];
        return isLastEntry ? extractResponseBody(fileResult.stdout) : undefined;
    }

    private buildSkippedOutput(
        fileResult: HurlFileResult,
        kind: CellWithoutResultKind,
        laterEntryExists: boolean
    ): vscode.NotebookCellOutput {
        if (kind === 'comments') {
            const md = '##### ℹ️ NO REQUEST\n\nThis cell has no request to run.';
            return new vscode.NotebookCellOutput([
                vscode.NotebookCellOutputItem.text(md, 'text/markdown')
            ]);
        }

        if (kind === 'unparsed') {
            const detail = fileResult.errorMessage || fileResult.stderr;
            const detailBlock = detail ? `\n\n\`\`\`\n${detail}\n\`\`\`` : '';
            const md = `##### ❌ NOT PARSED\n\nNo runnable request was found in this cell. If it is meant to be a request, check its syntax - a malformed request also stops the rest of the run.${detailBlock}`;
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
        assertions: HurlAssertionResult[],
        responseBody: string | undefined
    ): vscode.NotebookCellOutput {
        const md = this.formatEntry(entry, assertions, responseBody);
        return new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(md, 'text/markdown')
        ]);
    }

    /**
     * Groups assertions per entry in one pass over the run, instead of
     * re-filtering the whole assertion list for every entry rendered.
     *
     * report-parser already attaches assertions to entries by name or line
     * range, so an entry that has its own list keeps exactly that. The
     * fallback below only exists for entries report-parser left empty, and
     * only claims assertions it can tie to that specific entry - a stray
     * assertion that resolves to nobody is left out rather than parked on
     * the first entry, which would put it under the wrong cell in a chain.
     */
    private buildAssertionIndex(fileResult: HurlFileResult): Map<HurlEntryResult, HurlAssertionResult[]> {
        const index = new Map<HurlEntryResult, HurlAssertionResult[]>();
        const needsFallback = new Set<HurlEntryResult>();

        for (const entry of fileResult.entries) {
            const own = entry.assertions || [];
            index.set(entry, own.length > 0 ? own : []);
            if (own.length === 0) {
                needsFallback.add(entry);
            }
        }

        if (needsFallback.size === 0) {
            return index;
        }

        const entriesByName = new Map<string, HurlEntryResult>();
        for (const entry of fileResult.entries) {
            if (entry.name && !entriesByName.has(entry.name)) {
                entriesByName.set(entry.name, entry);
            }
        }

        for (const assertion of fileResult.assertions) {
            const owner = assertion.entryName
                ? entriesByName.get(assertion.entryName)
                : this.findEntryForLine(fileResult, assertion.line);
            if (owner && needsFallback.has(owner)) {
                index.get(owner)!.push(assertion);
            }
        }

        return index;
    }

    /**
     * Returns undefined, rather than guessing, when an assertion can't be
     * tied to a specific entry - in a chained run showing it under the wrong
     * cell would be worse than not showing it at all (before chaining, a run
     * always had exactly one entry, so any default was harmless).
     */
    private findEntryForLine(fileResult: HurlFileResult, line: number | undefined): HurlEntryResult | undefined {
        if (typeof line !== 'number') {
            return undefined;
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
        return closest;
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
 * Why a cell produced no result:
 *  - `request`      it does contain a request, so hurl either never reached it
 *                   or refused to run it
 *  - `comments`     nothing but comments/blank lines - genuinely nothing to run
 *  - `unparsed`     it has real content that the parser found no request in,
 *                   i.e. it is most likely malformed
 *
 * `comments` and `unparsed` must stay distinct: reporting a malformed request
 * as "nothing to run" would end the cell successfully and hide the error.
 */
type CellWithoutResultKind = 'request' | 'comments' | 'unparsed';

function classifyCellWithoutResult(content: string): CellWithoutResultKind {
    if (parseHurlDocument(content).blocks.length > 0) {
        return 'request';
    }
    const meaningfulLines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));
    return meaningfulLines.length === 0 ? 'comments' : 'unparsed';
}

/**
 * The end timestamp to report for a cell, so VS Code's per-cell timer shows
 * how long that cell's own request(s) took rather than how long the whole
 * batch took. Every cell in a run is started at once and ended once the
 * single combined `hurl` process exits, so using wall-clock here would label
 * a 30ms request with the full run duration - and disagree with the
 * per-request timing already shown in the cell's own output. Falls back to
 * wall-clock when hurl reported no timings at all.
 */
function cellFinishedAt(startedAt: number, entries: HurlEntryResult[]): number {
    const timed = entries.filter(entry => typeof entry.durationMs === 'number');
    if (timed.length === 0) {
        return Date.now();
    }
    return startedAt + timed.reduce((total, entry) => total + (entry.durationMs || 0), 0);
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
