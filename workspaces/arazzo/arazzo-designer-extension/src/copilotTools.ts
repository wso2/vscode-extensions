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

import * as vscode from 'vscode';
import { getMCPActiveFilePath, isMCPServerRunning, startMCPServer } from './mcp/mcpServerRunner';

const TLS_SETTING_KEY = 'disableTLSCertificationValidation';

/**
 * Registers the two Arazzo Copilot tools:
 *  - arazzo_start_server   : start (or restart) the Arazzo server for a file
 *  - arazzo_set_tls_validation : enable / disable TLS certificate validation
 *
 * @param context  Extension context used to manage disposables and restart the server.
 * @param suppressNextTLSChangePrompt  Called before the workspace setting is written so
 *        the onDidChangeConfiguration handler in extension.ts skips its modal dialog —
 *        the tool handles the restart itself.
 */
export function registerArazzoCopilotTools(
    context: vscode.ExtensionContext,
    suppressNextTLSChangePrompt: () => void,
): void {
    // vscode.lm is only available in VS Code 1.100+; the `as any` cast is required
    // because @types/vscode is pinned to 1.81 while the engine requires ^1.100.
    const lm = (vscode as any).lm;
    if (!lm?.registerTool) {
        return;
    }

    context.subscriptions.push(
        lm.registerTool('arazzo_start_server', new StartServerTool(context)),
        lm.registerTool('arazzo_set_tls_validation', new SetTLSValidationTool(context, suppressNextTLSChangePrompt)),
    );
}

// ---------------------------------------------------------------------------
// Tool: arazzo_start_server
// ---------------------------------------------------------------------------

class StartServerTool {
    constructor(private readonly context: vscode.ExtensionContext) {}

    async prepareInvocation(options: any): Promise<any> {
        const input = options.input ?? {};
        const file = input.filePath ?? input.fileUri ?? 'the active Arazzo file';
        return {
            invocationMessage: 'Starting Arazzo server',
            confirmationMessages: {
                title: 'Start Arazzo Server',
                message: new vscode.MarkdownString(`Start the Arazzo server for **${file}**?`),
            },
        };
    }

    async invoke(options: any): Promise<any> {
        const input = options.input ?? {};
        const filePath =
            resolveFilePath(input.filePath, input.fileUri) ??
            vscode.window.activeTextEditor?.document.uri.fsPath;

        if (!filePath) {
            throw new Error(
                'Provide filePath or fileUri, or open an Arazzo file in the editor before starting the server.',
            );
        }

        // suppressPrompt=true so startMCPServer does not show its own "Try Now"
        // notification; the tool result message is sufficient feedback.
        await startMCPServer(this.context, filePath, true);

        return toolResult(
            `Arazzo server started for \`${filePath}\`. ` +
            `The extension has written \`.vscode/mcp.json\` so Copilot can call workflows via MCP. ` +
            `The current TLS setting (\`arazzo.disableTLSCertificationValidation\`) was applied automatically when the server started.`,
        );
    }
}

// ---------------------------------------------------------------------------
// Tool: arazzo_set_tls_validation
// ---------------------------------------------------------------------------

class SetTLSValidationTool {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly suppressNextTLSChangePrompt: () => void,
    ) {}

    async prepareInvocation(options: any): Promise<any> {
        const input = options.input ?? {};
        const disable = input.disable === true;
        return {
            invocationMessage: disable
                ? 'Disabling TLS certificate validation'
                : 'Enabling TLS certificate validation',
            confirmationMessages: {
                title: disable ? 'Disable TLS Validation' : 'Enable TLS Validation',
                message: new vscode.MarkdownString(
                    `${disable ? 'Disable' : 'Enable'} TLS certificate validation ` +
                    `for outbound API calls made by the Arazzo runner?`,
                ),
            },
        };
    }

    async invoke(options: any): Promise<any> {
        const input = options.input ?? {};
        if (typeof input.disable !== 'boolean') {
            throw new Error(
                'Provide `disable` as a boolean — `true` to disable TLS validation, `false` to enable it.',
            );
        }

        const config = vscode.workspace.getConfiguration('arazzo');

        // Suppress the interactive "Restart Server?" modal that fires from the
        // onDidChangeConfiguration listener — this tool handles the restart itself.
        this.suppressNextTLSChangePrompt();
        await config.update(TLS_SETTING_KEY, input.disable, vscode.ConfigurationTarget.Workspace);

        // Restart the server by default so the new TLS setting takes effect immediately.
        const shouldRestart = input.restartServer !== false;
        if (shouldRestart && isMCPServerRunning()) {
            const activeFilePath = getMCPActiveFilePath();
            await startMCPServer(this.context, activeFilePath, true);
            return toolResult(
                `TLS certificate validation is now **${input.disable ? 'disabled' : 'enabled'}** ` +
                `and the Arazzo server has been restarted with the new setting.`,
            );
        }

        return toolResult(
            `TLS certificate validation is now **${input.disable ? 'disabled' : 'enabled'}**. ` +
            (isMCPServerRunning()
                ? 'Restart the Arazzo server for this change to take effect on the running instance.'
                : 'The next server start will use this setting.'),
        );
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveFilePath(filePath?: string, fileUri?: string): string | undefined {
    if (typeof filePath === 'string' && filePath.trim() !== '') {
        return filePath;
    }
    if (typeof fileUri === 'string' && fileUri.trim() !== '') {
        return vscode.Uri.parse(fileUri).fsPath;
    }
    return undefined;
}

function toolResult(text: string): any {
    const vscodeAny = vscode as any;
    if (vscodeAny.LanguageModelToolResult && vscodeAny.LanguageModelTextPart) {
        return new vscodeAny.LanguageModelToolResult([new vscodeAny.LanguageModelTextPart(text)]);
    }
    // Fallback for older VS Code API shapes
    return { content: [{ type: 'text', value: text }] };
}
