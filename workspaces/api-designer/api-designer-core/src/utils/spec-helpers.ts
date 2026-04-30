/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { SpecificationService } from '../specs/specification-service';
import { SpecificationFactory } from '../specs/specification-factory';
import { ApiSpecification } from '../specs/types';

function isApiSpecification(spec: unknown, service: SpecificationService): spec is ApiSpecification {
    return typeof spec === 'object' && spec !== null && service.isValid(spec);
}

/**
 * Get spec service for a spec object
 * Automatically detects the spec type and returns the appropriate service
 * @param spec - The API specification object
 * @returns SpecificationService or null if type cannot be determined
 */
export function getSpecService(spec: unknown): SpecificationService | null {
    return SpecificationFactory.getServiceFromSpec(spec);
}

/**
 * Execute operation on spec using appropriate service
 * This is a helper function that automatically gets the service and executes the operation
 * @param spec - The API specification object
 * @param operation - Function to execute with the service and spec
 * @returns Result of the operation or null if service cannot be determined
 */
export function withSpecService<T>(
    spec: unknown,
    operation: (service: SpecificationService, spec: ApiSpecification) => T
): T | null {
    const service = getSpecService(spec);
    if (!service) return null;
    if (!isApiSpecification(spec, service)) return null;
    return operation(service, spec);
}

/**
 * Get default filename for a spec
 * @param spec - The API specification object
 * @returns Default filename or null if type cannot be determined
 */
export function getDefaultSpecFilename(spec: unknown): string | null {
    const service = getSpecService(spec);
    if (!service) return null;
    return service.getDefaultFileName();
}
