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
    sendAgentMessage,
    abortAgentGeneration,
    loadChatHistory,
    respondToQuestion,
    respondToPlanApproval,
} from "@wso2/mi-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

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

    // ==================================
    // Plan Mode Functions
    // ==================================
    respondToQuestion(response: UserQuestionResponse): Promise<void> {
        return this._messenger.sendRequest(respondToQuestion, HOST_EXTENSION, response);
    }

    respondToPlanApproval(response: PlanApprovalResponse): Promise<void> {
        return this._messenger.sendRequest(respondToPlanApproval, HOST_EXTENSION, response);
    }
}
