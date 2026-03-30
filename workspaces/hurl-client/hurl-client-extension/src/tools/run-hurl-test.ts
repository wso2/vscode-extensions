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
import { createHurlRunner } from '@wso2/api-tryit-hurl-runner';
import { getHurlBinaryManager } from '../hurl/hurl-binary-manager';

interface RunHurlTestInput {
    hurlContent: string;
}

/**
 * VS Code Language Model tool that executes a Hurl HTTP request and returns
 * the response as text. Allows Copilot to run hurl requests on behalf of the user.
 */
export default class RunHurlTest implements vscode.LanguageModelTool<RunHurlTestInput> {
    async invoke(
        request: vscode.LanguageModelToolInvocationOptions<RunHurlTestInput>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const hurlContent = request.input?.hurlContent?.trim();
        if (!hurlContent) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart('No hurl content provided.')
            ]);
        }

        let tempDir: string | undefined;
        try {
            const commandPath = await getHurlBinaryManager().resolveCommandPath({ autoInstall: false });

            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hurl-tool-'));
            const tempFile = path.join(tempDir, 'request.hurl');
            await fs.writeFile(tempFile, hurlContent, 'utf-8');

            const runner = createHurlRunner();
            const result = await runner.run(
                { collectionPath: tempDir, includePatterns: ['request.hurl'] },
                { commandPath, includeResponseOutput: true, continueOnError: true }
            );

            const fileResult = result.files[0];
            if (!fileResult) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('No output returned from hurl execution.')
                ]);
            }

            const lines: string[] = [];
            for (const entry of fileResult.entries) {
                if (entry.statusCode !== undefined) {
                    lines.push(`Status: ${entry.statusCode}`);
                }
                if (entry.responseBody) {
                    lines.push(`Body:\n${entry.responseBody}`);
                }
                if (entry.status === 'failed' && entry.errorMessage) {
                    lines.push(`Failed: ${entry.errorMessage}`);
                }
            }

            if (fileResult.stdout && lines.length === 0) {
                lines.push(fileResult.stdout);
            }

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(lines.join('\n') || 'Request completed.')
            ]);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error: ${message}`)
            ]);
        } finally {
            if (tempDir) {
                await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
            }
        }
    }
}
