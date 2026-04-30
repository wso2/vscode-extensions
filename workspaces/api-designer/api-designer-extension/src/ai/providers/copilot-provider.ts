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

type VSCodeWithLM = typeof vscode & { lm?: { selectChatModels: (query: { vendor: string }) => Promise<unknown[]> } };
const vscodeWithLM = vscode as VSCodeWithLM;

/**
 * GitHub Copilot AI Provider
 * Uses VS Code's Language Model API to interact with GitHub Copilot
 */
export class CopilotProvider implements IAIProvider {
    readonly provider = AIProvider.COPILOT;

    constructor(private context: vscode.ExtensionContext) {}

    async isAvailable(): Promise<boolean> {
        if (!vscodeWithLM.lm) {
            return false;
        }

        try {
            const models = await vscodeWithLM.lm.selectChatModels({ vendor: 'copilot' });
            return models && models.length > 0;
        } catch {
            return false;
        }
    }

    async generate(request: AIRequest): Promise<AIResponse> {
        try {
            // Ensure Copilot is available
            if (!vscodeWithLM.lm) {
                return {
                    success: false,
                    error: 'Language Model API is not available in this VS Code runtime.',
                    provider: AIProvider.COPILOT
                };
            }

            const models = await vscodeWithLM.lm.selectChatModels({ vendor: 'copilot' });
            if (models.length === 0) {
                return {
                    success: false,
                    error: 'GitHub Copilot is not available. Please ensure GitHub Copilot is installed and enabled.',
                    provider: AIProvider.COPILOT
                };
            }

            // Build file reference using #filename syntax
            let fileRef = '';
            if (request.context) {
                try {
                    // Try to extract file path from context
                    const fileMatch = request.context.match(/#([^\s]+)/);
                    if (fileMatch) {
                        fileRef = fileMatch[1];
                    } else {
                        // Try to use context as file path
                        const fileUri = vscode.Uri.file(request.context);
                        const wsFolder = vscode.workspace.getWorkspaceFolder(fileUri);
                        if (wsFolder) {
                            const relPath = path.relative(wsFolder.uri.fsPath, request.context);
                            const normalizedPath = relPath.split(path.sep).join('/');
                            fileRef = `#${normalizedPath}`;
                        } else {
                            const fileName = path.basename(request.context);
                            fileRef = `#${fileName}`;
                        }
                    }
                } catch {
                    // Ignore file path errors
                }
            }

            // Build the full query with file reference and prompt
            const fullQuery = fileRef ? `${fileRef}\n\n${request.prompt}` : request.prompt;

            await this.openCopilotChat(fullQuery);
            
            return {
                success: true,
                result: 'Chat opened successfully',
                provider: AIProvider.COPILOT
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                error: `Failed to open GitHub Copilot chat: ${errorMessage}`,
                provider: AIProvider.COPILOT
            };
        }
    }

    private async openCopilotChat(query: string): Promise<void> {
        const attempts: Array<{ command: string; args?: unknown[] }> = [
            { command: 'workbench.action.chat.openagent', args: [{ query }] },
            { command: 'workbench.action.chat.open', args: [{ query }] },
            { command: 'workbench.action.chat.open', args: [query] },
            { command: 'github.copilot.chat.open', args: [{ prompt: query }] }
        ];

        let lastError: unknown;
        for (const attempt of attempts) {
            try {
                await vscode.commands.executeCommand(attempt.command, ...(attempt.args || []));
                return;
            } catch (error) {
                lastError = error;
                const message = error instanceof Error ? error.message : String(error);
                // Continue fallback chain only for unknown/missing command cases.
                if (!message.includes('not found')) {
                    throw error;
                }
            }
        }
        throw lastError instanceof Error ? lastError : new Error('No supported Copilot chat command found');
    }
}

