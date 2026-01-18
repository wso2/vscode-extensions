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

import { countTokens } from '@anthropic-ai/tokenizer';
import canonicalize from 'canonicalize';
import { logInfo, logDebug } from './copilot/logger';
import { getProviderCacheControl } from './connection';

/**
 * Deterministic Anthropic Prompt Caching
 * 
 * Strategy:
 * 1. System prompt: Always has cache breakpoint (static, ~15K tokens)
 * 2. User prompt: Add cache breakpoint if > CACHE_THRESHOLD tokens
 * 3. Tool loop: Add cache breakpoint when uncached block exceeds CACHE_THRESHOLD
 * 4. Persistence: Store cache_control in JSONL so breakpoints are replayed exactly
 * 
 * Key insight: Cache breakpoints must be at EXACT same positions for cache hits.
 * Using canonicalize() ensures byte-for-byte consistency in JSONL storage.
 * 
 * Cost structure:
 * - Cache write: 1.25x base price (25% premium)
 * - Cache read: 0.1x base price (90% discount!)
 * - Minimum cacheable: 1024 tokens (Sonnet), we use 4096 for efficiency
 */

// Minimum tokens before adding a cache breakpoint
// Anthropic minimum is 1024 for Sonnet, we use 4096 for fewer cache writes
export const CACHE_THRESHOLD = 1024;

/**
 * Count tokens in a message or content using Anthropic's tokenizer
 */
export function countMessageTokens(content: any): number {
    try {
        if (typeof content === 'string') {
            return countTokens(content);
        }
        // For complex content (arrays, objects), serialize and count
        const serialized = typeof content === 'object' ? JSON.stringify(content) : String(content);
        return countTokens(serialized);
    } catch (error) {
        // Fallback to character-based estimate if tokenizer fails
        const serialized = typeof content === 'object' ? JSON.stringify(content) : String(content);
        return Math.ceil(serialized.length / 4);
    }
}

/**
 * Canonicalize a message for JSONL storage
 * Ensures byte-for-byte consistency for cache key matching
 */
export function canonicalizeMessage(message: any): string {
    const result = canonicalize(message);
    if (result === undefined) {
        throw new Error('Failed to canonicalize message');
    }
    return result;
}

/**
 * Token counter for tracking uncached tokens in conversation
 */
export class TokenCounter {
    private tokensSinceLastBreakpoint: number = 0;
    private totalTokens: number = 0;

    /**
     * Add tokens and check if breakpoint should be added
     * @returns true if a cache breakpoint should be added
     */
    addTokens(tokens: number): boolean {
        this.tokensSinceLastBreakpoint += tokens;
        this.totalTokens += tokens;
        return this.tokensSinceLastBreakpoint >= CACHE_THRESHOLD;
    }

    /**
     * Reset counter after adding a breakpoint
     */
    resetAfterBreakpoint(): void {
        this.tokensSinceLastBreakpoint = 0;
    }

    /**
     * Get current uncached token count
     */
    getUncachedTokens(): number {
        return this.tokensSinceLastBreakpoint;
    }

    /**
     * Get total tokens counted
     */
    getTotalTokens(): number {
        return this.totalTokens;
    }
}

/**
 * Apply cache breakpoints to messages loaded from history
 * 
 * This function:
 * 1. Respects existing cache_control flags from JSONL
 * 2. Adds new breakpoints for uncached blocks > CACHE_THRESHOLD
 * 3. Returns messages ready for AI SDK with providerOptions
 * 
 * @param messages - Messages loaded from JSONL (may have cache_control)
 * @returns Messages with providerOptions for caching
 */
export function applyCacheBreakpointsToHistory(messages: any[]): any[] {
    if (messages.length === 0) {
        return messages;
    }

    const cacheOptions = getProviderCacheControl();
    const counter = new TokenCounter();
    const result: any[] = [];

    for (let i = 0; i < messages.length; i++) {
        const msg = { ...messages[i] };
        const tokens = countMessageTokens(msg.content);
        
        // Check if this message already has cache_control from JSONL
        const hasExistingBreakpoint = msg.cache_control?.type === 'ephemeral';
        
        if (hasExistingBreakpoint) {
            // Message already has breakpoint - convert to providerOptions format
            msg.providerOptions = cacheOptions;
            delete msg.cache_control; // Remove storage format, use SDK format
            counter.resetAfterBreakpoint();
            logDebug(`[Cache] History: Preserved breakpoint at index ${i} (${msg.role})`);
        } else {
            // Check if we should add a breakpoint
            const shouldAddBreakpoint = counter.addTokens(tokens);
            
            // Only add breakpoints on assistant/tool messages (not user)
            if (shouldAddBreakpoint && (msg.role === 'assistant' || msg.role === 'tool')) {
                msg.providerOptions = cacheOptions;
                counter.resetAfterBreakpoint();
                logDebug(`[Cache] History: Added new breakpoint at index ${i} (${msg.role}, ${tokens} tokens, threshold exceeded)`);
            }
        }
        
        result.push(msg);
    }

    logDebug(`[Cache] History: Processed ${messages.length} messages, ${counter.getTotalTokens()} total tokens`);
    return result;
}

/**
 * Check if user prompt should have a cache breakpoint
 * 
 * @param userPromptContent - The user prompt content
 * @returns true if breakpoint should be added
 */
export function shouldCacheUserPrompt(userPromptContent: string): boolean {
    const tokens = countMessageTokens(userPromptContent);
    const shouldCache = tokens >= CACHE_THRESHOLD;
    if (shouldCache) {
        logDebug(`[Cache] User prompt exceeds threshold (${tokens} tokens), will add breakpoint`);
    }
    return shouldCache;
}

/**
 * Creates a prepareStep function for dynamic caching within agent tool loops
 * 
 * This is called before each API call in a multi-step agent loop.
 * It tracks tokens and adds cache breakpoints when threshold is exceeded.
 * 
 * IMPORTANT: prepareStep must preserve existing providerOptions (like system prompt cache).
 * The AI SDK will use returned messages, so we must deep-clone and preserve all options.
 * 
 * @param initialUncachedTokens - Tokens already uncached from history processing
 * @returns PrepareStep function for streamText
 */
export function createPrepareStepWithCaching(initialUncachedTokens: number = 0): (options: {
    steps: any[];
    stepNumber: number;
    model: any;
    messages: any[];
    experimental_context: unknown;
}) => { messages: any[] } | undefined {
    const counter = new TokenCounter();

    // Initialize with any uncached tokens from history
    if (initialUncachedTokens > 0) {
        counter.addTokens(initialUncachedTokens);
    }

    // CRITICAL: Track breakpoint positions ourselves since AI SDK doesn't preserve providerOptions between steps
    // Map of message index → true (relative to conversation start)
    const breakpointIndices = new Map<number, boolean>();

    return ({ stepNumber, messages }) => {
        logDebug(`[Cache] prepareStep called: stepNumber=${stepNumber}, messages.length=${messages.length}`);

        // Step 0: Scan for existing breakpoints from history
        if (stepNumber === 0) {
            messages.forEach((msg, i) => {
                if (msg.providerOptions?.anthropic?.cacheControl?.type === 'ephemeral') {
                    breakpointIndices.set(i, true);
                    logDebug(`[Cache] Step 0: Found existing breakpoint at index ${i} (${msg.role})`);
                }
            });
            // Continue to token counting logic below (don't return early)
        }

        logDebug(`[Cache] Step ${stepNumber}: Processing messages, tracked breakpoints: ${Array.from(breakpointIndices.keys()).join(',')}`);

        const cacheOptions = getProviderCacheControl();

        // CRITICAL: Re-apply ALL tracked breakpoints since AI SDK doesn't preserve them
        // Clone messages and re-apply breakpoints at tracked indices
        const processedMessages = messages.map((msg, i) => {
            // Check if this index should have a breakpoint (from our tracking Map)
            if (breakpointIndices.has(i)) {
                return {
                    ...msg,
                    providerOptions: cacheOptions
                };
            }
            return { ...msg };
        });
        
        // Find last breakpoint index from our tracking Map
        let lastBreakpointIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (breakpointIndices.has(i)) {
                lastBreakpointIndex = i;
                break;
            }
        }
        
        // Count tokens in messages AFTER the last breakpoint
        let newTokens = 0;
        let lastCacheableIndex = -1;

        const startIndex = lastBreakpointIndex + 1;
        for (let i = startIndex; i < messages.length; i++) {
            const msg = messages[i];
            const msgTokens = countMessageTokens(msg.content);
            newTokens += msgTokens;

            // Track the very last message (including user messages)
            // This allows caching user messages when threshold is exceeded
            lastCacheableIndex = i;
        }

        // Check if we should add a breakpoint
        const shouldAddBreakpoint = counter.addTokens(newTokens);

        // Get current tracked breakpoints for logging
        const trackedBreakpoints = Array.from(breakpointIndices.keys()).sort((a, b) => a - b);

        logDebug(`[Cache] Step ${stepNumber}: newTokens=${newTokens}, shouldAddBreakpoint=${shouldAddBreakpoint}, lastCacheableIndex=${lastCacheableIndex}, lastBreakpointIndex=${lastBreakpointIndex}`);

        if (shouldAddBreakpoint && lastCacheableIndex >= 0) {
            // Check if we're adding a NEW breakpoint (not already tracked)
            const isNewBreakpoint = !breakpointIndices.has(lastCacheableIndex);

            logInfo(`[Cache] Step ${stepNumber}: Adding ${isNewBreakpoint ? 'NEW' : 'EXISTING'} breakpoint at index ${lastCacheableIndex} (${messages[lastCacheableIndex].role}), newTokens=${newTokens}`);

            // Track this breakpoint position for future steps
            breakpointIndices.set(lastCacheableIndex, true);

            // Add cache breakpoint to the last cacheable message in processedMessages
            processedMessages[lastCacheableIndex] = {
                ...processedMessages[lastCacheableIndex],
                providerOptions: cacheOptions
            };

            counter.resetAfterBreakpoint();

            return { messages: processedMessages };
        } else {
            // ALWAYS return processedMessages to re-apply tracked breakpoints
            // This is CRITICAL since AI SDK doesn't preserve providerOptions between steps
            if (trackedBreakpoints.length > 0) {
                logDebug(`[Cache] Step ${stepNumber}: Returning processedMessages to re-apply ${trackedBreakpoints.length} tracked breakpoints`);
                return { messages: processedMessages };
            }

            // No breakpoints to track, return undefined
            return undefined;
        }
    };
}

/**
 * Determine if a message should have cache_control when saving to JSONL
 * 
 * @param role - Message role
 * @param tokensSinceLastBreakpoint - Tokens accumulated since last breakpoint
 * @returns true if cache_control should be added
 */
export function shouldAddCacheControlToEntry(
    role: string,
    tokensSinceLastBreakpoint: number
): boolean {
    // Only add to assistant/tool messages, not user messages
    if (role !== 'assistant' && role !== 'tool') {
        return false;
    }
    return tokensSinceLastBreakpoint >= CACHE_THRESHOLD;
}

/**
 * Logs cache usage statistics from the API response
 */
export async function logCacheUsage(response: any, turnNumber: number = 0): Promise<void> {
    try {
        const fullResponse = await response;
        const providerMetadata = fullResponse?.providerMetadata?.anthropic;
        
        if (providerMetadata) {
            const cacheCreationTokens = providerMetadata.cacheCreationInputTokens || 0;
            const cacheReadTokens = providerMetadata.cacheReadInputTokens || 0;
            const inputTokens = fullResponse?.usage?.inputTokens || 0;
            const outputTokens = fullResponse?.usage?.outputTokens || 0;
            
            // Calculate cost savings (Sonnet: $3/MTok input, $15/MTok output)
            const costWithoutCache = (inputTokens + cacheCreationTokens + cacheReadTokens) * 3 / 1_000_000;
            const costWithCache = inputTokens * 3 / 1_000_000 + 
                                  cacheCreationTokens * 3 * 1.25 / 1_000_000 + 
                                  cacheReadTokens * 3 * 0.1 / 1_000_000;
            const savings = costWithoutCache - costWithCache;
            const savingsPercent = costWithoutCache > 0 ? (savings / costWithoutCache * 100).toFixed(1) : '0';
            
            const totalCacheTokens = cacheCreationTokens + cacheReadTokens;
            const cacheHitRate = totalCacheTokens > 0 
                ? (cacheReadTokens / totalCacheTokens * 100).toFixed(1) 
                : '0';
            
            logInfo(`[Cache] Turn ${turnNumber} | ` +
                `Input: ${inputTokens} | ` +
                `Cache Write: ${cacheCreationTokens} | ` +
                `Cache Read: ${cacheReadTokens} | ` +
                `Output: ${outputTokens} | ` +
                `Hit Rate: ${cacheHitRate}% | ` +
                `Savings: $${savings.toFixed(4)} (${savingsPercent}%)`);
        } else {
            logDebug(`[Cache] Turn ${turnNumber} | No cache metadata in response`);
        }
    } catch (error) {
        logDebug(`[Cache] Failed to log cache usage: ${error}`);
    }
}

// Re-export canonicalize for use in chat-history-manager
export { canonicalize };
