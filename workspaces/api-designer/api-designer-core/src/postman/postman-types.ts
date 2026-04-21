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

/**
 * Postman Collection Format v2.1.0
 * Based on: https://schema.getpostman.com/json/collection/v2.1.0/
 */

export interface PostmanCollection {
    info: PostmanInfo;
    item: PostmanItem[];
    variable?: PostmanVariable[];
    auth?: PostmanAuth;
}

export interface PostmanInfo {
    name: string;
    description?: string;
    version?: string;
    schema: string; // "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    _postman_id?: string;
}

export interface PostmanItem {
    name: string;
    description?: string;
    request?: PostmanRequest;
    response?: PostmanResponse[];
    event?: PostmanEvent[];
    item?: PostmanItem[]; // For folders
}

export interface PostmanRequest {
    method: string;
    header?: PostmanHeader[];
    body?: PostmanBody;
    url: PostmanUrl | string;
    auth?: PostmanAuth;
    description?: string;
}

export interface PostmanHeader {
    key: string;
    value: string;
    disabled?: boolean;
    description?: string;
}

export interface PostmanBody {
    mode: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql';
    raw?: string;
    urlencoded?: Array<{ key: string; value: string; disabled?: boolean }>;
    formdata?: Array<{ key: string; value: string; type?: string; disabled?: boolean }>;
    options?: {
        raw?: {
            language?: string;
        };
    };
}

export interface PostmanUrl {
    raw: string;
    protocol?: string;
    host?: string[];
    path?: string[];
    query?: PostmanQueryParam[];
    variable?: PostmanVariable[];
}

export interface PostmanQueryParam {
    key: string;
    value: string;
    disabled?: boolean;
    description?: string;
}

export interface PostmanVariable {
    key: string;
    value: string;
    type?: string;
    disabled?: boolean;
    description?: string;
}

export interface PostmanAuth {
    type: 'apikey' | 'bearer' | 'basic' | 'oauth2' | 'noauth';
    apikey?: Array<{ key: string; value: string; type?: string }>;
    bearer?: Array<{ key: string; value: string; type?: string }>;
    basic?: Array<{ key: string; value: string; type?: string }>;
}

export interface PostmanEvent {
    listen: 'prerequest' | 'test';
    script: PostmanScript;
}

export interface PostmanScript {
    type?: string;
    exec: string[];
}

export interface PostmanResponse {
    name: string;
    originalRequest?: PostmanRequest;
    status?: string;
    code?: number;
    header?: PostmanHeader[];
    body?: string;
}
