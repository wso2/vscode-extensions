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
import { MachineStateValue, stateChanged, vscode, getVisualizerState, VisualizerLocation, webviewReady, onFileContentUpdate, PopupMachineStateValue, popupStateChanged, PopupVisualizerLocation, getPopupVisualizerState, onParentPopupSubmitted, ParentPopupData, APIDesignerVisualizerAPI, SelectQuickPickItemReq, WebviewQuickPickItem, selectQuickPickItem, selectQuickPickItems, showConfirmMessage, ShowConfirmBoxReq, showInputBox, ShowWebviewInputBoxReq, showInfoNotification, showErrorNotification  } from "@wso2/api-designer-core";
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
}

