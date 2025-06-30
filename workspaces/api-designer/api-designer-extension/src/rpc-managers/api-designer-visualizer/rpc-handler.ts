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
    GetOpenAPIContentRequest,
    GoToSourceRequest,
    HistoryEntry,
    OpenViewRequest,
    WriteOpenAPIContentRequest,
    addToHistory,
    getHistory,
    getOpenApiContent,
    goBack,
    goHome,
    goToSource,
    importJSON,
    openView,
    writeOpenApiContent,
} from "@wso2/api-designer-core";
import { Messenger } from "vscode-messenger";
import { ApiDesignerVisualizerRpcManager } from "./rpc-manager";

export function registerApiDesignerVisualizerRpcHandlers(messenger: Messenger) {
    const rpcManger = new ApiDesignerVisualizerRpcManager();
    messenger.onNotification(openView, (args: OpenViewRequest) => rpcManger.openView(args));
    messenger.onNotification(goBack, () => rpcManger.goBack());
    messenger.onRequest(getHistory, () => rpcManger.getHistory());
    messenger.onNotification(addToHistory, (args: HistoryEntry) => rpcManger.addToHistory(args));
    messenger.onNotification(goHome, () => rpcManger.goHome());
    messenger.onNotification(goToSource, (args: GoToSourceRequest) => rpcManger.goToSource(args));
    messenger.onRequest(getOpenApiContent, (args: GetOpenAPIContentRequest) => rpcManger.getOpenApiContent(args));
    messenger.onRequest(writeOpenApiContent, (args: WriteOpenAPIContentRequest) => rpcManger.writeOpenApiContent(args));
    messenger.onRequest(importJSON, () => rpcManger.importJSON());
}
