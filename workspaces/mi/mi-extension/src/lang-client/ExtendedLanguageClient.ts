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
    GetAvailableResourcesRequest,
    GetAvailableResourcesResponse,
    GetBreakpointInfoRequest,
    GetBreakpointInfoResponse,
    GetDefinitionRequest,
    GetDefinitionResponse,
    GetDiagnosticsReqeust,
    GetDiagnosticsResponse,
    ProjectStructureResponse,
    GetAvailableConnectorRequest,
    GetAvailableConnectorResponse,
    UpdateConnectorRequest,
    GetConnectorConnectionsRequest,
    GetConnectorConnectionsResponse,
    ValidateBreakpointsRequest,
    ValidateBreakpointsResponse,
    StepOverBreakpointRequest,
    StepOverBreakpointResponse,
    SchemaGenRequest,
    SchemaGenResponse,
    onConnectorStatusUpdate,
    GenerateAPIRequest,
    GenerateAPIResponse,
    SwaggerFromAPIRequest,
    TestDbConnectionRequest,
    TestDbConnectionResponse,
    SchemaGenFromContentRequest,
    SaveInboundEPUischemaRequest,
    GetInboundEPUischemaRequest,
    GetInboundEPUischemaResponse,
    AddDriverRequest,
    DSSQueryGenRequest,
    DSSQueryGenResponse,
    MediatorTryOutRequest,
    MediatorTryOutResponse,
    GetMediatorsRequest,
    GetMediatorsResponse,
    GetMediatorRequest,
    GetMediatorResponse,
    UpdateMediatorRequest,
    UpdateMediatorResponse,
    ExpressionCompletionsRequest,
    ExpressionCompletionsResponse,
    GetConnectionSchemaRequest,
    GetConnectionSchemaResponse,
    GenerateConnectorRequest,
    GenerateConnectorResponse,
    UpdatePropertiesRequest,
    UpdatePropertiesResponse,
    UpdateDependenciesResponse,
    UpdateDependenciesRequest,
    GetHelperPaneInfoResponse,
    GetHelperPaneInfoRequest,
    TestConnectorConnectionRequest,
    TestConnectorConnectionResponse,
    CheckDBDriverResponse,
    RemoveDBDriverResponse,
    LocalInboundConnectorsResponse,
    XmlCode,
    UpdateAiDependenciesResponse,
    UpdateAiDependenciesRequest,
    MavenDeployPluginDetails,
    DependencyStatusResponse,
    GenerateMappingsParamsRequest,
    McpToolsRequest,
    McpToolsResponse
} from "@wso2/mi-core";
import { readFileSync } from "fs";
import { CancellationToken, FormattingOptions, Position, Uri, workspace } from "vscode";
import { CompletionParams, LanguageClient, LanguageClientOptions, ServerOptions, TextEdit } from "vscode-languageclient/node";
import { TextDocumentIdentifier, CodeAction, CodeActionParams } from "vscode-languageserver-protocol";
import * as fs from 'fs';
import * as vscode from 'vscode';
import { RPCLayer } from "../RPCLayer";
import { VisualizerWebview } from "../visualizer/webview";
import { Range } from "../../../syntax-tree/lib/src";

export interface GetSyntaxTreeParams {
    documentIdentifier: TextDocumentIdentifier;
}

export interface GetSyntaxTreeResponse {
    syntaxTree: any;
    defFilePath: string;
}

export interface GetCompletionParams {
    textDocument: {
        fsPath: string,
        uri: string;
    };
    offset: number;
    context: {
        triggerKind: any;
    };
}

export interface CompletionResponse {
    detail: string;
    insertText: string;
    insertTextFormat: number;
    kind: number;
    label: string;
    additionalTextEdits?: TextEdit[];
    documentation?: string;
    sortText?: string;
    filterText?: string;
    textEdit?: TextEdit;
}

export interface LogSnippetCompletionRequest {
    logLevel: string;
    logCategory?: string;
    logSeparator?: string;
    description?: string;
    properties?: any;
}

export interface LogSnippet {
    snippet: string;
}

export interface DidOpenParams {
    textDocument: {
        uri: string;
        languageId: string;
        text: string;
        version: number;
    };
}

export interface RangeFormatParams {
    textDocument: TextDocumentIdentifier;
    range: Range;
    options: FormattingOptions;
    workDoneToken?: CancellationToken;
}

export interface ArtifactType {
    artifactType: string;
    artifactFolder: string;
}

export class ExtendedLanguageClient extends LanguageClient {

    constructor(id: string, name: string, private projectUri: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions) {
        super(id, name, serverOptions, clientOptions);

        this.onNotification("synapse/addConnectorStatus", (connectorStatus: any) => {
            // Notify the visualizer
            RPCLayer._messengers.get(this.projectUri)?.sendNotification(onConnectorStatusUpdate, { type: 'webview', webviewType: VisualizerWebview.viewType }, connectorStatus);
        });
    }

    async getSyntaxTree(req: GetSyntaxTreeParams): Promise<GetSyntaxTreeResponse> {
        this.didOpen(req.documentIdentifier.uri);
        return this.sendRequest('synapse/syntaxTree', { uri: Uri.file(req.documentIdentifier.uri).toString() });
    }

    private async didOpen(fileUri: string): Promise<void> {
        if (fs.existsSync(fileUri) && fs.lstatSync(fileUri).isFile()) {
            const content: string = readFileSync(fileUri, { encoding: 'utf-8' });
            const didOpenParams = {
                textDocument: {
                    uri: Uri.file(fileUri).toString(),
                    languageId: 'xml',
                    version: 1,
                    text: content
                }
            };
            await this.sendNotification("textDocument/didOpen", didOpenParams);
        }
    }

    async getProjectStructure(path: string): Promise<ProjectStructureResponse> {
        return this.sendRequest('synapse/directoryTree', { uri: Uri.file(path).fsPath });
    }

    async getRegistryFiles(req: string): Promise<string[]> {
        return this.sendRequest("synapse/getRegistryFiles", { uri: Uri.file(req).toString() });
    }

    async getResourceFiles(): Promise<string[]> {
        return this.sendRequest("synapse/getResourceFiles");
    }

    async getConfigurableEntries(): Promise<{ name: string, type: string }[]> {
        return this.sendRequest("synapse/getConfigurableEntries");
    }

    async getResourceUsages(resourceFilePath: string): Promise<string[]> {
        return this.sendRequest("synapse/getResourceUsages", { resourceFilePath: resourceFilePath });
    }

    async getArifactFiles(req: string): Promise<string[]> {
        return this.sendRequest("synapse/getArtifactFiles", { uri: Uri.file(req).toString() });
    }

    async getArtifactType(artifactFilePath: string): Promise<ArtifactType> {
        return this.sendRequest("synapse/getArtifactType", { uri: artifactFilePath });
    }

    async getDefinition(params: GetDefinitionRequest): Promise<GetDefinitionResponse> {
        const doc = params.document;
        doc.uri = Uri.file(doc.uri).toString();

        return this.sendRequest('synapse/definition', {
            textDocument: doc,
            position: params.position
        })
    }

    async getCompletion(params: GetCompletionParams): Promise<CompletionResponse[]> {
        let position: Position;
        const doc = await workspace.openTextDocument(Uri.file(params.textDocument.fsPath));
        position = doc.positionAt(params.offset + 1);
        const completionParams: CompletionParams = {
            textDocument: {
                uri: params.textDocument.uri
            },
            position: {
                character: position.character + 1,
                line: position.line
            },
            context: {
                triggerKind: params.context.triggerKind
            }
        }

        return this.sendRequest("textDocument/completion", completionParams);

    }

    async getSnippetCompletion(req: LogSnippetCompletionRequest): Promise<LogSnippet> {
        return this.sendRequest("xml/getSnippetCompletion", req);
    }

    async getAvailableResources(req: GetAvailableResourcesRequest): Promise<GetAvailableResourcesResponse> {
        let uri: string | undefined;
        if (req.documentIdentifier) {
            uri = Uri.file(req.documentIdentifier).toString();
        }
        return this.sendRequest("synapse/availableResources", { 
            documentIdentifier: { uri: uri }, resourceType: req.resourceType, 
            ...(req.isDebugFlow && { customProjectUri: req.documentIdentifier }) 
        });
    }

    async getDiagnostics(req: GetDiagnosticsReqeust): Promise<GetDiagnosticsResponse> {
        return this.sendRequest("synapse/diagnostic", { uri: Uri.file(req.documentUri).toString() });
    }

    async rangeFormat(req: RangeFormatParams): Promise<vscode.TextEdit[]> {
        return this.sendRequest("textDocument/rangeFormatting", req)
    }

    async getAvailableConnectors(req: GetAvailableConnectorRequest): Promise<GetAvailableConnectorResponse> {
        return this.sendRequest("synapse/availableConnectors", { documentIdentifier: { uri: Uri.file(req.documentUri).toString() }, "connectorName": req.connectorName });
    }

    async updateConnectors(req: UpdateConnectorRequest): Promise<void> {
        return this.sendNotification("synapse/updateConnectors", { uri: Uri.file(req.documentUri).toString() });
    }

    async getConnectorConnections(req: GetConnectorConnectionsRequest): Promise<GetConnectorConnectionsResponse> {
        return this.sendRequest("synapse/connectorConnections", { documentIdentifier: { uri: Uri.file(req.documentUri).toString() }, "connectorName": req.connectorName });
    }

    async saveInboundEPUischema(req: SaveInboundEPUischemaRequest): Promise<boolean> {
        return this.sendRequest("synapse/saveInboundConnectorSchema", { connectorName: req.connectorName, uiSchema: req.uiSchema });
    }

    async getInboundEPUischema(req: GetInboundEPUischemaRequest): Promise<GetInboundEPUischemaResponse> {
        return this.sendRequest("synapse/getInboundConnectorSchema", { documentPath: req.documentPath, connectorId: req.connectorName });
    }

    async validateBreakpoints(req: ValidateBreakpointsRequest): Promise<ValidateBreakpointsResponse> {
        return this.sendRequest("synapse/validateBreakpoints", req);
    }

    async getBreakpointInfo(req: GetBreakpointInfoRequest): Promise<GetBreakpointInfoResponse> {
        return this.sendRequest("synapse/getBreakpointInfo", req);
    }

    async getStepOverBreakpoint(req: StepOverBreakpointRequest): Promise<StepOverBreakpointResponse> {
        return this.sendRequest("synapse/stepOverBreakpoint", req);
    }

    async generateSchema(req: SchemaGenRequest): Promise<SchemaGenResponse> {
        return this.sendRequest("synapse/generateSchema", req);
    }

    async generateSchemaFromContent(req: SchemaGenFromContentRequest): Promise<SchemaGenResponse> {
        return this.sendRequest("synapse/generateSchemaFromContent", req);
    }

    async generateAPI(req: GenerateAPIRequest): Promise<GenerateAPIResponse> {
        return this.sendRequest("synapse/generateAPI", req);
    }

    async swaggerFromAPI(req: SwaggerFromAPIRequest): Promise<any> {
        return this.sendRequest("synapse/swaggerFromAPI", req);
    }

    async testDbConnection(req: TestDbConnectionRequest): Promise<TestDbConnectionResponse> {
        return this.sendRequest("synapse/testDBConnection", req);
    }

    async checkDBDriver(req: string): Promise<CheckDBDriverResponse> {
        return this.sendRequest("synapse/checkDBDriver", { className: req });
    }

    async addDBDriver(req: AddDriverRequest): Promise<boolean> {
        return this.sendRequest("synapse/addDBDriver", req);
    }

    async removeDBDriver(req: AddDriverRequest): Promise<boolean> {
        return this.sendRequest("synapse/removeDBDriver", req);
    }

    async modifyDBDriver(req: AddDriverRequest): Promise<boolean> {
        return this.sendRequest("synapse/modifyDBDriver", req);
    }

    async generateQueries(req: DSSQueryGenRequest): Promise<string> {
        return this.sendRequest("synapse/generateQueries", req);
    }

    async fetchTables(req: DSSQueryGenRequest): Promise<DSSQueryGenResponse> {
        return this.sendRequest("synapse/fetchTables", req);
    }

    async getOverviewModel(): Promise<any> {
        return this.sendRequest("synapse/getOverviewModel");
    }

    async getProjectExplorerModel(path: string): Promise<any> {
        return this.sendRequest('synapse/getProjectExplorerModel', { uri: Uri.file(path).fsPath });
    }

    async getProjectIntegrationType(path: string): Promise<any> {
        return this.sendRequest('synapse/getProjectIntegrationType', { uri: Uri.file(path).fsPath });
    }

    async updateProperties(req: UpdatePropertiesRequest): Promise<UpdatePropertiesResponse> {
        return this.sendRequest('synapse/updateProperty', req);
    }

    async updateDependencies(req: UpdateDependenciesRequest): Promise<UpdateDependenciesResponse> {
        return this.sendRequest('synapse/updateDependency', req);
    }

    async updateConnectorDependencies(): Promise<string> {
        return this.sendRequest('synapse/updateConnectorDependencies');
    }

    async loadDependentCAppResources(): Promise<string> {
        return this.sendRequest('synapse/loadDependentResources');
    }

    async getProjectDetails(): Promise<any> {
        return this.sendRequest('synapse/getOverviewPageDetails');
    }

    async setDeployPlugin(req: MavenDeployPluginDetails): Promise<any> {
        return this.sendRequest('synapse/updateMavenDeployPlugin', req);
    }

    async getDeployPluginDetails(): Promise<any> {
        return this.sendRequest('synapse/getMavenDeployPluginDetails');
    }

    async removeDeployPlugin(): Promise<any> {
        return this.sendRequest('synapse/removeMavenDeployPlugin');
    }

    async getSequencePath(sequenceName: string): Promise<string | undefined> {
        return new Promise(async (resolve) => {
            const resp = await this.getProjectStructure(this.projectUri);
            const sequences = resp.directoryMap.src.main.wso2mi.artifacts.sequences;
            const match = sequences.find((sequence: any) => sequence.name === sequenceName);
            resolve(match ? match.path : undefined);

            resolve(undefined);
        });
    }

    async tryOutMediator(req: MediatorTryOutRequest): Promise<MediatorTryOutResponse> {
        return this.sendRequest("synapse/tryOutMediator", req);
    }

    async shutdownTryoutServer(): Promise<boolean> {
        return this.sendRequest("synapse/shutDownTryoutServer", {});
    }

    async getMediatorInputOutputSchema(req: MediatorTryOutRequest): Promise<MediatorTryOutResponse> {
        return this.sendRequest("synapse/mediatorInputOutputSchema", req);
    }

    async getMediators(request: GetMediatorsRequest): Promise<GetMediatorsResponse> {
        return this.sendRequest("synapse/getMediators", { documentIdentifier: { uri: Uri.file(request.documentUri).toString() }, position: request.position });
    }

    async getMediator(request: GetMediatorRequest): Promise<GetMediatorResponse> {
        if (request.isEdit) {
            return this.sendRequest("synapse/getMediatorUISchemaWithValues", { documentIdentifier: { uri: Uri.file(request.documentUri).toString() }, position: request.range.start });
        }
        return this.sendRequest("synapse/getMediatorUISchema", { mediatorType: request.mediatorType, documentIdentifier: { uri: Uri.file(request.documentUri).toString() }, position: request.range.start });
    }

    async getLocalInboundConnectors(): Promise<LocalInboundConnectorsResponse> {
        return this.sendRequest('synapse/getLocalInboundConnectors');
    }

    async getConnectionSchema(request: GetConnectionSchemaRequest): Promise<GetConnectionSchemaResponse> {
        if (request.documentUri) {
            return this.sendRequest("synapse/getConnectionUISchema", { documentUri: Uri.file(request.documentUri).toString(), });
        }

        return this.sendRequest("synapse/getConnectionUISchema", { connectorName: request.connectorName, connectionType: request.connectionType });
    }

    async generateSynapseConfig(request: UpdateMediatorRequest): Promise<UpdateMediatorResponse> {
        return this.sendRequest("synapse/generateSynapseConfig", request);
    }

    async getExpressionCompletions(req: ExpressionCompletionsRequest): Promise<ExpressionCompletionsResponse> {
        return this.sendRequest("synapse/expressionCompletion", req);
    }

    async generateConnector(req: GenerateConnectorRequest): Promise<GenerateConnectorResponse> {
        return this.sendRequest("synapse/generateConnector", req);
    }

    async getHelperPaneInfo(req: GetHelperPaneInfoRequest): Promise<GetHelperPaneInfoResponse> {
        return this.sendRequest("synapse/expressionHelperData", req);
    }

    async testConnectorConnection(req: TestConnectorConnectionRequest): Promise<TestConnectorConnectionResponse> {
        return this.sendRequest("synapse/testConnectorConnection", req);
    }

    async getCodeDiagnostics(req: XmlCode): Promise<GetDiagnosticsResponse> {
        return this.sendRequest("synapse/codeDiagnostic", req);
    }

    async updateAiDependencies(req: UpdateAiDependenciesRequest): Promise<UpdateAiDependenciesResponse> {
        return this.sendRequest('synapse/updateAiDependencies', req);
    }

    async pdfToImagesBase64(req: string): Promise<string[]> {
        return this.sendRequest('synapse/pdfToImagesBase64', {base64: req});
    }

    async getConfigurableList(): Promise<any[]> {
        return this.sendRequest('synapse/getConfigurableList');
    }

    async getDependencyStatusList(): Promise<DependencyStatusResponse> {
        return this.sendRequest('synapse/getDependencyStatusList');
    }

    async getInputOutputMappings(req: GenerateMappingsParamsRequest): Promise<string[]> {
        return this.sendRequest('synapse/getInputOutputMappings', req);
    }  
    
    async getMcpTools(req: McpToolsRequest): Promise<McpToolsResponse> {
        return this.sendRequest("synapse/getMCPTools", { connectionName: req.connectionName });
    }

    async getCodeActions(params: CodeActionParams): Promise<CodeAction[]> {
        return this.sendRequest("textDocument/codeAction", params);
    }
}
