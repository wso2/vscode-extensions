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

// Tool name constants
const TODO_WRITE_TOOL_NAME = 'todo_write';
const SHELL_TOOL_NAMES = new Set(['shell', 'bash']);
const FILE_CHANGES_TAG_REGEX = /<filechanges>([\s\S]*?)<\/filechanges>/g;

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

function getFileChangesCheckpointIds(content: string): Set<string> {
    const checkpointIds = new Set<string>();
    for (const match of content.matchAll(FILE_CHANGES_TAG_REGEX)) {
        const summaryText = match[1];
        try {
            const summary = JSON.parse(summaryText) as { checkpointId?: string };
            if (summary?.checkpointId) {
                checkpointIds.add(summary.checkpointId);
            }
        } catch {
            // Ignore malformed tags and continue.
        }
    }
    return checkpointIds;
}

function hasFileChangesCheckpoint(content: string, checkpointId?: string): boolean {
    if (!checkpointId) {
        return false;
    }
    return getFileChangesCheckpointIds(content).has(checkpointId);
}

function appendFileChangesTagToMessage(message: ChatMessage, tag: string): void {
    message.content = message.content ? `${message.content}\n\n${tag}` : tag;
}

function findLastAssistantMessage(
    messages: ChatMessage[],
    matcher?: (message: ChatMessage) => boolean
): ChatMessage | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
        const candidate = messages[i];
        if (candidate.role !== Role.MICopilot) {
            continue;
        }
        if (!matcher || matcher(candidate)) {
            return candidate;
        }
    }
    return undefined;
}

function getEventChatId(event: AgentEvent | ChatHistoryEvent): number | undefined {
    if ('chatId' in event && typeof event.chatId === 'number') {
        return event.chatId;
    }
    return undefined;
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
    let activeChatId: number | undefined = undefined;
    let nextSyntheticChatId = -1;
    const allocateSyntheticChatId = (): number => nextSyntheticChatId--;
    // Track pending tool calls by toolCallId for proper matching
    const pendingToolCalls = new Map<string, {
        toolName: string;
        toolInput: unknown;
        filePath: string;
    }>();

    for (const event of events) {
        switch (event.type) {
            case 'user':
                // Flush any pending assistant message
                if (currentAssistantMessage) {
                    messages.push(currentAssistantMessage);
                    currentAssistantMessage = null;
                }

                const userChatId = getEventChatId(event) ?? allocateSyntheticChatId();
                activeChatId = userChatId;

                // Create new user message
                currentUserMessage = {
                    id: userChatId,
                    role: Role.MIUser,
                    content: event.content || '',
                    type: MessageType.UserMessage,
                    files: (event as ChatHistoryEvent).files,
                    images: (event as ChatHistoryEvent).images,
                };
                messages.push(currentUserMessage);
                currentUserMessage = null;
                break;

            case 'assistant':
            case 'content_block':
                activeChatId = getEventChatId(event) ?? activeChatId;
                // Create or append to assistant message
                if (!currentAssistantMessage) {
                    currentAssistantMessage = {
                        id: activeChatId ?? allocateSyntheticChatId(),
                        role: Role.MICopilot,
                        content: event.content || '',
                        type: MessageType.AssistantMessage
                    };
                } else {
                    currentAssistantMessage.content += event.content || '';
                }
                break;

            case 'tool_call':
                activeChatId = getEventChatId(event) ?? activeChatId;
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
                                id: activeChatId ?? allocateSyntheticChatId(),
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

                // Extract file path and toolCallId for display
                const toolInput = event.toolInput as any;
                const filePath = toolInput?.file_path || toolInput?.file_paths?.[0] || '';
                const toolCallId = 'toolCallId' in event ? (event.toolCallId as string) : '';

                // Store pending tool call info keyed by toolCallId (needed for proper matching)
                if (toolCallId) {
                    pendingToolCalls.set(toolCallId, {
                        toolName: event.toolName || '',
                        toolInput: event.toolInput,
                        filePath
                    });
                }

                // Ensure assistant message exists
                if (!currentAssistantMessage) {
                    currentAssistantMessage = {
                        id: activeChatId ?? allocateSyntheticChatId(),
                        role: Role.MICopilot,
                        content: '',
                        type: MessageType.AssistantMessage
                    };
                }

                // Handle bash tool specially - show loading bash component with command
                // Include toolCallId in the tag for proper matching with tool_result
                if (event.toolName && SHELL_TOOL_NAMES.has(event.toolName)) {
                    const bashData = {
                        command: toolInput?.command || '',
                        description: toolInput?.description || '',
                        output: '',
                        exitCode: 0,
                        loading: true
                    };
                    currentAssistantMessage.content += `\n\n<bashoutput data-loading="true" data-tool-call-id="${toolCallId}">${JSON.stringify(bashData)}</bashoutput>`;
                    continue;
                }

                // Get loading action from event (for live streaming) or create generic message
                const loadingAction = 'loadingAction' in event ? event.loadingAction : undefined;
                const loadingMessage = loadingAction
                    ? `${loadingAction.charAt(0).toUpperCase() + loadingAction.slice(1)} ${filePath}...`
                    : `Using ${event.toolName}${filePath ? `: ${filePath}` : ''}...`;

                // Insert loading tool call tag (with data-loading attribute for replacement)
                currentAssistantMessage.content += `\n\n<toolcall data-loading="true" data-file="${filePath}">${loadingMessage}</toolcall>`;
                break;

            case 'tool_result':
                activeChatId = getEventChatId(event) ?? activeChatId;
                // Skip todo_write tool results (handled by inline todo list in tool_call)
                if ('toolName' in event && event.toolName === TODO_WRITE_TOOL_NAME) {
                    continue;
                }

                // Get toolCallId to find the matching pending tool call
                const resultToolCallId = 'toolCallId' in event ? (event.toolCallId as string) : '';
                const pendingToolCall = resultToolCallId ? pendingToolCalls.get(resultToolCallId) : null;

                if (pendingToolCall) {
                    // Ensure assistant message exists
                    if (!currentAssistantMessage) {
                        currentAssistantMessage = {
                            id: activeChatId ?? allocateSyntheticChatId(),
                            role: Role.MICopilot,
                            content: '',
                            type: MessageType.AssistantMessage
                        };
                    }

                    // Handle bash tool specially - replace loading bashoutput tag with completed one
                    if (SHELL_TOOL_NAMES.has(pendingToolCall.toolName)) {
                        const bashCommand = 'bashCommand' in event ? event.bashCommand : undefined;
                        const bashDescription = 'bashDescription' in event ? event.bashDescription : undefined;
                        const bashStdout = 'bashStdout' in event ? event.bashStdout : undefined;
                        const bashExitCode = 'bashExitCode' in event ? event.bashExitCode : undefined;
                        const bashRunning = 'bashRunning' in event ? event.bashRunning : false;

                        // Create completed bash output data structure
                        const bashData = {
                            command: bashCommand || '',
                            description: bashDescription || '',
                            output: bashStdout || '',
                            exitCode: bashExitCode ?? 0,
                            running: bashRunning,
                            loading: false
                        };

                        const completedBashTag = `<bashoutput>${JSON.stringify(bashData)}</bashoutput>`;

                        // Find and replace the loading bashoutput tag by toolCallId
                        const bashPatternWithId = new RegExp(`<bashoutput data-loading="true" data-tool-call-id="${resultToolCallId}">[\\s\\S]*?<\\/bashoutput>`, 'g');
                        const bashMatchesWithId = [...currentAssistantMessage.content.matchAll(bashPatternWithId)];

                        if (bashMatchesWithId.length > 0) {
                            // Replace the matching bash output by toolCallId
                            const match = bashMatchesWithId[0];
                            const fullMatch = match[0];
                            currentAssistantMessage.content = currentAssistantMessage.content.replace(fullMatch, completedBashTag);
                        } else {
                            // Fallback: try to find any loading bashoutput tag (for backwards compatibility)
                            const bashPattern = /<bashoutput data-loading="true"[^>]*>[\s\S]*?<\/bashoutput>/g;
                            const bashMatches = [...currentAssistantMessage.content.matchAll(bashPattern)];

                            if (bashMatches.length > 0) {
                                // Replace the first matching bash output
                                const firstMatch = bashMatches[0];
                                const fullMatch = firstMatch[0];
                                currentAssistantMessage.content = currentAssistantMessage.content.replace(fullMatch, completedBashTag);
                            } else {
                                // No loading tag found, append directly
                                currentAssistantMessage.content += `\n\n${completedBashTag}`;
                            }
                        }

                        pendingToolCalls.delete(resultToolCallId);
                        continue;
                    }

                    // Get action from event (backend provides this)
                    const action = 'action' in event ? event.action : undefined;
                    const completedAction = 'completedAction' in event ? event.completedAction : undefined;
                    const finalAction = action || completedAction || 'Executed';

                    const capitalizedAction = finalAction.charAt(0).toUpperCase() + finalAction.slice(1);

                    // Create standard completed message for other tools
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

                    pendingToolCalls.delete(resultToolCallId);
                }
                break;

            case 'stop':
                // End of assistant message - flush it
                if (currentAssistantMessage) {
                    messages.push(currentAssistantMessage);
                    currentAssistantMessage = null;
                }
                break;

            case 'compact_summary':
                // Flush any pending assistant message
                if (currentAssistantMessage) {
                    messages.push(currentAssistantMessage);
                    currentAssistantMessage = null;
                }
                activeChatId = undefined;
                // Render as a standalone assistant message with <compact> tag
                // (splitContent in utils.ts parses this; CompactSummarySegment renders it)
                messages.push({
                    id: generateId(),
                    role: Role.MICopilot,
                    content: `<compact>${event.content || ''}</compact>`,
                    type: MessageType.AssistantMessage,
                });
                break;

            case 'undo_checkpoint': {
                const checkpoint = event.undoCheckpoint;
                if (!checkpoint) {
                    break;
                }
                const targetChatId = 'targetChatId' in event && typeof event.targetChatId === 'number'
                    ? event.targetChatId
                    : undefined;

                const checkpointId = checkpoint.checkpointId;
                const alreadyExistsInCurrent = currentAssistantMessage
                    ? hasFileChangesCheckpoint(currentAssistantMessage.content || '', checkpointId)
                    : false;
                const alreadyExistsInMessages = messages.some((message) =>
                    message.role === Role.MICopilot
                    && hasFileChangesCheckpoint(message.content || '', checkpointId)
                );

                if (alreadyExistsInCurrent || alreadyExistsInMessages) {
                    break;
                }

                if (targetChatId === undefined) {
                    break;
                }

                const fileChangesTag = `<filechanges>${JSON.stringify(checkpoint)}</filechanges>`;
                if (
                    currentAssistantMessage
                    && currentAssistantMessage.role === Role.MICopilot
                    && currentAssistantMessage.id === targetChatId
                ) {
                    appendFileChangesTagToMessage(currentAssistantMessage, fileChangesTag);
                    break;
                }

                const targetedAssistantMessage = findLastAssistantMessage(
                    messages,
                    (message) => message.id === targetChatId
                );
                if (targetedAssistantMessage) {
                    appendFileChangesTagToMessage(targetedAssistantMessage, fileChangesTag);
                    break;
                }
                break;
            }

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
