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

import { Messenger } from "vscode-messenger-webview";
import { MachineStateValue, stateChanged, vscode, getVisualizerState, VisualizerLocation, webviewReady, onFileContentUpdate, PopupMachineStateValue, popupStateChanged, PopupVisualizerLocation, getPopupVisualizerState, onParentPopupSubmitted, ParentPopupData, APIDesignerVisualizerAPI, SelectQuickPickItemReq, WebviewQuickPickItem, selectQuickPickItem, selectQuickPickItems, showConfirmMessage, ShowConfirmBoxReq, showInputBox, ShowWebviewInputBoxReq, showInfoNotification, showErrorNotification, onDocumentFileChanged, DocumentFileChangedNotification, generateMockConfig, startMockServer, checkMockServerStatus, stopMockServer, getAvailablePort, GenerateMockConfigRequest, GenerateMockConfigResponse, StartMockServerRequest, StartMockServerResponse, CheckMockServerStatusRequest, CheckMockServerStatusResponse, StopMockServerRequest, StopMockServerResponse, GetAvailablePortRequest, GetAvailablePortResponse, executeTest, executeTestCollection, saveTestCollection, loadTestCollection, generateTestsFromOpenAPI, saveEnvironment, loadEnvironments, listTestCollections, aiGenerateTests, aiGenerateAssertions, aiGenerateTestData, exportToPostman, importFromPostman, saveProjectConfig, getProjectDetails, ExecuteTestRequest, ExecuteTestResponse, ExecuteTestCollectionRequest, ExecuteTestCollectionResponse, SaveTestCollectionRequest, SaveTestCollectionResponse, LoadTestCollectionRequest, LoadTestCollectionResponse, GenerateTestsFromOpenAPIRequest, GenerateTestsFromOpenAPIResponse, SaveEnvironmentRequest, SaveEnvironmentResponse, LoadEnvironmentsRequest, LoadEnvironmentsResponse, ListTestCollectionsRequest, ListTestCollectionsResponse, AIGenerateTestsRequest, AIGenerateTestsResponse, AIGenerateAssertionsRequest, AIGenerateAssertionsResponse, AIGenerateTestDataRequest, AIGenerateTestDataResponse, ExportToPostmanRequest, ExportToPostmanResponse, ImportFromPostmanRequest, ImportFromPostmanResponse, SaveProjectConfigRequest, SaveProjectConfigResponse, GetProjectDetailsRequest, GetProjectDetailsResponse  } from "@wso2/api-designer-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { ApiDesignerVisualizerRpcClient } from "./rpc-clients/api-designer-visualizer/rpc-client";

export class RpcClient {

    private messenger: Messenger;
    private _visualizer: APIDesignerVisualizerAPI;

    constructor() {
        this.messenger = new Messenger(vscode);
        this.messenger.start();
        this._visualizer = new ApiDesignerVisualizerRpcClient(this.messenger);
    }

    getApiDesignerVisualizerRpcClient(): APIDesignerVisualizerAPI {
        return this._visualizer;
    }

    onStateChanged(callback: (state: MachineStateValue) => void) {
        this.messenger.onNotification(stateChanged, callback);
    }

    onPopupStateChanged(callback: (state: PopupMachineStateValue) => void) {
        this.messenger.onNotification(popupStateChanged, callback);
    }

    getVisualizerState(): Promise<VisualizerLocation> {
        return this.messenger.sendRequest(getVisualizerState, HOST_EXTENSION);
    }

    getPopupVisualizerState(): Promise<PopupVisualizerLocation> {
        return this.messenger.sendRequest(getPopupVisualizerState, HOST_EXTENSION);
    }

    onFileContentUpdate(callback: () => void): void {
        this.messenger.onNotification(onFileContentUpdate, callback);
    }

    onDocumentFileChanged(callback: (notification: DocumentFileChangedNotification) => void): void {
        this.messenger.onNotification(onDocumentFileChanged, callback);
    }
    
    webviewReady(): void {
        this.messenger.sendNotification(webviewReady, HOST_EXTENSION);
    }

    onParentPopupSubmitted(callback: (parent: ParentPopupData) => void) {
        this.messenger.onNotification(onParentPopupSubmitted, callback);
    }

    selectQuickPickItem(params: SelectQuickPickItemReq): Promise<WebviewQuickPickItem | undefined> {
        return this.messenger.sendRequest(selectQuickPickItem, HOST_EXTENSION, params);
    }

    selectQuickPickItems(params: SelectQuickPickItemReq): Promise<WebviewQuickPickItem[] | undefined> {
        return this.messenger.sendRequest(selectQuickPickItems, HOST_EXTENSION, params);
    }

    showConfirmMessage(params: ShowConfirmBoxReq): Promise<boolean> {
        return this.messenger.sendRequest(showConfirmMessage, HOST_EXTENSION, params);
    }

    showInputBox(params: ShowWebviewInputBoxReq): Promise<string | undefined> {
        return this.messenger.sendRequest(showInputBox, HOST_EXTENSION, params);
    }

    showInfoNotification(message: string): void {
        this.messenger.sendNotification(showInfoNotification, HOST_EXTENSION, message);
    }

    showErrorNotification(message: string): void {
        this.messenger.sendNotification(showErrorNotification, HOST_EXTENSION, message);
    }

    getMessenger(): Messenger {
        return this.messenger;
    }

    // Copilot Assistant Method
    /**
     * Generate content using AI (GitHub Copilot)
     * @param context - The context/existing content (can be empty string)
     * @param prompt - The prompt/instructions for the AI
     * @returns AI-generated content
     */
    generateWithAI(context: string, prompt: string): Promise<Record<string, unknown>> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestType: any = { method: 'ai/generateWithAI' };
        return this.messenger.sendRequest(
            requestType,
            HOST_EXTENSION,
            { context, prompt }
        );
    }

    // Mock Server Methods
    generateMockConfig(request: GenerateMockConfigRequest): Promise<GenerateMockConfigResponse> {
        return this.messenger.sendRequest(generateMockConfig, HOST_EXTENSION, request);
    }

    startMockServer(request: StartMockServerRequest): Promise<StartMockServerResponse> {
        return this.messenger.sendRequest(startMockServer, HOST_EXTENSION, request);
    }

    checkMockServerStatus(request: CheckMockServerStatusRequest): Promise<CheckMockServerStatusResponse> {
        return this.messenger.sendRequest(checkMockServerStatus, HOST_EXTENSION, request);
    }

    stopMockServer(request: StopMockServerRequest): Promise<StopMockServerResponse> {
        return this.messenger.sendRequest(stopMockServer, HOST_EXTENSION, request);
    }

    getAvailablePort(request: GetAvailablePortRequest): Promise<GetAvailablePortResponse> {
        return this.messenger.sendRequest(getAvailablePort, HOST_EXTENSION, request);
    }

    // Test Methods
    executeTest(request: ExecuteTestRequest): Promise<ExecuteTestResponse> {
        return this.messenger.sendRequest(executeTest, HOST_EXTENSION, request);
    }

    executeTestCollection(request: ExecuteTestCollectionRequest): Promise<ExecuteTestCollectionResponse> {
        return this.messenger.sendRequest(executeTestCollection, HOST_EXTENSION, request);
    }

    saveTestCollection(request: SaveTestCollectionRequest): Promise<SaveTestCollectionResponse> {
        return this.messenger.sendRequest(saveTestCollection, HOST_EXTENSION, request);
    }

    loadTestCollection(request: LoadTestCollectionRequest): Promise<LoadTestCollectionResponse> {
        return this.messenger.sendRequest(loadTestCollection, HOST_EXTENSION, request);
    }

    generateTestsFromOpenAPI(request: GenerateTestsFromOpenAPIRequest): Promise<GenerateTestsFromOpenAPIResponse> {
        return this.messenger.sendRequest(generateTestsFromOpenAPI, HOST_EXTENSION, request);
    }

    saveEnvironment(request: SaveEnvironmentRequest): Promise<SaveEnvironmentResponse> {
        return this.messenger.sendRequest(saveEnvironment, HOST_EXTENSION, request);
    }

    loadEnvironments(request: LoadEnvironmentsRequest): Promise<LoadEnvironmentsResponse> {
        return this.messenger.sendRequest(loadEnvironments, HOST_EXTENSION, request);
    }

    listTestCollections(request: ListTestCollectionsRequest): Promise<ListTestCollectionsResponse> {
        return this.messenger.sendRequest(listTestCollections, HOST_EXTENSION, request);
    }

    // AI Test Methods
    aiGenerateTests(request: AIGenerateTestsRequest): Promise<AIGenerateTestsResponse> {
        return this.messenger.sendRequest(aiGenerateTests, HOST_EXTENSION, request);
    }

    aiGenerateAssertions(request: AIGenerateAssertionsRequest): Promise<AIGenerateAssertionsResponse> {
        return this.messenger.sendRequest(aiGenerateAssertions, HOST_EXTENSION, request);
    }

    aiGenerateTestData(request: AIGenerateTestDataRequest): Promise<AIGenerateTestDataResponse> {
        return this.messenger.sendRequest(aiGenerateTestData, HOST_EXTENSION, request);
    }

    exportToPostman(request: ExportToPostmanRequest): Promise<ExportToPostmanResponse> {
        return this.messenger.sendRequest(exportToPostman, HOST_EXTENSION, request);
    }

    importFromPostman(request: ImportFromPostmanRequest): Promise<ImportFromPostmanResponse> {
        return this.messenger.sendRequest(importFromPostman, HOST_EXTENSION, request);
    }

    saveProjectConfig(request: SaveProjectConfigRequest): Promise<SaveProjectConfigResponse> {
        return this.messenger.sendRequest(saveProjectConfig, HOST_EXTENSION, request);
    }

    getProjectDetails(request: GetProjectDetailsRequest): Promise<GetProjectDetailsResponse> {
        return this.messenger.sendRequest(getProjectDetails, HOST_EXTENSION, request);
    }
}

