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
    SaveRequestRequest,
    SaveRequestResponse,
} from "@wso2/api-tryit-core";
import { writeFile, readFile } from 'fs/promises';
import * as vscode from 'vscode';

export class ApiTryItRpcManager {
    async saveRequest(params: SaveRequestRequest): Promise<SaveRequestResponse> {
        const { filePath, request } = params;
        
        if (!filePath) {
            return { 
                success: false, 
                message: 'File path is not provided' 
            };
        }

        try {
            // Read existing file to preserve metadata (collectionId, folderId, createdAt)
            const existingContent = await readFile(filePath, 'utf8');
            const existingData = JSON.parse(existingContent);
            
            // Merge the updated request with existing metadata
            const updatedData = {
                ...existingData,
                request: request,
                updatedAt: new Date().toISOString()
            };
            
            // Convert to JSON with formatting
            const requestData = JSON.stringify(updatedData, null, 2);
            
            // Write to file
            await writeFile(filePath, requestData, 'utf8');
            
            return { 
                success: true, 
                message: 'Request saved successfully' 
            };
        } catch (err: unknown) {
            vscode.window.showErrorMessage(`Failed to save request: ${err instanceof Error ? err.message : 'Unknown error'}`);
            return { 
                success: false, 
                message: err instanceof Error ? err.message : 'Unknown error occurred'
            };
        }
    }
}
