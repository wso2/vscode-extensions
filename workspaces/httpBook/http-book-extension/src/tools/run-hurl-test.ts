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
import * as os from 'os';
import * as fs from 'fs/promises';
import { createHurlRunner, HurlFileResult, HurlEntryResult, HurlAssertionResult } from '@wso2/api-tryit-hurl-runner';
import { parseHurlCollection, parseHurlDocument } from '@wso2/api-tryit-hurl-parser';
import { ApiCollection, ApiRequestItem, ApiFolder } from '@wso2/api-tryit-core';
import { getHurlBinaryManager } from '../hurl/hurl-binary-manager';

interface RunHurlTestInput {
    hurlScript: string;
}
interface HurlTestToolOutput {
    input: {
        requests: Array<{
            name: string;
            method: string;
            url: string;
            headers: Array<{ key: string; value: string }>;
            queryParameters: Array<{ key: string; value: string }>;
            body?: string;
            assertions?: string[];
        }>;
    };
    output: {
        status: string;
        durationMs: number;
        summary: {
            totalEntries: number;
            passedEntries: number;
            failedEntries: number;
        };
        entries: Array<{
            name: string;
            method?: string;
            url?: string;
            statusCode?: number;
            responseHeaders?: Array<{ name: string; value: string }>;
            responseBody?: string;
            status: string;
            durationMs?: number;
            assertions: Array<{
                expression: string;
                status: string;
                expected?: string;
                actual?: string;
                message?: string;
            }>;
            errorMessage?: string;
        }>;
        warnings: string[];
    };
}

const runner = createHurlRunner();
const EMPTY_COLLECTION: ApiCollection = {
    id: 'hurl-collection',
    name: 'Hurl Collection',
    folders: [],
    rootItems: [],
};

export default class RunHurlTest implements vscode.LanguageModelTool<RunHurlTestInput> {

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<RunHurlTestInput>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const hurlContent = options.input?.hurlScript;
        if (!hurlContent || typeof hurlContent !== 'string' || hurlContent.trim().length === 0) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ error: 'No hurl content provided. Please supply a valid Hurl test string.' })),
            ]);
        }

        try {
            const abort = new AbortController();
            token.onCancellationRequested(() => abort.abort());
            const commandPath = await getHurlBinaryManager().resolveCommandPath({
                autoInstall: true,
                promptOnFailure: false,
            });

            const parsedCollection = safeParseCollection(hurlContent);
            const blockScripts = getBlockScripts(hurlContent);
            const executed = await executeBlocks(blockScripts, commandPath, abort.signal);

            const toolOutput = buildToolOutput(
                parsedCollection,
                executed.files,
                executed.durationMs,
                executed.warnings
            );

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(toolOutput, null, 2)),
            ]);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ error: `Hurl execution failed: ${msg}` })),
            ]);
        }
    }

    prepareInvocation(
        _options: vscode.LanguageModelToolInvocationPrepareOptions<RunHurlTestInput>,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
        return {
            invocationMessage: 'Running hurl test scenario...',
        };
    }
}

function safeParseCollection(hurlContent: string): ApiCollection {
    try {
        return parseHurlCollection(hurlContent);
    } catch {
        return EMPTY_COLLECTION;
    }
}

function getBlockScripts(hurlContent: string): string[] {
    try {
        const blocks = parseHurlDocument(hurlContent).blocks
            .map(block => block.text.trim())
            .filter(Boolean);

        return blocks.length > 0 ? blocks : [hurlContent];
    } catch {
        return [hurlContent];
    }
}

async function executeBlocks(
    blockScripts: string[],
    commandPath: string,
    signal: AbortSignal
): Promise<{ files: HurlFileResult[]; durationMs: number; warnings: string[] }> {
    const files: HurlFileResult[] = [];
    const warnings = new Set<string>();
    let durationMs = 0;

    for (const script of blockScripts) {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-test-'));
        const tempFile = path.join(tempDir, 'cell.hurl');

        try {
            await fs.writeFile(tempFile, script, 'utf-8');

            const runResult = await runner.run(
                { collectionPath: tempDir, includePatterns: ['cell.hurl'] },
                {
                    timeoutMs: 30_000,
                    signal,
                    commandPath,
                    includeResponseOutput: true,
                    continueOnError: true,
                }
            );

            durationMs += runResult.durationMs;
            for (const warning of runResult.diagnostics.warnings) {
                warnings.add(warning);
            }

            const fileResult = runResult.files[0];
            if (fileResult) {
                files.push(fileResult);
            }
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { /* ignore */ });
        }
    }

    return { files, durationMs, warnings: Array.from(warnings) };
}

function assertionsForEntry(entry: HurlEntryResult, fileResult: HurlFileResult): HurlAssertionResult[] {
    const entryAssertions = entry.assertions || [];
    if (entryAssertions.length > 0) {
        return entryAssertions;
    }

    return fileResult.assertions.filter(a =>
        (entry.name && a.entryName === entry.name) ||
        (!a.entryName && fileResult.entries.indexOf(entry) === 0)
    );
}

function buildToolOutput(
    collection: ApiCollection,
    fileResults: HurlFileResult[],
    durationMs: number,
    warnings: string[]
): HurlTestToolOutput {
    const allItems: ApiRequestItem[] = [
        ...(collection.rootItems ?? []),
        ...collection.folders.flatMap((f: ApiFolder) => f.items),
    ];

    const input = {
        requests: allItems.map((item: ApiRequestItem) => ({
            name: item.name,
            method: item.request.method,
            url: item.request.url,
            headers: item.request.headers.map(h => ({ key: h.key, value: h.value })),
            queryParameters: item.request.queryParameters.map(q => ({ key: q.key, value: q.value })),
            ...(item.request.body !== undefined && { body: item.request.body }),
            ...(item.assertions && item.assertions.length > 0 && { assertions: item.assertions }),
        })),
    };

    const entries = fileResults.flatMap((fileResult: HurlFileResult) =>
        (fileResult.entries ?? []).map((entry: HurlEntryResult) => {
            const mappedAssertions = assertionsForEntry(entry, fileResult);
            return {
                name: entry.name,
                ...(entry.method !== undefined && { method: entry.method }),
                ...(entry.url !== undefined && { url: entry.url }),
                ...(entry.statusCode !== undefined && { statusCode: entry.statusCode }),
                ...(entry.responseHeaders !== undefined && { responseHeaders: entry.responseHeaders }),
                ...(entry.responseBody !== undefined && { responseBody: entry.responseBody }),
                status: entry.status,
                ...(entry.durationMs !== undefined && { durationMs: entry.durationMs }),
                assertions: mappedAssertions.map((a: HurlAssertionResult) => ({
                    expression: a.expression,
                    status: a.status,
                    ...(a.expected !== undefined && { expected: a.expected }),
                    ...(a.actual !== undefined && { actual: a.actual }),
                    ...(a.message !== undefined && { message: a.message }),
                })),
                ...(entry.errorMessage !== undefined && { errorMessage: entry.errorMessage }),
            };
        })
    );

    const passedEntries = entries.filter(entry => entry.status === 'passed').length;
    const failedEntries = entries.length - passedEntries;
    const status = failedEntries > 0 ? 'failed' : 'passed';

    return {
        input,
        output: {
            status,
            durationMs,
            summary: {
                totalEntries: entries.length,
                passedEntries,
                failedEntries,
            },
            entries,
            warnings,
        },
    };
}
