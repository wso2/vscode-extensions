/* eslint-disable @typescript-eslint/no-explicit-any */
 
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
import { MachineStateValue, stateChanged, vscode, getVisualizerState, getAIVisualizerState, VisualizerLocation, AIVisualizerLocation, webviewReady, onFileContentUpdate, AI_EVENT_TYPE, sendAIStateEvent, AIMachineStateValue, AIMachineSendableEvent, aiStateChanged, themeChanged, ColorThemeKind, PopupMachineStateValue, popupStateChanged, PopupVisualizerLocation, getPopupVisualizerState, onParentPopupSubmitted, ParentPopupData, ConnectorStatus, onConnectorStatusUpdate, onDocumentSave, Document, SwaggerData, DownloadProgressData, onSwaggerSpecReceived, MiServerRunStatus, miServerRunStateChanged, onDownloadProgress, codeGenerationEvent, CodeGenerationEvent, agentEvent, AgentEvent  } from "@wso2/mi-core";
import { MiDiagramRpcClient } from "./rpc-clients/mi-diagram/rpc-client";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { MiVisualizerRpcClient } from "./rpc-clients/mi-visualizer/rpc-client";
import { MiDataMapperRpcClient } from "./rpc-clients/mi-data-mapper/rpc-client";
import { MiDebuggerRpcClient } from "./rpc-clients/mi-debugger/rpc-client";
import { MiAiPanelRpcClient } from "./rpc-clients/ai-features/rpc-client";
import { MiAgentPanelRpcClient } from "./rpc-clients/agent-mode/rpc-client";

export class RpcClient {

    private messenger: Messenger;
    private _diagram: MiDiagramRpcClient;
    private _visualizer: MiVisualizerRpcClient;
    private _dataMapper: MiDataMapperRpcClient;
    private _debugger: MiDebuggerRpcClient;
    private _aiPanel: MiAiPanelRpcClient;
    private _agentPanel: MiAgentPanelRpcClient;

    constructor() {
        this.messenger = new Messenger(vscode);
        this.messenger.start();
        this._diagram = new MiDiagramRpcClient(this.messenger);
        this._visualizer = new MiVisualizerRpcClient(this.messenger);
        this._dataMapper = new MiDataMapperRpcClient(this.messenger);
        this._debugger = new MiDebuggerRpcClient(this.messenger);
        this._aiPanel = new MiAiPanelRpcClient(this.messenger);
        this._agentPanel = new MiAgentPanelRpcClient(this.messenger);
    }

    getMiDiagramRpcClient(): MiDiagramRpcClient {
        return this._diagram;
    }

    getMiVisualizerRpcClient(): MiVisualizerRpcClient {
        return this._visualizer;
    }

    getMiDataMapperRpcClient(): MiDataMapperRpcClient {
        return this._dataMapper;
    }

    getMiDebuggerRpcClient(): MiDebuggerRpcClient {
        return this._debugger;
    }

    getMiAiPanelRpcClient(): MiAiPanelRpcClient {
        return this._aiPanel;
    }

    getMiAgentPanelRpcClient(): MiAgentPanelRpcClient {
        return this._agentPanel;
    }

    onStateChanged(callback: (state: MachineStateValue) => void) {
        this.messenger.onNotification(stateChanged, callback);
    }

    onAIStateChanged(callback: (state: AIMachineStateValue) => void) {
        this.messenger.onNotification(aiStateChanged, callback);
    }

    onMiServerRunStateChanged(callback: (state: MiServerRunStatus) => void) {
        this.messenger.onNotification(miServerRunStateChanged, callback);
    }

    onPopupStateChanged(callback: (state: PopupMachineStateValue) => void) {
        this.messenger.onNotification(popupStateChanged, callback);
    }

    onThemeChanged(callback: (kind: ColorThemeKind) => void) {
        this.messenger.onNotification(themeChanged, callback);

    }

    getVisualizerState(): Promise<VisualizerLocation> {
        return this.messenger.sendRequest(getVisualizerState, HOST_EXTENSION);
    }

    getAIVisualizerState(): Promise<AIVisualizerLocation> {
        return this.messenger.sendRequest(getAIVisualizerState, HOST_EXTENSION);
    }

    getPopupVisualizerState(): Promise<PopupVisualizerLocation> {
        return this.messenger.sendRequest(getPopupVisualizerState, HOST_EXTENSION);
    }

    sendAIStateEvent(event: AI_EVENT_TYPE | AIMachineSendableEvent) {
        this.messenger.sendRequest(sendAIStateEvent, HOST_EXTENSION, event);
    }

    onFileContentUpdate(callback: () => void): void {
        this.messenger.onNotification(onFileContentUpdate, callback);
    }

    onSwaggerSpecReceived(callback: (data: SwaggerData) => void) {
        this.messenger.onNotification(onSwaggerSpecReceived, callback);
    }

    onDownloadProgress(callback: (data: DownloadProgressData) => void) {
        this.messenger.onNotification(onDownloadProgress, callback);
    }
    
    webviewReady(): void {
        this.messenger.sendNotification(webviewReady, HOST_EXTENSION);
    }

    onParentPopupSubmitted(callback: (parent: ParentPopupData) => void) {
        this.messenger.onNotification(onParentPopupSubmitted, callback);
    }

    onConnectorStatusUpdate(callback: (status: ConnectorStatus) => void) {
        this.messenger.onNotification(onConnectorStatusUpdate, callback);
    }

    onDocumentSave(callback: (document: Document) => void) {
        this.messenger.onNotification(onDocumentSave, callback);
    }

    onCodeGenerationEvent(callback: (event: CodeGenerationEvent) => void) {
        this.messenger.onNotification(codeGenerationEvent, callback);
    }

    onAgentEvent(callback: (event: AgentEvent) => void) {
        this.messenger.onNotification(agentEvent, callback);
    }
}

