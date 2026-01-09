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

// Add your interfaces here
export interface ApiTryItData {
    message: string;
}

// Request parameter types
export interface QueryParameter {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
}

export interface HeaderParameter {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
}

// Request definition
export interface ApiRequest {
    id: string;
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    url: string;
    queryParameters: QueryParameter[];
    headers: HeaderParameter[];
    body?: string;
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
    filePath?: string; // Optional file path where this request is stored
}

// Folder - contains multiple request items
export interface ApiFolder {
    id: string;
    name: string;
    items: ApiRequestItem[];
}

// Collection - contains folders with request items
export interface ApiCollection {
    id: string;
    name: string;
    description?: string;
    folders: ApiFolder[];
}
