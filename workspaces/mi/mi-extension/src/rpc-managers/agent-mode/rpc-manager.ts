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
    LoadChatHistoryResponse
} from '@wso2/mi-core';
import { AgentEventHandler } from './event-handler';
import { executeAgent, createAgentAbortController, AgentEvent } from '../../ai-features/agent-mode';
import { logInfo, logError, logDebug } from '../../ai-features/copilot/logger';
import { ChatHistoryManager } from '../../ai-features/agent-mode/chat-history-manager';

export class MIAgentPanelRpcManager implements MIAgentPanelAPI {
    private eventHandler: AgentEventHandler;
    private currentAbortController: AbortController | null = null;
    private chatHistoryManager: ChatHistoryManager | null = null;
    private currentSessionId: string | null = null;

    constructor(private projectUri: string) {
        this.eventHandler = new AgentEventHandler(projectUri);
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
                    chatHistoryManager: historyManager
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
     * Load chat history from the current session
     */
    async loadChatHistory(_request: LoadChatHistoryRequest): Promise<LoadChatHistoryResponse> {
        try {
            // Initialize chat history manager (finds latest session or creates new)
            await this.getChatHistoryManager();

            // If still no session, return empty
            if (!this.currentSessionId) {
                logDebug('[AgentPanel] No active session, returning empty chat history');
                return {
                    success: true,
                    messages: []
                };
            }

            logInfo(`[AgentPanel] Loading chat history from session: ${this.currentSessionId}`);

            // Load entries from JSONL file
            const entries = await ChatHistoryManager.loadSession(this.projectUri, this.currentSessionId);

            // Convert to UI format
            const messages = ChatHistoryManager.convertToUIFormat(entries);

            logInfo(`[AgentPanel] Loaded ${messages.length} messages from chat history`);

            return {
                success: true,
                sessionId: this.currentSessionId,
                messages
            };
        } catch (error) {
            logError('[AgentPanel] Failed to load chat history', error);
            return {
                success: false,
                messages: [],
                error: error instanceof Error ? error.message : 'Failed to load chat history'
            };
        }
    }
}
