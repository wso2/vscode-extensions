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
import { SpecificationService, SpecFeature } from './specification-service';
import { ApiSpecification, SpecInfo, SpecParseResult, SpecValidationResult } from './types';
import { AsyncAPISpec } from './asyncapi-types';
import { Server } from './common-types';
import { loadYaml } from '../utils/yaml-utils';

/**
 * Service for handling AsyncAPI specifications
 */
export class AsyncAPIService extends SpecificationService {
    constructor() {
        super(ApiSpecType.ASYNCAPI);
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
                    type: ApiSpecType.ASYNCAPI
                };
            }

            return {
                success: false,
                error: 'Invalid AsyncAPI specification',
                type: ApiSpecType.ASYNCAPI
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to parse AsyncAPI specification',
                type: ApiSpecType.ASYNCAPI
            };
        }
    }

    extractInfo(spec: ApiSpecification): SpecInfo {
        const asyncApiSpec = spec as unknown as AsyncAPISpec;
        const mainEndpoint = this.getMainEndpoint(spec);

        return {
            type: ApiSpecType.ASYNCAPI,
            version: asyncApiSpec.asyncapi || '',
            title: asyncApiSpec.info?.title,
            description: asyncApiSpec.info?.description,
            apiVersion: asyncApiSpec.info?.version,
            mainEndpoint
        };
    }

    getMainEndpoint(spec: ApiSpecification): string | undefined {
        const asyncApiSpec = spec as unknown as AsyncAPISpec;
        if (asyncApiSpec.servers && Object.keys(asyncApiSpec.servers).length > 0) {
            const serverNames = Object.keys(asyncApiSpec.servers);
            const firstServer = asyncApiSpec.servers[serverNames[0]];
            return firstServer?.url;
        }
        return undefined;
    }

    getEndpoints(spec: ApiSpecification): Array<{ path: string; method?: string; description?: string }> {
        const asyncApiSpec = spec as unknown as AsyncAPISpec;
        const endpoints: Array<{ path: string; method?: string; description?: string }> = [];

        if (asyncApiSpec.channels) {
            const channelEntries = Object.keys(asyncApiSpec.channels).map(key => [key, asyncApiSpec.channels[key]] as const);
            channelEntries.forEach(([channelName, channelItem]) => {
                if (channelItem.publish) {
                    endpoints.push({
                        path: channelName,
                        method: 'PUBLISH',
                        description: channelItem.publish.description || channelItem.description
                    });
                }
                if (channelItem.subscribe) {
                    endpoints.push({
                        path: channelName,
                        method: 'SUBSCRIBE',
                        description: channelItem.subscribe.description || channelItem.description
                    });
                }
            });
        }

        return endpoints;
    }

    validate(spec: ApiSpecification): SpecValidationResult {
        const errors: SpecValidationResult['errors'] = [];
        const warnings: SpecValidationResult['warnings'] = [];

        const asyncApiSpec = spec as unknown as AsyncAPISpec;

        // Basic validation
        if (!asyncApiSpec.asyncapi) {
            errors.push({ path: '/', message: 'Missing asyncapi version field' });
        }

        if (!asyncApiSpec.info) {
            errors.push({ path: '/', message: 'Missing info object' });
        } else {
            if (!asyncApiSpec.info.title) {
                errors.push({ path: '/info', message: 'Missing title in info object' });
            }
            if (!asyncApiSpec.info.version) {
                errors.push({ path: '/info', message: 'Missing version in info object' });
            }
        }

        if (!asyncApiSpec.channels || Object.keys(asyncApiSpec.channels).length === 0) {
            warnings.push({ path: '/', message: 'No channels defined' });
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    getVersion(spec: ApiSpecification): string | undefined {
        const asyncApiSpec = spec as unknown as AsyncAPISpec;
        return asyncApiSpec.asyncapi;
    }

    isValid(spec: unknown): boolean {
        return spec !== null && typeof spec === 'object' && 'asyncapi' in spec && 'info' in spec && 'channels' in spec;
    }

    // ============================================================================
    // New methods for extensibility
    // ============================================================================

    getDefaultFileName(): string {
        return 'asyncapi.yaml';
    }

    getDefaultExtension(): string {
        return '.yaml';
    }

    getSupportedFeatures(): SpecFeature[] {
        return [
            SpecFeature.AI_GENERATION,
            SpecFeature.VALIDATION,
            SpecFeature.GOVERNANCE
        ];
    }

    getServers(spec: ApiSpecification): Array<{ url: string; description?: string }> {
        const asyncApiSpec = spec as unknown as AsyncAPISpec;
        if (!asyncApiSpec.servers) {
            return [];
        }
        return Object.keys(asyncApiSpec.servers).map((name) => {
            const server = asyncApiSpec.servers?.[name] as Server;
            return {
            url: server.url,
            description: server.description
            };
        });
    }

    getOperations(spec: ApiSpecification): Array<{ path: string; method?: string; operationId?: string }> {
        const asyncApiSpec = spec as unknown as AsyncAPISpec;
        const operations: Array<{ path: string; method?: string; operationId?: string }> = [];

        if (asyncApiSpec.channels) {
            const channelEntries = Object.keys(asyncApiSpec.channels).map(key => [key, asyncApiSpec.channels[key]] as const);
            channelEntries.forEach(([channelName, channelItem]) => {
                if (channelItem.publish) {
                    operations.push({
                        path: channelName,
                        method: 'PUBLISH',
                        operationId: channelItem.publish.operationId
                    });
                }
                if (channelItem.subscribe) {
                    operations.push({
                        path: channelName,
                        method: 'SUBSCRIBE',
                        operationId: channelItem.subscribe.operationId
                    });
                }
            });
        }

        return operations;
    }

    getComponents(spec: ApiSpecification): Record<string, unknown> | undefined {
        const asyncApiSpec = spec as unknown as AsyncAPISpec;
        return asyncApiSpec.components as Record<string, unknown> | undefined;
    }

    // ============================================================================
    // Validation-specific methods
    // ============================================================================

    getDefaultValidationRuleset(): string {
        // Return AsyncAPI Spectral ruleset
        // This will be dynamically imported in the extension
        return 'asyncapi';
    }

    getDefaultValidationRulesetName(): string {
        return 'AsyncAPI';
    }

}

