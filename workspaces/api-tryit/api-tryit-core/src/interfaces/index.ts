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

// Add your interfaces here
export interface ApiTryItData {
    message: string;
}

// Request parameter types
export interface QueryParameter {
    id: string;
    key: string;
    value: string;
}

export interface HeaderParameter {
    id: string;
    key: string;
    value: string;
}

export interface FormDataParameter {
    id: string;
    key: string;
    contentType: string;
    filePath?: string;
    // For simple text form fields (non-file), the value is stored here.
    value?: string;
} 

export interface FormUrlEncodedParameter {
    id: string;
    key: string;
    value: string;
}

export interface BinaryFileParameter {
    id: string;
    filePath: string;
    contentType: string;
    enabled?: boolean;
}

// RPC request/response types for saving
export interface SaveRequestRequest {
    filePath: string;
    request: ApiRequest;
    response?: ApiResponse;
}

export interface SaveRequestResponse {
    success: boolean;
    message: string;
}

// HTTP Request execution types
export interface HttpRequestOptions {
    method: string;
    url: string;
    params?: Record<string, string>;
    headers?: Record<string, string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    formData?: FormDataParameter[];
}

export interface HttpResponseResult {
    statusCode: number;
    headers: ResponseHeader[];
    body: string;
    error?: string;
}

// Request definition
export interface ApiRequest {
    id: string;
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE';
    url: string;
    queryParameters: QueryParameter[];
    headers: HeaderParameter[];
    body?: string;
    bodyFormData?: FormDataParameter[];
    bodyFormUrlEncoded?: FormUrlEncodedParameter[];
    bodyBinaryFiles?: BinaryFileParameter[];
    assertions?: string[];
}

// Response types
export interface ResponseHeader {
    key: string;
    value: string;
}

export interface ApiResponse {
    statusCode: number;
    headers: ResponseHeader[];
    body: string;
}

// Request Item - combines a request with its response
export interface ApiRequestItem {
    id: string;
    name: string;
    request: ApiRequest;
    response?: ApiResponse; // Optional since response may not exist until request is executed
    assertions?: string[]; // Top-level assertions (persisted alongside request/response)
    filePath?: string; // Optional file path where this request is stored
}

// Folder - contains multiple request items
export interface ApiFolder {
    id: string;
    name: string;
    items: ApiRequestItem[];
    filePath?: string;
}

// Collection - contains folders with request items
export interface ApiCollection {
    id: string;
    name: string;
    description?: string;
    folders: ApiFolder[];
    rootItems?: ApiRequestItem[];
}

// Hurl run models
export type HurlRunStatus = 'passed' | 'failed' | 'error' | 'cancelled';

export type HurlFileStatus = 'passed' | 'failed' | 'error' | 'skipped';

export interface HurlRunSummary {
    totalFiles: number;
    passedFiles: number;
    failedFiles: number;
    errorFiles: number;
    skippedFiles: number;
    totalEntries: number;
    passedEntries: number;
    failedEntries: number;
}

export interface HurlAssertionResult {
    filePath: string;
    entryName?: string;
    expression: string;
    status: 'passed' | 'failed';
    expected?: string;
    actual?: string;
    message?: string;
    line?: number;
}

export interface HurlEntryResult {
    name: string;
    method?: string;
    url?: string;
    statusCode?: number;
    status: 'passed' | 'failed' | 'error';
    durationMs?: number;
    assertions?: HurlAssertionResult[];
    line?: number;
    errorMessage?: string;
}

export interface HurlFileResult {
    filePath: string;
    status: HurlFileStatus;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    entries: HurlEntryResult[];
    assertions: HurlAssertionResult[];
    errorMessage?: string;
    stdout?: string;
    stderr?: string;
}

export interface HurlRunResult {
    runId: string;
    status: HurlRunStatus;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    summary: HurlRunSummary;
    files: HurlFileResult[];
}

export type HurlRunEvent =
    | { type: 'runStarted'; runId: string; totalFiles: number }
    | { type: 'fileStarted'; runId: string; filePath: string }
    | { type: 'fileFinished'; runId: string; file: HurlFileResult }
    | { type: 'runProgress'; runId: string; completedFiles: number; totalFiles: number }
    | { type: 'runFinished'; runId: string; result: HurlRunResult }
    | { type: 'runCancelled'; runId: string };

export type HurlRunScope = 'all' | 'collection';

export interface HurlRunViewContext {
    scope: HurlRunScope;
    label: string;
    sourcePath: string;
}
