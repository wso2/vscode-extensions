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

export { SUMMARIZATION_PROMPT } from './summarizationPrompt';
export type { ContextManagementConfig, AppliedCompactionResult } from './types';
export {
    DEFAULT_COMPACT_TRIGGER,
    DEFAULT_CLEAR_TOOL_USES_TRIGGER,
    DEFAULT_KEEP_RECENT_TOOL_USES,
} from './defaults';

/** Sentinel prefix emitted by Anthropic at the start of a compaction block. */
export const COMPACTION_BLOCK_PREFIX = '<analysis>';

import { ContextManagementConfig, AppliedCompactionResult } from './types';
import {
    DEFAULT_COMPACT_TRIGGER,
    DEFAULT_CLEAR_TOOL_USES_TRIGGER,
    DEFAULT_KEEP_RECENT_TOOL_USES,
} from './defaults';
import { SUMMARIZATION_PROMPT } from './summarizationPrompt';

// Internal types matching @ai-sdk/anthropic contextManagement schema
interface ClearToolUsesEdit {
    type: 'clear_tool_uses_20250919';
    trigger?: { type: 'input_tokens'; value: number };
    keep?: { type: 'tool_uses'; value: number };
}

interface CompactEdit {
    type: 'compact_20260112';
    trigger?: { type: 'input_tokens'; value: number };
    instructions?: string;
}

type ContextManagementEdit = ClearToolUsesEdit | CompactEdit;

interface AnthropicContextManagementOptions {
    anthropic: {
        contextManagement: {
            edits: ContextManagementEdit[];
        };
    };
}

/**
 * Builds the providerOptions.anthropic.contextManagement config for streamText.
 *
 * Returns null when:
 * - estimatedFloorTokens >= compactTriggerTokens (codebase too large; compaction
 *   would fire on every turn against an empty history, producing no benefit)
 *
 * The caller is responsible for checking whether the current login provider
 * supports contextManagement (ANTHROPIC_KEY only for now) and passing null
 * to providerOptions for unsupported providers.
 */
export function buildContextManagementOptions(
    config: ContextManagementConfig = {}
): AnthropicContextManagementOptions | null {
    const compactTrigger = config.compactTriggerTokens ?? DEFAULT_COMPACT_TRIGGER;
    const clearTrigger = config.clearToolUsesTriggerTokens ?? DEFAULT_CLEAR_TOOL_USES_TRIGGER;
    const keepToolUses = config.keepRecentToolUses ?? DEFAULT_KEEP_RECENT_TOOL_USES;
    const instructions = config.compactionInstructions ?? SUMMARIZATION_PROMPT;

    // Disable compaction if static overhead alone exceeds the trigger
    if (config.estimatedFloorTokens !== undefined && config.estimatedFloorTokens >= compactTrigger) {
        return null;
    }

    const edits: ContextManagementEdit[] = [
        {
            type: 'clear_tool_uses_20250919',
            trigger: { type: 'input_tokens', value: clearTrigger },
            keep: { type: 'tool_uses', value: keepToolUses },
        },
        {
            type: 'compact_20260112',
            trigger: { type: 'input_tokens', value: compactTrigger },
            instructions,
        },
    ];

    return { anthropic: { contextManagement: { edits } } };
}

/**
 * Parses step.providerMetadata to detect whether the server applied any
 * context management edits during the step.
 *
 * Used as a fallback to detect clear_tool_uses events (which have no mid-stream
 * signal) and as a secondary check for compact_20260112.
 */
export function detectAppliedCompaction(providerMetadata: unknown): AppliedCompactionResult | null {
    const meta = providerMetadata as any;
    const appliedEdits: any[] = meta?.anthropic?.contextManagement?.appliedEdits;
    if (!Array.isArray(appliedEdits) || appliedEdits.length === 0) {
        return null;
    }

    let compacted = false;
    let clearedToolUses: number | undefined;
    let clearedInputTokens = 0;

    for (const edit of appliedEdits) {
        if (edit.type === 'compact_20260112') {
            compacted = true;
        } else if (edit.type === 'clear_tool_uses_20250919') {
            clearedToolUses = (clearedToolUses ?? 0) + (edit.clearedToolUses ?? 0);
            clearedInputTokens += edit.clearedInputTokens ?? 0;
        }
    }

    return {
        compacted,
        clearedToolUses,
        clearedInputTokens: clearedInputTokens > 0 ? clearedInputTokens : undefined,
    };
}

/**
 * Estimates the token floor (system prompt + user message overhead) using a
 * characters-per-4-tokens heuristic. Used to decide whether compaction is viable.
 */
export function estimateFloorTokens(systemPrompt: string, userMessageText: string): number {
    return Math.ceil((systemPrompt.length + userMessageText.length) / 4);
}

/**
 * Extracts the <summary>...</summary> block from a raw compaction response.
 * Returns null if no summary tag is found.
 */
export function extractCompactionSummary(rawContent: string): string | null {
    const match = rawContent.match(/<summary>([\s\S]*?)<\/summary>/);
    return match ? match[1].trim() : null;
}

/**
 * Builds providerOptions for Amazon Bedrock's context management API.
 *
 * Bedrock does not use providerOptions.anthropic — it reads providerOptions.bedrock
 * and passes context_management via additionalModelRequestFields. The beta header
 * is sent via the anthropicBeta array.
 *
 * Returns null under the same conditions as buildContextManagementOptions (floor >= trigger).
 */
export function buildBedrockContextManagementOptions(
    config: ContextManagementConfig = {}
): { bedrock: { anthropicBeta: string[]; additionalModelRequestFields: Record<string, unknown> } } | null {
    const compactTrigger = config.compactTriggerTokens ?? DEFAULT_COMPACT_TRIGGER;
    const clearTrigger = config.clearToolUsesTriggerTokens ?? DEFAULT_CLEAR_TOOL_USES_TRIGGER;
    const keepToolUses = config.keepRecentToolUses ?? DEFAULT_KEEP_RECENT_TOOL_USES;
    const instructions = config.compactionInstructions ?? SUMMARIZATION_PROMPT;

    if (config.estimatedFloorTokens !== undefined && config.estimatedFloorTokens >= compactTrigger) {
        return null;
    }

    return {
        bedrock: {
            anthropicBeta: ['compact-2026-01-12'],
            additionalModelRequestFields: {
                context_management: {
                    edits: [
                        {
                            type: 'clear_tool_uses_20250919',
                            trigger: { type: 'input_tokens', value: clearTrigger },
                            keep: { type: 'tool_uses', value: keepToolUses },
                        },
                        {
                            type: 'compact_20260112',
                            trigger: { type: 'input_tokens', value: compactTrigger },
                            instructions,
                        },
                    ],
                },
            },
        },
    };
}

/**
 * Strips <analysis>...</analysis> blocks from compaction text in model messages.
 * Called in prepareStep to avoid re-sending verbose reasoning tokens on every
 * subsequent turn after compaction.
 */
export function stripAnalysisFromCompactionBlocks(messages: any[]): void {
    for (const msg of messages) {
        if (msg.role !== 'assistant') continue;
        const content = msg.content;
        if (typeof content === 'string' && content.includes('<analysis>')) {
            msg.content = content.replace(/<analysis>[\s\S]*?<\/analysis>\s*/g, '');
        } else if (Array.isArray(content)) {
            for (const part of content) {
                if (part.type === 'text' && typeof part.text === 'string' && part.text.includes('<analysis>')) {
                    part.text = part.text.replace(/<analysis>[\s\S]*?<\/analysis>\s*/g, '');
                }
            }
        }
    }
}
