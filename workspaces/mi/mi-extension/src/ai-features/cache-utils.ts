/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { ModelMessage, JSONValue, LanguageModel } from 'ai';

/**
 * Simplified Dynamic Prompt Caching (based on AI SDK recipe)
 *
 * Strategy: Mark the LAST message before each API call with cache_control.
 * Anthropic caches everything up to that point automatically.
 *
 * Key benefits:
 * - Simple: ~40 lines vs 370 lines
 * - Works across sessions: No need to store cache_control in JSONL
 * - Reliable: Follows Anthropic's recommended pattern
 *
 * Cost structure:
 * - Cache write: 1.25x base price (25% premium, first time)
 * - Cache read: 0.1x base price (90% discount, subsequent calls)
 * - Minimum cacheable: 1024 tokens
 * - Cache lifetime: 5 minutes (ephemeral)
 */

function isAnthropicModel(model: LanguageModel): boolean {
    if (typeof model === 'string') {
        return model.includes('anthropic') || model.includes('claude');
    }
    return (
        model.provider === 'anthropic' ||
        model.provider.includes('anthropic') ||
        model.modelId.includes('anthropic') ||
        model.modelId.includes('claude')
    );
}

/**
 * Add cache control to the last message in the array.
 * This tells Anthropic to cache everything up to this point.
 *
 * Per Anthropic docs: "Mark the final block of the final message with
 * cache_control so the conversation can be incrementally cached."
 */
export function addCacheControlToMessages({
    messages,
    model,
    providerOptions = {
        anthropic: { cacheControl: { type: 'ephemeral' } },
    },
}: {
    messages: ModelMessage[];
    model: LanguageModel;
    providerOptions?: Record<string, Record<string, JSONValue>>;
}): ModelMessage[] {
    if (messages.length === 0) return messages;
    if (!isAnthropicModel(model)) return messages;

    // Map messages and add cache control to the last one
    return messages.map((message, index) => {
        if (index === messages.length - 1) {
            return {
                ...message,
                providerOptions: {
                    ...message.providerOptions,
                    ...providerOptions,
                },
            };
        }
        return message;
    });
}
