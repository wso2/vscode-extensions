import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { execFile } from 'child_process';

interface RunHurlTestInput {
    hurlScript: string;
}

export default class RunHurlTest implements vscode.LanguageModelTool<RunHurlTestInput> {

    async invoke(
        options: vscode.LanguageModelToolInvocationOptions<RunHurlTestInput>,
        token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        const hurlContent = options.input?.hurlScript;
        if (!hurlContent || typeof hurlContent !== 'string' || hurlContent.trim().length === 0) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart('Error: No hurl content provided. Please supply a valid Hurl test string.'),
            ]);
        }

        // Write hurl content to a temp file
        const tmpDir = os.tmpdir();
        const tmpFile = path.join(tmpDir, `hurl-test-${Date.now()}.hurl`);

        try {
            await fs.writeFile(tmpFile, hurlContent, 'utf-8');

            const output = await this.runHurl(tmpFile, token);

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(output),
            ]);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Hurl execution failed: ${msg}`),
            ]);
        } finally {
            // Clean up temp file
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

    private runHurl(filePath: string, token: vscode.CancellationToken): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const proc = execFile('hurl', ['--very-verbose', filePath], {
                timeout: 30_000,
                maxBuffer: 1024 * 1024,
            }, (error, stdout, stderr) => {
                const combined = [stdout, stderr].filter(Boolean).join('\n').trim();

                if (error) {
                    // Still return output even on non-zero exit (hurl reports assertion failures via exit code)
                    if (combined) {
                        resolve(combined);
                    } else {
                        reject(error);
                    }
                } else {
                    resolve(combined || 'Hurl test completed with no output.');
                }
            });

            // Respect cancellation
            token.onCancellationRequested(() => {
                proc.kill();
                reject(new Error('Hurl execution was cancelled.'));
            });
        });
    }
}