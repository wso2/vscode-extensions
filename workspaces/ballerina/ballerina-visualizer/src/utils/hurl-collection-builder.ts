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

import { ServiceModel } from '@wso2/ballerina-core';
// import { ProjectStructureArtifactResponse } from '@wso2/bi-diagram-core';

/**
 * Represents a single request in a Hurl collection
 */
export interface HurlRequest {
    id: string;
    method: string;
    endpoint: string;
    description?: string;
    url_variables?: Record<string, string>;
    headers?: Record<string, string>;
    body?: string;
}

/**
 * Represents a Hurl collection payload
 */
export interface HurlCollectionPayload {
    name: string;
    description?: string;
    baseUrl: string;
    requests: HurlRequest[];
}

/**
 * Extract HTTP method from resource icon
 * Format: "get-resource", "post-resource", etc.
 */
function extractMethodFromIcon(icon: string | undefined): string {
    if (!icon) return 'GET';
    const method = icon.split('-')[0].toUpperCase();
    return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(method) ? method : 'GET';
}

/**
 * Build a Hurl collection from a Ballerina service model
 * Generates requests for all HTTP resources defined in the service
 */
export function generateHurlCollectionFromService(
    serviceModel: ServiceModel,
    resources: any[],
    basePath: string = '',
    listener: string = ''
): HurlCollectionPayload {
    // Parse listener to extract host and port
    // Format: "localhost:8080" or "0.0.0.0:8080"
    let host = 'localhost';
    let port = '8080';
    
    if (listener) {
        const parts = listener.split(':');
        if (parts.length === 2) {
            host = parts[0] === '0.0.0.0' ? 'localhost' : parts[0];
            port = parts[1];
        }
    }

    const baseUrl = `http://${host}:${port}${basePath || ''}`;
    const serviceName = serviceModel.name || 'Service';

    // Filter and map HTTP resources to Hurl requests
    const httpResources = resources.filter(
        (r) => r.type === 'RESOURCE'
    );

    const requests: HurlRequest[] = httpResources.map((resource, index) => {
        const method = extractMethodFromIcon(resource.icon);
        const resourcePath = resource.name || '';

        return {
            id: `${method.toLowerCase()}_${resource.name}`,
            method,
            endpoint: `${baseUrl}/${resourcePath}`,
            description: `${method} ${resourcePath}`,
        };
    });

    return {
        name: serviceName,
        description: `API TryIt collection for ${serviceName}`,
        baseUrl,
        requests,
    };
}

/**
 * Convert HurlCollectionPayload to the format expected by api-tryit.openFromHurlCollection
 * This generates a Hurl collection object that can be passed to the VS Code command
 */
export function formatHurlCollectionPayload(collection: HurlCollectionPayload): any {
    // Build the collection structure expected by API TryIt
    return {
        info: {
            name: collection.name,
            description: collection.description || '',
        },
        baseUrl: collection.baseUrl,
        requests: collection.requests.map((req) => ({
            id: req.id,
            name: req.description || req.id,
            method: req.method,
            url: req.endpoint,
            headers: req.headers || {},
            body: req.body || '',
        })),
    };
}
