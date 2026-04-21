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
    GoToSourceRequest,
    GetAPISpecContentRequest,
    GetAPISpecContentResponse,
    WriteAPISpecContentResponse,
    WriteAPISpecContentRequest,
    GetGovernanceRequest,
    GetGovernanceResponse,
    GenerateDeploymentArtifactRequest,
    GenerateDeploymentArtifactResponse,
    FileChangedNotification,
    ValidateAPISpecRequest,
    ValidateAPISpecResponse,
    InitAPIProjectRequest,
    InitAPIProjectResponse,
    GetApiPlatformConfigRequest,
    GetApiPlatformConfigResponse,
    GetApiDefinitionRequest,
    GetApiDefinitionResponse,
    UpdateApiPlatformConfigRequest,
    UpdateApiPlatformConfigResponse,
    FetchRulesetsFromFolderRequest,
    FetchRulesetsFromFolderResponse,
    GetApplicableRulesetsRequest,
    GetApplicableRulesetsResponse,
    ReadDeploymentArtifactRequest,
    ReadDeploymentArtifactResponse,
    SaveProjectConfigRequest,
    SaveProjectConfigResponse,
    GetProjectDetailsRequest,
    GetProjectDetailsResponse,
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

import {
    GenerateMockConfigRequest,
    GenerateMockConfigResponse,
    StartMockServerRequest,
    StartMockServerResponse,
    CheckMockServerStatusRequest,
    CheckMockServerStatusResponse,
    StopMockServerRequest,
    StopMockServerResponse,
    GetAvailablePortRequest,
    GetAvailablePortResponse,
} from "./mock";

import {
    ExecuteTestRequest,
    ExecuteTestResponse,
    ExecuteTestCollectionRequest,
    ExecuteTestCollectionResponse,
    SaveTestCollectionRequest,
    SaveTestCollectionResponse,
    LoadTestCollectionRequest,
    LoadTestCollectionResponse,
    GenerateTestsFromOpenAPIRequest,
    GenerateTestsFromOpenAPIResponse,
    SaveEnvironmentRequest,
    SaveEnvironmentResponse,
    LoadEnvironmentsRequest,
    LoadEnvironmentsResponse,
    ListTestCollectionsRequest,
    ListTestCollectionsResponse,
    AIGenerateTestsRequest,
    AIGenerateTestsResponse,
    AIGenerateAssertionsRequest,
    AIGenerateAssertionsResponse,
    AIGenerateTestDataRequest,
    AIGenerateTestDataResponse,
    ExportToPostmanRequest,
    ExportToPostmanResponse,
    ImportFromPostmanRequest,
    ImportFromPostmanResponse
} from "./test";


import { NotificationType, RequestType } from "vscode-messenger-common";

const _preFix = "api-designer-visualizer";

// API Designer Related RPC Types
export const openView: NotificationType<OpenViewRequest> = { method: `${_preFix}/openView` };
export const getAPISpecContent: RequestType<GetAPISpecContentRequest, GetAPISpecContentResponse> = { method: `${_preFix}/getAPISpecContent` };
export const writeAPISpecContent: RequestType<WriteAPISpecContentRequest, WriteAPISpecContentResponse> = { method: `${_preFix}/writeAPISpecContent` };
export const importJSON: NotificationType<void> = { method: `${_preFix}/importJSON` };

export const getGovernance: RequestType<GetGovernanceRequest, GetGovernanceResponse> = { method: `${_preFix}/getGovernance` };
export const validateAPISpec: RequestType<ValidateAPISpecRequest, ValidateAPISpecResponse> = { method: `${_preFix}/validateAPISpec` };
export const fetchRulesetsFromFolder: RequestType<FetchRulesetsFromFolderRequest, FetchRulesetsFromFolderResponse> = { method: `${_preFix}/fetchRulesetsFromFolder` };
export const getApplicableRulesets: RequestType<GetApplicableRulesetsRequest, GetApplicableRulesetsResponse> = { method: `${_preFix}/getApplicableRulesets` };
export const checkAIAvailability: RequestType<CheckAIAvailabilityRequest, CheckAIAvailabilityResponse> = { method: `${_preFix}/checkAIAvailability` };
export const getAllSpectralRulesets: RequestType<GetAllSpectralRulesetsRequest, GetAllSpectralRulesetsResponse> = { method: `${_preFix}/getAllSpectralRulesets` };

export const onDocumentFileChanged: NotificationType<DocumentFileChangedNotification> = { method: `${_preFix}/onDocumentFileChanged` };

export const initApiProject: RequestType<InitAPIProjectRequest, InitAPIProjectResponse> = { method: `${_preFix}/initApiProject` };
export const getApiPlatformConfig: RequestType<GetApiPlatformConfigRequest, GetApiPlatformConfigResponse> = { method: `${_preFix}/getApiPlatformConfig` };
export const updateApiPlatformConfig: RequestType<UpdateApiPlatformConfigRequest, UpdateApiPlatformConfigResponse> = { method: `${_preFix}/updateApiPlatformConfig` };
export const saveProjectConfig: RequestType<SaveProjectConfigRequest, SaveProjectConfigResponse> = { method: `${_preFix}/saveProjectConfig` };
export const getProjectDetails: RequestType<GetProjectDetailsRequest, GetProjectDetailsResponse> = { method: `${_preFix}/getProjectDetails` };

export const generateDeploymentArtifact: RequestType<GenerateDeploymentArtifactRequest, GenerateDeploymentArtifactResponse> = { method: `${_preFix}/generateDeploymentArtifact` };
export const readDeploymentArtifact: RequestType<ReadDeploymentArtifactRequest, ReadDeploymentArtifactResponse> = { method: `${_preFix}/readDeploymentArtifact` };
export const getApiDefinition: RequestType<GetApiDefinitionRequest, GetApiDefinitionResponse> = { method: `${_preFix}/getApiDefinition` };

export const goToSource: NotificationType<GoToSourceRequest> = { method: `${_preFix}/goToSource` };
export const onFileChanged: NotificationType<FileChangedNotification> = { method: `${_preFix}/onFileChanged` };
export const readFile: RequestType<ReadFileRequest, ReadFileResponse> = { method: `${_preFix}/readFile` };
export const writeFile: RequestType<WriteFileRequest, WriteFileResponse> = { method: `${_preFix}/writeFile` };
export const deleteFile: RequestType<DeleteFileRequest, DeleteFileResponse> = { method: `${_preFix}/deleteFile` };
export const getWorkspaceFileTree: RequestType<GetWorkspaceFileTreeRequest, GetWorkspaceFileTreeResponse> = { method: `${_preFix}/getWorkspaceFileTree` };

// Mock server related RPCs
export const generateMockConfig: RequestType<GenerateMockConfigRequest, GenerateMockConfigResponse> = {method: `${_preFix}/generateMockConfig`};
export const startMockServer: RequestType<StartMockServerRequest, StartMockServerResponse> = {method: `${_preFix}/startMockServer`};
export const checkMockServerStatus: RequestType<CheckMockServerStatusRequest, CheckMockServerStatusResponse> = {method: `${_preFix}/checkMockServerStatus`};
export const stopMockServer: RequestType<StopMockServerRequest, StopMockServerResponse> = {method: `${_preFix}/stopMockServer`};
export const getAvailablePort: RequestType<GetAvailablePortRequest, GetAvailablePortResponse> = {method: `${_preFix}/getAvailablePort`};

// Test generation and execution related RPCs
export const executeTest: RequestType<ExecuteTestRequest, ExecuteTestResponse> = {method: 'api-designer/executeTest'};
export const executeTestCollection: RequestType<ExecuteTestCollectionRequest, ExecuteTestCollectionResponse> = {method: 'api-designer/executeTestCollection'};
export const saveTestCollection: RequestType<SaveTestCollectionRequest, SaveTestCollectionResponse> = {method: 'api-designer/saveTestCollection'};
export const loadTestCollection: RequestType<LoadTestCollectionRequest, LoadTestCollectionResponse> = {method: 'api-designer/loadTestCollection'};
export const generateTestsFromOpenAPI: RequestType<GenerateTestsFromOpenAPIRequest, GenerateTestsFromOpenAPIResponse> = {method: 'api-designer/generateTestsFromOpenAPI'};
export const saveEnvironment: RequestType<SaveEnvironmentRequest, SaveEnvironmentResponse> = {method: 'api-designer/saveEnvironment'};
export const loadEnvironments: RequestType<LoadEnvironmentsRequest, LoadEnvironmentsResponse> = {method: 'api-designer/loadEnvironments'};
export const listTestCollections: RequestType<ListTestCollectionsRequest, ListTestCollectionsResponse> = {method: 'api-designer/listTestCollections'};
export const aiGenerateTests: RequestType<AIGenerateTestsRequest, AIGenerateTestsResponse> = {method: 'api-designer/aiGenerateTests'};
export const aiGenerateAssertions: RequestType<AIGenerateAssertionsRequest, AIGenerateAssertionsResponse> = {method: 'api-designer/aiGenerateAssertions'};
export const aiGenerateTestData: RequestType<AIGenerateTestDataRequest, AIGenerateTestDataResponse> = {method: 'api-designer/aiGenerateTestData'};
export const exportToPostman: RequestType<ExportToPostmanRequest, ExportToPostmanResponse> = {method: 'api-designer/exportToPostman'};
export const importFromPostman: RequestType<ImportFromPostmanRequest, ImportFromPostmanResponse> = {method: 'api-designer/importFromPostman'};
