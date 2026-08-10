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
import { AIProvider, AIRequest, AIResponse, IAIProvider } from '../types';

const CLAUDE_CODE_EXTENSION_ID = 'anthropic.claude-code';
// Opens a terminal and runs `claude "prompt"` which auto-executes the prompt
const CLAUDE_CODE_TERMINAL_COMMAND = 'claude-vscode.terminal.open';

/**
 * Claude Code AI Provider
 * Uses the Claude Code VS Code extension to open a new conversation with the given prompt
 */
export class ClaudeProvider implements IAIProvider {
    readonly provider = AIProvider.CLAUDE;

    constructor(_context: vscode.ExtensionContext) {}

    async isAvailable(): Promise<boolean> {
        const ext = vscode.extensions.getExtension(CLAUDE_CODE_EXTENSION_ID);
        return ext !== undefined && ext.isActive;
    }

    async generate(request: AIRequest): Promise<AIResponse> {
        const ext = vscode.extensions.getExtension(CLAUDE_CODE_EXTENSION_ID);
        if (!ext) {
            return {
                success: false,
                error: 'Claude Code extension is not installed. Please install the Claude Code extension.',
                provider: AIProvider.CLAUDE
            };
        }

        if (!ext.isActive) {
            try {
                await ext.activate();
            } catch {
                return {
                    success: false,
                    error: 'Failed to activate Claude Code extension.',
                    provider: AIProvider.CLAUDE
                };
            }
        }

        try {
            const existing = this.findClaudeTerminal();

            if (existing) {
                existing.show(false);
                // sendText cannot reliably execute in a running interactive process.
                // Instead: Ctrl+C exits the current claude session, then we run
                // `claude --continue` in the same terminal shell so the conversation
                // is preserved and the new prompt auto-executes.
                existing.sendText('\x03', false);
                await new Promise(r => setTimeout(r, 600));
                const shellEscaped = request.prompt.replace(/'/g, `'"'"'`);
                existing.sendText(`claude --continue '${shellEscaped}'`, true);
            } else {
                const fullPrompt = this.buildPrompt(request);
                await vscode.commands.executeCommand(CLAUDE_CODE_TERMINAL_COMMAND, fullPrompt, [], 'beside');
            }

            return {
                success: true,
                result: 'Claude Code opened successfully',
                provider: AIProvider.CLAUDE
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Failed to open Claude Code: ${errorMessage}`,
                provider: AIProvider.CLAUDE
            };
        }
    }

    private findClaudeTerminal(): vscode.Terminal | undefined {
        return vscode.window.terminals.find(t => t.name === 'Claude Code');
    }

    private buildPrompt(request: AIRequest): string {
        if (!request.context) {
            return request.prompt;
        }

        // Context may be "#relPath\n\n<raw content>" (same format Copilot uses).
        // Extract the #filename reference and convert to Claude's @path mention so
        // Claude Code reads the file itself — do not embed the raw content.
        const fileMatch = request.context.match(/#([^\s]+)/);
        if (fileMatch) {
            return `@${fileMatch[1]}\n\n${request.prompt}`;
        }

        // Fall back: treat context as an absolute file path
        try {
            const fileUri = vscode.Uri.file(request.context);
            const wsFolder = vscode.workspace.getWorkspaceFolder(fileUri);
            if (wsFolder) {
                const relPath = path.relative(wsFolder.uri.fsPath, request.context);
                return `@${relPath.split(path.sep).join('/')}\n\n${request.prompt}`;
            }
            return `@${path.basename(request.context)}\n\n${request.prompt}`;
        } catch {
            return request.prompt;
        }
    }
}
