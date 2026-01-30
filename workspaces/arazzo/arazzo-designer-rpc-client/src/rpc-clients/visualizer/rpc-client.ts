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
    VisualizerAPI,
    GetOpenAPIContentRequest,
    GetOpenAPIContentResponse,
    GetArazzoModelRequest,
    GetArazzoModelResponse,
    GoToSourceRequest,
    HistoryEntry,
    HistoryEntryResponse,
    OpenViewRequest,
    WriteOpenAPIContentRequest,
    WriteOpenAPIContentResponse,
    addToHistory,
    getHistory,
    getOpenApiContent,
    getArazzoModel,
    goBack,
    goHome,
    goToSource,
    importJSON,
    openView,
    writeOpenApiContent,
    Schema
} from "@wso2/arazzo-designer-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class VisualizerRpcClient implements VisualizerAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    openView(params: OpenViewRequest): void {
        return this._messenger.sendNotification(openView, HOST_EXTENSION, params);
    }

    goBack(): void {
        return this._messenger.sendNotification(goBack, HOST_EXTENSION);
    }

    getHistory(): Promise<HistoryEntryResponse> {
        return this._messenger.sendRequest(getHistory, HOST_EXTENSION);
    }

    addToHistory(params: HistoryEntry): void {
        return this._messenger.sendNotification(addToHistory, HOST_EXTENSION, params);
    }

    goHome(): void {
        return this._messenger.sendNotification(goHome, HOST_EXTENSION);
    }

    goToSource(params: GoToSourceRequest): void {
        return this._messenger.sendNotification(goToSource, HOST_EXTENSION, params);
    }

    getOpenApiContent(params: GetOpenAPIContentRequest): Promise<GetOpenAPIContentResponse> {
        return this._messenger.sendRequest(getOpenApiContent, HOST_EXTENSION, params);
    }

    writeOpenApiContent(params: WriteOpenAPIContentRequest): Promise<WriteOpenAPIContentResponse> {
        return this._messenger.sendRequest(writeOpenApiContent, HOST_EXTENSION, params);
    }

    importJSON(): Promise<Schema | undefined> {
        return this._messenger.sendRequest(importJSON, HOST_EXTENSION);
    }

    getArazzoModel(params: GetArazzoModelRequest): Promise<GetArazzoModelResponse> {
        return this._messenger.sendRequest(getArazzoModel, HOST_EXTENSION, params);
    }
}
