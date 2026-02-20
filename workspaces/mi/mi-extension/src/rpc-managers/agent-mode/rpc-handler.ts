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

import { MessengerAPI } from "vscode-messenger-common";
import { MIAgentPanelRpcManager } from "./rpc-manager";
import {
    sendAgentMessage,
    abortAgentGeneration,
    loadChatHistory,
    undoLastCheckpoint,
    applyCodeSegmentWithCheckpoint,
    respondToQuestion,
    respondToPlanApproval,
    SendAgentMessageRequest,
    LoadChatHistoryRequest,
    UndoLastCheckpointRequest,
    ApplyCodeSegmentWithCheckpointRequest,
    UserQuestionResponse,
    PlanApprovalResponse,
    CompactConversationRequest,
    listSessions,
    switchSession,
    createNewSession,
    deleteSession,
    compactConversation,
    searchMentionablePaths,
    ListSessionsRequest,
    SwitchSessionRequest,
    CreateNewSessionRequest,
    DeleteSessionRequest,
    SearchMentionablePathsRequest,
} from "@wso2/mi-core";

const rpcManagerMap: Map<string, MIAgentPanelRpcManager> = new Map();

export function disposeMIAgentPanelRpcManager(projectUri: string): void {
    const rpcManager = rpcManagerMap.get(projectUri);
    if (rpcManager) {
        void rpcManager.abortAgentGeneration().catch((error) => {
            console.error(`[MIAgentPanelRpcHandler] Failed to abort manager for ${projectUri}:`, error);
        });
    }
    rpcManagerMap.delete(projectUri);
}

export function registerMIAgentPanelRpcHandlers(messenger: MessengerAPI, projectUri: string) {
    let rpcManager = rpcManagerMap.get(projectUri);
    if (!rpcManager) {
        rpcManager = new MIAgentPanelRpcManager(projectUri);
        rpcManagerMap.set(projectUri, rpcManager);
    }

    // ==================================
    // Agent Functions
    // ==================================
    messenger.onRequest(sendAgentMessage, (request: SendAgentMessageRequest) => rpcManager.sendAgentMessage(request));
    messenger.onRequest(abortAgentGeneration, () => rpcManager.abortAgentGeneration());
    messenger.onRequest(loadChatHistory, (request: LoadChatHistoryRequest) => rpcManager.loadChatHistory(request));
    messenger.onRequest(undoLastCheckpoint, (request: UndoLastCheckpointRequest) => rpcManager.undoLastCheckpoint(request));
    messenger.onRequest(
        applyCodeSegmentWithCheckpoint,
        (request: ApplyCodeSegmentWithCheckpointRequest) => rpcManager.applyCodeSegmentWithCheckpoint(request)
    );

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
