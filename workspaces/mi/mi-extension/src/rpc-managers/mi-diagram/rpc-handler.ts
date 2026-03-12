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
    AIUserInput,
    AddDriverRequest,
    AddDriverToLibRequest,
    ApplyEditRequest,
    BrowseFileRequest,
    CommandsRequest,
    ConnectorRequest,
    CreateAPIRequest,
    CreateClassMediatorRequest,
    CreateConnectionRequest,
    CreateDataServiceRequest,
    CreateDssDataSourceRequest,
    CreateEndpointRequest,
    CreateInboundEndpointRequest,
    CreateLocalEntryRequest,
    CreateMessageProcessorRequest,
    CreateMessageStoreRequest,
    CreateProjectRequest,
    CreateProxyServiceRequest,
    CreateRegistryResourceRequest,
    CreateSequenceRequest,
    CreateTaskRequest,
    CreateTemplateRequest,
    DSSFetchTablesRequest,
    DataSourceTemplate,
    DeleteArtifactRequest,
    DownloadConnectorRequest,
    DownloadInboundConnectorRequest,
    EditAPIRequest,
    ExportProjectRequest,
    ExtendedDSSQueryGenRequest,
    FileRenameRequest,
    ExpressionCompletionsRequest,
    GetAllArtifactsRequest,
    GetAllRegistryPathsRequest,
    GetAvailableConnectorRequest,
    GetAvailableResourcesRequest,
    GetConnectionFormRequest,
    GetConnectorConnectionsRequest,
    GetConnectorFormRequest,
    GetDataSourceRequest,
    GetDefinitionRequest,
    GetDiagnosticsReqeust,
    GetFailoverEPRequest,
    GetHelperPaneInfoRequest,
    GetIconPathUriRequest,
    GetInboundEPUischemaRequest,
    GetInboundEndpointRequest,
    GetLoadBalanceEPRequest,
    GetLocalEntryRequest,
    GetMediatorRequest,
    GetMediatorsRequest,
    GetMessageStoreRequest,
    GetProjectRootRequest,
    GetRecipientEPRequest,
    GetRegistryMetadataRequest,
    GetSelectiveArtifactsRequest,
    GetSubFoldersRequest,
    GetTaskRequest,
    GetTemplateEPRequest,
    GetTextAtRangeRequest,
    HighlightCodeRequest,
    ImportProjectRequest,
    ListRegistryArtifactsRequest,
    MarkAsDefaultSequenceRequest,
    MigrateProjectRequest,
    OpenDependencyPomRequest,
    OpenDiagramRequest,
    RangeFormatRequest,
    RetrieveAddressEndpointRequest,
    RetrieveDataServiceRequest,
    RetrieveDefaultEndpointRequest,
    RetrieveHttpEndpointRequest,
    RetrieveMessageProcessorRequest,
    RetrieveTemplateRequest,
    RetrieveWsdlEndpointRequest,
    SaveConfigRequest,
    SaveInboundEPUischemaRequest,
    ShowErrorMessageRequest,
    SwaggerTypeRequest,
    TestDbConnectionRequest,
    UndoRedoParams,
    UpdateAPIFromSwaggerRequest,
    UpdateAddressEndpointRequest,
    UpdateConnectorRequest,
    UpdateDefaultEndpointRequest,
    UpdateFailoverEPRequest,
    UpdateHttpEndpointRequest,
    UpdateLoadBalanceEPRequest,
    UpdateMediatorRequest,
    UpdateMockServiceRequest,
    UpdateRecipientEPRequest,
    UpdateRegistryMetadataRequest,
    UpdateTemplateEPRequest,
    UpdateTestCaseRequest,
    UpdateTestSuiteRequest,
    UpdateWsdlEndpointRequest,
    WriteContentToFileRequest,
    WriteMockServicesRequest,
    HandleFileRequest,
    WriteIdpSchemaFileToRegistryRequest,
    ReadIdpSchemaFileContentRequest,
    addDBDriver,
    addDriverToLib,
    applyEdit,
    askDriverPath,
    askFileDirPath,
    askProjectDirPath,
    askProjectImportDirPath,
    browseFile,
    buildProject,
    remoteDeploy,
    checkDBDriver,
    checkOldProject,
    closePayloadAlert,
    closeWebView,
    closeWebViewNotification,
    compareSwaggerAndAPI,
    createAPI,
    createClassMediator,
    createBallerinaModule,
    buildBallerinaModule,
    createConnection,
    createDataService,
    createDataSource,
    createDssDataSource,
    createEndpoint,
    createInboundEndpoint,
    createLocalEntry,
    createMessageProcessor,
    createMessageStore,
    createProject,
    createProxyService,
    createRegistryResource,
    createSequence,
    createTask,
    createTemplate,
    deleteArtifact,
    deleteDriverFromLib,
    displayPayloadAlert,
    downloadConnector,
    downloadInboundConnector,
    editAPI,
    editOpenAPISpec,
    executeCommand,
    exportProject,
    fetchDSSTables,
    generateDSSQueries,
    getAPIDirectory,
    getAddressEndpoint,
    getAllAPIcontexts,
    getAllArtifacts,
    getAllDependencies,
    getAllDependenciesRequest,
    getAllMockServices,
    getAllRegistryPaths,
    getAllResourcePaths,
    getConfigurableEntries,
    getAllTestSuites,
    getAvailableConnectors,
    getAvailableRegistryResources,
    getAvailableResources,
    getProxyRootUrl,
    getConnectionForm,
    getConnector,
    getConnectorConnections,
    getConnectorForm,
    getConnectors,
    getDataService,
    getDataSource,
    getDefaultEndpoint,
    getDefinition,
    getDiagnostics,
    getESBConfigs,
    getEndpointDirectory,
    getEndpointsAndSequences,
    getExpressionCompletions,
    getFailoverEndpoint,
    getHelperPaneInfo,
    getHttpEndpoint,
    getIconPathUri,
    getInboundEPUischema,
    getInboundEndpoint,
    getLoadBalanceEndpoint,
    getLocalEntry,
    getMediator,
    getMediators,
    getMessageProcessor,
    getMessageStore,
    getMetadataOfRegistryResource,
    getOpenAPISpec,
    getProjectRoot,
    getProjectUuid,
    getRecipientEndpoint,
    getSTRequest,
    getSelectiveArtifacts,
    getSelectiveWorkspaceContext,
    getSequenceDirectory,
    getStoreConnectorJSON,
    getSubFolderNames,
    getEULALicense,
    getSyntaxTree,
    getTask,
    getTemplate,
    getTemplateEndpoint,
    getTemplates,
    getTextAtRange,
    getUserAccessToken,
    getWorkspaceContext,
    getWorkspaceRoot,
    getWsdlEndpoint,
    highlightCode,
    importProject,
    initUndoRedoManager,
    logoutFromMIAccount,
    markAsDefaultSequence,
    migrateProject,
    openDependencyPom,
    openDiagram,
    openFile,
    openUpdateExtensionPage,
    rangeFormat,
    redo,
    refreshAccessToken,
    renameFile,
    saveConfig,
    saveInboundEPUischema,
    shouldDisplayPayloadAlert,
    showErrorMessage,
    testDbConnection,
    undo,
    updateAPIFromSwagger,
    updateAddressEndpoint,
    updateConnectors,
    updateDefaultEndpoint,
    updateFailoverEndpoint,
    updateHttpEndpoint,
    updateLoadBalanceEndpoint,
    updateMediator,
    updateMockService,
    updateRecipientEndpoint,
    updateRegistryMetadata,
    updateSwaggerFromAPI,
    updateTemplateEndpoint,
    updateTestCase,
    updateTestSuite,
    updateWsdlEndpoint,
    writeContentToFile,
    writeMockServices,
    handleFileWithFS,
    writeIdpSchemaFileToRegistry,
    getIdpSchemaFiles,
    convertPdfToBase64Images,
    readIdpSchemaFileContent,
    tryOutMediator,
    MediatorTryOutRequest,
    saveInputPayload,
    getInputPayloads,
    getAllInputDefaultPayloads,
    SavePayloadRequest,
    GetPayloadsRequest,
    getMediatorInputOutputSchema,
    GetConnectionSchemaRequest,
    getConnectionSchema,
    CopyConnectorZipRequest,
    copyConnectorZip,
    ApplyEditsRequest,
    askOpenAPIDirPath,
    RemoveConnectorRequest,
    removeConnector,
    TestConnectorConnectionRequest,
    testConnectorConnection,
    getMIVersionFromPom,
    removeDBDriver,
    modifyDBDriver,
    CopyArtifactRequest,
    copyArtifact,
    GetArtifactTypeRequest,
    getArtifactType,
    askImportFileDir,
    getLocalInboundConnectors,
    BuildProjectRequest,
    deployProject,
    DeployProjectRequest,
    CreateBallerinaModuleRequest,
    getDevantMetadata,
    GetConnectorIconRequest,
    getConnectorIcon,
    getValueOfEnvVariable,
    SubmitFeedbackRequest,
    submitFeedback,
    getPomFileContent,
    getExternalConnectorDetails,
    getMockServices,
    configureKubernetes,
    ConfigureKubernetesRequest,
    isKubernetesConfigured,
    UpdateRegistryPropertyRequest,
    updatePropertiesInArtifactXML,
    getPropertiesFromArtifactXML,
    formatPomFile,
    GenerateMappingsParamsRequest,
    getInputOutputMappings
    // getBackendRootUrl - REMOVED: Backend URLs deprecated, all AI features use local LLM,
} from "@wso2/mi-core";
import { Messenger } from "vscode-messenger";
import { MiDiagramRpcManager } from "./rpc-manager";

export function registerMiDiagramRpcHandlers(messenger: Messenger, projectUri: string): void {
    const rpcManger = new MiDiagramRpcManager(projectUri);
    messenger.onRequest(executeCommand, (args: CommandsRequest) => rpcManger.executeCommand(args));
    messenger.onNotification(showErrorMessage, (args: ShowErrorMessageRequest) => rpcManger.showErrorMessage(args));
    messenger.onRequest(getSyntaxTree, (args: getSTRequest) => rpcManger.getSyntaxTree(args));
    messenger.onRequest(applyEdit, (args: ApplyEditRequest | ApplyEditsRequest) => rpcManger.applyEdit(args));
    messenger.onRequest(getESBConfigs, () => rpcManger.getESBConfigs());
    messenger.onRequest(getConnectors, () => rpcManger.getConnectors());
    messenger.onRequest(getConnector, (args: ConnectorRequest) => rpcManger.getConnector(args));
    messenger.onRequest(getAPIDirectory, () => rpcManger.getAPIDirectory());
    messenger.onRequest(createAPI, (args: CreateAPIRequest) => rpcManger.createAPI(args));
    messenger.onRequest(editAPI, (args: EditAPIRequest) => rpcManger.editAPI(args));
    messenger.onRequest(getEndpointDirectory, () => rpcManger.getEndpointDirectory());
    messenger.onRequest(createEndpoint, (args: CreateEndpointRequest) => rpcManger.createEndpoint(args));
    messenger.onRequest(updateLoadBalanceEndpoint, (args: UpdateLoadBalanceEPRequest) => rpcManger.updateLoadBalanceEndpoint(args));
    messenger.onRequest(getLoadBalanceEndpoint, (args: GetLoadBalanceEPRequest) => rpcManger.getLoadBalanceEndpoint(args));
    messenger.onRequest(updateFailoverEndpoint, (args: UpdateFailoverEPRequest) => rpcManger.updateFailoverEndpoint(args));
    messenger.onRequest(getFailoverEndpoint, (args: GetFailoverEPRequest) => rpcManger.getFailoverEndpoint(args));
    messenger.onRequest(updateRecipientEndpoint, (args: UpdateRecipientEPRequest) => rpcManger.updateRecipientEndpoint(args));
    messenger.onRequest(getRecipientEndpoint, (args: GetRecipientEPRequest) => rpcManger.getRecipientEndpoint(args));
    messenger.onRequest(updateTemplateEndpoint, (args: UpdateTemplateEPRequest) => rpcManger.updateTemplateEndpoint(args));
    messenger.onRequest(getTemplateEndpoint, (args: GetTemplateEPRequest) => rpcManger.getTemplateEndpoint(args));
    messenger.onRequest(createLocalEntry, (args: CreateLocalEntryRequest) => rpcManger.createLocalEntry(args));
    messenger.onRequest(getLocalEntry, (args: GetLocalEntryRequest) => rpcManger.getLocalEntry(args));
    messenger.onRequest(getEndpointsAndSequences, () => rpcManger.getEndpointsAndSequences());
    messenger.onRequest(getTemplates, () => rpcManger.getTemplates());
    messenger.onRequest(getSequenceDirectory, () => rpcManger.getSequenceDirectory());
    messenger.onRequest(createSequence, (args: CreateSequenceRequest) => rpcManger.createSequence(args));
    messenger.onRequest(createMessageStore, (args: CreateMessageStoreRequest) => rpcManger.createMessageStore(args));
    messenger.onRequest(getMessageStore, (args: GetMessageStoreRequest) => rpcManger.getMessageStore(args));
    messenger.onRequest(createInboundEndpoint, (args: CreateInboundEndpointRequest) => rpcManger.createInboundEndpoint(args));
    messenger.onRequest(createMessageProcessor, (args: CreateMessageProcessorRequest) => rpcManger.createMessageProcessor(args));
    messenger.onRequest(getMessageProcessor, (args: RetrieveMessageProcessorRequest) => rpcManger.getMessageProcessor(args));
    messenger.onRequest(createProxyService, (args: CreateProxyServiceRequest) => rpcManger.createProxyService(args));
    messenger.onRequest(createTask, (args: CreateTaskRequest) => rpcManger.createTask(args));
    messenger.onRequest(getTask, (args: GetTaskRequest) => rpcManger.getTask(args));
    messenger.onRequest(createTemplate, (args: CreateTemplateRequest) => rpcManger.createTemplate(args));
    messenger.onRequest(getTemplate, (args: RetrieveTemplateRequest) => rpcManger.getTemplate(args));
    messenger.onRequest(getInboundEndpoint, (args: GetInboundEndpointRequest) => rpcManger.getInboundEndpoint(args));
    messenger.onRequest(updateHttpEndpoint, (args: UpdateHttpEndpointRequest) => rpcManger.updateHttpEndpoint(args));
    messenger.onRequest(getHttpEndpoint, (args: RetrieveHttpEndpointRequest) => rpcManger.getHttpEndpoint(args));
    messenger.onRequest(updateAddressEndpoint, (args: UpdateAddressEndpointRequest) => rpcManger.updateAddressEndpoint(args));
    messenger.onRequest(getAddressEndpoint, (args: RetrieveAddressEndpointRequest) => rpcManger.getAddressEndpoint(args));
    messenger.onRequest(updateWsdlEndpoint, (args: UpdateWsdlEndpointRequest) => rpcManger.updateWsdlEndpoint(args));
    messenger.onRequest(getWsdlEndpoint, (args: RetrieveWsdlEndpointRequest) => rpcManger.getWsdlEndpoint(args));
    messenger.onRequest(updateDefaultEndpoint, (args: UpdateDefaultEndpointRequest) => rpcManger.updateDefaultEndpoint(args));
    messenger.onRequest(getDefaultEndpoint, (args: RetrieveDefaultEndpointRequest) => rpcManger.getDefaultEndpoint(args));
    messenger.onRequest(createDataService, (args: CreateDataServiceRequest) => rpcManger.createDataService(args));
    messenger.onRequest(createDssDataSource, (args: CreateDssDataSourceRequest) => rpcManger.createDssDataSource(args));
    messenger.onRequest(getDataService, (args: RetrieveDataServiceRequest) => rpcManger.getDataService(args));
    messenger.onRequest(askDriverPath, () => rpcManger.askDriverPath());
    messenger.onRequest(addDriverToLib, (args: AddDriverToLibRequest) => rpcManger.addDriverToLib(args));
    messenger.onNotification(deleteDriverFromLib, (args: AddDriverToLibRequest) => rpcManger.deleteDriverFromLib(args));
    messenger.onNotification(closeWebView, () => rpcManger.closeWebView());
    messenger.onNotification(openDiagram, (args: OpenDiagramRequest) => rpcManger.openDiagram(args));
    messenger.onNotification(openFile, (args: OpenDiagramRequest) => rpcManger.openFile(args));
    messenger.onNotification(closeWebViewNotification, () => rpcManger.closeWebViewNotification());
    messenger.onRequest(getWorkspaceRoot, () => rpcManger.getWorkspaceRoot());
    messenger.onRequest(getProjectRoot, (args: GetProjectRootRequest) => rpcManger.getProjectRoot(args));
    messenger.onRequest(askProjectDirPath, () => rpcManger.askProjectDirPath());
    messenger.onRequest(askProjectImportDirPath, () => rpcManger.askProjectImportDirPath());
    messenger.onRequest(askFileDirPath, () => rpcManger.askFileDirPath());
    messenger.onRequest(askOpenAPIDirPath, () => rpcManger.askOpenAPIDirPath());
    messenger.onRequest(createProject, (args: CreateProjectRequest) => rpcManger.createProject(args));
    messenger.onRequest(importProject, (args: ImportProjectRequest) => rpcManger.importProject(args));
    messenger.onRequest(migrateProject, (args: MigrateProjectRequest) => rpcManger.migrateProject(args));
    messenger.onRequest(writeContentToFile, (args: WriteContentToFileRequest) => rpcManger.writeContentToFile(args));
    messenger.onRequest(writeMockServices, (args: WriteMockServicesRequest) => rpcManger.writeMockServices(args));
    messenger.onRequest(handleFileWithFS, (args: HandleFileRequest) => rpcManger.handleFileWithFS(args));
    messenger.onRequest(writeIdpSchemaFileToRegistry, (args: WriteIdpSchemaFileToRegistryRequest) => rpcManger.writeIdpSchemaFileToRegistry(args));
    messenger.onRequest(getIdpSchemaFiles,() => rpcManger.getIdpSchemaFiles());
    messenger.onRequest(convertPdfToBase64Images, (args: string) => rpcManger.convertPdfToBase64Images(args));
    messenger.onRequest(readIdpSchemaFileContent, (args: ReadIdpSchemaFileContentRequest) => rpcManger.readIdpSchemaFileContent(args));
    messenger.onNotification(highlightCode, (args: HighlightCodeRequest) => rpcManger.highlightCode(args));
    messenger.onRequest(getWorkspaceContext, () => rpcManger.getWorkspaceContext());
    messenger.onRequest(getProjectUuid, () => rpcManger.getProjectUuid());
    messenger.onNotification(initUndoRedoManager, (args: UndoRedoParams) => rpcManger.initUndoRedoManager(args));
    messenger.onRequest(undo, (args: UndoRedoParams) => rpcManger.undo(args));
    messenger.onRequest(redo, (args: UndoRedoParams) => rpcManger.redo(args));
    messenger.onRequest(getDefinition, (args: GetDefinitionRequest) => rpcManger.getDefinition(args));
    messenger.onRequest(getTextAtRange, (args: GetTextAtRangeRequest) => rpcManger.getTextAtRange(args));
    messenger.onRequest(getDiagnostics, (args: GetDiagnosticsReqeust) => rpcManger.getDiagnostics(args));
    messenger.onRequest(browseFile, (args: BrowseFileRequest) => rpcManger.browseFile(args));
    messenger.onRequest(createRegistryResource, (args: CreateRegistryResourceRequest) => rpcManger.createRegistryResource(args));
    messenger.onRequest(getAvailableResources, (args: GetAvailableResourcesRequest) => rpcManger.getAvailableResources(args));
    messenger.onRequest(createClassMediator, (args: CreateClassMediatorRequest) => rpcManger.createClassMediator(args));
    messenger.onRequest(createBallerinaModule, (args: CreateBallerinaModuleRequest) => rpcManger.createBallerinaModule(args));
    messenger.onRequest(buildBallerinaModule, (args: string) => rpcManger.buildBallerinaModule(args));
    messenger.onRequest(getSelectiveWorkspaceContext, () => rpcManger.getSelectiveWorkspaceContext());
    messenger.onRequest(getSelectiveArtifacts, (args: GetSelectiveArtifactsRequest) => rpcManger.getSelectiveArtifacts(args));
    messenger.onRequest(getProxyRootUrl, () => rpcManger.getProxyRootUrl());
    messenger.onRequest(getAvailableRegistryResources, (args: ListRegistryArtifactsRequest) => rpcManger.getAvailableRegistryResources(args));
    messenger.onRequest(updateRegistryMetadata, (args: UpdateRegistryMetadataRequest) => rpcManger.updateRegistryMetadata(args));
    messenger.onRequest(getMetadataOfRegistryResource, (args: GetRegistryMetadataRequest) => rpcManger.getMetadataOfRegistryResource(args));
    messenger.onRequest(rangeFormat, (args: RangeFormatRequest) => rpcManger.rangeFormat(args));
    messenger.onRequest(downloadConnector, (args: DownloadConnectorRequest) => rpcManger.downloadConnector(args));
    messenger.onRequest(downloadInboundConnector, (args: DownloadInboundConnectorRequest) => rpcManger.downloadInboundConnector(args));
    messenger.onRequest(copyConnectorZip, (args: CopyConnectorZipRequest) => rpcManger.copyConnectorZip(args));
    messenger.onRequest(copyArtifact, (args: CopyArtifactRequest) => rpcManger.copyArtifact(args));
    messenger.onRequest(askImportFileDir, () => rpcManger.askImportFileDir());
    messenger.onRequest(removeConnector, (args: RemoveConnectorRequest) => rpcManger.removeConnector(args));
    messenger.onRequest(getAvailableConnectors, (args: GetAvailableConnectorRequest) => rpcManger.getAvailableConnectors(args));
    messenger.onNotification(updateConnectors, (args: UpdateConnectorRequest) => rpcManger.updateConnectors(args));
    messenger.onRequest(getConnectorForm, (args: GetConnectorFormRequest) => rpcManger.getConnectorForm(args));
    messenger.onRequest(getConnectionForm, (args: GetConnectionFormRequest) => rpcManger.getConnectionForm(args));
    messenger.onRequest(getStoreConnectorJSON, () => rpcManger.getStoreConnectorJSON());
    messenger.onRequest(getConnectorIcon, (args: GetConnectorIconRequest) => rpcManger.getConnectorIcon(args));
    messenger.onRequest(saveInboundEPUischema, (args: SaveInboundEPUischemaRequest) => rpcManger.saveInboundEPUischema(args));
    messenger.onRequest(getInboundEPUischema, (args: GetInboundEPUischemaRequest) => rpcManger.getInboundEPUischema(args));
    messenger.onRequest(createDataSource, (args: DataSourceTemplate) => rpcManger.createDataSource(args));
    messenger.onRequest(getDataSource, (args: GetDataSourceRequest) => rpcManger.getDataSource(args));
    messenger.onRequest(getIconPathUri, (args: GetIconPathUriRequest) => rpcManger.getIconPathUri(args));
    messenger.onRequest(getUserAccessToken, () => rpcManger.getUserAccessToken());
    messenger.onRequest(createConnection, (args: CreateConnectionRequest) => rpcManger.createConnection(args));
    messenger.onRequest(getConnectorConnections, (args: GetConnectorConnectionsRequest) => rpcManger.getConnectorConnections(args));
    messenger.onNotification(logoutFromMIAccount, () => rpcManger.logoutFromMIAccount());
    messenger.onRequest(getAllRegistryPaths, (args: GetAllRegistryPathsRequest) => rpcManger.getAllRegistryPaths(args));
    messenger.onRequest(getAllResourcePaths, () => rpcManger.getAllResourcePaths());
    messenger.onRequest(getConfigurableEntries, () => rpcManger.getConfigurableEntries());
    messenger.onRequest(getAllArtifacts, (args: GetAllArtifactsRequest) => rpcManger.getAllArtifacts(args));
    messenger.onRequest(getArtifactType, (argas: GetArtifactTypeRequest) => rpcManger.getArtifactType(argas));
    messenger.onNotification(deleteArtifact, (args: DeleteArtifactRequest) => rpcManger.deleteArtifact(args));
    messenger.onRequest(getAllAPIcontexts, () => rpcManger.getAllAPIcontexts());
    messenger.onNotification(buildProject, (args: BuildProjectRequest) => rpcManger.buildProject(args));
    messenger.onRequest(deployProject, (args: DeployProjectRequest) => rpcManger.deployProject(args));
    messenger.onNotification(remoteDeploy, () => rpcManger.remoteDeploy());
    messenger.onRequest(getDevantMetadata, () => rpcManger.getDevantMetadata());
    messenger.onNotification(exportProject, (args: ExportProjectRequest) => rpcManger.exportProject(args));
    messenger.onRequest(checkOldProject, () => rpcManger.checkOldProject());
    messenger.onNotification(refreshAccessToken, () => rpcManger.refreshAccessToken());
    messenger.onRequest(getOpenAPISpec, (args: SwaggerTypeRequest) => rpcManger.getOpenAPISpec(args));
    messenger.onNotification(editOpenAPISpec, (args: SwaggerTypeRequest) => rpcManger.editOpenAPISpec(args));
    messenger.onRequest(compareSwaggerAndAPI, (args: SwaggerTypeRequest) => rpcManger.compareSwaggerAndAPI(args));
    messenger.onNotification(updateSwaggerFromAPI, (args: SwaggerTypeRequest) => rpcManger.updateSwaggerFromAPI(args));
    messenger.onNotification(updateAPIFromSwagger, (args: UpdateAPIFromSwaggerRequest) => rpcManger.updateAPIFromSwagger(args));
    messenger.onRequest(updateTestSuite, (args: UpdateTestSuiteRequest) => rpcManger.updateTestSuite(args));
    messenger.onRequest(updateTestCase, (args: UpdateTestCaseRequest) => rpcManger.updateTestCase(args));
    messenger.onRequest(updateMockService, (args: UpdateMockServiceRequest) => rpcManger.updateMockService(args));
    messenger.onRequest(getAllTestSuites, () => rpcManger.getAllTestSuites());
    messenger.onRequest(getAllMockServices, () => rpcManger.getAllMockServices());
    messenger.onRequest(getMIVersionFromPom, () => rpcManger.getMIVersionFromPom());
    messenger.onNotification(openDependencyPom, (args: OpenDependencyPomRequest) => rpcManger.openDependencyPom(args));
    messenger.onRequest(getAllDependencies, (args: getAllDependenciesRequest) => rpcManger.getAllDependencies(args));
    messenger.onRequest(formatPomFile, () => rpcManger.formatPomFile());
    messenger.onRequest(testDbConnection, (args: TestDbConnectionRequest) => rpcManger.testDbConnection(args));
    messenger.onNotification(markAsDefaultSequence, (args: MarkAsDefaultSequenceRequest) => rpcManger.markAsDefaultSequence(args));
    messenger.onRequest(getSubFolderNames, (args: GetSubFoldersRequest) => rpcManger.getSubFolderNames(args));
    messenger.onNotification(renameFile, (args: FileRenameRequest) => rpcManger.renameFile(args));
    messenger.onNotification(openUpdateExtensionPage, () => rpcManger.openUpdateExtensionPage());
    messenger.onRequest(checkDBDriver, (args: string) => rpcManger.checkDBDriver(args));
    messenger.onRequest(addDBDriver, (args: AddDriverRequest) => rpcManger.addDBDriver(args));
    messenger.onRequest(removeDBDriver, (args: AddDriverRequest) => rpcManger.removeDBDriver(args));
    messenger.onRequest(modifyDBDriver, (args: AddDriverRequest) => rpcManger.modifyDBDriver(args));
    messenger.onRequest(generateDSSQueries, (args: ExtendedDSSQueryGenRequest) => rpcManger.generateDSSQueries(args));
    messenger.onRequest(fetchDSSTables, (args: DSSFetchTablesRequest) => rpcManger.fetchDSSTables(args));
    messenger.onRequest(tryOutMediator, (args: MediatorTryOutRequest) => rpcManger.tryOutMediator(args));
    messenger.onRequest(getMediatorInputOutputSchema, (args: MediatorTryOutRequest) => rpcManger.getMediatorInputOutputSchema(args));
    messenger.onRequest(saveInputPayload, (args: SavePayloadRequest) => rpcManger.saveInputPayload(args));
    messenger.onRequest(getInputPayloads, (args: GetPayloadsRequest) => rpcManger.getInputPayloads(args));
    messenger.onRequest(getAllInputDefaultPayloads, () => rpcManger.getAllInputDefaultPayloads());
    messenger.onRequest(getMediators, (args: GetMediatorsRequest) => rpcManger.getMediators(args));
    messenger.onRequest(getMediator, (args: GetMediatorRequest) => rpcManger.getMediator(args));
    messenger.onRequest(getLocalInboundConnectors, () => rpcManger.getLocalInboundConnectors());
    messenger.onRequest(getConnectionSchema, (args: GetConnectionSchemaRequest) => rpcManger.getConnectionSchema(args));
    messenger.onRequest(updateMediator, (args: UpdateMediatorRequest) => rpcManger.updateMediator(args));
    messenger.onRequest(getExpressionCompletions, (args: ExpressionCompletionsRequest) => rpcManger.getExpressionCompletions(args));
    messenger.onRequest(getHelperPaneInfo, (args: GetHelperPaneInfoRequest) => rpcManger.getHelperPaneInfo(args));
    messenger.onRequest(testConnectorConnection, (args: TestConnectorConnectionRequest) => rpcManger.testConnectorConnection(args));
    messenger.onRequest(saveConfig, (args: SaveConfigRequest) => rpcManger.saveConfig(args));
    messenger.onRequest(getEULALicense, () => rpcManger.getEULALicense());
    messenger.onRequest(shouldDisplayPayloadAlert, () => rpcManger.shouldDisplayPayloadAlert());
    messenger.onRequest(displayPayloadAlert, () => rpcManger.displayPayloadAlert());
    messenger.onRequest(closePayloadAlert, () => rpcManger.closePayloadAlert());
    messenger.onRequest(getValueOfEnvVariable, (args: string) => rpcManger.getValueOfEnvVariable(args));
    messenger.onRequest(submitFeedback, (args: SubmitFeedbackRequest) => rpcManger.submitFeedback(args));
    messenger.onRequest(getPomFileContent, () => rpcManger.getPomFileContent());
    messenger.onRequest(getExternalConnectorDetails, () => rpcManger.getExternalConnectorDetails());
    messenger.onRequest(getMockServices, () => rpcManger.getMockServices());
    messenger.onRequest(configureKubernetes, (args: ConfigureKubernetesRequest) => rpcManger.configureKubernetes(args));
    messenger.onRequest(isKubernetesConfigured, () => rpcManger.isKubernetesConfigured());
    messenger.onRequest(updatePropertiesInArtifactXML, (args: UpdateRegistryPropertyRequest) => rpcManger.updatePropertiesInArtifactXML(args));
    messenger.onRequest(getPropertiesFromArtifactXML, (args: string) => rpcManger.getPropertiesFromArtifactXML(args));
    messenger.onRequest(getInputOutputMappings, (args: GenerateMappingsParamsRequest) => rpcManger.getInputOutputMappings(args));
}
