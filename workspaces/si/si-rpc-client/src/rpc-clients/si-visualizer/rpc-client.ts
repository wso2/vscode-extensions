/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import {
    downloadJavaFromSI,
    downloadSI,
    DownloadSIRequest,
    SIVisualizerAPI,
    OpenExternalRequest,
    OpenExternalResponse,
    openExternal,
    OpenViewRequest,
    openView,
    SetupDetails,
    getSetupDetails,
    selectFolder,
    PathDetailsResponse,
    SetPathRequest,
    setPathsInConfiguration,
    createNewSiddhiFile,
    getEULALicense
} from "@wso2/si-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class SiVisualizerRpcClient implements SIVisualizerAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    downloadJavaFromSI(params: string): Promise<string> {
        return this._messenger.sendRequest(downloadJavaFromSI, HOST_EXTENSION, params);
    }

    downloadSI(params: DownloadSIRequest): Promise<string> {
        return this._messenger.sendRequest(downloadSI, HOST_EXTENSION, params);
    }

    openExternal(params: OpenExternalRequest): Promise<OpenExternalResponse> {
        return this._messenger.sendRequest(openExternal, HOST_EXTENSION, params);
    }

    openView(params: OpenViewRequest): void {
        return this._messenger.sendNotification(openView, HOST_EXTENSION, params);
    }

    getSetupDetails(): Promise<SetupDetails> {
        return this._messenger.sendRequest(getSetupDetails, HOST_EXTENSION);
    }

    selectFolder(params:string): Promise<string|undefined> {
        return this._messenger.sendRequest(selectFolder, HOST_EXTENSION, params);
    }

    setPathsInConfiguration(params: SetPathRequest): Promise<PathDetailsResponse> {
        return this._messenger.sendRequest(setPathsInConfiguration, HOST_EXTENSION, params);
    }

    createNewSiddhiFile(): Promise<PathDetailsResponse> {
        return this._messenger.sendRequest(createNewSiddhiFile, HOST_EXTENSION);
    }

    getEULALicense(): Promise<string> {
        return this._messenger.sendRequest(getEULALicense, HOST_EXTENSION);
    }
}