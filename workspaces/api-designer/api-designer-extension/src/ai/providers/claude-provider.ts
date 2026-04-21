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
import { AIProvider, AIRequest, AIResponse, IAIProvider } from '../types';

/**
 * Claude AI Provider (Anthropic)
 * TODO: Implement Claude integration via:
 * - Direct API calls to Anthropic API
 * - Or VS Code extension for Claude if available
 */
export class ClaudeProvider implements IAIProvider {
    readonly provider = AIProvider.CLAUDE;

    constructor(private context: vscode.ExtensionContext) {}

    async isAvailable(): Promise<boolean> {
        // TODO: Check if Claude API key is configured or Claude extension is available
        // For now, return false until implemented
        return false;
    }

    async generate(request: AIRequest): Promise<AIResponse> {
        // TODO: Implement Claude API integration
        // Example implementation:
        // 1. Get API key from VS Code settings (apiDesigner.ai.claude.apiKey)
        // 2. Call Anthropic API with the prompt
        // 3. Return the response
        
        return {
            success: false,
            error: 'Claude provider not yet implemented',
            provider: AIProvider.CLAUDE
        };
    }
}
