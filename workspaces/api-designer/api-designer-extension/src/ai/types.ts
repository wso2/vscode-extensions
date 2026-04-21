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

/**
 * Supported AI providers
 */
export enum AIProvider {
    COPILOT = 'copilot',
    CLAUDE = 'claude',
    OPENAI = 'openai'
}

/**
 * Request for AI generation
 */
export interface AIRequest {
    prompt: string;
    context?: string;
}

/**
 * Response from AI generation
 */
export interface AIResponse {
    success: boolean;
    result?: string;
    error?: string;
    provider?: AIProvider;
}

/**
 * Interface that all AI providers must implement
 */
export interface IAIProvider {
    /**
     * The provider type
     */
    readonly provider: AIProvider;

    /**
     * Check if this provider is available/configured
     */
    isAvailable(): Promise<boolean>;

    /**
     * Generate content using the AI provider
     * For providers like Copilot, this opens the chat interface
     */
    generate(request: AIRequest): Promise<AIResponse>;
}

