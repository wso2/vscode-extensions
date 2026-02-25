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
    AI_EVENT_TYPE,
    AddDriverRequest,
    ApiDirectoryResponse,
    ApplyEditRequest,
    ApplyEditResponse,
    BrowseFileRequest,
    BrowseFileResponse,
    CommandsRequest,
    CommandsResponse,
    CompareSwaggerAndAPIResponse,
    Configuration,
    Connector,
    ConnectorRequest,
    ConnectorResponse,
    ConnectorsResponse,
    CreateAPIRequest,
    CreateAPIResponse,
    CreateClassMediatorRequest,
    CreateClassMediatorResponse,
    CreateConnectionRequest,
    CreateConnectionResponse,
    CreateDataServiceRequest,
    CreateDataServiceResponse,
    CreateDataSourceResponse,
    CreateDssDataSourceRequest,
    CreateDssDataSourceResponse,
    CreateEndpointRequest,
    CreateEndpointResponse,
    CreateInboundEndpointRequest,
    CreateInboundEndpointResponse,
    CreateLocalEntryRequest,
    CreateLocalEntryResponse,
    CreateMessageProcessorRequest,
    CreateMessageProcessorResponse,
    CreateMessageStoreRequest,
    CreateMessageStoreResponse,
    CreateProjectRequest,
    CreateProjectResponse,
    CreateProxyServiceRequest,
    CreateProxyServiceResponse,
    CreateRegistryResourceRequest,
    CreateRegistryResourceResponse,
    CreateSequenceRequest,
    CreateSequenceResponse,
    CreateTaskRequest,
    CreateTaskResponse,
    CreateTemplateRequest,
    CreateTemplateResponse,
    DSSFetchTablesRequest,
    DSSFetchTablesResponse,
    DataSourceTemplate,
    Datasource,
    DeleteArtifactRequest,
    Dependency,
    DownloadConnectorRequest,
    DownloadConnectorResponse,
    DownloadInboundConnectorRequest,
    DownloadInboundConnectorResponse,
    ESBConfigsResponse,
    EVENT_TYPE,
    EditAPIRequest,
    EditAPIResponse,
    EndpointDirectoryResponse,
    EndpointsAndSequencesResponse,
    ExportProjectRequest,
    ExtendedDSSQueryGenRequest,
    ExpressionCompletionsRequest,
    ExpressionCompletionsResponse,
    FileDirResponse,
    FileRenameRequest,
    FileStructure,
    GenerateAPIResponse,
    GenerateMappingsParamsRequest,
    GetAllArtifactsRequest,
    GetAllArtifactsResponse,
    GetAllDependenciesResponse,
    GetAllMockServicesResponse,
    GetAllRegistryPathsRequest,
    GetAllRegistryPathsResponse,
    GetAllResourcePathsResponse,
    GetConfigurableEntriesResponse,
    GetAllTestSuitsResponse,
    GetAvailableConnectorRequest,
    GetAvailableConnectorResponse,
    GetAvailableResourcesRequest,
    GetAvailableResourcesResponse,
    GetBackendRootUrlResponse,
    GetProxyRootUrlResponse,
    GetConnectionFormRequest,
    GetConnectionFormResponse,
    GetConnectorConnectionsRequest,
    GetConnectorConnectionsResponse,
    GetConnectorFormRequest,
    GetConnectorFormResponse,
    GetDataSourceRequest,
    GetDefinitionRequest,
    GetDefinitionResponse,
    GetDiagnosticsReqeust,
    GetDiagnosticsResponse,
    GetFailoverEPRequest,
    GetFailoverEPResponse,
    GetHelperPaneInfoRequest,
    GetHelperPaneInfoResponse,
    GetIconPathUriRequest,
    GetIconPathUriResponse,
    GetInboundEPUischemaRequest,
    GetInboundEPUischemaResponse,
    GetInboundEndpointRequest,
    GetInboundEndpointResponse,
    GetLoadBalanceEPRequest,
    GetLoadBalanceEPResponse,
    GetLocalEntryRequest,
    GetLocalEntryResponse,
    GetMediatorRequest,
    GetMediatorResponse,
    GetMediatorsRequest,
    GetMediatorsResponse,
    McpToolsRequest,
    McpToolsResponse,
    GetMessageStoreRequest,
    GetMessageStoreResponse,
    GetProjectRootRequest,
    GetProjectUuidResponse,
    GetRecipientEPRequest,
    GetRecipientEPResponse,
    GetRegistryMetadataRequest,
    GetRegistryMetadataResponse,
    GetSTFromUriRequest,
    GetSelectiveArtifactsRequest,
    GetSelectiveArtifactsResponse,
    GetSelectiveWorkspaceContextResponse,
    GetSubFoldersRequest,
    GetSubFoldersResponse,
    GetTaskRequest,
    GetTaskResponse,
    GetTemplateEPRequest,
    GetTemplateEPResponse,
    GetTextAtRangeRequest,
    GetTextAtRangeResponse,
    GetUserAccessTokenResponse,
    GetWorkspaceContextResponse,
    HighlightCodeRequest,
    ImportProjectRequest,
    ImportProjectResponse,
    ListRegistryArtifactsRequest,
    MACHINE_VIEW,
    MarkAsDefaultSequenceRequest,
    MiDiagramAPI,
    MigrateProjectRequest,
    MigrateProjectResponse,
    OpenDependencyPomRequest,
    OpenDiagramRequest,
    POPUP_EVENT_TYPE,
    ProjectDirResponse,
    ProjectRootResponse,
    Property,
    RangeFormatRequest,
    RegistryArtifact,
    RegistryArtifactNamesResponse,
    RetrieveAddressEndpointRequest,
    RetrieveAddressEndpointResponse,
    RetrieveDataServiceRequest,
    RetrieveDataServiceResponse,
    RetrieveDefaultEndpointRequest,
    RetrieveDefaultEndpointResponse,
    RetrieveHttpEndpointRequest,
    RetrieveHttpEndpointResponse,
    RetrieveMessageProcessorRequest,
    RetrieveMessageProcessorResponse,
    RetrieveTemplateRequest,
    RetrieveTemplateResponse,
    RetrieveWsdlEndpointRequest,
    RetrieveWsdlEndpointResponse,
    SaveConfigRequest,
    SaveConfigResponse,
    SaveInboundEPUischemaRequest,
    SequenceDirectoryResponse,
    ShowErrorMessageRequest,
    StoreConnectorJsonResponse,
    SwaggerData,
    SwaggerFromAPIResponse,
    SwaggerTypeRequest,
    TemplatesResponse,
    TestDbConnectionRequest,
    TestDbConnectionResponse,
    UndoRedoParams,
    UpdateAPIFromSwaggerRequest,
    UpdateAddressEndpointRequest,
    UpdateAddressEndpointResponse,
    UpdateConnectorRequest,
    UpdateDefaultEndpointRequest,
    UpdateDefaultEndpointResponse,
    UpdateFailoverEPRequest,
    UpdateFailoverEPResponse,
    UpdateHttpEndpointRequest,
    UpdateHttpEndpointResponse,
    UpdateLoadBalanceEPRequest,
    UpdateLoadBalanceEPResponse,
    UpdateMediatorRequest,
    UpdateMockServiceRequest,
    UpdateMockServiceResponse,
    UpdateRecipientEPRequest,
    UpdateRecipientEPResponse,
    UpdateRegistryMetadataRequest,
    UpdateRegistryMetadataResponse,
    UpdateTemplateEPRequest,
    UpdateTemplateEPResponse,
    UpdateTestCaseRequest,
    UpdateTestCaseResponse,
    UpdateTestSuiteRequest,
    UpdateTestSuiteResponse,
    UpdateWsdlEndpointRequest,
    UpdateWsdlEndpointResponse,
    WriteContentToFileRequest,
    WriteIdpSchemaFileToRegistryRequest,
    ReadIdpSchemaFileContentRequest,
    ReadIdpSchemaFileContentResponse,
    WriteIdpSchemaFileToRegistryResponse,
    GetIdpSchemaFilesResponse,
    WriteContentToFileResponse,
    WriteMockServicesRequest,
    WriteMockServicesResponse,
    HandleFileRequest,
    HandleFileResponse,
    getAllDependenciesRequest,
    getSTRequest,
    getSTResponse,
    onDownloadProgress,
    MediatorTryOutRequest,
    MediatorTryOutResponse,
    SavePayloadRequest,
    GetPayloadsRequest,
    GetPayloadsResponse,
    AddDriverToLibResponse,
    AddDriverToLibRequest,
    APIContextsResponse,
    onSwaggerSpecReceived,
    GetConnectionSchemaRequest,
    GetConnectionSchemaResponse,
    CopyConnectorZipRequest,
    CopyConnectorZipResponse,
    ApplyEditsRequest,
    RemoveConnectorRequest,
    RemoveConnectorResponse,
    TestConnectorConnectionRequest,
    TestConnectorConnectionResponse,
    MiVersionResponse,
    CheckDBDriverResponse,
    CopyArtifactRequest,
    CopyArtifactResponse,
    GetArtifactTypeRequest,
    GetArtifactTypeResponse,
    ExtendedTextEdit,
    LocalInboundConnectorsResponse,
    BuildProjectRequest,
    DeployProjectRequest,
    DeployProjectResponse,
    CreateBallerinaModuleRequest,
    CreateBallerinaModuleResponse,
    SCOPE,
    DevantMetadata,
    UpdateMediatorResponse,
    GetConnectorIconRequest,
    GetConnectorIconResponse,
    DependencyDetails,
    SubmitFeedbackRequest,
    SubmitFeedbackResponse,
    GetPomFileContentResponse,
    GetExternalConnectorDetailsResponse,
    GetMockServicesResponse,
    ConfigureKubernetesRequest,
    ConfigureKubernetesResponse,
    UpdateRegistryPropertyRequest,
    LoginMethod
} from "@wso2/mi-core";
import axios from 'axios';
import { error } from "console";
import * as fs from "fs";
import { copy, exists, remove } from 'fs-extra';
import { isEqual, reject } from "lodash";
import * as os from 'os';
import { getPortPromise } from "portfinder";
import { Transform } from 'stream';
import * as tmp from 'tmp';
import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';
import { Position, Range, Selection, TextEdit, Uri, ViewColumn, WorkspaceEdit, commands, extensions, window, workspace } from "vscode";
import { parse, stringify } from "yaml";
import { DiagramService, APIResource, NamedSequence, UnitTest, Proxy } from "../../../../syntax-tree/lib/src";
import { extension } from '../../MIExtensionContext';
import { RPCLayer } from "../../RPCLayer";
import { StateMachineAI } from '../../ai-features/aiMachine';
import {
    getAccessToken as getCopilotAccessToken,
    getCopilotLlmApiBaseUrl,
    getLoginMethod as getCopilotLoginMethod,
    getRefreshedAccessToken as refreshCopilotAccessToken,
    logout as logoutFromCopilot
} from '../../ai-features/auth';
import { APIS, COMMANDS, DEFAULT_ICON, DEFAULT_PROJECT_VERSION, LAST_EXPORTED_CAR_PATH, RUNTIME_VERSION_440, SWAGGER_REL_DIR, ERROR_MESSAGES } from "../../constants";
import { getStateMachine, navigate, openView } from "../../stateMachine";
import { openPopupView } from "../../stateMachinePopup";
import { openSwaggerWebview } from "../../swagger/activate";
import { testFileMatchPattern } from "../../test-explorer/discover";
import { mockSerivesFilesMatchPattern } from "../../test-explorer/mock-services/activator";
import { UndoRedoManager } from "../../undoRedoManager";
import { copyDockerResources, copyMavenWrapper, createFolderStructure, getAPIResourceXmlWrapper, getAddressEndpointXmlWrapper, getDataServiceXmlWrapper, getDefaultEndpointXmlWrapper, getDssDataSourceXmlWrapper, getFailoverXmlWrapper, getHttpEndpointXmlWrapper, getInboundEndpointXmlWrapper, getLoadBalanceXmlWrapper, getMessageProcessorXmlWrapper, getMessageStoreXmlWrapper, getProxyServiceXmlWrapper, getRegistryResourceContent, getTaskXmlWrapper, getTemplateEndpointXmlWrapper, getTemplateXmlWrapper, getWsdlEndpointXmlWrapper, createGitignoreFile, getEditTemplateXmlWrapper } from "../../util";
import { addNewEntryToArtifactXML, createMetadataFilesForRegistryCollection, deleteRegistryResource, detectMediaType, getAvailableRegistryResources, getMediatypeAndFileExtension, getRegistryResourceMetadata, updateRegistryResourceMetadata, generatePathFromRegistryPath } from "../../util/fileOperations";
import { log } from "../../util/logger";
import { importProjects } from "../../util/migrationUtils";
import { generateSwagger, getResourceInfo, isEqualSwaggers, mergeSwaggers } from "../../util/swagger";
import { getDataSourceXml } from "../../util/template-engine/mustach-templates/DataSource";
import { getClassMediatorContent } from "../../util/template-engine/mustach-templates/classMediator";
import { getBallerinaModuleContent, getBallerinaConfigContent } from "../../util/template-engine/mustach-templates/ballerinaModule";
import { generateXmlData, writeXmlDataToFile } from "../../util/template-engine/mustach-templates/createLocalEntry";
import { getRecipientEPXml } from "../../util/template-engine/mustach-templates/recipientEndpoint";
import { dockerfileContent, rootPomXmlContent } from "../../util/templates";
import { replaceFullContentToFile, saveIdpSchemaToFile } from "../../util/workspace";
import { VisualizerWebview, webviews } from "../../visualizer/webview";
import path = require("path");
import { importCapp } from "../../util/importCapp";
import { compareVersions, filterConnectorVersion, generateInitialDependencies, getDefaultProjectPath, getMIVersionFromPom, buildBallerinaModule, updatePomForClassMediator } from "../../util/onboardingUtils";
import { Range as STRange } from '@wso2/mi-syntax-tree/lib/src';
import { checkForDevantExt } from "../../extension";
import { getAPIMetadata } from "../../util/template-engine/mustach-templates/API";
import { DevantScopes, IWso2PlatformExtensionAPI } from "@wso2/wso2-platform-core";
import { ICreateComponentCmdParams, CommandIds as PlatformExtCommandIds } from "@wso2/wso2-platform-core";
import { MiVisualizerRpcManager } from "../mi-visualizer/rpc-manager";
import { DebuggerConfig } from "../../debugger/config";
import { getKubernetesConfiguration, getKubernetesDataConfiguration } from "../../util/template-engine/mustach-templates/KubernetesConfiguration";
import { parseStringPromise, Builder } from "xml2js";
import { MILanguageClient } from "../../lang-client/activator";
const AdmZip = require('adm-zip');

const { XMLParser, XMLBuilder } = require("fast-xml-parser");

const connectorsPath = path.join(".metadata", ".Connectors");

const undoRedo = new UndoRedoManager();

const connectorCache = new Map<string, any>();
const legacyConnectorCache = new Map<string, any>();

export class MiDiagramRpcManager implements MiDiagramAPI {
    constructor(private projectUri: string) { }

    async executeCommand(params: CommandsRequest): Promise<CommandsResponse> {
        return new Promise(async (resolve) => {
            if (params.commands.length >= 1) {
                const cmdArgs = params.commands.length > 1 ? params.commands.slice(1) : [];
                await commands.executeCommand(params.commands[0], ...cmdArgs);
                resolve({ data: "SUCCESS" });
            }
        });
    }

    async saveInputPayload(params: SavePayloadRequest): Promise<boolean> {
        return new Promise((resolve) => {
            const { name, type, key } = this.getResourceInfoToSavePayload(params.artifactModel);
            let content;
            if (type == "API") {
                content = this.readInputPayloadFile(name) ?? { type };
                content[key] = { requests: params.payload };
                content[key].defaultRequest = params.defaultPayload;
            } else {
                content = { type };
                content.requests = params.payload;
                content.defaultRequest = params.defaultPayload;
            }
            const tryout = path.join(this.projectUri, ".tryout");
            if (!fs.existsSync(tryout)) {
                fs.mkdirSync(tryout);
            }
            fs.writeFileSync(path.join(tryout, name + ".json"), JSON.stringify(content, null, 2));
            resolve(true);
        });
    }

    getResourceInfoToSavePayload(artifactModel: DiagramService) {
        if (artifactModel.tag === 'resource') {
            return {
                name: (artifactModel as APIResource).api,
                type: "API",
                key: (artifactModel as APIResource).uriTemplate ?? (artifactModel as APIResource).urlMapping
            }
        } else if (artifactModel.tag === 'proxy') {
            return {
                name: (artifactModel as Proxy).name,
                type: "PROXY",
                key: (artifactModel as Proxy).name
            }
        } else {
            return {
                name: (artifactModel as NamedSequence).name,
                type: "SEQUENCE",
                key: (artifactModel as NamedSequence).name
            }
        }
    }

    async getInputPayloads(params: GetPayloadsRequest): Promise<GetPayloadsResponse> {
        return new Promise((resolve) => {
            const { name, type, key } = this.getResourceInfoToSavePayload(params.artifactModel);
            const allPayloads = this.readInputPayloadFile(name);
            if (allPayloads) {
                let defaultPayload;
                let payloads;
                if (type == "API") {
                    payloads = allPayloads[key]?.requests ?? [];
                    defaultPayload = allPayloads[key]?.defaultRequest ?? "";
                } else {
                    payloads = allPayloads.requests ?? [];
                    defaultPayload = allPayloads.defaultRequest;
                }
                resolve({ payloads, defaultPayload });
            } else {
                resolve({ payloads: [], defaultPayload: "" });
            }
        });
    }

    async getAllInputDefaultPayloads(): Promise<Record<string, any>> {
        const tryoutFolderPath = path.join(this.projectUri, ".tryout");
        const payloadMapByArtifact: Record<string, any> = {};

        if (fs.existsSync(tryoutFolderPath)) {
            const files = fs.readdirSync(tryoutFolderPath);

            files.forEach((file) => {
                const filePath = path.join(tryoutFolderPath, file);
                if (fs.statSync(filePath).isFile()) {
                    const fileContent = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                    const fileNameWithoutExtension = path.basename(file, ".json");

                    if (fileContent.type === "API") {
                        const payloadMapByResource: Record<string, object> = {};
                        Object.keys(fileContent).forEach((key) => {
                            if (key.startsWith("/")) { // Select only API resources
                                const defaultRequestName = fileContent[key].defaultRequest;
                                const defaultRequest = fileContent[key].requests.find((request: any) => request.name === defaultRequestName);
                                payloadMapByResource[key] = defaultRequest ? defaultRequest : null;
                            }
                        });
                        payloadMapByArtifact[fileNameWithoutExtension] = payloadMapByResource;
                    } else {
                        const defaultRequestName = fileContent.defaultRequest;
                        const defaultRequest = fileContent.requests.find((request: any) => request.name === defaultRequestName);
                        payloadMapByArtifact[fileNameWithoutExtension] = defaultRequest ? defaultRequest : null;
                    }
                }
            });
        }

        return payloadMapByArtifact;
    }

    readInputPayloadFile(name: string) {
        const tryout = path.join(this.projectUri, ".tryout", name + ".json");
        if (fs.existsSync(tryout)) {
            return JSON.parse(fs.readFileSync(tryout, "utf8"));
        }
        return null;
    }

    async tryOutMediator(params: MediatorTryOutRequest): Promise<MediatorTryOutResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.tryOutMediator(params);
            resolve(res);
        });
    }

    async shutDownTryoutServer(): Promise<boolean> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.shutdownTryoutServer();
            resolve(res);
        });
    }

    async getMIVersionFromPom(): Promise<MiVersionResponse> {
        return new Promise(async (resolve) => {
            const res = await getMIVersionFromPom(this.projectUri);
            resolve({ version: res ?? '' });
        });
    }

    async getMediatorInputOutputSchema(params: MediatorTryOutRequest): Promise<MediatorTryOutResponse> {
        return new Promise(async (resolve) => {
            const payloadPath = path.join(this.projectUri, ".tryout", "input.json");
            const payload = fs.readFileSync(payloadPath, "utf8");
            params.inputPayload = payload
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.getMediatorInputOutputSchema(params);
            resolve(res);
        });
    }

    async getSyntaxTree(params: getSTRequest): Promise<getSTResponse> {
        const isGetSTFromUriRequest = (params: any): params is GetSTFromUriRequest => {
            return (params as GetSTFromUriRequest).documentUri !== undefined;
        };

        let documentUri = '';
        if (isGetSTFromUriRequest(params)) {
            documentUri = params.documentUri;
        } else {
            documentUri = path.join(
                this.projectUri,
                'src',
                'main',
                'wso2mi',
                'artifacts',
                params.artifactType,
                params.artifactName
            );
        }

        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.getSyntaxTree({
                documentIdentifier: {
                    uri: documentUri
                },
            });
            resolve(res);
        });
    }

    async getConnectors(): Promise<ConnectorsResponse> {
        return new Promise(async (resolve) => {
            const connectorNames: Connector[] = [];

            if (!fs.existsSync(path.join(this.projectUri, connectorsPath))) {
                return resolve({ data: connectorNames });
            }

            const connectorsRoot = path.join(this.projectUri, connectorsPath);
            const connectors = fs.readdirSync(connectorsRoot, { withFileTypes: true });
            connectors.filter(dirent => dirent.isDirectory()).forEach(connectorDir => {
                const connectorPath = path.join(connectorsRoot, connectorDir.name);
                const connectorInfoFile = path.join(connectorPath, `connector.xml`);
                const connectorIconFile = path.join(connectorPath, "icon", `icon - large.png`);
                if (fs.existsSync(connectorInfoFile)) {
                    const connectorDefinition = fs.readFileSync(connectorInfoFile, "utf8");
                    const options = {
                        ignoreAttributes: false,
                        attributeNamePrefix: "@_"
                    };
                    const parser = new XMLParser(options);
                    const connectorInfo = parser.parse(connectorDefinition);
                    const connectorName = connectorInfo["connector"]["component"]["@_name"];
                    const connectorDescription = connectorInfo["connector"]["component"]["description"];
                    const connectorIcon = Buffer.from(fs.readFileSync(connectorIconFile)).toString('base64');
                    connectorNames.push({ path: connectorPath, name: connectorName, description: connectorDescription, icon: connectorIcon });
                }
            });

            resolve({ data: connectorNames });
        });
    }

    async getConnector(params: ConnectorRequest): Promise<ConnectorResponse> {
        return new Promise(async (resolve) => {
            const connectorFiles: string[] = [];
            const uiSchemas = path.join(params.path, "uischema");
            if (fs.existsSync(uiSchemas)) {
                const connectorFilesList = fs.readdirSync(uiSchemas);
                connectorFilesList.forEach(file => {
                    const connectorFile = fs.readFileSync(path.join(uiSchemas, file), "utf8");
                    connectorFiles.push(connectorFile);
                });
            }
            resolve({ data: connectorFiles });
        });
    }

    async getAPIDirectory(): Promise<ApiDirectoryResponse> {
        return new Promise(async (resolve) => {
            let result = '';
            const findSynapseAPIPath = (startPath: string) => {
                const files = fs.readdirSync(startPath);
                for (let i = 0; i < files.length; i++) {
                    const filename = path.join(startPath, files[i]);
                    const stat = fs.lstatSync(filename);
                    if (stat.isDirectory()) {
                        if (filename.includes('synapse-config/api')) {
                            result = filename;
                            return result;
                        } else {
                            result = findSynapseAPIPath(filename);
                        }
                    }
                }
                return result;
            };

            const synapseAPIPath = findSynapseAPIPath(this.projectUri);
            return synapseAPIPath;
        });
    }

    async createAPI(params: CreateAPIRequest): Promise<CreateAPIResponse> {
        return new Promise(async (resolve) => {
            const {
                artifactDir,
                xmlData,
                name,
                version,
                context,
                versionType,
                saveSwaggerDef,
                swaggerDefPath,
                wsdlType,
                wsdlDefPath,
                wsdlEndpointName,
                projectDir
            } = params;
            let apiVersionType = versionType ?? "";
            let apiVersion = version ?? "";
            let apiContext = context ?? "";

            const getSwaggerName = (swaggerDefPath: string) => {
                const ext = path.extname(swaggerDefPath);
                return `${name}${apiVersion !== "" ? `_v${apiVersion}` : ''}${ext === ".yml" ? ".yaml" : ext }`;
            };
            let fileName: string;
            let response: GenerateAPIResponse = { apiXml: "", endpointXml: "" };
            if (!xmlData) {
                const langClient = await MILanguageClient.getInstance(this.projectUri);
                const projectDetailsRes = await langClient?.getProjectDetails();
                const runtimeVersion = projectDetailsRes.primaryDetails.runtimeVersion.value;
                const isRegistrySupported = compareVersions(runtimeVersion, RUNTIME_VERSION_440) < 0;

                const getPublishSwaggerPath = (swaggerDefPath: string) => {
                    if (isRegistrySupported) {
                        return `gov:swaggerFiles/${getSwaggerName(swaggerDefPath)}`;
                    } else {
                        return `gov:mi-resources/api-definitions/${getSwaggerName(swaggerDefPath)}`;
                    }
                }
                if (swaggerDefPath) {
                    response = await langClient.generateAPI({
                        apiName: name,
                        swaggerOrWsdlPath: swaggerDefPath,
                        publishSwaggerPath: saveSwaggerDef ? getPublishSwaggerPath(swaggerDefPath) : undefined,
                        mode: "create.api.from.swagger"
                    });
                } else if (wsdlDefPath) {
                    const filePath = wsdlType === "file" && Uri.file(wsdlDefPath).toString();
                    response = await langClient.generateAPI({
                        apiName: name,
                        swaggerOrWsdlPath: filePath || wsdlDefPath,
                        mode: "create.api.from.wsdl",
                        wsdlEndpointName
                    });
                }

                const options = {
                    ignoreAttributes: false,
                    allowBooleanAttributes: true,
                    attributeNamePrefix: "@_",
                    attributesGroupName: "@_"
                };
                const parser = new XMLParser(options);
                const jsonObj = parser.parse(response.apiXml);
                apiVersionType = jsonObj.api["@_"]['@_version-type'] ?? apiVersionType;
                apiVersion = jsonObj.api["@_"]['@_version'] ?? apiVersion;
                apiContext = jsonObj.api["@_"]['@_context'] ?? apiContext;
                fileName = `${name}${apiVersion !== "" ? `_v${apiVersion}` : ''}`;

                if (saveSwaggerDef && swaggerDefPath) {
                    const ext = path.extname(swaggerDefPath);
                    const swaggerRegPath = path.join(
                        this.projectUri,
                        SWAGGER_REL_DIR,
                        fileName + (ext === ".yml" ? ".yaml" : ext)
                    );
                    fs.mkdirSync(path.dirname(swaggerRegPath), { recursive: true });
                    fs.copyFileSync(swaggerDefPath, swaggerRegPath);
                }

                if (!isRegistrySupported) {
                    const swaggerArtifactName = `resources_api-definitions_${getSwaggerName(swaggerDefPath ?? '')}`.replace(/\./g, '_');
                    addNewEntryToArtifactXML(projectDir ?? '', swaggerArtifactName, getSwaggerName(swaggerDefPath ?? ''), "/_system/governance/mi-resources/api-definitions", "application/yaml", false, false);
                }
            } else {
                fileName = `${name}${version ? `_v${version}` : ''}`;
            }

            const sanitizedXmlData = (xmlData || response.apiXml).replace(/^\s*[\r\n]/gm, '');
            const filePath = path.join(artifactDir, 'apis', `${fileName}.xml`);
            await replaceFullContentToFile(filePath, sanitizedXmlData);
            await this.rangeFormat({
                uri: filePath,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                }
            });

            const metadataPath = path.join(this.projectUri, "src", "main", "wso2mi", "resources", "metadata", name + (apiVersion == "" ? "" : "_" + apiVersion) + "_metadata.yaml");
            fs.writeFileSync(metadataPath, getAPIMetadata({ name: name, version: apiVersion == "" ? "1.0.0" : apiVersion, context: apiContext, versionType: apiVersionType ? (apiVersionType == "url" ? apiVersionType : false) : false }));

            // If WSDL is used, create an Endpoint
            if (response.endpointXml) {
                const sanitizedEndpointXml = response.endpointXml.replace(/^\s*[\r\n]/gm, '');
                const endpointFilePath = path.join(artifactDir, 'endpoints', `${name}_SOAP_ENDPOINT.xml`);
                await replaceFullContentToFile(endpointFilePath, sanitizedEndpointXml);
                await this.rangeFormat({
                    uri: endpointFilePath,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: sanitizedEndpointXml.split('\n').length + 1, character: 0 }
                    }
                });
            }

            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            resolve({ path: filePath });
        });
    }

    async editAPI(params: EditAPIRequest): Promise<EditAPIResponse> {
        return new Promise(async (resolve) => {
            let { documentUri, apiName, version, xmlData, handlersXmlData, apiRange, handlersRange } = params;

            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');
            const sanitizedHandlersXmlData = handlersXmlData.replace(/^\s*[\r\n]/gm, '');

            let expectedFileName = `${apiName}${version ? `_v${version}` : ''}`;
            if (path.basename(documentUri).split('.')[0] !== expectedFileName) {
                const originalFileName = `${path.basename(documentUri, path.extname(documentUri))}.yaml`;
                const originalFilePath = path.join(path.dirname(documentUri), originalFileName);
                await this.renameFile({ existingPath: documentUri, newPath: path.join(path.dirname(documentUri), `${expectedFileName}.xml`) });
                documentUri = path.join(path.dirname(documentUri), `${expectedFileName}.xml`);
                // Path to old API file
                const projectDir = workspace.getWorkspaceFolder(Uri.file(originalFilePath))?.uri.fsPath;
                const oldAPIXMLPath = path.join(projectDir ?? "", 'src', 'main', 'wso2mi', 'resources', 'api-definitions', originalFileName);
                // Delete the old API from resources folder
                if (fs.existsSync(oldAPIXMLPath)) {
                    fs.unlinkSync(oldAPIXMLPath);
                }
            }

            if (sanitizedHandlersXmlData) {
                await this.applyEdit({ text: sanitizedHandlersXmlData, documentUri, range: handlersRange });
                await this.rangeFormat({ uri: documentUri, range: handlersRange });
            }

            await this.applyEdit({ text: sanitizedXmlData, documentUri, range: apiRange });
            await this.rangeFormat({ uri: documentUri, range: apiRange });

            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            resolve({ path: documentUri });
        });
    }

    showErrorMessage(params: ShowErrorMessageRequest): void {
        window.showErrorMessage(params.message);
    }

    closeWebViewNotification(): void {
        // if ("dispose" in view) {
        //     view.dispose();
        // }
    }

    openDiagram(params: OpenDiagramRequest): void {
        openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Diagram, documentUri: params.path });
    }

    async getEndpointDirectory(): Promise<EndpointDirectoryResponse> {
        return new Promise(async (resolve) => {
            let result = '';
            const findSynapseEndpointPath = (startPath: string) => {
                const files = fs.readdirSync(startPath);
                for (let i = 0; i < files.length; i++) {
                    const filename = path.join(startPath, files[i]);
                    const stat = fs.lstatSync(filename);
                    if (stat.isDirectory()) {
                        if (filename.includes('synapse-config/endpoints')) {
                            result = filename;
                            return result;
                        } else {
                            result = findSynapseEndpointPath(filename);
                        }
                    }
                }
                return result;
            };

            const synapseEndpointPath = findSynapseEndpointPath(this.projectUri);
            return synapseEndpointPath;
        });
    }

    async createEndpoint(params: CreateEndpointRequest): Promise<CreateEndpointResponse> {
        return new Promise(async (resolve) => {
            const { directory, name, address, configuration, method, type, uriTemplate, wsdlUri, wsdlService,
                wsdlPort, targetTemplate, uri } = params;
            const endpointType = type.split(" ")[0].toLowerCase();

            let endpointAttributes = `${endpointType}`;
            let otherAttributes = '';
            let closingAttributes = `</${endpointType}>`;
            if (endpointType === 'http') {
                endpointAttributes = `${endpointAttributes} method="${method.toLowerCase()}" uri-template="${uriTemplate}"`;
            } else if (endpointType === 'address') {
                endpointAttributes = `${endpointAttributes} uri="${address}"`;
            } else if (endpointType === 'fail') {
                endpointAttributes = `failover`;
                otherAttributes = `<endpoint name="endpoint_urn_uuid">
          <address uri="http://localhost">`;
                closingAttributes = `       </address>
      </endpoint>
  </failover>`;
            } else if (endpointType === 'load') {
                endpointAttributes = `loadbalance algorithm="org.apache.synapse.endpoints.algorithms.RoundRobin"`;
                otherAttributes = `<endpoint name="endpoint_urn_uuid">
          <address uri="http://localhost">`;
                closingAttributes = `       </address>
      </endpoint>
  </loadbalance>`;
            } else if (endpointType === 'recipient') {
                endpointAttributes = `recipientlist`;
                otherAttributes = `<endpoint>
          <default>`;
                closingAttributes = `       </default>
      </endpoint>
  </recipientlist>`;
            } else if (endpointType === 'wsdl') {
                endpointAttributes = `${endpointAttributes.toLowerCase()} port="${wsdlPort}" service="${wsdlService}" uri="${wsdlUri}"`;
            }

            let xmlData;

            if (endpointType === 'template') {

                xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<endpoint name="${name}" template="${targetTemplate}" uri="${uri}" xmlns="http://ws.apache.org/ns/synapse">
    <description/>
</endpoint>`;

            } else {

                xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<endpoint name="${name}" xmlns="http://ws.apache.org/ns/synapse">
  <${endpointAttributes}>
      ${otherAttributes}
      <suspendOnFailure>
          <initialDuration>-1</initialDuration>
          <progressionFactor>1.0</progressionFactor>
      </suspendOnFailure>
      <markForSuspension>
          <retriesBeforeSuspension>0</retriesBeforeSuspension>
      </markForSuspension>
  ${closingAttributes}
</endpoint>`;

            }

            const filePath = path.join(directory, `${name}.xml`);
            await replaceFullContentToFile(filePath, xmlData);
            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            resolve({ path: filePath });
        });
    }

    async updateLoadBalanceEndpoint(params: UpdateLoadBalanceEPRequest): Promise<UpdateLoadBalanceEPResponse> {
        return new Promise(async (resolve) => {
            const { directory, ...templateParams } = params;
            const xmlData = getLoadBalanceXmlWrapper(templateParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');
            if (params.getContentOnly) {
                resolve({ path: "", content: sanitizedXmlData });
            } else {
                const filePath = await this.getFilePath(directory, templateParams.name);
                await replaceFullContentToFile(filePath, sanitizedXmlData);
                await this.rangeFormat({
                    uri: filePath,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                    }
                });
                commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                openPopupView(this.projectUri, POPUP_EVENT_TYPE.CLOSE_VIEW, { view: null, recentIdentifier: templateParams.name });
                resolve({ path: filePath, content: "" });
            }
        });
    }

    async getLoadBalanceEndpoint(params: GetLoadBalanceEPRequest): Promise<GetLoadBalanceEPResponse> {
        return new Promise(async (resolve) => {
            const endpointSyntaxTree = await this.getSyntaxTree({ documentUri: params.path });
            const filePath = params.path;

            if (filePath.includes('.xml') && fs.existsSync(filePath)) {
                const { name, loadbalance, session, property, description } = endpointSyntaxTree.syntaxTree.endpoint;
                const endpoints = await this.getEndpointsList(loadbalance.endpointOrMember, filePath, true);

                const properties = property.map((prop: any) => ({
                    name: prop.name,
                    value: prop.value,
                    scope: prop.scope ?? 'default'
                }));

                const timeout = session?.sessionTimeout ? Number(session.sessionTimeout) : 0;

                resolve({
                    name,
                    algorithm: loadbalance.algorithm === 'roundRobin' ? 'org.apache.synapse.endpoints.algorithms.RoundRobin' : loadbalance.algorithm,
                    failover: String(loadbalance.failover) ?? 'false',
                    buildMessage: String(loadbalance.buildMessage) ?? 'false',
                    sessionManagement: session?.type ?? 'none',
                    sessionTimeout: timeout,
                    description: description ?? '',
                    endpoints: endpoints.length > 0 ? endpoints : [],
                    properties: properties.length > 0 ? properties : []
                });
            }

            resolve({
                name: '',
                algorithm: 'org.apache.synapse.endpoints.algorithms.RoundRobin',
                failover: 'true',
                buildMessage: 'false',
                sessionManagement: 'none',
                sessionTimeout: 0,
                description: '',
                endpoints: [],
                properties: []
            });
        });
    }

    async updateFailoverEndpoint(params: UpdateFailoverEPRequest): Promise<UpdateFailoverEPResponse> {
        return new Promise(async (resolve) => {
            const { directory, ...templateParams } = params;
            const xmlData = getFailoverXmlWrapper(templateParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');
            if (params.getContentOnly) {
                resolve({ path: "", content: sanitizedXmlData });
            } else {
                const filePath = await this.getFilePath(directory, templateParams.name);
                await replaceFullContentToFile(filePath, sanitizedXmlData);
                await this.rangeFormat({
                    uri: filePath,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                    }
                });
                commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                openPopupView(this.projectUri, POPUP_EVENT_TYPE.CLOSE_VIEW, { view: null, recentIdentifier: templateParams.name });
                resolve({ path: filePath, content: "" });
            }
        });
    }

    async getFailoverEndpoint(params: GetFailoverEPRequest): Promise<GetFailoverEPResponse> {
        return new Promise(async (resolve) => {
            const endpointSyntaxTree = await this.getSyntaxTree({ documentUri: params.path });
            const filePath = params.path;

            if (filePath.includes('.xml') && fs.existsSync(filePath)) {
                const { name, failover, property, description } = endpointSyntaxTree.syntaxTree.endpoint;
                const endpoints = await this.getEndpointsList(failover.endpoint, filePath, false);

                const properties = property.map((prop: any) => ({
                    name: prop.name,
                    value: prop.value,
                    scope: prop.scope ?? 'default'
                }));

                resolve({
                    name,
                    buildMessage: String(failover.buildMessage) ?? 'false',
                    description: description ?? '',
                    endpoints: endpoints.length > 0 ? endpoints : [],
                    properties: properties.length > 0 ? properties : []
                });
            }

            resolve({
                name: '',
                buildMessage: 'true',
                description: '',
                endpoints: [],
                properties: []
            });
        });
    }

    async updateRecipientEndpoint(params: UpdateRecipientEPRequest): Promise<UpdateRecipientEPResponse> {
        return new Promise(async (resolve) => {
            const { directory, ...templateParams } = params;
            const xmlData = getRecipientEPXml(templateParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');
            if (params.getContentOnly) {
                resolve({ path: "", content: sanitizedXmlData });
            } else {
                const filePath = await this.getFilePath(directory, templateParams.name);
                await replaceFullContentToFile(filePath, sanitizedXmlData);
                await this.rangeFormat({
                    uri: filePath,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                    }
                });
                commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                openPopupView(this.projectUri, POPUP_EVENT_TYPE.CLOSE_VIEW, { view: null, recentIdentifier: templateParams.name });
                resolve({ path: filePath, content: "" });
            }
        });
    }

    async getRecipientEndpoint(params: GetRecipientEPRequest): Promise<GetRecipientEPResponse> {
        return new Promise(async (resolve) => {
            const endpointSyntaxTree = await this.getSyntaxTree({ documentUri: params.path });
            const filePath = params.path;

            if (filePath.includes('.xml') && fs.existsSync(filePath)) {
                const { name, recipientlist, property, description } = endpointSyntaxTree.syntaxTree.endpoint;
                const endpoints = await this.getEndpointsList(recipientlist.endpoint, filePath, false);

                const properties = property.map((prop: any) => ({
                    name: prop.name,
                    value: prop.value,
                    scope: prop.scope ?? 'default'
                }));

                resolve({
                    name,
                    description: description ?? '',
                    endpoints: endpoints.length > 0 ? endpoints : [],
                    properties: properties.length > 0 ? properties : []
                });
            }

            resolve({
                name: '',
                description: '',
                endpoints: [],
                properties: []
            });
        });
    }

    async updateTemplateEndpoint(params: UpdateTemplateEPRequest): Promise<UpdateTemplateEPResponse> {
        return new Promise(async (resolve) => {
            const { directory, ...templateParams } = params;
            const xmlData = getTemplateEndpointXmlWrapper(templateParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');
            if (params.getContentOnly) {
                resolve({ path: "", content: sanitizedXmlData });
            } else {
                const filePath = await this.getFilePath(directory, templateParams.name);
                await replaceFullContentToFile(filePath, sanitizedXmlData);
                await this.rangeFormat({
                    uri: filePath,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                    }
                });
                commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                openPopupView(this.projectUri, POPUP_EVENT_TYPE.CLOSE_VIEW, { view: null, recentIdentifier: templateParams.name });
                resolve({ path: filePath, content: "" });
            }
        });
    }

    async getTemplateEndpoint(params: GetTemplateEPRequest): Promise<GetTemplateEPResponse> {
        return new Promise(async (resolve) => {
            const endpointSyntaxTree = await this.getSyntaxTree({ documentUri: params.path });
            const filePath = params.path;

            if (filePath.includes('.xml') && fs.existsSync(filePath)) {
                const { name, uri, template, description, parameter } = endpointSyntaxTree.syntaxTree.endpoint;

                const parameters = parameter.map((prop: any) => ({
                    name: prop.name,
                    value: prop.value,
                }));

                resolve({
                    name,
                    uri: uri ?? '',
                    template,
                    description: description ?? '',
                    parameters: parameters.length > 0 ? parameters : []
                });
            }

            resolve({
                name: '',
                uri: '',
                template: '',
                description: '',
                parameters: []
            });
        });
    }

    async createLocalEntry(params: CreateLocalEntryRequest): Promise<CreateLocalEntryResponse> {
        return new Promise(async (resolve) => {
            let { directory, name, type, value, URL } = params;
            const xmlData = generateXmlData(name, type, value, URL);

            if (directory.includes('localEntries')) {
                directory = directory.replace('localEntries', 'local-entries');
            }
            const filePath = await this.getFilePath(directory, name);

            if (params.getContentOnly) {
                resolve({ filePath: "", fileContent: xmlData });
            } else {
                writeXmlDataToFile(filePath, xmlData);
                commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                resolve({ filePath: filePath, fileContent: "" });
            }
        });
    }

    async getLocalEntry(params: GetLocalEntryRequest): Promise<GetLocalEntryResponse> {
        const options = {
            ignoreAttributes: false,
            allowBooleanAttributes: true,
            attributeNamePrefix: "",
            attributesGroupName: "@_",
            indentBy: '    ',
            format: true,
        };
        const parser = new XMLParser(options);

        return new Promise(async (resolve) => {
            const filePath = params.path;
            if (fs.existsSync(filePath)) {
                const xmlData = fs.readFileSync(filePath, "utf8");
                const jsonData = parser.parse(xmlData);
                const response: GetLocalEntryResponse = {
                    name: jsonData.localEntry["@_"]["key"],
                    type: "",
                    inLineTextValue: "",
                    inLineXmlValue: "",
                    sourceURL: ""
                };
                if (jsonData && jsonData.localEntry) {
                    const firstEntryKey = Object.keys(jsonData.localEntry)[0];
                    if (jsonData.localEntry["#text"]) {
                        response.type = "In-Line Text Entry";
                        response.inLineTextValue = jsonData.localEntry["#text"];
                    } else if (jsonData.localEntry["@_"]["src"]) {
                        response.type = "Source URL Entry";
                        response.sourceURL = jsonData.localEntry["@_"]["src"];
                    } else if (firstEntryKey) {
                        response.type = "In-Line XML Entry";
                        const xmlObj = {
                            [firstEntryKey]: {
                                ...jsonData.localEntry[firstEntryKey]
                            }
                        }
                        const builder = new XMLBuilder(options);
                        let xml = builder.build(xmlObj).replace(/&apos;/g, "'");
                        response.inLineXmlValue = xml;
                    }
                }
                resolve(response);
            }
            else {
                return error("File not found");
            }
        });
    }

    async createMessageStore(params: CreateMessageStoreRequest): Promise<CreateMessageStoreResponse> {
        return new Promise(async (resolve) => {

            let getTemplateParams = params;

            const xmlData = getMessageStoreXmlWrapper(getTemplateParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

            if (getTemplateParams.directory.includes('messageStores')) {
                getTemplateParams.directory = getTemplateParams.directory.replace('messageStores', 'message-stores');
            }
            const filePath = await this.getFilePath(getTemplateParams.directory, getTemplateParams.name);

            await replaceFullContentToFile(filePath, sanitizedXmlData);
            await this.rangeFormat({
                uri: filePath,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                }
            });
            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            resolve({ path: filePath });
        });
    }

    async getMessageStore(params: GetMessageStoreRequest): Promise<GetMessageStoreResponse> {
        const options = {
            ignoreAttributes: false,
            allowBooleanAttributes: true,
            attributeNamePrefix: "@_",
            attributesGroupName: "@_"
        };
        interface Parameter {
            name: string,
            value: string
        }
        const parser = new XMLParser(options);
        return new Promise(async (resolve) => {
            const filePath = params.path;
            if (fs.existsSync(filePath)) {
                const xmlData = fs.readFileSync(filePath, "utf8");
                const jsonData = parser.parse(xmlData);
                let parameters: Parameter[] = [];
                let customParameters: Parameter[] = [];
                const className = jsonData.messageStore["@_"]["@_class"];
                const response: GetMessageStoreResponse = {
                    name: jsonData.messageStore["@_"]["@_name"],
                    type: '',
                    initialContextFactory: '',
                    connectionFactory: '',
                    providerURL: '',
                    jndiQueueName: '',
                    userName: '',
                    password: '',
                    cacheConnection: false,
                    jmsAPIVersion: '',
                    enableProducerGuaranteedDelivery: false,
                    rabbitMQServerHostName: '',
                    rabbitMQServerPort: '',
                    sslEnabled: false,
                    rabbitMQQueueName: '',
                    rabbitMQExchangeName: '',
                    routineKey: '',
                    virtualHost: '',
                    trustStoreLocation: '',
                    trustStorePassword: '',
                    trustStoreType: '',
                    keyStoreLocation: '',
                    keyStorePassword: '',
                    keyStoreType: '',
                    dataBaseTable: '',
                    driver: '',
                    url: '',
                    user: '',
                    dataSourceName: '',
                    queueConnectionFactory: '',
                    pollingCount: '',
                    xPath: '',
                    providerClass: '',
                    customParameters: [] as Parameter[],
                    sslVersion: "",
                    failOverMessageStore: "",
                    namespaces: []
                };
                switch (className) {
                    case 'org.apache.synapse.message.store.impl.jms.JmsStore':
                        response.type = 'JMS Message Store';
                        break;
                    case 'org.apache.synapse.message.store.impl.jdbc.JDBCMessageStore':
                        response.type = 'JDBC Message Store';
                        break;
                    case 'org.apache.synapse.message.store.impl.rabbitmq.RabbitMQStore':
                        response.type = 'RabbitMQ Message Store';
                        break;
                    case 'org.apache.synapse.message.store.impl.resequencer.ResequenceMessageStore':
                        response.type = 'Resequence Message Store';
                        break;
                    case 'org.apache.synapse.message.store.impl.memory.InMemoryStore':
                        response.type = 'In Memory Message Store';
                        break;
                    default:
                        response.type = 'Custom Message Store';
                        break;
                }
                if (jsonData && jsonData.messageStore && jsonData.messageStore.parameter) {

                    const xmlnsValues: { prefix: string, uri: string }[] = [];
                    if (Array.isArray(jsonData.messageStore.parameter)) {
                        jsonData.messageStore.parameter.forEach((element) => {
                            if (element["@_"]['@_name'] === 'store.resequence.id.path') {
                                for (const key in element["@_"]) {
                                    if (key.startsWith('@_xmlns')) {
                                        const [_, prefix, value] = key.split(':');
                                        const xmlnsValue = element["@_"][key];
                                        xmlnsValues.push({ prefix, uri: xmlnsValue });
                                    }
                                }
                            }
                        });
                    }
                    response.namespaces = xmlnsValues;

                    parameters = Array.isArray(jsonData.messageStore.parameter)
                        ? jsonData.messageStore.parameter.map((param: any) => ({
                            name: param["@_"]['@_name'],
                            value: param['#text'] ?? param["@_"]["@_expression"]
                        }))
                        : [{
                            name: jsonData.messageStore.parameter["@_"]['@_name'],
                            value: jsonData.messageStore.parameter['#text']
                        }];
                    const MessageStoreModel = {
                        'java.naming.factory.initial': 'initialContextFactory',
                        'java.naming.provider.url': 'providerURL',
                        'store.jms.connection.factory': 'connectionFactory',
                        'connectionfactory.QueueConnectionFactory': 'queueConnectionFactory',
                        'store.jms.destination': 'jndiQueueName',
                        'store.jms.username': 'userName',
                        'store.jms.password': 'password',
                        'store.jms.cache.connection': 'cacheConnection',
                        'store.jms.JMSSpecVersion': 'jmsAPIVersion',
                        'store.producer.guaranteed.delivery.enable': 'enableProducerGuaranteedDelivery',
                        'rabbitmq.connection.ssl.truststore.location': 'trustStoreLocation',
                        'rabbitmq.connection.ssl.truststore.password': 'trustStorePassword',
                        'rabbitmq.connection.ssl.truststore.type': 'trustStoreType',
                        'rabbitmq.connection.ssl.keystore.location': 'keyStoreLocation',
                        'rabbitmq.connection.ssl.keystore.password': 'keyStorePassword',
                        'rabbitmq.connection.ssl.keystore.type': 'keyStoreType',
                        'rabbitmq.connection.ssl.version': 'sslVersion',
                        'rabbitmq.connection.ssl.enabled': 'sslEnabled',
                        'store.jdbc.table': 'dataBaseTable',
                        'store.jdbc.driver': 'driver',
                        'store.jdbc.connection.url': 'url',
                        'store.jdbc.username': 'user',
                        'store.jdbc.password': 'password',
                        'store.jdbc.dsName': 'dataSourceName',
                        'store.rabbitmq.username': 'userName',
                        'store.rabbitmq.password': 'password',
                        'store.rabbitmq.host.name': 'rabbitMQServerHostName',
                        'store.rabbitmq.host.port': 'rabbitMQServerPort',
                        'store.rabbitmq.exchange.name': 'rabbitMQExchangeName',
                        'store.rabbitmq.queue.name': 'rabbitMQQueueName',
                        'store.rabbitmq.route.key': 'routineKey',
                        'store.rabbitmq.virtual.host': 'virtualHost',
                        'store.resequence.timeout': 'pollingCount',
                        'store.resequence.id.path': 'xPath',
                        'store.failover.message.store.name': 'failOverMessageStore'
                    }
                    if (response.type !== 'Custom Message Store') {
                        parameters.forEach((param: Parameter) => {
                            if (MessageStoreModel.hasOwnProperty(param.name)) {
                                if (MessageStoreModel[param.name] === "jmsAPIVersion") {
                                    response.jmsAPIVersion = Number(param.value).toFixed(1);
                                } else {
                                    if (param.value != null) {
                                        response[MessageStoreModel[param.name]] = param.value;
                                    }
                                }
                            }
                        });
                        if (response.queueConnectionFactory) {
                            response.type = 'WSO2 MB Message Store';
                        }
                    } else {
                        parameters.forEach((param: Parameter) => {
                            customParameters.push({ name: param.name, value: param.value });
                        });
                        response.providerClass = className;
                        response.customParameters = customParameters;
                    }
                }
                resolve(response);
            }
            else {
                return error("File not found");
            }
        });
    }

    async createInboundEndpoint(params: CreateInboundEndpointRequest): Promise<CreateInboundEndpointResponse> {
        return new Promise(async (resolve) => {
            let { attributes, parameters, directory } = params;

            if (directory.includes('inboundEndpoints')) {
                directory = directory.replace('inboundEndpoints', 'inbound-endpoints');
            }
            const filePath = await this.getFilePath(directory, attributes.name as string);

            const xmlData = getInboundEndpointXmlWrapper({ attributes, parameters });

            const endpointsAndSequences = await this.getEndpointsAndSequences();

            const sequenceList = endpointsAndSequences.data[1];
            const projectDir = (await this.getProjectRoot({ path: directory })).path;

            if (attributes.sequence) {
                if (!(sequenceList.includes(attributes.sequence as string))) {

                    const sequenceDir = path.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts', 'sequences').toString();
                    const sequenceRequest: CreateSequenceRequest = {
                        name: attributes.sequence as string,
                        directory: sequenceDir,
                        endpoint: "",
                        onErrorSequence: "",
                        getContentOnly: false,
                        statistics: false,
                        trace: false
                    };
                    const response = await this.createSequence(sequenceRequest);
                }
            }

            if (attributes.onError) {
                if (!(sequenceList.includes(attributes.onError as string))) {

                    const sequenceDir = path.join(projectDir, 'src', 'main', 'wso2mi', 'artifacts', 'sequences').toString();
                    const sequenceRequest: CreateSequenceRequest = {
                        name: attributes.onError as string,
                        directory: sequenceDir,
                        endpoint: "",
                        onErrorSequence: "",
                        getContentOnly: false,
                        statistics: false,
                        trace: false
                    };
                    await this.createSequence(sequenceRequest);
                }
            }

            await replaceFullContentToFile(filePath, xmlData);
            resolve({ path: filePath });
        });
    }

    async getInboundEndpoint(params: GetInboundEndpointRequest): Promise<GetInboundEndpointResponse> {
        const options = {
            ignoreAttributes: false,
            allowBooleanAttributes: true,
            attributeNamePrefix: "@_",
        };
        const parser = new XMLParser(options);
        return new Promise(async (resolve) => {
            const filePath = params.path;

            if (filePath.includes('.xml') && fs.existsSync(filePath)) {
                const xmlData = fs.readFileSync(filePath, "utf8");
                const jsonData = parser.parse(xmlData);

                let isWso2Mb = false;
                const params: { [key: string]: string | number | boolean } = {};
                if (Array.isArray(jsonData.inboundEndpoint.parameters.parameter)) {
                    jsonData.inboundEndpoint.parameters.parameter.map((param: any) => {
                        if (param["@_name"] === 'rabbitmq.channel.consumer.qos') {
                            params["rabbitmq.channel.consumer.qos.type"] = param["@_key"] ? 'registry' : 'inline';
                        }
                        if (param["@_name"] === 'connectionfactory.TopicConnectionFactory' || param["@_name"] === 'connectionfactory.QueueConnectionFactory') {
                            params["mb.connection.url"] = param["#text"];
                            isWso2Mb = true;
                        }
                        if (jsonData.inboundEndpoint["@_protocol"] === 'kafka' && (param["@_name"] === 'topics' || param["@_name"] === 'topic.filter')) {
                            params["topics"] = param["@_name"];
                            params["topic.name"] = param["#text"];
                        }
                        params[param["@_name"]] = param["#text"] ?? param["@_key"];
                    });
                } else {
                    params[jsonData.inboundEndpoint.parameters.parameter["@_name"]] = jsonData.inboundEndpoint.parameters.parameter["#text"];
                }

                if (jsonData.inboundEndpoint["@_class"]) {
                    params["class"] = jsonData.inboundEndpoint["@_class"];
                }

                const response: GetInboundEndpointResponse = {
                    name: jsonData.inboundEndpoint["@_name"],
                    type: isWso2Mb ? 'wso2_mb' : jsonData.inboundEndpoint["@_protocol"] ?? 'custom',
                    sequence: jsonData.inboundEndpoint["@_sequence"],
                    errorSequence: jsonData.inboundEndpoint["@_onError"],
                    parameters: params,
                    suspend: jsonData.inboundEndpoint["@_suspend"] === 'true',
                    trace: jsonData.inboundEndpoint["@_trace"] ? true : false,
                    statistics: jsonData.inboundEndpoint["@_statistics"] ? true : false,
                };

                resolve(response);
            }

            resolve({
                name: '',
                type: '',
                sequence: '',
                errorSequence: '',
                parameters: {},
                suspend: false,
                trace: false,
                statistics: false,
            });
        });
    }

    async getEndpointsAndSequences(): Promise<EndpointsAndSequencesResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const resp = await langClient.getProjectStructure(this.projectUri);
            const artifacts = (resp.directoryMap as any).src.main.wso2mi.artifacts;

            const sequenceList = await langClient.getAvailableResources({
                documentIdentifier: this.projectUri,
                resourceType: "sequence",
            });

            const endpoints: string[] = [];
            const sequences: string[] = [];

            for (const endpoint of artifacts.endpoints) {
                endpoints.push(endpoint.name);
            }

            for (const sequence of sequenceList.resources) {
                sequences.push(sequence.name);
            }
            for (const sequence of sequenceList.registryResources) {
                sequences.push(sequence.registryKey);
            }

            resolve({ data: [endpoints, sequences] });
        });
    }

    async getAllAPIcontexts(): Promise<APIContextsResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const resp = await langClient.getProjectStructure(this.projectUri);
            const artifacts = (resp.directoryMap as any).src.main.wso2mi.artifacts;

            const contexts: string[] = [];

            for (const api of artifacts.apis) {
                contexts.push(api.context);
            }

            resolve({ contexts: contexts });
        });
    }

    async getTemplates(): Promise<TemplatesResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const resp = await langClient.getProjectStructure(this.projectUri);
            const artifacts = (resp.directoryMap as any).src.main.wso2mi.artifacts;

            const templates: string[] = [];

            for (const template of artifacts.templates) {
                templates.push(template.name);
            }

            resolve({ data: templates });
        });
    }

    async getSequenceDirectory(): Promise<SequenceDirectoryResponse> {
        return new Promise(async (resolve) => {
            let result = '';
            const findSynapseSequencePath = (startPath: string) => {
                const files = fs.readdirSync(startPath);
                for (let i = 0; i < files.length; i++) {
                    const filename = path.join(startPath, files[i]);
                    const stat = fs.lstatSync(filename);
                    if (stat.isDirectory()) {
                        if (filename.includes('synapse-config/sequences')) {
                            result = filename;
                            return result;
                        } else {
                            result = findSynapseSequencePath(filename);
                        }
                    }
                }
                return result;
            };

            const synapseSequencePath = findSynapseSequencePath(this.projectUri);
            return synapseSequencePath;
        });
    }

    async createSequence(params: CreateSequenceRequest): Promise<CreateSequenceResponse> {
        return new Promise(async (resolve) => {
            const { directory, name, endpoint, onErrorSequence, statistics, trace } = params;

            let endpointAttributes = ``;
            let errorSequence = ``;
            let statisticsAttribute = ``;
            let traceAttribute = ``;
            if (endpoint) {
                endpointAttributes = `\t<send>\n\t\t<endpoint key="${endpoint.replace(".xml", "")}"/>\n\t</send>`;
            }

            if (onErrorSequence) {
                errorSequence = `onError="${onErrorSequence}" `;
            }
            if (statistics) {
                statisticsAttribute = `statistics="enable" `;
            }
            if (trace) {
                traceAttribute = `trace="enable" `;
            } else {
                traceAttribute = `trace="disable" `;
            }

            const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<sequence name="${name}" ${errorSequence}${traceAttribute}${statisticsAttribute}xmlns="http://ws.apache.org/ns/synapse">
${endpointAttributes}
</sequence>`;

            if (params.getContentOnly) {
                resolve({ filePath: "", fileContent: xmlData });
            } else {
                const filePath = path.join(directory, `${name}.xml`);
                await replaceFullContentToFile(filePath, xmlData);
                resolve({ filePath: filePath, fileContent: "" });
            }
        });
    }

    async createProxyService(params: CreateProxyServiceRequest): Promise<CreateProxyServiceResponse> {
        return new Promise(async (resolve) => {
            const { directory, proxyServiceName, proxyServiceType, selectedTransports, endpointType, endpoint,
                requestLogLevel, responseLogLevel, securityPolicy, requestXslt, responseXslt, transformResponse,
                wsdlUri, wsdlService, wsdlPort, publishContract } = params;

            const getTemplateParams = {
                proxyServiceName, proxyServiceType, selectedTransports, endpointType, endpoint,
                requestLogLevel, responseLogLevel, securityPolicy, requestXslt, responseXslt, transformResponse,
                wsdlUri, wsdlService, wsdlPort, publishContract
            };

            const xmlData = getProxyServiceXmlWrapper(getTemplateParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

            const filePath = path.join(directory, `${proxyServiceName}.xml`);
            await replaceFullContentToFile(filePath, sanitizedXmlData);
            await this.rangeFormat({
                uri: filePath,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                }
            });
            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            resolve({ path: filePath });
        });
    }

    async createTask(params: CreateTaskRequest): Promise<CreateTaskResponse> {
        return new Promise(async (resolve) => {
            const { directory, ...templateParams } = params;
            // limit saving default values
            const tempParams = templateParams.taskProperties.filter((prop: any) =>
                prop.value !== '' && prop.value !== undefined && prop.value !== false);
            const mustacheParams = {
                ...templateParams,
                taskProperties: tempParams,
                customProperties: params.customProperties
            };
            const xmlData = getTaskXmlWrapper(mustacheParams);

            const filePath = await this.getFilePath(directory, templateParams.name);
            if (params.sequence) {
                await this.createSequence(params.sequence);
            }
            await replaceFullContentToFile(filePath, xmlData);
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.TaskView, documentUri: filePath });
            resolve({ path: filePath });
        });
    }

    async getTask(params: GetTaskRequest): Promise<GetTaskResponse> {
        const options = {
            ignoreAttributes: false,
            allowBooleanAttributes: true,
            attributeNamePrefix: "",
            attributesGroupName: "@_"
        };
        const parser = new XMLParser(options);
        return new Promise(async (resolve) => {
            const filePath = params.path;

            if (filePath.includes('.xml') && fs.existsSync(filePath)) {
                const xmlData = fs.readFileSync(filePath, "utf8");
                const jsonData = parser.parse(xmlData);

                const response: GetTaskResponse = {
                    name: jsonData.task["@_"]["name"],
                    group: jsonData.task["@_"]["group"],
                    implementation: jsonData.task["@_"]["class"],
                    pinnedServers: jsonData.task["@_"]["pinnedServers"],
                    triggerType: 'simple',
                    triggerCount: null,
                    triggerInterval: 1,
                    triggerCron: '',
                    taskProperties: []
                };

                if (jsonData.task.trigger["@_"]["once"] !== undefined) {
                    response.triggerCount = 1;
                } else if (jsonData.task.trigger["@_"]["interval"] !== undefined) {
                    response.triggerInterval = Number(jsonData.task.trigger["@_"]["interval"]);
                    response.triggerCount = jsonData.task.trigger["@_"]?.["count"] != null ?
                        Number(jsonData.task.trigger["@_"]["count"]) : null;
                }
                else if (jsonData.task.trigger["@_"]["cron"] !== undefined) {
                    response.triggerType = 'cron';
                    response.triggerCron = jsonData.task.trigger["@_"]["cron"];
                }
                if (jsonData.task.property) {
                    response.taskProperties = Array.isArray(jsonData.task.property) ?
                        jsonData.task.property.map((prop: any) => ({
                            key: prop["@_"]["name"],
                            value: prop["@_"]["value"],
                            isLiteral: true
                        })) :
                        [{
                            key: jsonData.task.property["@_"]["name"],
                            value: jsonData.task.property["@_"]["value"],
                            isLiteral: true
                        }];
                    const builder = new XMLBuilder(options);
                    const message = jsonData.task.property.filter((prop: any) => prop["@_"]["name"] === "message");
                    if (message.length > 0) {
                        response.taskProperties = response.taskProperties.filter(prop => prop.key !== "message");
                        if (message[0]["@_"]["value"] === undefined) {
                            delete message[0]["@_"];
                            let xml = builder.build(message[0]);
                            response.taskProperties.push({
                                key: "message",
                                value: xml,
                                isLiteral: false
                            });
                        } else {
                            response.taskProperties.push({
                                key: "message",
                                value: message[0]["@_"]["value"],
                                isLiteral: true
                            });
                        }
                    }
                    resolve(response);
                }

                resolve({
                    name: '',
                    group: '',
                    implementation: '',
                    pinnedServers: '',
                    triggerType: 'simple',
                    triggerCount: 1,
                    triggerInterval: 1,
                    triggerCron: '',
                    taskProperties: []
                });
            }
        });
    }

    async createTemplate(params: CreateTemplateRequest): Promise<CreateTemplateResponse> {
        return new Promise(async (resolve) => {
            const {
                directory, templateName, templateType, address, uriTemplate, httpMethod,
                wsdlUri, wsdlService, wsdlPort, traceEnabled, statisticsEnabled, parameters } = params;

            const getTemplateParams = {
                templateName, templateType, address, uriTemplate, httpMethod,
                wsdlUri, wsdlService, wsdlPort, traceEnabled, statisticsEnabled, parameters
            };

            let xmlData = getTemplateXmlWrapper(getTemplateParams);
            let sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

            if (params.getContentOnly) {
                resolve({ path: "", content: sanitizedXmlData });
            } else if (params.isEdit && params.range) {
                const filePath = await this.getFilePath(directory, templateName);
                xmlData = getEditTemplateXmlWrapper(getTemplateParams);
                await this.applyEdit({
                    text: xmlData,
                    documentUri: filePath,
                    range: params.range
                });
                resolve({ path: filePath, content: "" });
            } else {
                const filePath = await this.getFilePath(directory, templateName);
                await replaceFullContentToFile(filePath, sanitizedXmlData);
                await this.rangeFormat({
                    uri: filePath,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                    }
                });
                commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                resolve({ path: filePath, content: "" });
            }
        });
    }

    async buildBallerinaModule(projectPath: string): Promise<void> {
        await buildBallerinaModule(projectPath);
    }

    async getTemplate(params: RetrieveTemplateRequest): Promise<RetrieveTemplateResponse> {
        const options = {
            ignoreAttributes: false,
            allowBooleanAttributes: true,
            attributeNamePrefix: "@_",
            attributesGroupName: "@_"
        };
        const parser = new XMLParser(options);


        return new Promise(async (resolve) => {
            const filePath = params.path;

            if (fs.existsSync(filePath)) {
                const xmlData = fs.readFileSync(filePath, "utf8");
                const jsonData = parser.parse(xmlData);
                let response: RetrieveTemplateResponse = {
                    templateName: jsonData.template["@_"]["@_name"],
                    templateType: '',
                    address: '',
                    uriTemplate: '',
                    httpMethod: '',
                    wsdlUri: '',
                    wsdlService: '',
                    wsdlPort: null,
                    traceEnabled: false,
                    statisticsEnabled: false,
                    parameters: []
                };

                if (jsonData.template.endpoint?.address) {
                    response.templateType = 'Address Endpoint Template';
                    response.address = jsonData.template.endpoint.address["@_"]["@_uri"];
                } else if (jsonData.template.endpoint?.default) {
                    response.templateType = 'Default Endpoint Template';
                } else if (jsonData.template.endpoint?.http) {
                    response.templateType = 'HTTP Endpoint Template';
                    if (jsonData.template.endpoint.http["@_"]["@_method"] !== undefined) {
                        response.httpMethod = jsonData.template.endpoint.http["@_"]["@_method"].toUpperCase();
                    } else {
                        response.httpMethod = 'leave_as_is';
                    }
                    response.uriTemplate = jsonData.template.endpoint.http["@_"]["@_uri-template"];
                } else if (jsonData.template.endpoint?.wsdl) {
                    response.templateType = 'WSDL Endpoint Template';
                    response.wsdlUri = jsonData.template.endpoint.wsdl["@_"]["@_uri"];
                    response.wsdlService = jsonData.template.endpoint.wsdl["@_"]["@_service"];
                    response.wsdlPort = jsonData.template.endpoint.wsdl["@_"]["@_port"];
                } else {
                    response.templateType = 'Sequence Template';
                    if (jsonData.template.sequence["@_"] !== undefined) {
                        response.traceEnabled = jsonData.template.sequence["@_"]["@_trace"] !== undefined;
                        response.statisticsEnabled = jsonData.template.sequence["@_"]["@_statistics"] !== undefined;
                    }
                    if (jsonData.template.parameter != undefined) {
                        const params = jsonData.template.parameter;
                        if (Array.isArray(params)) {
                            params.forEach((param: any) => {
                                const templateProperty = {
                                    name: param["@_"]["@_name"],
                                    isMandatory: param["@_"]["@_isMandatory"],
                                    default: param["@_"]["@_defaultValue"] ?? ""
                                };
                                response.parameters.push(templateProperty);
                            });
                        } else {
                            const templateProperty = {
                                name: params["@_"]["@_name"],
                                isMandatory: params["@_"]["@_isMandatory"],
                                default: params["@_"]["@_defaultValue"] ?? ""
                            };
                            response.parameters.push(templateProperty);
                        }
                    }
                }

                resolve(response);
            }
        });
    }

    // XXXX
    async updateHttpEndpoint(params: UpdateHttpEndpointRequest): Promise<UpdateHttpEndpointResponse> {
        return new Promise(async (resolve) => {
            const { directory, ...getHttpEndpointParams } = params;

            const xmlData = getHttpEndpointXmlWrapper(getHttpEndpointParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

            if (params.getContentOnly) {
                resolve({ path: "", content: sanitizedXmlData });
            } else {
                const { templateName, endpointName } = getHttpEndpointParams;
                const fileName = templateName?.length > 0 ? templateName : endpointName;
                const filePath = await this.getFilePath(directory, fileName);
                await replaceFullContentToFile(filePath, sanitizedXmlData);
                await this.rangeFormat({
                    uri: filePath,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                    }
                });
                commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                openPopupView(this.projectUri, POPUP_EVENT_TYPE.CLOSE_VIEW, { view: null, recentIdentifier: fileName });
                resolve({ path: filePath, content: "" });
            }
        });
    }

    async getHttpEndpoint(params: RetrieveHttpEndpointRequest): Promise<RetrieveHttpEndpointResponse> {

        const endpointSyntaxTree = await this.getSyntaxTree({ documentUri: params.path });
        const templateParams = endpointSyntaxTree.syntaxTree.template != undefined ? endpointSyntaxTree.syntaxTree.template : null;
        const endpointParams = endpointSyntaxTree.syntaxTree.template?.endpoint ?? endpointSyntaxTree.syntaxTree.endpoint;
        const httpParams = endpointParams.http;
        const endpointOverallParams = httpParams?.enableSecAndEnableRMAndEnableAddressing;
        const authenticationParams = endpointOverallParams?.authentication;
        const suspensionParams = endpointOverallParams?.markForSuspension;
        const failureParams = endpointOverallParams?.suspendOnFailure;
        const timeoutParams = endpointOverallParams?.timeout;

        return new Promise(async (resolve) => {
            const filePath = params.path;

            if (fs.existsSync(filePath)) {
                let response: RetrieveHttpEndpointResponse = {
                    endpointName: endpointParams.name,
                    traceEnabled: httpParams?.trace != undefined ? httpParams?.trace : 'disable',
                    statisticsEnabled: httpParams?.statistics != undefined ? httpParams?.statistics : 'disable',
                    uriTemplate: httpParams?.uriTemplate,
                    httpMethod: httpParams?.method != undefined ? httpParams?.method.toUpperCase() : 'leave_as_is',
                    description: endpointParams?.description,
                    requireProperties: false,
                    properties: [],
                    authType: "",
                    basicAuthUsername: "",
                    basicAuthPassword: "",
                    authMode: "",
                    grantType: "",
                    clientId: "",
                    clientSecret: "",
                    refreshToken: "",
                    tokenUrl: "",
                    username: "",
                    password: "",
                    requireOauthParameters: false,
                    oauthProperties: [],
                    addressingEnabled: endpointOverallParams?.enableAddressing != undefined ? 'enable' : 'disable',
                    addressingVersion: endpointOverallParams?.enableAddressing != undefined ? endpointOverallParams?.enableAddressing?.version : '',
                    addressListener: (endpointOverallParams?.enableAddressing != undefined && endpointOverallParams?.enableAddressing?.separateListener) ? 'enable' : 'disable',
                    securityEnabled: endpointOverallParams?.enableSec != undefined ? 'enable' : 'disable',
                    seperatePolicies: endpointOverallParams?.enableSec != undefined ? endpointOverallParams?.enableSec?.policy !== undefined ? false : true : false,
                    policyKey: endpointOverallParams?.enableSec != undefined ? endpointOverallParams?.enableSec?.policy ?? '' : '',
                    inboundPolicyKey: endpointOverallParams?.enableSec != undefined ? endpointOverallParams?.enableSec?.inboundPolicy ?? '' : '',
                    outboundPolicyKey: endpointOverallParams?.enableSec != undefined ? endpointOverallParams?.enableSec?.outboundPolicy ?? '' : '',
                    suspendErrorCodes: failureParams?.errorCodes != undefined ? failureParams?.errorCodes.textNode : '',
                    initialDuration: failureParams?.initialDuration != undefined ? failureParams?.initialDuration.textNode : -1,
                    maximumDuration: failureParams?.maximumDuration != undefined ? failureParams?.maximumDuration.textNode : Number.MAX_SAFE_INTEGER,
                    progressionFactor: failureParams?.progressionFactor != undefined ? failureParams?.progressionFactor.textNode : 1.0,
                    retryErrorCodes: suspensionParams?.errorCodes != undefined ? suspensionParams?.errorCodes.textNode : '',
                    retryCount: suspensionParams?.retriesBeforeSuspension != undefined ? suspensionParams?.retriesBeforeSuspension.textNode : 0,
                    retryDelay: suspensionParams?.retryDelay != undefined ? suspensionParams?.retryDelay.textNode : 0,
                    timeoutDuration: (timeoutParams != undefined && timeoutParams?.content[0] != undefined) ? timeoutParams?.content[0].textNode : Number.MAX_SAFE_INTEGER,
                    timeoutAction: (timeoutParams != undefined && timeoutParams?.content[1] != undefined) ? timeoutParams?.content[1].textNode : '',
                    templateName: templateParams != null || templateParams != undefined ? templateParams.name : '',
                    requireTemplateParameters: false,
                    templateParameters: []
                };

                if (authenticationParams != undefined) {
                    if (authenticationParams.oauth != undefined) {
                        response.authType = 'OAuth';
                        if (authenticationParams.oauth.authorizationCode != undefined) {
                            response.grantType = 'Authorization Code';
                            response.refreshToken = authenticationParams.oauth.authorizationCode.refreshToken.textNode;
                            response.clientId = authenticationParams.oauth.authorizationCode.clientId.textNode;
                            response.clientSecret = authenticationParams.oauth.authorizationCode.clientSecret.textNode;
                            response.tokenUrl = authenticationParams.oauth.authorizationCode.tokenUrl.textNode;
                            response.authMode = authenticationParams.oauth.authorizationCode.authMode.textNode;
                            if (authenticationParams.oauth.authorizationCode.requestParameters != undefined) {
                                let oauthParams: any[];
                                oauthParams = authenticationParams.oauth.authorizationCode.requestParameters.parameter;
                                oauthParams.forEach((element) => {
                                    response.oauthProperties.push({ key: element.name, value: element.textNode });
                                });
                            }
                        } else if (authenticationParams.oauth.clientCredentials != undefined) {
                            response.grantType = 'Client Credentials';
                            response.clientId = authenticationParams.oauth.clientCredentials.clientId.textNode;
                            response.clientSecret = authenticationParams.oauth.clientCredentials.clientSecret.textNode;
                            response.tokenUrl = authenticationParams.oauth.clientCredentials.tokenUrl.textNode;
                            response.authMode = authenticationParams.oauth.clientCredentials.authMode.textNode;
                            if (authenticationParams.oauth.clientCredentials.requestParameters != undefined) {
                                let oauthParams: any[];
                                oauthParams = authenticationParams.oauth.clientCredentials.requestParameters.parameter;
                                oauthParams.forEach((element) => {
                                    response.oauthProperties.push({ key: element.name, value: element.textNode });
                                });
                            }
                        } else {
                            response.grantType = 'Password';
                            response.username = authenticationParams.oauth.passwordCredentials.username.textNode;
                            response.password = authenticationParams.oauth.passwordCredentials.password.textNode;
                            response.clientId = authenticationParams.oauth.passwordCredentials.clientId.textNode;
                            response.clientSecret = authenticationParams.oauth.passwordCredentials.clientSecret.textNode;
                            response.tokenUrl = authenticationParams.oauth.passwordCredentials.tokenUrl.textNode;
                            response.authMode = authenticationParams.oauth.passwordCredentials.authMode.textNode;
                            if (authenticationParams.oauth.passwordCredentials.requestParameters != undefined) {
                                let oauthParams: any[];
                                oauthParams = authenticationParams.oauth.passwordCredentials.requestParameters.parameter;
                                oauthParams.forEach((element) => {
                                    response.oauthProperties.push({ key: element.name, value: element.textNode });
                                });
                            }
                        }
                    } else if (authenticationParams.basicAuth != undefined) {
                        response.authType = 'Basic Auth';
                        response.basicAuthUsername = authenticationParams.basicAuth.username.textNode;
                        response.basicAuthPassword = authenticationParams.basicAuth.password.textNode;
                    } else {
                        response.authType = 'None';
                    }
                } else {
                    response.authType = 'None';
                }

                if (endpointParams.property != undefined) {
                    let params: any[];
                    params = endpointParams.property;
                    params.forEach((element) => {
                        response.properties.push({ name: element.name, value: element.value, scope: element.scope ?? 'default' });
                    });
                }

                if (templateParams != null && templateParams.parameter != undefined && templateParams.parameter.length > 0) {
                    let params: any[];
                    params = templateParams.parameter;
                    params.forEach((element) => {
                        response.templateParameters.push(element.name);
                    });
                }

                response.requireProperties = response.properties.length > 0;
                response.requireOauthParameters = response.oauthProperties.length > 0;
                response.requireTemplateParameters = response.templateParameters.length > 0;

                resolve(response);
            }
        });
    }

    async updateAddressEndpoint(params: UpdateAddressEndpointRequest): Promise<UpdateAddressEndpointResponse> {
        return new Promise(async (resolve) => {
            const {
                directory, ...getAddressEndpointParams
            } = params;

            const xmlData = getAddressEndpointXmlWrapper(getAddressEndpointParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

            if (params.getContentOnly) {
                resolve({ path: "", content: sanitizedXmlData });
            } else {
                const { templateName, endpointName } = getAddressEndpointParams;
                const fileName = templateName?.length > 0 ? templateName : endpointName;
                const filePath = await this.getFilePath(directory, fileName);
                await replaceFullContentToFile(filePath, sanitizedXmlData);
                await this.rangeFormat({
                    uri: filePath,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                    }
                });
                commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                openPopupView(this.projectUri, POPUP_EVENT_TYPE.CLOSE_VIEW, { view: null, recentIdentifier: fileName });
                resolve({ path: filePath, content: "" });
            }
        });
    }

    async getAddressEndpoint(params: RetrieveAddressEndpointRequest): Promise<RetrieveAddressEndpointResponse> {

        const endpointSyntaxTree = await this.getSyntaxTree({ documentUri: params.path });
        const templateParams = endpointSyntaxTree.syntaxTree.template != undefined ? endpointSyntaxTree.syntaxTree.template : null;
        const endpointParams = endpointSyntaxTree.syntaxTree.template?.endpoint ?? endpointSyntaxTree.syntaxTree.endpoint;
        const addressParams = endpointParams.address;
        const suspensionParams = addressParams?.markForSuspension;
        const failureParams = addressParams?.suspendOnFailure;
        const timeoutParams = addressParams?.timeout;

        return new Promise(async (resolve) => {
            const filePath = params.path;

            if (fs.existsSync(filePath)) {
                let response: RetrieveAddressEndpointResponse = {
                    endpointName: endpointParams.name,
                    format: addressParams?.format != undefined ? addressParams?.format.toUpperCase() : 'LEAVE_AS_IS',
                    traceEnabled: addressParams?.trace != undefined ? addressParams?.trace : 'disable',
                    statisticsEnabled: addressParams?.statistics != undefined ? addressParams?.statistics : 'disable',
                    uri: addressParams?.uri,
                    optimize: addressParams?.optimize != undefined ? addressParams?.optimize.toUpperCase() : 'LEAVE_AS_IS',
                    description: endpointParams?.description,
                    requireProperties: false,
                    properties: [],
                    addressingEnabled: addressParams?.enableAddressing != undefined ? 'enable' : 'disable',
                    addressingVersion: addressParams?.enableAddressing != undefined ? addressParams?.enableAddressing.version : '',
                    addressListener: (addressParams?.enableAddressing != undefined && addressParams?.enableAddressing.separateListener) ? 'enable' : 'disable',
                    securityEnabled: addressParams?.enableSec != undefined ? 'enable' : 'disable',
                    seperatePolicies: addressParams?.enableSec != undefined ? addressParams?.enableSec.policy !== undefined ? false : true : false,
                    policyKey: addressParams?.enableSec != undefined ? addressParams?.enableSec.policy ?? '' : '',
                    inboundPolicyKey: addressParams?.enableSec != undefined ? addressParams?.enableSec.inboundPolicy ?? '' : '',
                    outboundPolicyKey: addressParams?.enableSec != undefined ? addressParams?.enableSec.outboundPolicy ?? '' : '',
                    suspendErrorCodes: failureParams?.errorCodes != undefined ? failureParams?.errorCodes.textNode : '',
                    initialDuration: failureParams?.initialDuration != undefined ? failureParams?.initialDuration.textNode : -1,
                    maximumDuration: failureParams?.maximumDuration != undefined ? failureParams?.maximumDuration.textNode : Number.MAX_SAFE_INTEGER,
                    progressionFactor: failureParams?.progressionFactor != undefined ? failureParams?.progressionFactor.textNode : 1.0,
                    retryErrorCodes: suspensionParams?.errorCodes != undefined ? suspensionParams?.errorCodes.textNode : '',
                    retryCount: suspensionParams?.retriesBeforeSuspension != undefined ? suspensionParams?.retriesBeforeSuspension.textNode : 0,
                    retryDelay: suspensionParams?.retryDelay != undefined ? suspensionParams?.retryDelay.textNode : 0,
                    timeoutDuration: (timeoutParams != undefined && timeoutParams?.content[0] != undefined) ? timeoutParams?.content[0].textNode : Number.MAX_SAFE_INTEGER,
                    timeoutAction: (timeoutParams != undefined && timeoutParams?.content[1] != undefined) ? timeoutParams?.content[1].textNode : '',
                    templateName: templateParams != null || templateParams != undefined ? templateParams.name : '',
                    requireTemplateParameters: false,
                    templateParameters: []
                };

                if (response.format === 'SOAP11') {
                    response.format = 'SOAP 1.1';
                } else if (response.format === 'SOAP12') {
                    response.format = 'SOAP 1.2';
                }

                if (endpointParams.property != undefined) {
                    let params: any[];
                    params = endpointParams.property;
                    params.forEach((element) => {
                        response.properties.push({ name: element.name, value: element.value, scope: element.scope ?? 'default' });
                    });
                }

                if (templateParams != null && templateParams.parameter != undefined && templateParams.parameter.length > 0) {
                    let params: any[];
                    params = templateParams.parameter;
                    params.forEach((element) => {
                        response.templateParameters.push(element.name);
                    });
                }

                response.requireProperties = response.properties.length > 0;
                response.requireTemplateParameters = response.templateParameters.length > 0;

                resolve(response);
            }
        });
    }

    async updateWsdlEndpoint(params: UpdateWsdlEndpointRequest): Promise<UpdateWsdlEndpointResponse> {
        return new Promise(async (resolve) => {
            const { directory, ...getWsdlEndpointParams } = params;

            const xmlData = getWsdlEndpointXmlWrapper(getWsdlEndpointParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

            if (params.getContentOnly) {
                resolve({ path: "", content: sanitizedXmlData });
            } else {
                const { templateName, endpointName } = getWsdlEndpointParams;
                const fileName = templateName?.length > 0 ? templateName : endpointName;
                const filePath = await this.getFilePath(directory, fileName);
                await replaceFullContentToFile(filePath, sanitizedXmlData);
                await this.rangeFormat({
                    uri: filePath,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                    }
                });
                commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                openPopupView(this.projectUri, POPUP_EVENT_TYPE.CLOSE_VIEW, { view: null, recentIdentifier: fileName });
                resolve({ path: filePath, content: "" });
            }
        });
    }

    async getWsdlEndpoint(params: RetrieveWsdlEndpointRequest): Promise<RetrieveWsdlEndpointResponse> {

        const endpointSyntaxTree = await this.getSyntaxTree({ documentUri: params.path });
        const templateParams = endpointSyntaxTree.syntaxTree.template != undefined ? endpointSyntaxTree.syntaxTree.template : null;
        const endpointParams = endpointSyntaxTree.syntaxTree.template?.endpoint ?? endpointSyntaxTree.syntaxTree.endpoint;
        const wsdlParams = endpointParams.wsdl;
        const suspensionParams = wsdlParams?.markForSuspension;
        const failureParams = wsdlParams?.suspendOnFailure;
        const timeoutParams = wsdlParams?.timeout;

        return new Promise(async (resolve) => {
            const filePath = params.path;

            if (fs.existsSync(filePath)) {
                let response: RetrieveWsdlEndpointResponse = {
                    endpointName: endpointParams.name,
                    format: wsdlParams?.format != undefined ? wsdlParams?.format.toUpperCase() : 'LEAVE_AS_IS',
                    traceEnabled: wsdlParams?.trace != undefined ? wsdlParams?.trace : 'disable',
                    statisticsEnabled: wsdlParams?.statistics != undefined ? wsdlParams?.statistics : 'disable',
                    optimize: wsdlParams?.optimize != undefined ? wsdlParams?.optimize.toUpperCase() : 'LEAVE_AS_IS',
                    description: endpointParams?.description,
                    wsdlUri: wsdlParams?.uri,
                    wsdlService: wsdlParams?.service,
                    wsdlPort: wsdlParams?.port,
                    requireProperties: false,
                    properties: [],
                    addressingEnabled: wsdlParams?.enableAddressing != undefined ? 'enable' : 'disable',
                    addressingVersion: wsdlParams?.enableAddressing != undefined ? wsdlParams?.enableAddressing.version : '',
                    addressListener: (wsdlParams?.enableAddressing != undefined && wsdlParams?.enableAddressing.separateListener) ? 'enable' : 'disable',
                    securityEnabled: wsdlParams?.enableSec != undefined ? 'enable' : 'disable',
                    seperatePolicies: wsdlParams?.enableSec != undefined ? wsdlParams?.enableSec.policy !== undefined ? false : true : false,
                    policyKey: wsdlParams?.enableSec != undefined ? wsdlParams?.enableSec.policy ?? '' : '',
                    inboundPolicyKey: wsdlParams?.enableSec != undefined ? wsdlParams?.enableSec.inboundPolicy ?? '' : '',
                    outboundPolicyKey: wsdlParams?.enableSec != undefined ? wsdlParams?.enableSec.outboundPolicy ?? '' : '',
                    suspendErrorCodes: failureParams?.errorCodes != undefined ? failureParams?.errorCodes.textNode : '',
                    initialDuration: failureParams?.initialDuration != undefined ? failureParams?.initialDuration.textNode : -1,
                    maximumDuration: failureParams?.maximumDuration != undefined ? failureParams?.maximumDuration.textNode : Number.MAX_SAFE_INTEGER,
                    progressionFactor: failureParams?.progressionFactor != undefined ? failureParams?.progressionFactor.textNode : 1.0,
                    retryErrorCodes: suspensionParams?.errorCodes != undefined ? suspensionParams?.errorCodes.textNode : '',
                    retryCount: suspensionParams?.retriesBeforeSuspension != undefined ? suspensionParams?.retriesBeforeSuspension.textNode : 0,
                    retryDelay: suspensionParams?.retryDelay != undefined ? suspensionParams?.retryDelay.textNode : 0,
                    timeoutDuration: (timeoutParams != undefined && timeoutParams?.content[0] != undefined) ? timeoutParams?.content[0].textNode : Number.MAX_SAFE_INTEGER,
                    timeoutAction: (timeoutParams != undefined && timeoutParams?.content[1] != undefined) ? timeoutParams?.content[1].textNode : '',
                    templateName: templateParams != null || templateParams != undefined ? templateParams.name : '',
                    requireTemplateParameters: false,
                    templateParameters: []
                };

                if (response.format === 'SOAP11') {
                    response.format = 'SOAP 1.1';
                } else if (response.format === 'SOAP12') {
                    response.format = 'SOAP 1.2';
                }

                if (endpointParams.property != undefined) {
                    let params: any[];
                    params = endpointParams.property;
                    params.forEach((element) => {
                        response.properties.push({ name: element.name, value: element.value, scope: element.scope ?? 'default' });
                    });
                }

                if (templateParams != null && templateParams.parameter != undefined && templateParams.parameter.length > 0) {
                    let params: any[];
                    params = templateParams.parameter;
                    params.forEach((element) => {
                        response.templateParameters.push(element.name);
                    });
                }

                response.requireProperties = response.properties.length > 0;
                response.requireTemplateParameters = response.templateParameters.length > 0;

                resolve(response);
            }
        });
    }

    async updateDefaultEndpoint(params: UpdateDefaultEndpointRequest): Promise<UpdateDefaultEndpointResponse> {
        return new Promise(async (resolve) => {
            const { directory, ...getDefaultEndpointParams } = params;

            const xmlData = getDefaultEndpointXmlWrapper(getDefaultEndpointParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

            if (params.getContentOnly) {
                resolve({ path: "", content: sanitizedXmlData });
            } else {
                const { templateName, endpointName } = getDefaultEndpointParams;
                const fileName = templateName?.length > 0 ? templateName : endpointName;
                const filePath = await this.getFilePath(directory, fileName);
                await replaceFullContentToFile(filePath, sanitizedXmlData);
                await this.rangeFormat({
                    uri: filePath,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                    }
                });
                commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                openPopupView(this.projectUri, POPUP_EVENT_TYPE.CLOSE_VIEW, { view: null, recentIdentifier: fileName });
                resolve({ path: filePath, content: "" });
            }
        });
    }

    async getDefaultEndpoint(params: RetrieveDefaultEndpointRequest): Promise<RetrieveDefaultEndpointResponse> {

        const endpointSyntaxTree = await this.getSyntaxTree({ documentUri: params.path });
        const templateParams = endpointSyntaxTree.syntaxTree.template != undefined ? endpointSyntaxTree.syntaxTree.template : null;
        const endpointParams = endpointSyntaxTree.syntaxTree.template?.endpoint ?? endpointSyntaxTree.syntaxTree.endpoint;
        const defaultParams = endpointParams._default;
        const suspensionParams = defaultParams?.markForSuspension;
        const failureParams = defaultParams?.suspendOnFailure;
        const timeoutParams = defaultParams?.timeout;

        return new Promise(async (resolve) => {
            const filePath = params.path;

            if (fs.existsSync(filePath)) {
                let response: RetrieveDefaultEndpointResponse = {
                    endpointName: endpointParams.name,
                    format: defaultParams?.format != undefined ? defaultParams?.format.toUpperCase() : 'LEAVE_AS_IS',
                    traceEnabled: defaultParams?.trace != undefined ? defaultParams?.trace : 'disable',
                    statisticsEnabled: defaultParams?.statistics != undefined ? defaultParams?.statistics : 'disable',
                    optimize: defaultParams?.optimize != undefined ? defaultParams?.optimize.toUpperCase() : 'LEAVE_AS_IS',
                    description: endpointParams?.description,
                    requireProperties: false,
                    properties: [],
                    addressingEnabled: defaultParams?.enableAddressing != undefined ? 'enable' : 'disable',
                    addressingVersion: defaultParams?.enableAddressing != undefined ? defaultParams?.enableAddressing.version : '',
                    addressListener: (defaultParams?.enableAddressing != undefined && defaultParams?.enableAddressing.separateListener) ? 'enable' : 'disable',
                    securityEnabled: defaultParams?.enableSec != undefined ? 'enable' : 'disable',
                    seperatePolicies: defaultParams?.enableSec != undefined ? defaultParams?.enableSec.policy !== undefined ? false : true : false,
                    policyKey: defaultParams?.enableSec != undefined ? defaultParams?.enableSec.policy ?? '' : '',
                    inboundPolicyKey: defaultParams?.enableSec != undefined ? defaultParams?.enableSec.inboundPolicy ?? '' : '',
                    outboundPolicyKey: defaultParams?.enableSec != undefined ? defaultParams?.enableSec.outboundPolicy ?? '' : '',
                    suspendErrorCodes: failureParams?.errorCodes != undefined ? failureParams?.errorCodes.textNode : '',
                    initialDuration: failureParams?.initialDuration != undefined ? failureParams?.initialDuration.textNode : -1,
                    maximumDuration: failureParams?.maximumDuration != undefined ? failureParams?.maximumDuration.textNode : Number.MAX_SAFE_INTEGER,
                    progressionFactor: failureParams?.progressionFactor != undefined ? failureParams?.progressionFactor.textNode : 1.0,
                    retryErrorCodes: suspensionParams?.errorCodes != undefined ? suspensionParams?.errorCodes.textNode : '',
                    retryCount: suspensionParams?.retriesBeforeSuspension != undefined ? suspensionParams?.retriesBeforeSuspension.textNode : 0,
                    retryDelay: suspensionParams?.retryDelay != undefined ? suspensionParams?.retryDelay.textNode : 0,
                    timeoutDuration: (timeoutParams != undefined && timeoutParams?.content[0] != undefined) ? timeoutParams?.content[0].textNode : Number.MAX_SAFE_INTEGER,
                    timeoutAction: (timeoutParams != undefined && timeoutParams?.content[1] != undefined) ? timeoutParams?.content[1].textNode : '',
                    templateName: templateParams != null || templateParams != undefined ? templateParams.name : '',
                    requireTemplateParameters: false,
                    templateParameters: []
                };

                if (response.format === 'SOAP11') {
                    response.format = 'SOAP 1.1';
                } else if (response.format === 'SOAP12') {
                    response.format = 'SOAP 1.2';
                }

                if (endpointParams.property != undefined) {
                    let params: any[];
                    params = endpointParams.property;
                    params.forEach((element) => {
                        response.properties.push({ name: element.name, value: element.value, scope: element.scope ?? 'default' });
                    });
                }

                if (templateParams != null && templateParams.parameter != undefined && templateParams.parameter.length > 0) {
                    let params: any[];
                    params = templateParams.parameter;
                    params.forEach((element) => {
                        response.templateParameters.push(element.name);
                    });
                }

                response.requireProperties = response.properties.length > 0;
                response.requireTemplateParameters = response.templateParameters.length > 0;

                resolve(response);
            }
        });
    }

    async createDataService(params: CreateDataServiceRequest): Promise<CreateDataServiceResponse> {
        return new Promise(async (resolve) => {
            let filePath;
            if (params.directory.endsWith('.dbs')) {
                filePath = params.directory;
                const data = await fs.readFileSync(filePath);
                const resourcePattern = /<resource[\s\S]*?<\/resource>/g;
                const operationPattern = /<operation[\s\S]*?<\/operation>/g;
                const queryPattern = /<query[\s\S]*?<\/query>/g;
                const resources: any[] = [];
                const operations: any[] = [];
                const queries: any[] = [];
                let match;

                while ((match = resourcePattern.exec(data.toString())) !== null) {
                    resources.push(match[0]);
                }
                while ((match = operationPattern.exec(data.toString())) !== null) {
                    operations.push(match[0]);
                }
                while ((match = queryPattern.exec(data.toString())) !== null) {
                    queries.push(match[0]);
                }

                params.resources = resources;
                params.operations = operations;
                params.queries = queries;
                await this.updateDataService(params);
            } else {
                const {
                    directory, dataServiceName, dataServiceNamespace, serviceGroup, selectedTransports, publishSwagger, jndiName,
                    enableBoxcarring, enableBatchRequests, serviceStatus, disableLegacyBoxcarringMode, enableStreaming,
                    description, datasources, authProviderClass, authProperties, queries, operations, resources
                } = params;

                const getDataServiceParams = {
                    dataServiceName, dataServiceNamespace, serviceGroup, selectedTransports, publishSwagger, jndiName,
                    enableBoxcarring, enableBatchRequests, serviceStatus, disableLegacyBoxcarringMode, enableStreaming,
                    description, datasources, authProviderClass, authProperties, queries, operations, resources
                };

                const xmlData = getDataServiceXmlWrapper({ ...getDataServiceParams, writeType: "create" });
                const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

                filePath = path.join(directory, `${dataServiceName}.dbs`);
                if (filePath.includes('dataServices')) {
                    filePath = filePath.replace('dataServices', 'data-services');
                }

                await replaceFullContentToFile(filePath, sanitizedXmlData);
                await this.rangeFormat({
                    uri: filePath,
                    range: {
                        start: { line: 0, character: 0 },
                        end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                    }
                });
            }

            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            resolve({ path: filePath });
        });
    }

    async updateDataService(params: CreateDataServiceRequest): Promise<CreateDataServiceResponse> {
        return new Promise(async (resolve) => {
            const {
                dataServiceName, dataServiceNamespace, serviceGroup, selectedTransports, publishSwagger, jndiName,
                enableBoxcarring, enableBatchRequests, serviceStatus, disableLegacyBoxcarringMode, enableStreaming,
                description, datasources, authProviderClass, authProperties, queries, operations, resources
            } = params;

            const getDataServiceParams = {
                dataServiceName, dataServiceNamespace, serviceGroup, selectedTransports, publishSwagger, jndiName,
                enableBoxcarring, enableBatchRequests, serviceStatus, disableLegacyBoxcarringMode, enableStreaming,
                description, datasources, authProviderClass, authProperties, queries, operations, resources
            };

            let filePath = params.directory;
            if (filePath.includes('dataServices')) {
                filePath = filePath.replace('dataServices', 'data-services');
            }

            const xmlData = getDataServiceXmlWrapper({ ...getDataServiceParams, writeType: "edit" });
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

            if (path.basename(filePath).split('.')[0] !== dataServiceName) {
                fs.unlinkSync(filePath);
                filePath = path.join(path.dirname(filePath), `${dataServiceName}.dbs`);
            }

            await replaceFullContentToFile(filePath, sanitizedXmlData);
            await this.rangeFormat({
                uri: filePath,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                }
            });

            resolve({ path: filePath });
        });
    }

    async createDssDataSource(params: CreateDssDataSourceRequest): Promise<CreateDssDataSourceResponse> {
        return new Promise(async (resolve) => {
            const {
                directory, type, dataSourceName, enableOData, dynamicUserAuthClass, datasourceProperties,
                datasourceConfigurations, dynamicUserAuthMapping
            } = params;

            const getDssDataSourceParams = {
                dataSourceName, enableOData, dynamicUserAuthClass, datasourceProperties,
                datasourceConfigurations, dynamicUserAuthMapping
            };

            const dataServiceSyntaxTree = await this.getSyntaxTree({ documentUri: params.directory });
            const dataServiceParams = dataServiceSyntaxTree.syntaxTree.data;

            let startRange, endRange;

            if (type === 'create') {
                startRange = dataServiceParams.range.endTagRange.start;
                endRange = dataServiceParams.range.endTagRange.start;
            } else {
                let datasource;
                dataServiceParams.configs.forEach((element) => {
                    if (element.id === dataSourceName) {
                        datasource = element;
                    }
                });
                startRange = datasource.range.startTagRange.start;
                endRange = datasource.range.endTagRange.end;
            }

            let filePath = directory;
            if (filePath.includes('dataServices')) {
                filePath = filePath.replace('dataServices', 'data-services');
            }

            const xmlData = getDssDataSourceXmlWrapper(getDssDataSourceParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

            await this.applyEdit({
                documentUri: filePath,
                range: {
                    start: startRange,
                    end: endRange
                },
                text: sanitizedXmlData
            });
            openPopupView(this.projectUri, POPUP_EVENT_TYPE.CLOSE_VIEW, { view: null, recentIdentifier: getDssDataSourceParams.dataSourceName });
            resolve({ path: filePath });
        });
    }

    async getDataService(params: RetrieveDataServiceRequest): Promise<RetrieveDataServiceResponse> {

        const dataServiceSyntaxTree = await this.getSyntaxTree({ documentUri: params.path });
        const dataServiceParams = dataServiceSyntaxTree.syntaxTree.data;

        return new Promise(async (resolve) => {
            const filePath = params.path;

            if (fs.existsSync(filePath)) {
                let response: RetrieveDataServiceResponse = {
                    dataServiceName: dataServiceParams.name,
                    dataServiceNamespace: dataServiceParams.serviceNamespace,
                    serviceGroup: dataServiceParams.serviceGroup,
                    selectedTransports: dataServiceParams.transports,
                    publishSwagger: dataServiceParams.publishSwagger != undefined ? dataServiceParams.publishSwagger : '',
                    jndiName: dataServiceParams.txManagerJNDIName != undefined ? dataServiceParams.txManagerJNDIName : '',
                    enableBoxcarring: dataServiceParams.enableBoxcarring != undefined ? dataServiceParams.enableBoxcarring : false,
                    enableBatchRequests: dataServiceParams.enableBatchRequests != undefined ? dataServiceParams.enableBatchRequests : false,
                    serviceStatus: dataServiceParams.serviceStatus != undefined ? dataServiceParams.serviceStatus === "active" ? true : false : false,
                    disableLegacyBoxcarringMode: dataServiceParams.disableLegacyBoxcarringMode != undefined ? dataServiceParams.disableLegacyBoxcarringMode : false,
                    enableStreaming: dataServiceParams.disableStreaming != undefined ? !dataServiceParams.disableStreaming : true,
                    description: dataServiceParams.description != undefined ? dataServiceParams.description.textNode : '',
                    datasources: [] as Datasource[],
                    authProviderClass: dataServiceParams.authorizationProvider != undefined ? dataServiceParams.authorizationProvider.clazz : '',
                    http: dataServiceParams.transports != undefined ? dataServiceParams.transports.split(' ').includes('http') : false,
                    https: dataServiceParams.transports != undefined ? dataServiceParams.transports.split(' ').includes('https') : false,
                    jms: dataServiceParams.transports != undefined ? dataServiceParams.transports.split(' ').includes('jms') : false,
                    local: dataServiceParams.transports != undefined ? dataServiceParams.transports.split(' ').includes('local') : false,
                    authProperties: [] as Property[],
                };

                if (dataServiceParams.configs != undefined) {
                    let datasources: any[];
                    datasources = dataServiceParams.configs;
                    datasources.forEach((datasource) => {
                        let datasourceObject: Datasource = {
                            dataSourceName: datasource.id,
                            enableOData: datasource.enableOData != undefined ? datasource.enableOData : false,
                            dynamicUserAuthClass: '',
                            datasourceProperties: [] as Property[],
                            datasourceConfigurations: [] as Configuration[]
                        }
                        let params = datasource.property;
                        params.forEach((element) => {
                            if (element.name === 'dynamicUserAuthMapping') {
                                let configs = element.configuration;
                                configs.forEach((config) => {
                                    let entries = config.entry;
                                    entries.forEach((entry) => {
                                        datasourceObject.datasourceConfigurations.push({ carbonUsername: entry.request, username: entry.username.textNode, password: entry.password.textNode });
                                    });
                                });
                            } else {
                                if (element.name === 'dynamicUserAuthClass') {
                                    datasourceObject.dynamicUserAuthClass = element.textNode;
                                } else {
                                    if (element.name === 'password' && Object.keys(element.namespaces).length !== 0) {
                                        datasourceObject.datasourceProperties.push({ key: "useSecretAlias", value: true });
                                        datasourceObject.datasourceProperties.push({ key: "secretAlias", value: element.textNode });
                                    } else {
                                        datasourceObject.datasourceProperties.push({ key: element.name, value: element.textNode });
                                    }
                                }
                            }
                        });
                        if (!datasourceObject.datasourceProperties.some(element => element.key === "secretAlias")) {
                            datasourceObject.datasourceProperties.push({ key: "useSecretAlias", value: false });
                        }
                        response.datasources.push(datasourceObject);
                    });
                }

                if (dataServiceParams.authorizationProvider != undefined) {
                    const params = dataServiceParams.authorizationProvider.property;
                    params.forEach(element => {
                        response.authProperties.push({ key: element.name, value: element.value });
                    });
                }
                resolve(response);
            }
        });
    }

    async applyEdit(params: ApplyEditRequest | ApplyEditsRequest): Promise<ApplyEditResponse> {
        return new Promise(async (resolve) => {
            const edit = new WorkspaceEdit();

            const getRange = (range: STRange | Range) =>
                new Range(new Position(range.start.line, range.start.character),
                    new Position(range.end.line, range.end.character));

            if ('text' in params) {
                const uri = params.documentUri;
                const file = Uri.file(uri);
                const textToInsert = params.addNewLine ? (params.text.endsWith('\n') ? params.text : `${params.text}\n`) : params.text;
                edit.replace(file, getRange(params.range), textToInsert);
            } else if ('edits' in params) {
                params.edits.forEach(editRequest => {
                    const uri = editRequest.documentUri ?? params.documentUri;
                    const file = Uri.file(uri);

                    if (editRequest.isCreateNewFile) {
                        edit.createFile(file);
                    }
                    const textToInsert = params.addNewLine ? (editRequest.newText.endsWith('\n') ? editRequest.newText : `${editRequest.newText}\n`) : editRequest.newText;
                    edit.replace(file, getRange(editRequest.range), textToInsert);
                });
            }

            await workspace.applyEdit(edit);
            const file = Uri.file(params.documentUri);
            let document = workspace.textDocuments.find(doc => doc.uri.fsPath === params.documentUri) 
                            || await workspace.openTextDocument(file);
            await document.save();

            if (!params.disableFormatting) {
                const formatEdits = (editRequest: ExtendedTextEdit) => {
                    const textToInsert = editRequest.newText.endsWith('\n') ? editRequest.newText : `${editRequest.newText}\n`;
                    const formatRange = this.getFormatRange(getRange(editRequest.range), textToInsert);
                    return this.rangeFormat({ uri: editRequest.documentUri!, range: formatRange });
                };
                if ('text' in params) {
                    await formatEdits({ range: getRange(params.range), newText: params.text, documentUri: params.documentUri });
                } else if ('edits' in params) {
                    await Promise.all(params.edits.map(editRequest => formatEdits({
                        range: getRange(editRequest.range),
                        newText: editRequest.newText,
                        documentUri: editRequest.documentUri ?? params.documentUri
                    })));
                }
            }
            if (!params.disableUndoRedo) {
                const uri = params.documentUri;
                const file = Uri.file(uri);
                let document = workspace.textDocuments.find(doc => doc.uri.fsPath === uri) || await workspace.openTextDocument(file);
                const content = document.getText();
                undoRedo.addModification(content);
            }

            resolve({ status: true });
        });
    }

    getFormatRange(range: Range, text: string): Range {
        const editSplit = text.split('\n');
        const addedLine = editSplit.length;
        const lastLineLength = editSplit[editSplit.length - 1].length;
        const formatStart = new Position(range.start.line, 0);
        const formatend = new Position(range.start.line + addedLine - 1, lastLineLength);
        const formatRange = new Range(formatStart, formatend);
        return formatRange;
    }

    async rangeFormat(req: RangeFormatRequest): Promise<ApplyEditResponse> {
        return new Promise(async (resolve) => {
            // if vscode format on save is enable do not do range format 
            const editorConfig = workspace.getConfiguration('editor');
            if (editorConfig.get('formatOnSave')) {
                resolve({ status: true });
                return;
            }
            let formattingOptions = {
                tabSize: editorConfig.get("tabSize") ?? 4,
                insertSpaces: editorConfig.get("insertSpaces") ?? false,
                trimTrailingWhitespace: editorConfig.get("trimTrailingWhitespace") ?? false
            };
            const uri = Uri.file(req.uri);
            let edits: TextEdit[];
            if (req.range) {
                edits = await commands.executeCommand("vscode.executeFormatRangeProvider", uri, req.range, formattingOptions);
            } else {
                edits = await commands.executeCommand("vscode.executeFormatDocumentProvider", uri, formattingOptions);
            }
            const workspaceEdit = new WorkspaceEdit();
            workspaceEdit.set(uri, edits);
            await workspace.applyEdit(workspaceEdit);
            resolve({ status: true });
        });
    }

    async createMessageProcessor(params: CreateMessageProcessorRequest): Promise<CreateMessageProcessorResponse> {
        return new Promise(async (resolve) => {
            let { directory, messageProcessorName, messageProcessorType, messageStoreType, failMessageStoreType,
                sourceMessageStoreType, targetMessageStoreType, processorState, dropMessageOption, quartzConfigPath,
                cron, forwardingInterval, retryInterval, maxRedeliveryAttempts, maxConnectionAttempts,
                connectionAttemptInterval, taskCount, statusCodes, clientRepository, axis2Config, endpointType,
                sequenceType, replySequenceType, faultSequenceType, deactivateSequenceType, endpoint, sequence, replySequence,
                faultSequence, deactivateSequence, samplingInterval, samplingConcurrency,
                providerClass, properties } = params;

            const getTemplateParams = {
                messageProcessorName, messageProcessorType, messageStoreType, failMessageStoreType, sourceMessageStoreType,
                targetMessageStoreType, processorState, dropMessageOption, quartzConfigPath, cron, forwardingInterval,
                retryInterval, maxRedeliveryAttempts, maxConnectionAttempts, connectionAttemptInterval, taskCount,
                statusCodes, clientRepository, axis2Config, endpointType, sequenceType, replySequenceType, faultSequenceType,
                deactivateSequenceType, endpoint, sequence, replySequence, faultSequence,
                deactivateSequence, samplingInterval, samplingConcurrency, providerClass, properties
            };

            const xmlData = getMessageProcessorXmlWrapper(getTemplateParams);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

            if (directory.includes('messageProcessors')) {
                directory = directory.replace('messageProcessors', 'message-processors');
            }
            const filePath = await this.getFilePath(directory, messageProcessorName);

            await replaceFullContentToFile(filePath, sanitizedXmlData);
            await this.rangeFormat({
                uri: filePath,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                }
            });
            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            resolve({ path: filePath });
        });
    }

    async getMessageProcessor(params: RetrieveMessageProcessorRequest): Promise<RetrieveMessageProcessorResponse> {
        const options = {
            ignoreAttributes: false,
            allowBooleanAttributes: true,
            attributeNamePrefix: "@_",
            attributesGroupName: "@_"
        };
        const parser = new XMLParser(options);

        interface Parameter {
            name: string;
            value: string;
        }

        return new Promise(async (resolve) => {
            const filePath = params.path;

            if (fs.existsSync(filePath)) {
                const xmlData = fs.readFileSync(filePath, "utf8");
                const jsonData = parser.parse(xmlData);
                let parameters: Parameter[];
                const className = jsonData.messageProcessor["@_"]["@_class"];
                let response: RetrieveMessageProcessorResponse = {
                    messageProcessorName: jsonData.messageProcessor["@_"]["@_name"],
                    messageProcessorType: '',
                    messageStoreType: jsonData.messageProcessor["@_"]["@_messageStore"],
                    failMessageStoreType: '',
                    sourceMessageStoreType: '',
                    targetMessageStoreType: '',
                    processorState: 'true',
                    dropMessageOption: 'Disabled',
                    quartzConfigPath: '',
                    cron: '',
                    forwardingInterval: 1000,
                    retryInterval: 1000,
                    maxRedeliveryAttempts: 4,
                    maxConnectionAttempts: -1,
                    connectionAttemptInterval: 1000,
                    taskCount: null,
                    statusCodes: '',
                    clientRepository: '',
                    axis2Config: '',
                    endpointType: '',
                    sequenceType: '',
                    replySequenceType: '',
                    faultSequenceType: '',
                    deactivateSequenceType: '',
                    endpoint: '',
                    sequence: '',
                    replySequence: '',
                    faultSequence: '',
                    deactivateSequence: '',
                    samplingInterval: 1000,
                    samplingConcurrency: 1,
                    providerClass: '',
                    properties: [],
                    hasCustomProperties: false
                };

                let sourceMsgStore = '';
                if (jsonData.messageProcessor["@_"]["@_messageStore"] !== undefined) {
                    sourceMsgStore = jsonData.messageProcessor["@_"]["@_messageStore"];
                }

                if (jsonData.messageProcessor["@_"]["@_targetEndpoint"] !== undefined) {
                    response.endpoint = jsonData.messageProcessor["@_"]["@_targetEndpoint"];
                }

                if (jsonData && jsonData.messageProcessor && jsonData.messageProcessor.parameter) {
                    parameters = Array.isArray(jsonData.messageProcessor.parameter)
                        ? jsonData.messageProcessor.parameter.map((param: any) => ({
                            name: param["@_"]['@_name'],
                            value: param['#text']
                        }))
                        : [{
                            name: jsonData.messageProcessor.parameter["@_"]['@_name'],
                            value: jsonData.messageProcessor.parameter['#text']
                        }];

                    const ScheduledMessageForwardingProcessor = {
                        'client.retry.interval': 'retryInterval',
                        'member.count': 'taskCount',
                        'message.processor.reply.sequence': 'replySequence',
                        'axis2.config': 'axis2Config',
                        'quartz.conf': 'quartzConfigPath',
                        'non.retry.status.codes': 'statusCodes',
                        'message.processor.deactivate.sequence': 'deactivateSequence',
                        'is.active': 'processorState',
                        'axis2.repo': 'clientRepository',
                        cronExpression: 'cron',
                        'max.delivery.attempts': 'maxRedeliveryAttempts',
                        'message.processor.fault.sequence': 'faultSequence',
                        'store.connection.retry.interval': 'connectionAttemptInterval',
                        'max.store.connection.attempts': 'maxConnectionAttempts',
                        'max.delivery.drop': 'dropMessageOption',
                        interval: 'forwardingInterval',
                        'message.processor.failMessagesStore': 'failMessageStoreType'
                    },
                        ScheduledFailoverMessageForwardingProcessor = {
                            'client.retry.interval': 'retryInterval',
                            cronExpression: 'cron',
                            'max.delivery.attempts': 'maxRedeliveryAttempts',
                            'member.count': 'taskCount',
                            'message.processor.fault.sequence': 'faultSequence',
                            'quartz.conf': 'quartzConfigPath',
                            'max.delivery.drop': 'dropMessageOption',
                            interval: 'forwardingInterval',
                            'store.connection.retry.interval': 'connectionAttemptInterval',
                            'max.store.connection.attempts': 'maxConnectionAttempts',
                            'message.processor.deactivate.sequence': 'deactivateSequence',
                            'is.active': 'processorState',
                            'message.target.store.name': 'targetMessageStoreType'
                        },
                        MessageSamplingProcessor = {
                            cronExpression: 'cron',
                            sequence: 'sequence',
                            'quartz.conf': 'quartzConfigPath',
                            interval: 'samplingInterval',
                            'is.active': 'processorState',
                            concurrency: 'samplingConcurrency',
                        };

                    const customProperties: { key: string, value: any }[] = [];
                    if (className === 'org.apache.synapse.message.processor.impl.forwarder.ScheduledMessageForwardingProcessor') {
                        response.messageProcessorType = 'Scheduled Message Forwarding Processor';
                        parameters.forEach((param: Parameter) => {
                            if (ScheduledMessageForwardingProcessor.hasOwnProperty(param.name)) {
                                response[ScheduledMessageForwardingProcessor[param.name]] = param.value;
                            } else {
                                customProperties.push({ key: param.name, value: param.value });
                            }
                        });
                        response.messageStoreType = sourceMsgStore;
                    } else if (className === 'org.apache.synapse.message.processor.impl.sampler.SamplingProcessor') {
                        response.messageProcessorType = 'Message Sampling Processor';
                        parameters.forEach((param: Parameter) => {
                            if (MessageSamplingProcessor.hasOwnProperty(param.name)) {
                                response[MessageSamplingProcessor[param.name]] = param.value;
                            } else {
                                customProperties.push({ key: param.name, value: param.value });
                            }
                        });
                    } else if (className === 'org.apache.synapse.message.processor.impl.failover.FailoverScheduledMessageForwardingProcessor') {
                        response.messageProcessorType = 'Scheduled Failover Message Forwarding Processor';
                        parameters.forEach((param: Parameter) => {
                            if (ScheduledFailoverMessageForwardingProcessor.hasOwnProperty(param.name)) {
                                response[ScheduledFailoverMessageForwardingProcessor[param.name]] = param.value;
                            } else {
                                customProperties.push({ key: param.name, value: param.value });
                            }
                        });
                        response.sourceMessageStoreType = sourceMsgStore;
                    } else {
                        response.messageProcessorType = 'Custom Message Processor';
                        response.providerClass = className;
                        response.properties = parameters.map(pair => ({ key: pair.name, value: pair.value }));
                    }

                    if (customProperties.length > 0) {
                        response.hasCustomProperties = true;
                        response.properties = customProperties;
                    }
                } else {
                    response.messageProcessorType = 'Custom Message Processor';
                    response.providerClass = className;
                }

                resolve(response);
            }
        });
    }

    closeWebView(): void {
        if (webviews.has(this.projectUri)) {
            const webview = webviews.get(this.projectUri);
            if (webview) {
                webview.dispose();
            }
        }
    }

    openFile(params: OpenDiagramRequest): void {
        if (!fs.lstatSync(params.path).isDirectory()) {
            const uri = Uri.file(params.path);
            workspace.openTextDocument(uri).then((document) => {
                const options: { viewColumn?: ViewColumn; selection?: Selection } = {};
                if (params.beside) {
                    options.viewColumn = ViewColumn.Beside;
                }
                if (params.line && params.line > 0) {
                    const pos = new Position(params.line - 1, 0);
                    options.selection = new Selection(pos, pos);
                }
                window.showTextDocument(document, options);
            });
        }
    }

    async askProjectDirPath(): Promise<ProjectDirResponse> {
        return new Promise(async (resolve) => {
            const selectedDir = await askProjectPath();
            if (!selectedDir || selectedDir.length === 0) {
                window.showErrorMessage('A folder must be selected to create project');
                resolve({ path: "" });
            } else {
                const parentDir = selectedDir[0].fsPath;
                resolve({ path: parentDir });
            }
        });
    }

    async askProjectImportDirPath(): Promise<ProjectDirResponse> {
        return new Promise(async (resolve) => {
            const selectedDir = await askImportProjectPath();
            if (!selectedDir || selectedDir.length === 0) {
                window.showErrorMessage('The root directory of the project must be selected to import project');
                resolve({ path: "" });
            } else {
                const parentDir = selectedDir[0].fsPath;
                resolve({ path: parentDir });
            }
        });
    }

    async askFileDirPath(): Promise<FileDirResponse> {
        return new Promise(async (resolve) => {
            const selectedFile = await askFilePath();
            if (!selectedFile || selectedFile.length === 0) {
                window.showErrorMessage('A folder must be selected to create project');
                resolve({ path: "" });
            } else {
                const parentDir = selectedFile[0].fsPath;
                resolve({ path: parentDir });
            }
        });
    }

    async askOpenAPIDirPath(): Promise<FileDirResponse> {
        return new Promise(async (resolve) => {
            // open file dialog to select the openapi spec file
            const options: vscode.OpenDialogOptions = {
                canSelectMany: false,
                openLabel: 'Open File',
                filters: {
                    'OpenAPI Spec': ['json', 'yaml', 'yml', 'proto']
                }
            };

            const selectedFile = await vscode.window.showOpenDialog(options);
            if (!selectedFile || selectedFile.length === 0) {
                window.showErrorMessage('A file must be selected to import connector');
                resolve({ path: "" });
            } else {
                const fileDir = selectedFile[0].fsPath;
                resolve({ path: fileDir });
            }
        });
    }

    async getEULALicense(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const licensePath = extension.context.asAbsolutePath(path.join('resources', 'MI_LICENSE.txt'));

            try {
                const licenseText = fs.readFileSync(licensePath, 'utf-8');
                resolve(licenseText);
            } catch (err) {
                vscode.window.showErrorMessage('Failed to load license file.');
                reject(err);
            }
        });
    }

    async createProject(params: CreateProjectRequest): Promise<CreateProjectResponse> {
        return new Promise(async (resolve) => {
            const projectUuid = uuidv4();
            const { directory, name, open, groupID, artifactID, version, miVersion } = params;
            const initialDependencies = compareVersions(miVersion, RUNTIME_VERSION_440) >= 0 ? generateInitialDependencies() : '';
            const artifactIdNormalized = artifactID ?? name;
            const tempName = name.replace(/\./g, '');
            const folderStructure: FileStructure = {
                [tempName]: { // Project folder
                    'pom.xml': rootPomXmlContent(name, groupID ?? "com.example", artifactIdNormalized, projectUuid, version ?? DEFAULT_PROJECT_VERSION, miVersion, initialDependencies),
                    '.env': '',
                    'src': {
                        'main': {
                            'java': '',
                            'wso2mi': {
                                'artifacts': {
                                    'apis': '',
                                    'endpoints': '',
                                    'inbound-endpoints': '',
                                    'local-entries': '',
                                    'message-processors': '',
                                    'message-stores': '',
                                    'proxy-services': '',
                                    'sequences': '',
                                    'tasks': '',
                                    'templates': '',
                                    'data-services': '',
                                    'data-sources': '',
                                },
                                'resources': {
                                    'connectors': '',
                                    'metadata': '',
                                    'conf': {
                                        'config.properties': ''
                                    },
                                },
                            },
                        },
                        'test': {
                            'wso2mi': {
                            },
                        }
                    },
                    'deployment': {
                        'docker': {
                            'Dockerfile': dockerfileContent(),
                            'resources': ''
                        },
                        'libs': '',
                    },
                },
            };

            await createFolderStructure(directory, folderStructure);
            copyDockerResources(extension.context.asAbsolutePath(path.join('resources', 'docker-resources')), path.join(directory, tempName));
            await copyMavenWrapper(extension.context.asAbsolutePath(path.join('resources', 'maven-wrapper')), path.join(directory, tempName));
            await createGitignoreFile(path.join(directory, tempName));

            if ((name !== tempName)) {
                await fs.promises.rename(path.join(directory, tempName), path.join(directory, name));
            }
            window.showInformationMessage(`Successfully created ${name} project`);
            const projectOpened = getStateMachine(this.projectUri).context().projectOpened;

            if (open) {
                if (projectOpened) {
                    const answer = await window.showWarningMessage(
                        "Do you want to open the created project in the current window or new window?",
                        { modal: true },
                        "Current Window",
                        "New Window"
                    );

                    if (answer === "Current Window") {
                        const folderUri = Uri.file(path.join(directory, name));

                        // Get the currently opened workspaces
                        const workspaceFolders = workspace.workspaceFolders || [];

                        // Check if the folder is not already part of the workspace
                        if (!workspaceFolders.some(folder => folder.uri.fsPath === folderUri.fsPath)) {
                            workspace.updateWorkspaceFolders(workspaceFolders.length, 0, { uri: folderUri });
                        }
                    } else {
                        commands.executeCommand('vscode.openFolder', Uri.file(path.join(directory, name)));
                        resolve({ filePath: path.join(directory, name) });
                    }

                } else {
                    commands.executeCommand('vscode.openFolder', Uri.file(path.join(directory, name)));
                    resolve({ filePath: path.join(directory, name) });
                }
            }
            resolve({ filePath: path.join(directory, name) });
        });
    }

    async importProject(params: ImportProjectRequest): Promise<ImportProjectResponse> {
        return new Promise(async (resolve) => {
            resolve(importCapp(params));
        });
    }

    async getESBConfigs(): Promise<ESBConfigsResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const resp = await langClient.getProjectStructure(this.projectUri);

            const ESBConfigs: string[] = [];

            for (const esbConfig of (resp.directoryMap as any).esbConfigs) {
                const config = esbConfig.name;
                ESBConfigs.push(config);
            }
            resolve({ data: ESBConfigs });
        });
    }

    async getProjectRoot(params: GetProjectRootRequest): Promise<ProjectRootResponse> {
        return new Promise(async (resolve) => {
            const fileUri = Uri.file(params.path);
            const workspaceFolder = workspace.getWorkspaceFolder(fileUri);

            if (workspaceFolder) {
                resolve({ path: workspaceFolder.uri.fsPath });
            }
            resolve({ path: "" });
        });
    }

    async getWorkspaceRoot(): Promise<ProjectRootResponse> {
        return new Promise(async (resolve) => {
            const workspaceFolders = workspace.workspaceFolders;
            if (workspaceFolders && this.projectUri) {
                const existingProject = path.basename(this.projectUri);
                const matched = workspaceFolders.find(folder => path.basename(folder.uri.fsPath) === existingProject);
                if (matched) {
                    const parentPath = path.dirname(this.projectUri);
                    resolve({ path: parentPath });
                } else {
                    resolve({ path: this.projectUri });
                }
            }
            resolve({ path: getDefaultProjectPath() });
        });
    }

    async writeContentToFile(params: WriteContentToFileRequest): Promise<WriteContentToFileResponse> {
        let status = true;
        //if file exists, overwrite if not, create new file and write content.  if successful, return true, else false
        const { content } = params;

        //get current workspace folder
        console.log('Directory path:', this.projectUri);

        const length = content.length;
        console.log('Content length:', length);
        for (let i = 0; i < length; i++) {
            //remove starting '''xml and ending '''
            content[i] = content[i].replace(/```xml/g, '');
            content[i] = content[i].replace(/```/g, '');
            //name of file is in the code somewhere in the format name="example", extract the name
            const match = content[i].match(/(name|key)="([^"]+)"/);
            if (match) {
                const name = match[2]; // get the name
                //identify type of the file from the first tag of the content
                const tagMatch = content[i].match(/<(\w+)/);
                let fileType = '';
                if (tagMatch) {
                    const tag = tagMatch[1];
                    switch (tag) {
                        case 'api':
                            fileType = 'apis';
                            break;
                        case 'endpoint':
                            fileType = 'endpoints';
                            break;
                        case 'sequence':
                            fileType = 'sequences'
                            break;
                        case 'proxy':
                            fileType = 'proxy-services';
                            break;
                        case 'inboundEndpoint':
                            fileType = 'inbound-endpoints';
                            break;
                        case 'messageStore':
                            fileType = 'message-stores';
                            break;
                        case 'messageProcessor':
                            fileType = 'message-processors';
                            break;
                        case 'task':
                            fileType = 'tasks';
                            break;
                        case 'localEntry':
                            fileType = 'local-entries';
                            break;
                        case 'template':
                            fileType = 'templates';
                            break;
                        case 'registry':
                            fileType = 'registry';
                            break;
                        case 'unit':
                            fileType = 'unit-test';
                            break;
                        default:
                            fileType = '';
                    }
                    console.log("File type - ", fileType)
                }

                const connectorMatch = content[i].match(/<(\w+\.\w+)\b/);
                if (connectorMatch) {
                    const tagParts = connectorMatch[1].split('.');
                    const connectorName = tagParts[0];
                    console.log('Connector name:', connectorName);
                    await this.fetchConnectors(connectorName, 'add');
                }

                //write the content to a file, if file exists, overwrite else create new file
                var fullPath = '';
                if (fileType === 'apis') {
                    const version = content[i].match(/<api [^>]*version="([^"]+)"/);
                    if (version) {
                        fullPath = path.join(this.projectUri, 'src', 'main', 'wso2mi', 'artifacts', fileType, path.sep, `${name}_v${version[1]}.xml`);
                    } else {
                        fullPath = path.join(this.projectUri, 'src', 'main', 'wso2mi', 'artifacts', fileType, path.sep, `${name}.xml`);
                    }
                } else if (fileType === 'unit-test') {
                    fullPath = path.join(this.projectUri, 'src', 'main', 'test', path.sep, `${name}.xml`);
                } else {
                    fullPath = path.join(this.projectUri, 'src', 'main', 'wso2mi', 'artifacts', fileType, path.sep, `${name}.xml`);
                }
                try {
                    content[i] = content[i].trimStart();
                    await replaceFullContentToFile(fullPath, content[i]);

                } catch (error) {
                    console.error('Error writing content to file:', error);
                    status = false;
                }
            }
        }

        if (status) {
            window.showInformationMessage('Content written to file successfully');
            return { status: true };
        } else {
            return { status: false };
        }


    }

    async writeMockServices(params: WriteMockServicesRequest): Promise<WriteMockServicesResponse> {
        let status = true;
        const { content, fileNames } = params;

        for (let i = 0; i < content.length; i++) {
            // Remove starting '''xml and ending '''
            content[i] = content[i].replace(/```xml/g, '');
            content[i] = content[i].replace(/```/g, '');

            let serviceName: string;

            if (fileNames && fileNames[i]) {
                // Use the provided file name
                serviceName = fileNames[i];
            } else {
                // Fallback to regex extraction for backward compatibility
                const match = content[i].match(/<service-name>\s*([^<]+)\s*<\/service-name>/);
                if (match) {
                    serviceName = match[1].trim();
                } else {
                    console.warn('Could not extract service name from content and no fileName provided at index', i, ':', content[i].substring(0, 100));
                    status = false;
                    continue;
                }
            }

            // Create full path for mock service in mock-services directory
            const fullPath = path.join(this.projectUri, 'src', 'test', 'resources', 'mock-services', `${serviceName}.xml`);

            try {
                content[i] = content[i].trimStart();
                await replaceFullContentToFile(fullPath, content[i]);
            } catch (error) {
                console.error('Error writing mock service to file:', error);
                status = false;
            }
        }

        if (status) {
            window.showInformationMessage('Mock services written to file successfully');
            return { status: true };
        } else {
            return { status: false };
        }
    }

    async handleFileWithFS(params: HandleFileRequest): Promise<HandleFileResponse> {
        const { fileName, filePath, operation, content } = params;

        if (!filePath) {
            console.error("File path is undefined");
            return { status: false, content: "File path is required" };
        }

        const isExist = fs.existsSync(filePath);

        try {
            switch (operation) {
                case 'read':
                    if (isExist) {
                        const fileContent = fs.readFileSync(filePath, "utf-8");
                        return { status: true, content: fileContent };
                    } else {
                        return { status: false, content: "File not found" };
                    }

                case 'write':
                    if (content !== undefined) {
                        await replaceFullContentToFile(filePath, content);
                        window.showInformationMessage(`Written content to ${fileName} successfully.`);
                        return { status: true, content: content };
                    } else {
                        console.error("File content is undefined");
                        return { status: false, content: "File content is required for write operation" };
                    }

                case 'delete':
                    if (isExist) {
                        fs.unlinkSync(filePath);
                        window.showInformationMessage(`Deleted ${fileName} successfully.`);
                        return { status: true, content: "File deleted successfully" };
                    } else {
                        window.showInformationMessage(`File with name ${fileName} not found.`);
                        return { status: false, content: "File not found" };
                    }

                case 'exists':
                    return { status: isExist, content: isExist ? "File exists" : "File does not exist" };

                default:
                    console.error(`Invalid file operation: ${operation}`);
                    return { status: false, content: "Invalid file operation" };
            }
        } catch (error) {
            console.error(`Error during file operation (${operation}) at ${filePath}:`, error);
            return { status: false, content: `Error during file operation: ${(error as Error).message}` };
        }
    }

    async writeIdpSchemaFileToRegistry(params: WriteIdpSchemaFileToRegistryRequest): Promise<WriteIdpSchemaFileToRegistryResponse> {
        const { fileContent, schemaName, imageOrPdf, writeToArtifactFile } = params;
        const runtimeVersion = await this.getMIVersionFromPom();
        const isRegistrySupported = compareVersions(runtimeVersion.version, RUNTIME_VERSION_440) < 0;
        //add 4.3.0 compatibility
        let folderPath = "";
        if (!isRegistrySupported) {
            folderPath = path.join(this.projectUri ?? '', 'src', 'main', 'wso2mi', 'resources', 'idp-schemas', `${schemaName}`, path.sep);
        }
        else {
            folderPath = path.join(this.projectUri ?? '', 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'idp-schemas', `${schemaName}`, path.sep);
        }
        //write the content to a file, if file exists, overwrite else create new file
        try {
            const status = await saveIdpSchemaToFile(folderPath, schemaName, fileContent, imageOrPdf);
            if (!status) {
                return { status: false };
            }
        } catch (error) {
            console.error('Error writing content to file:', error);
            return { status: false };
        }
        //write to artifcat.xml
        if (writeToArtifactFile) {
            const artifactName = "resources_idp_schemas_" + schemaName;
            const file = schemaName + ".json";
            let artifactPath = '';
            if (!isRegistrySupported) {
                artifactPath = "/_system/governance/mi-resources/idp-schemas/" + schemaName;
            }
            else {
                artifactPath = '/_system/governance/idp-schemas/' + schemaName;
            }
            await addNewEntryToArtifactXML(this.projectUri ?? "", artifactName, file, artifactPath, "application/json", false, isRegistrySupported)
        }
        return { status: true };
    }

    async getIdpSchemaFiles(): Promise<GetIdpSchemaFilesResponse> {
        const runtimeVersion = await this.getMIVersionFromPom();
        const isRegistrySupported = compareVersions(runtimeVersion.version, RUNTIME_VERSION_440) < 0;
        let schemaDirectory = "";

        if (!isRegistrySupported) {
            schemaDirectory = path.join(this.projectUri ?? '', 'src', 'main', 'wso2mi', 'resources', 'idp-schemas');
        }
        else {
            schemaDirectory = path.join(this.projectUri ?? '', 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'idp-schemas');
        }
        const schemaFiles: { fileName: string, documentUriWithFileName: string }[] = [];
        if (fs.existsSync(schemaDirectory)) {
            const items = await fs.promises.readdir(schemaDirectory, { withFileTypes: true });
            for (const item of items) {
                if (item.isDirectory()) {
                    schemaFiles.push({ fileName: item.name, documentUriWithFileName: path.join(schemaDirectory, item.name, item.name + '.json') });
                }
            }
        }
        return { schemaFiles };
    }

    async convertPdfToBase64Images(params: string): Promise<string[]> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const images = await langClient.pdfToImagesBase64(params)
            resolve(images);
        });
    }

    async readIdpSchemaFileContent(params: ReadIdpSchemaFileContentRequest): Promise<ReadIdpSchemaFileContentResponse> {
        const { filePath } = params;
        const response = {
            fileContent: '',
            base64Content: ''
        };
        try {
            if (fs.existsSync(filePath)) {
                response.fileContent = fs.readFileSync(filePath, 'utf8');
            } else {
                throw new Error(`File does not exist at path: ${filePath}`);
            }
            const folderPath = path.dirname(filePath);
            if (fs.existsSync(folderPath)) {
                const folderFiles = await fs.promises.readdir(folderPath);
                for (const file of folderFiles) {
                    const currentFilePath = path.join(folderPath, file);
                    let mimeType = '';
                    const ext = file.substring(file.lastIndexOf('.')).toLowerCase();
                    switch (ext) {
                        case '.png':
                            mimeType = 'image/png';
                            break;
                        case '.jpg':
                        case '.jpeg':
                            mimeType = 'image/jpeg';
                            break;
                        case '.gif':
                            mimeType = 'image/gif';
                            break;
                        case '.webp':
                            mimeType = 'image/webp';
                            break;
                        case '.pdf':
                            mimeType = 'application/pdf';
                            break;
                    }
                    if (mimeType) {
                        const fileContent = fs.readFileSync(currentFilePath, 'base64');
                        response.base64Content = `data:${mimeType};base64,${fileContent}`;
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('Error reading schema file content:', error);
        }
        return response;
    }

    async highlightCode(params: HighlightCodeRequest) {
        const documentUri = getStateMachine(this.projectUri).context().documentUri;
        let editor = window.visibleTextEditors.find(editor => editor.document.uri.fsPath === documentUri);
        if (!editor && params.force && documentUri) {
            const document = await workspace.openTextDocument(Uri.file(documentUri));
            editor = await window.showTextDocument(document, ViewColumn.Beside);
        }

        if (editor) {
            const range = new Range(params.range.start.line, params.range.start.character, params.range.end.line, params.range.end.character);
            editor.selection = new Selection(range.start, range.end);
            editor.revealRange(range);
        }
    }

    async getWorkspaceContext(): Promise<GetWorkspaceContextResponse> {
        const artifactDirPath = path.join(this.projectUri, 'src', 'main', 'wso2mi', 'artifacts');
        const fileContents: string[] = [];

        // Helper function to check if a file is an XML file
        const isXmlFile = (fileName: string): boolean => {
            return fileName.toLowerCase().endsWith('.xml');
        };

        // Read artifacts folders - ONLY XML files from artifacts directory
        var resourceFolders = ['apis', 'endpoints', 'inbound-endpoints', 'local-entries', 'message-processors', 'message-stores', 'proxy-services', 'sequences', 'tasks', 'templates'];
        for (const folder of resourceFolders) {
            const folderPath = path.join(artifactDirPath, folder);
            // Check if the folder exists before reading its contents
            if (fs.existsSync(folderPath)) {
                const files = await fs.promises.readdir(folderPath);

                for (const file of files) {
                    // Only process XML files
                    if (!isXmlFile(file)) {
                        continue;
                    }

                    const filePath = path.join(folderPath, file);
                    const stats = await fs.promises.stat(filePath);

                    if (stats.isFile()) {
                        try {
                            const content = await fs.promises.readFile(filePath, 'utf-8');
                            fileContents.push(content);
                        } catch (error) {
                            console.warn(`Could not read XML file: ${filePath}`, error);
                        }
                    }
                }
            }
        }

        console.log(`[getWorkspaceContext] Loaded ${fileContents.length} XML files from artifacts folder`);
        return { context: fileContents, rootPath: this.projectUri };
    }

    async getProjectUuid(): Promise<GetProjectUuidResponse> {
        const pomPath = path.join(this.projectUri, 'pom.xml');

        return new Promise((resolve, reject) => {
            fs.readFile(pomPath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    //get the part within <uuid> and <uuid> tags
                    const uuid = data.match(/<uuid>(.*?)<\/uuid>/s);
                    if (uuid) {
                        resolve({ uuid: uuid[1] });
                    } else {
                        resolve({ uuid: '' });
                    }
                }
            });
        });
    }

    async downloadConnector(params: DownloadConnectorRequest): Promise<DownloadConnectorResponse> {
        const { url } = params;
        try {
            const connectorDirectory = path.join(this.projectUri, 'src', 'main', 'wso2mi', 'resources', 'connectors');

            if (!fs.existsSync(connectorDirectory)) {
                fs.mkdirSync(connectorDirectory, { recursive: true });
            }

            // Extract the zip name from the URL
            const zipName = path.basename(url);

            const connectorPath = path.join(connectorDirectory, zipName);

            if (!fs.existsSync(connectorPath)) {
                const response = await axios.get(url, {
                    responseType: 'stream',
                    headers: {
                        'User-Agent': 'My Client'
                    }
                });

                // Create a temporary file
                const tmpobj = tmp.fileSync();
                const writer = fs.createWriteStream(tmpobj.name);

                response.data.pipe(writer);

                return new Promise((resolve, reject) => {
                    writer.on('finish', async () => {
                        writer.close();
                        // Copy the file from the temp location to the connectorPath
                        await copy(tmpobj.name, connectorPath);
                        // Remove the temporary file
                        tmpobj.removeCallback();
                        resolve({ path: connectorPath });
                    });
                    writer.on('error', reject);
                });
            }

            return new Promise((resolve, reject) => {
                resolve({ path: connectorPath });
            });
        } catch (error) {
            console.error('Error downloading connector:', error);
            throw new Error('Failed to download connector');
        }
    }

    async downloadInboundConnector(params: DownloadInboundConnectorRequest): Promise<DownloadInboundConnectorResponse> {
        const { url, isInBuilt } = params;
        try {
            const metadataDirectory = path.join(this.projectUri, 'src', 'main', 'wso2mi', 'resources', 'metadata');
            const libDirectory = path.join(this.projectUri, 'deployment', 'libs');

            if (!fs.existsSync(metadataDirectory)) {
                fs.mkdirSync(metadataDirectory, { recursive: true });
            }

            // Extract the zip name from the URL
            const zipName = path.basename(url);
            const zipPath = path.join(metadataDirectory, zipName);

            if (!fs.existsSync(zipPath)) {
                const response = await axios.get(url, {
                    responseType: 'stream',
                    headers: {
                        'User-Agent': 'My Client'
                    },
                    onDownloadProgress: (progressEvent) => {
                        const totalLength = progressEvent.total || 0;
                        if (totalLength !== 0) {
                            const progress = Math.round((progressEvent.loaded * 100) / totalLength);

                            const formatSize = (sizeInBytes: number) => {
                                const sizeInKB = sizeInBytes / 1024;
                                if (sizeInKB < 1024) {
                                    return `${Math.floor(sizeInKB)} KB`;
                                } else {
                                    return `${Math.floor(sizeInKB / 1024)} MB`;
                                }
                            };

                            // Notify the visualizer
                            RPCLayer._messengers.get(this.projectUri)?.sendNotification(
                                onDownloadProgress,
                                { type: 'webview', webviewType: VisualizerWebview.viewType },
                                {
                                    percentage: progress,
                                    downloadedAmount: formatSize(progressEvent.loaded),
                                    downloadSize: formatSize(totalLength)
                                }
                            );
                        }
                    }
                });

                // Create a temporary file
                const tmpobj = tmp.fileSync();
                const writer = fs.createWriteStream(tmpobj.name);

                response.data.pipe(writer);

                return new Promise((resolve, reject) => {
                    writer.on('finish', async () => {
                        writer.close();
                        // Copy the file from the temp location to the metadata folder
                        await copy(tmpobj.name, zipPath);
                        tmpobj.removeCallback();

                        // Extract the ZIP file
                        const zip = new AdmZip(zipPath);
                        const extractPath = path.join(metadataDirectory, '_extracted');

                        if (fs.existsSync(extractPath)) {
                            fs.rmSync(extractPath, { recursive: true });
                        }

                        zip.extractAllTo(extractPath, true);

                        const zipNameWithoutExtension = path.basename(zipName, '.zip');

                        if (!isInBuilt) {
                            // Copy the jar file to libs
                            const jarFileName = `${zipNameWithoutExtension}.jar`;
                            const jarPath = path.join(extractPath, zipNameWithoutExtension, jarFileName);
                            const destinationPath = path.join(libDirectory, jarFileName);
                            if (fs.existsSync(jarPath)) {
                                await copy(jarPath, destinationPath);
                            } else {
                                console.log(`Jar file does not exist at path: ${jarPath}`);
                            }
                        }

                        // Retrieve uiSchema
                        const uischemaPath = path.join(extractPath, zipNameWithoutExtension, 'resources', 'uischema.json');
                        fs.readFile(uischemaPath, 'utf8', async (err, data) => {
                            if (err) {
                                reject(err);
                            } else {
                                try {
                                    const uischema = JSON.parse(data);

                                    // Delete zip and extracted folder
                                    await remove(extractPath);
                                    await remove(zipPath);
                                    resolve({ uischema });
                                } catch (parseError) {
                                    reject(parseError); // Handle JSON parsing error
                                }
                            }
                        });
                    });
                    writer.on('error', reject);
                });
            }

            return new Promise((resolve, reject) => {
                resolve({ uischema: '' });
            });
        } catch (error) {
            console.error('Error downloading connector:', error);
            throw new Error('Failed to download connector');
        }
    }

    async copyConnectorZip(params: CopyConnectorZipRequest): Promise<CopyConnectorZipResponse> {
        const { connectorPath } = params;
        try {
            const connectorDirectory = path.join(this.projectUri, 'src', 'main', 'wso2mi', 'resources', 'connectors');

            if (!fs.existsSync(connectorDirectory)) {
                fs.mkdirSync(connectorDirectory, { recursive: true });
            }

            const destinationPath = path.join(connectorDirectory, path.basename(connectorPath));

            if (fs.existsSync(destinationPath)) {
                fs.unlinkSync(destinationPath); // Delete the existing file
            }

            await fs.promises.copyFile(connectorPath, destinationPath);


            return new Promise((resolve, reject) => {
                resolve({ success: true, connectorPath: destinationPath });
            });
        } catch (error) {
            console.error('Error downloading connector:', error);
            throw new Error('Failed to download connector');
        }
    }

    async askImportFileDir(): Promise<FileDirResponse> {
        return new Promise(async (resolve) => {
            const selectedFile = await askImportFileDir();
            if (!selectedFile || selectedFile.length === 0) {
                window.showErrorMessage('A file must be selected to import a artifact');
                resolve({ path: "" });
            } else {
                const parentDir = selectedFile[0].fsPath;
                resolve({ path: parentDir });
            }
        });
    }

    async copyArtifact(params: CopyArtifactRequest): Promise<CopyArtifactResponse> {
        try {
            const destinationDirectory = path.join(this.projectUri, 'src', 'main', 'wso2mi', 'artifacts', params.artifactFolder);
            // Determine the destination file name
            let desFileName = path.basename(params.sourceFilePath);
            // If desFileName does nto contain .xml, append .xml
            if (desFileName && !['.xml', '.dbs'].some(ext => desFileName.endsWith(ext))) {
                desFileName += '.xml';
            }
            const destinationFilePath = path.join(destinationDirectory, desFileName);

            // Ensure the destination directory exists
            await fs.promises.mkdir(destinationDirectory, { recursive: true });

            // Check if the destination file already exists
            if (fs.existsSync(destinationFilePath)) {
                return { success: false, error: 'File already exists' };
            }

            // Copy the file from the source to the destination
            const sourceFilePath = params.sourceFilePath; // Assuming this is provided in params
            await fs.promises.copyFile(sourceFilePath, destinationFilePath);
            if (params.artifactType === "API") {
                await generateSwagger(destinationFilePath);
            }
            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            return { success: true }; // Return success response
        } catch (error) {
            console.error('Error copying artifact:', error);
            return { success: false, error: error?.toString() as string };
        }
    }

    async getConnectorForm(params: GetConnectorFormRequest): Promise<GetConnectorFormResponse> {
        const { uiSchemaPath, operation } = params;
        const operationSchema = path.join(uiSchemaPath, `${operation}.json`);

        if (!fs.existsSync(operationSchema)) {
            return { formJSON: '' };
        }

        const rawData = fs.readFileSync(operationSchema, 'utf-8');
        const formJSON = JSON.parse(rawData);

        return { formJSON: formJSON };
    }

    async getConnectionForm(params: GetConnectionFormRequest): Promise<GetConnectionFormResponse> {
        const { uiSchemaPath } = params;

        if (!fs.existsSync(uiSchemaPath)) {
            return { formJSON: '' };
        }

        const rawData = fs.readFileSync(uiSchemaPath, 'utf-8');
        const formJSON = JSON.parse(rawData);

        return { formJSON: formJSON };
    }

    undo(params: UndoRedoParams): Promise<boolean> {
        return new Promise((resolve) => {
            const lastsource = undoRedo.undo();
            if (lastsource) {
                fs.writeFileSync(params.path, lastsource);
                return resolve(true);
            }
            return resolve(false);
        });
    }

    redo(params: UndoRedoParams): Promise<boolean> {
        return new Promise((resolve) => {
            const lastsource = undoRedo.redo();
            if (lastsource) {
                fs.writeFileSync(params.path, lastsource);
                return resolve(true);
            }
            return resolve(false);
        });
    }

    async initUndoRedoManager(params: UndoRedoParams): Promise<void> {
        let document = workspace.textDocuments.find(doc => doc.uri.fsPath === params.path);

        if (!document) {
            document = await workspace.openTextDocument(Uri.file(params.path));
        }

        if (document) {
            // Access the content of the document
            const content = document.getText();
            undoRedo.updateContent(params.path, content);
        }
    }

    async getDefinition(params: GetDefinitionRequest): Promise<GetDefinitionResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const definition = await langClient.getDefinition(params);

            resolve(definition);
        });
    }

    async getTextAtRange(params: GetTextAtRangeRequest): Promise<GetTextAtRangeResponse> {
        return new Promise(async (resolve) => {
            const document = workspace.textDocuments.find(doc => doc.uri.fsPath === params.documentUri);
            const range = params.range;
            if (document) {
                const text = document.getText(new Range(
                    range.start.line, range.start.character, range.end.line, range.end.character));
                resolve({ text: text });
            } else {
                resolve({ text: '' });
            }
        });
    }

    async getDiagnostics(params: GetDiagnosticsReqeust): Promise<GetDiagnosticsResponse> {
        return (await MILanguageClient.getInstance(this.projectUri)).getDiagnostics(params);
    }

    async getAvailableResources(params: GetAvailableResourcesRequest): Promise<GetAvailableResourcesResponse> {

        if (params.isDebugFlow) {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const responses = await Promise.all(
                DebuggerConfig.getProjectList().map(async projectPath =>
                    langClient.getAvailableResources({ 
                        documentIdentifier: projectPath, 
                        resourceType: params.resourceType, 
                        isDebugFlow: params.isDebugFlow 
                    })
                )
            );
            return {
                resources: responses.flatMap(r => r?.resources ?? []),
                registryResources: responses.flatMap(r => r?.registryResources ?? [])
            };
        } else {
            return (await MILanguageClient.getInstance(this.projectUri)).getAvailableResources(params);
        }
    }

    async browseFile(params: BrowseFileRequest): Promise<BrowseFileResponse> {
        return new Promise(async (resolve) => {
            const selectedFile = await window.showOpenDialog({
                canSelectFiles: params.canSelectFiles,
                canSelectFolders: params.canSelectFolders,
                canSelectMany: params.canSelectMany,
                filters: params.filters,
                defaultUri: params.defaultUri ? Uri.file(params.defaultUri) : Uri.file(os.homedir()),
                title: params.title,
                ...params.openLabel && { openLabel: params.openLabel },
            });
            if (selectedFile) {
                resolve({ filePath: selectedFile[0].fsPath });
            }
        });
    }

    async createRegistryResource(params: CreateRegistryResourceRequest): Promise<CreateRegistryResourceResponse> {
        return new Promise(async (resolve) => {
            const artifactNamePrefix = params.registryRoot === '' ? 'resources/' : params.registryRoot + '/';
            let artifactName;
            const runtimeVersion = await this.getMIVersionFromPom();
            if (params.createOption === "import" || compareVersions(runtimeVersion.version, '4.4.0') >= 0) {
                artifactName = (artifactNamePrefix + params.registryPath).replace(new RegExp('/', 'g'), "_").replace(/_+/g, '_');
            } else {
                artifactName = params.artifactName;
            }

            let projectDir = params.projectDirectory;
            const fileUri = Uri.file(params.projectDirectory);
            const workspaceFolder = workspace.getWorkspaceFolder(fileUri);
            if (workspaceFolder) {
                params.projectDirectory = workspaceFolder?.uri.fsPath;
                if (params.registryRoot === '') {
                    projectDir = path.join(workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources');
                } else {
                    projectDir = path.join(workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'registry');
                }
            }
            const getTransformedRegistryRoot = (registryRoot: string) => {
                if (registryRoot === '') {
                    return "/_system/governance/mi-resources";
                } else if (registryRoot === 'gov') {
                    return "/_system/governance";
                } else {
                    return "/_system/config";
                }
            }
            let registryDir = path.join(projectDir, params.registryRoot);
            let transformedPath = getTransformedRegistryRoot(params.registryRoot);;
            if (params.createOption === "import") {
                if (fs.existsSync(params.filePath)) {
                    const fileName = path.basename(params.filePath);
                    artifactName = artifactName + "_" + fileName;
                    artifactName = artifactName.replace(/\./g, '_');

                    const registryPath = path.join(registryDir, params.registryPath);
                    const destPath = path.join(registryPath, fileName);
                    if (!fs.existsSync(registryPath)) {
                        fs.mkdirSync(registryPath, { recursive: true });
                    }
                    if (fs.statSync(params.filePath).isDirectory()) {
                        fs.cpSync(params.filePath, destPath, { recursive: true });
                        transformedPath = path.join(transformedPath, params.registryPath, fileName);
                        transformedPath = transformedPath.split(path.sep).join("/");
                        createMetadataFilesForRegistryCollection(destPath, transformedPath);
                        addNewEntryToArtifactXML(params.projectDirectory, artifactName, fileName, transformedPath, "", true, params.registryRoot !== "");
                    } else {
                        fs.copyFileSync(params.filePath, destPath);
                        transformedPath = path.join(transformedPath, params.registryPath);
                        transformedPath = transformedPath.split(path.sep).join("/");
                        const mediaType = await detectMediaType(params.filePath);
                        addNewEntryToArtifactXML(params.projectDirectory, artifactName, fileName, transformedPath, mediaType, false, params.registryRoot !== "");
                    }
                    commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                    resolve({ path: destPath });
                }
            } else if (params.createOption === 'entryOnly') {
                let fileName = params.resourceName;
                const fileData = getMediatypeAndFileExtension(params.templateType);
                fileName = fileName + "." + fileData.fileExtension;
                if (compareVersions(runtimeVersion.version, '4.4.0') >= 0) {
                    artifactName = artifactName + '_' + params.resourceName + '_' + fileData.fileExtension;
                }
                const registryPath = path.join(registryDir, params.registryPath);
                const destPath = path.join(registryPath, fileName);
                if (!fs.existsSync(registryPath)) {
                    fs.mkdirSync(registryPath, { recursive: true });
                }
                //add the new entry to artifact.xml
                transformedPath = path.join(transformedPath, params.registryPath);
                transformedPath = transformedPath.split(path.sep).join("/");
                addNewEntryToArtifactXML(params.projectDirectory, artifactName, fileName, transformedPath, fileData.mediaType, false, params.registryRoot !== "");
                resolve({ path: destPath });

            } else {
                let fileName = params.resourceName;
                const fileData = getMediatypeAndFileExtension(params.templateType);
                fileName = fileName + "." + fileData.fileExtension;
                if (compareVersions(runtimeVersion.version, '4.4.0') >= 0) {
                    artifactName = artifactName + '_' + params.resourceName + '_' + fileData.fileExtension;
                }
                let fileContent = params.content ? params.content : getRegistryResourceContent(params.templateType, params.resourceName, params.roles);
                const registryPath = path.join(registryDir, params.registryPath);
                const destPath = path.join(registryPath, fileName);
                if (!fs.existsSync(registryPath)) {
                    fs.mkdirSync(registryPath, { recursive: true });
                }
                fs.writeFileSync(destPath, fileContent ? fileContent : "");
                //add the new entry to artifact.xml
                transformedPath = path.join(transformedPath, params.registryPath);
                transformedPath = transformedPath.split(path.sep).join("/");
                addNewEntryToArtifactXML(params.projectDirectory, artifactName, fileName, transformedPath, fileData.mediaType, false, params.registryRoot !== "");
                commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                resolve({ path: destPath });
            }
        });
    }

    async getMetadataOfRegistryResource(params: GetRegistryMetadataRequest): Promise<GetRegistryMetadataResponse> {
        return new Promise(async (resolve) => {
            resolve({ metadata: getRegistryResourceMetadata(params.projectDirectory) });
        });
    }

    async updateRegistryMetadata(params: UpdateRegistryMetadataRequest): Promise<UpdateRegistryMetadataResponse> {
        return new Promise(async (resolve) => {
            let message = updateRegistryResourceMetadata(params);
            window.showInformationMessage(message);
            resolve({ message: message });
        });
    }

    async createClassMediator(params: CreateClassMediatorRequest): Promise<CreateClassMediatorResponse> {
        return new Promise(async (resolve) => {
            const content = getClassMediatorContent({ name: params.className, package: params.packageName });
            const packagePath = params.packageName.replace(/\./g, path.sep);
            const fullPath = path.join(params.projectDirectory, packagePath);
            fs.mkdirSync(fullPath, { recursive: true });
            const filePath = path.join(fullPath, `${params.className}.java`);
            await replaceFullContentToFile(filePath, content);
            const classMediator = await vscode.workspace.openTextDocument(filePath);
            await classMediator.save();
            await updatePomForClassMediator(this.projectUri);
            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            resolve({ path: filePath });
        });
    }

    async createBallerinaModule(params: CreateBallerinaModuleRequest): Promise<CreateBallerinaModuleResponse> {
        return new Promise(async (resolve) => {
            const content = getBallerinaModuleContent();
            const configContent = getBallerinaConfigContent({ name: params.moduleName, version: params.version });
            const fullPath = path.join(params.projectDirectory, params.moduleName);
            fs.mkdirSync(fullPath, { recursive: true });
            const filePath = path.join(fullPath, `${params.moduleName}-module.bal`);
            await replaceFullContentToFile(filePath, content);
            const balFile = await vscode.workspace.openTextDocument(filePath);
            await balFile.save();
            const configFilePath = path.join(fullPath, "Ballerina.toml");
            await replaceFullContentToFile(configFilePath, configContent);
            const configFile = await vscode.workspace.openTextDocument(configFilePath);
            await configFile.save();
            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            resolve({ path: filePath });
        });
    }

    async configureKubernetes(params: ConfigureKubernetesRequest): Promise<ConfigureKubernetesResponse> {
        return new Promise(async (resolve) => {
            const hasEnvValues = params.envValues && params.envValues.length > 0;
            const hasPorts = params.ports && params.ports.length > 0;
            const k8Configuration = getKubernetesConfiguration({ name: params.name, replicas: params.replicas, targetImage: params.targetImage, ports: params.ports, hasEnvValues: hasEnvValues, hasPorts: hasPorts });
            const k8Path = path.join(this.projectUri, 'deployment', 'kubernetes');
            fs.mkdirSync(k8Path, { recursive: true });
            const configFilePath = path.join(k8Path, 'integration_k8s.yaml');
            await replaceFullContentToFile(configFilePath, k8Configuration);
            const configFile = await vscode.workspace.openTextDocument(configFilePath);
            await configFile.save();
            if (hasEnvValues) {
                const envConfiguration = getKubernetesDataConfiguration(params.envValues);
                const envDataFilePath = path.join(k8Path, "integration_data.yaml");
                await replaceFullContentToFile(envDataFilePath, envConfiguration);
                const envDataFile = await vscode.workspace.openTextDocument(envDataFilePath);
                await envDataFile.save();
            }
            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            resolve({ path: k8Path });
        });
    }

    isKubernetesConfigured(): Promise<boolean> {
        return new Promise(async (resolve) => {
            const configFilePath = path.join(this.projectUri, 'deployment', 'kubernetes', 'integration_k8s.yaml');
            if (fs.existsSync(configFilePath)) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    }

    async getSelectiveWorkspaceContext(): Promise<GetSelectiveWorkspaceContextResponse> {
        var currentFile = getStateMachine(this.projectUri).context().documentUri;
        //get the current file's content
        let currentFileContent = '';
        if (currentFile && !fs.lstatSync(currentFile).isDirectory()) {
            currentFileContent = fs.readFileSync(currentFile, 'utf8');
        }
        const artifactDirPath = path.join(this.projectUri, 'src', 'main', 'wso2mi', 'artifacts');
        const fileContents: string[] = [];
        fileContents.push(currentFileContent);

        // Helper function to check if a file is an XML file
        const isXmlFile = (fileName: string): boolean => {
            return fileName.toLowerCase().endsWith('.xml');
        };

        var resourceFolders = ['apis', 'endpoints', 'inbound-endpoints', 'local-entries', 'message-processors', 'message-stores', 'proxy-services', 'sequences', 'tasks', 'templates'];
        for (const folder of resourceFolders) {
            const folderPath = path.join(artifactDirPath, folder);
            // Check if the folder exists before reading its contents
            if (fs.existsSync(folderPath)) {
                const files = await fs.promises.readdir(folderPath);

                for (const file of files) {
                    // Only process XML files
                    if (!isXmlFile(file)) {
                        continue;
                    }

                    const filePath = path.join(folderPath, file);
                    if (filePath === currentFile) {
                        continue;
                    }
                    const stats = await fs.promises.stat(filePath);

                    if (stats.isFile()) {
                        try {
                            const content = await fs.promises.readFile(filePath, 'utf-8');
                            fileContents.push(content);
                        } catch (error) {
                            console.warn(`Could not read XML file: ${filePath}`, error);
                        }
                    }
                }
            }
        }

        return { context: fileContents, rootPath: this.projectUri };
    }

    async getBackendRootUrl(): Promise<GetBackendRootUrlResponse> {
        const MI_COPILOT_BACKEND_V2 = process.env.MI_COPILOT_BACKEND_V2 as string;
        const MI_COPILOT_BACKEND_V3 = process.env.MI_COPILOT_BACKEND_V3 as string;
        const RUNTIME_THRESHOLD_VERSION = RUNTIME_VERSION_440;
        const runtimeVersion = await getMIVersionFromPom(this.projectUri);

        const versionThreshold = runtimeVersion ? compareVersions(runtimeVersion, RUNTIME_THRESHOLD_VERSION) : -1;

        return versionThreshold < 0 ? { url: MI_COPILOT_BACKEND_V2 } : { url: MI_COPILOT_BACKEND_V3 };
    }

    async getProxyRootUrl(): Promise<GetProxyRootUrlResponse> {
        const llmBaseUrl = getCopilotLlmApiBaseUrl();
        const anthropicUrl = llmBaseUrl || process.env.MI_COPILOT_ANTHROPIC_PROXY_URL as string;
        return { anthropicUrl };
    }

    async getAvailableRegistryResources(params: ListRegistryArtifactsRequest): Promise<RegistryArtifactNamesResponse> {
        return new Promise(async (resolve) => {
            const response = await getAvailableRegistryResources(this.projectUri);
            const artifacts = response.artifacts;
            var tempArtifactNames: string[] = [];
            for (let i = 0; i < artifacts.length; i++) {
                tempArtifactNames.push(artifacts[i].name);
            }
            let artifactsWithAdditionalData: RegistryArtifact[] = [];
            if (params.withAdditionalData) {
                artifactsWithAdditionalData = response.artifacts;
            }
            resolve({ artifacts: tempArtifactNames, artifactsWithAdditionalData });
        });
    }

    async migrateProject({ dir, sources }: MigrateProjectRequest): Promise<MigrateProjectResponse> {
        return new Promise(async (resolve) => {
            if (sources) {
                const importList = sources.map(source => ({ source, directory: dir, open: false }));
                const createdProjects = await importProjects(importList);
                const filePaths = createdProjects.map(project => project.filePath);
                resolve({ filePaths });
            }
        });
    }

    async getAvailableConnectors(params: GetAvailableConnectorRequest): Promise<GetAvailableConnectorResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.getAvailableConnectors({
                documentUri: params.documentUri,
                connectorName: params.connectorName
            });

            resolve(res);
        });
    }

    async updateConnectors(params: UpdateConnectorRequest): Promise<void> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.updateConnectors({
                documentUri: params.documentUri
            });

            resolve(res);
        })
    }

    async removeConnector(params: RemoveConnectorRequest): Promise<RemoveConnectorResponse> {
        const { connectorPath } = params;
        return new Promise((resolve, reject) => {
            try {
                if (fs.existsSync(connectorPath)) {
                    fs.unlink(connectorPath, (err) => {
                        if (err) {
                            reject(`Failed to delete the zip file at ${connectorPath}: ${err.message}`);
                        } else {
                            resolve({ success: true }); // Successfully deleted the file
                        }
                    });
                } else {
                    reject(`Zip file at ${connectorPath} does not exist.`);
                }
            } catch (error) {
                console.log("Error removing connector", error);
                reject("Failed to remove connector.");
            }
        });
    }

    async getStoreConnectorJSON(miVersion?: string): Promise<StoreConnectorJsonResponse> {
        try {
            const runtimeVersion = miVersion ?? await getMIVersionFromPom(this.projectUri);
            if (runtimeVersion) {
                const connectors = compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0
                    ? connectorCache : legacyConnectorCache;

                if (connectors.has('inbound-connector-data') && connectors.has('outbound-connector-data') && connectors.has('connectors')) {
                    return {
                        inboundConnectors: connectors.get('inbound-connector-data'),
                        outboundConnectors: connectors.get('outbound-connector-data'),
                        connectors: connectors.get('connectors'),
                    };
                }
            }

            const response = await fetch(APIS.MI_CONNECTOR_STORE);
            const connectorStoreResponse = await fetch(
                APIS.MI_CONNECTOR_STORE_BACKEND.replace('${version}', runtimeVersion ?? '')
            );

            const data = await response.json();
            const connectorStoreData = await connectorStoreResponse.json();

            if (data && data['inbound-connector-data'] && data['outbound-connector-data']) {
                if (runtimeVersion) {
                    if (compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0) {
                        connectorCache.set('inbound-connector-data', data['inbound-connector-data']);
                        connectorCache.set('outbound-connector-data', data['outbound-connector-data']);
                        if (connectorStoreData) {
                            connectorCache.set('connectors', connectorStoreData);
                        }
                    } else {
                        legacyConnectorCache.set('inbound-connector-data', data['inbound-connector-data']);
                        legacyConnectorCache.set('outbound-connector-data', data['outbound-connector-data']);
                        if (connectorStoreData) {
                            legacyConnectorCache.set('connectors', connectorStoreData);
                        }
                    }
                }

                return {
                    inboundConnectors: data['inbound-connector-data'],
                    outboundConnectors: data['outbound-connector-data'],
                    connectors: connectorStoreData,
                };
            } else {
                console.log("Failed to fetch connectors. Status: " + data.status + ", Reason: " + data.reason);
                throw new Error("Failed to fetch connectors.");
            }
        } catch (error) {
            console.log("User is offline.", error);
            throw new Error("Failed to fetch connectors.");
        }
    }

    async getConnectorIcon(params: GetConnectorIconRequest): Promise<GetConnectorIconResponse> {
        return new Promise(async (resolve) => {
            const runtimeVersion = await getMIVersionFromPom(this.projectUri);
            let iconCache;
            if (runtimeVersion) {
                iconCache = compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0 ?
                    connectorCache.get('connector-icon-data') : legacyConnectorCache.get('connector-icon-data');
            }

            if (iconCache && iconCache.hasOwnProperty(params.connectorName) && iconCache[params.connectorName]) {
                resolve({ iconPath: iconCache[params.connectorName] });
            } else {
                const connectorData = await this.getAvailableConnectors({
                    documentUri: params.documentUri,
                    connectorName: params.connectorName
                });

                let connectorIcon = DEFAULT_ICON;
                if (connectorData.iconPath) {
                    const iconPath = await this.getIconPathUri({
                        path: connectorData.iconPath,
                        name: "icon-small"
                    });
                    connectorIcon = iconPath.uri;
                }

                // Get the latest cache state before updating
                let latestIconCache;
                if (runtimeVersion) {
                    if (compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0) {
                        latestIconCache = connectorCache.get('connector-icon-data') || {};
                        connectorCache.set('connector-icon-data', {
                            ...latestIconCache,
                            [params.connectorName]: connectorIcon
                        });
                    } else {
                        latestIconCache = legacyConnectorCache.get('connector-icon-data') || {};
                        legacyConnectorCache.set('connector-icon-data', {
                            ...latestIconCache,
                            [params.connectorName]: connectorIcon
                        });
                    }
                }

                resolve({ iconPath: connectorIcon });
            }
        });
    }

    async saveInboundEPUischema(params: SaveInboundEPUischemaRequest): Promise<boolean> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.saveInboundEPUischema({
                connectorName: params.connectorName,
                uiSchema: params.uiSchema
            });

            resolve(res);
        });
    }

    async getInboundEPUischema(params: GetInboundEPUischemaRequest): Promise<GetInboundEPUischemaResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.getInboundEPUischema({
                connectorName: params.connectorName,
                documentPath: params.documentPath
            });
            resolve(res);
        });
    }

    async createDataSource(params: DataSourceTemplate): Promise<CreateDataSourceResponse> {
        return new Promise(async (resolve) => {
            const xmlData = await getDataSourceXml(params);
            const sanitizedXmlData = xmlData.replace(/^\s*[\r\n]/gm, '');

            let directory = params.projectDirectory;
            if (directory.includes('dataSources')) {
                directory = directory.replace('dataSources', 'data-sources');
            }
            const filePath = await this.getFilePath(directory, params.name);

            await replaceFullContentToFile(filePath, sanitizedXmlData);
            await this.rangeFormat({
                uri: filePath,
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: sanitizedXmlData.split('\n').length + 1, character: 0 }
                }
            });
            commands.executeCommand(COMMANDS.REFRESH_COMMAND);
            resolve({ path: filePath });
        });
    }

    async getDataSource(params: GetDataSourceRequest): Promise<DataSourceTemplate> {
        const options = {
            ignoreAttributes: false,
            allowBooleanAttributes: true,
            attributeNamePrefix: "@",
        };
        const parser = new XMLParser(options);
        return new Promise(async (resolve) => {
            const filePath = params.path;
            if (filePath.includes('.xml') && fs.existsSync(filePath)) {
                const xmlData = fs.readFileSync(filePath, "utf8");
                const jsonData = parser.parse(xmlData);
                var response: DataSourceTemplate = {
                    projectDirectory: filePath,
                    type: jsonData.datasource.definition['@type'] === 'RDBMS' ? 'RDBMS' : 'Custom',
                    name: jsonData.datasource.name,
                    description: jsonData.datasource.description ?? '',
                };
                if (jsonData.datasource.definition['@type'] === 'RDBMS') {
                    if (jsonData.datasource.definition.configuration) {
                        response.driverClassName = jsonData.datasource.definition.configuration.driverClassName ?? '';
                        response.url = jsonData.datasource.definition.configuration.url ?? '';
                        response.driverClassName = jsonData.datasource.definition.configuration.driverClassName ?? '';
                        response.username = jsonData.datasource.definition.configuration.username ?? '';
                        response.password = jsonData.datasource.definition.configuration.password ?? '';
                        const params: { [key: string]: string | number | boolean } = {};
                        if (jsonData.datasource.definition.configuration) {
                            Object.entries(jsonData.datasource.definition.configuration).forEach(([key, value]) => {
                                params[key] = value as string | number | boolean;
                            });
                        }
                        // remove duplicates
                        delete params.driverClassName;
                        delete params.url;
                        delete params.username;
                        delete params.password;
                        delete params.dataSourceClassName;
                        delete params.dataSourceProps;
                        response.dataSourceConfigParameters = params;
                    }
                    if (jsonData.datasource.jndiConfig) {
                        response.jndiConfig = {
                            JNDIConfigName: jsonData.datasource.jndiConfig.name,
                            useDataSourceFactory: jsonData.datasource.jndiConfig['@useDataSourceFactory'],
                        };
                        if (jsonData.datasource.jndiConfig.environment) {
                            const params: { [key: string]: string | number | boolean } = {};
                            const jndiPropertiesData = jsonData.datasource.jndiConfig.environment.property;
                            const jndiProperties = Array.isArray(jndiPropertiesData) ? jndiPropertiesData : [jndiPropertiesData];
                            jndiProperties.forEach((item) => {
                                const key = item['@name'].toString();
                                const val = item['#text'];
                                params[key] = val;
                            });
                            response.jndiConfig.properties = params;
                        }
                    }
                    if (jsonData.datasource.definition.configuration.dataSourceClassName) {
                        response.externalDSClassName = jsonData.datasource.definition.configuration.dataSourceClassName;
                        if (jsonData.datasource.definition.configuration.dataSourceProps.property) {
                            const params: { [key: string]: string | number | boolean } = {};
                            const dsPropertiesData = jsonData.datasource.definition.configuration.dataSourceProps.property;
                            const dsProperties = Array.isArray(dsPropertiesData) ? dsPropertiesData : [dsPropertiesData];
                            dsProperties.forEach((item) => {
                                const key = item['@name'].toString();
                                const val = item['#text'];
                                params[key] = val;
                            });
                            response.dataSourceProperties = params;
                        }
                    }
                }
                if (jsonData.datasource.definition['@type'] !== 'RDBMS') {
                    response.customDSType = jsonData.datasource.definition['@type'];
                    response.customDSConfiguration = jsonData.datasource.definition['#text'];
                }
                return resolve(response);
            }
            resolve(Promise.reject(new Error('Invalid data source')));
        });
    }

    async askDriverPath(): Promise<ProjectDirResponse> {
        return new Promise(async (resolve) => {
            const selectedDriverPath = await askDriverPath();
            if (!selectedDriverPath || selectedDriverPath.length === 0) {
                window.showErrorMessage('A file must be selected as the driver');
                resolve({ path: "" });
            } else {
                const parentDir = selectedDriverPath[0].fsPath;
                resolve({ path: parentDir });
            }
        });
    }

    async addDriverToLib(params: AddDriverToLibRequest): Promise<AddDriverToLibResponse> {
        const { url } = params;
        // Copy the file from url to the lib directory
        try {
            const libDirectory = path.join(this.projectUri, 'deployment', 'libs');

            // Ensure the lib directory exists
            if (!fs.existsSync(libDirectory)) {
                fs.mkdirSync(libDirectory, { recursive: true });
            }

            // Get the file name from the URL
            const fileName = path.basename(url);
            const destinationPath = path.join(libDirectory, fileName);

            // Copy the file
            await fs.promises.copyFile(url, destinationPath);

            return { path: destinationPath };

        } catch (error) {
            console.error('Error adding driver', error);
            throw new Error('Failed to add driver');
        }
    }

    async deleteDriverFromLib(params: AddDriverToLibRequest): Promise<void> {
        const libDirectory = path.join(this.projectUri, 'deployment', 'libs');
        const fileName = path.basename(params.url);
        const filePath = path.join(libDirectory, fileName);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (error) {
                console.error(`Error deleting the file at ${filePath}:`, error);
            }
        } else {
            console.error(`File not found at ${filePath}`);
        }
    }

    async getIconPathUri(params: GetIconPathUriRequest): Promise<GetIconPathUriResponse> {
        return new Promise(async (resolve, reject) => {
            if (webviews.has(this.projectUri)) {
                const webview = webviews.get(this.projectUri);
                if (webview) {
                    const iconUri = webview.getIconPath(params.path, params.name);
                    resolve({ uri: iconUri });
                } else {
                    reject(new Error('Webview not found'));
                }
            }
        });
    }

    async getUserAccessToken(): Promise<GetUserAccessTokenResponse> {
        const [token, loginMethod] = await Promise.all([
            getCopilotAccessToken(),
            getCopilotLoginMethod(),
        ]);

        if (!token || loginMethod !== LoginMethod.MI_INTEL) {
            throw new Error('User access token not found');
        }

        return { token };
    }

    async createConnection(params: CreateConnectionRequest): Promise<CreateConnectionResponse> {
        return new Promise(async (resolve) => {
            const { connectionName, keyValuesXML, directory } = params;
            const localEntryPath = directory;

            const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
${keyValuesXML}`;

            const filePath = params?.filePath?.length ? params.filePath : path.join(localEntryPath, `${connectionName}.xml`);
            if (!fs.existsSync(localEntryPath)) {
                fs.mkdirSync(localEntryPath);
            }

            await replaceFullContentToFile(filePath, xmlData);
            resolve({ name: connectionName });
        });
    }

    async getConnectorConnections(params: GetConnectorConnectionsRequest): Promise<GetConnectorConnectionsResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.getConnectorConnections({
                documentUri: params.documentUri,
                connectorName: params.connectorName
            });

            resolve(res);
        });
    }

    async logoutFromMIAccount(): Promise<void> {
        const confirm = await vscode.window.showWarningMessage(
            'Are you sure you want to logout?',
            { modal: true },
            'Yes'
        );
        if (confirm === 'Yes') {
            await logoutFromCopilot();
            StateMachineAI.sendEvent(AI_EVENT_TYPE.LOGOUT);
        } else {
            return;
        }
    }

    async getAllRegistryPaths(params: GetAllRegistryPathsRequest): Promise<GetAllRegistryPathsResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.getRegistryFiles(params.path);
            resolve({ registryPaths: res.map(element => element.split(path.sep).join("/")) });
        });
    }

    async getAllResourcePaths(): Promise<GetAllResourcePathsResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.getResourceFiles();
            resolve({ resourcePaths: res });
        });
    }

    async getConfigurableEntries(): Promise<GetConfigurableEntriesResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.getConfigurableEntries();
            resolve({ configurableEntries: res });
        });
    }

    async getAllArtifacts(params: GetAllArtifactsRequest): Promise<GetAllArtifactsResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.getArifactFiles(params.path);
            resolve({ artifacts: res });
        });
    }

    async getArtifactType(params: GetArtifactTypeRequest): Promise<GetArtifactTypeResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.getArtifactType(params.filePath);
            resolve({ artifactType: res.artifactType, artifactFolder: res.artifactFolder });
        });
    }

    async getEndpointsList(endpointList: any, filePath: string, isLoadBalanceEp: boolean): Promise<any[]> {
        return new Promise(async (resolve) => {
            const endpoints: any[] = [];
            const endpointRegex = /<endpoint(.*?)>(.*?)<\/endpoint>/gs;
            const options = {
                ignoreAttributes: false,
                allowBooleanAttributes: true,
                attributeNamePrefix: "",
                attributesGroupName: "@_",
                indentBy: '    ',
                format: true,
            };
            const parser = new XMLParser(options);
            const builder = new XMLBuilder(options);

            endpointList.map((member: any) => {
                if (isLoadBalanceEp) {
                    if (member.endpoint?.key) {
                        endpoints.push({ type: 'static', value: member.endpoint.key });
                    }
                } else {
                    if (member.key) {
                        endpoints.push({ type: 'static', value: member.key });
                    }
                }
            });

            let xmlString = fs.readFileSync(filePath, "utf8");
            xmlString = xmlString.slice(0, xmlString.indexOf("<endpoint")) +
                xmlString.slice(xmlString.indexOf(">", xmlString.indexOf("<endpoint")) + 1);
            xmlString = xmlString.replace(/<endpoint\s+[^>]*\/>/ig, "");

            let match;
            while ((match = endpointRegex.exec(xmlString)) !== null) {
                endpoints.push({ type: 'inline', value: builder.build(parser.parse(match[0])) as string });
            }
            resolve(endpoints);
        });
    }

    async deleteArtifact(params: DeleteArtifactRequest): Promise<void> {
        return new Promise(async (resolve) => {
            // Initialize undo redo manager with the file content
            if (params.enableUndo) {
                await this.initUndoRedoManager({ path: params.path });
            }
            const registryIdentifier = "wso2mi/resources/registry";
            const isRegistry = path.normalize(params.path).includes(path.normalize(registryIdentifier));
            if (isRegistry) {
                deleteRegistryResource(params.path);
            } else {
                await workspace.fs.delete(Uri.file(params.path));
            }
            await vscode.commands.executeCommand(COMMANDS.REFRESH_COMMAND); // Refresh the project explore view
            navigate(this.projectUri);
            if (params.enableUndo && !isRegistry) {
                undoRedo.addModification('');
                const selection = await vscode.window.showInformationMessage('Do you want to undo the deletion?', 'Undo');
                if (selection === 'Undo') {
                    this.undo({ path: params.path });
                    await vscode.commands.executeCommand(COMMANDS.REFRESH_COMMAND);
                    navigate(this.projectUri);
                }
            }

            resolve();
        });
    }

    async updateArtifactInRegistry(filePath: string, newFileName: string): Promise<boolean> {
        return new Promise(async (resolve) => {
            const fileName = path.basename(filePath);
            const options = {
                ignoreAttributes: false,
                attributeNamePrefix: "@",
                parseTagValue: true,
                format: true,
            };
            const parser = new XMLParser(options);
            const projectDir = workspace.getWorkspaceFolder(Uri.file(filePath))?.uri.fsPath;

            const artifactXMLPathsToCheck = [
                path.join(projectDir ?? "", 'src', 'main', 'wso2mi', 'resources', 'registry', 'artifact.xml'),
                path.join(projectDir ?? "", 'src', 'main', 'wso2mi', 'resources', 'artifact.xml'),
            ];
            const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
            let anyFileUpdated = false;

            for (const artifactXMLPath of artifactXMLPathsToCheck) {
                if (!fs.existsSync(artifactXMLPath)) {
                    continue;
                }
                const artifactXML = fs.readFileSync(artifactXMLPath, "utf8");
                const artifactXMLData = parser.parse(artifactXML);
                let fileUpdated = false;

                if (Array.isArray(artifactXMLData.artifacts?.artifact)) {
                    for (const artifact of artifactXMLData.artifacts.artifact) {
                        if (artifact?.item?.file === fileName) {
                            artifact.item.file = `${newFileName}.xml`;
                            fileUpdated = true;
                        }
                    }
                } else if (artifactXMLData.artifacts?.artifact?.item?.file === fileName) {
                    artifactXMLData.artifacts.artifact.item.file = `${newFileName}.xml`;
                    fileUpdated = true;
                }

                if (fileUpdated) {
                    const updatedXmlString = builder.build(artifactXMLData);
                    fs.writeFileSync(artifactXMLPath, updatedXmlString);
                    anyFileUpdated = true;
                }
            }
            resolve(anyFileUpdated);
        });

    }

    async refreshAccessToken(): Promise<void> {
        await refreshCopilotAccessToken();
    }

    async buildProject(params: BuildProjectRequest): Promise<void> {
        return new Promise(async (resolve) => {
            let selection = params?.buildType?.toString();
            if (!selection) {
                selection = await window.showQuickPick(["Build CAPP", "Create Docker Image"]);
            }
            if (selection === "Build CAPP" || selection === "capp") {
                await commands.executeCommand(COMMANDS.BUILD_PROJECT, this.projectUri, false);
            } else if (selection === "Create Docker Image" || selection === "docker") {
                await commands.executeCommand(COMMANDS.CREATE_DOCKER_IMAGE, this.projectUri);
            }
            resolve();
        });
    }

    async remoteDeploy(): Promise<void> {
        return new Promise(async (resolve) => {
            const workspaceFolderUri = vscode.Uri.file(path.resolve(this.projectUri));
            if (workspaceFolderUri) {
                const config = vscode.workspace.getConfiguration('MI', workspaceFolderUri);
                const isRemoteDeploymentEnabled = config.get<boolean>("REMOTE_DEPLOYMENT_ENABLED");
                if (isRemoteDeploymentEnabled) {
                    await commands.executeCommand(COMMANDS.REMOTE_DEPLOY_PROJECT, this.projectUri, false);
                } else {
                    const configure = await vscode.window.showWarningMessage(
                        'Remote deployment is not enabled. Do you want to enable and configure it now?',
                        { modal: true },
                        'Yes'
                    );
                    if (configure === 'Yes') {
                        const rpcClient = new MiVisualizerRpcManager(this.projectUri);
                        rpcClient.openView({
                            type: POPUP_EVENT_TYPE.OPEN_VIEW,
                            location: {
                                view: MACHINE_VIEW.ProjectInformationForm,
                                customProps: "Deployment"
                            },
                            isPopup: true
                        });
                    } else {
                        return;
                    }
                }
            }
            resolve();
        });
    }

    async deployProject(params: DeployProjectRequest): Promise<DeployProjectResponse> {
        return new Promise(async (resolve) => {
            if (!checkForDevantExt()) {
                return;
            }
            const params: ICreateComponentCmdParams = {
                buildPackLang: "microintegrator",
                name: path.basename(this.projectUri),
                componentDir: this.projectUri,
                extName: "Devant",
            };

            const langClient = await MILanguageClient.getInstance(this.projectUri);

            let integrationType: string | undefined;
            if (params.componentDir) {
                const rootPath = (await this.getProjectRoot({ path: params.componentDir })).path;
                const resp = await langClient.getProjectIntegrationType(rootPath);

                function mapTypeToScope(type: string): string | undefined {
                    switch (type) {
                        case 'AUTOMATION':
                            return SCOPE.AUTOMATION;
                        case 'INTEGRATION_AS_API':
                            return SCOPE.INTEGRATION_AS_API;
                        case 'EVENT_INTEGRATION':
                            return SCOPE.EVENT_INTEGRATION;
                        case 'FILE_INTEGRATION':
                            return SCOPE.FILE_INTEGRATION;
                        case 'AI_AGENT':
                            return SCOPE.AI_AGENT;
                        case 'ANY':
                            return SCOPE.ANY;
                    }
                }

                if (resp.length === 1) {
                    const type = resp[0]
                    integrationType = mapTypeToScope(type);
                } else if (resp.length === 0) {
                    window.showErrorMessage("You don't have any artifacts within this project. Please add an artifact and try again.");
                } else {
                    // Show a quick pick to select deployment option
                    const selectedScope = await window.showQuickPick(resp, {
                        placeHolder: 'You have different types of artifacts within this project. Select the artifact type to be deployed'
                    });

                    if (selectedScope) {
                        integrationType = mapTypeToScope(selectedScope);
                    }
                }

                if (!integrationType) {
                    return { success: false };
                }

                const paramsWithType: ICreateComponentCmdParams = { ...params, integrationType: integrationType as DevantScopes, };

                commands.executeCommand(PlatformExtCommandIds.CreateNewComponent, paramsWithType);
                resolve({ success: true });

            } else {
                resolve({ success: false });
            }
        });
    }

    async getDevantMetadata(): Promise<DevantMetadata> {
        let hasContextYaml = false;
        let isLoggedIn = false;
        let hasComponent = false;
        let hasLocalChanges = false;
        try {
            const repoRoot = getRepoRoot(this.projectUri);
            if (repoRoot) {
                const contextYamlPath = path.join(repoRoot, ".choreo", "context.yaml");
                if (fs.existsSync(contextYamlPath)) {
                    hasContextYaml = true;
                }
            }

            const platformExt = extensions.getExtension("wso2.wso2-platform");
            if (!platformExt) {
                return { hasComponent: hasContextYaml, isLoggedIn: false };
            }
            const platformExtAPI: IWso2PlatformExtensionAPI = await platformExt.activate();
            hasLocalChanges = await platformExtAPI.localRepoHasChanges(this.projectUri);
            isLoggedIn = platformExtAPI.isLoggedIn();
            if (isLoggedIn) {
                const components = platformExtAPI.getDirectoryComponents(this.projectUri);
                hasComponent = components.length > 0;
                return { isLoggedIn, hasComponent, hasLocalChanges };
            }
            return { isLoggedIn, hasComponent: hasContextYaml, hasLocalChanges };
        } catch (err) {
            console.error("failed to call getDevantMetadata: ", err);
            return { hasComponent: hasComponent || hasContextYaml, isLoggedIn, hasLocalChanges };
        }
    }

    async exportProject(params: ExportProjectRequest): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const exportTask = async () => {
                const carFile = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(params.projectPath, 'target/*.car'),
                    null,
                    1
                );
                if (carFile.length === 0) {
                    const errorMessage =
                        'Error: No .car file found in the target directory. Please build the project before exporting.';
                    window.showErrorMessage(errorMessage);
                    log(errorMessage);
                    return reject(errorMessage);
                }
                const lastExportedPath: string | undefined = extension.context.globalState.get(LAST_EXPORTED_CAR_PATH);
                const quickPicks: vscode.QuickPickItem[] = [
                    {
                        label: "Select Destination",
                        description: "Select a destination folder to export .car file",
                    },
                ];
                if (lastExportedPath) {
                    quickPicks.push({
                        label: "Last Exported Path: " + lastExportedPath,
                        description: "Use the last exported path to export .car file",
                    });
                }
                const selection = await vscode.window.showQuickPick(
                    quickPicks,
                    {
                        placeHolder: "Export Options",
                    }
                );

                if (selection) {
                    let destination: string | undefined;
                    if (selection.label == "Select Destination") {
                        // Get the destination folder
                        const selectedLocation = await this.browseFile({
                            canSelectFiles: false,
                            canSelectFolders: true,
                            canSelectMany: false,
                            defaultUri: lastExportedPath ?? params.projectPath,
                            title: "Select a folder to export the project",
                            openLabel: "Select Folder"
                        });
                        destination = selectedLocation.filePath;
                        await extension.context.globalState.update(LAST_EXPORTED_CAR_PATH, destination);
                    } else {
                        destination = lastExportedPath;
                    }
                    if (destination) {
                        const destinationPath = path.join(destination, path.basename(carFile[0].fsPath));
                        fs.copyFileSync(carFile[0].fsPath, destinationPath);
                        window.showInformationMessage("Project exported successfully!");
                        log(`Project exported to: ${destination}`);
                        resolve();
                    }
                }
            }
            await commands.executeCommand(COMMANDS.BUILD_PROJECT, this.projectUri, false, exportTask);
        });
    }

    async checkOldProject(): Promise<boolean> {
        return new Promise(async (resolve) => {
            const oldProjectState = getStateMachine(this.projectUri).context().isOldProject;
            if (oldProjectState !== undefined) {
                resolve(oldProjectState);
            }
        });
    }

    async editOpenAPISpec(params: SwaggerTypeRequest): Promise<void> {
        return new Promise(async () => {
            const { apiName, apiPath } = params;
            const openAPISpecPath = path.join(
                this.projectUri,
                SWAGGER_REL_DIR,
                `${path.basename(params.apiPath, ".xml")}.yaml`
            );

            // Create directory if not exists
            if (!fs.existsSync(path.dirname(openAPISpecPath))) {
                fs.mkdirSync(path.dirname(openAPISpecPath), { recursive: true });
            };

            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const { swagger } = await langClient.swaggerFromAPI({ apiPath });
            if (!fs.existsSync(openAPISpecPath)) {
                // Create the file if not exists
                await replaceFullContentToFile(openAPISpecPath, swagger);
            };

            // Open the file in the editor
            const openedEditor = window.visibleTextEditors.find(
                editor => editor.document.uri.fsPath === openAPISpecPath
            );
            if (openedEditor) {
                window.showTextDocument(openedEditor.document, {
                    viewColumn: openedEditor.viewColumn
                });
            } else {
                commands.executeCommand('vscode.open', Uri.file(openAPISpecPath), {
                    viewColumn: ViewColumn.Active
                });
            }

            let swaggerContent;
            if (fs.existsSync(openAPISpecPath)) {
                swaggerContent = fs.readFileSync(openAPISpecPath, "utf8");
            } else {
                swaggerContent = swagger;
            }
            const port = await getPortPromise({ port: 1000, stopPort: 3000 });
            const cors_proxy = require('cors-anywhere');
            cors_proxy.createServer({
                originWhitelist: [], // Allow all origins
                requireHeader: ['origin', 'x-requested-with']
            }).listen(port, 'localhost');

            const swaggerData: SwaggerData = {
                generatedSwagger: swaggerContent,
                port: port
            };

            await openSwaggerWebview(this.projectUri, swaggerData);
        });
    }

    async compareSwaggerAndAPI(params: SwaggerTypeRequest): Promise<CompareSwaggerAndAPIResponse> {
        return new Promise(async (resolve) => {

            const { apiPath, apiName } = params;
            const swaggerPath = path.join(
                this.projectUri,
                SWAGGER_REL_DIR,
                `${path.basename(params.apiPath, ".xml")}.yaml`
            );

            if (!fs.existsSync(swaggerPath)) {
                return resolve({ swaggerExists: false });
            }

            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const { swagger: generatedSwagger } = await langClient.swaggerFromAPI({ apiPath: apiPath, swaggerPath: swaggerPath });
            const swaggerContent = fs.readFileSync(swaggerPath, 'utf-8');
            const isEqualSwagger = isEqualSwaggers({
                existingSwagger: parse(swaggerContent),
                generatedSwagger: parse(generatedSwagger!)
            });
            return resolve({
                swaggerExists: true,
                isEqual: isEqualSwagger,
                generatedSwagger,
                existingSwagger: swaggerContent
            });
        });
    }

    async updateSwaggerFromAPI(params: SwaggerTypeRequest): Promise<void> {
        return new Promise(async () => {
            const { apiName, apiPath } = params;
            const swaggerPath = path.join(
                this.projectUri,
                SWAGGER_REL_DIR,
                `${path.basename(params.apiPath, ".xml")}.yaml`
            );

            let generatedSwagger = params.generatedSwagger;
            let existingSwagger = params.existingSwagger;
            if (!generatedSwagger || !existingSwagger) {
                const langClient = await MILanguageClient.getInstance(this.projectUri);
                const response = await langClient.swaggerFromAPI({ apiPath: apiPath, ...(fs.existsSync(swaggerPath) && { swaggerPath: swaggerPath }) });
                generatedSwagger = response.swagger;
                existingSwagger = fs.readFileSync(swaggerPath, 'utf-8');
            }

            const mergedContent = mergeSwaggers({
                existingSwagger: parse(existingSwagger),
                generatedSwagger: parse(generatedSwagger!)
            });
            const yamlContent = stringify(mergedContent);
            await replaceFullContentToFile(swaggerPath, yamlContent);
        });
    }

    async updateAPIFromSwagger(params: UpdateAPIFromSwaggerRequest): Promise<void> {
        return new Promise(async () => {
            const { apiName, apiPath, resources, insertPosition } = params;
            const swaggerPath = path.join(
                this.projectUri,
                SWAGGER_REL_DIR,
                `${path.basename(params.apiPath, ".xml")}.yaml`
            );

            let generatedSwagger = params.generatedSwagger;
            let existingSwagger = params.existingSwagger;
            if (!generatedSwagger || !existingSwagger) {
                const langClient = await MILanguageClient.getInstance(this.projectUri);
                const response = await langClient.swaggerFromAPI({ apiPath });
                generatedSwagger = response.swagger;
                existingSwagger = fs.readFileSync(swaggerPath, 'utf-8');
            }

            // Add new resources
            const { added, removed, updated } = getResourceInfo({
                existingSwagger: parse(existingSwagger),
                generatedSwagger: parse(generatedSwagger!),
            });
            const resourceXml = added.reduce((acc, resource) => {
                return acc + "\n" + getAPIResourceXmlWrapper({
                    methods: resource.methods,
                    uriTemplate: resource.path
                });
            }, "").trim();
            await this.applyEdit({
                text: resourceXml,
                documentUri: apiPath,
                range: {
                    start: {
                        line: insertPosition.line,
                        character: insertPosition.character,
                    },
                    end: {
                        line: insertPosition.line,
                        character: insertPosition.character,
                    }
                }
            });

            // Delete resources
            const deleteResources = removed.map(resource => resources.find(
                r => r.path === resource.path && isEqual(r.methods, resource.methods)
            ));
            for (const resource of deleteResources) {
                await this.applyEdit({
                    text: "",
                    documentUri: apiPath,
                    range: {
                        start: {
                            line: resource.position.startLine,
                            character: resource.position.startColumn
                        },
                        end: {
                            line: resource.position.endLine,
                            character: resource.position.endColumn
                        }
                    }
                });
            }
        });
    }

    async updateTestSuite(params: UpdateTestSuiteRequest): Promise<UpdateTestSuiteResponse> {
        return new Promise(async (resolve) => {
            const { content, name, artifact } = params;
            let filePath = params.path;
            const fileName = filePath ? path.parse(filePath).name : "";

            if (!content) {
                throw new Error('Content is required');
            }

            if (!filePath) {
                if (!artifact) {
                    throw new Error('Artifact is required');
                }
                if (!name) {
                    throw new Error('Name is required');
                }

                const testDir = path.join(this.projectUri, 'src', 'test', "wso2mi");
                filePath = path.join(testDir, `${name}.xml`);

                if (fs.existsSync(filePath)) {
                    throw new Error('Test suite already exists');
                }

                if (!fs.existsSync(testDir)) {
                    fs.mkdirSync(testDir, { recursive: true });
                }
            } else if (name != fileName && params.path) {
                filePath = filePath.replace(`${fileName}.xml`, `${name}.xml`);
                if (fs.existsSync(filePath)) {
                    throw new Error('Test suite already exists');
                }
                fs.renameSync(params.path, filePath);
            }

            await replaceFullContentToFile(filePath, content);
            await this.rangeFormat({ uri: filePath });

            const openFileButton = 'Open File';
            window.showInformationMessage(`Test suite ${!filePath ? "created" : "updated"} successfully`, openFileButton).then(selection => {
                if (selection === openFileButton) {
                    workspace.openTextDocument(filePath!).then(doc => {
                        window.showTextDocument(doc);
                    });
                }
            });

            resolve({ path: filePath });
        });
    }

    async updateTestCase(params: UpdateTestCaseRequest): Promise<UpdateTestCaseResponse> {
        return new Promise(async (resolve) => {
            const filePath = params.path;
            if (!filePath) {
                throw new Error('File path is required');
            }
            if (!fs.existsSync(filePath)) {
                throw new Error('Test case does not exist');
            }

            let range;
            if (!params.range) {
                const langClient = await MILanguageClient.getInstance(this.projectUri);
                const st = await langClient.getSyntaxTree({
                    documentIdentifier: {
                        uri: filePath
                    },
                });
                const stNode: UnitTest = st?.syntaxTree?.["unit-test"];
                if (!stNode) {
                    throw new Error('Invalid test case file');
                }
                const endTag = stNode.testCases.range.endTagRange.start

                range = new Range(endTag.line, endTag.character, endTag.line, endTag.character);
            } else {
                const startTag = params.range.startTagRange.start;
                const endTag = params.range.endTagRange.end;
                range = new Range(startTag.line, startTag.character, endTag.line, endTag.character);
            }

            const workspaceEdit = new WorkspaceEdit();
            workspaceEdit.replace(Uri.file(filePath), range, params.content);
            await workspace.applyEdit(workspaceEdit);

            await this.rangeFormat({ uri: filePath });

            const openFileButton = 'Open File';
            window.showInformationMessage(`Test case ${!filePath ? "created" : "updated"} successfully`, openFileButton).then(selection => {
                if (selection === openFileButton) {
                    workspace.openTextDocument(filePath!).then(doc => {
                        window.showTextDocument(doc);
                    });
                }
            });

            resolve({});
        });
    }

    async getAllTestSuites(): Promise<GetAllTestSuitsResponse> {
        return new Promise(async (resolve) => {
            const suites: any[] = [];
            if (workspace.workspaceFolders) {
                const pattern = new vscode.RelativePattern(this.projectUri, testFileMatchPattern);
                const files = await workspace.findFiles(pattern);
                for (const fileX of files) {
                    const file = fileX.fsPath;
                    const fileName = path.parse(file).name;

                    suites.push({
                        name: fileName,
                        path: file,
                        testCases: []
                    });
                }
            }

            return resolve({ testSuites: suites });
        });
    }

    async updateMockService(params: UpdateMockServiceRequest): Promise<UpdateMockServiceResponse> {
        return new Promise(async (resolve) => {
            const { content, name } = params;
            let filePath = params.path;
            const fileName = filePath ? path.parse(filePath).name : "";

            if (!content) {
                throw new Error('Content is required');
            }

            if (!filePath) {
                if (!name) {
                    throw new Error('Name is required');
                }
                const testDir = path.join(this.projectUri, 'src', 'test', 'resources', 'mock-services');
                filePath = path.join(testDir, `${name}.xml`);

                if (fs.existsSync(filePath)) {
                    throw new Error('Mock service already exists');
                }

                if (!fs.existsSync(testDir)) {
                    fs.mkdirSync(testDir, { recursive: true });
                }
            } else if (name != fileName && params.path) {
                filePath = filePath.replace(`${fileName}.xml`, `${name}.xml`);
                if (fs.existsSync(filePath)) {
                    throw new Error('Mock service already exists');
                }
                fs.renameSync(params.path, filePath);
            }

            await replaceFullContentToFile(filePath, content);

            const openFileButton = 'Open File';
            window.showInformationMessage(`Mock service ${!filePath ? "created" : "updated"} successfully`, openFileButton).then(selection => {
                if (selection === openFileButton) {
                    workspace.openTextDocument(filePath!).then(doc => {
                        window.showTextDocument(doc);
                    });
                }
            });

            resolve({ path: filePath });
        });
    }

    async getAllMockServices(): Promise<GetAllMockServicesResponse> {
        return new Promise(async (resolve) => {
            const services: any[] = [];
            if (workspace.workspaceFolders) {
                const pattern = new vscode.RelativePattern(this.projectUri, mockSerivesFilesMatchPattern);
                const files = await workspace.findFiles(pattern);
                for (const fileX of files) {
                    const file = fileX.fsPath;
                    const fileName = path.parse(file).name;

                    services.push({
                        name: fileName,
                        path: file,
                    });
                }
            }

            return resolve({ mockServices: services });
        });
    }

    async getSelectiveArtifacts(params: GetSelectiveArtifactsRequest): Promise<GetSelectiveArtifactsResponse> {
        return new Promise(async (resolve) => {
            const filePath = params.path;
            const artifactsContent: string[] = [];

            if (fs.existsSync(filePath)) {
                const currentFile = fs.readFileSync(filePath, "utf8");
                artifactsContent.push(currentFile);
            }

            return resolve({ artifacts: artifactsContent });
        });
    }

    async getOpenAPISpec(params: SwaggerTypeRequest): Promise<SwaggerFromAPIResponse> {
        const swaggerPath = path.join(this.projectUri, SWAGGER_REL_DIR,
            `${path.basename(params.apiPath, ".xml")}.yaml`);
        const langClient = await MILanguageClient.getInstance(this.projectUri);
        let response;
        if (params.isRuntimeService) {
            const versionedUrl = await exposeVersionedServices(this.projectUri);
            response = await langClient.swaggerFromAPI({ apiPath: params.apiPath, port: DebuggerConfig.getServerPort(), projectPath: versionedUrl ? this.projectUri : "", ...(fs.existsSync(swaggerPath) && { swaggerPath: swaggerPath }) });
        } else {
            response = await langClient.swaggerFromAPI({ apiPath: params.apiPath, ...(fs.existsSync(swaggerPath) && { swaggerPath: swaggerPath }) });
        }
        const generatedSwagger = response.swagger;
        const port = await getPortPromise({ port: 1000, stopPort: 3000 });
        const cors_proxy = require('cors-anywhere');
        cors_proxy.createServer({
            originWhitelist: [], // Allow all origins
            requireHeader: ['origin', 'x-requested-with']
        }).listen(port, 'localhost');

        RPCLayer._messengers.get(this.projectUri)?.sendNotification(onSwaggerSpecReceived, { type: 'webview', webviewType: 'micro-integrator.runtime-services-panel' }, { generatedSwagger: generatedSwagger, port: port });

        return { generatedSwagger: generatedSwagger }; // TODO: refactor rpc function with void
    }

    async openDependencyPom(params: OpenDependencyPomRequest): Promise<void> {
        return new Promise(async (resolve) => {
            const { name, file } = params;
            const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(file));
            if (!workspaceFolder) {
                window.showErrorMessage('Cannot find workspace folder');
                throw new Error('Cannot find workspace folder');
            }

            const pomPath = path.join(workspaceFolder.uri.fsPath, 'pom.xml');
            const pomContent = fs.readFileSync(pomPath, 'utf-8');

            const dependencies = (await this.getAllDependencies({ file: file }))?.dependencies;
            let dependencyExists = dependencies.some(dep =>
                dep.groupId.toLowerCase().includes(name.toLowerCase())
            );

            const openPomAtPosition = async (position: number) => {
                const editor = await window.showTextDocument(Uri.file(pomPath));
                const newPosition = new Position(position, 0);
                const newSelection = new Selection(newPosition, newPosition);
                editor.selection = newSelection;
                editor.revealRange(newSelection, vscode.TextEditorRevealType.AtTop);
            };

            if (dependencyExists) {
                const dependencyIndex = dependencies.findIndex(dep => dep.groupId.includes(name));
                const dependencyPosition = pomContent.split('\n').findIndex(line => line.includes(dependencies[dependencyIndex].groupId));
                await openPomAtPosition(dependencyPosition);
            } else {
                const dependenciesPosition = pomContent.split('\n').findIndex(line => line.includes('<dependencies>'));
                await openPomAtPosition(dependenciesPosition);
            }

            resolve();
        });
    }

    async formatPomFile(): Promise<void> {
        return new Promise(async (resolve) => {
            const pomPath = path.join(this.projectUri, 'pom.xml');
            await this.rangeFormat({ uri: pomPath });
            resolve();
        });
    }

    async getAllDependencies(params: getAllDependenciesRequest): Promise<GetAllDependenciesResponse> {
        const { file } = params;
        const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(file));

        if (!workspaceFolder) {
            window.showErrorMessage('Cannot find workspace folder');
            throw new Error('Cannot find workspace folder');
        }

        const pomPath = path.join(workspaceFolder.uri.fsPath, 'pom.xml');
        const pomContent = fs.readFileSync(pomPath, 'utf-8');
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        };
        const parser = new XMLParser(options);
        const pom = parser.parse(pomContent);

        if (!pom) {
            window.showErrorMessage('Failed to parse POM XML');
            throw new Error('Failed to parse POM XML');
        }

        const dependencyRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
        const groupIdRegex = /<groupId>(.*?)<\/groupId>/;
        const artifactIdRegex = /<artifactId>(.*?)<\/artifactId>/;
        const versionRegex = /<version>(.*?)<\/version>/;

        let dependencies: Dependency[] = [];
        let match;
        while ((match = dependencyRegex.exec(pomContent)) !== null) {
            const dependencyContent = match[1];
            const groupIdMatch = groupIdRegex.exec(dependencyContent);
            const artifactIdMatch = artifactIdRegex.exec(dependencyContent);
            const versionMatch = versionRegex.exec(dependencyContent);

            const groupId = groupIdMatch ? groupIdMatch[1] : "";
            const artifactId = artifactIdMatch ? artifactIdMatch[1] : "";
            const version = versionMatch ? versionMatch[1] : "";

            const startLine = pomContent.substring(0, match.index).split('\n').length;
            const endLine = pomContent.substring(0, match.index + match[0].length).split('\n').length;
            const startColumn = match.index - pomContent.lastIndexOf('\n', match.index - 1) - 1;
            const endColumn = (match.index + match[0].length) - pomContent.lastIndexOf('\n', match.index + match[0].length - 1) - 1;

            dependencies.push({
                groupId,
                artifactId,
                version,
                range: { start: { line: startLine - 1, character: startColumn }, end: { line: endLine - 1, character: endColumn } }
            });
        }

        return { dependencies };
    }
    async testDbConnection(req: TestDbConnectionRequest): Promise<TestDbConnectionResponse> {

        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const response = await langClient?.testDbConnection(req);
            resolve({ success: response ? response.success : false });
        });
    }

    async markAsDefaultSequence(params: MarkAsDefaultSequenceRequest): Promise<void> {
        return new Promise(async (resolve) => {
            const { path: filePath, remove, name } = params;
            commands.executeCommand(COMMANDS.MARK_SEQUENCE_AS_DEFAULT, { info: { path: filePath, name } }, remove);

            resolve();
        });
    }

    async getSubFolderNames(params: GetSubFoldersRequest): Promise<GetSubFoldersResponse> {
        return new Promise(async (resolve) => {
            const { path: folderPath } = params;
            const subFolders: string[] = [];

            const subItems = fs.readdirSync(folderPath, { withFileTypes: true });
            for (const item of subItems) {
                if (item.isDirectory()) {
                    subFolders.push(item.name);
                }
            }
            resolve({ folders: subFolders });
        });
    }

    async renameFile(params: FileRenameRequest): Promise<void> {
        try {
            fs.renameSync(params.existingPath, params.newPath);
            const newFileName = path.basename(params.newPath);
            await this.updateArtifactInRegistry(params.existingPath, newFileName.substring(0, newFileName.lastIndexOf('.')));
        } catch (error) {
            console.error(`Error renaming file: ${error}`);
        }
    }

    async getFilePath(directory: string, fileName: string): Promise<string> {
        return new Promise(async (resolve) => {
            let filePath: string;
            if (directory.endsWith('.xml')) {
                if (path.basename(directory).split('.')[0] !== fileName) {
                    fs.unlinkSync(directory);
                    filePath = path.join(path.dirname(directory), `${fileName}.xml`);
                    await this.updateArtifactInRegistry(directory, fileName);
                } else {
                    filePath = directory;
                }
            } else {
                filePath = path.join(directory, `${fileName}.xml`);
            }
            resolve(filePath);
        });
    }

    async openUpdateExtensionPage(): Promise<void> {
        const extensionId = 'wso2.micro-integrator';
        const url = `vscode:extension/${extensionId}`;
        vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
    }

    async checkDBDriver(className: string): Promise<CheckDBDriverResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.checkDBDriver(className);
            resolve(res);
        });
    }

    async addDBDriver(params: AddDriverRequest): Promise<boolean> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.addDBDriver(params);
            resolve(res);
        });
    }

    async removeDBDriver(params: AddDriverRequest): Promise<boolean> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.removeDBDriver(params);
            resolve(res);
        });
    }

    async modifyDBDriver(params: AddDriverRequest): Promise<boolean> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.modifyDBDriver(params);
            resolve(res);
        });
    }

    async generateDSSQueries(params: ExtendedDSSQueryGenRequest): Promise<boolean> {
        const { documentUri, position, ...genQueryParams } = params;
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const xml = await langClient.generateQueries(genQueryParams);

            if (!xml) {
                log('Failed to generate DSS Queries.');
                resolve(false);
            }

            const sanitizedXml = xml.replace(/^\s*[\r\n]/gm, '');

            const xmlLineCount = sanitizedXml.split('\n').length;
            const insertRange = { start: position, end: position };
            const formatRange = {
                start: position,
                end: { line: position.line + xmlLineCount - 1, character: 0 }
            };
            await this.applyEdit({ text: sanitizedXml, documentUri, range: insertRange });
            await this.rangeFormat({ uri: documentUri, range: formatRange });

            log('Successfully generated DSS Queries.');
            resolve(true);
        });
    }

    async fetchDSSTables(params: DSSFetchTablesRequest): Promise<DSSFetchTablesResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.fetchTables({
                ...params, tableData: "", datasourceName: ""
            });
            resolve(res);
        });
    }

    async getMediators(param: GetMediatorsRequest): Promise<GetMediatorsResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            let response = await langClient.getMediators(param);
            resolve(response);
        });
    }

    async getMediator(param: GetMediatorRequest): Promise<GetMediatorResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            let response = await langClient.getMediator(param);
            resolve(response);
        });
    }

    async getMcpTools(param: McpToolsRequest): Promise<McpToolsResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            let response = await langClient.getMcpTools(param);
            resolve(response);
        });
    }

    async updateMediator(param: UpdateMediatorRequest): Promise<UpdateMediatorResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            let response = await langClient.generateSynapseConfig(param);
            if (response && response.textEdits) {
                let edits = response.textEdits;

                await this.applyEdit({
                    documentUri: param.documentUri,
                    edits,
                    disableUndoRedo: true
                });

                let document = workspace.textDocuments.find(doc => doc.uri.fsPath === param.documentUri);
                if (!document) {
                    return;
                }
                const content = document.getText();
                undoRedo.addModification(content);
            }
            resolve(response);
        });
    }

    async getLocalInboundConnectors(): Promise<LocalInboundConnectorsResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            let response = await langClient.getLocalInboundConnectors();
            resolve(response);
        });
    }

    async getConnectionSchema(param: GetConnectionSchemaRequest): Promise<GetConnectionSchemaResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            let response = await langClient.getConnectionSchema(param);
            resolve(response);
        });
    }

    async getExpressionCompletions(params: ExpressionCompletionsRequest): Promise<ExpressionCompletionsResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                const langClient = await MILanguageClient.getInstance(this.projectUri);
                const res = await langClient.getExpressionCompletions(params);
                if (!res.isIncomplete) {
                    resolve(res);
                } else {
                    reject(new Error('Incomplete completions'));
                }
            } catch (error) {
                console.error(`Error getting expression completions: ${error}`);
                reject(error);
            }
        });
    }

    async getHelperPaneInfo(params: GetHelperPaneInfoRequest): Promise<GetHelperPaneInfoResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                const langClient = await MILanguageClient.getInstance(this.projectUri);
                let response = await langClient.getHelperPaneInfo(params);
                resolve(response);
            } catch (error) {
                console.error(`Error getting helper pane info: ${error}`);
                reject(error);
            }
        });
    }

    async testConnectorConnection(params: TestConnectorConnectionRequest): Promise<TestConnectorConnectionResponse> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.testConnectorConnection(params);
            resolve(res);
        });
    }

    async saveConfig(params: SaveConfigRequest): Promise<SaveConfigResponse> {
        return new Promise(async (resolve, reject) => {
            const { configName, configType, configValue } = params;

            try {
                // Read the config file content
                const configFilePath = path.join(
                    this.projectUri,
                    'src',
                    'main',
                    'wso2mi',
                    'resources',
                    'conf',
                    'config.properties'
                );
                const configFileContent = fs.readFileSync(configFilePath, 'utf-8').trim();

                // Derive the updated config file content
                let updatedConfigFileContent: string;
                if (configFileContent.length > 0) {
                    // Add a new line if the file is not empty
                    updatedConfigFileContent = configFileContent + `\n${configName}:${configType}`;
                } else {
                    updatedConfigFileContent = configFileContent + `${configName}:${configType}`;
                }

                // Write the updated config file content back to the file
                fs.writeFileSync(configFilePath, updatedConfigFileContent, 'utf-8');

                const envFilePath = [this.projectUri, '.env'].join(path.sep);
                const envFileContent = fs.readFileSync(envFilePath, 'utf-8').trim();
                let updatedEnvFileContent: string;
                if (envFileContent.length > 0) {
                    // Add a new line if the file is not empty
                    updatedEnvFileContent = envFileContent + `\n${configName}=${configValue}`;
                } else {
                    updatedEnvFileContent = envFileContent + `${configName}=${configValue}`;
                }
                // Write the updated .env file content back to the file
                fs.writeFileSync(envFilePath, updatedEnvFileContent, 'utf-8');
                resolve({ success: true });
            } catch (e) {
                reject(e);
            }
        });
    }



    async closePayloadAlert(): Promise<void> {
        return new Promise(async (resolve) => {
            await extension.context.workspaceState.update('displayPayloadAlert', false);
            resolve();
        });
    }

    async shouldDisplayPayloadAlert(): Promise<boolean> {
        return new Promise(async (resolve) => {
            const displayPayloadAlert: boolean =
                (await extension.context.workspaceState.get('displayPayloadAlert')) ?? true;
            resolve(displayPayloadAlert);
        });
    }

    async displayPayloadAlert(): Promise<void> {
        return new Promise(async (resolve) => {
            await extension.context.workspaceState.update('displayPayloadAlert', true);
            resolve();
        });
    }


    async fetchConnectors(name, operation: 'add' | 'remove') {
        const runtimeVersion = await getMIVersionFromPom(this.projectUri);

        const connectorStoreResponse = await fetch(APIS.MI_CONNECTOR_STORE_BACKEND.replace('${version}', runtimeVersion ?? ''));
        const connectorStoreData = await connectorStoreResponse.json();

        const searchMavenArtifactIdConnector = name.startsWith('mi-connector-') ? name : `mi-connector-${name}`;
        const searchMavenArtifactIdModule = name.startsWith('mi-module-') ? name : `mi-module-${name}`;
        const artifactMatch = connectorStoreData?.find(artifact =>
            artifact.mavenArtifactId === searchMavenArtifactIdConnector ||
            artifact.mavenArtifactId === searchMavenArtifactIdModule
        );

        if (artifactMatch) {
            const rpcClient = new MiVisualizerRpcManager(this.projectUri);
            const updateDependencies = async () => {
                const dependencies: DependencyDetails[] = [{
                    groupId: artifactMatch.mavenGroupId,
                    artifact: artifactMatch.mavenArtifactId,
                    version: artifactMatch.version.tagName,
                    type: "zip"
                }];

                const response = await rpcClient.updateAiDependencies({
                    dependencies,
                    operation: operation
                });

                return response;
            }

            const dependenciesResponse = await updateDependencies();
            const connectorResponse = await rpcClient.updateConnectorDependencies();

            return {
                dependenciesResponse,
                connectorResponse
            };
        } else {
            console.error("Connector not found");
            return null;
        }
    };

    async getValueOfEnvVariable(variableName: string): Promise<string> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const response = await langClient.getConfigurableList();
            const envVariable = response.find(variable => variable.key === variableName);
            if (envVariable && envVariable.value != null && envVariable.value !== "") {
                resolve(envVariable.value);
            } else {
                resolve("");
            }
        });
    };

    async submitFeedback(params: SubmitFeedbackRequest): Promise<SubmitFeedbackResponse> {
        try {
            const { positive, messages, feedbackText } = params;
            
            // Get the feedback backend URL from environment
            const feedbackUrl = process.env.MI_COPILOT_FEEDBACK;
            
            if (!feedbackUrl) {
                console.warn('MI_COPILOT_FEEDBACK URL not configured');
                return {
                    success: false,
                    message: 'Feedback backend URL not configured'
                };
            }

            // Transform the messages into the format expected by the backend
            const chatHistory = messages.map((msg, index) => ({
                content: msg.content,
                role: msg.role === 'user' ? 'user' : 'assistant',
                message_order: index + 1,
                command: msg.command ?? 'chat'
            }));

            // Create the payload matching the backend's AnalyticsPayload format
            const payload = {
                positive,
                comment: feedbackText || '',
                chat_history: chatHistory
            };

            // Send the feedback to the backend
            const response = await axios.post(feedbackUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.status === 200) {
                return {
                    success: true,
                    message: 'Feedback submitted successfully'
                };
            } else {
                console.error('Failed to submit feedback, unexpected status:', response.status);
                return {
                    success: false,
                    message: `Failed to submit feedback: HTTP ${response.status}`
                };
            }

        } catch (error) {
            console.error('Error submitting feedback:', error);
            return {
                success: false,
                message: `Failed to submit feedback: ${(error as Error).message}`
            };
        } 
    }

    async getPomFileContent(): Promise<GetPomFileContentResponse> {
        return new Promise((resolve, reject) => {
            const pomPath = path.join(this.projectUri, 'pom.xml');
            fs.readFile(pomPath, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ content: data });
                }
            });
        });
    }

    async getExternalConnectorDetails(): Promise<GetExternalConnectorDetailsResponse> {
        return new Promise((resolve, reject) => {
            const connectorsPath = path.join(this.projectUri, 'src', 'main', 'wso2mi', 'resources', 'connectors');

            fs.readdir(connectorsPath, { withFileTypes: true }, (err, entries) => {
                if (err) {
                    // If directory doesn't exist or can't be read, return empty array
                    resolve({ connectors: [] });
                } else {
                    // Filter only zip files and get their names without extension
                    const connectorNames = entries
                        .filter(entry => entry.isFile() && entry.name.endsWith('.zip'))
                        .map(entry => entry.name.replace('.zip', ''));

                    resolve({ connectors: connectorNames });
                }
            });
        });
    }

    async getMockServices(): Promise<GetMockServicesResponse> {
        return new Promise(async (resolve) => {
            const mockServices: string[] = [];
            const mockServiceNames: string[] = [];

            if (workspace.workspaceFolders) {
                const mockServicesDirPath = path.join(this.projectUri, 'src', 'test', 'resources', 'mock-services');

                if (fs.existsSync(mockServicesDirPath)) {
                    try {
                        const files = fs.readdirSync(mockServicesDirPath);

                        for (const file of files) {
                            if (file.endsWith('.xml')) {
                                const filePath = path.join(mockServicesDirPath, file);
                                try {
                                    const content = fs.readFileSync(filePath, 'utf8');
                                    const fileName = path.parse(file).name;

                                    mockServices.push(content);
                                    mockServiceNames.push(fileName);
                                } catch (error) {
                                    console.error(`Error reading mock service file ${filePath}:`, error);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Error reading mock services directory ${mockServicesDirPath}:`, error);
                    }
                }
            }

            return resolve({
                mockServices,
                mockServiceNames
            });
        });
    }

    async updatePropertiesInArtifactXML(params: UpdateRegistryPropertyRequest): Promise<string> {
        const possibleArtifactXMLPaths = [
            path.join(this.projectUri, "src", "main", "wso2mi", "resources", "artifact.xml"),
            path.join(this.projectUri, "src", "main", "wso2mi", "resources", "registry", "artifact.xml")
        ];

        let updatedXml = "";

        for (const filePath of possibleArtifactXMLPaths) {
            if (!fs.existsSync(filePath)) {
                continue;
            }

            const xmlData = fs.readFileSync(filePath, "utf8");
            const parsed = await parseStringPromise(xmlData);

            let registryResourceFound = false;
            parsed.artifacts.artifact.forEach((artifact: any) => {
                const fileName = artifact.item[0].file[0];
                if (params.targetFile.endsWith(generatePathFromRegistryPath(artifact.item[0].path[0], fileName))) {
                    registryResourceFound = true;
                    if (params.properties.length === 0) {
                        artifact.item[0].properties = [""];
                    } else {
                        artifact.item[0].properties = [
                            {
                                property: params.properties.map(p => ({
                                    $: { key: p.key, value: p.value }
                                }))
                            }
                        ];
                    }
                }
            });

            if (registryResourceFound) {
                const builder = new Builder({ xmldec: { version: "1.0", encoding: "UTF-8" } });
                updatedXml = builder.buildObject(parsed);
                await replaceFullContentToFile(filePath, updatedXml);
                break;
            }
        }
        return updatedXml;
    }

    async getPropertiesFromArtifactXML(targetFile: string): Promise<Property[] | undefined> {
        if (!targetFile) {
            await window.showInformationMessage(
                "Registry properties cannot be added to the selected resource.",
                { modal: true }
            );
            return undefined;
        }

        const possibleArtifactXMLPaths = [
            path.join(this.projectUri, "src", "main", "wso2mi", "resources", "artifact.xml"),
            path.join(this.projectUri, "src", "main", "wso2mi", "resources", "registry", "artifact.xml")
        ];

        for (const filePath of possibleArtifactXMLPaths) {
            if (!fs.existsSync(filePath)) {
                continue;
            }

            const xmlData = fs.readFileSync(filePath, "utf8");
            const parsed = await parseStringPromise(xmlData);

            for (const artifact of parsed.artifacts.artifact) {
                const fileName = artifact.item[0].file[0];
                if (targetFile.endsWith(generatePathFromRegistryPath(artifact.item[0].path[0], fileName))) {
                    const propertiesBlock = artifact.item[0].properties?.[0];

                    if (!propertiesBlock || !propertiesBlock.property) {
                        return [];
                    }

                    return propertiesBlock.property.map((prop: any) => ({
                        key: prop.$.key,
                        value: prop.$.value
                    }));
                }
            }
        }

        await window.showInformationMessage(
            "Registry properties cannot be added to the selected resource.",
            { modal: true }
        );
        return undefined;
    }

    async getInputOutputMappings(params: GenerateMappingsParamsRequest): Promise<string[]> {
        return new Promise(async (resolve) => {
            const langClient = await MILanguageClient.getInstance(this.projectUri);
            const res = await langClient.getInputOutputMappings(params);
            resolve(res);
        });
    }
}

async function exposeVersionedServices(projectUri: string): Promise<boolean> {
    const langClient = await MILanguageClient.getInstance(projectUri);
    const projectDetailsRes = await langClient?.getProjectDetails();
    const isVersionedDeploymentEnabled = projectDetailsRes?.buildDetails?.versionedDeployment?.value;
    if (!isVersionedDeploymentEnabled) {
        return false;
    }
    const config = vscode.workspace.getConfiguration('MI', vscode.Uri.file(projectUri));
    const serverPath = config.get<string>('SERVER_PATH') || undefined;
    const configPath = serverPath ? path.join(serverPath, 'conf', 'deployment.toml') : '';
    if (!fs.existsSync(configPath)) {
        console.error(`Failed to find deployment configuration file at: ${configPath}`);
        return false;
    }
    const fileContent = fs.readFileSync(configPath, "utf8");
    const lines = fileContent.split(/\r?\n/);
    for (let rawLine of lines) {
        let line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const match = line.match(/^['"]?expose\.versioned\.services['"]?\s*=\s*(.+)$/i);
        if (match) {
            let value = match[1].trim();
            value = value.replace(/^["']|["']$/g, "");
            if (value.toLowerCase() === "true") return true;
            return false;
        }
    }
    return false;
}

export function getRepoRoot(projectRoot: string): string | undefined {
    // traverse up the directory tree until .git directory is found
    const gitDir = path.join(projectRoot, ".git");
    if (fs.existsSync(gitDir)) {
        return projectRoot;
    }
    // path is root return undefined
    if (projectRoot === path.parse(projectRoot).root) {
        return undefined;
    }
    return getRepoRoot(path.join(projectRoot, ".."));
}

export async function askProjectPath() {
    return await window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: Uri.file(os.homedir()),
        title: "Select a folder to create the Project"
    });
}

export async function askDriverPath() {
    return await window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: Uri.file(os.homedir()),
        title: "Select a driver"
    });
}

export async function askImportProjectPath() {
    return await window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: Uri.file(os.homedir()),
        filters: { 'CAPP': ['car', 'zip'] },
        title: "Select the car file to import"
    });
}

export async function askFilePath() {
    return await window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: Uri.file(os.homedir()),
        title: "Select a file",
    });
}

export async function askImportFileDir() {
    return await window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: Uri.file(os.homedir()),
        title: "Select a file to import",
        filters: { 'ATF': ['xml', 'dbs'] }
    });
}
