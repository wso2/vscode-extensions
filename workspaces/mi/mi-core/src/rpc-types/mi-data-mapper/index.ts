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
 */
import { 
    DMTypeRequest, 
    IOTypeResponse, 
    UpdateFileContentRequest,
    GenerateDMInputRequest, 
    GenerateDMInputResponse,
    LoadDMConfigsRequest,
    LoadDMConfigsResponse,
    ConvertRegPathToAbsPathRequest,
    ConvertRegPathToAbsPathResponse,
    SubMappingTypesResponse,
    UpdateDMUndoRedoMangerRequest,
    GetCompletionsRequest,
    GetCompletionsResponse,
    GetDMDiagnosticsRequest,
    GetDMDiagnosticsResponse,
    DataMapWriteRequest
} from "./types";

export interface MIDataMapperAPI {
    getIOTypes: (params: DMTypeRequest) => Promise<IOTypeResponse>;
    getSubMappingTypes: (params: DMTypeRequest) => Promise<SubMappingTypesResponse>;
    updateFileContent: (params: UpdateFileContentRequest) => Promise<void>;
    loadDMConfigs: (params: LoadDMConfigsRequest) => Promise<LoadDMConfigsResponse>;
    convertRegPathToAbsPath: (params: ConvertRegPathToAbsPathRequest) => Promise<ConvertRegPathToAbsPathResponse>;
    createDMFiles: (params: GenerateDMInputRequest) => Promise<GenerateDMInputResponse>;
    initDMUndoRedoManager: (params: UpdateDMUndoRedoMangerRequest) => void;
    dmUndo: () => Promise<string | undefined>;
    dmRedo: () => Promise<string | undefined>;
    addToDMUndoStack: (source: string) => void;
    updateDMUndoRedoManager: (params: UpdateDMUndoRedoMangerRequest) => void;
    getCompletions: (params: GetCompletionsRequest) => Promise<GetCompletionsResponse>;
    getDMDiagnostics: (params: GetDMDiagnosticsRequest) => Promise<GetDMDiagnosticsResponse>;
    getMappingFromAI: () => void;
    writeDataMapping: (params: DataMapWriteRequest)=> void;
    confirmMappingAction: ()=> Promise<boolean>;
    authenticateUser(): Promise<boolean>;
}
