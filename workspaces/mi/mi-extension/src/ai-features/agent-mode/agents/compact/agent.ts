/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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
 * Conversation Compaction Agent
 *
 * Sends the FULL conversation history (system prompt + messages) to Haiku
 * with a <system-reminder> appended asking it to summarize.
 *
 * Tool-call and tool-result messages are converted to text representations
 * since the Anthropic API requires tool definitions for native tool blocks,
 * and we don't want to pass all 20+ tool schemas to the compact model.
 *
 * Two trigger modes:
 * - User-triggered (/compact): Summarize and save to JSONL. That's it.
 * - Auto-triggered (context limit): Summarize, save, then caller triggers new agent run.
 */

import { generateText, wrapLanguageModel } from 'ai';
import { getAnthropicClient, ANTHROPIC_HAIKU_4_5 } from '../../../connection';
import { logInfo, logError, logDebug } from '../../../copilot/logger';
import { getSystemPrompt } from '../main/system';
import {
    COMPACT_SYSTEM_REMINDER_USER_TRIGGERED,
    COMPACT_SYSTEM_REMINDER_AUTO_TRIGGERED,
} from './prompt';
import { createCompactAgentTools } from './tools';

// ============================================================================
// Dev Feature Flags
// ============================================================================
const ENABLE_DEVTOOLS = false; // Set to true to enable AI SDK DevTools (local development only!)

// ============================================================================
// Types
// ============================================================================

export interface CompactAgentRequest {
    /** Raw messages from chatHistoryManager.getMessages() (JSONL entries with role-based structure) */
    messages: any[];
    /** How the compact was triggered */
    trigger: 'user' | 'auto';
    projectPath: string;
}

export interface CompactAgentResult {
    success: boolean;
    /** The generated summary */
    summary?: string;
    error?: string;
}

// ============================================================================
// Message Conversion
// ============================================================================

/**
 * Converts ModelMessages (with native tool-call/tool-result blocks) into
 * plain text user/assistant messages that Haiku can process without tool definitions.
 *
 * Conversion rules:
 * - system messages: kept as-is
 * - user messages: kept as-is (text content extracted)
 * - assistant messages with tool-call parts: tool calls converted to [Tool Call: name] text
 * - tool role messages (tool results): converted to user messages with [Tool Result: name] text
 * - compact_summary entries (JSONL markers): converted to user message with summary text
 *
 * Consecutive messages of the same role are merged (Anthropic requires alternating roles).
 */
function convertMessagesForCompact(messages: any[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    const rawMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
        // Handle JSONL compact_summary entries (not role-based messages)
        if (msg.type === 'compact_summary') {
            rawMessages.push({
                role: 'user',
                content: `[Previous Conversation Summary]\n${msg.summary}`,
            });
            continue;
        }

        // Skip session markers
        if (msg.type === 'session_start' || msg.type === 'session_end') {
            continue;
        }

        // Skip synthetic compact messages (they duplicate the compact_summary entry)
        if (msg._compactSynthetic) {
            continue;
        }

        switch (msg.role) {
            case 'user': {
                const parts: string[] = [];

                if (typeof msg.content === 'string') {
                    parts.push(msg.content);
                } else if (Array.isArray(msg.content)) {
                    let fileCount = 0;
                    let imageCount = 0;

                    for (const p of msg.content) {
                        if (p.type === 'text' && p.text?.trim()) {
                            parts.push(p.text);
                        } else if (p.type === 'file') {
                            fileCount++;
                        } else if (p.type === 'image') {
                            imageCount++;
                        }
                    }

                    if (fileCount > 0) {
                        parts.push(`[Attached files: ${fileCount}]`);
                    }
                    if (imageCount > 0) {
                        parts.push(`[Attached images: ${imageCount}]`);
                    }
                }

                // Include saved attachment names when available
                const attachmentMetadata = msg._attachmentMetadata;
                if (attachmentMetadata?.files?.length) {
                    parts.push(`[Attached file names: ${attachmentMetadata.files.map((f: any) => f.name).join(', ')}]`);
                }
                if (attachmentMetadata?.images?.length) {
                    parts.push(`[Attached image names: ${attachmentMetadata.images.map((i: any) => i.imageName).join(', ')}]`);
                }

                const text = parts.join('\n');
                if (text.trim()) {
                    rawMessages.push({ role: 'user', content: text });
                }
                break;
            }

            case 'assistant': {
                const parts: string[] = [];
                if (typeof msg.content === 'string') {
                    parts.push(msg.content);
                } else if (Array.isArray(msg.content)) {
                    for (const p of msg.content) {
                        if (p.type === 'text' && p.text?.trim()) {
                            parts.push(p.text);
                        } else if (p.type === 'reasoning' && p.text?.trim()) {
                            const reasoningText = p.text.trim();
                            const compactReasoning = reasoningText.length > 1200
                                ? `${reasoningText.substring(0, 1200)}... [truncated]`
                                : reasoningText;
                            parts.push(`[Assistant Thinking]\n${compactReasoning}`);
                        } else if (p.type === 'tool-call') {
                            parts.push(`[Tool Call: ${p.toolName}]`);
                            // Include a compact representation of the input
                            const inputStr = JSON.stringify(p.args || p.input, null, 2);
                            // Truncate very large tool inputs (e.g. file_write with full content)
                            if (inputStr.length > 2000) {
                                parts.push(`Input: ${inputStr.substring(0, 2000)}... [truncated]`);
                            } else {
                                parts.push(`Input: ${inputStr}`);
                            }
                        }
                    }
                }
                const text = parts.join('\n');
                if (text.trim()) {
                    rawMessages.push({ role: 'assistant', content: text });
                }
                break;
            }

            case 'tool': {
                // Tool results → convert to user message (since tool role requires tool definitions)
                const parts: string[] = [];
                if (Array.isArray(msg.content)) {
                    for (const p of msg.content) {
                        if (p.type === 'tool-result') {
                            parts.push(`[Tool Result: ${p.toolName}]`);
                            const outputStr = JSON.stringify(p.result || p.output, null, 2);
                            if (outputStr.length > 2000) {
                                parts.push(`Output: ${outputStr.substring(0, 2000)}... [truncated]`);
                            } else {
                                parts.push(`Output: ${outputStr}`);
                            }
                        }
                    }
                }
                const text = parts.join('\n');
                if (text.trim()) {
                    rawMessages.push({ role: 'user', content: text });
                }
                break;
            }

            // Skip system messages (we add the system prompt separately)
            case 'system':
                break;
        }
    }

    // Merge consecutive messages of the same role (Anthropic requires alternating)
    return mergeConsecutiveMessages(rawMessages);
}

/**
 * Merges consecutive messages with the same role into a single message.
 * This is needed because converting tool results to user messages can
 * create consecutive user messages.
 */
function mergeConsecutiveMessages(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
    if (messages.length === 0) return [];

    const merged: Array<{ role: 'user' | 'assistant'; content: string }> = [{ ...messages[0] }];

    for (let i = 1; i < messages.length; i++) {
        const prev = merged[merged.length - 1];
        const curr = messages[i];

        if (prev.role === curr.role) {
            prev.content += '\n\n' + curr.content;
        } else {
            merged.push({ ...curr });
        }
    }

    return merged;
}

// ============================================================================
// Compact Agent
// ============================================================================

/**
 * Executes the compact agent.
 *
 * Sends the main agent's system prompt + the full conversation (with tool
 * messages converted to text) + a system-reminder to Haiku for summarization.
 */
export async function executeCompactAgent(
    request: CompactAgentRequest
): Promise<CompactAgentResult> {
    try {
        logInfo(`[CompactAgent] Starting compaction (trigger: ${request.trigger}, messages: ${request.messages.length})`);

        // 1. Get the main agent's system prompt (same one the agent uses)
        const systemPrompt = getSystemPrompt();

        // 2. Convert messages to text-based format (no tool blocks)
        const textMessages = convertMessagesForCompact(request.messages);

        if (textMessages.length === 0) {
            return { success: false, error: 'No conversation content to compact' };
        }

        logDebug(`[CompactAgent] Converted to ${textMessages.length} text messages`);

        // 3. Pick the system-reminder based on trigger type
        const systemReminder = request.trigger === 'user'
            ? COMPACT_SYSTEM_REMINDER_USER_TRIGGERED
            : COMPACT_SYSTEM_REMINDER_AUTO_TRIGGERED;

        // 4. Append the system-reminder as a final user message
        //    This tells Haiku to summarize instead of continuing the conversation.
        const allMessages = [
            ...textMessages,
            { role: 'user' as const, content: systemReminder },
        ];

        // 5. Create tools object (provides context about tool schemas for better summarization)
        // All execute functions are blocked with system reminder messages
        const tools = createCompactAgentTools();

        // 6. Call Haiku with the full conversation
        logInfo('[CompactAgent] Calling Haiku for summarization...');
        let model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);

        if (ENABLE_DEVTOOLS) {
            const originalCwd = process.cwd();
            process.chdir(request.projectPath);
            const { devToolsMiddleware } = await import('@ai-sdk/devtools');
            model = wrapLanguageModel({
                model,
                // Cast to any to handle potential version mismatch between AI SDK and DevTools
                middleware: devToolsMiddleware() as any,
            });
            process.chdir(originalCwd);  // Restore immediately after middleware creation
        }

        const { text, usage } = await generateText({
            model,
            system: systemPrompt,
            messages: allMessages,
            tools, // Provide tool definitions for context (won't be executed)
            maxOutputTokens: 16000,
            temperature: 0,
            maxRetries: 3,
        });

        logInfo(`[CompactAgent] Summary generated: ${text.length} chars, ` +
            `input: ${usage?.inputTokens || 0}, output: ${usage?.outputTokens || 0}`);

        // Extract the summary from the text
        const summary = text.match(/<summary>(.*?)<\/summary>/s)?.[1]?.trim() || text.trim();

        if (!summary) {
            return { success: false, error: 'Haiku did not return a summary' };
        }

        return { 
            success: true,
            summary: `This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation. \n ${summary}` 
        };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logError(`[CompactAgent] Error: ${errorMsg}`, error);
        return { success: false, error: errorMsg };
    }
}
