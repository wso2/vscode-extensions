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
import * as path from 'path';
import { AIProvider, AIRequest, AIResponse, IAIProvider } from '../types';

/**
 * GitHub Copilot AI Provider
 * Uses VS Code's Language Model API to interact with GitHub Copilot
 */
export class CopilotProvider implements IAIProvider {
    readonly provider = AIProvider.COPILOT;

    constructor(private context: vscode.ExtensionContext) {}

    async isAvailable(): Promise<boolean> {
        if (!vscode.lm) {
            return false;
        }

        try {
            const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
            return models && models.length > 0;
        } catch {
            return false;
        }
    }

    async generate(request: AIRequest): Promise<AIResponse> {
        try {
            // Ensure Copilot is available
            const models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
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

            // Open the Copilot chat panel in agent mode
            await vscode.commands.executeCommand('workbench.action.chat.openagent', {
                query: fullQuery
            });
            
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

}

