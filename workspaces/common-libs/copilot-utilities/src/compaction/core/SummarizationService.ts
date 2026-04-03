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

import { SummarizationCallback } from '../types';
import { SUMMARIZATION_PROMPT } from '../prompts/summarizationPrompt';
import { prepareMessagesForSummarization } from '../utils/messagePreparation';

/**
 * Handles the LLM summarization call via a provider-agnostic callback.
 *
 * Responsibilities:
 * - Prepares messages (strips system messages, converts tool messages)
 * - Builds the system prompt (base + custom instructions + optional token budget)
 * - Invokes the summarization callback
 * - Parses the <summary>...</summary> block from the response
 */
export class SummarizationService {
    constructor(private summarizationCallback: SummarizationCallback) {}

    /**
     * Summarize a conversation history.
     *
     * @param messages - Full conversation history
     * @param customInstructions - Optional user-provided or mid-stream instructions
     * @param abortSignal - Propagated abort signal
     * @param targetTokenBudget - On retry, instructs LLM to produce a shorter summary
     * @returns Extracted summary text (content between <summary>...</summary> tags)
     */
    async summarize(
        messages: any[],
        customInstructions?: string,
        abortSignal?: AbortSignal,
        targetTokenBudget?: number
    ): Promise<string> {
        const preparedMessages = prepareMessagesForSummarization(messages);

        // The Anthropic API expects alternate user/assistant messages generally, but 
        // to reliably break out of a coding/tooling mindset into compaction, we MUST 
        // append this terminal command explicitly, even if the last message was a user message.
        preparedMessages.push({
            role: 'user',
            content: [
                '--- END OF CONVERSATION TO SUMMARIZE ---',
                '',
                'STOP. Do NOT continue the task above.',
                'You are now in SUMMARIZATION MODE.',
                '',
                'Generate a structured summary of the conversation above.',
                'Your ENTIRE response MUST be wrapped in <summary>...</summary> tags.',
                'Do NOT output anything outside of those tags.',
                'Do NOT call any tools.',
                'Do NOT continue the coding task.',
                'Begin your response with <analysis> then end with <summary>...</summary>.',
            ].join('\n'),
        });

        // Build system prompt
        let systemPrompt = SUMMARIZATION_PROMPT;

        if (customInstructions) {
            systemPrompt += `\n\n## Additional Summarization Instructions from User\n\n${customInstructions}\n`;
        }

        // On retry, append a token budget constraint to guide concise output.
        // This avoids re-summarizing an already-compacted summary (quality degradation).
        if (targetTokenBudget) {
            systemPrompt +=
                `\n\n## Token Budget Constraint\n\nIMPORTANT: Your summary MUST be concise enough to fit within approximately ${targetTokenBudget} tokens. ` +
                `Focus only on the most critical information: active tasks, key decisions, recent code changes, and unresolved errors. ` +
                `Omit completed tasks, exploratory discussions, and intermediate steps that led to the final approach.\n`;
        }

        // Forward abortSignal so the LLM call can be cancelled
        const response = await this.summarizationCallback(preparedMessages, systemPrompt, abortSignal);

        // Debug: log the response so we can diagnose parsing failures
        console.log(`[SummarizationService] LLM response length: ${response?.length ?? 0} chars`);
        if (!response || response.trim().length === 0) {
            throw new Error('Summarization LLM returned an empty response');
        }

        // Parse <summary>...</summary> block — try multiple patterns
        const summaryMatch = response.match(/<summary>([\s\S]*?)<\/summary>/);
        if (summaryMatch) {
            const extractedSummary = summaryMatch[1].trim();
            console.log(`[SummarizationService] Successfully extracted summary (${extractedSummary.length} chars).`);
            return extractedSummary;
        }

        // Fallback: if the LLM returned substantive text but skipped the tags,
        // strip the <analysis>...</analysis> block (if present) and use the rest.
        // This prevents hard failure when the LLM produces a valid summary
        // but doesn't wrap it in <summary> tags.
        console.warn('[SummarizationService] No <summary> tags found in LLM response, using fallback extraction');
        const withoutAnalysis = response.replace(/<analysis>[\s\S]*?<\/analysis>/g, '').trim();
        if (withoutAnalysis.length > 50) {
            console.log(`[SummarizationService] Successfully extracted fallback summary (${withoutAnalysis.length} chars).`);
            return withoutAnalysis;
        }

        // Last resort: use the full response if it's substantive
        if (response.trim().length > 50) {
            return response.trim();
        }

        throw new Error(
            'Summarization LLM did not return a <summary>...</summary> block or sufficient fallback text. ' +
            `Total response length: ${response.length} chars.`
        );
    }
}
