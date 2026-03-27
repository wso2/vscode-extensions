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

import { RequestType, NotificationType } from "vscode-messenger-common";
import {
    SendAgentMessageRequest,
    SendAgentMessageResponse,
    AgentEvent,
    LoadChatHistoryRequest,
    LoadChatHistoryResponse,
    UndoLastCheckpointRequest,
    UndoLastCheckpointResponse,
    ApplyCodeSegmentWithCheckpointRequest,
    ApplyCodeSegmentWithCheckpointResponse,
    PlanApprovalResponse,
    ListSessionsRequest,
    ListSessionsResponse,
    SwitchSessionRequest,
    SwitchSessionResponse,
    CreateNewSessionRequest,
    CreateNewSessionResponse,
    DeleteSessionRequest,
    DeleteSessionResponse,
    CompactConversationRequest,
    CompactConversationResponse,
    SearchMentionablePathsRequest,
    SearchMentionablePathsResponse,
} from "./types";

const _prefix = "mi-agent-service";

// Send a message to the agent
export const sendAgentMessage: RequestType<SendAgentMessageRequest, SendAgentMessageResponse> = {
    method: `${_prefix}/sendAgentMessage`
};

// Abort agent generation
export const abortAgentGeneration: RequestType<void, void> = {
    method: `${_prefix}/abortAgentGeneration`
};

// Load chat history
export const loadChatHistory: RequestType<LoadChatHistoryRequest, LoadChatHistoryResponse> = {
    method: `${_prefix}/loadChatHistory`
};

// Undo the latest checkpoint
export const undoLastCheckpoint: RequestType<UndoLastCheckpointRequest, UndoLastCheckpointResponse> = {
    method: `${_prefix}/undoLastCheckpoint`
};

// Apply legacy code block with a backend checkpoint
export const applyCodeSegmentWithCheckpoint: RequestType<ApplyCodeSegmentWithCheckpointRequest, ApplyCodeSegmentWithCheckpointResponse> = {
    method: `${_prefix}/applyCodeSegmentWithCheckpoint`
};

// Notification for agent streaming events
export const agentEvent: NotificationType<AgentEvent> = {
    method: `${_prefix}/agentEvent`
};

// ============================================================================
// Plan Mode RPC Methods
// ============================================================================

/**
 * User response to an ask_user question
 */
export interface UserQuestionResponse {
    questionId: string;
    answer: string;
}

// Respond to a user question
export const respondToQuestion: RequestType<UserQuestionResponse, void> = {
    method: `${_prefix}/respondToQuestion`
};

// Respond to plan approval request (approve or reject the plan)
export const respondToPlanApproval: RequestType<PlanApprovalResponse, void> = {
    method: `${_prefix}/respondToPlanApproval`
};

// ============================================================================
// Session Management RPC Methods
// ============================================================================

// List all sessions grouped by time
export const listSessions: RequestType<ListSessionsRequest, ListSessionsResponse> = {
    method: `${_prefix}/listSessions`
};

// Switch to a different session
export const switchSession: RequestType<SwitchSessionRequest, SwitchSessionResponse> = {
    method: `${_prefix}/switchSession`
};

// Create a new empty session
export const createNewSession: RequestType<CreateNewSessionRequest, CreateNewSessionResponse> = {
    method: `${_prefix}/createNewSession`
};

// Delete a session
export const deleteSession: RequestType<DeleteSessionRequest, DeleteSessionResponse> = {
    method: `${_prefix}/deleteSession`
};

// ============================================================================
// Compact RPC Method
// ============================================================================

// Manually compact/summarize the current conversation
export const compactConversation: RequestType<CompactConversationRequest, CompactConversationResponse> = {
    method: `${_prefix}/compactConversation`
};

// Search mentionable file/folder paths for @mentions in chat input
export const searchMentionablePaths: RequestType<SearchMentionablePathsRequest, SearchMentionablePathsResponse> = {
    method: `${_prefix}/searchMentionablePaths`
};
