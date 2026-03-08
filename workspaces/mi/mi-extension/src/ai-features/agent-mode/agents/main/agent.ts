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

// ============================================================================
// Dev Feature Flags
// ============================================================================
const ENABLE_LANGFUSE = false; // Set to false to disable Langfuse tracing
const ENABLE_DEVTOOLS = false; // Set to true to enable AI SDK DevTools (local development only!)

import { ModelMessage, streamText, stepCountIs, UserModelMessage, SystemModelMessage, wrapLanguageModel } from 'ai';
import { AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { getAnthropicClient, ANTHROPIC_SONNET_4_6 } from '../../../connection';
import { getSystemPrompt } from '../main/system';
import { getUserPrompt, UserPromptParams } from './prompt';
import { addCacheControlToMessages } from '../../../cache-utils';
import { buildMessageContent } from '../../attachment-utils';

import {
    PendingQuestion,
    PendingPlanApproval,
} from '../../tools/plan_mode_tools';
import { getRuntimeVersionFromPom } from '../../tools/connector_store_cache';
import {
    createAgentTools,
    FILE_WRITE_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    CONNECTOR_TOOL_NAME,
    SKILL_TOOL_NAME,
    MANAGE_CONNECTOR_TOOL_NAME,
    VALIDATE_CODE_TOOL_NAME,
    CREATE_DATA_MAPPER_TOOL_NAME,
    GENERATE_DATA_MAPPING_TOOL_NAME,
    BUILD_PROJECT_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    BASH_TOOL_NAME,
    KILL_TASK_TOOL_NAME,
    WEB_SEARCH_TOOL_NAME,
    WEB_FETCH_TOOL_NAME,
} from './tools';
import { logInfo, logError, logDebug } from '../../../copilot/logger';
import { ChatHistoryManager } from '../../chat-history-manager';
import { getToolAction } from '../../tool-action-mapper';
import { AgentUndoCheckpointManager } from '../../undo/checkpoint-manager';
import { getCopilotSessionDir } from '../../storage-paths';

// Import types from mi-core (shared with visualizer)
import { AgentEvent, AgentEventType, FileObject, ImageObject, AgentMode } from '@wso2/mi-core';

// Re-export types for other modules that import from agent.ts
export type { AgentEvent, AgentEventType };

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
    /** Stable UI chat id for this user turn */
    chatId?: number;
    /** Agent mode: ask (read-only), plan (planning read-only), or edit (full tool access) */
    mode?: AgentMode;
    /** Optional file attachments (text/PDF) */
    files?: FileObject[];
    /** Optional image attachments */
    images?: ImageObject[];
    /** Enable Claude thinking mode (reasoning blocks) */
    thinking?: boolean;
    /** Skip per-call web approval prompts when true */
    webAccessPreapproved?: boolean;
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
    /** Pending questions map for ask_user tool (shared with RPC layer) */
    pendingQuestions?: Map<string, PendingQuestion>;
    /** Pending plan approvals map for exit_plan_mode tool (shared with RPC layer) */
    pendingApprovals?: Map<string, PendingPlanApproval>;
    /** Optional checkpoint manager for undo support */
    undoCheckpointManager?: AgentUndoCheckpointManager;
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
    let isExecutingTool = false; // Track if we're currently executing a tool (for interruption message)

    // Use provided pendingQuestions map or create a new one
    const pendingQuestions = request.pendingQuestions || new Map<string, PendingQuestion>();

    // Use provided pendingApprovals map or create a new one (for exit_plan_mode approval)
    const pendingApprovals = request.pendingApprovals || new Map<string, PendingPlanApproval>();
    
    // Session ID for plan mode (defaults to 'default')
    const sessionId = request.sessionId || 'default';

    // Session directory for output files (build.txt, run.txt)
    const sessionDir = getCopilotSessionDir(request.projectPath, sessionId);

    try {
        logInfo(`[Agent] Starting agent execution for project: ${request.projectPath}`);

        // Load chat history (reads from JSONL)
        let chatHistory: ModelMessage[] = [];
        if (request.chatHistoryManager) {
            chatHistory = await request.chatHistoryManager.getMessages();
            logInfo(`[Agent] Loaded ${chatHistory.length} messages from history`);
        }

        const runtimeVersion = await getRuntimeVersionFromPom(request.projectPath);
        logInfo(`[Agent] Runtime version detected: ${runtimeVersion ?? 'unknown'}`);

        // System message (cache control will be added dynamically by prepareStep)
        // Adding a cache block here because tools + system would be same for all users who use our proxy
        const systemMessage: SystemModelMessage = {
            role: 'system',
            content: getSystemPrompt(runtimeVersion),
            providerOptions: {
                anthropic: {
                    cacheControl: { type: 'ephemeral' }
                }
            }
        } as SystemModelMessage;

        // Build user prompt
        const userPromptParams: UserPromptParams = {
            query: request.query,
            mode: request.mode || 'edit',
            projectPath: request.projectPath,
            sessionId,
            runtimeVersion,
            // Note: existingFiles and currentlyOpenedFile are fetched internally by getUserPrompt
        };
        const userMessageContent = await getUserPrompt(userPromptParams);

        const hasFiles = request.files && request.files.length > 0;
        const hasImages = request.images && request.images.length > 0;

        if (hasFiles || hasImages) {
            logInfo(`[Agent] Including ${request.files?.length || 0} files and ${request.images?.length || 0} images in user message`);
        }

        // Build user message (multimodal when attachments are present)
        const userMessage: UserModelMessage = {
            role: 'user',
            content: (hasFiles || hasImages)
                ? buildMessageContent(userMessageContent, request.files, request.images)
                : [{
                    type: 'text',
                    text: userMessageContent,
                }]
        } as UserModelMessage;

        // Build messages array
        const allMessages: ModelMessage[] = [
            systemMessage,
            ...chatHistory,
            userMessage
        ];

        // Save user message to history
        if (request.chatHistoryManager) {
            await request.chatHistoryManager.saveMessage(userMessage, {
                chatId: request.chatId,
                attachmentMetadata: (hasFiles || hasImages)
                    ? {
                        files: request.files?.map((file) => ({
                            name: file.name,
                            mimetype: file.mimetype,
                        })),
                        images: request.images?.map((image) => ({
                            imageName: image.imageName,
                        })),
                    }
                    : undefined,
            });
        }

        // Track how many messages have been saved from step.response.messages
        // This counter tracks messages from the current turn only (not history)
        let savedMessageCount = 0;

        // Create tools (cache control will be added dynamically by prepareStep)
        const tools = createAgentTools({
            projectPath: request.projectPath,
            mode: request.mode || 'edit',
            modifiedFiles,
            sessionId,
            sessionDir,
            eventHandler,
            pendingQuestions,
            pendingApprovals,
            getAnthropicClient,
            webAccessPreapproved: request.webAccessPreapproved === true,
            undoCheckpointManager: request.undoCheckpointManager,
        });

        // Track step number for logging
        let currentStepNumber = 0;

        // Get the model for prepareStep
        let model = await getAnthropicClient(ANTHROPIC_SONNET_4_6);

        // Wrap model with DevTools middleware if enabled (local development only!)
        // IMPORTANT: DevTools must be imported AFTER process.chdir() because it captures
        // process.cwd() at module load time. Dynamic import ensures it sees the correct path.
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

        // Simple prepareStep: just mark the last message for caching
        // This tells Anthropic to cache everything up to the last message
        const prepareStep = ({ messages }: { messages: any[] }) => {
            return {
                messages: addCacheControlToMessages({ messages, model })
            };
        };

        // Configure Anthropic provider options.
        // When thinking is enabled, keep reasoning in model messages for JSONL replay.
        const anthropicOptions: AnthropicProviderOptions = request.thinking
        // NOTE: Current pinned @ai-sdk/anthropic types support enabled/disabled thinking.
        // Adaptive thinking can be enabled once the SDK is upgraded in this repo.
        ? { thinking: { type: 'adaptive' } } 
        : {};
    
    const requestHeaders = request.thinking
        ? { 'anthropic-beta': 'interleaved-thinking-2025-05-14' }
        : undefined;

        // Setup Langfuse tracing if enabled
        const streamConfig: any = {
            model,
            maxOutputTokens: 15000,
            temperature: request.thinking ? undefined : 0,
            messages: allMessages,
            stopWhen: stepCountIs(50),
            tools,
            abortSignal: request.abortSignal,
            headers: requestHeaders,
            providerOptions: {
                anthropic: anthropicOptions,
            },
            prepareStep,
            onStepFinish: async (step) => {
                currentStepNumber++;

                // Simple cache metrics logging
                if (step.usage) {
                    const inputTokens = step.usage.inputTokens || 0;
                    const cachedInputTokens = step.usage.cachedInputTokens || 0;
                    const outputTokens = step.usage.outputTokens || 0;

                    logDebug(`[Cache] Step ${currentStepNumber} | ` +
                        `Input: ${inputTokens} | Cache Read: ${cachedInputTokens} | ` +
                        `Output: ${outputTokens} | Cache ratio: ${inputTokens > 0 ? (cachedInputTokens / (inputTokens + cachedInputTokens) * 100).toFixed(1) : '0'}%`);

                    // Emit usage event to UI
                    const totalInputTokens = inputTokens + cachedInputTokens;
                    eventHandler({ type: 'usage', totalInputTokens });
                }

                // Save only unsaved messages from this step
                // Usage metadata is attached to the last message entry in the JSONL
                if (request.chatHistoryManager && step.response?.messages) {
                    try {
                        const unsavedMessages = step.response.messages.slice(savedMessageCount);

                        if (unsavedMessages.length > 0) {
                            const totalInputTokens = step.usage
                                ? (step.usage.inputTokens || 0) + (step.usage.cachedInputTokens || 0)
                                : undefined;
                            await request.chatHistoryManager.saveMessages(
                                unsavedMessages,
                                totalInputTokens !== undefined
                                    ? { totalInputTokens, chatId: request.chatId }
                                    : { chatId: request.chatId }
                            );
                            savedMessageCount += unsavedMessages.length;
                        }
                    } catch (error) {
                        logError('[Agent] Failed to save messages from step', error);
                    }
                }
            },
        };

        // Enable Langfuse telemetry if flag is on
        if (ENABLE_LANGFUSE) {
            streamConfig.experimental_telemetry = { isEnabled: true };
            logInfo('[Langfuse] Telemetry enabled - traces will be sent to Langfuse if OpenTelemetry is configured');
        }

        // Start streaming with aggressive caching enabled
        const streamResult = streamText(streamConfig);
        const fullStream = streamResult.fullStream;
        response = streamResult.response; // Assign to outer scope variable

        eventHandler({ type: 'start' });

        // Track tool inputs for use in tool results (by toolCallId)
        const toolInputMap = new Map<string, any>();
        // Track tool calls that already emitted a pre-input loading state.
        const preloadedToolCallIds = new Set<string>();
        // Track reasoning text by block ID and emit complete thinking blocks on end.
        const reasoningById = new Map<string, string>();

        // Process stream
        for await (const part of fullStream) {
            // Check for abort signal at each iteration
            if (request.abortSignal?.aborted) {
                logInfo('[Agent] Abort signal detected during stream processing');
                throw new Error('AbortError: Operation aborted by user');
            }

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

                case 'reasoning-start': {
                    reasoningById.set(part.id, '');
                    eventHandler({
                        type: 'thinking_start',
                        thinkingId: part.id,
                    });
                    break;
                }

                case 'reasoning-delta': {
                    const delta = ('text' in part ? part.text : (part as any).delta) || '';
                    if (!delta) {
                        break;
                    }

                    const current = reasoningById.get(part.id) || '';
                    reasoningById.set(part.id, current + delta);

                    eventHandler({
                        type: 'thinking_delta',
                        thinkingId: part.id,
                        content: delta,
                    });
                    break;
                }

                case 'reasoning-end': {
                    reasoningById.delete(part.id);
                    eventHandler({
                        type: 'thinking_end',
                        thinkingId: part.id,
                    });
                    break;
                }

                case 'tool-input-start': {
                    const toolCallId = (part as any).id ?? (part as any).toolCallId;
                    if (toolCallId && preloadedToolCallIds.has(toolCallId)) {
                        break;
                    }

                    if (toolCallId) {
                        preloadedToolCallIds.add(toolCallId);
                    }

                    const toolName = (part as any).toolName;
                    if (!toolName || toolName === TODO_WRITE_TOOL_NAME) {
                        break;
                    }

                    const toolActions = getToolAction(toolName, undefined, undefined);
                    const loadingAction = toolActions?.loading || toolName;

                    // Emit an early loading event so UI shows progress while tool input streams.
                    eventHandler({
                        type: 'tool_call',
                        toolName,
                        toolInput: {},
                        loadingAction,
                    });
                    break;
                }

                case 'tool-input-delta':
                case 'tool-input-end': {
                    // Tool input deltas are currently used for early loading visibility.
                    // Final tool details are emitted on `tool-call`.
                    break;
                }

                case 'tool-call': {
                    const toolInput = part.input as any;
                    logDebug(`[Agent] Tool call: ${part.toolName}`);

                    // Mark that we're executing a tool (for interruption tracking)
                    isExecutingTool = true;

                    preloadedToolCallIds.delete(part.toolCallId);

                    // Store tool input for later use in tool result
                    toolInputMap.set(part.toolCallId, toolInput);

                    // Reset accumulated content (messages recorded via onStepFinish)
                    accumulatedContent = '';

                    // Get loading action from shared utility (single source of truth)
                    const toolActions = getToolAction(part.toolName, undefined, toolInput);
                    const loadingAction = toolActions?.loading;

                    // Extract relevant info for display
                    let displayInput: any = undefined;
                    if ([FILE_READ_TOOL_NAME, FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME].includes(part.toolName)) {
                        displayInput = { file_path: toolInput?.file_path };
                    } else if (part.toolName === CONNECTOR_TOOL_NAME) {
                        displayInput = {
                            connector_names: toolInput?.connector_names,
                            inbound_endpoint_names: toolInput?.inbound_endpoint_names,
                        };
                    } else if (part.toolName === SKILL_TOOL_NAME) {
                        displayInput = {
                            skill_name: toolInput?.skill_name,
                        };
                    } else if (part.toolName === MANAGE_CONNECTOR_TOOL_NAME) {
                        displayInput = {
                            operation: toolInput?.operation,
                            connector_names: toolInput?.connector_names,
                            inbound_endpoint_names: toolInput?.inbound_endpoint_names,
                        };
                    } else if (part.toolName === VALIDATE_CODE_TOOL_NAME) {
                        displayInput = {
                            file_paths: toolInput?.file_paths,
                        };
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
                    } else if (part.toolName === BASH_TOOL_NAME) {
                        displayInput = {
                            command: toolInput?.command,
                            description: toolInput?.description,
                        };
                    } else if (part.toolName === KILL_TASK_TOOL_NAME) {
                        displayInput = {
                            task_id: toolInput?.task_id,
                        };
                    } else if (part.toolName === WEB_SEARCH_TOOL_NAME) {
                        displayInput = {
                            query: toolInput?.query,
                            allowed_domains: toolInput?.allowed_domains,
                            blocked_domains: toolInput?.blocked_domains,
                        };
                    } else if (part.toolName === WEB_FETCH_TOOL_NAME) {
                        displayInput = {
                            url: toolInput?.url,
                            prompt: toolInput?.prompt,
                            allowed_domains: toolInput?.allowed_domains,
                            blocked_domains: toolInput?.blocked_domains,
                        };
                    }

                    // Skip tool call UI for todo_write (handled by inline todo list)
                    if (part.toolName !== TODO_WRITE_TOOL_NAME) {
                        eventHandler({
                            type: 'tool_call',
                            toolName: part.toolName,
                            toolInput: displayInput,
                            loadingAction,
                        });
                    }
                    break;
                }

                case 'tool-result': {
                    const result = part.output as any;
                    logDebug(`[Agent] Tool result: ${part.toolName}, success: ${result?.success}`);

                    // Tool execution complete
                    isExecutingTool = false;

                    // Retrieve tool input from map (for dynamic action messages)
                    const toolInput = toolInputMap.get(part.toolCallId);

                    // Get action from shared utility (single source of truth)
                    const toolActions = getToolAction(part.toolName, result, toolInput);

                    // Use completed or failed action based on tool result
                    const resultAction = result?.success === false
                        ? toolActions?.failed
                        : toolActions?.completed;

                    // Skip tool result UI for todo_write (handled by inline todo list)
                    if (part.toolName !== TODO_WRITE_TOOL_NAME) {
                        // Build event with shell-specific fields if applicable
                        const toolResultEvent: any = {
                            type: 'tool_result',
                            toolName: part.toolName,
                            toolOutput: { success: result?.success },
                            completedAction: resultAction,
                        };

                        // Add shell output fields for shell tool
                        if (part.toolName === BASH_TOOL_NAME) {
                            toolResultEvent.bashCommand = toolInput?.command;
                            toolResultEvent.bashDescription = toolInput?.description;
                            toolResultEvent.bashStdout = result?.stdout || result?.message;
                            toolResultEvent.bashStderr = result?.stderr;
                            toolResultEvent.bashExitCode = result?.exitCode;
                            toolResultEvent.bashRunning = !!result?.taskId;
                        }

                        // Send to visualizer with result action for display
                        eventHandler(toolResultEvent);
                    }

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

                    // Capture final messages and log cache usage
                    try {
                        const finalResponse = await response;
                        finalModelMessages = finalResponse.messages || [];
                    } catch (error) {
                        logError('[Agent] Failed to capture model messages', error);
                    }

                    // Send stop event to UI
                    eventHandler({ type: 'stop', modelMessages: finalModelMessages });
                    return {
                        success: true,
                        modifiedFiles,
                        modelMessages: finalModelMessages,
                    };
                }
            }
        }

        // Stream completed without finish event (shouldn't happen normally)
        // Capture final model messages for UI only (recording should have happened in onStepFinish)
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

        // Check if aborted - be thorough about detecting abort scenarios
        // The abort could come from various sources with different error types
        const isAborted = 
            error?.name === 'AbortError' || 
            request.abortSignal?.aborted ||
            errorMsg.toLowerCase().includes('abort') ||
            errorMsg.toLowerCase().includes('cancel') ||
            error?.code === 'ABORT_ERR';

        if (isAborted) {
            logInfo(`[Agent] Execution aborted by user (isExecutingTool: ${isExecutingTool})`);

            // Save interruption message to chat history (Claude Code pattern)
            // This helps LLM understand in next session that previous request was interrupted
            if (request.chatHistoryManager) {
                try {
                    await request.chatHistoryManager.saveInterruptionMessage(isExecutingTool);
                    logInfo('[Agent] Saved interruption message to chat history');
                } catch (saveError) {
                    logError('[Agent] Failed to save interruption message', saveError);
                }
            }

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
