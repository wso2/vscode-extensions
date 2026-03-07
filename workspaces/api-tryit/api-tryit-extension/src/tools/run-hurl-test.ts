import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { createHurlRunner, HurlRunResult, HurlFileResult, HurlEntryResult, HurlAssertionResult } from '@wso2/api-tryit-hurl-runner';
import { parseHurlCollection } from '@wso2/api-tryit-hurl-parser';
import { ApiCollection, ApiRequestItem, ApiFolder } from '@wso2/api-tryit-core';

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

        const tmpFile = path.join(os.tmpdir(), `hurl-test-${Date.now()}.hurl`);

        try {
            await fs.writeFile(tmpFile, hurlContent, 'utf-8');

            const abort = new AbortController();
            token.onCancellationRequested(() => abort.abort());

            const [parsedCollection, runResult] = await Promise.all([
                Promise.resolve(parseHurlCollection(hurlContent)),
                runner.run(
                    { collectionPath: tmpFile },
                    { timeoutMs: 30_000, signal: abort.signal }
                ),
            ]);

            const toolOutput = buildToolOutput(parsedCollection, runResult);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(toolOutput, null, 2)),
            ]);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ error: `Hurl execution failed: ${msg}` })),
            ]);
        } finally {
            await fs.unlink(tmpFile).catch(() => { /* ignore */ });
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

function buildToolOutput(collection: ApiCollection, runResult: HurlRunResult): HurlTestToolOutput {
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

    const fileResult: HurlFileResult | undefined = runResult.files[0];
    const entries = (fileResult?.entries ?? []).map((entry: HurlEntryResult) => {
        return {
            name: entry.name,
            ...(entry.method !== undefined && { method: entry.method }),
            ...(entry.url !== undefined && { url: entry.url }),
            ...(entry.statusCode !== undefined && { statusCode: entry.statusCode }),
            ...(entry.responseHeaders !== undefined && { responseHeaders: entry.responseHeaders }),
            ...(entry.responseBody !== undefined && { responseBody: entry.responseBody }),
            status: entry.status,
            ...(entry.durationMs !== undefined && { durationMs: entry.durationMs }),
            assertions: (entry.assertions ?? []).map((a: HurlAssertionResult) => ({
                expression: a.expression,
                status: a.status,
                ...(a.expected !== undefined && { expected: a.expected }),
                ...(a.actual !== undefined && { actual: a.actual }),
                ...(a.message !== undefined && { message: a.message }),
            })),
            ...(entry.errorMessage !== undefined && { errorMessage: entry.errorMessage }),
        };
    });

    return {
        input,
        output: {
            status: runResult.status,
            durationMs: runResult.durationMs,
            summary: {
                totalEntries: runResult.summary.totalEntries,
                passedEntries: runResult.summary.passedEntries,
                failedEntries: runResult.summary.failedEntries,
            },
            entries,
            warnings: runResult.diagnostics.warnings,
        },
    };
}