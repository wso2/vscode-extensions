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
    getSetupDetails,
    selectFolder,
    setPathsInConfiguration,
    SetPathRequest,
    OpenExternalRequest,
    openExternal,
    createNewSiddhiFile,
    getEULALicense,
    openView,
    OpenViewRequest
} from "@wso2/si-core";
import { Messenger } from "vscode-messenger";
import { SiVisualizerRpcManager } from "./rpc-manager";

export function registerSiVisualizerRpcHandlers(messenger: Messenger) {
    const rpcManger = new SiVisualizerRpcManager();
    messenger.onRequest(downloadJavaFromSI, (args: string) => rpcManger.downloadJavaFromSI(args));
    messenger.onRequest(downloadSI, (args: DownloadSIRequest) => rpcManger.downloadSI(args));
    messenger.onRequest(getSetupDetails, () => rpcManger.getSetupDetails());
    messenger.onRequest(selectFolder, (args: string) => rpcManger.selectFolder(args));
    messenger.onRequest(setPathsInConfiguration, (args: SetPathRequest) => rpcManger.setPathsInConfiguration(args));
    messenger.onRequest(openExternal, (args: OpenExternalRequest) => rpcManger.openExternal(args));
    messenger.onRequest(createNewSiddhiFile, () => rpcManger.createNewSiddhiFile());
    messenger.onRequest(getEULALicense, () => rpcManger.getEULALicense());
    messenger.onNotification(openView, (args: OpenViewRequest) => rpcManger.openView(args));
}
