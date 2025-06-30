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
    APIDesignerVisualizerAPI,
    GetOpenAPIContentRequest,
    GetOpenAPIContentResponse,
    GoToSourceRequest,
    HistoryEntry,
    HistoryEntryResponse,
    OpenViewRequest,
    WriteOpenAPIContentRequest,
    WriteOpenAPIContentResponse,
    Schema
} from "@wso2/api-designer-core";
import { readFile, writeFile } from 'fs/promises';
import yaml from 'js-yaml';
import toJsonSchema from 'to-json-schema';
import * as vscode from 'vscode';
export class ApiDesignerVisualizerRpcManager implements APIDesignerVisualizerAPI {
    async openView(params: OpenViewRequest): Promise<void> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }

    async goBack(): Promise<void> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }

    async getHistory(): Promise<HistoryEntryResponse> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }

    async addToHistory(params: HistoryEntry): Promise<void> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }

    async goHome(): Promise<void> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }

    async goToSource(params: GoToSourceRequest): Promise<void> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }

    async getOpenApiContent(params: GetOpenAPIContentRequest): Promise<GetOpenAPIContentResponse> {
        // Read the file content from the file system
        let fileType: 'json' | 'yaml' | undefined;
        let fileContent;
        if (!params.filePath) {
            console.error('File path is not provided');
        } else if (params.filePath.endsWith('.json')) {
            fileType = 'json';
        } else if (params.filePath.endsWith('.yaml') || params.filePath.endsWith('.yml')) {
            fileType = 'yaml';
        } else {
            console.error('Unsupported file type');
        }
        try {
            fileContent = await readFile(params.filePath, 'utf8');
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                console.error('File does not exist.');
            } else {
                console.error('Error reading file:', err);
            }
        }
        return { content: fileContent, type: fileType };
    }

    async writeOpenApiContent(params: WriteOpenAPIContentRequest): Promise<WriteOpenAPIContentResponse> {
        const { filePath, content } = params;
        if (!filePath) {
            throw new Error('File path is not provided');
        }
        try {
            let formattedContent: string;

            if (filePath.endsWith('.json')) {
                // Parse and stringify JSON with formatting
                const jsonObject = JSON.parse(content);
                formattedContent = JSON.stringify(jsonObject, null, 2);
            } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
                // Parse and dump YAML with formatting
                const yamlObject = yaml.load(content);
                formattedContent = yaml.dump(yamlObject, {
                    indent: 2,
                    lineWidth: -1, // Disable line wrapping
                    noRefs: true,
                });
            } else {
                throw new Error('Unsupported file type');
            }

            await writeFile(filePath, formattedContent, 'utf8');
            return { success: true };
        } catch (err: any) {
            console.error('Error writing file:', err);
            return { success: false };
        }
    }

    async importJSON(): Promise<Schema | undefined> {
        // Provide a quick pick to select import from clip board or file 
        // if a file is selected, provide a file picker to select the file
        // if clipboard is selected, get the text from the clipboard
        // parse the text as JSON and return the JSON object
        const options = [
            { label: 'Import from Clipboard', description: 'Parse JSON from clipboard content' },
            { label: 'Import from File', description: 'Select a JSON file to import' }
        ];

        const selectedOption = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select import source'
        });

        if (!selectedOption) {
            return; // User cancelled the selection
        }

        let jsonContent: string;

        if (selectedOption.label === 'Import from Clipboard') {
            jsonContent = await vscode.env.clipboard.readText();
        } else {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON files': ['json']
                }
            });

            if (!fileUri || fileUri.length === 0) {
                return; // User cancelled file selection
            }

            jsonContent = Buffer.from(await vscode.workspace.fs.readFile(fileUri[0])).toString('utf8');
        }

        try {
            const jsonObject = JSON.parse(jsonContent);
            const schema = toJsonSchema(jsonObject) as Schema;
            return schema;
        } catch (error) {
            vscode.window.showErrorMessage('Failed to parse JSON. Please ensure the content is valid JSON.');
            return undefined;
        }
    }
}
