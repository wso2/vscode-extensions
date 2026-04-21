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

import { TestCollection, TestRequest, TestAssertion, HttpMethod } from '../rpc-types/api-designer-visualizer/test';
import { PostmanCollection, PostmanItem } from './postman-types';

/**
 * Import Postman Collection to our test collection format
 */
export function importFromPostman(postmanCollection: PostmanCollection): TestCollection {
    const requests: TestRequest[] = [];
    
    // Recursively extract requests from items (handles folders)
    extractRequestsFromItems(postmanCollection.item, requests);

    return {
        id: postmanCollection.info._postman_id || `imported_${Date.now()}`,
        name: postmanCollection.info.name,
        description: postmanCollection.info.description,
        requests,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

/**
 * Recursively extract requests from Postman items (handles folders)
 */
function extractRequestsFromItems(items: PostmanItem[], requests: TestRequest[]): void {
    for (const item of items) {
        if (item.request) {
            // This is a request
            const testRequest = convertPostmanItemToRequest(item);
            if (testRequest) {
                requests.push(testRequest);
            }
        } else if (item.item) {
            // This is a folder, recurse
            extractRequestsFromItems(item.item, requests);
        }
    }
}

/**
 * Convert Postman item to our test request format
 */
function convertPostmanItemToRequest(item: PostmanItem): TestRequest | null {
    if (!item.request) {
        return null;
    }

    const request = item.request;
    const url = typeof request.url === 'string' ? request.url : request.url.raw;
    
    // Extract path from URL (remove baseUrl variables)
    const path = extractPathFromUrl(url);
    
    // Extract headers
    const headers: Record<string, string> = {};
    if (request.header) {
        for (const header of request.header) {
            if (!header.disabled) {
                headers[header.key] = header.value;
            }
        }
    }

    // Extract body
    let body: string | undefined;
    if (request.body) {
        if (request.body.mode === 'raw') {
            body = request.body.raw;
        } else if (request.body.mode === 'urlencoded' && request.body.urlencoded) {
            const params: Record<string, string> = {};
            for (const p of request.body.urlencoded) {
                if (!p.disabled) {
                    params[p.key] = p.value;
                }
            }
            body = JSON.stringify(params);
        }
    }

    // Parse test scripts to extract assertions (best effort)
    const assertions = parseAssertionsFromEvents(item.event || []);

    return {
        id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: item.name,
        method: request.method.toUpperCase() as HttpMethod,
        path,
        parameters: [],
        headers,
        body,
        assertions,
        timeout: 30000
    };
}

/**
 * Extract path from URL (remove protocol, host, baseUrl variables)
 */
function extractPathFromUrl(url: string): string {
    // Remove {{baseUrl}} or similar variables
    let path = url.replace(/\{\{[^}]+\}\}/g, '');
    
    // Remove protocol and host
    path = path.replace(/^https?:\/\/[^/]+/, '');
    
    // Ensure it starts with /
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    
    // Remove query parameters
    path = path.split('?')[0];
    
    return path;
}

/**
 * Parse Postman test scripts to extract assertions (best effort)
 * This is a simplified parser that looks for common patterns
 */
function parseAssertionsFromEvents(events: unknown[]): TestAssertion[] {
    const assertions: TestAssertion[] = [];

    for (const eventUnknown of events) {
        const event = eventUnknown as { listen?: string; script?: { exec?: string | string[] } };
        if (event.listen === 'test' && event.script && event.script.exec) {
            const scriptLines = Array.isArray(event.script.exec) 
                ? event.script.exec 
                : [event.script.exec];
            
            for (const line of scriptLines) {
                const lineStr = String(line);
                
                // Parse status assertions
                // pm.response.to.have.status(200)
                const statusMatch = lineStr.match(/pm\.response\.to\.have\.status\((\d+)\)/);
                if (statusMatch) {
                    assertions.push({
                        type: 'status',
                        operator: 'equals',
                        value: parseInt(statusMatch[1]),
                        description: `Status should be ${statusMatch[1]}`
                    });
                }

                // Parse header assertions
                // pm.response.to.have.header('content-type')
                const headerExistsMatch = lineStr.match(/pm\.response\.to\.have\.header\(['"]([^'"]+)['"]\)/);
                if (headerExistsMatch) {
                    assertions.push({
                        type: 'header',
                        field: headerExistsMatch[1],
                        operator: 'exists',
                        description: `Header ${headerExistsMatch[1]} should exist`
                    });
                }

                // Parse body property assertions
                // pm.expect(json).to.have.property('id')
                const propertyMatch = lineStr.match(/pm\.expect\([^)]+\)\.to\.have\.property\(['"]([^'"]+)['"]\)/);
                if (propertyMatch) {
                    assertions.push({
                        type: 'body',
                        field: propertyMatch[1],
                        operator: 'exists',
                        description: `Response should have ${propertyMatch[1]} field`
                    });
                }

                // Parse response time assertions
                // pm.expect(pm.response.responseTime).to.be.below(5000)
                const responseTimeMatch = lineStr.match(/pm\.expect\(pm\.response\.responseTime\)\.to\.be\.below\((\d+)\)/);
                if (responseTimeMatch) {
                    assertions.push({
                        type: 'response-time',
                        operator: 'lessThan',
                        value: parseInt(responseTimeMatch[1]),
                        description: `Response time should be less than ${responseTimeMatch[1]}ms`
                    });
                }
            }
        }
    }

    // Add default assertions if none found
    if (assertions.length === 0) {
        assertions.push({
            type: 'status',
            operator: 'equals',
            value: 200,
            description: 'Status should be 200'
        });
    }

    return assertions;
}
