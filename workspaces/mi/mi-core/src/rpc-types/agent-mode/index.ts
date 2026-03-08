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

// Export types
export type {
    AgentMode,
    SendAgentMessageRequest,
    SendAgentMessageResponse,
    ChangedFileSummary,
    UndoCheckpointSummary,
    UndoLastCheckpointRequest,
    UndoLastCheckpointResponse,
    ApplyCodeSegmentWithCheckpointRequest,
    ApplyCodeSegmentWithCheckpointResponse,
    AgentEvent,
    AgentEventType,
    MIAgentPanelAPI,
    ChatHistoryEvent,
    LoadChatHistoryRequest,
    LoadChatHistoryResponse,
    // Plan mode types
    TodoStatus,
    TodoItem,
    PlanApprovalKind,
    PlanApprovalRequestedEvent,
    PlanApprovalResponse,
    // Session management types
    SessionMetadata,
    SessionSummary,
    GroupedSessions,
    ListSessionsRequest,
    ListSessionsResponse,
    SwitchSessionRequest,
    SwitchSessionResponse,
    CreateNewSessionRequest,
    CreateNewSessionResponse,
    DeleteSessionRequest,
    DeleteSessionResponse,
    // Compact types
    CompactConversationRequest,
    CompactConversationResponse,
    // Mention search types
    MentionablePathType,
    MentionablePathItem,
    SearchMentionablePathsRequest,
    SearchMentionablePathsResponse,
} from './types';

// Export RPC type definitions
export {
    sendAgentMessage,
    abortAgentGeneration,
    loadChatHistory,
    undoLastCheckpoint,
    applyCodeSegmentWithCheckpoint,
    agentEvent,
    // Plan mode RPC
    respondToQuestion,
    respondToPlanApproval,
    // Session management RPC
    listSessions,
    switchSession,
    createNewSession,
    deleteSession,
    // Compact RPC
    compactConversation,
    // Mention search RPC
    searchMentionablePaths,
} from './rpc-type';

// Export RPC request/response types
export type { UserQuestionResponse } from './rpc-type';
