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
    createWriteExecute,
    createReadExecute,
    createEditExecute,
    createMultiEditExecute,
    createGrepExecute,
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
    createValidateCodeTool,
    createValidateCodeExecute,
} from '../../tools/project_tools';
import {
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_MULTI_EDIT_TOOL_NAME,
    FILE_GREP_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    ADD_CONNECTOR_TOOL_NAME,
    REMOVE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    GET_CONNECTOR_DOCUMENTATION_TOOL_NAME,
    GET_AI_CONNECTOR_DOCUMENTATION_TOOL_NAME,
} from '../../tools/types';
import { logInfo, logError, logDebug } from '../../../copilot/logger';

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
    error?: string;
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
    /** Chat history for context */
    chatHistory?: ModelMessage[];
    /** Abort signal for cancellation */
    abortSignal?: AbortSignal;
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

    try {
        logInfo(`[Agent] Starting agent execution for project: ${request.projectPath}`);

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
            ...(request.chatHistory || []),
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
        };

        // Start streaming
        const { fullStream, response } = streamText({
            model: await getAnthropicClient(ANTHROPIC_SONNET_4_5),
            maxOutputTokens: 8192,
            temperature: 0,
            messages: allMessages,
            stopWhen: stepCountIs(50),
            tools,
            abortSignal: request.abortSignal,
        });

        eventHandler({ type: 'start' });

        // Process stream
        for await (const part of fullStream) {
            switch (part.type) {
                case 'text-delta': {
                    eventHandler({
                        type: 'content_block',
                        content: part.text,
                    });
                    break;
                }

                case 'tool-call': {
                    const toolInput = part.input as any;
                    logDebug(`[Agent] Tool call: ${part.toolName}`);

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
                    }

                    eventHandler({
                        type: 'tool_call',
                        toolName: part.toolName,
                        toolInput: displayInput,
                    });
                    break;
                }

                case 'tool-result': {
                    const result = part.output as any;
                    logDebug(`[Agent] Tool result: ${part.toolName}, success: ${result?.success}`);

                    // Extract relevant info for display
                    let displayOutput: any = { success: result?.success };
                    if (part.toolName === FILE_WRITE_TOOL_NAME && result?.message) {
                        if (result.message.includes('created')) {
                            displayOutput.action = 'created';
                        } else if (result.message.includes('updated')) {
                            displayOutput.action = 'updated';
                        }
                    } else if (part.toolName === CONNECTOR_TOOL_NAME && result?.success) {
                        displayOutput.action = 'fetched';
                    } else if (part.toolName === ADD_CONNECTOR_TOOL_NAME && result?.success) {
                        displayOutput.action = 'added';
                    } else if (part.toolName === REMOVE_CONNECTOR_TOOL_NAME && result?.success) {
                        displayOutput.action = 'removed';
                    } else if (part.toolName === VALIDATE_CODE_TOOL_NAME && result?.success) {
                        displayOutput.action = 'validated';
                    } else if (part.toolName === GET_CONNECTOR_DOCUMENTATION_TOOL_NAME && result?.success) {
                        displayOutput.action = 'retrieved';
                    } else if (part.toolName === GET_AI_CONNECTOR_DOCUMENTATION_TOOL_NAME && result?.success) {
                        displayOutput.action = 'retrieved';
                    }

                    eventHandler({
                        type: 'tool_result',
                        toolName: part.toolName,
                        toolOutput: displayOutput,
                    });
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
                    eventHandler({ type: 'stop' });
                    return {
                        success: true,
                        modifiedFiles,
                    };
                }
            }
        }

        // Stream completed without finish event
        eventHandler({ type: 'stop' });
        return {
            success: true,
            modifiedFiles,
        };

    } catch (error: any) {
        const errorMsg = getErrorMessage(error);

        // Check if aborted
        if (error?.name === 'AbortError' || request.abortSignal?.aborted) {
            logInfo('[Agent] Execution aborted by user');
            eventHandler({ type: 'abort' });
            return {
                success: false,
                modifiedFiles,
                error: 'Aborted by user',
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
