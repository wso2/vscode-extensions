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

import { ApiSpecType } from './constants';
import { SpecificationService } from './specification-service';
import { ApiSpecification, SpecInfo, SpecParseResult, SpecValidationResult } from './types';
import { OpenAPISpec } from './openapi-types';
import { Server } from './common-types';
import { loadYaml } from '../utils/yaml-utils';

/**
 * Service for handling OpenAPI specifications
 */
export class OpenAPIService extends SpecificationService {
    constructor() {
        super(ApiSpecType.OPENAPI);
    }

    parse(content: string): SpecParseResult {
        try {
            let parsed: unknown;
            if (content.trim().startsWith('{')) {
                parsed = JSON.parse(content) as unknown;
            } else {
                parsed = loadYaml(content) as unknown;
            }

            if (this.isValid(parsed)) {
                return {
                    success: true,
                    spec: parsed as ApiSpecification,
                    type: ApiSpecType.OPENAPI
                };
            }

            return {
                success: false,
                error: 'Invalid OpenAPI specification',
                type: ApiSpecType.OPENAPI
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to parse OpenAPI specification',
                type: ApiSpecType.OPENAPI
            };
        }
    }

    extractInfo(spec: ApiSpecification): SpecInfo {
        const openApiSpec = spec as unknown as OpenAPISpec;
        const mainEndpoint = this.getMainEndpoint(spec);

        return {
            type: ApiSpecType.OPENAPI,
            version: openApiSpec.openapi || '',
            title: openApiSpec.info?.title,
            description: openApiSpec.info?.description,
            apiVersion: openApiSpec.info?.version,
            mainEndpoint
        };
    }

    getMainEndpoint(spec: ApiSpecification): string | undefined {
        const openApiSpec = spec as unknown as OpenAPISpec;
        if (openApiSpec.servers && openApiSpec.servers.length > 0) {
            return openApiSpec.servers[0]?.url;
        }
        return undefined;
    }

    getEndpoints(spec: ApiSpecification): Array<{ path: string; method?: string; description?: string }> {
        const openApiSpec = spec as unknown as OpenAPISpec;
        const endpoints: Array<{ path: string; method?: string; description?: string }> = [];

        if (openApiSpec.paths) {
            const pathEntries = Object.keys(openApiSpec.paths).map(key => [key, openApiSpec.paths[key]] as const);
            pathEntries.forEach(([path, pathItem]) => {
                const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
                methods.forEach(method => {
                    const operation = pathItem[method];
                    if (operation && typeof operation === 'object') {
                        const op = operation as { description?: string; summary?: string };
                        endpoints.push({
                            path,
                            method: method.toUpperCase(),
                            description: op.description || op.summary || pathItem.description
                        });
                    }
                });
            });
        }

        return endpoints;
    }

    validate(spec: ApiSpecification): SpecValidationResult {
        const errors: SpecValidationResult['errors'] = [];
        const warnings: SpecValidationResult['warnings'] = [];

        const openApiSpec = spec as unknown as OpenAPISpec;

        // Basic validation
        if (!openApiSpec.openapi) {
            errors.push({ path: '/', message: 'Missing openapi version field' });
        }

        if (!openApiSpec.info) {
            errors.push({ path: '/', message: 'Missing info object' });
        } else {
            if (!openApiSpec.info.title) {
                errors.push({ path: '/info', message: 'Missing title in info object' });
            }
            if (!openApiSpec.info.version) {
                errors.push({ path: '/info', message: 'Missing version in info object' });
            }
        }

        if (!openApiSpec.paths || Object.keys(openApiSpec.paths).length === 0) {
            warnings.push({ path: '/', message: 'No paths defined' });
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    getVersion(spec: ApiSpecification): string | undefined {
        const openApiSpec = spec as unknown as OpenAPISpec;
        return openApiSpec.openapi;
    }

    isValid(spec: unknown): boolean {
        return spec !== null && typeof spec === 'object' && 'openapi' in spec && 'info' in spec && 'paths' in spec;
    }

    // ============================================================================
    // New methods for extensibility
    // ============================================================================

    getDefaultFileName(): string {
        return 'openapi.yaml';
    }

    getDefaultExtension(): string {
        return '.yaml';
    }

    getServers(spec: ApiSpecification): Array<{ url: string; description?: string }> {
        const openApiSpec = spec as unknown as OpenAPISpec;
        if (!openApiSpec.servers) {
            return [];
        }
        return openApiSpec.servers.map((server: Server) => ({
            url: server.url,
            description: server.description
        }));
    }

    getOperations(spec: ApiSpecification): Array<{ path: string; method?: string; operationId?: string }> {
        const openApiSpec = spec as unknown as OpenAPISpec;
        const operations: Array<{ path: string; method?: string; operationId?: string }> = [];

        if (openApiSpec.paths) {
            const pathEntries = Object.keys(openApiSpec.paths).map(key => [key, openApiSpec.paths[key]] as const);
            pathEntries.forEach(([path, pathItem]) => {
                const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];
                methods.forEach(method => {
                    const operation = pathItem[method];
                    if (operation && typeof operation === 'object') {
                        operations.push({
                            path,
                            method: method.toUpperCase(),
                            operationId: (operation as { operationId?: string }).operationId
                        });
                    }
                });
            });
        }

        return operations;
    }

    getComponents(spec: ApiSpecification): Record<string, unknown> | undefined {
        const openApiSpec = spec as unknown as OpenAPISpec;
        return openApiSpec.components as Record<string, unknown> | undefined;
    }

    // ============================================================================
    // Validation-specific methods
    // ============================================================================

    getDefaultValidationRuleset(): string {
        // Return OpenAPI Spectral ruleset
        // This will be dynamically imported in the extension
        return 'oas';
    }

    getDefaultValidationRulesetName(): string {
        return 'OpenAPI';
    }

}

