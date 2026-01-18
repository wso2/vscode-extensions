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

import { QueryParameter, HeaderParameter, ApiRequest } from '@wso2/api-tryit-core';
import { SectionType } from './Types';

/**
 * Converts an ApiRequest object to a formatted code string
 */
export const requestToCode = (request: ApiRequest): string => {
    const lines: string[] = [];

    // Query Parameters section
    lines.push('Query Parameters');
    if (request.queryParameters && request.queryParameters.length > 0) {
        request.queryParameters.forEach(param => {
            if (param.key || param.value) {
                const prefix = param.enabled ? '' : '// ';
                lines.push(`${prefix}${param.key}=${param.value}`);
            }
        });
    } else {
        lines.push(''); // Empty line after header if no params
    }
    lines.push('');

    // Headers section
    lines.push('Headers');
    if (request.headers && request.headers.length > 0) {
        request.headers.forEach(header => {
            if (header.key || header.value) {
                const prefix = header.enabled ? '' : '// ';
                lines.push(`${prefix}${header.key}: ${header.value}`);
            }
        });
    } else {
        lines.push(''); // Empty line after header if no headers
    }
    lines.push('');

    // Body section
    lines.push('Body');
    if (request.body) {
        lines.push(request.body);
    } else {
        lines.push(''); // Empty line after header if no body
    }

    return lines.join('\n');
};

/**
 * Parses a code string back into an ApiRequest object
 */
export const codeToRequest = (code: string, existingRequest: ApiRequest): ApiRequest => {
    const lines = code.split('\n');
    const queryParameters: QueryParameter[] = [];
    const headers: HeaderParameter[] = [];
    let body = '';
    let currentSection: SectionType = 'none';
    let bodyLines: string[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Check for section headers
        if (trimmedLine.toLowerCase() === 'query parameters') {
            currentSection = 'query';
            continue;
        }
        if (trimmedLine.toLowerCase() === 'headers') {
            currentSection = 'headers';
            continue;
        }
        if (trimmedLine.toLowerCase() === 'body') {
            currentSection = 'body';
            continue;
        }

        // Skip empty lines (except in body)
        if (currentSection !== 'body' && trimmedLine === '') {
            continue;
        }

        // Parse based on current section
        switch (currentSection) {
            case 'query': {
                const isDisabled = trimmedLine.startsWith('//');
                const paramLine = isDisabled ? trimmedLine.substring(2).trim() : trimmedLine;

                const eqIndex = paramLine.indexOf('=');
                if (eqIndex > 0) {
                    const key = paramLine.substring(0, eqIndex).trim();
                    const value = paramLine.substring(eqIndex + 1).trim();
                    if (key) {
                        queryParameters.push({
                            id: generateId(),
                            key,
                            value,
                            enabled: !isDisabled
                        });
                    }
                }
                break;
            }
            case 'headers': {
                const isDisabled = trimmedLine.startsWith('//');
                const headerLine = isDisabled ? trimmedLine.substring(2).trim() : trimmedLine;

                const colonIndex = headerLine.indexOf(':');
                if (colonIndex > 0) {
                    const key = headerLine.substring(0, colonIndex).trim();
                    const value = headerLine.substring(colonIndex + 1).trim();
                    if (key) {
                        headers.push({
                            id: generateId(),
                            key,
                            value,
                            enabled: !isDisabled
                        });
                    }
                }
                break;
            }
            case 'body': {
                bodyLines.push(line);
                break;
            }
        }
    }

    // Join body lines and trim
    body = bodyLines.join('\n').trim();

    return {
        ...existingRequest,
        queryParameters,
        headers,
        body: body || undefined  // Use undefined for empty body
    };
};

/**
 * Determines if the current VS Code theme is dark
 */
export const getIsDarkTheme = (): boolean => {
    return document.body.classList.contains('vscode-dark') ||
           document.body.classList.contains('vscode-high-contrast');
};

/**
 * Generates a unique ID for request parameters
 */
export const generateId = (): string => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};