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
import { RunCommandRequest, RunCommandResponse, FileOrDirRequest, FileOrDirResponse, WorkspaceRootResponse, GetConfigurationRequest, GetConfigurationResponse } from "../../types/rpc.types";
import { NotificationType, RequestType } from "vscode-messenger-common";

const _preFix = "main";
export const openBiExtension: NotificationType<void> = { method: `${_preFix}/openBiExtension` };
export const openMiExtension: NotificationType<void> = { method: `${_preFix}/openMiExtension` };
export const runCommand: RequestType<RunCommandRequest, RunCommandResponse> = { method: `${_preFix}/runCommand` };
export const selectFileOrDirPath: RequestType<FileOrDirRequest, FileOrDirResponse> = { method: `${_preFix}/selectFileOrDirPath` };
export const getWorkspaceRoot: RequestType<void, WorkspaceRootResponse> = { method: `${_preFix}/getWorkspaceRoot` };
export const getConfiguration: RequestType<GetConfigurationRequest, GetConfigurationResponse> = { method: `${_preFix}/getConfiguration` };
