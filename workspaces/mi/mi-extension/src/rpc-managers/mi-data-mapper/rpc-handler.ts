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
    getIOTypes,
    getSubMappingTypes,
    updateFileContent,
    UpdateFileContentRequest,
    GenerateDMInputRequest,
    browseSchema,
    BrowseSchemaRequest,
    LoadDMConfigsRequest,
    loadDMConfigs,
    ConvertRegPathToAbsPathRequest,
    convertRegPathToAbsPath,
    createDMFiles,
    initDMUndoRedoManager,
    dmUndo,
    dmRedo,
    addToDMUndoStack,
    updateDMUndoRedoManager,
    UpdateDMUndoRedoMangerRequest,
    getCompletions,
    GetCompletionsRequest,
    getDMDiagnostics,
    GetDMDiagnosticsRequest,
    getMappingFromAI,
    writeDataMapping,
    DataMapWriteRequest,
    confirmMappingAction,
    authenticateUser
} from "@wso2/mi-core";
import { Messenger } from "vscode-messenger";
import { MiDataMapperRpcManager } from "./rpc-manager";

export function registerMiDataMapperRpcHandlers(messenger: Messenger, projectUri: string): void {
    const rpcManger = new MiDataMapperRpcManager(projectUri);
    messenger.onRequest(getIOTypes, (args: DMTypeRequest) => rpcManger.getIOTypes(args));
    messenger.onRequest(getSubMappingTypes, (args: DMTypeRequest) => rpcManger.getSubMappingTypes(args));
    messenger.onRequest(updateFileContent, (args: UpdateFileContentRequest) => rpcManger.updateFileContent(args));
    messenger.onRequest(browseSchema, (args: BrowseSchemaRequest) => rpcManger.browseSchema(args));
    messenger.onRequest(loadDMConfigs, (args: LoadDMConfigsRequest) => rpcManger.loadDMConfigs(args));
    messenger.onRequest(convertRegPathToAbsPath, (args: ConvertRegPathToAbsPathRequest) => rpcManger.convertRegPathToAbsPath(args));
    messenger.onRequest(createDMFiles, (args: GenerateDMInputRequest) => rpcManger.createDMFiles(args));
    messenger.onNotification(initDMUndoRedoManager, (args: UpdateDMUndoRedoMangerRequest) => rpcManger.initDMUndoRedoManager(args));
    messenger.onRequest(dmUndo, () => rpcManger.dmUndo());
    messenger.onRequest(dmRedo, () => rpcManger.dmRedo());
    messenger.onNotification(addToDMUndoStack, (args: string) => rpcManger.addToDMUndoStack(args));
    messenger.onNotification(updateDMUndoRedoManager, (args: UpdateDMUndoRedoMangerRequest) => rpcManger.updateDMUndoRedoManager(args));
    messenger.onRequest(getCompletions, (args: GetCompletionsRequest) => rpcManger.getCompletions(args));
    messenger.onRequest(getDMDiagnostics, (args: GetDMDiagnosticsRequest) => rpcManger.getDMDiagnostics(args));
    messenger.onRequest(getMappingFromAI, () => rpcManger.getMappingFromAI());
    messenger.onNotification(writeDataMapping, (args: DataMapWriteRequest) => rpcManger.writeDataMapping(args));
    messenger.onRequest(confirmMappingAction, () => rpcManger.confirmMappingAction());
    messenger.onRequest(authenticateUser, () => rpcManger.authenticateUser());

}
