/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
    MIAIPanelAPI,
    GetBackendRootUrlResponse,
    getBackendRootUrl,
    GenerateSuggestionsRequest,
    GenerateSuggestionsResponse,
    generateSuggestions,
    GenerateCodeRequest,
    GenerateCodeResponse,
    generateCode
} from "@wso2/mi-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class MiAiPanelRpcClient implements MIAIPanelAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    // ==================================
    // General Functions
    // ==================================
    getBackendRootUrl(): Promise<GetBackendRootUrlResponse> {
        return this._messenger.sendRequest(getBackendRootUrl, HOST_EXTENSION);
    }

    // ==================================
    // AI Functions
    // ==================================
    generateSuggestions(request: GenerateSuggestionsRequest): Promise<GenerateSuggestionsResponse> {
        return this._messenger.sendRequest(generateSuggestions, HOST_EXTENSION, request);
    }

    generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
        return this._messenger.sendRequest(generateCode, HOST_EXTENSION, request);
    }

}
