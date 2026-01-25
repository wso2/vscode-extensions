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
    ApiRequest,
    ApiResponse
} from "@wso2/api-tryit-core";
import { writeFile, readFile } from 'fs/promises';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

export class ApiTryItRpcManager {
    async saveRequest(params: SaveRequestRequest): Promise<SaveRequestResponse> {
        const { filePath, request, response } = params;
        
        if (!filePath) {
            return { 
                success: false, 
                message: 'File path is not provided' 
            };
        }

        try {
            let existingData: { id?: string; name?: string; request?: ApiRequest, response?: ApiResponse } | null = null;
            
            // Try to read existing file
            try {
                const existingContent = await readFile(filePath, 'utf8');
                existingData = JSON.parse(existingContent);
            } catch {
                // File doesn't exist, we'll create it from scratch
            }
            
            let updatedData;
            
            if (existingData) {
                // Update existing file - only preserve essential data
                updatedData = {
                    id: request.id,
                    name: request.name,
                    request: {
                        name: request.name,
                        method: request.method,
                        url: request.url,
                        queryParameters: request.queryParameters,
                        headers: request.headers,
                        body: request.body
                    },
                    response: response ? {
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: response.body
                    } : existingData.response
                };
            } else {
                // Create new file structure
                updatedData = {
                    id: request.id,
                    name: request.name,
                    request: {
                        name: request.name,
                        method: request.method,
                        url: request.url,
                        queryParameters: request.queryParameters,
                        headers: request.headers,
                        body: request.body
                    },
                    response: response ? {
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: response.body
                    } : undefined
                };
            }
            
            // Convert to YAML
            const requestData = yaml.dump(updatedData);
            
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
