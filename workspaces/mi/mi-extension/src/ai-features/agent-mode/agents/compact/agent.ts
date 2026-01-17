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

/**
 * Conversation Summarization Sub-Agent
 *
 * Specialized agent for compacting long conversation histories into concise summaries.
 * Uses Haiku 4.5 for cost-effective summarization while preserving key context.
 */

import { generateText } from 'ai';
import { ModelMessage } from 'ai';
import * as Handlebars from 'handlebars';
import { getAnthropicClient, ANTHROPIC_HAIKU_4_5 } from '../../../connection';
import { logInfo, logError, logDebug } from '../../../copilot/logger';
import { SUMMARIZATION_SYSTEM_PROMPT } from './system';
import { SUMMARIZATION_USER_PROMPT } from './prompt';

// ============================================================================
// Types
// ============================================================================

export interface SummarizationAgentRequest {
    /** Conversation history to summarize (including tool calls and results) */
    messages: ModelMessage[];
    /** Project path for context */
    projectPath: string;
}

export interface SummarizationAgentResult {
    /** Whether summarization was successful */
    success: boolean;
    /** The generated summary (Claude Code format) */
    summary?: string;
    /** Error message if failed */
    error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts ModelMessage array into a readable conversation transcript
 */
function formatConversationForSummarization(messages: ModelMessage[]): string {
    const parts: string[] = [];

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        if (msg.role === 'user') {
            parts.push(`\n[USER MESSAGE ${i + 1}]:`);
            parts.push(String(msg.content));
        } else if (msg.role === 'assistant') {
            parts.push(`\n[ASSISTANT MESSAGE ${i + 1}]:`);

            // Handle text content
            if (typeof msg.content === 'string') {
                parts.push(msg.content);
            }
            // Handle tool_calls (array of objects)
            else if (Array.isArray(msg.content)) {
                for (const part of msg.content) {
                    if (part.type === 'text') {
                        parts.push(part.text);
                    } else if (part.type === 'tool-call') {
                        parts.push(`\n[TOOL CALL: ${part.toolName}]`);
                        parts.push(`Input: ${JSON.stringify(part.input, null, 2)}`);
                    } else if (part.type === 'tool-result') {
                        parts.push(`\n[TOOL RESULT: ${part.toolName}]`);
                        parts.push(`Output: ${JSON.stringify(part.output, null, 2)}`);
                    }
                }
            }
        } else if (msg.role === 'system') {
            // Skip system messages as they're just prompts
            continue;
        }
    }

    return parts.join('\n');
}

// ============================================================================
// Summarization Sub-Agent
// ============================================================================

/**
 * Executes the summarization sub-agent to compact conversation history
 *
 * This agent:
 * 1. Formats conversation messages into readable transcript
 * 2. Sends to AI (Haiku 4.5) with summarization prompt
 * 3. Returns structured summary following Claude Code format
 *
 * @param request - The agent request parameters
 * @returns Result containing the summary or error
 */
export async function executeSummarizationAgent(
    request: SummarizationAgentRequest
): Promise<SummarizationAgentResult> {
    try {
        logInfo(`[SummarizationAgent] Summarizing ${request.messages.length} messages`);

        // 1. Format conversation
        const conversationText = formatConversationForSummarization(request.messages);
        const charCount = conversationText.length;
        logDebug(`[SummarizationAgent] Formatted conversation: ${charCount} characters`);

        if (charCount === 0) {
            return {
                success: false,
                error: 'No conversation content to summarize'
            };
        }

        // 2. Build prompt using Handlebars template
        const template = Handlebars.compile(SUMMARIZATION_USER_PROMPT);
        const userPrompt = template({
            conversation: conversationText
        });

        // 3. Call AI
        logInfo(`[SummarizationAgent] Calling Haiku for summarization...`);
        const model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);
        const { text } = await generateText({
            model,
            system: SUMMARIZATION_SYSTEM_PROMPT,
            prompt: userPrompt,
            maxOutputTokens: 16000,
            temperature: 0.3, // Slightly higher for natural language
            maxRetries: 0, // Disable retries on quota errors (429)
        });

        logDebug(`[SummarizationAgent] Summary generated: ${text.length} characters`);

        if (!text?.trim()) {
            throw new Error('AI did not return a summary');
        }

        logInfo(`[SummarizationAgent] Successfully summarized conversation`);

        return {
            success: true,
            summary: text.trim()
        };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logError(`[SummarizationAgent] Error: ${errorMsg}`, error);
        return {
            success: false,
            error: errorMsg,
        };
    }
}
