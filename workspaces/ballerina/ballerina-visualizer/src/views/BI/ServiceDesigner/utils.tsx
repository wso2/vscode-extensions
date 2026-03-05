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

import { FunctionModel, ResponseCode, VisibleTypeItem, VisibleTypesResponse } from '@wso2/ballerina-core';

export enum HTTP_METHOD {
    "GET" = "GET",
    "PUT" = "PUT",
    "POST" = "POST",
    "DELETE" = "DELETE",
    "PATCH" = "PATCH"
}

export function getDefaultResponse(httpMethod: HTTP_METHOD): string {
    switch (httpMethod.toUpperCase()) {
        case HTTP_METHOD.GET:
            return "200";
        case HTTP_METHOD.PUT:
            return "200";
        case HTTP_METHOD.POST:
            return "201";
        case HTTP_METHOD.DELETE:
            return "200";
        case HTTP_METHOD.PATCH:
            return "200";
        default:
            return "200";
    }
}

export function getTitleFromStatusCodeAndType(responseCodes: VisibleTypesResponse, statusCode: string, type: string): string {
    let responseCode: VisibleTypeItem | undefined;

    if (statusCode && type) {
        // If both statusCode and type are provided, find by both
        responseCode = responseCodes.find(res => res.labelDetails.detail === statusCode && res.detail === type);
        // If not found with both, fallback to statusCode only
        if (!responseCode) {
            responseCode = responseCodes.find(res => res.labelDetails.detail === statusCode);
        }
    } else if (statusCode) {
        // If only statusCode is provided, find by statusCode only
        responseCode = responseCodes.find(res => res.labelDetails.detail === statusCode);
    } else if (type) {
        // If only type is provided, find by type only
        responseCode = responseCodes.find(res => res.detail === type);
    }

    return responseCode ? `${responseCode.labelDetails.detail} - ${responseCode.label}` : "";
}


export function sanitizedHttpPath(value: string): string {
    return removeForwardSlashes(value).replace(/-/g, '\\-').replace(/\./g, '\\.');
}

export function removeForwardSlashes(value: string): string {
    return value?.replace(/\\/g, '');
}

export function canDataBind(functionModel: FunctionModel): boolean {
    return functionModel.properties?.canDataBind?.value === "true" ||
        functionModel.parameters?.some(param => param.kind === "DATA_BINDING");
}

export function getDefaultTab(functionModel: FunctionModel) {
    return functionModel.properties?.defaultTypeTab?.value as "import" | "create-from-scratch" | "browse-exisiting-types";
}

export function getReadableListenerName(name: string) {
    // Examples names: new http:Listener(8090);, new mcp:Listener("mcp://localhost:8090")
    // Convert the name to human readable name like "HTTP Listener" or "MCP Listener" etc..
    const match = name.match(/new\s+([a-zA-Z0-9_]+):Listener/i);
    const listenerType = match ? match[1] : "Unknown";
    return `${listenerType.charAt(0).toUpperCase() + listenerType.slice(1)} Listener`;
}

/**
 * Build base URL from listener and base path.
 * Handles listener formats:
 *   "localhost:8080", "0.0.0.0:8080"          → standard host:port
 *   "new http:Listener(8080)"                  → anonymous inline listener
 *   "9090"                                     → port-only number
 */
export function buildBaseUrl(listener: string, basePath: string = ''): string {
    let host = 'localhost';
    let port = '8080';

    if (listener) {
        // Anonymous inline listener: new http:Listener(9090) or new http:Listener("host:port")
        const anonymousMatch = listener.match(/new\s+\w+:Listener\(\s*["']?(\d+)["']?\s*\)/);
        if (anonymousMatch) {
            port = anonymousMatch[1];
        } else if (/^\d+$/.test(listener.trim())) {
            // Bare port number: "9090"
            port = listener.trim();
        } else {
            // Standard host:port, e.g. "localhost:8080" or "0.0.0.0:9090"
            const colonIdx = listener.lastIndexOf(':');
            if (colonIdx !== -1) {
                const h = listener.slice(0, colonIdx).trim();
                const p = listener.slice(colonIdx + 1).trim();
                host = h === '0.0.0.0' ? 'localhost' : h;
                port = p;
            }
        }
    }

    // Normalise basePath: treat "/" as empty and strip any trailing slash
    const normalizedBase = (basePath || '').replace(/\/+$/, '') === '' ? '' : (basePath || '').replace(/\/+$/, '');

    return `http://${host}:${port}${normalizedBase}`;
}

export function hasEditableParameters(parameters: FunctionModel['parameters']): boolean {
    if (!parameters || parameters.length === 0) {
        return false;
    }
    return parameters.some((param) => param.editable !== false);
}

/**
 * Normalizes a value to an array for MULTIPLE_SELECT and EXPRESSION_SET types.
 *
 * @param value The value to normalize
 * @returns An array containing the value(s), or an empty array if value is falsy
 */
export function normalizeValueToArray(value: any): any[] {
    if (Array.isArray(value)) {
        return value;
    }
    return value ? [value] : [];
}
