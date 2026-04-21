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
import { Info, Server } from './common-types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Re-export ApiSpecType for convenience
export { ApiSpecType };

/**
 * Base interface for all API specifications
 */
export interface ApiSpecification {
    type: ApiSpecType;
    version: string;
    info: Info;
    servers?: Server[];
    [key: string]: any;
}

/**
 * Unified specification metadata
 */
export interface SpecInfo {
    type: ApiSpecType;
    version: string;
    title?: string;
    description?: string;
    apiVersion?: string;
    mainEndpoint?: string;
    sandboxEndpoint?: string;
}

/**
 * Specification parsing result
 */
export interface SpecParseResult {
    success: boolean;
    spec?: ApiSpecification;
    error?: string;
    type?: ApiSpecType;
}

/**
 * Specification validation result
 */
export interface SpecValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

export interface ValidationError {
    path: string;
    message: string;
    code?: string;
}

export interface ValidationWarning {
    path: string;
    message: string;
    code?: string;
}

/**
 * Specification comparison result
 */
export interface SpecComparisonResult {
    identical: boolean;
    differences: SpecDifference[];
}

export interface SpecDifference {
    path: string;
    type: 'added' | 'removed' | 'modified';
    oldValue?: any;
    newValue?: any;
}

