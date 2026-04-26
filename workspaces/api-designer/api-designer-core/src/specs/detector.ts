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

import { ApiSpecType, SPEC_VERSION_PATTERNS, SPEC_FIELD_NAMES } from './constants';
import { loadYaml } from '../utils/yaml-utils';

export interface SpecDetectionResult {
    type: ApiSpecType | null;
    version: string | null;
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Detects the API specification type from file content
 */
export function detectSpecType(content: string): SpecDetectionResult {
    if (!content || content.trim().length === 0) {
        return { type: null, version: null, confidence: 'low' };
    }

    // Try to detect from first few lines (for YAML)
    const firstLines = content.split('\n').slice(0, 20).join('\n');
    
    // Check for OpenAPI
    const openApiMatch = SPEC_VERSION_PATTERNS[ApiSpecType.OPENAPI].exec(firstLines);
    if (openApiMatch) {
        return {
            type: ApiSpecType.OPENAPI,
            version: openApiMatch[1],
            confidence: 'high'
        };
    }

        // Try parsing as JSON/YAML and checking object properties
        try {
            let parsed: unknown;
            if (content.trim().startsWith('{')) {
                parsed = JSON.parse(content) as unknown;
            } else {
                parsed = loadYaml(content) as unknown;
            }

            if (parsed && typeof parsed === 'object' && parsed !== null) {
            const parsedObj = parsed as Record<string, unknown>;
            
            // Check for OpenAPI
            const openApiField = SPEC_FIELD_NAMES[ApiSpecType.OPENAPI];
            if (openApiField in parsedObj) {
                return {
                    type: ApiSpecType.OPENAPI,
                    version: String(parsedObj[openApiField] || ''),
                    confidence: 'high'
                };
            }

            // Check for info object and infer OpenAPI from structure
            if ('info' in parsedObj) {
                if ('paths' in parsedObj) {
                    return {
                        type: ApiSpecType.OPENAPI,
                        version: null,
                        confidence: 'medium'
                    };
                }
            }
        }
    } catch {
        // Parsing failed, return low confidence
        return { type: null, version: null, confidence: 'low' };
    }

    return { type: null, version: null, confidence: 'low' };
}

/**
 * Detects specification type from file path
 */
export function detectSpecTypeFromPath(filePath: string): ApiSpecType | null {
    const lowerPath = filePath.toLowerCase();
    
    // Check for explicit spec type in filename
    if (lowerPath.includes('openapi') || lowerPath.includes('swagger')) {
        return ApiSpecType.OPENAPI;
    }
    
    // Check file extension
    if (lowerPath.endsWith('.yaml') || lowerPath.endsWith('.yml') || lowerPath.endsWith('.json')) {
        // Can't determine from path alone, return null
        return null;
    }

    return null;
}

/**
 * Checks if a file is likely an API specification
 */
export function isApiSpecFile(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    const validExtensions = ['.yaml', '.yml', '.json'];
    return validExtensions.some(ext => lowerPath.endsWith(ext));
}

