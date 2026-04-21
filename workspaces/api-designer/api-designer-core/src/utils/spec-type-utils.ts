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

import { ApiSpecType, SUPPORTED_OPENAPI_MAJOR_MINORS } from '../specs/constants';
import { detectSpecType } from '../specs/detector';

/**
 * Check if spec is OpenAPI
 * @param spec - The API specification object
 * @returns True if spec is OpenAPI
 */
export function isOpenAPI(spec: unknown): boolean {
    return typeof spec === 'object' && spec !== null && 'openapi' in spec;
}

/**
 * Check if spec is AsyncAPI
 * @param spec - The API specification object
 * @returns True if spec is AsyncAPI
 */
export function isAsyncAPI(spec: unknown): boolean {
    return typeof spec === 'object' && spec !== null && 'asyncapi' in spec;
}

/**
 * Get spec type from spec object
 * @param spec - The API specification object
 * @returns ApiSpecType or null if type cannot be determined
 */
export function getSpecType(spec: unknown): ApiSpecType | null {
    if (isOpenAPI(spec)) return ApiSpecType.OPENAPI;
    if (isAsyncAPI(spec)) return ApiSpecType.ASYNCAPI;
    return null;
}

/**
 * Get spec type string for display purposes
 * @param spec - The API specification object
 * @returns Human-readable spec type string
 */
export function getSpecTypeString(spec: unknown): string {
    const type = getSpecType(spec);
    if (!type) return 'Unknown';
    
    switch (type) {
        case ApiSpecType.OPENAPI:
            return 'OpenAPI';
        case ApiSpecType.ASYNCAPI:
            return 'AsyncAPI';
        default:
            return 'Unknown';
    }
}

/**
 * Check if spec type matches expected type
 * @param spec - The API specification object
 * @param expectedType - The expected ApiSpecType
 * @returns True if spec type matches expected type
 */
export function isSpecType(spec: unknown, expectedType: ApiSpecType): boolean {
    const actualType = getSpecType(spec);
    return actualType === expectedType;
}

/**
 * Assert that spec is of a specific type, throw error if not
 * @param spec - The API specification object
 * @param expectedType - The expected ApiSpecType
 * @param errorMessage - Custom error message (optional)
 * @throws Error if spec type doesn't match expected type
 */
export function assertSpecType(
    spec: unknown,
    expectedType: ApiSpecType,
    errorMessage?: string
): void {
    if (!isSpecType(spec, expectedType)) {
        const actualType = getSpecTypeString(spec);
        throw new Error(
            errorMessage || 
            `Expected ${expectedType} specification, but got ${actualType}`
        );
    }
}

/**
 * True if content is an OpenAPI document whose `openapi` version is supported (3.0.x / 3.1.x).
 */
export function isSupportedOpenApiDocument(content: string): boolean {
    const detection = detectSpecType(content);
    if (detection.type !== ApiSpecType.OPENAPI) {
        return false;
    }
    const version = detection.version;
    if (version == null || String(version).trim() === '') {
        return false;
    }
    const m = String(version).trim().match(/^(\d+)\.(\d+)/);
    if (!m) {
        return false;
    }
    const major = parseInt(m[1], 10);
    const minor = parseInt(m[2], 10);
    return SUPPORTED_OPENAPI_MAJOR_MINORS.some(([ma, mi]) => ma === major && mi === minor);
}

