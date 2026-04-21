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

import { VariableExtraction, TestResponse } from '@wso2/api-designer-core';
import { logInfo, logError } from '../util/logger';

/**
 * Utility for extracting variables from test responses
 */
export class VariableExtractor {
    /**
     * Extract variables from a test response
     */
    public static extractVariables(
        response: TestResponse,
        extractions: VariableExtraction[]
    ): Record<string, string> {
        const variables: Record<string, string> = {};

        for (const extraction of extractions) {
            try {
                const value = this.extractValue(response, extraction);
                if (value !== null && value !== undefined) {
                    variables[extraction.name] = String(value);
                    logInfo(`Extracted variable: ${extraction.name} = ${value}`);
                } else if (extraction.defaultValue) {
                    variables[extraction.name] = extraction.defaultValue;
                    logInfo(`Using default value for ${extraction.name}: ${extraction.defaultValue}`);
                }
            } catch (error) {
                logError(`Failed to extract variable ${extraction.name}:`, error);
                if (extraction.defaultValue) {
                    variables[extraction.name] = extraction.defaultValue;
                }
            }
        }

        return variables;
    }

    /**
     * Extract a single value from response
     */
    private static extractValue(
        response: TestResponse,
        extraction: VariableExtraction
    ): string | number | boolean | null {
        switch (extraction.source) {
            case 'body':
                return this.extractFromBody(response.body, extraction);
            case 'header':
                return this.extractFromHeader(response.headers, extraction);
            case 'status':
                return response.status;
            default:
                return null;
        }
    }

    /**
     * Extract value from response body using JSONPath
     */
    private static extractFromBody(
        body: string,
        extraction: VariableExtraction
    ): string | number | boolean | null {
        try {
            const jsonBody = JSON.parse(body);

            // Use JSONPath if provided
            if (extraction.jsonPath) {
                const value = this.evaluateJsonPath(jsonBody, extraction.jsonPath);
                if (value !== undefined) {
                    return value;
                }
            }

            // Use regex if provided
            if (extraction.regex) {
                const match = body.match(new RegExp(extraction.regex));
                if (match && match[1]) {
                    return match[1];
                }
            }

            return null;
        } catch (error) {
            // If not JSON, try regex on raw body
            if (extraction.regex) {
                const match = body.match(new RegExp(extraction.regex));
                if (match && match[1]) {
                    return match[1];
                }
            }
            return null;
        }
    }

    /**
     * Extract value from response headers
     */
    private static extractFromHeader(
        headers: Record<string, string>,
        extraction: VariableExtraction
    ): string | null {
        if (!extraction.headerName) {
            return null;
        }

        // Case-insensitive header lookup
        const headerName = extraction.headerName.toLowerCase();
        for (const [key, value] of Object.entries(headers)) {
            if (key.toLowerCase() === headerName) {
                return value;
            }
        }

        return null;
    }

    /**
     * Simple JSONPath evaluator (supports basic paths like $.data.id, $.items[0].name)
     */
    private static evaluateJsonPath(
        obj: unknown,
        path: string
    ): string | number | boolean | null | undefined {
        // Remove leading $. or $
        const cleanPath = path.replace(/^\$\.?/, '');
        
        if (!cleanPath) {
            return obj as string | number | boolean | null;
        }

        const parts = cleanPath.split('.');
        let current: unknown = obj;

        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }

            // Handle array index notation: items[0]
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, arrayName, indexStr] = arrayMatch;
                const index = parseInt(indexStr, 10);
                
                if (typeof current === 'object' && current !== null) {
                    const obj = current as Record<string, unknown>;
                    const array = obj[arrayName];
                    if (Array.isArray(array) && index < array.length) {
                        current = array[index];
                    } else {
                        return undefined;
                    }
                } else {
                    return undefined;
                }
            } else {
                // Regular property access
                if (typeof current === 'object' && current !== null) {
                    const obj = current as Record<string, unknown>;
                    current = obj[part];
                } else {
                    return undefined;
                }
            }
        }

        return current as string | number | boolean | null | undefined;
    }

    /**
     * Replace variables in a string with their values
     */
    public static replaceVariables(
        text: string,
        variables: Record<string, string>
    ): string {
        // Ensure text is a string
        if (typeof text !== 'string') {
            return String(text || '');
        }

        let result = text;

        // Replace ${variableName} or {{variableName}} patterns
        for (const [name, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\$\\{${name}\\}`, 'g'), value);
            result = result.replace(new RegExp(`\\{\\{${name}\\}\\}`, 'g'), value);
        }

        return result;
    }

    /**
     * Replace variables in request parameters, headers, body, and path
     */
    public static replaceInRequest(
        request: {
            path: string;
            parameters: Array<{ name: string; value: string }>;
            headers: Record<string, string>;
            body?: string;
        },
        variables: Record<string, string>
    ): void {
        // Replace in path (ensure it's a string)
        if (typeof request.path === 'string') {
            request.path = this.replaceVariables(request.path, variables);
        }

        // Replace in parameters (ensure values are strings)
        if (Array.isArray(request.parameters)) {
            for (const param of request.parameters) {
                if (param && typeof param.value !== 'undefined') {
                    param.value = this.replaceVariables(String(param.value), variables);
                }
            }
        }

        // Replace in headers (ensure values are strings)
        if (request.headers && typeof request.headers === 'object') {
            for (const [key, value] of Object.entries(request.headers)) {
                if (typeof value !== 'undefined') {
                    request.headers[key] = this.replaceVariables(String(value), variables);
                }
            }
        }

        // Replace in body (ensure it's a string)
        if (request.body && typeof request.body === 'string') {
            request.body = this.replaceVariables(request.body, variables);
        }
    }
}

