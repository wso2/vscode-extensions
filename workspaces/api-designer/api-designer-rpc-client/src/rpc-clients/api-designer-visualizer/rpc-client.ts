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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    APIDesignerVisualizerAPI,
    GetAPISpecContentRequest,
    GetAPISpecContentResponse,
    OpenViewRequest,
    WriteAPISpecContentRequest,
    WriteAPISpecContentResponse,
    getAPISpecContent,
    importJSON,
    openView,
    writeAPISpecContent,
    Schema,
    GetGovernanceRequest,
    GetGovernanceResponse,
    ValidateAPISpecRequest,
    ValidateAPISpecResponse,
    FetchRulesetsFromFolderRequest,
    FetchRulesetsFromFolderResponse,
    GetApplicableRulesetsRequest,
    GetApplicableRulesetsResponse,
    ReadFileRequest,
    ReadFileResponse,
    WriteFileRequest,
    WriteFileResponse,
    DeleteFileRequest,
    DeleteFileResponse,
    GetWorkspaceFileTreeRequest,
    GetWorkspaceFileTreeResponse,
    CheckAIAvailabilityRequest,
    CheckAIAvailabilityResponse,
    getGovernance,
    validateApiSpec,
    fetchRulesetsFromFolder,
    getApplicableRulesets,
    readFile,
    writeFile,
    deleteFile,
    getWorkspaceFileTree,
    checkAIAvailability,
    getAllSpectralRulesets,
    GetAllSpectralRulesetsRequest,
    GetAllSpectralRulesetsResponse,
} from "@wso2/api-designer-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class ApiDesignerVisualizerRpcClient implements APIDesignerVisualizerAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    openView(params: OpenViewRequest): void {
        return this._messenger.sendNotification(openView, HOST_EXTENSION, params);
    }

    getAPISpecContent(params: GetAPISpecContentRequest): Promise<GetAPISpecContentResponse> {
        return this._messenger.sendRequest(getAPISpecContent, HOST_EXTENSION, params);
    }

    writeAPISpecContent(params: WriteAPISpecContentRequest): Promise<WriteAPISpecContentResponse> {
        return this._messenger.sendRequest(writeAPISpecContent, HOST_EXTENSION, params);
    }

    importJSON(): Promise<Schema | undefined> {
        return this._messenger.sendRequest(importJSON, HOST_EXTENSION);
    }

    getGovernance(params: GetGovernanceRequest): Promise<GetGovernanceResponse> {
        return this._messenger.sendRequest(getGovernance, HOST_EXTENSION, params);
    }

    validateApiSpec(params: ValidateAPISpecRequest): Promise<ValidateAPISpecResponse> {
        return this._messenger.sendRequest(validateApiSpec, HOST_EXTENSION, params);
    }

    fetchRulesetsFromFolder(params: FetchRulesetsFromFolderRequest): Promise<FetchRulesetsFromFolderResponse> {
        return this._messenger.sendRequest(fetchRulesetsFromFolder, HOST_EXTENSION, params);
    }

    getApplicableRulesets(params: GetApplicableRulesetsRequest): Promise<GetApplicableRulesetsResponse> {
        return this._messenger.sendRequest(getApplicableRulesets, HOST_EXTENSION, params);
    }

    readFile(params: ReadFileRequest): Promise<ReadFileResponse> {
        return this._messenger.sendRequest(readFile, HOST_EXTENSION, params);
    }

    writeFile(params: WriteFileRequest): Promise<WriteFileResponse> {
        return this._messenger.sendRequest(writeFile, HOST_EXTENSION, params);
    }

    deleteFile(params: DeleteFileRequest): Promise<DeleteFileResponse> {
        return this._messenger.sendRequest(deleteFile, HOST_EXTENSION, params);
    }

    getWorkspaceFileTree(params: GetWorkspaceFileTreeRequest): Promise<GetWorkspaceFileTreeResponse> {
        return this._messenger.sendRequest(getWorkspaceFileTree, HOST_EXTENSION, params);
    }

    checkAIAvailability(params: CheckAIAvailabilityRequest): Promise<CheckAIAvailabilityResponse> {
        return this._messenger.sendRequest(checkAIAvailability, HOST_EXTENSION, params);
    }

    getAllSpectralRulesets(params: GetAllSpectralRulesetsRequest): Promise<GetAllSpectralRulesetsResponse> {
        return this._messenger.sendRequest(getAllSpectralRulesets, HOST_EXTENSION, params);
    }

}
