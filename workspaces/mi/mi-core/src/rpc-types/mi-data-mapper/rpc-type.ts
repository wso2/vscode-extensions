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
    DMTypeRequest, 
    IOTypeResponse,
    SubMappingTypesResponse,
    UpdateFileContentRequest,
    GenerateDMInputRequest,
    GenerateDMInputResponse,
    BrowseSchemaRequest,
    BrowseSchemaResponse,
    LoadDMConfigsRequest,
    LoadDMConfigsResponse,
    ConvertRegPathToAbsPathRequest,
    ConvertRegPathToAbsPathResponse,
    UpdateDMUndoRedoMangerRequest,
    GetCompletionsRequest,
    GetCompletionsResponse,
    GetDMDiagnosticsRequest,
    GetDMDiagnosticsResponse,
    DataMapWriteRequest
} from "./types";
import { RequestType, NotificationType } from "vscode-messenger-common";

const _preFix = "mi-data-mapper";
export const getIOTypes: RequestType<DMTypeRequest, IOTypeResponse> = { method: `${_preFix}/getIOTypes` };
export const getSubMappingTypes: RequestType<DMTypeRequest, SubMappingTypesResponse> = { method: `${_preFix}/getSubMappingTypes` };
export const updateFileContent: RequestType<UpdateFileContentRequest, void> = { method: `${_preFix}/updateFileContent` };
export const browseSchema: RequestType<BrowseSchemaRequest, BrowseSchemaResponse> = { method: `${_preFix}/browseSchema` };
export const loadDMConfigs: RequestType<LoadDMConfigsRequest, LoadDMConfigsResponse> = { method: `${_preFix}/loadDMConfigs` };
export const convertRegPathToAbsPath: RequestType<ConvertRegPathToAbsPathRequest, ConvertRegPathToAbsPathResponse> = { method: `${_preFix}/convertRegPathToAbsPath` };
export const createDMFiles: RequestType<GenerateDMInputRequest, GenerateDMInputResponse> = { method: `${_preFix}/createDMFiles` };
export const initDMUndoRedoManager: NotificationType<UpdateDMUndoRedoMangerRequest> = { method: `${_preFix}/initDMUndoRedoManager` };
export const dmUndo: RequestType<void, string> = { method: `${_preFix}/dmUndo` };
export const dmRedo: RequestType<void, string> = { method: `${_preFix}/dmRedo` };
export const addToDMUndoStack: NotificationType<string> = { method: `${_preFix}/addToDMUndoStack` };
export const updateDMUndoRedoManager: NotificationType<UpdateDMUndoRedoMangerRequest> = { method: `${_preFix}/updateDMUndoRedoManager` };
export const getCompletions: RequestType<GetCompletionsRequest, GetCompletionsResponse> = { method: `${_preFix}/getCompletions` };
export const getDMDiagnostics: RequestType<GetDMDiagnosticsRequest, GetDMDiagnosticsResponse> = { method: `${_preFix}/getDMDiagnostics` };
export const getMappingFromAI: RequestType<void, void> = { method: `${_preFix}/getMappingFromAI` };
export const writeDataMapping: NotificationType<DataMapWriteRequest> = { method: `${_preFix}/writeDataMapping` };
export const confirmMappingAction: RequestType<void, boolean> = { method: `${_preFix}/confirmMappingAction` };
export const authenticateUser: RequestType<void, boolean> = { method: `${_preFix}/authenticateUser` };
