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
import { Messenger } from 'vscode-messenger';
import { AIProvider, AIRequest, AIResponse } from './types';
import { CopilotProvider, ClaudeProvider } from './providers';
import { AIProviderFactory } from './ai-provider-factory';

/**
 * Central AI Manager that supports multiple AI providers
 * Uses AIProviderFactory for provider management
 */
export class AIManager {
    private static instance: AIManager;

    private constructor(
        private messenger: Messenger,
        private context: vscode.ExtensionContext
    ) {
        this.initializeProviders();
    }

    public static getInstance(
        messenger: Messenger,
        context: vscode.ExtensionContext
    ): AIManager {
        if (!AIManager.instance) {
            AIManager.instance = new AIManager(messenger, context);
        }
        return AIManager.instance;
    }

    /**
     * Initialize and register all available AI providers via factory
     */
    private initializeProviders(): void {
        // Register GitHub Copilot provider
        AIProviderFactory.registerProvider(
            AIProvider.COPILOT,
            new CopilotProvider(this.context)
        );

        // Register Claude provider
        AIProviderFactory.registerProvider(
            AIProvider.CLAUDE,
            new ClaudeProvider(this.context)
        );
    }

    /**
     * Generate content using AI
     * Automatically selects the best available provider via factory
     */
    async generateWithAI(context: string, prompt: string): Promise<AIResponse> {
        const provider = await AIProviderFactory.getAvailableProvider();

        if (!provider) {
            vscode.window.showErrorMessage(
                'No AI provider is available. Please install and enable an AI provider (GitHub Copilot, Claude, etc.).',
                'Open Settings'
            ).then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'apiDesigner.ai');
                }
            });

            return {
                success: false,
                error: 'No AI provider available'
            };
        }

        const request: AIRequest = { context, prompt };
        return await provider.generate(request);
    }

}

