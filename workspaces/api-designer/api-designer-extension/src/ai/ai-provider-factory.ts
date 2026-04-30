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
import { AIProvider, IAIProvider } from './types';

/**
 * Factory for managing AI providers
 * Provides centralized registration and retrieval of AI providers
 */
export class AIProviderFactory {
    private static providers: Map<AIProvider, IAIProvider> = new Map();

    /**
     * Register an AI provider
     */
    static registerProvider(provider: AIProvider, implementation: IAIProvider): void {
        this.providers.set(provider, implementation);
    }

    /**
     * Get a specific provider by type
     */
    static getProvider(provider: AIProvider): IAIProvider | null {
        return this.providers.get(provider) || null;
    }

    /**
     * Get the configured provider from settings
     */
    static getConfiguredProvider(): IAIProvider | null {
        const config = vscode.workspace.getConfiguration('apiDesigner');
        const providerName = config.get<string>('ai.provider', 'copilot');
        
        const providerType = AIProvider[providerName.toUpperCase() as keyof typeof AIProvider] || AIProvider.COPILOT;
        return this.getProvider(providerType);
    }

    /**
     * Get an available AI provider
     * Tries configured provider first, then falls back to any available provider
     */
    static async getAvailableProvider(): Promise<IAIProvider | null> {
        // Try configured provider first
        const configured = this.getConfiguredProvider();
        if (configured && await configured.isAvailable()) {
            return configured;
        }

        // Fallback: return the first other available provider.
        for (const provider of this.providers.values()) {
            if (provider === configured) {
                continue;
            }
            if (await provider.isAvailable()) {
                return provider;
            }
        }
        return null;
    }

    /**
     * Check if any provider is available
     */
    static async hasAvailableProvider(): Promise<boolean> {
        return (await this.getAvailableProvider()) !== null;
    }
}

