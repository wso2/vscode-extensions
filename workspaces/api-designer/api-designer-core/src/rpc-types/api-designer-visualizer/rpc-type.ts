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
import { HistoryEntry } from "../../history";
import {
    OpenViewRequest,
    HistoryEntryResponse,
    GoToSourceRequest,
    GetOpenAPIContentRequest,
    GetOpenAPIContentResponse,
    WriteOpenAPIContentResponse,
    WriteOpenAPIContentRequest,
} from "./types";
import { NotificationType, RequestType } from "vscode-messenger-common";

const _preFix = "api-designer-visualizer";
export const openView: NotificationType<OpenViewRequest> = { method: `${_preFix}/openView` };
export const goBack: NotificationType<void> = { method: `${_preFix}/goBack` };
export const getHistory: RequestType<void, HistoryEntryResponse> = { method: `${_preFix}/getHistory` };
export const addToHistory: NotificationType<HistoryEntry> = { method: `${_preFix}/addToHistory` };
export const goHome: NotificationType<void> = { method: `${_preFix}/goHome` };
export const goToSource: NotificationType<GoToSourceRequest> = { method: `${_preFix}/goToSource` };
export const getOpenApiContent: RequestType<GetOpenAPIContentRequest, GetOpenAPIContentResponse> = { method: `${_preFix}/getOpenApiContent` };
export const writeOpenApiContent: RequestType<WriteOpenAPIContentRequest, WriteOpenAPIContentResponse> = { method: `${_preFix}/writeOpenApiContent` };
export const importJSON: NotificationType<void> = { method: `${_preFix}/importJSON` };
