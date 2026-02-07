/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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

import {
    MIAgentPanelAPI,
    AgentMode,
    SendAgentMessageRequest,
    SendAgentMessageResponse,
    LoadChatHistoryRequest,
    LoadChatHistoryResponse,
    UserQuestionResponse,
    PlanApprovalResponse,
    ChatHistoryEvent,
    CompactConversationRequest,
    CompactConversationResponse,
} from '@wso2/mi-core';
import { AgentEventHandler } from './event-handler';
import { executeAgent, createAgentAbortController, AgentEvent } from '../../ai-features/agent-mode';
import { executeCompactAgent } from '../../ai-features/agent-mode/agents/compact/agent';
import { logInfo, logError, logDebug } from '../../ai-features/copilot/logger';
import { ChatHistoryManager, GroupedSessions } from '../../ai-features/agent-mode/chat-history-manager';
import { PendingQuestion, PendingPlanApproval, initializePlanModeSession } from '../../ai-features/agent-mode/tools/plan_mode_tools';
import { validateAttachments } from '../../ai-features/agent-mode/attachment-utils';

// Low threshold for initial auto-compact testing.
const AUTO_COMPACT_TOKEN_THRESHOLD = 6000;
const AUTO_COMPACT_TOOL_NAME = 'compact_conversation';
const DEFAULT_AGENT_MODE: AgentMode = 'edit';

// Session management types (will be imported from @wso2/mi-core after build)
export interface ListSessionsRequest {
    // Empty - uses project from context
}

export interface ListSessionsResponse {
    success: boolean;
    sessions: GroupedSessions;
    currentSessionId?: string;
    error?: string;
}

export interface SwitchSessionRequest {
    sessionId: string;
}

export interface SwitchSessionResponse {
    success: boolean;
    sessionId: string;
    events: ChatHistoryEvent[];
    error?: string;
    mode?: AgentMode;
    lastTotalInputTokens?: number;
}

export interface CreateNewSessionRequest {
    // Empty - creates fresh session
}

export interface CreateNewSessionResponse {
    success: boolean;
    sessionId: string;
    mode?: AgentMode;
    error?: string;
}

export interface DeleteSessionRequest {
    sessionId: string;
}

export interface DeleteSessionResponse {
    success: boolean;
    error?: string;
}

export class MIAgentPanelRpcManager implements MIAgentPanelAPI {
    private eventHandler: AgentEventHandler;
    private currentAbortController: AbortController | null = null;
    private chatHistoryManager: ChatHistoryManager | null = null;
    private currentSessionId: string | null = null;
    private currentMode: AgentMode = DEFAULT_AGENT_MODE;

    // Map to track pending questions from ask_user tool
    private pendingQuestions: Map<string, PendingQuestion> = new Map();

    // Map to track pending plan approvals from exit_plan_mode tool
    private pendingApprovals: Map<string, PendingPlanApproval> = new Map();

    constructor(private projectUri: string) {
        this.eventHandler = new AgentEventHandler(projectUri);
    }

    /**
     * Get the project URI
     */
    getProjectUri(): string {
        return this.projectUri;
    }

    /**
     * Get the pending questions map (for use by agent tools)
     */
    getPendingQuestions(): Map<string, PendingQuestion> {
        return this.pendingQuestions;
    }

    /**
     * Detect context-window related model errors from AI SDK / provider messages.
     */
    private isContextLimitError(errorMessage?: string): boolean {
        if (!errorMessage) {
            return false;
        }

        const normalized = errorMessage.toLowerCase();
        return (
            normalized.includes('context window') ||
            normalized.includes('context length') ||
            normalized.includes('maximum context length') ||
            normalized.includes('prompt is too long') ||
            normalized.includes('input is too long') ||
            normalized.includes('too many tokens') ||
            normalized.includes('max input tokens')
        );
    }

    /**
     * Run compact agent, save checkpoint, and emit compact/usage events.
     */
    private async runAutoCompact(
        historyManager: ChatHistoryManager,
        reason: 'threshold' | 'context_error'
    ): Promise<boolean> {
        this.eventHandler.handleEvent({
            type: 'tool_call',
            toolName: AUTO_COMPACT_TOOL_NAME,
            loadingAction: 'compacting conversation',
            toolInput: {},
        });

        const messagesForCompact = await historyManager.getMessages({ includeCompactSummaryEntry: true });
        if (messagesForCompact.length === 0) {
            logDebug(`[AgentPanel] Skipping auto compact (${reason}): no messages`);
            this.eventHandler.handleEvent({
                type: 'tool_result',
                toolName: AUTO_COMPACT_TOOL_NAME,
                toolOutput: { success: false },
                completedAction: 'failed to compact conversation',
            });
            return false;
        }

        const compactResult = await executeCompactAgent({
            messages: messagesForCompact,
            trigger: 'auto',
            projectPath: this.projectUri,
        });

        if (!compactResult.success || !compactResult.summary) {
            logError(`[AgentPanel] Auto compact failed (${reason}): ${compactResult.error || 'unknown error'}`);
            this.eventHandler.handleEvent({
                type: 'tool_result',
                toolName: AUTO_COMPACT_TOOL_NAME,
                toolOutput: { success: false },
                completedAction: 'failed to compact conversation',
            });
            return false;
        }

        await historyManager.saveSummaryMessage(compactResult.summary);
        this.eventHandler.handleEvent({
            type: 'compact',
            summary: compactResult.summary,
            content: compactResult.summary,
        });
        // Reset usage indicator after checkpoint.
        this.eventHandler.handleEvent({
            type: 'usage',
            totalInputTokens: 0,
        });

        logInfo(`[AgentPanel] Auto compact complete (${reason}): ${compactResult.summary.length} chars`);
        return true;
    }

    /**
     * Initialize or get existing chat history manager
     */
    private async getChatHistoryManager(): Promise<ChatHistoryManager> {
        if (!this.chatHistoryManager) {
            // Find existing sessions for this project
            const existingSessions = await ChatHistoryManager.listSessions(this.projectUri);

            // Use latest session if exists, otherwise create new
            const sessionId = existingSessions.length > 0 ? existingSessions[0] : undefined;

            this.chatHistoryManager = new ChatHistoryManager(this.projectUri, sessionId);
            await this.chatHistoryManager.initialize();
            this.currentSessionId = this.chatHistoryManager.getSessionId();
            this.currentMode = await this.chatHistoryManager.getLatestMode(DEFAULT_AGENT_MODE);

            if (sessionId) {
                logInfo(`[AgentPanel] Continuing existing session: ${this.currentSessionId}`);
            } else {
                logInfo(`[AgentPanel] Created new chat session: ${this.currentSessionId}`);
            }
        }
        return this.chatHistoryManager;
    }

    /**
     * Close current chat history session
     */
    private async closeChatHistory(): Promise<void> {
        if (this.chatHistoryManager) {
            await this.chatHistoryManager.close();
            logInfo(`[AgentPanel] Closed chat session: ${this.currentSessionId}`);
            this.chatHistoryManager = null;
            this.currentSessionId = null;
            this.currentMode = DEFAULT_AGENT_MODE;
        }
    }

    /**
     * Send a message to the agent for processing
     */
    async sendAgentMessage(request: SendAgentMessageRequest): Promise<SendAgentMessageResponse> {
        try {
            logInfo(`[AgentPanel] Received message: ${request.message.substring(0, 100)}...`);

            // Fail fast if attachments are invalid (same behavior as legacy copilot flow)
            const validationWarnings = validateAttachments(request.files, request.images);
            if (validationWarnings.length > 0) {
                const errorMessage = `Cannot proceed with agent request. Invalid attachments: ${validationWarnings.join('; ')}`;
                logError(`[AgentPanel] ${errorMessage}`);
                return {
                    success: false,
                    error: errorMessage
                };
            }

            // Get or create chat history manager
            const historyManager = await this.getChatHistoryManager();
            const effectiveMode = request.mode || this.currentMode || DEFAULT_AGENT_MODE;
            if (effectiveMode !== this.currentMode) {
                if (effectiveMode === 'plan' && this.currentSessionId) {
                    await initializePlanModeSession(this.projectUri, this.currentSessionId, { forceBaselineReset: true });
                }
                await historyManager.saveModeChange(effectiveMode);
                this.currentMode = effectiveMode;
            }

            // Auto-compact before the new run when context usage exceeds threshold.
            // We compact between runs (not mid-stream) to keep AI SDK orchestration stable.
            const lastUsage = await historyManager.getLastUsage();
            const shouldAutoCompact = lastUsage !== undefined && lastUsage >= AUTO_COMPACT_TOKEN_THRESHOLD;
            if (shouldAutoCompact) {
                logInfo(`[AgentPanel] Auto compact triggered at ${lastUsage} tokens (threshold: ${AUTO_COMPACT_TOKEN_THRESHOLD})`);
                await this.runAutoCompact(historyManager, 'threshold');
            }

            // Use these flags to recover from context-limit failures once per request.
            let suppressedContextErrorFromStream = false;
            let retriedAfterContextCompact = false;
            const persistModeChange = (mode: AgentMode) => {
                if (this.currentMode === mode) {
                    return;
                }
                this.currentMode = mode;
                historyManager.saveModeChange(mode).catch((error) => {
                    logError(`[AgentPanel] Failed to persist mode change to '${mode}'`, error);
                });
            };

            const runAgentOnce = async () => {
                const abortController = createAgentAbortController();
                this.currentAbortController = abortController;

                try {
                    return await executeAgent(
                        {
                            query: request.message,
                            mode: effectiveMode,
                            files: request.files,
                            images: request.images,
                            thinking: request.thinking,
                            projectPath: this.projectUri,
                            sessionId: this.currentSessionId || undefined,
                            abortSignal: abortController.signal,
                            chatHistoryManager: historyManager,
                            pendingQuestions: this.pendingQuestions,
                            pendingApprovals: this.pendingApprovals
                        },
                        (event: AgentEvent) => {
                            if (event.type === 'plan_mode_entered') {
                                persistModeChange('plan');
                            } else if (event.type === 'plan_mode_exited') {
                                persistModeChange('edit');
                            }

                            // When context is exceeded, suppress the immediate error event,
                            // compact, and retry once for seamless UX.
                            if (event.type === 'error' && this.isContextLimitError(event.error)) {
                                suppressedContextErrorFromStream = true;
                                logInfo('[AgentPanel] Suppressed context-limit error event; attempting compact-and-retry');
                                return;
                            }
                            this.eventHandler.handleEvent(event);
                        }
                    );
                } finally {
                    this.currentAbortController = null;
                }
            };

            let result = await runAgentOnce();

            const hitContextLimit = () =>
                suppressedContextErrorFromStream || this.isContextLimitError(result.error);

            if (!result.success && hitContextLimit() && !retriedAfterContextCompact) {
                retriedAfterContextCompact = true;
                logInfo('[AgentPanel] Context limit reached mid-run. Triggering auto compact and retrying once');

                const compacted = await this.runAutoCompact(historyManager, 'context_error');
                if (compacted) {
                    suppressedContextErrorFromStream = false;
                    result = await runAgentOnce();
                }
            }

            // If context-limit error was suppressed but we still failed, surface it now.
            if (!result.success && (suppressedContextErrorFromStream || this.isContextLimitError(result.error))) {
                this.eventHandler.handleEvent({
                    type: 'error',
                    error: result.error || 'Context window exceeded',
                });
            }

            if (result.success) {
                logInfo(`[AgentPanel] Agent completed successfully. Modified ${result.modifiedFiles.length} files.`);
                return {
                    success: true,
                    message: 'Agent completed successfully',
                    modifiedFiles: result.modifiedFiles,
                    modelMessages: result.modelMessages
                };
            } else {
                logError(`[AgentPanel] Agent failed: ${result.error}`);
                return {
                    success: false,
                    error: result.error,
                    modelMessages: result.modelMessages // Return partial messages even on error
                };
            }
        } catch (error) {
            logError('[AgentPanel] Error executing agent', error);
            this.currentAbortController = null;
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Abort the current agent generation
     */
    async abortAgentGeneration(): Promise<void> {
        if (this.currentAbortController) {
            logInfo('[AgentPanel] Aborting agent generation...');
            this.currentAbortController.abort();
            this.currentAbortController = null;
        } else {
            logDebug('[AgentPanel] No active agent generation to abort');
        }
    }

    /**
     * Respond to an ask_user question
     * This resolves the pending promise in the ask_user tool
     */
    async respondToQuestion(response: UserQuestionResponse): Promise<void> {
        const { questionId, answer } = response;
        logInfo(`[AgentPanel] Received response for question: ${questionId}`);

        const pending = this.pendingQuestions.get(questionId);
        if (pending) {
            logDebug(`[AgentPanel] Resolving pending question: ${questionId}`);
            pending.resolve(answer);
            // Note: The pendingQuestions.delete is handled in the resolve callback
        } else {
            logError(`[AgentPanel] No pending question found for ID: ${questionId}`);
        }
    }

    /**
     * Respond to a plan approval request (approve or reject the plan)
     * This resolves the pending promise in the exit_plan_mode tool
     */
    async respondToPlanApproval(response: PlanApprovalResponse): Promise<void> {
        const { approvalId, approved, feedback } = response;
        logInfo(`[AgentPanel] Received plan approval response: ${approvalId}, approved: ${approved}`);

        const pending = this.pendingApprovals.get(approvalId);
        if (pending) {
            logDebug(`[AgentPanel] Resolving pending plan approval: ${approvalId}`);
            pending.resolve({ approved, feedback });
            // Note: The pendingApprovals.delete is handled in the resolve callback
        } else {
            logError(`[AgentPanel] No pending plan approval found for ID: ${approvalId}`);
        }
    }

    /**
     * Load chat history from the current session
     */
    async loadChatHistory(_request: LoadChatHistoryRequest): Promise<LoadChatHistoryResponse> {
        try {
            // Initialize chat history manager (finds latest session or creates new)
            const historyManager = await this.getChatHistoryManager();

            // If still no session, return empty
            if (!this.currentSessionId) {
                logDebug('[AgentPanel] No active session, returning empty chat history');
                return {
                    success: true,
                    events: []
                };
            }

            logInfo(`[AgentPanel] Loading chat history from session: ${this.currentSessionId}`);

            // Get messages from JSONL for UI replay (includes compact_summary checkpoint entry).
            const messages = await historyManager.getMessages({ includeCompactSummaryEntry: true });

            // Convert to UI events on-the-fly
            const events = ChatHistoryManager.convertToEventFormat(messages);

            // Get last known token usage for context indicator
            const lastTotalInputTokens = await historyManager.getLastUsage();
            this.currentMode = await historyManager.getLatestMode(DEFAULT_AGENT_MODE);

            logInfo(`[AgentPanel] Loaded ${messages.length} messages, generated ${events.length} events`);

            return {
                success: true,
                sessionId: this.currentSessionId,
                events,
                mode: this.currentMode,
                lastTotalInputTokens,
            };
        } catch (error) {
            logError('[AgentPanel] Failed to load chat history', error);
            return {
                success: false,
                events: [],
                error: error instanceof Error ? error.message : 'Failed to load chat history'
            };
        }
    }

    // ============================================================================
    // Session Management
    // ============================================================================

    /**
     * List all sessions with metadata, grouped by time
     */
    async listSessions(_request: ListSessionsRequest): Promise<ListSessionsResponse> {
        try {
            logInfo('[AgentPanel] Listing sessions...');

            const sessions = await ChatHistoryManager.listSessionsWithMetadata(
                this.projectUri,
                this.currentSessionId || undefined
            );

            const totalCount = sessions.today.length + sessions.yesterday.length +
                sessions.pastWeek.length + sessions.older.length;
            logInfo(`[AgentPanel] Found ${totalCount} sessions`);

            return {
                success: true,
                sessions,
                currentSessionId: this.currentSessionId || undefined
            };
        } catch (error) {
            logError('[AgentPanel] Failed to list sessions', error);
            return {
                success: false,
                sessions: { today: [], yesterday: [], pastWeek: [], older: [] },
                error: error instanceof Error ? error.message : 'Failed to list sessions'
            };
        }
    }

    /**
     * Switch to a different session
     */
    async switchSession(request: SwitchSessionRequest): Promise<SwitchSessionResponse> {
        try {
            const { sessionId } = request;
            logInfo(`[AgentPanel] Switching to session: ${sessionId}`);

            // Don't switch if already on this session
            if (this.currentSessionId === sessionId) {
                logDebug('[AgentPanel] Already on requested session');
                const historyManager = await this.getChatHistoryManager();
                const messages = await historyManager.getMessages({ includeCompactSummaryEntry: true });
                const events = ChatHistoryManager.convertToEventFormat(messages);
                const lastTotalInputTokens = await historyManager.getLastUsage();
                const mode = await historyManager.getLatestMode(DEFAULT_AGENT_MODE);
                this.currentMode = mode;
                return {
                    success: true,
                    sessionId,
                    events,
                    mode,
                    lastTotalInputTokens,
                };
            }

            // Close current session
            await this.closeChatHistory();

            // Open the requested session
            this.chatHistoryManager = new ChatHistoryManager(this.projectUri, sessionId);
            await this.chatHistoryManager.initialize();
            this.currentSessionId = sessionId;
            this.currentMode = await this.chatHistoryManager.getLatestMode(DEFAULT_AGENT_MODE);

            // Load history from the new session
            const messages = await this.chatHistoryManager.getMessages({ includeCompactSummaryEntry: true });
            const events = ChatHistoryManager.convertToEventFormat(messages);

            // Get last known token usage for context indicator
            const lastTotalInputTokens = await this.chatHistoryManager.getLastUsage();

            logInfo(`[AgentPanel] Switched to session: ${sessionId}, loaded ${events.length} events`);

            return {
                success: true,
                sessionId,
                events,
                mode: this.currentMode,
                lastTotalInputTokens,
            };
        } catch (error) {
            logError('[AgentPanel] Failed to switch session', error);
            return {
                success: false,
                sessionId: request.sessionId,
                events: [],
                error: error instanceof Error ? error.message : 'Failed to switch session'
            };
        }
    }

    /**
     * Create a new empty session
     */
    async createNewSession(_request: CreateNewSessionRequest): Promise<CreateNewSessionResponse> {
        try {
            logInfo('[AgentPanel] Creating new session...');

            // Close current session if exists
            await this.closeChatHistory();

            // Create new session (no sessionId = new UUID)
            this.chatHistoryManager = new ChatHistoryManager(this.projectUri);
            await this.chatHistoryManager.initialize();
            this.currentSessionId = this.chatHistoryManager.getSessionId();
            this.currentMode = DEFAULT_AGENT_MODE;

            logInfo(`[AgentPanel] Created new session: ${this.currentSessionId}`);

            return {
                success: true,
                sessionId: this.currentSessionId,
                mode: this.currentMode,
            };
        } catch (error) {
            logError('[AgentPanel] Failed to create new session', error);
            return {
                success: false,
                sessionId: '',
                error: error instanceof Error ? error.message : 'Failed to create new session'
            };
        }
    }

    /**
     * Delete a session
     */
    async deleteSession(request: DeleteSessionRequest): Promise<DeleteSessionResponse> {
        try {
            const { sessionId } = request;
            logInfo(`[AgentPanel] Deleting session: ${sessionId}`);

            // Prevent deleting current session
            if (this.currentSessionId === sessionId) {
                return {
                    success: false,
                    error: 'Cannot delete the current active session. Switch to another session first.'
                };
            }

            // Delete the session
            await ChatHistoryManager.deleteSession(this.projectUri, sessionId);

            logInfo(`[AgentPanel] Deleted session: ${sessionId}`);

            return {
                success: true
            };
        } catch (error) {
            logError('[AgentPanel] Failed to delete session', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete session'
            };
        }
    }

    // ============================================================================
    // Manual Compact
    // ============================================================================

    /**
     * Manually compact/summarize the current conversation.
     * Reads all messages from the current session, runs the summarization sub-agent,
     * saves the summary as a JSONL checkpoint, and returns it.
     */
    async compactConversation(_request: CompactConversationRequest): Promise<CompactConversationResponse> {
        try {
            logInfo('[AgentPanel] Manual compact requested');

            // Get chat history manager (must have an active session)
            const historyManager = await this.getChatHistoryManager();
            const messages = await historyManager.getMessages({ includeCompactSummaryEntry: true });

            if (messages.length === 0) {
                return {
                    success: false,
                    error: 'No conversation to compact'
                };
            }

            logInfo(`[AgentPanel] Compacting ${messages.length} messages...`);

            // Run compact agent (sends full conversation + system-reminder to Haiku)
            const result = await executeCompactAgent({
                messages,
                trigger: 'user',
                projectPath: this.projectUri,
            });

            if (!result.success || !result.summary) {
                logError(`[AgentPanel] Manual compact failed: ${result.error || 'unknown error'}`);
                return {
                    success: false,
                    error: result.error || 'Summarization failed'
                };
            }

            // Save compact summary to JSONL (checkpoint)
            await historyManager.saveSummaryMessage(result.summary);

            // Emit compact event to UI via event handler
            this.eventHandler.handleEvent({
                type: 'compact',
                summary: result.summary,
                content: result.summary,
            });
            this.eventHandler.handleEvent({
                type: 'usage',
                totalInputTokens: 0,
            });

            logInfo(`[AgentPanel] Manual compact complete: ${result.summary.length} chars`);

            return {
                success: true,
                summary: result.summary,
            };
        } catch (error) {
            logError('[AgentPanel] Failed to compact conversation', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to compact conversation'
            };
        }
    }
}
