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

import { ProjectStructureResponse, UpdatedArtifactsResponse } from "../../interfaces/bi";
import { LinePosition } from "../../interfaces/common";
import {
    BIAvailableNodesRequest,
    BIAvailableNodesResponse,
    BIFlowModelResponse,
    BINodeTemplateRequest,
    BINodeTemplateResponse,
    BISourceCodeRequest,
    BIModuleNodesResponse,
    ExpressionCompletionsRequest,
    ExpressionCompletionsResponse,
    ConfigVariableResponse,
    UpdateConfigVariableRequest,
    UpdateConfigVariableResponse,
    SignatureHelpRequest,
    SignatureHelpResponse,
    BIGetVisibleVariableTypesRequest,
    BIGetVisibleVariableTypesResponse,
    VisibleTypesRequest,
    VisibleTypesResponse,
    BIDeleteByComponentInfoRequest,
    BIDeleteByComponentInfoResponse,
    ExpressionDiagnosticsRequest,
    ExpressionDiagnosticsResponse,
    BIGetEnclosedFunctionRequest,
    BIGetEnclosedFunctionResponse,
    BIDesignModelResponse,
    GetTypesResponse,
    UpdateTypeResponse,
    GetTypesRequest,
    UpdateTypeRequest,
    GetTypeRequest,
    GetTypeResponse,
    UpdateImportsRequest,
    UpdateImportsResponse,
    AddFunctionRequest,
    AddImportItemResponse,
    FunctionNodeRequest,
    FunctionNodeResponse,
    ServiceClassModelResponse,
    ModelFromCodeRequest,
    ClassFieldModifierRequest,
    SourceEditResponse,
    ServiceClassSourceRequest,
    AddFieldRequest,
    RenameIdentifierRequest,
    BISearchRequest,
    BISearchResponse,
    GetRecordConfigRequest,
    GetRecordConfigResponse,
    UpdateRecordConfigRequest,
    RecordSourceGenRequest,
    RecordSourceGenResponse,
    GetRecordModelFromSourceResponse,
    GetRecordModelFromSourceRequest,
    UpdateTypesRequest,
    UpdateTypesResponse,
    DeploymentRequest,
    DeploymentResponse,
    OpenAPIClientGenerationRequest,
    OpenAPIGeneratedModulesRequest,
    OpenAPIGeneratedModulesResponse,
    OpenAPIClientDeleteRequest,
    OpenAPIClientDeleteResponse,
    OpenConfigTomlRequest,
    UpdateConfigVariableRequestV2,
    GetConfigVariableNodeTemplateRequest,
    UpdateConfigVariableResponseV2,
    DeleteConfigVariableResponseV2,
    DeleteConfigVariableRequestV2,
    JsonToTypeRequest,
    JsonToTypeResponse
} from "../../interfaces/extended-lang-client";
import {
    ProjectRequest,
    WorkspacesResponse,
    ProjectComponentsResponse,
    ComponentRequest,
    CreateComponentResponse,
    ReadmeContentRequest,
    ReadmeContentResponse,
    BIAiSuggestionsRequest,
    BIAiSuggestionsResponse,
    AIChatRequest,
    ProjectImports,
    BreakpointRequest,
    CurrentBreakpointsResponse,
    FormDidOpenParams,
    FormDidCloseParams,
    EndOfFileRequest,
    RecordsInWorkspaceMentions,
    BuildMode,
    DevantMetadata,
    GeneratedClientSaveResponse
} from "./interfaces";

export interface BIDiagramAPI {
    getFlowModel: () => Promise<BIFlowModelResponse>;
    getSourceCode: (params: BISourceCodeRequest) => Promise<UpdatedArtifactsResponse>;
    deleteFlowNode: (params: BISourceCodeRequest) => Promise<UpdatedArtifactsResponse>;
    deleteByComponentInfo: (params: BIDeleteByComponentInfoRequest) => Promise<BIDeleteByComponentInfoResponse>;
    getAvailableNodes: (params: BIAvailableNodesRequest) => Promise<BIAvailableNodesResponse>;
    getEnclosedFunction: (params: BIGetEnclosedFunctionRequest) => Promise<BIGetEnclosedFunctionResponse>;
    getNodeTemplate: (params: BINodeTemplateRequest) => Promise<BINodeTemplateResponse>;
    getAiSuggestions: (params: BIAiSuggestionsRequest) => Promise<BIAiSuggestionsResponse>;
    createProject: (params: ProjectRequest) => void;
    getWorkspaces: () => Promise<WorkspacesResponse>;
    getProjectStructure: () => Promise<ProjectStructureResponse>;
    getProjectComponents: () => Promise<ProjectComponentsResponse>;
    createComponent: (params: ComponentRequest) => Promise<CreateComponentResponse>;
    handleReadmeContent: (params: ReadmeContentRequest) => Promise<ReadmeContentResponse>;
    getVisibleVariableTypes: (params: BIGetVisibleVariableTypesRequest) => Promise<BIGetVisibleVariableTypesResponse>;
    getExpressionCompletions: (params: ExpressionCompletionsRequest) => Promise<ExpressionCompletionsResponse>;
    getConfigVariables: () => Promise<ConfigVariableResponse>;
    updateConfigVariables: (params: UpdateConfigVariableRequest) => Promise<UpdateConfigVariableResponse>;
    getConfigVariablesV2: () => Promise<ConfigVariableResponse>;
    updateConfigVariablesV2: (params: UpdateConfigVariableRequestV2) => Promise<UpdateConfigVariableResponseV2>;
    deleteConfigVariableV2: (params: DeleteConfigVariableRequestV2) => Promise<DeleteConfigVariableResponseV2>;
    getConfigVariableNodeTemplate: (params: GetConfigVariableNodeTemplateRequest) => Promise<BINodeTemplateResponse>;
    getModuleNodes: () => Promise<BIModuleNodesResponse>;
    getReadmeContent: () => Promise<ReadmeContentResponse>;
    openReadme: () => void;
    renameIdentifier: (params: RenameIdentifierRequest) => Promise<void>;
    deployProject: (params: DeploymentRequest) => Promise<DeploymentResponse>;
    openAIChat: (params: AIChatRequest) => void;
    getSignatureHelp: (params: SignatureHelpRequest) => Promise<SignatureHelpResponse>;
    buildProject: (mode: BuildMode) => void;
    runProject: () => void;
    getVisibleTypes: (params: VisibleTypesRequest) => Promise<VisibleTypesResponse>;
    addBreakpointToSource: (params: BreakpointRequest) => void;
    removeBreakpointFromSource: (params: BreakpointRequest) => void;
    getBreakpointInfo: () => Promise<CurrentBreakpointsResponse>;
    getExpressionDiagnostics: (params: ExpressionDiagnosticsRequest) => Promise<ExpressionDiagnosticsResponse>;
    getAllImports: () => Promise<ProjectImports>;
    formDidOpen: (params: FormDidOpenParams) => Promise<void>;
    formDidClose: (params: FormDidCloseParams) => Promise<void>;
    getDesignModel: () => Promise<BIDesignModelResponse>;
    getTypes: (params: GetTypesRequest) => Promise<GetTypesResponse>;
    getType: (params: GetTypeRequest) => Promise<GetTypeResponse>;
    updateType: (params: UpdateTypeRequest) => Promise<UpdateTypeResponse>;
    updateTypes: (params: UpdateTypesRequest) => Promise<UpdateTypesResponse>;
    getTypeFromJson: (params: JsonToTypeRequest) => Promise<JsonToTypeResponse>;
    getServiceClassModel: (params: ModelFromCodeRequest) => Promise<ServiceClassModelResponse>;
    updateClassField: (params: ClassFieldModifierRequest) => Promise<SourceEditResponse>;
    addClassField: (params: AddFieldRequest) => Promise<SourceEditResponse>;
    updateServiceClass: (params: ServiceClassSourceRequest) => Promise<SourceEditResponse>;
    createGraphqlClassType: (params: UpdateTypeRequest) => Promise<UpdateTypeResponse>;
    getRecordConfig: (params: GetRecordConfigRequest) => Promise<GetRecordConfigResponse>;
    updateRecordConfig: (params: UpdateRecordConfigRequest) => Promise<GetRecordConfigResponse>;
    getRecordModelFromSource: (params: GetRecordModelFromSourceRequest) => Promise<GetRecordModelFromSourceResponse>;
    getRecordSource: (params: RecordSourceGenRequest) => Promise<RecordSourceGenResponse>;
    updateImports: (params: UpdateImportsRequest) => Promise<UpdateImportsResponse>;
    addFunction: (params: AddFunctionRequest) => Promise<AddImportItemResponse>;
    getFunctionNode: (params: FunctionNodeRequest) => Promise<FunctionNodeResponse>;
    getEndOfFile: (params: EndOfFileRequest) => Promise<LinePosition>;
    search: (params: BISearchRequest) => Promise<BISearchResponse>;
    getRecordNames: () => Promise<RecordsInWorkspaceMentions>;
    getFunctionNames: () => Promise<RecordsInWorkspaceMentions>;
    getDevantMetadata: () => Promise<DevantMetadata | undefined>;
    generateOpenApiClient: (params: OpenAPIClientGenerationRequest) => Promise<GeneratedClientSaveResponse>;
    getOpenApiGeneratedModules: (params: OpenAPIGeneratedModulesRequest) => Promise<OpenAPIGeneratedModulesResponse>;
    deleteOpenApiGeneratedModules: (params: OpenAPIClientDeleteRequest) => Promise<OpenAPIClientDeleteResponse>;
    OpenConfigTomlRequest: (params: OpenConfigTomlRequest) => Promise<void>;
}
