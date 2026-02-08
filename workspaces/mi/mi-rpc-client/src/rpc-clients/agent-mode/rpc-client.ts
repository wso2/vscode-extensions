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
    UndoLastCheckpointRequest,
    UndoLastCheckpointResponse,
    ApplyCodeSegmentWithCheckpointRequest,
    ApplyCodeSegmentWithCheckpointResponse,
    UserQuestionResponse,
    PlanApprovalResponse,
    ChatHistoryEvent,
    sendAgentMessage,
    abortAgentGeneration,
    loadChatHistory,
    undoLastCheckpoint,
    applyCodeSegmentWithCheckpoint,
    respondToQuestion,
    respondToPlanApproval,
} from "@wso2/mi-core";
import { HOST_EXTENSION, RequestType } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

// Session management types (will be imported from @wso2/mi-core after build)
export interface SessionSummary {
    sessionId: string;
    title: string;
    createdAt: string;
    lastModifiedAt: string;
    messageCount: number;
    isCurrentSession: boolean;
}

export interface GroupedSessions {
    today: SessionSummary[];
    yesterday: SessionSummary[];
    pastWeek: SessionSummary[];
    older: SessionSummary[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
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
    lastTotalInputTokens?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CreateNewSessionRequest {
    // Empty - creates fresh session
}

export interface CreateNewSessionResponse {
    success: boolean;
    sessionId: string;
    error?: string;
}

export interface DeleteSessionRequest {
    sessionId: string;
}

export interface DeleteSessionResponse {
    success: boolean;
    error?: string;
}

// Session management RPC methods
const _prefix = "mi-agent-service";

const listSessions: RequestType<ListSessionsRequest, ListSessionsResponse> = {
    method: `${_prefix}/listSessions`
};

const switchSession: RequestType<SwitchSessionRequest, SwitchSessionResponse> = {
    method: `${_prefix}/switchSession`
};

const createNewSession: RequestType<CreateNewSessionRequest, CreateNewSessionResponse> = {
    method: `${_prefix}/createNewSession`
};

const deleteSession: RequestType<DeleteSessionRequest, DeleteSessionResponse> = {
    method: `${_prefix}/deleteSession`
};

// Compact RPC method
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CompactConversationRequest {
    // Empty - uses current session
}

export interface CompactConversationResponse {
    success: boolean;
    summary?: string;
    error?: string;
}

export type MentionablePathType = 'file' | 'folder';

export interface MentionablePathItem {
    path: string;
    type: MentionablePathType;
}

export interface SearchMentionablePathsRequest {
    query?: string;
    limit?: number;
}

export interface SearchMentionablePathsResponse {
    success: boolean;
    items: MentionablePathItem[];
    error?: string;
}

const compactConversation: RequestType<CompactConversationRequest, CompactConversationResponse> = {
    method: `${_prefix}/compactConversation`
};

const searchMentionablePaths: RequestType<SearchMentionablePathsRequest, SearchMentionablePathsResponse> = {
    method: `${_prefix}/searchMentionablePaths`
};

export class MiAgentPanelRpcClient implements MIAgentPanelAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    // ==================================
    // Agent Functions
    // ==================================
    sendAgentMessage(request: SendAgentMessageRequest): Promise<SendAgentMessageResponse> {
        return this._messenger.sendRequest(sendAgentMessage, HOST_EXTENSION, request);
    }

    abortAgentGeneration(): Promise<void> {
        return this._messenger.sendRequest(abortAgentGeneration, HOST_EXTENSION);
    }

    loadChatHistory(request: LoadChatHistoryRequest): Promise<LoadChatHistoryResponse> {
        return this._messenger.sendRequest(loadChatHistory, HOST_EXTENSION, request);
    }

    undoLastCheckpoint(request: UndoLastCheckpointRequest): Promise<UndoLastCheckpointResponse> {
        return this._messenger.sendRequest(undoLastCheckpoint, HOST_EXTENSION, request);
    }

    applyCodeSegmentWithCheckpoint(request: ApplyCodeSegmentWithCheckpointRequest): Promise<ApplyCodeSegmentWithCheckpointResponse> {
        return this._messenger.sendRequest(applyCodeSegmentWithCheckpoint, HOST_EXTENSION, request);
    }

    // ==================================
    // Plan Mode Functions
    // ==================================
    respondToQuestion(response: UserQuestionResponse): Promise<void> {
        return this._messenger.sendRequest(respondToQuestion, HOST_EXTENSION, response);
    }

    respondToPlanApproval(response: PlanApprovalResponse): Promise<void> {
        return this._messenger.sendRequest(respondToPlanApproval, HOST_EXTENSION, response);
    }

    // ==================================
    // Session Management Functions
    // ==================================
    listSessions(request: ListSessionsRequest): Promise<ListSessionsResponse> {
        return this._messenger.sendRequest(listSessions, HOST_EXTENSION, request);
    }

    switchSession(request: SwitchSessionRequest): Promise<SwitchSessionResponse> {
        return this._messenger.sendRequest(switchSession, HOST_EXTENSION, request);
    }

    createNewSession(request: CreateNewSessionRequest): Promise<CreateNewSessionResponse> {
        return this._messenger.sendRequest(createNewSession, HOST_EXTENSION, request);
    }

    deleteSession(request: DeleteSessionRequest): Promise<DeleteSessionResponse> {
        return this._messenger.sendRequest(deleteSession, HOST_EXTENSION, request);
    }

    // ==================================
    // Compact Functions
    // ==================================
    compactConversation(request: CompactConversationRequest): Promise<CompactConversationResponse> {
        return this._messenger.sendRequest(compactConversation, HOST_EXTENSION, request);
    }

    searchMentionablePaths(request: SearchMentionablePathsRequest): Promise<SearchMentionablePathsResponse> {
        return this._messenger.sendRequest(searchMentionablePaths, HOST_EXTENSION, request);
    }
}
