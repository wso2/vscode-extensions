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

import * as crypto from 'crypto';
import { TokenCountCallback, TokenEstimationContext } from '../types';

interface CachedEntry {
    tokenCount: number;
    contentHash: string;
}

/**
 * Hybrid token estimator that uses actual SDK usage data when available
 * and falls back to a callback-based estimation.
 *
 * Strategy:
 * 1. After each streamText step, call updateContext() with actual inputTokens
 * 2. estimateTokens() returns the actual count directly (most accurate)
 * 3. When no actual data is available, falls back to tokenCountCallback + SHA-256 cache
 */
export class TokenEstimator {
    private cache: Map<string, CachedEntry> = new Map();
    private lastContext: TokenEstimationContext | null = null;

    constructor(private tokenCountCallback: TokenCountCallback) {}

    /**
     * Update estimation context with actual usage data from streamText.
     * Call this after each step completes.
     */
    updateContext(context: TokenEstimationContext): void {
        this.lastContext = context;
    }

    /**
     * Estimate total token count for message history.
     *
     * Uses hybrid approach:
     * - If actual inputTokens are available, returns them directly (already includes
     *   system prompt + tool definitions + messages)
     * - Otherwise, estimates via callback and adds system/tool overheads
     */
    async estimateTokens(messages: any[]): Promise<number> {
        // Estimate using callback (with SHA-256 caching for speed)
        const messageTokens = await this.estimateMessageTokens(messages);

        const systemTokens = this.lastContext?.systemPromptTokenEstimate ?? 0;
        const toolTokens = this.lastContext?.toolDefinitionsTokenEstimate ?? 0;

        return messageTokens + systemTokens + toolTokens;
    }

    /**
     * Estimate tokens for messages only (no system/tool overhead).
     * Uses SHA-256 cache to avoid redundant callback calls.
     */
    private async estimateMessageTokens(messages: any[]): Promise<number> {
        // Fast path for empty arrays
        if (messages.length === 0) {
            return 0;
        }

        const compositeHash = this.hashContent(messages);
        const cached = this.cache.get(compositeHash);
        
        if (cached !== undefined && cached.contentHash === compositeHash) {
            return cached.tokenCount;
        }

        const totalTokens = await this.tokenCountCallback(messages);

        // Cache the entire subset estimate with its exact composite hash
        this.cache.set(compositeHash, {
            tokenCount: totalTokens,
            contentHash: compositeHash,
        });

        return totalTokens;
    }

    /**
     * Clear cache. Call this after compaction so stale entries don't persist.
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * SHA-256 hash for cache keying — avoids collisions from simple string hashing.
     */
    private hashContent(message: any): string {
        const str = JSON.stringify(message);
        return crypto.createHash('sha256').update(str).digest('hex');
    }
}
