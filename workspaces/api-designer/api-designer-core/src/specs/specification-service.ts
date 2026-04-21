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

import { ApiSpecType, ApiSpecification, SpecInfo, SpecParseResult, SpecValidationResult } from './types';

/**
 * Supported features for a specification type
 */
export enum SpecFeature {
    AI_GENERATION = 'ai-generation',
    VALIDATION = 'validation',
    GOVERNANCE = 'governance'
}

/**
 * Abstract base class for API specification services
 * Provides a unified interface for working with different specification types
 */
export abstract class SpecificationService {
    protected specType: ApiSpecType;

    constructor(specType: ApiSpecType) {
        this.specType = specType;
    }

    /**
     * Get the specification type this service handles
     */
    getType(): ApiSpecType {
        return this.specType;
    }

    /**
     * Get spec type (alias for getType for consistency)
     */
    getSpecType(): ApiSpecType {
        return this.specType;
    }

    /**
     * Parse specification content
     */
    abstract parse(content: string): SpecParseResult;

    /**
     * Extract basic information from specification
     */
    abstract extractInfo(spec: ApiSpecification): SpecInfo;

    /**
     * Get main endpoint from specification
     */
    abstract getMainEndpoint(spec: ApiSpecification): string | undefined;

    /**
     * Get all endpoints/channels
     */
    abstract getEndpoints(spec: ApiSpecification): Array<{ path: string; method?: string; description?: string }>;

    /**
     * Validate specification
     */
    abstract validate(spec: ApiSpecification): SpecValidationResult;

    /**
     * Get specification version
     */
    abstract getVersion(spec: ApiSpecification): string | undefined;

    /**
     * Check if specification is valid
     */
    abstract isValid(spec: unknown): boolean;

    // ============================================================================
    // New methods for extensibility
    // ============================================================================

    /**
     * Get default filename for this spec type
     */
    abstract getDefaultFileName(): string;

    /**
     * Get default file extension for this spec type
     */
    abstract getDefaultExtension(): string;

    /**
     * Get servers from specification
     */
    abstract getServers(spec: ApiSpecification): Array<{ url: string; description?: string }>;

    /**
     * Get operations from specification
     */
    abstract getOperations(spec: ApiSpecification): Array<{ path: string; method?: string; operationId?: string }>;

    /**
     * Get components from specification
     */
    abstract getComponents(spec: ApiSpecification): Record<string, unknown> | undefined;

    // ============================================================================
    // Validation-specific methods
    // ============================================================================

    /**
     * Get the default Spectral ruleset for this spec type
     * Returns the ruleset identifier string that should be used for basic validation
     */
    abstract getDefaultValidationRuleset(): string;

    /**
     * Get the name of the default validation ruleset
     */
    abstract getDefaultValidationRulesetName(): string;

}

