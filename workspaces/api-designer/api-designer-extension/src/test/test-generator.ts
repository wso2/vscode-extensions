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

import { TestRequest, TestParameter, TestAssertion, HttpMethod, SpecificationFactory } from '@wso2/api-designer-core';
import { logInfo } from '../util/logger';

/**
 * Generate test requests from API specification
 * Uses spec service to handle different specification types
 */
export class TestGenerator {
    /**
     * Generate tests from API spec (spec-agnostic)
     */
    public static generateFromSpec(
        spec: any,
        options?: {
            includeExamples?: boolean;
            includeErrorCases?: boolean;
            operationIds?: string[];
        }
    ): TestRequest[] {
        // Get spec service to determine how to generate tests
        const specService = SpecificationFactory.getServiceFromSpec(spec);
        
        if (!specService) {
            logInfo('Unable to detect specification type, falling back to OpenAPI test generation');
            return this.generateFromOpenAPI(spec, options);
        }
        
        
        // Currently only OpenAPI supports test generation
        // For other spec types, we'll need to implement their own test generation logic
        const specType = specService.getSpecType();
        if (specType !== 'openapi') {
            throw new Error(`Test generation for ${specType} is not yet implemented`);
        }
        
        // For OpenAPI, use the existing OpenAPI-specific logic
        return this.generateFromOpenAPI(spec, options);
    }

    /**
     * Generate tests from OpenAPI spec (legacy method, kept for backward compatibility)
     * @deprecated Use generateFromSpec instead
     */
    public static generateFromOpenAPI(
        spec: any,
        options?: {
            includeExamples?: boolean;
            includeErrorCases?: boolean;
            operationIds?: string[];
        }
    ): TestRequest[] {
        const requests: TestRequest[] = [];
        
        if (!spec.paths) {
            return requests;
        }
        
        // Iterate through paths
        for (const [path, pathItem] of Object.entries(spec.paths as Record<string, any>)) {
            // Iterate through operations (get, post, put, etc.)
            for (const [method, operation] of Object.entries(pathItem as Record<string, any>)) {
                if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
                    continue;
                }
                
                const operationId = operation.operationId as string | undefined;
                
                // Filter by operationIds if specified
                if (options?.operationIds && operationId && !options.operationIds.includes(operationId)) {
                    continue;
                }
                
                // Generate test request (merge path-level + operation parameters per OpenAPI)
                const testRequest = this.generateTestRequest(
                    path,
                    method.toUpperCase() as HttpMethod,
                    pathItem,
                    operation,
                    options,
                    spec
                );
                
                requests.push(testRequest);
                
                // Generate error case tests if requested
                if (options?.includeErrorCases) {
                    const errorTests = this.generateErrorCaseTests(path, method.toUpperCase() as HttpMethod, operation);
                    requests.push(...errorTests);
                }
            }
        }
        
        logInfo(`Generated ${requests.length} test requests from OpenAPI spec`);
        return requests;
    }

    /**
     * Generate a single test request from an operation
     */
    private static generateTestRequest(
        path: string,
        method: HttpMethod,
        pathItem: any,
        operation: any,
        options?: { includeExamples?: boolean },
        spec?: any
    ): TestRequest {
        const operationId = operation.operationId || `${method.toLowerCase()}_${path.replace(/\//g, '_')}`;
        const summary = operation.summary || `${method} ${path}`;
        
        const parameters = this.mergePathAndOperationParameters(pathItem, operation, spec, options?.includeExamples);
        
        // Extract request body (resolve $ref on requestBody and schemas)
        let body: string | undefined;
        if (operation.requestBody) {
            const raw = this.generateRequestBody(operation.requestBody, spec, options?.includeExamples);
            body = raw.trim().length > 0 ? raw : undefined;
        }
        
        // Generate headers including security requirements
        const headers: Record<string, string> = {};
        
        // Check for security requirements
        const security = operation.security || spec?.security;
        if (security && security.length > 0) {
            const securityScheme = security[0];
            const schemeName = Object.keys(securityScheme)[0];
            
            // Get security scheme definition
            const securityDef = spec?.components?.securitySchemes?.[schemeName];
            if (securityDef) {
                if (securityDef.type === 'http') {
                    if (securityDef.scheme === 'bearer') {
                        headers['Authorization'] = 'Bearer ${API_TOKEN}';
                    } else if (securityDef.scheme === 'basic') {
                        headers['Authorization'] = 'Basic ${BASIC_AUTH}';
                    }
                } else if (securityDef.type === 'apiKey') {
                    const headerName = securityDef.name || 'X-API-Key';
                    if (securityDef.in === 'header') {
                        headers[headerName] = '${API_KEY}';
                    } else if (securityDef.in === 'query') {
                        const q = securityDef.name || 'api_key';
                        if (!parameters.some((p) => p.type === 'query' && p.name === q)) {
                            parameters.push({
                                name: q,
                                value: '${API_KEY}',
                                type: 'query',
                                required: true
                            });
                        }
                    }
                } else if (securityDef.type === 'oauth2') {
                    headers['Authorization'] = 'Bearer ${ACCESS_TOKEN}';
                }
            }
        }

        if (body && String(body).trim().length > 0) {
            if (!headers['Content-Type'] && !headers['content-type']) {
                headers['Content-Type'] = 'application/json';
            }
        }
        
        // Extract expected status
        const expectedStatus = this.getSuccessStatus(operation.responses, method);
        
        // Generate basic assertions
        const assertions: TestAssertion[] = [
            {
                type: 'status',
                operator: 'equals',
                value: expectedStatus,
                description: `Status should be ${expectedStatus}`
            },
            {
                type: 'response-time',
                operator: 'lessThan',
                value: 5000,
                description: 'Response time should be less than 5 seconds'
            }
        ];
        
        // Add content-type assertion if specified
        const successResponse = operation.responses?.[expectedStatus];
        if (successResponse?.content) {
            const contentTypes = Object.keys(successResponse.content);
            if (contentTypes.length > 0) {
                assertions.push({
                    type: 'header',
                    field: 'content-type',
                    operator: 'contains',
                    value: contentTypes[0],
                    description: `Content-Type should be ${contentTypes[0]}`
                });
            }
        }
        
        return {
            id: `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            name: summary,
            operationId,
            method,
            path,
            parameters,
            body,
            headers,
            expectedStatus,
            assertions,
            timeout: 30000
        };
    }

    /**
     * Merge path-level and operation parameters (operation wins on same name+in). Resolves parameter $ref.
     */
    private static mergePathAndOperationParameters(
        pathItem: any,
        operation: any,
        spec: any,
        useExamples?: boolean
    ): TestParameter[] {
        const doc = spec ?? {};
        const merged = new Map<string, any>();
        const add = (raw: any) => {
            const param = raw?.$ref ? this.dereferenceJsonPointer(doc, raw.$ref) : raw;
            if (!param?.name || !param.in) {
                return;
            }
            merged.set(`${param.in}:${param.name}`, param);
        };
        for (const p of pathItem?.parameters || []) {
            add(p);
        }
        for (const p of operation?.parameters || []) {
            add(p);
        }

        const list: TestParameter[] = [];
        for (const param of merged.values()) {
            const paramValue = this.generateParameterValue(param, useExamples, doc);
            list.push({
                name: param.name,
                value: paramValue,
                type: param.in as 'path' | 'query' | 'header',
                required: !!param.required
            });
        }
        return list;
    }

    /** Resolve JSON pointer (#/...) against the OpenAPI document root. */
    private static dereferenceJsonPointer(doc: any, pointer: string): any {
        if (!pointer || typeof pointer !== 'string' || !pointer.startsWith('#/') || !doc) {
            return undefined;
        }
        const parts = pointer.substring(2).split('/');
        let current: any = doc;
        for (const raw of parts) {
            const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
            if (current == null || typeof current !== 'object') {
                return undefined;
            }
            current = current[key];
        }
        return current;
    }

    private static resolveRequestBodyNode(spec: any, requestBody: any): any {
        if (!requestBody) {
            return undefined;
        }
        if (requestBody.$ref) {
            return this.dereferenceJsonPointer(spec, requestBody.$ref);
        }
        return requestBody;
    }

    /**
     * Resolve schema $ref, allOf (merge), oneOf/anyOf (first branch). Used for bodies and parameter schemas.
     */
    private static resolveSchemaShallow(schema: any, spec: any, visited: Set<string>): any {
        if (!schema) {
            return {};
        }
        if (schema.$ref) {
            if (visited.has(schema.$ref)) {
                return {};
            }
            visited.add(schema.$ref);
            const resolved = this.dereferenceJsonPointer(spec, schema.$ref);
            return resolved ? this.resolveSchemaShallow(resolved, spec, visited) : {};
        }
        if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
            return this.mergeAllOf(schema.allOf, spec, visited);
        }
        if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
            return this.resolveSchemaShallow(schema.oneOf[0], spec, visited);
        }
        if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
            return this.resolveSchemaShallow(schema.anyOf[0], spec, visited);
        }
        return schema;
    }

    private static mergeAllOf(parts: any[], spec: any, visited: Set<string>): any {
        const merged: any = { type: 'object', properties: {}, required: [] as string[] };
        for (const part of parts) {
            const s = this.resolveSchemaShallow(part, spec, visited);
            if (s.properties) {
                Object.assign(merged.properties, s.properties);
            }
            if (Array.isArray(s.required)) {
                merged.required.push(...s.required);
            }
            if (s.type) {
                merged.type = s.type;
            }
        }
        merged.required = [...new Set(merged.required as string[])];
        return merged;
    }

    /**
     * Generate parameter value from parameter schema
     */
    private static generateParameterValue(param: any, useExamples?: boolean, spec?: any): string {
        if (useExamples && param.example !== undefined) {
            return String(param.example);
        }

        let schema = param.schema || {};
        if (spec) {
            schema = this.resolveSchemaShallow(schema, spec, new Set()) || {};
        }

        if (useExamples && schema.example !== undefined) {
            return String(schema.example);
        }
        if (schema.default !== undefined) {
            return String(schema.default);
        }

        switch (schema.type) {
            case 'integer':
            case 'number':
                return String(schema.minimum ?? 1);
            case 'boolean':
                return 'true';
            case 'array':
                return 'value1,value2';
            case 'string':
            default:
                if (schema.enum && schema.enum.length > 0) {
                    return String(schema.enum[0]);
                }
                if (schema.format === 'uuid') {
                    return '00000000-0000-4000-8000-000000000000';
                }
                return param.required ? `{${param.name}}` : 'value';
        }
    }

    /**
     * Generate request body from request body schema (resolves $ref, prefers JSON, fills required fields).
     */
    private static generateRequestBody(requestBody: any, spec: any, useExamples?: boolean): string {
        const doc = spec ?? {};
        const resolvedRb = this.resolveRequestBodyNode(doc, requestBody);
        const content = resolvedRb?.content;
        if (!content) {
            return '';
        }

        const score = (ct: string) => {
            if (ct === 'application/json' || ct.endsWith('+json')) {
                return 0;
            }
            if (ct === 'application/x-www-form-urlencoded') {
                return 1;
            }
            if (ct === 'multipart/form-data') {
                return 2;
            }
            return 3;
        };
        const mediaTypes = Object.keys(content).sort((a, b) => score(a) - score(b));

        for (const mediaType of mediaTypes) {
            const media = content[mediaType];
            if (!media) {
                continue;
            }

            if (useExamples && media.example !== undefined) {
                return typeof media.example === 'string'
                    ? media.example
                    : JSON.stringify(media.example, null, 2);
            }
            if (media.examples && typeof media.examples === 'object') {
                const first = Object.values(media.examples)[0] as { value?: unknown } | undefined;
                if (first?.value !== undefined) {
                    return typeof first.value === 'string'
                        ? first.value
                        : JSON.stringify(first.value, null, 2);
                }
            }

            if (media.schema) {
                const schema = this.resolveSchemaShallow(media.schema, doc, new Set());
                const generated = this.generateFromSchema(schema, doc, useExamples, new Set());

                if (mediaType.includes('json') || mediaType.endsWith('+json')) {
                    return JSON.stringify(generated, null, 2);
                }
                if (mediaType === 'application/x-www-form-urlencoded' && generated && typeof generated === 'object') {
                    return new URLSearchParams(
                        Object.fromEntries(
                            Object.entries(generated as Record<string, unknown>).map(([k, v]) => [
                                k,
                                v === null || v === undefined ? '' : String(v)
                            ])
                        )
                    ).toString();
                }
                return JSON.stringify(generated, null, 2);
            }
        }

        return '';
    }

    /**
     * Generate example data from JSON Schema (required properties first; if none listed, all properties).
     */
    private static generateFromSchema(
        schema: any,
        spec: any,
        useExamples?: boolean,
        visited?: Set<string>
    ): any {
        const vis = visited || new Set<string>();
        const resolved = this.resolveSchemaShallow(schema, spec, vis);
        if (!resolved || typeof resolved !== 'object') {
            return null;
        }

        if (useExamples && resolved.example !== undefined) {
            return resolved.example;
        }
        if (resolved.default !== undefined) {
            return resolved.default;
        }
        if (Array.isArray(resolved.enum) && resolved.enum.length > 0) {
            return resolved.enum[0];
        }

        const type = resolved.type;
        const hasProps = resolved.properties && Object.keys(resolved.properties).length > 0;

        if (type === 'object' || hasProps) {
            const props = resolved.properties || {};
            const requiredList = Array.isArray(resolved.required) ? resolved.required : [];
            const keys =
                requiredList.length > 0 ? requiredList : Object.keys(props);
            const obj: Record<string, unknown> = {};
            for (const key of keys) {
                const propSchema = props[key];
                if (!propSchema) {
                    continue;
                }
                obj[key] = this.generateFromSchema(propSchema, spec, useExamples, new Set(vis));
            }
            return obj;
        }

        switch (type) {
            case 'array':
                return resolved.items ? [this.generateFromSchema(resolved.items, spec, useExamples, new Set(vis))] : [];

            case 'string':
                if (resolved.enum?.length) {
                    return resolved.enum[0];
                }
                if (resolved.format === 'email') {
                    return 'user@example.com';
                }
                if (resolved.format === 'uri' || resolved.format === 'uri-reference') {
                    return 'https://example.com';
                }
                if (resolved.format === 'date') {
                    return '2024-01-01';
                }
                if (resolved.format === 'date-time') {
                    return '2024-01-01T00:00:00Z';
                }
                if (resolved.format === 'uuid') {
                    return '00000000-0000-4000-8000-000000000000';
                }
                return 'string';

            case 'number':
            case 'integer':
                return resolved.minimum ?? 0;

            case 'boolean':
                return true;

            default:
                return null;
        }
    }

    /**
     * Get success status code from responses
     */
    private static getSuccessStatus(responses: any, method?: string): number {
        if (!responses) return 200;

        const m = method?.toUpperCase();
        const postLike = m === 'POST' || m === 'PUT' || m === 'PATCH';
        // Creation/update often returns 201; prefer it when documented for these methods
        if (postLike && responses['201']) {
            return 201;
        }

        // Prefer 200, 201, 204
        if (responses['200']) return 200;
        if (responses['201']) return 201;
        if (responses['204']) return 204;
        
        // Find first 2xx response
        for (const status of Object.keys(responses)) {
            const statusNum = parseInt(status, 10);
            if (statusNum >= 200 && statusNum < 300) {
                return statusNum;
            }
        }
        
        return 200;
    }

    /**
     * Generate error case tests
     */
    private static generateErrorCaseTests(
        path: string,
        method: HttpMethod,
        operation: any
    ): TestRequest[] {
        const errorTests: TestRequest[] = [];
        
        if (!operation.responses) return errorTests;
        
        // Generate tests for error responses (4xx, 5xx)
        for (const [status, response] of Object.entries(operation.responses)) {
            const statusNum = parseInt(status, 10);
            if (statusNum >= 400) {
                const operationId = operation.operationId || `${method.toLowerCase()}_${path.replace(/\//g, '_')}`;
                
                errorTests.push({
                    id: `test_error_${statusNum}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    name: `${operation.summary || path} - Error ${status}`,
                    operationId: `${operationId}_error_${status}`,
                    method,
                    path,
                    parameters: [],
                    headers: {},
                    expectedStatus: statusNum,
                    assertions: [
                        {
                            type: 'status',
                            operator: 'equals',
                            value: statusNum,
                            description: `Should return ${status} error`
                        }
                    ],
                    timeout: 30000
                });
            }
        }
        
        return errorTests;
    }
}

