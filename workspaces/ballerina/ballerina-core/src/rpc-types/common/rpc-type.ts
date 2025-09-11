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
    BallerinaDiagnosticsRequest,
    BallerinaDiagnosticsResponse,
    CommandsRequest,
    CommandsResponse,
    GoToSourceRequest,
    OpenExternalUrlRequest,
    FileOrDirResponse,
    RunExternalCommandRequest,
    RunExternalCommandResponse,
    TypeResponse,
    WorkspaceFileRequest,
    WorkspacesFileResponse,
    FileOrDirRequest,
    WorkspaceRootResponse,
    ShowErrorMessageRequest
} from "./interfaces";
import { RequestType, NotificationType } from "vscode-messenger-common";

const _preFix = "common";
export const getTypeCompletions: RequestType<void, TypeResponse> = { method: `${_preFix}/getTypeCompletions` };
export const goToSource: NotificationType<GoToSourceRequest> = { method: `${_preFix}/goToSource` };
export const getWorkspaceFiles: RequestType<WorkspaceFileRequest, WorkspacesFileResponse> = { method: `${_preFix}/getWorkspaceFiles` };
export const getBallerinaDiagnostics: RequestType<BallerinaDiagnosticsRequest, BallerinaDiagnosticsResponse> = { method: `${_preFix}/getBallerinaDiagnostics` };
export const executeCommand: RequestType<CommandsRequest, CommandsResponse> = { method: `${_preFix}/executeCommand` };
export const runBackgroundTerminalCommand: RequestType<RunExternalCommandRequest, RunExternalCommandResponse> = { method: `${_preFix}/runBackgroundTerminalCommand` };
export const openExternalUrl: NotificationType<OpenExternalUrlRequest> = { method: `${_preFix}/openExternalUrl` };
export const selectFileOrDirPath: RequestType<FileOrDirRequest, FileOrDirResponse> = { method: `${_preFix}/selectFileOrDirPath` };
export const selectFileOrFolderPath: RequestType<void, FileOrDirResponse> = { method: `${_preFix}/selectFileOrFolderPath` };
export const experimentalEnabled: RequestType<void, boolean> = { method: `${_preFix}/experimentalEnabled` };
export const isNPSupported: RequestType<void, boolean> = { method: `${_preFix}/isNPSupported` };
export const getWorkspaceRoot: RequestType<void, WorkspaceRootResponse> = { method: `${_preFix}/getWorkspaceRoot` };
export const showErrorMessage: NotificationType<ShowErrorMessageRequest> = { method: `${_preFix}/showErrorMessage` };
export const getCurrentProjectTomlValues: RequestType<void, void> = { method: `${_preFix}/getCurrentProjectTomlValues` };
