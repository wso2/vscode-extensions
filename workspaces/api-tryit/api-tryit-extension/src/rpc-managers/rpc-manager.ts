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
import { writeFile, readFile, mkdtemp, rm } from 'fs/promises';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as os from 'os';
import * as path from 'path';
import { createHurlRunner } from '@wso2/api-tryit-hurl-runner';
import { parseHurlCollection } from '@wso2/api-tryit-hurl-parser';
import { ApiExplorerProvider } from '../tree-view/ApiExplorerProvider';
import { HurlFormatAdapter } from '../util/hurl-format-adapter';
import { getHurlBinaryManager } from '../hurl/hurl-binary-manager';
import {
	composeHurlDocument,
	parseHurlDocument
} from '@wso2/api-tryit-hurl-parser';

interface SaveRequestInternalRequest extends SaveRequestRequest {
    appendIfNotFound?: boolean;
    selectedRequestTreeId?: string;
}

export class ApiTryItRpcManager {
    constructor(private apiExplorerProvider?: ApiExplorerProvider) {}

    private parseRequestIndexFromTreeId(treeId?: string): number | undefined {
        if (!treeId || !treeId.startsWith('request-')) {
            return undefined;
        }
        const match = treeId.match(/-(\d+)$/);
        if (!match) {
            return undefined;
        }
        const oneBased = Number.parseInt(match[1], 10);
        if (!Number.isFinite(oneBased) || oneBased < 1) {
            return undefined;
        }
        return oneBased - 1;
    }

    private findRequestBlockIndex(fileContent: string, filePath: string, request: ApiRequest): number {
        const parsedDocument = parseHurlDocument(fileContent);
        if (parsedDocument.blocks.length === 0) {
            return -1;
        }

        let parsedCollection;
        try {
            parsedCollection = parseHurlCollection(fileContent, { sourceFilePath: filePath });
        } catch {
            return -1;
        }

        const items = parsedCollection.rootItems || [];
        if (items.length === 0) {
            return -1;
        }

        if (request.id && request.id.trim()) {
            const byId = items.findIndex(item => item.request.id === request.id || item.id === request.id);
            if (byId >= 0 && byId < parsedDocument.blocks.length) {
                return byId;
            }
        }

        const bySignature = items.findIndex(item =>
            item.name === request.name &&
            item.request.method === request.method &&
            item.request.url === request.url
        );
        if (bySignature >= 0 && bySignature < parsedDocument.blocks.length) {
            return bySignature;
        }

        const byMethodAndUrl = items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) =>
                item.request.method === request.method &&
                item.request.url === request.url
            );
        if (byMethodAndUrl.length === 1) {
            return byMethodAndUrl[0].index;
        }

        const byMethodOnly = items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.request.method === request.method);
        if (byMethodOnly.length === 1) {
            return byMethodOnly[0].index;
        }

        if (items.length === 1) {
            return 0;
        }

        return -1;
    }

    private serializeHurlRequestBlock(request: ApiRequest, response?: ApiResponse, preserveId = false): string {
        const requestForSerialization: ApiRequest = {
            ...request,
            id: preserveId ? request.id : '',
            queryParameters: Array.isArray(request.queryParameters) ? request.queryParameters : [],
            headers: Array.isArray(request.headers) ? request.headers : []
        };

        return HurlFormatAdapter
            .serializeRequest(requestForSerialization, response, request.assertions)
            .trim();
    }

    async saveRequest(params: SaveRequestInternalRequest): Promise<SaveRequestResponse> {
        const { filePath, request, response } = params;
        
        if (!filePath) {
            return { 
                success: false, 
                message: 'File path is not provided' 
            };
        }

        try {
            // Check if the file is a Hurl file or YAML file
            const isHurlFile = HurlFormatAdapter.isHurlFile(filePath);

            let contentToWrite: string;

            if (isHurlFile) {
                let existingContent = '';
                try {
                    existingContent = await readFile(filePath, 'utf8');
                } catch {
                    // New file, start with empty content.
                }

                const parsedDocument = parseHurlDocument(existingContent);
                const serializedBlock = this.serializeHurlRequestBlock(request, response, false);

                if (parsedDocument.blocks.length === 0) {
                    contentToWrite = composeHurlDocument(parsedDocument.header, [serializedBlock]);
                } else {
                    let existingBlockIndex = -1;
                    const treeIndex = this.parseRequestIndexFromTreeId(params.selectedRequestTreeId);
                    if (typeof treeIndex === 'number' && treeIndex >= 0 && treeIndex < parsedDocument.blocks.length) {
                        existingBlockIndex = treeIndex;
                    } else {
                        existingBlockIndex = this.findRequestBlockIndex(existingContent, filePath, request);
                    }
                    const shouldAppendWhenNotFound = params.appendIfNotFound === true;

                    const updatedBlocks = parsedDocument.blocks.map(block => block.text);
                    if (existingBlockIndex >= 0 && existingBlockIndex < updatedBlocks.length) {
                        const preserveId = parsedDocument.blocks[existingBlockIndex].hasIdComment;
                        updatedBlocks[existingBlockIndex] = this.serializeHurlRequestBlock(request, response, preserveId);
                    } else if (shouldAppendWhenNotFound) {
                        updatedBlocks.push(serializedBlock);
                    } else {
                        throw new Error('Unable to resolve the existing request block to update. Please reopen the request and save again.');
                    }

                    contentToWrite = composeHurlDocument(parsedDocument.header, updatedBlocks);
                }
            } else {
                // Keep YAML format for backward compatibility
                let existingData: { id?: string; name?: string; request?: ApiRequest; response?: ApiResponse; assertions?: unknown[] } | null = null;

                // Try to read existing file
                try {
                    const existingContent = await readFile(filePath, 'utf8');
                    const parsed = yaml.load(existingContent);
                    if (parsed && typeof parsed === 'object') {
                        existingData = parsed as { id?: string; name?: string; request?: ApiRequest; response?: ApiResponse; assertions?: unknown[] };
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

                // Persist assertions at top-level (do NOT embed into `request` any more). Prefer incoming assertions; otherwise preserve existing file's top-level assertions.
                const updatedData: Record<string, unknown> = {
                    id: request.id,
                    name: request.name,
                    request: sanitizedRequest,
                    response: response ? {
                        statusCode: response.statusCode,
                        headers: response.headers,
                        body: response.body
                    } : existingData?.response
                };

                if (request.assertions && request.assertions.length > 0) {
                    updatedData.assertions = request.assertions;
                } else if (existingData?.assertions && Array.isArray(existingData.assertions)) {
                    updatedData.assertions = existingData.assertions;
                }

                // Convert to YAML
                contentToWrite = yaml.dump(updatedData);
            }
            
            // Write to file
            await writeFile(filePath, contentToWrite, 'utf8');
            
            // Update the in-memory collection with the file path if it exists
            if (this.apiExplorerProvider) {
                this.apiExplorerProvider.updateRequestFilePath(request.id, filePath);
            }
            
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

    private appendQueryParams(url: string, params?: Record<string, string>): string {
        if (!params || Object.keys(params).length === 0) {
            return url;
        }

        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (!key) {
                continue;
            }
            query.append(key, value ?? '');
        }

        const queryString = query.toString();
        if (!queryString) {
            return url;
        }

        return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
    }

    private buildHurlRequest(options: HttpRequestOptions): string {
        const method = (options.method || 'GET').toUpperCase();
        const url = this.appendQueryParams(options.url, options.params);
        const headers = { ...(options.headers || {}) };

        const hasBody = options.data !== undefined && options.data !== null;
        if (hasBody && typeof options.data === 'object') {
            const hasContentTypeHeader = Object.keys(headers).some(key => key.toLowerCase() === 'content-type');
            if (!hasContentTypeHeader) {
                headers['Content-Type'] = 'application/json';
            }
        }

        let hurl = `${method} ${url}\n`;
        for (const [key, value] of Object.entries(headers)) {
            if (!key || value === undefined || value === null) {
                continue;
            }
            hurl += `${key}: ${String(value)}\n`;
        }

        const methodSupportsBody = !['GET', 'HEAD', 'OPTIONS'].includes(method);
        if (methodSupportsBody && hasBody) {
            hurl += '\n';
            if (typeof options.data === 'string') {
                hurl += options.data;
            } else {
                hurl += JSON.stringify(options.data, null, 2);
            }
            if (!hurl.endsWith('\n')) {
                hurl += '\n';
            }
        }

        return hurl;
    }

    private parseResponseFromStdout(stdout: string): HttpResponseResult | undefined {
        if (!stdout || stdout.trim().length === 0) {
            return undefined;
        }

        const lines = stdout.replace(/\r\n/g, '\n').split('\n');
        const statusLineIndexes: number[] = [];
        for (let index = 0; index < lines.length; index++) {
            if (/^HTTP\/\S+\s+\d{3}\b/i.test(lines[index].trim())) {
                statusLineIndexes.push(index);
            }
        }

        if (statusLineIndexes.length === 0) {
            return undefined;
        }

        const startIndex = statusLineIndexes[statusLineIndexes.length - 1];
        const endIndex = lines.length;
        let headerEndIndex = endIndex;
        for (let index = startIndex + 1; index < endIndex; index++) {
            if (lines[index].trim() === '') {
                headerEndIndex = index;
                break;
            }
        }

        const statusLine = lines[startIndex].trim();
        const statusMatch = statusLine.match(/^HTTP\/\S+\s+(\d{3})\b/i);
        if (!statusMatch) {
            return undefined;
        }

        const headers: Array<{ key: string; value: string }> = [];
        for (let index = startIndex + 1; index < headerEndIndex; index++) {
            const line = lines[index];
            const separatorIndex = line.indexOf(':');
            if (separatorIndex <= 0) {
                continue;
            }

            const key = line.slice(0, separatorIndex).trim().toLowerCase();
            const value = line.slice(separatorIndex + 1).trim();
            headers.push({ key, value });
        }

        const bodyStartIndex = headerEndIndex < endIndex ? headerEndIndex + 1 : headerEndIndex;
        const body = lines.slice(bodyStartIndex, endIndex).join('\n').trimEnd();
        return {
            statusCode: Number.parseInt(statusMatch[1], 10),
            headers,
            body
        };
    }

    async sendHttpRequest(options: HttpRequestOptions): Promise<HttpResponseResult> {
        let tempDir: string | undefined;

        try {
            const commandPath = await getHurlBinaryManager().resolveCommandPath({
                autoInstall: true,
                promptOnFailure: true
            });
            const runner = createHurlRunner({ command: commandPath });
            const environment = await runner.verifyEnvironment();
            if (!environment.available) {
                const message = environment.errorMessage || 'The hurl command is not available in PATH.';
                return {
                    statusCode: 0,
                    headers: [],
                    body: JSON.stringify({ error: message }, null, 2),
                    error: message
                };
            }

            tempDir = await mkdtemp(path.join(os.tmpdir(), 'api-tryit-send-'));
            const requestFilePath = path.join(tempDir, 'request.hurl');
            const reportDir = path.join(tempDir, 'report');
            await writeFile(requestFilePath, this.buildHurlRequest(options), 'utf8');

            const runResult = await runner.run(
                { collectionPath: requestFilePath },
                {
                    parallelism: 1,
                    followRedirects: true,
                    includeResponseOutput: true,
                    reportArtifactsDir: reportDir
                }
            );
            const fileResult = runResult.files[0];
            const parsedResponse = this.parseResponseFromStdout(fileResult?.stdout || '');
            if (parsedResponse) {
                return parsedResponse;
            }

            const errorMessage = fileResult?.errorMessage || 'Request failed.';
            return {
                statusCode: 0,
                headers: [],
                body: JSON.stringify({ error: errorMessage }, null, 2),
                error: errorMessage
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Request failed.';
            return {
                statusCode: 0,
                headers: [],
                body: JSON.stringify({ error: message }, null, 2),
                error: message
            };
        } finally {
            if (tempDir) {
                await rm(tempDir, { recursive: true, force: true });
            }
        }
    }
}
