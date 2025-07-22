/* eslint-disable @typescript-eslint/no-explicit-any */
 
/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { MachineStateValue, stateChanged, vscode, getVisualizerState, VisualizerLocation, webviewReady, DownloadProgressData, onDownloadProgress  } from "@wso2/si-core";
import { Messenger } from "vscode-messenger-webview";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { SiVisualizerRpcClient } from "./rpc-clients/si-visualizer/rpc-client";

export class RpcClient {

    private messenger: Messenger;
    private _visualizer: SiVisualizerRpcClient;

    constructor() {
        this.messenger = new Messenger(vscode);
        this.messenger.start();
        this._visualizer = new SiVisualizerRpcClient(this.messenger);
    }


    getSiVisualizerRpcClient(): SiVisualizerRpcClient {
        return this._visualizer;
    }

    onStateChanged(callback: (state: MachineStateValue) => void) {
        this.messenger.onNotification(stateChanged, callback);
    }

    getVisualizerState(): Promise<VisualizerLocation> {
        return this.messenger.sendRequest(getVisualizerState, HOST_EXTENSION);
    }

    onDownloadProgress(callback: (data: DownloadProgressData) => void) {
        this.messenger.onNotification(onDownloadProgress, callback);
    }
    
    webviewReady(): void {
        this.messenger.sendNotification(webviewReady, HOST_EXTENSION);
    }
}

