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
 * Supported API specification types
 */
export enum ApiSpecType {
    OPENAPI = 'openapi'
}

/**
 * File extensions for API specifications
 */
export const SPEC_FILE_EXTENSIONS = {
    [ApiSpecType.OPENAPI]: ['.yaml', '.yml', '.json']
} as const;

/**
 * Specification version patterns
 */
export const SPEC_VERSION_PATTERNS = {
    [ApiSpecType.OPENAPI]: /^\s*openapi\s*:\s*['"]?([0-9]+\.[0-9]+)/i
} as const;

/**
 * Specification field names in parsed objects
 */
export const SPEC_FIELD_NAMES = {
    [ApiSpecType.OPENAPI]: 'openapi'
} as const;

/**
 * Default specification versions
 */
export const DEFAULT_SPEC_VERSIONS = {
    [ApiSpecType.OPENAPI]: '3.1.0'
} as const;

/**
 * OpenAPI `openapi` field major.minor versions supported by API Designer (patch is ignored).
 * Aligns with tooling that targets OpenAPI 3.0 and 3.1.
 */
export const SUPPORTED_OPENAPI_MAJOR_MINORS: ReadonlyArray<readonly [number, number]> = [
    [3, 0],
    [3, 1]
];

