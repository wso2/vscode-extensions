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

import { ModelMessage, streamText, stepCountIs } from 'ai';
import { getAnthropicClient, getProviderCacheControl, ANTHROPIC_SONNET_4_5 } from '../../../connection';
import { getSystemPrompt } from './system';
import { getUserPrompt, UserPromptParams } from './prompt';
import {
    createWriteTool,
    createReadTool,
    createEditTool,
    createMultiEditTool,
    createGrepTool,
    createGlobTool,
    createWriteExecute,
    createReadExecute,
    createEditExecute,
    createMultiEditExecute,
    createGrepExecute,
    createGlobExecute,
} from '../../tools/file_tools';
import {
    createConnectorTool,
    createConnectorExecute,
    createGetConnectorDocumentationTool,
    createGetConnectorDocumentationExecute,
    createGetAIConnectorDocumentationTool,
    createGetAIConnectorDocumentationExecute,
} from '../../tools/connector_tools';
import {
    createAddConnectorTool,
    createAddConnectorExecute,
    createRemoveConnectorTool,
    createRemoveConnectorExecute,
} from '../../tools/project_tools';
import {
    createValidateCodeTool,
    createValidateCodeExecute,
} from '../../tools/lsp_tools';
import {
    createCreateDataMapperTool,
    createCreateDataMapperExecute,
    createGenerateDataMappingTool,
    createGenerateDataMappingExecute,
} from '../../tools/data_mapper_tools';
import {
    createBuildProjectTool,
    createBuildProjectExecute,
    createServerManagementTool,
    createServerManagementExecute,
} from '../../tools/runtime_tools';
import {
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_MULTI_EDIT_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    FILE_GLOB_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    ADD_CONNECTOR_TOOL_NAME,
    REMOVE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    GET_CONNECTOR_DOCUMENTATION_TOOL_NAME,
    GET_AI_CONNECTOR_DOCUMENTATION_TOOL_NAME,
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    BUILD_PROJECT_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
} from '../../tools/types';
import { logInfo, logError, logDebug } from '../../../copilot/logger';
import { ChatHistoryManager } from '../../chat-history-manager';
import { getToolAction } from '../../tool-action-mapper';

// ============================================================================
// Types
// ============================================================================

/**
 * Event types emitted during agent execution
 */
export type AgentEventType =
    | 'start'
    | 'content_block'
    | 'tool_call'
    | 'tool_result'
    | 'error'
    | 'abort'
    | 'stop';

/**
 * Event emitted during agent execution
 */
export interface AgentEvent {
    type: AgentEventType;
    content?: string;
    toolName?: string;
    toolInput?: any;
    toolOutput?: any;
    /** User-friendly loading action text (e.g., "creating", "reading") - sent with tool_call */
    loadingAction?: string;
    /** User-friendly completed action text (e.g., "created", "read") - sent with tool_result */
    completedAction?: string;
    error?: string;
    /** Full AI SDK messages (only sent with "stop" event) */
    modelMessages?: any[];
}

/**
 * Event handler function type
 */
export type AgentEventHandler = (event: AgentEvent) => void;

/**
 * Request parameters for agent execution
 */
export interface AgentRequest {
    /** User's query/requirement */
    query: string;
    /** Path to the MI project */
    projectPath: string;
    /** Map of file path to content for relevant existing code (optional, for future use) */
    existingCode?: Map<string, string>;
    /** Session ID for loading chat history */
    sessionId?: string;
    /** Abort signal for cancellation */
    abortSignal?: AbortSignal;
    /** Chat history manager for recording conversation (managed by RPC layer) */
    chatHistoryManager?: ChatHistoryManager;
}

/**
 * Result of agent execution
 */
export interface AgentResult {
    /** Whether execution completed successfully */
    success: boolean;
    /** List of files modified during execution */
    modifiedFiles: string[];
    /** Error message if failed */
    error?: string;
    /** Full AI SDK messages from this turn (includes tool calls/results) */
    modelMessages?: any[];
}

// ============================================================================
// Agent Core
// ============================================================================

/**
 * Creates and executes the MI design agent
 */
export async function executeAgent(
    request: AgentRequest,
    eventHandler: AgentEventHandler
): Promise<AgentResult> {
    const modifiedFiles: string[] = [];
    let finalModelMessages: any[] = [];
    let response: any = null; // Store response promise for later access
    let accumulatedContent: string = ''; // Accumulate assistant response content

    try {
        logInfo(`[Agent] Starting agent execution for project: ${request.projectPath}`);

        // Load chat history from session file if sessionId provided
        let chatHistory: ModelMessage[] = [];
        if (request.sessionId) {
            try {
                const entries = await ChatHistoryManager.loadSession(request.projectPath, request.sessionId);
                chatHistory = ChatHistoryManager.convertToModelMessages(entries);
                logInfo(`[Agent] Loaded ${chatHistory.length} messages from session history`);
            } catch (error) {
                logError('[Agent] Failed to load chat history, starting fresh', error);
            }
        }

        // Record user message to history
        if (request.chatHistoryManager) {
            await request.chatHistoryManager.recordUserMessage(request.query);
            logDebug('[Agent] Recorded user message to chat history');
        }

        // Get cache options for prompt caching
        const cacheOptions = await getProviderCacheControl();

        // Build user prompt
        const userPromptParams: UserPromptParams = {
            query: request.query,
            projectPath: request.projectPath,
            // Note: existingFiles and currentlyOpenedFile are fetched internally by getUserPrompt
        };
        const userMessageContent = await getUserPrompt(userPromptParams);

        // Build messages array
        const allMessages: ModelMessage[] = [
            {
                role: 'system',
                content: getSystemPrompt(),
                providerOptions: cacheOptions,
            },
            ...chatHistory,
            {
                role: 'user',
                content: userMessageContent,
            },
        ];

        // Create tools
        const tools = {
            [FILE_WRITE_TOOL_NAME]: createWriteTool(
                createWriteExecute(request.projectPath, modifiedFiles)
            ),
            [FILE_READ_TOOL_NAME]: createReadTool(
                createReadExecute(request.projectPath)
            ),
            [FILE_EDIT_TOOL_NAME]: createEditTool(
                createEditExecute(request.projectPath, modifiedFiles)
            ),
            [FILE_MULTI_EDIT_TOOL_NAME]: createMultiEditTool(
                createMultiEditExecute(request.projectPath, modifiedFiles)
            ),
            [FILE_GREP_TOOL_NAME]: createGrepTool(
                createGrepExecute(request.projectPath)
            ),
            [FILE_GLOB_TOOL_NAME]: createGlobTool(
                createGlobExecute(request.projectPath)
            ),
            [CONNECTOR_TOOL_NAME]: createConnectorTool(
                createConnectorExecute()
            ),
            [ADD_CONNECTOR_TOOL_NAME]: createAddConnectorTool(
                createAddConnectorExecute(request.projectPath)
            ),
            [REMOVE_CONNECTOR_TOOL_NAME]: createRemoveConnectorTool(
                createRemoveConnectorExecute(request.projectPath)
            ),
            [VALIDATE_CODE_TOOL_NAME]: createValidateCodeTool(
                createValidateCodeExecute(request.projectPath)
            ),
            [GET_CONNECTOR_DOCUMENTATION_TOOL_NAME]: createGetConnectorDocumentationTool(
                createGetConnectorDocumentationExecute()
            ),
            [GET_AI_CONNECTOR_DOCUMENTATION_TOOL_NAME]: createGetAIConnectorDocumentationTool(
                createGetAIConnectorDocumentationExecute()
            ),
            [CREATE_DATA_MAPPER_TOOL_NAME]: createCreateDataMapperTool(
                createCreateDataMapperExecute(request.projectPath, modifiedFiles)
            ),
            [GENERATE_DATA_MAPPING_TOOL_NAME]: createGenerateDataMappingTool(
                createGenerateDataMappingExecute(request.projectPath, modifiedFiles)
            ),
            [BUILD_PROJECT_TOOL_NAME]: createBuildProjectTool(
                createBuildProjectExecute(request.projectPath)
            ),
            [SERVER_MANAGEMENT_TOOL_NAME]: createServerManagementTool(
                createServerManagementExecute(request.projectPath)
            ),
        };

        // Start streaming
        const streamResult = streamText({
            model: await getAnthropicClient(ANTHROPIC_SONNET_4_5),
            maxOutputTokens: 8192,
            temperature: 0,
            messages: allMessages,
            stopWhen: stepCountIs(50),
            tools,
            abortSignal: request.abortSignal,
        });
        const fullStream = streamResult.fullStream;
        response = streamResult.response; // Assign to outer scope variable

        eventHandler({ type: 'start' });

        // Track tool inputs for use in tool results (by toolCallId)
        const toolInputMap = new Map<string, any>();

        // Process stream
        for await (const part of fullStream) {
            switch (part.type) {
                case 'text-delta': {
                    // Accumulate content for later recording as complete message
                    accumulatedContent += part.text;

                    eventHandler({
                        type: 'content_block',
                        content: part.text,
                    });
                    break;
                }

                case 'tool-call': {
                    const toolInput = part.input as any;
                    logDebug(`[Agent] Tool call: ${part.toolName}`);

                    // Store tool input for later use in tool result
                    toolInputMap.set(part.toolCallId, toolInput);

                    // Record accumulated text as incomplete assistant message before tool call
                    if (request.chatHistoryManager && accumulatedContent) {
                        await request.chatHistoryManager.recordAssistantChunk(accumulatedContent, false);
                        logDebug('[Agent] Recorded assistant chunk before tool call');
                        accumulatedContent = ''; // Reset accumulated content
                    }

                    // Record tool call to history
                    if (request.chatHistoryManager) {
                        await request.chatHistoryManager.recordToolCall(part.toolName, toolInput);
                    }

                    // Get loading action from shared utility (single source of truth)
                    const toolActions = getToolAction(part.toolName, undefined, toolInput);
                    const loadingAction = toolActions?.loading;

                    // Extract relevant info for display
                    let displayInput: any = undefined;
                    if ([FILE_READ_TOOL_NAME, FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_MULTI_EDIT_TOOL_NAME].includes(part.toolName)) {
                        displayInput = { file_path: toolInput?.file_path };
                    } else if (part.toolName === CONNECTOR_TOOL_NAME) {
                        displayInput = {
                            connector_names: toolInput?.connector_names,
                            inbound_endpoint_names: toolInput?.inbound_endpoint_names,
                        };
                    } else if (part.toolName === ADD_CONNECTOR_TOOL_NAME || part.toolName === REMOVE_CONNECTOR_TOOL_NAME) {
                        displayInput = {
                            connector_names: toolInput?.connector_names,
                        };
                    } else if (part.toolName === VALIDATE_CODE_TOOL_NAME) {
                        displayInput = {
                            file_paths: toolInput?.file_paths,
                        };
                    } else if (part.toolName === GET_CONNECTOR_DOCUMENTATION_TOOL_NAME || part.toolName === GET_AI_CONNECTOR_DOCUMENTATION_TOOL_NAME) {
                        displayInput = {}; // No input parameters
                    } else if (part.toolName === CREATE_DATA_MAPPER_TOOL_NAME) {
                        displayInput = {
                            name: toolInput?.name,
                            input_type: toolInput?.input_type,
                            output_type: toolInput?.output_type,
                        };
                    } else if (part.toolName === GENERATE_DATA_MAPPING_TOOL_NAME) {
                        displayInput = {
                            dm_config_path: toolInput?.dm_config_path,
                        };
                    } else if (part.toolName === BUILD_PROJECT_TOOL_NAME) {
                        displayInput = {
                            copy_to_runtime: toolInput?.copy_to_runtime,
                        };
                    } else if (part.toolName === SERVER_MANAGEMENT_TOOL_NAME) {
                        displayInput = {
                            action: toolInput?.action,
                        };
                    }

                    eventHandler({
                        type: 'tool_call',
                        toolName: part.toolName,
                        toolInput: displayInput,
                        loadingAction,
                    });
                    break;
                }

                case 'tool-result': {
                    const result = part.output as any;
                    logDebug(`[Agent] Tool result: ${part.toolName}, success: ${result?.success}`);

                    // Record tool result to history
                    if (request.chatHistoryManager) {
                        await request.chatHistoryManager.recordToolResult(part.toolName, result);
                    }

                    // Retrieve tool input from map (for dynamic action messages)
                    const toolInput = toolInputMap.get(part.toolCallId);

                    // Get action from shared utility (single source of truth)
                    const toolActions = getToolAction(part.toolName, result, toolInput);

                    // Use completed or failed action based on tool result
                    const resultAction = result?.success === false
                        ? toolActions?.failed
                        : toolActions?.completed;

                    // Send to visualizer with result action for display
                    eventHandler({
                        type: 'tool_result',
                        toolName: part.toolName,
                        toolOutput: { success: result?.success },
                        completedAction: resultAction,
                    });

                    // Clean up stored tool input
                    toolInputMap.delete(part.toolCallId);
                    break;
                }

                case 'error': {
                    const errorMsg = getErrorMessage(part.error);
                    logError(`[Agent] Stream error: ${errorMsg}`);
                    eventHandler({
                        type: 'error',
                        error: errorMsg,
                    });
                    return {
                        success: false,
                        modifiedFiles,
                        error: errorMsg,
                    };
                }

                case 'text-start': {
                    // Add newline for formatting
                    eventHandler({
                        type: 'content_block',
                        content: ' \n',
                    });
                    break;
                }

                case 'finish': {
                    logInfo(`[Agent] Execution finished. Modified files: ${modifiedFiles.length}`);

                    // Record final complete assistant message to history
                    if (request.chatHistoryManager && accumulatedContent) {
                        await request.chatHistoryManager.recordAssistantChunk(accumulatedContent, true);
                        logDebug('[Agent] Recorded complete assistant message to chat history');
                    }

                    // Capture final model messages (includes all tool calls/results)
                    try {
                        const finalResponse = await response;
                        finalModelMessages = finalResponse.messages || [];
                        logDebug(`[Agent] Captured ${finalModelMessages.length} model messages`);
                    } catch (error) {
                        logError('[Agent] Failed to capture model messages', error);
                    }

                    // Send stop event with modelMessages
                    eventHandler({ type: 'stop', modelMessages: finalModelMessages });
                    return {
                        success: true,
                        modifiedFiles,
                        modelMessages: finalModelMessages,
                    };
                }
            }
        }

        // Stream completed without finish event
        // Record final complete assistant message to history
        if (request.chatHistoryManager && accumulatedContent) {
            await request.chatHistoryManager.recordAssistantChunk(accumulatedContent, true);
            logDebug('[Agent] Recorded complete assistant message to chat history (no finish event)');
        }

        // Capture final model messages even if no explicit finish
        try {
            const finalResponse = await response;
            finalModelMessages = finalResponse.messages || [];
            logDebug(`[Agent] Captured ${finalModelMessages.length} model messages (no finish event)`);
        } catch (error) {
            logError('[Agent] Failed to capture model messages', error);
        }

        // Send stop event with modelMessages
        eventHandler({ type: 'stop', modelMessages: finalModelMessages });
        return {
            success: true,
            modifiedFiles,
            modelMessages: finalModelMessages,
        };

    } catch (error: any) {
        const errorMsg = getErrorMessage(error);

        // Try to capture partial model messages even on error
        try {
            const finalResponse = await response;
            finalModelMessages = finalResponse.messages || [];
        } catch {
            // Ignore errors in capturing messages
        }

        // Check if aborted
        if (error?.name === 'AbortError' || request.abortSignal?.aborted) {
            logInfo('[Agent] Execution aborted by user');
            eventHandler({ type: 'abort' });
            return {
                success: false,
                modifiedFiles,
                error: 'Aborted by user',
                modelMessages: finalModelMessages,
            };
        }

        logError(`[Agent] Execution error: ${errorMsg}`);
        eventHandler({
            type: 'error',
            error: errorMsg,
        });
        return {
            success: false,
            modifiedFiles,
            error: errorMsg,
            modelMessages: finalModelMessages,
        };
    }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Extracts a readable error message from an error object
 */
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as any).message);
    }
    return 'An unknown error occurred';
}

/**
 * Creates an abort controller for agent execution
 */
export function createAgentAbortController(): AbortController {
    return new AbortController();
}
