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

import * as vscode from 'vscode';
import {
    ReadFileRequest,
    ReadFileResponse,
    WriteFileRequest,
    WriteFileResponse,
    DeleteFileRequest,
    DeleteFileResponse,
    GetWorkspaceFileTreeRequest,
    GetWorkspaceFileTreeResponse,
    WorkspaceFileNode
} from '@wso2/api-designer-core';
import { BaseRpcManager } from './base-rpc-manager';
import { handleError, createError, ErrorCode } from '../../../utils/error-utils';

/**
 * Manager for file operations
 * Handles reading, writing, deleting files and workspace file tree operations
 */
export class FileManager extends BaseRpcManager {
    constructor() {
        super('FileManager');
    }

    async readFile(params: ReadFileRequest): Promise<ReadFileResponse> {
        try {
            this.logDebug(`Reading file: ${params.filePath}`);

            const fileUri = vscode.Uri.file(params.filePath);
            const fileContent = await vscode.workspace.fs.readFile(fileUri);
            const content = Buffer.from(fileContent).toString('utf8');

            return {
                success: true,
                content
            };
        } catch (error: unknown) {
            const errorObj = error as { code?: string; message?: string };
            // Silently handle ENOENT - file doesn't exist, which is expected in some cases
            if (errorObj.code === 'FileNotFound' || errorObj.message?.includes('ENOENT') || errorObj.message?.includes('File not found')) {
                this.logDebug(`File not found (expected): ${params.filePath}`);
            } else {
                this.logError('Error reading file', error);
                handleError(error, `${this.CONTEXT}.readFile`);
            }
            return {
                success: false,
                content: '',
                message: errorObj.message || 'Failed to read file'
            };
        }
    }

    async writeFile(params: WriteFileRequest): Promise<WriteFileResponse> {
        try {
            this.logDebug(`Writing file: ${params.filePath}`);

            const fileUri = vscode.Uri.file(params.filePath);
            // Ensure parent directory exists
            const parentDir = vscode.Uri.joinPath(fileUri, '..');
            try {
                await vscode.workspace.fs.createDirectory(parentDir);
            } catch (err: unknown) {
                // Directory might already exist, which is fine
                this.logDebug(`Parent directory check: ${(err as { message?: string }).message || 'unknown'}`);
            }

            // Write to file system (don't use WorkspaceEdit - let file system watcher handle it)
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(params.content, 'utf8'));

            return {
                success: true
            };
        } catch (error: unknown) {
            this.logError('Error writing file', error);
            handleError(error, `${this.CONTEXT}.writeFile`);
            return {
                success: false,
                message: (error as { message?: string }).message || 'Failed to write file'
            };
        }
    }

    async deleteFile(params: DeleteFileRequest): Promise<DeleteFileResponse> {
        try {
            this.logDebug(`Deleting file: ${params.filePath}`);

            const fileUri = vscode.Uri.file(params.filePath);
            await vscode.workspace.fs.delete(fileUri, { recursive: false });

            return {
                success: true
            };
        } catch (error: unknown) {
            this.logError('Error deleting file', error);
            handleError(error, `${this.CONTEXT}.deleteFile`);
            return {
                success: false,
                message: (error as { message?: string }).message || 'Failed to delete file'
            };
        }
    }

    async getWorkspaceFileTree(params: GetWorkspaceFileTreeRequest): Promise<GetWorkspaceFileTreeResponse> {
        try {
            this.logInfo(`Getting workspace file tree for ${params.workspaceUri}${params.filterType ? ` (filter: ${params.filterType})` : ''}`);

            // Otherwise, return full tree (existing logic)
            const workspaceUri = vscode.Uri.file(params.workspaceUri);
            const targetPath = params.path ? vscode.Uri.joinPath(workspaceUri, params.path) : workspaceUri;

            const files: WorkspaceFileNode[] = [];
            const entries = await vscode.workspace.fs.readDirectory(targetPath);

            for (const [name, type] of entries) {
                // Skip hidden files and node_modules
                if (name.startsWith('.') || name === 'node_modules') {
                    continue;
                }

                const fullPath = params.path ? `${params.path}/${name}` : name;
                const isDirectory = type === vscode.FileType.Directory;

                const node: WorkspaceFileNode = {
                    name,
                    path: fullPath,
                    type: isDirectory ? 'directory' : 'file'
                };

                // For directories, recursively get children
                if (isDirectory) {
                    const childResult = await this.getWorkspaceFileTree({
                        workspaceUri: params.workspaceUri,
                        path: fullPath,
                        filterType: params.filterType
                    });
                    node.children = childResult.files;
                }

                files.push(node);
            }

            // Sort: directories first, then files, alphabetically
            files.sort((a, b) => {
                if (a.type === b.type) {
                    return a.name.localeCompare(b.name);
                }
                return a.type === 'directory' ? -1 : 1;
            });

            return { files };

        } catch (error: unknown) {
            this.logError('Error getting workspace file tree', error);
            return { files: [] };
        }
    }
}

