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
    ColorThemeKind,
    HistoryEntry,
    OpenViewRequest,
    UpdateUndoRedoMangerRequest,
    VisualizerAPI,
    addToHistory,
    addToUndoStack,
    getThemeKind,
    getHistory,
    goBack,
    goHome,
    goSelected,
    openView,
    redo,
    undo,
    updateUndoRedoManager
} from "@wso2/ballerina-core";
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

    async getHistory(): Promise<HistoryEntry[]> {
        return this._messenger.sendRequest(getHistory, HOST_EXTENSION);
    }

    addToHistory(entry: HistoryEntry): void {
        return this._messenger.sendNotification(addToHistory, HOST_EXTENSION, entry);
    }

    goBack(): void {
        return this._messenger.sendNotification(goBack, HOST_EXTENSION);
    }

    goHome(): void {
        return this._messenger.sendNotification(goHome, HOST_EXTENSION);
    }

    goSelected(index: number): void {
        return this._messenger.sendNotification(goSelected, HOST_EXTENSION, index);
    }

    undo(): Promise<string> {
        return this._messenger.sendRequest(undo, HOST_EXTENSION);
    }

    redo(): Promise<string> {
        return this._messenger.sendRequest(redo, HOST_EXTENSION);
    }

    addToUndoStack(source: string): void {
        return this._messenger.sendNotification(addToUndoStack, HOST_EXTENSION, source);
    }

    updateUndoRedoManager(params: UpdateUndoRedoMangerRequest): void {
        return this._messenger.sendNotification(updateUndoRedoManager, HOST_EXTENSION, params);
    }

    getThemeKind(): Promise<ColorThemeKind> {
        return this._messenger.sendRequest(getThemeKind, HOST_EXTENSION);
    }
}
