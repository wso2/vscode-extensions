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

/**
 * Token counting callback - provided by the integrating copilot.
 * Can be sync (char estimation) or async (API call).
 */
export type TokenCountCallback = (messages: any[]) => Promise<number> | number;

/**
 * LLM summarization callback - provided by integrating copilot.
 * @param messages - Conversation history to summarize (system messages stripped)
 * @param systemPrompt - System prompt with summarization instructions
 * @param abortSignal - Optional signal to cancel the LLM call
 */
export type SummarizationCallback = (
    messages: any[],
    systemPrompt: string,
    abortSignal?: AbortSignal
) => Promise<string>;

/**
 * Context information for accurate token estimation.
 */
export interface TokenEstimationContext {
    /** From last streamText usage.inputTokens — most accurate, already includes system + tools */
    lastActualInputTokens?: number;
    /** Estimated tokens for the system prompt */
    systemPromptTokenEstimate?: number;
    /** Estimated tokens for tool definitions */
    toolDefinitionsTokenEstimate?: number;
}

/**
 * Model configuration controlling context window and output limits.
 * CRITICAL: maxOutputTokens MUST match the value in AgentExecutor.ts streamText call.
 */
export interface ModelConfig {
    /** Total context window size in tokens (e.g. 200_000 for Claude) */
    maxContextWindow: number;
    /** Maximum output tokens — MUST match AgentExecutor.ts streamText maxOutputTokens */
    maxOutputTokens: number;
    /** Safety buffer below effective context limit (default: 13_000) */
    autoCompactBuffer: number;
}

/**
 * Project state context to preserve after compaction (C09 fix).
 */
export interface ProjectStateContext {
    /** List of files that have been modified */
    modifiedFiles?: string[];
    /** Temporary project path for agent */
    tempProjectPath?: string;
    /** Files pending review */
    pendingReviewFiles?: string[];
    /** Current working directory */
    workingDirectory?: string;
}

/**
 * Compaction metadata for audit trail (C15 fix).
 */
export interface CompactionMetadata {
    /** Unix timestamp when compaction occurred */
    compactedAt: number;
    /** Message count before compaction */
    originalMessageCount: number;
    /** Token estimate before compaction */
    originalTokenEstimate: number;
    /** Token estimate after compaction */
    compactedTokenEstimate: number;
    /** Number of retry attempts used */
    retries: number;
    /** Whether triggered automatically or manually */
    mode: 'auto' | 'manual';
    /** Custom instructions provided by user (if any) */
    userInstructions?: string;
    /** Path to pre-compaction backup file */
    backupPath?: string;
    /** IDs of generations that were compacted */
    compactedGenerationIds?: string[];
}

/**
 * Options for a compaction operation.
 */
export interface CompactionOptions {
    /** Whether this is an auto-triggered or manually requested compaction */
    mode: 'auto' | 'manual';
    /** Optional user-provided instructions to guide summarization */
    customInstructions?: string;
    /** Maximum retry attempts if compacted output is still too large (default: 3) */
    maxRetries?: number;
    /** Project state to include in continuation messages */
    projectState?: ProjectStateContext;
    /** AbortSignal to cancel the summarization LLM call */
    abortSignal?: AbortSignal;
}

/**
 * Result of a compaction operation.
 */
export interface CompactionResult {
    /** Whether compaction succeeded */
    success: boolean;
    /** Token count before compaction */
    originalTokens: number;
    /** Token count after compaction */
    compactedTokens: number;
    /** Percentage of tokens reduced */
    reductionPercentage: number;
    /** Replacement message array to use in place of the original history */
    compactedMessages: any[];
    /** The extracted summary text */
    summary: string;
    /** Number of retry attempts used */
    retriesUsed: number;
    /** Compaction audit metadata */
    metadata?: CompactionMetadata;
}

/**
 * Configuration for CompactionEngine.
 */
export interface CompactionEngineConfig {
    /** Model configuration (context window, output limits, buffer) */
    modelConfig: ModelConfig;
    /** Token counting callback (provider-agnostic) */
    tokenCountCallback: TokenCountCallback;
    /** Optional — set via setSummarizationCallback() to defer model binding */
    summarizationCallback?: SummarizationCallback;
}
