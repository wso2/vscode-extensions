/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { readFile, writeFile } from 'fs/promises';
import * as yaml from 'js-yaml';
import toJsonSchema from 'to-json-schema';
import {
    GetAPISpecContentRequest,
    GetAPISpecContentResponse,
    Schema,
    WriteAPISpecContentRequest,
    WriteAPISpecContentResponse,
    loadYaml
} from '@wso2/api-designer-core';
import * as vscode from 'vscode';
import { BaseRpcManager } from './base-rpc-manager';
import { handleError, createError, ErrorCode } from '../../../utils/error-utils';

/**
 * Manager for API specification content operations
 * Handles reading, writing, and importing API specifications
 */
export class SpecContentManager extends BaseRpcManager {
    constructor() {
        super('SpecContentManager');
    }

    async getAPISpecContent(params: GetAPISpecContentRequest): Promise<GetAPISpecContentResponse> {
        // Read the file content from the file system
        let fileType: 'json' | 'yaml' | undefined;
        let fileContent;
        if (!params.filePath) {
            this.logError('File path is not provided');
        } else if (params.filePath.endsWith('.json')) {
            fileType = 'json';
        } else if (params.filePath.endsWith('.yaml') || params.filePath.endsWith('.yml')) {
            fileType = 'yaml';
        } else {
            this.logError('Unsupported file type');
        }
        try {
            fileContent = await readFile(params.filePath, 'utf8');
        } catch (err: unknown) {
            if ((err as { code?: string }).code === 'ENOENT') {
                this.logError('File does not exist.');
                handleError(createError(ErrorCode.FILE_NOT_FOUND, this.CONTEXT), `${this.CONTEXT}.getAPISpecContent`);
            } else {
                this.logError('Error reading file:', err);
                handleError(err, `${this.CONTEXT}.getAPISpecContent`);
            }
        }
        return { content: fileContent ?? '', type: fileType };
    }

    async writeAPISpecContent(params: WriteAPISpecContentRequest): Promise<WriteAPISpecContentResponse> {
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
                const yamlObject = loadYaml(content);
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
        } catch (err: unknown) {
            this.logError('Error writing file:', err);
            handleError(err, `${this.CONTEXT}.writeAPISpecContent`);
            return { success: false };
        }
    }

    async importJSON(): Promise<Schema | undefined> {
        // Provide a quick pick to select import from clip board or file 
        // if a file is selected, provide a file picker to select the file
        const options = [
            { label: 'Import from Clipboard', description: 'Parse JSON from clipboard content' },
            { label: 'Import from File', description: 'Select a JSON file to import' }
        ];

        const selectedOption = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select import source'
        });

        if (!selectedOption) {
            return undefined; // User cancelled the selection
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
                return undefined; // User cancelled file selection
            }

            jsonContent = Buffer.from(await vscode.workspace.fs.readFile(fileUri[0])).toString('utf8');
        }

        try {
            const jsonObject = JSON.parse(jsonContent);
            const schema = toJsonSchema(jsonObject) as Schema;
            return schema;
        } catch (error) {
            this.logError('Error parsing JSON:', error);
            vscode.window.showErrorMessage('Failed to parse JSON. Please ensure the content is valid JSON.');
            return undefined;
        }
    }
}

