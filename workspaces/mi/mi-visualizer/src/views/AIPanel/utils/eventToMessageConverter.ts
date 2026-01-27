/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { ChatMessage, Role, MessageType, AgentEvent, ChatHistoryEvent, TodoItem } from "@wso2/mi-core";
import { generateId } from "../utils";

// Tool name constant for todo_write tool
const TODO_WRITE_TOOL_NAME = 'todo_write';

/**
 * Calculate overall status from todo items
 */
function calculateTodoStatus(todos: TodoItem[]): 'active' | 'completed' | 'pending' {
    if (todos.some(t => t.status === 'in_progress')) {
        return 'active';
    }
    if (todos.every(t => t.status === 'completed')) {
        return 'completed';
    }
    return 'pending';
}

/**
 * Convert agent events (streaming or history) to UI messages
 * Handles chronological ordering of text and tool calls
 *
 * @param events - Array of AgentEvent or ChatHistoryEvent objects
 * @returns Array of ChatMessage objects with inline <toolcall> tags
 */
export function convertEventsToMessages(
    events: Array<AgentEvent | ChatHistoryEvent>
): ChatMessage[] {
    const messages: ChatMessage[] = [];
    let currentUserMessage: ChatMessage | null = null;
    let currentAssistantMessage: ChatMessage | null = null;
    let pendingToolCall: {
        toolName: string;
        toolInput: unknown;
        filePath: string;
    } | null = null;

    for (const event of events) {
        switch (event.type) {
            case 'user':
                // Flush any pending assistant message
                if (currentAssistantMessage) {
                    messages.push(currentAssistantMessage);
                    currentAssistantMessage = null;
                }

                // Create new user message
                currentUserMessage = {
                    id: generateId(),
                    role: Role.MIUser,
                    content: event.content || '',
                    type: MessageType.UserMessage
                };
                messages.push(currentUserMessage);
                currentUserMessage = null;
                break;

            case 'assistant':
            case 'content_block':
                // Create or append to assistant message
                if (!currentAssistantMessage) {
                    currentAssistantMessage = {
                        id: generateId(),
                        role: Role.MICopilot,
                        content: event.content || '',
                        type: MessageType.AssistantMessage
                    };
                } else {
                    currentAssistantMessage.content += event.content || '';
                }
                break;

            case 'tool_call':
                // Handle todo_write tool calls - generate inline todolist tag
                if (event.toolName === TODO_WRITE_TOOL_NAME) {
                    const todoInput = event.toolInput as { todos?: TodoItem[] };
                    if (todoInput?.todos && todoInput.todos.length > 0) {
                        // Calculate status and generate todolist tag
                        const status = calculateTodoStatus(todoInput.todos);
                        const todoData = {
                            status,
                            items: todoInput.todos
                        };
                        const todoTag = `\n\n<todolist>${JSON.stringify(todoData)}</todolist>`;

                        // Ensure assistant message exists
                        if (!currentAssistantMessage) {
                            currentAssistantMessage = {
                                id: generateId(),
                                role: Role.MICopilot,
                                content: '',
                                type: MessageType.AssistantMessage
                            };
                        }

                        // Check if message already has a todolist tag and replace it
                        const todolistRegex = /<todolist>[\s\S]*?<\/todolist>/;
                        if (todolistRegex.test(currentAssistantMessage.content)) {
                            currentAssistantMessage.content = currentAssistantMessage.content.replace(todolistRegex, todoTag.trim());
                        } else {
                            currentAssistantMessage.content += todoTag;
                        }
                    }
                    continue;
                }


                // Extract file path for display
                const toolInput = event.toolInput as any;
                const filePath = toolInput?.file_path || toolInput?.file_paths?.[0] || '';

                // Store pending tool call info
                pendingToolCall = {
                    toolName: event.toolName || '',
                    toolInput: event.toolInput,
                    filePath
                };

                // Get loading action from event (for live streaming) or create generic message
                const loadingAction = 'loadingAction' in event ? event.loadingAction : undefined;
                const loadingMessage = loadingAction
                    ? `${loadingAction.charAt(0).toUpperCase() + loadingAction.slice(1)} ${filePath}...`
                    : `Using ${event.toolName}${filePath ? `: ${filePath}` : ''}...`;

                // Ensure assistant message exists
                if (!currentAssistantMessage) {
                    currentAssistantMessage = {
                        id: generateId(),
                        role: Role.MICopilot,
                        content: '',
                        type: MessageType.AssistantMessage
                    };
                }

                // Insert loading tool call tag (with data-loading attribute for replacement)
                currentAssistantMessage.content += `\n\n<toolcall data-loading="true" data-file="${filePath}">${loadingMessage}</toolcall>`;
                break;

            case 'tool_result':
                // Skip todo_write tool results (handled by inline todo list in tool_call)
                if ('toolName' in event && event.toolName === TODO_WRITE_TOOL_NAME) {
                    continue;
                }

                if (pendingToolCall && currentAssistantMessage) {
                    // Get action from event (backend provides this)
                    const action = 'action' in event ? event.action : undefined;
                    const completedAction = 'completedAction' in event ? event.completedAction : undefined;
                    const finalAction = action || completedAction || 'Executed';

                    const capitalizedAction = finalAction.charAt(0).toUpperCase() + finalAction.slice(1);

                    // Create completed message
                    const completedMessage = pendingToolCall.filePath
                        ? `<toolcall>${capitalizedAction} ${pendingToolCall.filePath}</toolcall>`
                        : `<toolcall>${capitalizedAction}</toolcall>`;

                    // Find and replace the loading toolcall tag
                    const toolPattern = /<toolcall data-loading="true" data-file="([^"]*)">([^<]*?)<\/toolcall>/g;
                    const matches = [...currentAssistantMessage.content.matchAll(toolPattern)];

                    if (matches.length > 0) {
                        // Replace the last matching tool call (most recent)
                        const lastMatch = matches[matches.length - 1];
                        const fullMatch = lastMatch[0];
                        const lastIndex = currentAssistantMessage.content.lastIndexOf(fullMatch);

                        currentAssistantMessage.content =
                            currentAssistantMessage.content.substring(0, lastIndex) +
                            completedMessage +
                            currentAssistantMessage.content.substring(lastIndex + fullMatch.length);
                    }

                    pendingToolCall = null;
                }
                break;

            case 'stop':
                // End of assistant message - flush it
                if (currentAssistantMessage) {
                    messages.push(currentAssistantMessage);
                    currentAssistantMessage = null;
                }
                break;

            case 'error':
            case 'abort':
                // Flush any current message and add error
                if (currentAssistantMessage) {
                    messages.push(currentAssistantMessage);
                    currentAssistantMessage = null;
                }
                if (event.type === 'error' && event.error) {
                    messages.push({
                        id: generateId(),
                        role: Role.MICopilot,
                        content: `Error: ${event.error}`,
                        type: MessageType.Error
                    });
                }
                break;

            default:
                break;
        }
    }

    // Flush any remaining assistant message
    if (currentAssistantMessage) {
        messages.push(currentAssistantMessage);
    }

    return messages;
}
