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

import { MessengerAPI, RequestType } from "vscode-messenger-common";
import {
    MIAgentPanelRpcManager,
    ListSessionsRequest,
    ListSessionsResponse,
    SwitchSessionRequest,
    SwitchSessionResponse,
    CreateNewSessionRequest,
    CreateNewSessionResponse,
    DeleteSessionRequest,
    DeleteSessionResponse,
    SearchMentionablePathsRequest,
    SearchMentionablePathsResponse,
} from "./rpc-manager";
import {
    sendAgentMessage,
    abortAgentGeneration,
    loadChatHistory,
    respondToQuestion,
    respondToPlanApproval,
    SendAgentMessageRequest,
    LoadChatHistoryRequest,
    UserQuestionResponse,
    PlanApprovalResponse,
    CompactConversationRequest,
} from "@wso2/mi-core";

// Session management RPC methods (will be imported from @wso2/mi-core after build)
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

const compactConversation: RequestType<CompactConversationRequest, any> = {
    method: `${_prefix}/compactConversation`
};

const searchMentionablePaths: RequestType<SearchMentionablePathsRequest, SearchMentionablePathsResponse> = {
    method: `${_prefix}/searchMentionablePaths`
};

// Singleton manager to maintain pending questions state across requests
let rpcManagerInstance: MIAgentPanelRpcManager | null = null;

export function registerMIAgentPanelRpcHandlers(messenger: MessengerAPI, projectUri: string) {
    // Create or reuse manager instance
    if (!rpcManagerInstance || rpcManagerInstance.getProjectUri() !== projectUri) {
        rpcManagerInstance = new MIAgentPanelRpcManager(projectUri);
    }
    const rpcManager = rpcManagerInstance;

    // ==================================
    // Agent Functions
    // ==================================
    messenger.onRequest(sendAgentMessage, (request: SendAgentMessageRequest) => rpcManager.sendAgentMessage(request));
    messenger.onRequest(abortAgentGeneration, () => rpcManager.abortAgentGeneration());
    messenger.onRequest(loadChatHistory, (request: LoadChatHistoryRequest) => rpcManager.loadChatHistory(request));

    // ==================================
    // Plan Mode Functions
    // ==================================
    messenger.onRequest(respondToQuestion, (request: UserQuestionResponse) => rpcManager.respondToQuestion(request));
    messenger.onRequest(respondToPlanApproval, (request: PlanApprovalResponse) => rpcManager.respondToPlanApproval(request));

    // ==================================
    // Session Management Functions
    // ==================================
    messenger.onRequest(listSessions, (request: ListSessionsRequest) => rpcManager.listSessions(request));
    messenger.onRequest(switchSession, (request: SwitchSessionRequest) => rpcManager.switchSession(request));
    messenger.onRequest(createNewSession, (request: CreateNewSessionRequest) => rpcManager.createNewSession(request));
    messenger.onRequest(deleteSession, (request: DeleteSessionRequest) => rpcManager.deleteSession(request));

    // ==================================
    // Compact Functions
    // ==================================
    messenger.onRequest(compactConversation, (request: CompactConversationRequest) => rpcManager.compactConversation(request));

    // ==================================
    // Mention Search Functions
    // ==================================
    messenger.onRequest(searchMentionablePaths, (request: SearchMentionablePathsRequest) =>
        rpcManager.searchMentionablePaths(request)
    );
}
