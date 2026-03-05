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
    MIDataMapperAPI,
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
    DMDiagnostic,
    DMDiagnosticCategory,
    IOType,
    DataMapWriteRequest,
} from "@wso2/mi-core";
import { fetchIOTypes, fetchSubMappingTypes, fetchCompletions, fetchDiagnostics } from "../../util/dataMapper";
import { getStateMachine, refreshUI } from "../../stateMachine";
import { generateSchemaFromContent } from "../../util/schemaBuilder";
import { JSONSchema3or4 } from "to-json-schema";
import { updateTsFileCustomTypes, updateTsFileIoTypes } from "../../util/tsBuilder";
import * as fs from "fs";
import { window, Uri, workspace, commands, TextEdit, WorkspaceEdit } from "vscode";
import path = require("path");
import { extension } from "../../MIExtensionContext";
import { MiDiagramRpcManager } from "../mi-diagram/rpc-manager";
import { UndoRedoManager } from "../../undoRedoManager";
import { DMProject } from "../../datamapper/DMProject";
import { DM_OPERATORS_FILE_NAME, DM_OPERATORS_IMPORT_NAME, READONLY_MAPPING_FUNCTION_NAME, RUNTIME_VERSION_440 } from "../../constants";
import { readTSFile, removeMapFunctionEntry, showMappingEndNotification } from "../../util/ai-datamapper-utils";
import { compareVersions } from "../../util/onboardingUtils";
import { mapDataMapper } from "../../ai-features/copilot/data-mapper/mapper";
import { MILanguageClient } from "../../lang-client/activator";

const undoRedoManager = new UndoRedoManager();

export class MiDataMapperRpcManager implements MIDataMapperAPI {
    constructor(private projectUri: string) { }

    async getIOTypes(params: DMTypeRequest): Promise<IOTypeResponse> {
        return new Promise(async (resolve, reject) => {
            const { filePath, functionName } = params;
            try {
                const { inputTypes, outputType, recursiveTypes } = fetchIOTypes(filePath, functionName);

                return resolve({
                    inputTrees: inputTypes,
                    outputTree: outputType,
                    recursiveTypes: Object.fromEntries(recursiveTypes)
                });
            } catch (error: any) {
                reject(error);
            }
        });
    }

    async getSubMappingTypes(params: DMTypeRequest): Promise<SubMappingTypesResponse> {
        return new Promise(async (resolve, reject) => {
            const { filePath, functionName } = params;
            try {
                const subMappingTypes = fetchSubMappingTypes(filePath, functionName);
                return resolve({
                    variableTypes: subMappingTypes
                });
            } catch (error: any) {
                reject(error);
            }
        });
    }

    async updateFileContent(params: UpdateFileContentRequest): Promise<void> {
        const project = DMProject.getInstance(params.filePath).getProject();
        const sourceFile = project.getSourceFileOrThrow(params.filePath);
        sourceFile.replaceWithText(params.fileContent);
        sourceFile.formatText();
        await sourceFile.save();
        refreshUI(this.projectUri);
    }

    getAbsoluteFilePath(filePath: string, sourcePath: string, configName: string) {
        const regPathParts = filePath.split('/');
        const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(sourcePath));
        if (workspaceFolder) {
            let dataMapperConfigFolder;
            if (path.normalize(filePath).includes(path.normalize(path.join('wso2mi', 'resources', 'registry')))) {
                dataMapperConfigFolder = path.join(
                    workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper');
            } else {
                dataMapperConfigFolder = path.join(workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'datamapper');
            }
            const absPath = path.join(dataMapperConfigFolder, configName, regPathParts[regPathParts.length - 1]);
            return absPath;
        };
        return '';
    }

    async browseSchema(params: BrowseSchemaRequest): Promise<BrowseSchemaResponse> {
        return new Promise(async (resolve) => {
            const { documentUri, overwriteSchema, content, ioType, schemaType, configName, typeName, csvDelimiter } = params;
            if (overwriteSchema) {
                const response = await window.showInformationMessage(
                    "Are you sure you want to override the existing schema?\n\nPlease note that this will remove all existing mappings.",
                    { modal: true },
                    "Yes",
                    "No"
                );
                if (!response || response === "No") {
                    resolve({ success: false });
                    return;
                }
            }
            if (content) {
                let schema: JSONSchema3or4;
                try {
                    schema = await generateSchemaFromContent(this.projectUri, ioType, content, schemaType, csvDelimiter);
                } catch (error: any) {
                    console.error(error);
                    window.showErrorMessage("Error while generating schema. Please check the input file and Resource Type and try again.");
                    return resolve({ success: false });
                }

                try {
                    if (ioType === IOType.Input || ioType === IOType.Output)
                        await updateTsFileIoTypes(configName, documentUri, schema, ioType);
                    else if (ioType === IOType.Other && typeName)
                        await updateTsFileCustomTypes(configName, documentUri, schema, typeName);
                    else {
                        throw new Error(`ioType or typeName issue : ${ioType},${typeName}`);
                    }

                    await this.formatDMC(documentUri);
                    refreshUI(this.projectUri);
                    return resolve({ success: true });
                } catch (error: any) {
                    console.error(error);
                    window.showErrorMessage("Error while updating DMC file.");
                    return resolve({ success: false });
                }
            };
            resolve({ success: false });
            return;
        });
    }

    async formatDMC(documentUri: string): Promise<void> {
        const uri = Uri.file(documentUri);
        let edits: TextEdit[];
        try {
            edits = await commands.executeCommand("vscode.executeFormatDocumentProvider", uri);
        } catch (error) {
            console.error("Error occurred while formatting DMC file: ", error);
            return;
        }
        const workspaceEdit = new WorkspaceEdit();
        workspaceEdit.set(uri, edits);
        await workspace.applyEdit(workspaceEdit);
        return;
    }

    async loadDMConfigs(params: LoadDMConfigsRequest): Promise<LoadDMConfigsResponse> {
        return new Promise(async (resolve, reject) => {
            const fileUri = Uri.file(params.filePath);
            const workspaceFolder = workspace.getWorkspaceFolder(fileUri);
            if (workspaceFolder) {
                let dataMapperConfigFolder;
                if (path.normalize(params.filePath).includes(path.normalize(path.join('wso2mi', 'resources', 'registry')))) {
                    dataMapperConfigFolder = path.join(
                        workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper');
                } else {
                    dataMapperConfigFolder = path.join(workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'datamapper');
                }
                if (!fs.existsSync(dataMapperConfigFolder)) {
                    return resolve({ dmConfigs: [] });
                }
                const dmConfigs: string[] = [];
                for (const folder of fs.readdirSync(dataMapperConfigFolder)) {
                    if (fs.lstatSync(path.join(dataMapperConfigFolder, folder)).isDirectory() &&
                        fs.existsSync(path.join(dataMapperConfigFolder, folder, `${folder}.ts`))) {
                        dmConfigs.push(folder);
                    }
                }
                resolve({ dmConfigs });
                return;
            }
            reject({ dmConfigs: [] });
        });
    }

    async convertRegPathToAbsPath(params: ConvertRegPathToAbsPathRequest): Promise<ConvertRegPathToAbsPathResponse> {
        return new Promise(async (resolve, reject) => {
            const { regPath, sourcePath } = params;
            const regPathParts = regPath.split('/');
            const configName = regPathParts[regPathParts.length - 1].slice(0, -4);
            const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(sourcePath));
            if (workspaceFolder) {
                let dataMapperConfigFolder;
                if (regPath.startsWith("gov:")) {
                    dataMapperConfigFolder = path.join(
                        workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper');
                } else {
                    dataMapperConfigFolder = path.join(workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'datamapper');
                }
                const absPath = path.join(dataMapperConfigFolder, configName, `${configName}.ts`);
                resolve({ absPath, configName });
            };
            reject({ absPath: '', configName: '' });
        });
    }

    // Function to ask whether the user wants to replace all existing mappings with ai generated mappings
    async confirmMappingAction(): Promise<boolean> {
        // Define the message based on the action
        let message = "MI Copilot may modify existing mappings. Do you want to proceed?";
        // Show the confirmation dialog
        const response = await window.showInformationMessage(
            message,
            { modal: true },
            "Yes",
            "No"
        );
        // If user confirms the action by choosing Yes, return true. Otherwise, return false.
        if (!response || response === "No") {
            return false;
        }
        return true;
    }

    // Function to update the body of a function in a TypeScript file
    async writeDataMapping(params: DataMapWriteRequest): Promise<void> {
        const { dataMapping } = params;
        const sourcePath = getStateMachine(this.projectUri).context().dataMapperProps?.filePath;
        if (sourcePath) {
            try {
                const project = DMProject.getInstance(sourcePath).getProject();
                const sourceFile = project.getSourceFileOrThrow(sourcePath);
                const functionDeclaration = sourceFile.getFunction(READONLY_MAPPING_FUNCTION_NAME);
                if (functionDeclaration) {
                    // Determine the return type of the function
                    const returnType = functionDeclaration.getReturnType();
                    let defaultReturnValue = 'return {}';
                    if (returnType.isArray()) {
                        defaultReturnValue = 'return []';
                    }
                    // Update the function body
                    functionDeclaration.setBodyText(`${dataMapping || defaultReturnValue}`);
                    // Write the updates to the file
                    await sourceFile.save();
                    await refreshUI(this.projectUri);
                } else {
                    console.error("Error in writing data mapping, mapFunction not found in target ts file.");
                }
            } catch (error) {
                console.error('Failed to write data mapping to files: ', error);
                throw error;
            }
        }
    }

    // Main function to get the mapping from AI and write it to the relevant files
    async getMappingFromAI(): Promise<void> {
        try {
            // Function to read the TypeScript file
            let tsContent = await readTSFile(this.projectUri);
            
            console.log("Generating data mapping using Copilot...");
            
            // Call the local data mapper function
            const mappingString = await mapDataMapper({
                tsFile: tsContent
            });
            
            console.log("Data mapping generated successfully using Copilot");
            
            // Remove the mapFunction line from the mapping string
            const mappingRet = removeMapFunctionEntry(mappingString);

            if (!mappingRet?.trim()) {
                throw new Error("MI Copilot did not return a valid mapping body.");
            }
            
            // Create an object of type DataMapWriteRequest
            const dataMapWriteRequest: DataMapWriteRequest = {
                dataMapping: mappingRet
            };
            
            await this.writeDataMapping(dataMapWriteRequest);
            
            // Show a notification to the user
            showMappingEndNotification(this.projectUri);
        }
        catch (error) {
            console.error('Error while generating data mapping', error);
            window.showErrorMessage(
                `Failed to generate data mapping: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            throw error;
        }
    }

    async createDMFiles(params: GenerateDMInputRequest): Promise<GenerateDMInputResponse> {
        return new Promise(async (resolve, reject) => {
            try {
                const dmContent = `import * as ${DM_OPERATORS_IMPORT_NAME} from "./${DM_OPERATORS_FILE_NAME}";\ndeclare var DM_PROPERTIES: any;\n\n/**\n* inputType:unknown\n*/\ninterface InputRoot {\n}\n\n/**\n* outputType:unknown\n*/\ninterface OutputRoot {\n}\n\nexport function mapFunction(input: InputRoot): OutputRoot {\nreturn {}\n};`;
                const { filePath, dmName } = params;
                const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(filePath));
                let miDiagramRpcManager: MiDiagramRpcManager = new MiDiagramRpcManager(this.projectUri);

                const langClient = await MILanguageClient.getInstance(this.projectUri);
                const projectDetailsRes = await langClient?.getProjectDetails();
                const runtimeVersion = projectDetailsRes.primaryDetails.runtimeVersion.value;
                const isResourceContentUsed = compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0;

                if (workspaceFolder) {
                    const dataMapperConfigFolder = isResourceContentUsed ?
                        path.join(workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'datamapper', dmName) :
                        path.join(workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper', dmName);
                    if (!fs.existsSync(dataMapperConfigFolder)) {
                        fs.mkdirSync(dataMapperConfigFolder, { recursive: true });
                    }
                    const tsFilePath = path.join(dataMapperConfigFolder, `${dmName}.ts`);
                    const operatorsSrcFilePath = path.join(extension.context.extensionUri.fsPath, "resources", "data-mapper-utils", `${DM_OPERATORS_FILE_NAME}.ts.lib`);
                    const operatorsDstFilePath = path.join(dataMapperConfigFolder, `${DM_OPERATORS_FILE_NAME}.ts`);
                    if (!fs.existsSync(tsFilePath) && !fs.existsSync(operatorsDstFilePath)) {
                        await miDiagramRpcManager.createRegistryResource({
                            filePath: "",
                            projectDirectory: workspaceFolder.uri.fsPath,
                            templateType: "Data Mapper",
                            resourceName: dmName,
                            artifactName: dmName,
                            registryRoot: isResourceContentUsed ? "" : "gov",
                            registryPath: `/datamapper/${dmName}`,
                            createOption: "entryOnly",
                            content: ""
                        });
                        await miDiagramRpcManager.createRegistryResource({
                            filePath: "",
                            projectDirectory: workspaceFolder.uri.fsPath,
                            templateType: "Data Mapper Schema",
                            resourceName: `${dmName}_inputSchema`,
                            artifactName: `${dmName}_inputSchema`,
                            registryRoot: isResourceContentUsed ? "" : "gov",
                            registryPath: `/datamapper/${dmName}`,
                            createOption: "entryOnly",
                            content: "{}"

                        });
                        await miDiagramRpcManager.createRegistryResource({
                            filePath: "",
                            projectDirectory: workspaceFolder.uri.fsPath,
                            templateType: "Data Mapper Schema",
                            resourceName: `${dmName}_outputSchema`,
                            artifactName: `${dmName}_outputSchema`,
                            registryRoot: isResourceContentUsed ? "" : "gov",
                            registryPath: `/datamapper/${dmName}`,
                            createOption: "entryOnly",
                            content: "{}"

                        });
                    }
                    if (!fs.existsSync(tsFilePath)) {
                        fs.writeFileSync(tsFilePath, dmContent);
                    }
                    if (!fs.existsSync(operatorsDstFilePath)) {
                        fs.copyFileSync(operatorsSrcFilePath, operatorsDstFilePath, fs.constants.COPYFILE_FICLONE);
                    }
                    resolve({ success: true });
                }
            } catch (error: any) {
                console.error(error);
                reject(error);
            }
        });
    }

    async initDMUndoRedoManager(params: UpdateDMUndoRedoMangerRequest): Promise<void> {
        undoRedoManager.updateContent(params.filePath, params.fileContent);
    }

    async dmUndo(): Promise<string | undefined> {
        return new Promise(async (resolve) => {
            const undoContent = undoRedoManager.undo();
            resolve(undoContent);
        });
    }

    async dmRedo(): Promise<string | undefined> {
        return new Promise(async (resolve) => {
            const redoContent = undoRedoManager.redo();
            resolve(redoContent);
        });
    }

    async addToDMUndoStack(source: string): Promise<void> {
        undoRedoManager.addModification(source);
    }

    async updateDMUndoRedoManager(params: UpdateDMUndoRedoMangerRequest): Promise<void> {
        undoRedoManager.updateContent(params.filePath, params.fileContent);
    }

    async getCompletions(params: GetCompletionsRequest): Promise<GetCompletionsResponse> {
        return new Promise(async (resolve, reject) => {
            const { filePath, fileContent, cursorPosition } = params;
            try {
                resolve({ completions: fetchCompletions(filePath, fileContent, cursorPosition) });
            } catch (error) {
                console.error(error);
                reject(error);
            }
        });
    }

    async getDMDiagnostics(params: GetDMDiagnosticsRequest): Promise<GetDMDiagnosticsResponse> {
        const diagnostics = fetchDiagnostics(params.filePath);

        const formattedDiagnostics: DMDiagnostic[] = diagnostics.map((diagnostic) => {
            return {
                messageText: typeof diagnostic.messageText !== "string"
                    ? diagnostic.messageText.messageText : diagnostic.messageText,
                category: diagnostic.category as unknown as DMDiagnosticCategory,
                code: diagnostic.code,
                start: diagnostic.start,
                length: diagnostic.length,
                source: diagnostic.source
            };
        });

        return { diagnostics: formattedDiagnostics };
    }
}

