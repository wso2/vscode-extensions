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
    SendAgentMessageRequest,
    SendAgentMessageResponse,
    LoadChatHistoryRequest,
    LoadChatHistoryResponse,
    UserQuestionResponse,
    PlanApprovalResponse,
} from '@wso2/mi-core';
import { AgentEventHandler } from './event-handler';
import { executeAgent, createAgentAbortController, AgentEvent } from '../../ai-features/agent-mode';
import { logInfo, logError, logDebug } from '../../ai-features/copilot/logger';
import { ChatHistoryManager } from '../../ai-features/agent-mode/chat-history-manager';
import { PendingQuestion, PendingPlanApproval } from '../../ai-features/agent-mode/tools/plan_mode_tools';

export class MIAgentPanelRpcManager implements MIAgentPanelAPI {
    private eventHandler: AgentEventHandler;
    private currentAbortController: AbortController | null = null;
    private chatHistoryManager: ChatHistoryManager | null = null;
    private currentSessionId: string | null = null;

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
        }
    }

    /**
     * Send a message to the agent for processing
     */
    async sendAgentMessage(request: SendAgentMessageRequest): Promise<SendAgentMessageResponse> {
        try {
            logInfo(`[AgentPanel] Received message: ${request.message.substring(0, 100)}...`);

            // Get or create chat history manager
            const historyManager = await this.getChatHistoryManager();

            // Create abort controller for this request
            this.currentAbortController = createAgentAbortController();

            const result = await executeAgent(
                {
                    query: request.message,
                    projectPath: this.projectUri,
                    sessionId: this.currentSessionId || undefined,
                    abortSignal: this.currentAbortController.signal,
                    chatHistoryManager: historyManager,
                    pendingQuestions: this.pendingQuestions,
                    pendingApprovals: this.pendingApprovals
                },
                (event: AgentEvent) => {
                    // Forward events to the visualizer
                    this.eventHandler.handleEvent(event);
                }
            );

            // Clean up abort controller
            this.currentAbortController = null;

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

            // Get messages from history manager (reads from JSONL)
            const messages = await historyManager.getMessages();

            // Convert to UI events on-the-fly
            const events = ChatHistoryManager.convertToEventFormat(messages);

            logInfo(`[AgentPanel] Loaded ${messages.length} messages, generated ${events.length} events`);

            return {
                success: true,
                sessionId: this.currentSessionId,
                events
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
}
