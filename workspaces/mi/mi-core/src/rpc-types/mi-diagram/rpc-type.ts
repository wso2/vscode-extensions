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
    ApiDirectoryResponse,
    ApplyEditRequest,
    ApplyEditResponse,
    CommandsRequest,
    CommandsResponse,
    ConnectorRequest,
    ConnectorResponse,
    ConnectorsResponse,
    CreateAPIRequest,
    CreateAPIResponse,
    CreateEndpointRequest,
    CreateEndpointResponse,
    CreateSequenceRequest,
    CreateSequenceResponse,
    EndpointDirectoryResponse,
    EndpointsAndSequencesResponse,
    ProjectRootResponse,
    OpenDiagramRequest,
    SequenceDirectoryResponse,
    ShowErrorMessageRequest,
    getSTRequest,
    getSTResponse,
    CreateProjectRequest,
    ProjectDirResponse,
    CreateProjectResponse,
    ImportProjectRequest,
    ImportProjectResponse,
    ESBConfigsResponse,
    HighlightCodeRequest,
    WriteContentToFileRequest,
    WriteContentToFileResponse,
    WriteIdpSchemaFileToRegistryRequest,
    WriteIdpSchemaFileToRegistryResponse,
    GetIdpSchemaFilesResponse,
    ReadIdpSchemaFileContentRequest,
    ReadIdpSchemaFileContentResponse,
    CreateLocalEntryRequest,
    CreateLocalEntryResponse,
    FileDirResponse,
    CreateInboundEndpointRequest,
    CreateInboundEndpointResponse,
    UndoRedoParams,
    CreateTaskRequest,
    CreateTaskResponse,
    GetTaskRequest,
    GetTaskResponse,
    GetDefinitionRequest,
    GetDefinitionResponse,
    GetTextAtRangeRequest,
    GetTextAtRangeResponse,
    GetDiagnosticsReqeust,
    GetDiagnosticsResponse,
    GetProjectRootRequest,
    BrowseFileResponse,
    CreateRegistryResourceRequest,
    CreateRegistryResourceResponse,
    UpdateRegistryMetadataRequest,
    UpdateRegistryMetadataResponse,
    GetRegistryMetadataRequest,
    GetRegistryMetadataResponse,
    BrowseFileRequest,
    CreateMessageProcessorRequest,
    CreateMessageProcessorResponse,
    RetrieveMessageProcessorRequest,
    RetrieveMessageProcessorResponse,
    CreateProxyServiceRequest,
    CreateProxyServiceResponse,
    CreateMessageStoreRequest,
    CreateMessageStoreResponse,
    GetMessageStoreRequest,
    GetMessageStoreResponse,
    CreateTemplateRequest,
    CreateTemplateResponse,
    RetrieveTemplateRequest,
    RetrieveTemplateResponse,
    GetAvailableResourcesRequest,
    GetAvailableResourcesResponse,
    GetInboundEndpointRequest,
    GetInboundEndpointResponse,
    GetWorkspaceContextResponse,
    GetProjectUuidResponse,
    CreateClassMediatorRequest,
    CreateClassMediatorResponse,
    CreateDataServiceRequest,
    CreateDataServiceResponse,
    CreateDssDataSourceRequest,
    CreateDssDataSourceResponse,
    RetrieveDataServiceRequest,
    RetrieveDataServiceResponse,
    UpdateHttpEndpointRequest,
    UpdateHttpEndpointResponse,
    RetrieveHttpEndpointRequest,
    RetrieveHttpEndpointResponse,
    TemplatesResponse,
    UpdateAddressEndpointRequest,
    UpdateAddressEndpointResponse,
    RetrieveAddressEndpointRequest,
    RetrieveAddressEndpointResponse,
    UpdateWsdlEndpointRequest,
    UpdateWsdlEndpointResponse,
    RetrieveWsdlEndpointRequest,
    RetrieveWsdlEndpointResponse,
    UpdateDefaultEndpointRequest,
    UpdateDefaultEndpointResponse,
    RetrieveDefaultEndpointRequest,
    RetrieveDefaultEndpointResponse,
    GetLocalEntryRequest,
    GetLocalEntryResponse,
    UpdateLoadBalanceEPRequest,
    UpdateLoadBalanceEPResponse,
    GetLoadBalanceEPRequest,
    GetLoadBalanceEPResponse,
    UpdateFailoverEPRequest,
    UpdateFailoverEPResponse,
    GetFailoverEPRequest,
    GetFailoverEPResponse,
    UpdateRecipientEPRequest,
    UpdateRecipientEPResponse,
    GetRecipientEPRequest,
    GetRecipientEPResponse,
    UpdateTemplateEPRequest,
    UpdateTemplateEPResponse,
    GetTemplateEPRequest,
    GetTemplateEPResponse,
    GetSelectiveWorkspaceContextResponse,
    GetSelectiveArtifactsRequest,
    GetSelectiveArtifactsResponse,
    GetProxyRootUrlResponse,
    RegistryArtifactNamesResponse,
    ListRegistryArtifactsRequest, RangeFormatRequest,
    MigrateProjectRequest,
    MigrateProjectResponse,
    DownloadConnectorResponse,
    DownloadConnectorRequest,
    GetAvailableConnectorRequest,
    GetAvailableConnectorResponse,
    GetConnectorFormRequest,
    GetConnectorFormResponse,
    UpdateConnectorRequest,
    CreateDataSourceResponse,
    DataSourceTemplate,
    GetDataSourceRequest,
    GetIconPathUriRequest,
    GetIconPathUriResponse,
    GetUserAccessTokenResponse,
    CreateConnectionRequest,
    CreateConnectionResponse,
    GetConnectorConnectionsRequest,
    GetConnectorConnectionsResponse,
    GetAllRegistryPathsRequest,
    GetAllRegistryPathsResponse,
    GetAllResourcePathsResponse,
    GetConfigurableEntriesResponse,
    GetAllArtifactsRequest,
    GetAllArtifactsResponse,
    GetConnectionFormRequest,
    GetConnectionFormResponse,
    DeleteArtifactRequest,
    ExportProjectRequest,
    EditAPIRequest,
    EditAPIResponse,
    SwaggerTypeRequest,
    UpdateAPIFromSwaggerRequest,
    CompareSwaggerAndAPIResponse,
    UpdateTestSuiteRequest,
    UpdateTestCaseRequest,
    UpdateTestCaseResponse,
    UpdateTestSuiteResponse,
    GetAllTestSuitsResponse,
    UpdateMockServiceRequest,
    UpdateMockServiceResponse,
    GetAllMockServicesResponse,
    SwaggerFromAPIResponse,
    StoreConnectorJsonResponse,
    OpenDependencyPomRequest,
    getAllDependenciesRequest,
    GetAllDependenciesResponse,
    TestDbConnectionRequest,
    TestDbConnectionResponse,
    MarkAsDefaultSequenceRequest,
    GetSubFoldersResponse,
    GetSubFoldersRequest,
    DownloadInboundConnectorRequest,
    DownloadInboundConnectorResponse,
    FileRenameRequest,
    SaveInboundEPUischemaRequest,
    GetInboundEPUischemaRequest,
    GetInboundEPUischemaResponse,
    AddDriverRequest,
    ExtendedDSSQueryGenRequest,
    DSSFetchTablesRequest,
    DSSFetchTablesResponse,
    DriverPathResponse,
    AddDriverToLibRequest,
    AddDriverToLibResponse,
    APIContextsResponse,
    MediatorTryOutRequest,
    MediatorTryOutResponse,
    SavePayloadRequest,
    GetPayloadsRequest,
    GetPayloadsResponse,
    GetMediatorsRequest,
    GetMediatorsResponse,
    GetMediatorRequest,
    GetMediatorResponse,
    UpdateMediatorRequest,
    ExpressionCompletionsRequest,
    ExpressionCompletionsResponse,
    GetConnectionSchemaRequest,
    GetConnectionSchemaResponse,
    CopyConnectorZipRequest,
    CopyConnectorZipResponse,
    ApplyEditsRequest,
    RemoveConnectorRequest,
    RemoveConnectorResponse,
    GetHelperPaneInfoRequest,
    GetHelperPaneInfoResponse,
    TestConnectorConnectionResponse,
    TestConnectorConnectionRequest,
    MiVersionResponse,
    SaveConfigRequest,
    SaveConfigResponse,
    CheckDBDriverResponse,
    CopyArtifactRequest,
    CopyArtifactResponse,
    GetArtifactTypeRequest,
    GetArtifactTypeResponse,
    LocalInboundConnectorsResponse,
    BuildProjectRequest,
    DeployProjectRequest,
    DeployProjectResponse,
    CreateBallerinaModuleResponse,
    CreateBallerinaModuleRequest,
    HandleFileRequest,
    HandleFileResponse,
    DevantMetadata,
    UpdateMediatorResponse,
    GetConnectorIconRequest,
    GetConnectorIconResponse,
    SubmitFeedbackRequest,
    SubmitFeedbackResponse,
    GetPomFileContentResponse,
    GetExternalConnectorDetailsResponse,
    WriteMockServicesRequest,
    WriteMockServicesResponse,
    GetMockServicesResponse,
    ConfigureKubernetesRequest,
    ConfigureKubernetesResponse,
    Property,
    UpdateRegistryPropertyRequest,
    GenerateMappingsParamsRequest
} from "./types";
import { RequestType, NotificationType } from "vscode-messenger-common";

const _preFix = "mi-diagram";
export const executeCommand: RequestType<CommandsRequest, CommandsResponse> = { method: `${_preFix}/executeCommand` };
export const showErrorMessage: NotificationType<ShowErrorMessageRequest> = { method: `${_preFix}/showErrorMessage` };
export const getSyntaxTree: RequestType<getSTRequest, getSTResponse> = { method: `${_preFix}/getSyntaxTree` };
export const applyEdit: RequestType<ApplyEditRequest | ApplyEditsRequest, ApplyEditResponse> = { method: `${_preFix}/applyEdit` };
export const getESBConfigs: RequestType<void, ESBConfigsResponse> = { method: `${_preFix}/getESBConfigs` };
export const getConnectors: RequestType<void, ConnectorsResponse> = { method: `${_preFix}/getConnectors` };
export const getConnector: RequestType<ConnectorRequest, ConnectorResponse> = { method: `${_preFix}/getConnector` };
export const getAPIDirectory: RequestType<void, ApiDirectoryResponse> = { method: `${_preFix}/getAPIDirectory` };
export const createAPI: RequestType<CreateAPIRequest, CreateAPIResponse> = { method: `${_preFix}/createAPI` };
export const editAPI: RequestType<EditAPIRequest, EditAPIResponse> = { method: `${_preFix}/editAPI` };
export const getEndpointDirectory: RequestType<void, EndpointDirectoryResponse> = { method: `${_preFix}/getEndpointDirectory` };
export const createEndpoint: RequestType<CreateEndpointRequest, CreateEndpointResponse> = { method: `${_preFix}/createEndpoint` };
export const updateLoadBalanceEndpoint: RequestType<UpdateLoadBalanceEPRequest, UpdateLoadBalanceEPResponse> = { method: `${_preFix}/updateLoadBalanceEndpoint` };
export const getLoadBalanceEndpoint: RequestType<GetLoadBalanceEPRequest, GetLoadBalanceEPResponse> = { method: `${_preFix}/getLoadBalanceEndpoint` };
export const updateFailoverEndpoint: RequestType<UpdateFailoverEPRequest, UpdateFailoverEPResponse> = { method: `${_preFix}/updateFailoverEndpoint` };
export const getFailoverEndpoint: RequestType<GetFailoverEPRequest, GetFailoverEPResponse> = { method: `${_preFix}/getFailoverEndpoint` };
export const updateRecipientEndpoint: RequestType<UpdateRecipientEPRequest, UpdateRecipientEPResponse> = { method: `${_preFix}/updateRecipientEndpoint` };
export const getRecipientEndpoint: RequestType<GetRecipientEPRequest, GetRecipientEPResponse> = { method: `${_preFix}/getRecipientEndpoint` };
export const updateTemplateEndpoint: RequestType<UpdateTemplateEPRequest, UpdateTemplateEPResponse> = { method: `${_preFix}/updateTemplateEndpoint` };
export const getTemplateEndpoint: RequestType<GetTemplateEPRequest, GetTemplateEPResponse> = { method: `${_preFix}/getTemplateEndpoint` };
export const createLocalEntry: RequestType<CreateLocalEntryRequest, CreateLocalEntryResponse> = { method: `${_preFix}/createLocalEntry` };
export const getLocalEntry: RequestType<GetLocalEntryRequest, GetLocalEntryResponse> = { method: `${_preFix}/getLocalEntry` };
export const getEndpointsAndSequences: RequestType<void, EndpointsAndSequencesResponse> = { method: `${_preFix}/getEndpointsAndSequences` };
export const getTemplates: RequestType<void, TemplatesResponse> = { method: `${_preFix}/getTemplates` };
export const getSequenceDirectory: RequestType<void, SequenceDirectoryResponse> = { method: `${_preFix}/getSequenceDirectory` };
export const createSequence: RequestType<CreateSequenceRequest, CreateSequenceResponse> = { method: `${_preFix}/createSequence` };
export const createMessageStore: RequestType<CreateMessageStoreRequest, CreateMessageStoreResponse> = { method: `${_preFix}/createMessageStore` };
export const getMessageStore: RequestType<GetMessageStoreRequest, GetMessageStoreResponse> = { method: `${_preFix}/getMessageStore` };
export const createInboundEndpoint: RequestType<CreateInboundEndpointRequest, CreateInboundEndpointResponse> = { method: `${_preFix}/createInboundEndpoint` };
export const createMessageProcessor: RequestType<CreateMessageProcessorRequest, CreateMessageProcessorResponse> = { method: `${_preFix}/createMessageProcessor` };
export const getMessageProcessor: RequestType<RetrieveMessageProcessorRequest, RetrieveMessageProcessorResponse> = { method: `${_preFix}/getMessageProcessor` };
export const createProxyService: RequestType<CreateProxyServiceRequest, CreateProxyServiceResponse> = { method: `${_preFix}/createProxyService` };
export const createTask: RequestType<CreateTaskRequest, CreateTaskResponse> = { method: `${_preFix}/createTask` };
export const getTask: RequestType<GetTaskRequest, GetTaskResponse> = { method: `${_preFix}/getTask` };
export const createTemplate: RequestType<CreateTemplateRequest, CreateTemplateResponse> = { method: `${_preFix}/createTemplate` };
export const getTemplate: RequestType<RetrieveTemplateRequest, RetrieveTemplateResponse> = { method: `${_preFix}/getTemplate` };
export const getInboundEndpoint: RequestType<GetInboundEndpointRequest, GetInboundEndpointResponse> = { method: `${_preFix}/getInboundEndpoint` };
export const updateHttpEndpoint: RequestType<UpdateHttpEndpointRequest, UpdateHttpEndpointResponse> = { method: `${_preFix}/updateHttpEndpoint` };
export const getHttpEndpoint: RequestType<RetrieveHttpEndpointRequest, RetrieveHttpEndpointResponse> = { method: `${_preFix}/getHttpEndpoint` };
export const updateAddressEndpoint: RequestType<UpdateAddressEndpointRequest, UpdateAddressEndpointResponse> = { method: `${_preFix}/updateAddressEndpoint` };
export const getAddressEndpoint: RequestType<RetrieveAddressEndpointRequest, RetrieveAddressEndpointResponse> = { method: `${_preFix}/getAddressEndpoint` };
export const updateWsdlEndpoint: RequestType<UpdateWsdlEndpointRequest, UpdateWsdlEndpointResponse> = { method: `${_preFix}/updateWsdlEndpoint` };
export const getWsdlEndpoint: RequestType<RetrieveWsdlEndpointRequest, RetrieveWsdlEndpointResponse> = { method: `${_preFix}/getWsdlEndpoint` };
export const updateDefaultEndpoint: RequestType<UpdateDefaultEndpointRequest, UpdateDefaultEndpointResponse> = { method: `${_preFix}/updateDefaultEndpoint` };
export const getDefaultEndpoint: RequestType<RetrieveDefaultEndpointRequest, RetrieveDefaultEndpointResponse> = { method: `${_preFix}/getDefaultEndpoint` };
export const createDataService: RequestType<CreateDataServiceRequest, CreateDataServiceResponse> = { method: `${_preFix}/createDataService` };
export const createDssDataSource: RequestType<CreateDssDataSourceRequest, CreateDssDataSourceResponse> = { method: `${_preFix}/createDssDataSource` };
export const getDataService: RequestType<RetrieveDataServiceRequest, RetrieveDataServiceResponse> = { method: `${_preFix}/getDataService` };
export const askDriverPath: RequestType<void, DriverPathResponse> = { method: `${_preFix}/askDriverPath` };
export const addDriverToLib: RequestType<AddDriverToLibRequest, AddDriverToLibResponse> = { method: `${_preFix}/addDriverToLib` };
export const deleteDriverFromLib: NotificationType<AddDriverToLibRequest> = { method: `${_preFix}/deleteDriverFromLib` };
export const closeWebView: NotificationType<void> = { method: `${_preFix}/closeWebView` };
export const openDiagram: NotificationType<OpenDiagramRequest> = { method: `${_preFix}/openDiagram` };
export const openFile: NotificationType<OpenDiagramRequest> = { method: `${_preFix}/openFile` };
export const closeWebViewNotification: NotificationType<void> = { method: `${_preFix}/closeWebViewNotification` };
export const getWorkspaceRoot: RequestType<void, ProjectRootResponse> = { method: `${_preFix}/getWorkspaceRoot` };
export const getProjectRoot: RequestType<GetProjectRootRequest, ProjectRootResponse> = { method: `${_preFix}/getProjectRoot` };
export const askProjectDirPath: RequestType<void, ProjectDirResponse> = { method: `${_preFix}/askProjectDirPath` };
export const askProjectImportDirPath: RequestType<void, ProjectDirResponse> = { method: `${_preFix}/askProjectImportDirPath` };
export const askFileDirPath: RequestType<void, FileDirResponse> = { method: `${_preFix}/askFileDirPath` };
export const askOpenAPIDirPath: RequestType<void, FileDirResponse> = { method: `${_preFix}/askOpenAPIDirPath` };
export const createProject: RequestType<CreateProjectRequest, CreateProjectResponse> = { method: `${_preFix}/createProject` };
export const importProject: RequestType<ImportProjectRequest, ImportProjectResponse> = { method: `${_preFix}/importProject` };
export const migrateProject: RequestType<MigrateProjectRequest, MigrateProjectResponse> = { method: `${_preFix}/migrateProject` };
export const writeContentToFile: RequestType<WriteContentToFileRequest, WriteContentToFileResponse> = { method: `${_preFix}/writeContentToFile` };
export const handleFileWithFS: RequestType<HandleFileRequest, HandleFileResponse> = { method: `${_preFix}/handleFileWithFS` };
export const writeIdpSchemaFileToRegistry: RequestType<WriteIdpSchemaFileToRegistryRequest, WriteIdpSchemaFileToRegistryResponse> = { method: `${_preFix}/writeIdpSchemaFileToRegistry` };
export const getIdpSchemaFiles: RequestType<void, GetIdpSchemaFilesResponse> = { method: `${_preFix}/getIdpSchemaFiles` };
export const convertPdfToBase64Images: RequestType<string, string[]> = { method: `${_preFix}/convertPdfToBase64Images` };
export const readIdpSchemaFileContent: RequestType<ReadIdpSchemaFileContentRequest, ReadIdpSchemaFileContentResponse> = { method: `${_preFix}/readIdpSchemaFileContent` };
export const highlightCode: NotificationType<HighlightCodeRequest> = { method: `${_preFix}/highlightCode` };
export const getWorkspaceContext: RequestType<void, GetWorkspaceContextResponse> = { method: `${_preFix}/getWorkspaceContext` };
export const getProjectUuid: RequestType<void, GetProjectUuidResponse> = { method: `${_preFix}/getProjectUuid` };
export const initUndoRedoManager: NotificationType<UndoRedoParams> = { method: `${_preFix}/initUndoRedoManager` };
export const undo: RequestType<UndoRedoParams, boolean> = { method: `${_preFix}/undo` };
export const redo: RequestType<UndoRedoParams, boolean> = { method: `${_preFix}/redo` };
export const getDefinition: RequestType<GetDefinitionRequest, GetDefinitionResponse> = { method: `${_preFix}/getDefinition` };
export const getTextAtRange: RequestType<GetTextAtRangeRequest, GetTextAtRangeResponse> = { method: `${_preFix}/getTextAtRange` };
export const getDiagnostics: RequestType<GetDiagnosticsReqeust, GetDiagnosticsResponse> = { method: `${_preFix}/getDiagnostics` };
export const browseFile: RequestType<BrowseFileRequest, BrowseFileResponse> = { method: `${_preFix}/browseFile` };
export const createRegistryResource: RequestType<CreateRegistryResourceRequest, CreateRegistryResourceResponse> = { method: `${_preFix}/createRegistryResource` };
export const getAvailableResources: RequestType<GetAvailableResourcesRequest, GetAvailableResourcesResponse> = { method: `${_preFix}/getAvailableResources` };
export const createClassMediator: RequestType<CreateClassMediatorRequest, CreateClassMediatorResponse> = { method: `${_preFix}/createClassMediator` };
export const createBallerinaModule: RequestType<CreateBallerinaModuleRequest, CreateBallerinaModuleResponse> = { method: `${_preFix}/createBallerinaModule` };
export const buildBallerinaModule: RequestType<string, void> = { method: `${_preFix}/buildBallerinaModule` };
export const getSelectiveWorkspaceContext: RequestType<void, GetSelectiveWorkspaceContextResponse> = { method: `${_preFix}/getSelectiveWorkspaceContext` };
export const getSelectiveArtifacts: RequestType<GetSelectiveArtifactsRequest, GetSelectiveArtifactsResponse> = { method: `${_preFix}/getSelectiveArtifacts` };
export const getProxyRootUrl: RequestType<void, GetProxyRootUrlResponse> = { method: `${_preFix}/getProxyRootUrl` };
export const getAvailableRegistryResources: RequestType<ListRegistryArtifactsRequest, RegistryArtifactNamesResponse> = { method: `${_preFix}/getAvailableRegistryResources` };
export const updateRegistryMetadata: RequestType<UpdateRegistryMetadataRequest, UpdateRegistryMetadataResponse> = { method: `${_preFix}/updateRegistryMetadata` };
export const getMetadataOfRegistryResource: RequestType<GetRegistryMetadataRequest, GetRegistryMetadataResponse> = { method: `${_preFix}/getMetadataOfRegistryResource` };
export const rangeFormat: RequestType<RangeFormatRequest, ApplyEditResponse> = { method: `${_preFix}/rangeFormat` };
export const downloadConnector: RequestType<DownloadConnectorRequest, DownloadConnectorResponse> = { method: `${_preFix}/downloadConnector` };
export const downloadInboundConnector: RequestType<DownloadInboundConnectorRequest, DownloadInboundConnectorResponse> = { method: `${_preFix}/downloadInboundConnector` };
export const copyConnectorZip: RequestType<CopyConnectorZipRequest, CopyConnectorZipResponse> = { method: `${_preFix}/copyConnectorZip` };
export const copyArtifact: RequestType<CopyArtifactRequest, CopyArtifactResponse> = { method: `${_preFix}/copyArtifact` };
export const askImportFileDir: RequestType<void, FileDirResponse> = { method: `${_preFix}/askImportFileDir` };
export const getAvailableConnectors: RequestType<GetAvailableConnectorRequest, GetAvailableConnectorResponse> = { method: `${_preFix}/getAvailableConnectors` };
export const updateConnectors: NotificationType<UpdateConnectorRequest> = { method: `${_preFix}/updateConnectors` };
export const removeConnector: RequestType<RemoveConnectorRequest, RemoveConnectorResponse> = { method: `${_preFix}/removeConnector` };
export const getConnectorForm: RequestType<GetConnectorFormRequest, GetConnectorFormResponse> = { method: `${_preFix}/getConnectorForm` };
export const getConnectionForm: RequestType<GetConnectionFormRequest, GetConnectionFormResponse> = { method: `${_preFix}/getConnectionForm` };
export const getStoreConnectorJSON: RequestType<void, StoreConnectorJsonResponse> = { method: `${_preFix}/getStoreConnectorJSON` };
export const getConnectorIcon: RequestType<GetConnectorIconRequest, GetConnectorIconResponse> = { method: `${_preFix}/getConnectorIcon` };
export const saveInboundEPUischema: RequestType<SaveInboundEPUischemaRequest, boolean> = { method: `${_preFix}/saveInboundEPUischema` };
export const getInboundEPUischema: RequestType<GetInboundEPUischemaRequest, GetInboundEPUischemaResponse> = { method: `${_preFix}/getInboundEPUischema` };
export const createDataSource: RequestType<DataSourceTemplate, CreateDataSourceResponse> = { method: `${_preFix}/createDataSource` };
export const getDataSource: RequestType<GetDataSourceRequest, DataSourceTemplate> = { method: `${_preFix}/getDataSource` };
export const getIconPathUri: RequestType<GetIconPathUriRequest, GetIconPathUriResponse> = { method: `${_preFix}/getIconPathUri` };
export const getUserAccessToken: RequestType<void, GetUserAccessTokenResponse> = { method: `${_preFix}/getUserAccessToken` };
export const createConnection: RequestType<CreateConnectionRequest, CreateConnectionResponse> = { method: `${_preFix}/createConnection` };
export const getConnectorConnections: RequestType<GetConnectorConnectionsRequest, GetConnectorConnectionsResponse> = { method: `${_preFix}/getConnectorConnections` };
export const logoutFromMIAccount: NotificationType<void> = { method: `${_preFix}/logoutFromMIAccount` };
export const getAllRegistryPaths: RequestType<GetAllRegistryPathsRequest, GetAllRegistryPathsResponse> = { method: `${_preFix}/getAllRegistryPaths` };
export const getAllResourcePaths: RequestType<void, GetAllResourcePathsResponse> = { method: `${_preFix}/getAllResourcePaths` };
export const getConfigurableEntries: RequestType<void, GetConfigurableEntriesResponse> = { method: `${_preFix}/getConfigurableEntries` };
export const getAllArtifacts: RequestType<GetAllArtifactsRequest, GetAllArtifactsResponse> = { method: `${_preFix}/getAllArtifacts` };
export const getArtifactType: RequestType<GetArtifactTypeRequest, GetArtifactTypeResponse> = { method: `${_preFix}/getArtifactType` };
export const deleteArtifact: NotificationType<DeleteArtifactRequest> = { method: `${_preFix}/deleteArtifact` };
export const getAllAPIcontexts: RequestType<void, APIContextsResponse> = { method: `${_preFix}/getAllAPIcontexts` };
export const buildProject: NotificationType<BuildProjectRequest> = { method: `${_preFix}/buildProject` };
export const deployProject: RequestType<DeployProjectRequest, DeployProjectResponse> = { method: `${_preFix}/deployProject` };
export const remoteDeploy: NotificationType<void> = { method: `${_preFix}/remoteDeploy` };
export const getDevantMetadata: RequestType<void, DevantMetadata> = { method: `${_preFix}/getDevantMetadata` };
export const exportProject: NotificationType<ExportProjectRequest> = { method: `${_preFix}/exportProject` };
export const checkOldProject: RequestType<void, boolean> = { method: `${_preFix}/checkOldProject` };
export const refreshAccessToken: NotificationType<void> = { method: `${_preFix}/refreshAccessToken` };
export const getOpenAPISpec: RequestType<SwaggerTypeRequest, SwaggerFromAPIResponse> = { method: `${_preFix}/getOpenAPISpec` };
export const editOpenAPISpec: NotificationType<SwaggerTypeRequest> = { method: `${_preFix}/editOpenAPISpec` };
export const compareSwaggerAndAPI: RequestType<SwaggerTypeRequest, CompareSwaggerAndAPIResponse> = { method: `${_preFix}/compareSwaggerAndAPI` };
export const updateSwaggerFromAPI: NotificationType<SwaggerTypeRequest> = { method: `${_preFix}/updateSwaggerFromAPI` };
export const updateAPIFromSwagger: NotificationType<UpdateAPIFromSwaggerRequest> = { method: `${_preFix}/updateAPIFromSwagger` };
export const updateTestSuite: RequestType<UpdateTestSuiteRequest, UpdateTestSuiteResponse> = { method: `${_preFix}/updateTestSuite` };
export const updateTestCase: RequestType<UpdateTestCaseRequest, UpdateTestCaseResponse> = { method: `${_preFix}/updateTestCase` };
export const updateMockService: RequestType<UpdateMockServiceRequest, UpdateMockServiceResponse> = { method: `${_preFix}/updateMockService` };
export const getAllTestSuites: RequestType<void, GetAllTestSuitsResponse> = { method: `${_preFix}/getAllTestSuites` };
export const getAllMockServices: RequestType<void, GetAllMockServicesResponse> = { method: `${_preFix}/getAllMockServices` };
export const openDependencyPom: NotificationType<OpenDependencyPomRequest> = { method: `${_preFix}/openDependencyPom` };
export const getAllDependencies: RequestType<getAllDependenciesRequest, GetAllDependenciesResponse> = { method: `${_preFix}/getAllDependencies` };
export const formatPomFile: RequestType<void, void> = { method: `${_preFix}/formatPomFile` };
export const testDbConnection: RequestType<TestDbConnectionRequest, TestDbConnectionResponse> = { method: `${_preFix}/testDbConnection` };
export const markAsDefaultSequence: NotificationType<MarkAsDefaultSequenceRequest> = { method: `${_preFix}/markAsDefaultSequence` };
export const getSubFolderNames: RequestType<GetSubFoldersRequest, GetSubFoldersResponse> = { method: `${_preFix}/getSubFolderNames` };
export const renameFile: NotificationType<FileRenameRequest> = { method: `${_preFix}/renameFile` };
export const openUpdateExtensionPage: NotificationType<void> = { method: `${_preFix}/openUpdateExtensionPage` };
export const checkDBDriver: RequestType<string, CheckDBDriverResponse> = { method: `${_preFix}/checkDBDriver` };
export const addDBDriver: RequestType<AddDriverRequest, boolean> = { method: `${_preFix}/addDBDriver` };
export const removeDBDriver: RequestType<AddDriverRequest, boolean> = { method: `${_preFix}/removeDBDriver` };
export const modifyDBDriver: RequestType<AddDriverRequest, boolean> = { method: `${_preFix}/modifyDBDriver` };
export const generateDSSQueries: RequestType<ExtendedDSSQueryGenRequest, boolean> = { method: `${_preFix}/generateDSSQueries` };
export const fetchDSSTables: RequestType<DSSFetchTablesRequest, DSSFetchTablesResponse> = { method: `${_preFix}/fetchDSSTables` };
export const tryOutMediator: RequestType<MediatorTryOutRequest, MediatorTryOutResponse> = { method: `${_preFix}/tryOutMediator` };
export const shutDownTryoutServer: RequestType<void, boolean> = { method: `${_preFix}/shutDownTryoutServer` };
export const getMIVersionFromPom: RequestType<void, MiVersionResponse> = { method: `${_preFix}/getMIVersionFromPom` };
export const getMediatorInputOutputSchema: RequestType<MediatorTryOutRequest, MediatorTryOutResponse> = { method: `${_preFix}/getMediatorInputOutputSchema` };
export const saveInputPayload: RequestType<SavePayloadRequest, boolean> = { method: `${_preFix}/saveInputPayload` };
export const getInputPayloads: RequestType<GetPayloadsRequest, GetPayloadsResponse> = { method: `${_preFix}/getInputPayloads` };
export const getAllInputDefaultPayloads: RequestType<void, Record<string, unknown>> = { method: `${_preFix}/getOutputPayloads` };
export const getMediators: RequestType<GetMediatorsRequest, GetMediatorsResponse> = { method: `${_preFix}/getMediators` };
export const getMediator: RequestType<GetMediatorRequest, GetMediatorResponse> = { method: `${_preFix}/getMediator` };
export const updateMediator: RequestType<UpdateMediatorRequest, UpdateMediatorResponse> = { method: `${_preFix}/updateMediator` };
export const getLocalInboundConnectors: RequestType<void, LocalInboundConnectorsResponse> = { method: `${_preFix}/getLocalInboundConnectors` };
export const getConnectionSchema: RequestType<GetConnectionSchemaRequest, GetConnectionSchemaResponse> = { method: `${_preFix}/getConnectionSchema` };
export const getExpressionCompletions: RequestType<ExpressionCompletionsRequest, ExpressionCompletionsResponse> = { method: `${_preFix}/getExpressionCompletions` };
export const getHelperPaneInfo: RequestType<GetHelperPaneInfoRequest, GetHelperPaneInfoResponse> = { method: `${_preFix}/getHelperPaneInfo` };
export const testConnectorConnection: RequestType<TestConnectorConnectionRequest, TestConnectorConnectionResponse> = { method: `${_preFix}/testConnectorConnection` };
export const saveConfig: RequestType<SaveConfigRequest, SaveConfigResponse> = { method: `${_preFix}/saveConfig` };
export const getEULALicense: RequestType<void, string> = { method: `${_preFix}/getEULALicense` };
export const shouldDisplayPayloadAlert: RequestType<void, boolean> = { method: `${_preFix}/shouldDisplayPayloadAlert` };
export const displayPayloadAlert: RequestType<void, void> = { method: `${_preFix}/displayPayloadAlert` };
export const closePayloadAlert: RequestType<void, void> = { method: `${_preFix}/closePayloadAlert` };
export const getValueOfEnvVariable: RequestType<string, string> = { method: `${_preFix}/getValueOfEnvVariable` };
export const submitFeedback: RequestType<SubmitFeedbackRequest, SubmitFeedbackResponse> = { method: `${_preFix}/submitFeedback` };
export const getPomFileContent: RequestType<void, GetPomFileContentResponse> = { method: `${_preFix}/getPomFileContent` };
export const getExternalConnectorDetails: RequestType<void, GetExternalConnectorDetailsResponse> = { method: `${_preFix}/getExternalConnectorDetails` };
export const writeMockServices: RequestType<WriteMockServicesRequest, WriteMockServicesResponse> = { method: `${_preFix}/writeMockServices` };
export const getMockServices: RequestType<void, GetMockServicesResponse> = { method: `${_preFix}/getMockServices` };
export const configureKubernetes: RequestType<ConfigureKubernetesRequest, ConfigureKubernetesResponse> = { method: `${_preFix}/configureKubernetes` };
export const isKubernetesConfigured: RequestType<void, boolean> = { method: `${_preFix}/isKubernetesConfigured` };
export const updatePropertiesInArtifactXML: RequestType<UpdateRegistryPropertyRequest, string> = { method: `${_preFix}/updatePropertiesInArtifactXML` };
export const getPropertiesFromArtifactXML: RequestType<string, Property[] | undefined> = { method: `${_preFix}/getPropertiesFromArtifactXML` };
export const getInputOutputMappings: RequestType<GenerateMappingsParamsRequest, string[]> = { method: `${_preFix}/getInputOutputMappings` };
