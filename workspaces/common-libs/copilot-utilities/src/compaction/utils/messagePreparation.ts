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
 * Prepares messages for summarization by:
 * - Stripping system messages (C06: prevents system prompt conflicts)
 * - Converting tool messages to readable text (C05)
 * - Replacing image/document blocks with placeholders
 * - Stripping thinking blocks
 * - Converting tool-call/tool-result content blocks to text
 *
 * @param messages - Raw conversation messages from AI SDK
 * @returns Cleaned messages safe for the summarization LLM
 */
export function prepareMessagesForSummarization(messages: any[]): any[] {
    return messages
        .filter((msg: any) => msg.role !== 'system') // C06: Strip system prompts
        .map((msg: any) => {
            // Convert tool messages (role: 'tool') to user messages with text
            if (msg.role === 'tool') {
                return convertToolMessageToText(msg);
            }

            // Handle string content directly
            if (typeof msg.content === 'string') {
                return msg;
            }

            // Not an array — pass through unchanged
            if (!Array.isArray(msg.content)) {
                return msg;
            }

            // Process content blocks array
            const filteredContent = msg.content
                .filter((block: any) => block != null && block.type !== 'thinking') // Strip thinking blocks and nulls
                .map((block: any) => {
                    // Inline tool-call blocks in assistant messages
                    if (block.type === 'tool-call') {
                        const argsStr = block.args != null ? JSON.stringify(block.args) : '';
                        return {
                            type: 'text',
                            text: `[Tool Call: ${block.toolName || 'unknown'} with args ${argsStr.substring(0, 100)}...]`,
                        };
                    }
                    // Inline tool-result blocks with "middle-out" truncation
                    if (block.type === 'tool-result') {
                        const resultStr = block.result != null ? JSON.stringify(block.result) : '';
                        let truncated = resultStr;
                        if (resultStr.length > 500) {
                            truncated = resultStr.substring(0, 200) + 
                                        '\n\n...[omitted]...\n\n' + 
                                        resultStr.substring(resultStr.length - 300);
                        }
                        return {
                            type: 'text',
                            text: `[Tool Result: ${truncated}]`,
                        };
                    }
                    // Replace images with placeholder
                    if (block.type === 'image') {
                        return { type: 'text', text: '[image]' };
                    }
                    // Replace documents with placeholder
                    if (block.type === 'document') {
                        return { type: 'text', text: '[document]' };
                    }
                    return block;
                });

            if (filteredContent.length === 0) {
                return null;
            }

            return { ...msg, content: filteredContent };
        })
        .filter((msg: any) => msg !== null);
}

/**
 * Converts a tool-role message into a user-role message with a text description.
 * This is needed because summarization LLMs expect only user/assistant roles.
 */
function convertToolMessageToText(toolMsg: any): any {
    const content = Array.isArray(toolMsg.content) ? toolMsg.content : [toolMsg.content];
    const textDescriptions = content
        .filter((item: any) => item != null)
        .map((item: any) => {
            if (item.type === 'tool-result') {
                const resultStr = item.result != null ? JSON.stringify(item.result) : '';
                let truncated = resultStr;
                if (resultStr.length > 1000) {
                    truncated = resultStr.substring(0, 400) + 
                                '\n\n...[omitted]...\n\n' + 
                                resultStr.substring(resultStr.length - 600);
                }
                return `[Tool: ${item.toolName || 'unknown'} returned: ${truncated}]`;
            }
            const itemStr = JSON.stringify(item) || '';
            return itemStr.substring(0, 200);
        })
        .join('\n');

    return {
        role: 'user',
        content: textDescriptions,
    };
}
