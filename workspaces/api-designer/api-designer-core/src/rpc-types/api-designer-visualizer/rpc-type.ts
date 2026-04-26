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
    OpenViewRequest,
    GetAPISpecContentRequest,
    GetAPISpecContentResponse,
    WriteAPISpecContentResponse,
    WriteAPISpecContentRequest,
    GetGovernanceRequest,
    GetGovernanceResponse,
    FileChangedNotification,
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
    DocumentFileChangedNotification,
    CheckAIAvailabilityRequest,
    CheckAIAvailabilityResponse,
    GetAllSpectralRulesetsRequest,
    GetAllSpectralRulesetsResponse,
} from "./types";



import { NotificationType, RequestType } from "vscode-messenger-common";

const _preFix = "api-designer-visualizer";

// API Designer Related RPC Types
export const openView: NotificationType<OpenViewRequest> = { method: `${_preFix}/openView` };
export const getAPISpecContent: RequestType<GetAPISpecContentRequest, GetAPISpecContentResponse> = { method: `${_preFix}/getAPISpecContent` };
export const writeAPISpecContent: RequestType<WriteAPISpecContentRequest, WriteAPISpecContentResponse> = { method: `${_preFix}/writeAPISpecContent` };
export const importJSON: NotificationType<void> = { method: `${_preFix}/importJSON` };

export const getGovernance: RequestType<GetGovernanceRequest, GetGovernanceResponse> = { method: `${_preFix}/getGovernance` };
export const validateApiSpec: RequestType<ValidateAPISpecRequest, ValidateAPISpecResponse> = { method: `${_preFix}/validateApiSpec` };
export const fetchRulesetsFromFolder: RequestType<FetchRulesetsFromFolderRequest, FetchRulesetsFromFolderResponse> = { method: `${_preFix}/fetchRulesetsFromFolder` };
export const getApplicableRulesets: RequestType<GetApplicableRulesetsRequest, GetApplicableRulesetsResponse> = { method: `${_preFix}/getApplicableRulesets` };
export const checkAIAvailability: RequestType<CheckAIAvailabilityRequest, CheckAIAvailabilityResponse> = { method: `${_preFix}/checkAIAvailability` };
export const getAllSpectralRulesets: RequestType<GetAllSpectralRulesetsRequest, GetAllSpectralRulesetsResponse> = { method: `${_preFix}/getAllSpectralRulesets` };

export const onDocumentFileChanged: NotificationType<DocumentFileChangedNotification> = { method: `${_preFix}/onDocumentFileChanged` };

export const onFileChanged: NotificationType<FileChangedNotification> = { method: `${_preFix}/onFileChanged` };
export const readFile: RequestType<ReadFileRequest, ReadFileResponse> = { method: `${_preFix}/readFile` };
export const writeFile: RequestType<WriteFileRequest, WriteFileResponse> = { method: `${_preFix}/writeFile` };
export const deleteFile: RequestType<DeleteFileRequest, DeleteFileResponse> = { method: `${_preFix}/deleteFile` };
export const getWorkspaceFileTree: RequestType<GetWorkspaceFileTreeRequest, GetWorkspaceFileTreeResponse> = { method: `${_preFix}/getWorkspaceFileTree` };

