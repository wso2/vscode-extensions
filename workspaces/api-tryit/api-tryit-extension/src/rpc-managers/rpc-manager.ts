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
    ApiResponse,
    HttpRequestOptions,
    HttpResponseResult,
} from "@wso2/api-tryit-core";
import { writeFile, readFile } from 'fs/promises';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import axios, { AxiosError } from 'axios';

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
            let existingData: { id?: string; name?: string; request?: ApiRequest; response?: ApiResponse } | null = null;

            // Try to read existing file
            try {
                const existingContent = await readFile(filePath, 'utf8');
                const parsed = yaml.load(existingContent);
                if (parsed && typeof parsed === 'object') {
                    existingData = parsed as { id?: string; name?: string; request?: ApiRequest; response?: ApiResponse };
                }
            } catch {
                // File doesn't exist or content can't be parsed, we'll create it from scratch
            }

            const sanitizedRequest: ApiRequest = {
                id: request.id,
                name: request.name,
                method: request.method,
                url: request.url,
                queryParameters: request.queryParameters || [],
                headers: request.headers || []
            };

            if (request.body !== undefined) {
                sanitizedRequest.body = request.body;
            }

            if (request.bodyFormData && request.bodyFormData.length > 0) {
                sanitizedRequest.bodyFormData = request.bodyFormData;
            }

            if (request.bodyFormUrlEncoded && request.bodyFormUrlEncoded.length > 0) {
                sanitizedRequest.bodyFormUrlEncoded = request.bodyFormUrlEncoded;
            }

            if (request.bodyBinaryFiles && request.bodyBinaryFiles.length > 0) {
                sanitizedRequest.bodyBinaryFiles = request.bodyBinaryFiles
                    .filter(file => file.filePath?.trim())
                    .map(file => ({
                        ...file,
                        enabled: file.enabled ?? true,
                        contentType: file.contentType?.includes('/') 
                            ? file.contentType 
                            : 'application/octet-stream'
                    }));
            }

            if (request.assertions && request.assertions.length > 0) {
                sanitizedRequest.assertions = request.assertions;
            }

            const updatedData = {
                id: request.id,
                name: request.name,
                request: sanitizedRequest,
                response: response ? {
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: response.body
                } : existingData?.response
            };
            
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

    async sendHttpRequest(options: HttpRequestOptions): Promise<HttpResponseResult> {
        try {
            const response = await axios({
                method: options.method,
                url: options.url,
                params: options.params,
                headers: options.headers,
                data: options.data,
                validateStatus: () => true // Accept any status code
            });

            // Convert response headers to ResponseHeader format
            const responseHeaders = Object.entries(response.headers).map(([key, value]) => ({
                key,
                value: String(value)
            }));

            // Format response body
            let responseBody: string;
            if (typeof response.data === 'object') {
                responseBody = JSON.stringify(response.data, null, 2);
            } else {
                responseBody = String(response.data || '');
            }

            return {
                statusCode: response.status,
                headers: responseHeaders,
                body: responseBody
            };
        } catch (error) {
            const axiosError = error as AxiosError;
            let errorBody = '';
            let statusCode = 0;
            let headers: Array<{ key: string; value: string }> = [];

            if (axiosError.response) {
                statusCode = axiosError.response.status;
                headers = Object.entries(axiosError.response.headers).map(([key, value]) => ({
                    key,
                    value: String(value)
                }));

                if (typeof axiosError.response.data === 'object') {
                    errorBody = JSON.stringify(axiosError.response.data, null, 2);
                } else {
                    errorBody = String(axiosError.response.data || '');
                }
            } else {
                // Network error or request setup error
                errorBody = JSON.stringify({
                    error: axiosError.message || 'Request failed',
                    code: axiosError.code
                }, null, 2);
            }

            return {
                statusCode,
                headers,
                body: errorBody,
                error: axiosError.message
            };
        }
    }
}
