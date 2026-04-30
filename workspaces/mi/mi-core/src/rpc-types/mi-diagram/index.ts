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
    HandleFileRequest,
    HandleFileResponse,
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
    CreateBallerinaModuleRequest,
    CreateBallerinaModuleResponse,
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
    RegistryArtifactNamesResponse,
    ListRegistryArtifactsRequest,
    RangeFormatRequest,
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
    RemoveConnectorRequest,
    RemoveConnectorResponse,
    GetHelperPaneInfoRequest,
    GetHelperPaneInfoResponse,
    TestConnectorConnectionRequest,
    TestConnectorConnectionResponse,
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
    DevantMetadata,
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
    UpdateRegistryPropertyRequest,
    Property,
    GenerateMappingsParamsRequest
} from "./types";

export interface MiDiagramAPI {
    executeCommand: (params: CommandsRequest) => Promise<CommandsResponse>;
    showErrorMessage: (params: ShowErrorMessageRequest) => void;
    getSyntaxTree: (params: getSTRequest) => Promise<getSTResponse>;
    applyEdit: (params: ApplyEditRequest) => Promise<ApplyEditResponse>;
    getESBConfigs: () => Promise<ESBConfigsResponse>;
    getConnectors: () => Promise<ConnectorsResponse>;
    getConnector: (params: ConnectorRequest) => Promise<ConnectorResponse>;
    getAPIDirectory: () => Promise<ApiDirectoryResponse>;
    createAPI: (params: CreateAPIRequest) => Promise<CreateAPIResponse>;
    editAPI: (params: EditAPIRequest) => Promise<EditAPIResponse>;
    getEndpointDirectory: () => Promise<EndpointDirectoryResponse>;
    createEndpoint: (params: CreateEndpointRequest) => Promise<CreateEndpointResponse>;
    updateLoadBalanceEndpoint: (params: UpdateLoadBalanceEPRequest) => Promise<UpdateLoadBalanceEPResponse>;
    getLoadBalanceEndpoint: (params: GetLoadBalanceEPRequest) => Promise<GetLoadBalanceEPResponse>;
    updateFailoverEndpoint: (params: UpdateFailoverEPRequest) => Promise<UpdateFailoverEPResponse>;
    getFailoverEndpoint: (params: GetFailoverEPRequest) => Promise<GetFailoverEPResponse>;
    updateRecipientEndpoint: (params: UpdateRecipientEPRequest) => Promise<UpdateRecipientEPResponse>;
    getRecipientEndpoint: (params: GetRecipientEPRequest) => Promise<GetRecipientEPResponse>;
    updateTemplateEndpoint: (params: UpdateTemplateEPRequest) => Promise<UpdateTemplateEPResponse>;
    getTemplateEndpoint: (params: GetTemplateEPRequest) => Promise<GetTemplateEPResponse>;
    createLocalEntry: (params: CreateLocalEntryRequest) => Promise<CreateLocalEntryResponse>;
    getLocalEntry: (params: GetLocalEntryRequest) => Promise<GetLocalEntryResponse>;
    getEndpointsAndSequences: () => Promise<EndpointsAndSequencesResponse>;
    getTemplates: () => Promise<TemplatesResponse>;
    getSequenceDirectory: () => Promise<SequenceDirectoryResponse>;
    createSequence: (params: CreateSequenceRequest) => Promise<CreateSequenceResponse>;
    createMessageStore: (params: CreateMessageStoreRequest) => Promise<CreateMessageStoreResponse>;
    getMessageStore: (params: GetMessageStoreRequest) => Promise<GetMessageStoreResponse>;
    createInboundEndpoint: (params: CreateInboundEndpointRequest) => Promise<CreateInboundEndpointResponse>;
    createMessageProcessor: (params: CreateMessageProcessorRequest) => Promise<CreateMessageProcessorResponse>;
    getMessageProcessor: (params: RetrieveMessageProcessorRequest) => Promise<RetrieveMessageProcessorResponse>;
    createProxyService: (params: CreateProxyServiceRequest) => Promise<CreateProxyServiceResponse>;
    createTask: (params: CreateTaskRequest) => Promise<CreateTaskResponse>;
    getTask: (params: GetTaskRequest) => Promise<GetTaskResponse>;
    createTemplate: (params: CreateTemplateRequest) => Promise<CreateTemplateResponse>;
    getTemplate: (params: RetrieveTemplateRequest) => Promise<RetrieveTemplateResponse>;
    getInboundEndpoint: (params: GetInboundEndpointRequest) => Promise<GetInboundEndpointResponse>;
    updateHttpEndpoint: (params: UpdateHttpEndpointRequest) => Promise<UpdateHttpEndpointResponse>;
    getHttpEndpoint: (params: RetrieveHttpEndpointRequest) => Promise<RetrieveHttpEndpointResponse>;
    updateAddressEndpoint: (params: UpdateAddressEndpointRequest) => Promise<UpdateAddressEndpointResponse>;
    getAddressEndpoint: (params: RetrieveAddressEndpointRequest) => Promise<RetrieveAddressEndpointResponse>;
    updateWsdlEndpoint: (params: UpdateWsdlEndpointRequest) => Promise<UpdateWsdlEndpointResponse>;
    getWsdlEndpoint: (params: RetrieveWsdlEndpointRequest) => Promise<RetrieveWsdlEndpointResponse>;
    updateDefaultEndpoint: (params: UpdateDefaultEndpointRequest) => Promise<UpdateDefaultEndpointResponse>;
    getDefaultEndpoint: (params: RetrieveDefaultEndpointRequest) => Promise<RetrieveDefaultEndpointResponse>;
    createDataService: (params: CreateDataServiceRequest) => Promise<CreateDataServiceResponse>;
    createDssDataSource: (params: CreateDssDataSourceRequest) => Promise<CreateDssDataSourceResponse>;
    getDataService: (params: RetrieveDataServiceRequest) => Promise<RetrieveDataServiceResponse>;
    askDriverPath: () => Promise<DriverPathResponse>;
    addDriverToLib: (params: AddDriverToLibRequest) => Promise<AddDriverToLibResponse>;
    deleteDriverFromLib: (params: AddDriverToLibRequest) => void;
    closeWebView: () => void;
    openDiagram: (params: OpenDiagramRequest) => void;
    openFile: (params: OpenDiagramRequest) => void;
    closeWebViewNotification: () => void;
    getWorkspaceRoot: () => Promise<ProjectRootResponse>;
    getProjectRoot: (params: GetProjectRootRequest) => Promise<ProjectRootResponse>;
    askProjectDirPath: () => Promise<ProjectDirResponse>;
    askProjectImportDirPath: () => Promise<ProjectDirResponse>;
    askFileDirPath: () => Promise<FileDirResponse>;
    askOpenAPIDirPath: () => Promise<FileDirResponse>;
    createProject: (params: CreateProjectRequest) => Promise<CreateProjectResponse>;
    importProject: (params: ImportProjectRequest) => Promise<ImportProjectResponse>;
    migrateProject: (params: MigrateProjectRequest) => Promise<MigrateProjectResponse>;
    writeContentToFile: (params: WriteContentToFileRequest) => Promise<WriteContentToFileResponse>;
    handleFileWithFS: (params: HandleFileRequest) => Promise<HandleFileResponse>;
    writeIdpSchemaFileToRegistry: (params: WriteIdpSchemaFileToRegistryRequest) => Promise<WriteIdpSchemaFileToRegistryResponse>;
    getIdpSchemaFiles: ()=> Promise<GetIdpSchemaFilesResponse>;
    readIdpSchemaFileContent: (params: ReadIdpSchemaFileContentRequest) => Promise<ReadIdpSchemaFileContentResponse>;
    highlightCode: (params: HighlightCodeRequest) => void;
    getWorkspaceContext: () => Promise<GetWorkspaceContextResponse>;
    getProjectUuid: () => Promise<GetProjectUuidResponse>;
    initUndoRedoManager: (params: UndoRedoParams) => void;
    undo: (params: UndoRedoParams) => Promise<boolean>;
    redo: (params: UndoRedoParams) => Promise<boolean>;
    getDefinition: (params: GetDefinitionRequest) => Promise<GetDefinitionResponse>;
    getTextAtRange: (params: GetTextAtRangeRequest) => Promise<GetTextAtRangeResponse>;
    getDiagnostics: (params: GetDiagnosticsReqeust) => Promise<GetDiagnosticsResponse>;
    browseFile: (params: BrowseFileRequest) => Promise<BrowseFileResponse>;
    createRegistryResource: (params: CreateRegistryResourceRequest) => Promise<CreateRegistryResourceResponse>;
    getAvailableResources: (params: GetAvailableResourcesRequest) => Promise<GetAvailableResourcesResponse>;
    createClassMediator: (params: CreateClassMediatorRequest) => Promise<CreateClassMediatorResponse>;
    createBallerinaModule: (params: CreateBallerinaModuleRequest) => Promise<CreateBallerinaModuleResponse>;
    buildBallerinaModule: (projectPath: string) => Promise<void>;
    getSelectiveWorkspaceContext: () => Promise<GetSelectiveWorkspaceContextResponse>;
    getSelectiveArtifacts: (params: GetSelectiveArtifactsRequest) => Promise<GetSelectiveArtifactsResponse>;
    getAvailableRegistryResources: (params: ListRegistryArtifactsRequest) => Promise<RegistryArtifactNamesResponse>;
    updateRegistryMetadata: (params: UpdateRegistryMetadataRequest) => Promise<UpdateRegistryMetadataResponse>;
    getMetadataOfRegistryResource: (params: GetRegistryMetadataRequest) => Promise<GetRegistryMetadataResponse>;
    rangeFormat: (params: RangeFormatRequest) => Promise<ApplyEditResponse>;
    downloadConnector: (params: DownloadConnectorRequest) => Promise<DownloadConnectorResponse>;
    copyConnectorZip: (params: CopyConnectorZipRequest) => Promise<CopyConnectorZipResponse>;
    copyArtifact: (params: CopyArtifactRequest) => Promise<CopyArtifactResponse>;
    askImportFileDir: () => Promise<FileDirResponse>;
    downloadInboundConnector: (params: DownloadInboundConnectorRequest) => Promise<DownloadInboundConnectorResponse>;
    getAvailableConnectors: (params: GetAvailableConnectorRequest) => Promise<GetAvailableConnectorResponse>;
    updateConnectors: (params: UpdateConnectorRequest) => void;
    removeConnector: (params: RemoveConnectorRequest) => Promise<RemoveConnectorResponse>;
    getConnectorForm: (params: GetConnectorFormRequest) => Promise<GetConnectorFormResponse>;
    getConnectionForm: (params: GetConnectionFormRequest) => Promise<GetConnectionFormResponse>;
    getStoreConnectorJSON: () => Promise<StoreConnectorJsonResponse>;
    getConnectorIcon: (params: GetConnectorIconRequest) => Promise<GetConnectorIconResponse>
    saveInboundEPUischema: (params: SaveInboundEPUischemaRequest) => Promise<boolean>;
    getInboundEPUischema: (params: GetInboundEPUischemaRequest) => Promise<GetInboundEPUischemaResponse>;
    createDataSource: (params: DataSourceTemplate) => Promise<CreateDataSourceResponse>;
    getDataSource: (params: GetDataSourceRequest) => Promise<DataSourceTemplate>;
    getIconPathUri: (params: GetIconPathUriRequest) => Promise<GetIconPathUriResponse>;
    getUserAccessToken: () => Promise<GetUserAccessTokenResponse>;
    createConnection: (params: CreateConnectionRequest) => Promise<CreateConnectionResponse>;
    getConnectorConnections: (params: GetConnectorConnectionsRequest) => Promise<GetConnectorConnectionsResponse>;
    logoutFromMIAccount: () => void;
    getAllRegistryPaths: (params: GetAllRegistryPathsRequest) => Promise<GetAllRegistryPathsResponse>;
    getAllResourcePaths: () => Promise<GetAllResourcePathsResponse>;
    getConfigurableEntries: () => Promise<GetConfigurableEntriesResponse>;
    getAllArtifacts: (params: GetAllArtifactsRequest) => Promise<GetAllArtifactsResponse>;
    getArtifactType: (params: GetArtifactTypeRequest) => Promise<GetArtifactTypeResponse>;
    deleteArtifact: (params: DeleteArtifactRequest) => void;
    getAllAPIcontexts: () => Promise<APIContextsResponse>;
    buildProject: (params: BuildProjectRequest) => void;
    deployProject: (params: DeployProjectRequest) => Promise<DeployProjectResponse>;
    getDevantMetadata: () => Promise<DevantMetadata>;
    exportProject: (params: ExportProjectRequest) => void;
    checkOldProject: () => Promise<boolean>;
    refreshAccessToken: () => void;
    getOpenAPISpec: (params: SwaggerTypeRequest) => Promise<SwaggerFromAPIResponse>;
    editOpenAPISpec: (params: SwaggerTypeRequest) => void;
    compareSwaggerAndAPI: (params: SwaggerTypeRequest) => Promise<CompareSwaggerAndAPIResponse>;
    updateSwaggerFromAPI: (params: SwaggerTypeRequest) => void;
    updateAPIFromSwagger: (params: UpdateAPIFromSwaggerRequest) => void;
    updateTestSuite: (params: UpdateTestSuiteRequest) => Promise<UpdateTestSuiteResponse>;
    updateTestCase: (params: UpdateTestCaseRequest) => Promise<UpdateTestCaseResponse>;
    updateMockService: (params: UpdateMockServiceRequest) => Promise<UpdateMockServiceResponse>;
    getAllTestSuites: () => Promise<GetAllTestSuitsResponse>;
    getAllMockServices: () => Promise<GetAllMockServicesResponse>;
    openDependencyPom: (params: OpenDependencyPomRequest) => void;
    getAllDependencies: (params: getAllDependenciesRequest) => Promise<GetAllDependenciesResponse>;
    formatPomFile: () => Promise<void>;
    testDbConnection: (params: TestDbConnectionRequest) => Promise<TestDbConnectionResponse>;
    markAsDefaultSequence: (params: MarkAsDefaultSequenceRequest) => void;
    getSubFolderNames: (path: GetSubFoldersRequest) => Promise<GetSubFoldersResponse>;
    renameFile: (params: FileRenameRequest) => void;
    openUpdateExtensionPage: () => void;
    checkDBDriver: (className: string) => Promise<CheckDBDriverResponse>;
    addDBDriver: (params: AddDriverRequest) => Promise<boolean>;
    removeDBDriver: (params: AddDriverRequest) => Promise<boolean>;
    modifyDBDriver: (params: AddDriverRequest) => Promise<boolean>;
    generateDSSQueries: (params: ExtendedDSSQueryGenRequest) => Promise<boolean>;
    fetchDSSTables: (params: DSSFetchTablesRequest) => Promise<DSSFetchTablesResponse>;
    tryOutMediator: (params: MediatorTryOutRequest) => Promise<MediatorTryOutResponse>;
    shutDownTryoutServer: () => Promise<boolean>;
    getMIVersionFromPom: () => Promise<MiVersionResponse>;
    saveInputPayload: (params: SavePayloadRequest) => Promise<boolean>;
    getInputPayloads: (params: GetPayloadsRequest) => Promise<GetPayloadsResponse>;
    getMediatorInputOutputSchema: (params: MediatorTryOutRequest) => Promise<MediatorTryOutResponse>;
    getMediators: (param: GetMediatorsRequest) => Promise<GetMediatorsResponse>;
    getMediator: (param: GetMediatorRequest) => Promise<GetMediatorResponse>;
    updateMediator: (param: UpdateMediatorRequest) => void;
    getLocalInboundConnectors: () => Promise<LocalInboundConnectorsResponse>;
    getConnectionSchema: (param: GetConnectionSchemaRequest) => Promise<GetConnectionSchemaResponse>;
    getExpressionCompletions: (params: ExpressionCompletionsRequest) => Promise<ExpressionCompletionsResponse>;
    getHelperPaneInfo: (params: GetHelperPaneInfoRequest) => Promise<GetHelperPaneInfoResponse>;
    testConnectorConnection: (params: TestConnectorConnectionRequest) => Promise<TestConnectorConnectionResponse>;
    saveConfig: (params: SaveConfigRequest) => Promise<SaveConfigResponse>;
    getEULALicense: () => Promise<string>;
    shouldDisplayPayloadAlert: () => Promise<boolean>;
    displayPayloadAlert: () => Promise<void>;
    closePayloadAlert: () => Promise<void>;
    submitFeedback: (params: SubmitFeedbackRequest) => Promise<SubmitFeedbackResponse>;
    getPomFileContent: () => Promise<GetPomFileContentResponse>;
    getExternalConnectorDetails: () => Promise<GetExternalConnectorDetailsResponse>;
    writeMockServices: (params: WriteMockServicesRequest) => Promise<WriteMockServicesResponse>;
    getMockServices: () => Promise<GetMockServicesResponse>;
    configureKubernetes: (params: ConfigureKubernetesRequest) => Promise<ConfigureKubernetesResponse>;
    isKubernetesConfigured: () => Promise<boolean>;
    updatePropertiesInArtifactXML: (params: UpdateRegistryPropertyRequest) => Promise<string>;
    getPropertiesFromArtifactXML: (params: string) => Promise<Property[] | undefined>;
    getInputOutputMappings: (params: GenerateMappingsParamsRequest) => Promise<string[]>;
}
