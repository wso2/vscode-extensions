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
import { OpenAPIService } from './openapi-service';
import { detectSpecType } from './detector';
import { getSpecType } from '../utils/spec-type-utils';

/**
 * Factory for creating specification services
 */
export class SpecificationFactory {
    private static services: Map<ApiSpecType, SpecificationService> = new Map();

    /**
     * Get or create a specification service for the given type
     */
    static getService(specType: ApiSpecType): SpecificationService {
        if (!this.services.has(specType)) {
            switch (specType) {
                case ApiSpecType.OPENAPI:
                    this.services.set(specType, new OpenAPIService());
                    break;
                default:
                    throw new Error(`Unsupported specification type: ${specType}`);
            }
        }
        return this.services.get(specType)!;
    }

    /**
     * Detect specification type from content and get appropriate service
     */
    static getServiceFromContent(content: string): SpecificationService | null {
        const detection = detectSpecType(content);
        if (detection.type) {
            return this.getService(detection.type);
        }
        return null;
    }

    /**
     * Get service from specification type string
     */
    static getServiceFromType(specType: string): SpecificationService | null {
        if (specType === ApiSpecType.OPENAPI || specType === 'openapi') {
            return this.getService(ApiSpecType.OPENAPI);
        }
        return null;
    }

    /**
     * Get service from spec object (detects type automatically)
     */
    static getServiceFromSpec(spec: unknown): SpecificationService | null {
        const type = getSpecType(spec);
        return type ? this.getService(type) : null;
    }
}

