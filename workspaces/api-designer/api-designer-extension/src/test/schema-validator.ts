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

import { logInfo, logError } from '../util/logger';

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
    valid: boolean;
    errors?: Array<{
        path: string;
        message: string;
        keyword?: string;
    }>;
}

/**
 * Validator for OpenAPI response schemas
 * Note: Full schema validation with Ajv can be added later
 * For now, provides basic type checking
 */
export class SchemaValidator {
    /**
     * Validate response against OpenAPI schema (basic validation)
     */
    public static validateResponse(
        responseBody: string,
        schema: any,
        contentType: string = 'application/json'
    ): SchemaValidationResult {
        try {
            // Only validate JSON responses for now
            if (!contentType.includes('json')) {
                return {
                    valid: true // Skip validation for non-JSON
                };
            }

            // Parse response body
            let parsedBody: any;
            try {
                parsedBody = JSON.parse(responseBody);
            } catch (parseError) {
                return {
                    valid: false,
                    errors: [{
                        path: 'body',
                        message: 'Response body is not valid JSON'
                    }]
                };
            }

            // Basic type validation
            const errors: Array<{ path: string; message: string; keyword?: string }> = [];
            
            // Check type
            if (schema.type) {
                const actualType = Array.isArray(parsedBody) ? 'array' : typeof parsedBody;
                const expectedType = schema.type;
                
                if (actualType !== expectedType && !(actualType === 'object' && parsedBody === null && expectedType === 'null')) {
                    errors.push({
                        path: 'root',
                        message: `Expected type ${expectedType}, got ${actualType}`,
                        keyword: 'type'
                    });
                }
            }

            // Check required properties for objects
            if (schema.type === 'object' && schema.required && Array.isArray(schema.required)) {
                for (const requiredProp of schema.required) {
                    if (!(requiredProp in parsedBody)) {
                        errors.push({
                            path: requiredProp,
                            message: `Required property '${requiredProp}' is missing`,
                            keyword: 'required'
                        });
                    }
                }
            }

            return {
                valid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (error) {
            logError('Schema validation error:', error);
            return {
                valid: false,
                errors: [{
                    path: 'validation',
                    message: error instanceof Error ? error.message : 'Validation failed'
                }]
            };
        }
    }

    /**
     * Get response schema from OpenAPI operation
     */
    public static getResponseSchema(
        operation: any,
        statusCode: number,
        contentType: string = 'application/json'
    ): any | null {
        try {
            const responses = operation.responses;
            if (!responses) return null;

            // Try exact status code
            let response = responses[statusCode.toString()];
            
            // Try default response
            if (!response) {
                response = responses['default'];
            }

            if (!response) return null;

            // Get schema for content type
            const content = response.content;
            if (!content) return null;

            const mediaType = content[contentType] || content['application/json'];
            if (!mediaType) return null;

            return mediaType.schema || null;

        } catch (error) {
            logError('Failed to get response schema:', error);
            return null;
        }
    }

    /**
     * Validate response against OpenAPI operation
     */
    public static validateAgainstOperation(
        responseBody: string,
        statusCode: number,
        contentType: string,
        operation: any
    ): SchemaValidationResult {
        const schema = this.getResponseSchema(operation, statusCode, contentType);
        
        if (!schema) {
            logInfo('No schema found for validation, skipping');
            return { valid: true }; // No schema to validate against
        }

        return this.validateResponse(responseBody, schema, contentType);
    }
}

