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

import { TestCollection, TestRequest, TestAssertion, VariableExtraction } from '../rpc-types/api-designer-visualizer/test';
import { PostmanCollection, PostmanItem, PostmanEvent, PostmanHeader } from './postman-types';

/**
 * Export our test collection to Postman Collection format
 */
export function exportToPostman(collection: TestCollection, baseUrl?: string): PostmanCollection {
    return {
        info: {
            name: collection.name,
            description: collection.description || `Exported from API Designer${collection.isIntegrationTest ? ' (Integration Tests)' : ''}`,
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
            _postman_id: collection.id
        },
        item: collection.requests.map(request => convertRequestToPostmanItem(request, baseUrl)),
        variable: baseUrl ? [
            {
                key: 'baseUrl',
                value: baseUrl,
                type: 'string'
            }
        ] : undefined
    };
}

/**
 * Convert a single test request to Postman item
 */
function convertRequestToPostmanItem(request: TestRequest, baseUrl?: string): PostmanItem {
    const url = baseUrl ? `{{baseUrl}}${request.path}` : request.path;
    
    const headers: PostmanHeader[] = [];
    for (const key in request.headers) {
        if (Object.prototype.hasOwnProperty.call(request.headers, key)) {
            headers.push({
                key,
                value: request.headers[key],
                disabled: false
            });
        }
    }
    
    return {
        name: request.name,
        request: {
            method: request.method,
            header: headers,
            body: request.body ? {
                mode: 'raw',
                raw: typeof request.body === 'string' ? request.body : JSON.stringify(request.body, null, 2),
                options: {
                    raw: {
                        language: 'json'
                    }
                }
            } : undefined,
            url: {
                raw: url,
                host: baseUrl ? ['{{baseUrl}}'] : undefined,
                path: request.path.split('/').filter(p => p)
            },
            description: request.operationId ? `Operation ID: ${request.operationId}` : undefined
        },
        event: generatePostmanEvents(request)
    };
}

/**
 * Generate Postman test and pre-request scripts
 */
function generatePostmanEvents(request: TestRequest): PostmanEvent[] {
    const events: PostmanEvent[] = [];

    // Generate test script from assertions
    if (request.assertions && request.assertions.length > 0) {
        const testScript = generateTestScript(request.assertions);
        events.push({
            listen: 'test',
            script: {
                type: 'text/javascript',
                exec: testScript
            }
        });
    }

    // Generate pre-request script for variable extraction setup
    if (request.extractVariables && request.extractVariables.length > 0) {
        const extractScript = generateVariableExtractionScript(request.extractVariables);
        // Add extraction to test script instead of pre-request
        if (events.length > 0) {
            events[0].script.exec.push('', '// Variable Extraction', ...extractScript);
        } else {
            events.push({
                listen: 'test',
                script: {
                    type: 'text/javascript',
                    exec: ['// Variable Extraction', ...extractScript]
                }
            });
        }
    }

    return events;
}

/**
 * Generate Postman test script from assertions
 */
function generateTestScript(assertions: TestAssertion[]): string[] {
    const lines: string[] = [
        '// Auto-generated from API Designer assertions',
        ''
    ];

    for (const assertion of assertions) {
        const testLines = convertAssertionToPostmanTest(assertion);
        lines.push(...testLines, '');
    }

    return lines;
}

/**
 * Convert a single assertion to Postman test code
 */
function convertAssertionToPostmanTest(assertion: TestAssertion): string[] {
    const description = assertion.description || `${assertion.type} ${assertion.operator} ${assertion.value}`;
    
    switch (assertion.type) {
        case 'status':
            return [
                `pm.test('${escapeString(description)}', function() {`,
                `    pm.response.to.have.status(${assertion.value});`,
                `});`
            ];

        case 'header':
            if (assertion.operator === 'exists') {
                return [
                    `pm.test('${escapeString(description)}', function() {`,
                    `    pm.response.to.have.header('${assertion.field}');`,
                    `});`
                ];
            } else if (assertion.operator === 'contains') {
                return [
                    `pm.test('${escapeString(description)}', function() {`,
                    `    pm.expect(pm.response.headers.get('${assertion.field}')).to.include('${assertion.value}');`,
                    `});`
                ];
            } else if (assertion.operator === 'equals') {
                return [
                    `pm.test('${escapeString(description)}', function() {`,
                    `    pm.expect(pm.response.headers.get('${assertion.field}')).to.equal('${assertion.value}');`,
                    `});`
                ];
            }
            break;

        case 'body':
            if (assertion.operator === 'exists') {
                return [
                    `pm.test('${escapeString(description)}', function() {`,
                    `    const json = pm.response.json();`,
                    `    pm.expect(json).to.have.property('${assertion.field}');`,
                    `});`
                ];
            } else if (assertion.operator === 'equals') {
                return [
                    `pm.test('${escapeString(description)}', function() {`,
                    `    const json = pm.response.json();`,
                    `    pm.expect(json['${assertion.field}']).to.equal(${JSON.stringify(assertion.value)});`,
                    `});`
                ];
            } else if (assertion.operator === 'contains') {
                return [
                    `pm.test('${escapeString(description)}', function() {`,
                    `    const json = pm.response.json();`,
                    `    pm.expect(JSON.stringify(json)).to.include('${assertion.value}');`,
                    `});`
                ];
            }
            break;

        case 'response-time':
            if (assertion.operator === 'lessThan') {
                return [
                    `pm.test('${escapeString(description)}', function() {`,
                    `    pm.expect(pm.response.responseTime).to.be.below(${assertion.value});`,
                    `});`
                ];
            }
            break;

        case 'schema':
            return [
                `pm.test('${escapeString(description)}', function() {`,
                `    // Schema validation - implement as needed`,
                `    pm.response.to.be.json;`,
                `});`
            ];
    }

    return [
        `// Unsupported assertion: ${assertion.type} ${assertion.operator}`
    ];
}

/**
 * Generate variable extraction script
 */
function generateVariableExtractionScript(extractions: VariableExtraction[]): string[] {
    const lines: string[] = [];

    for (const extraction of extractions) {
        if (extraction.source === 'body' && extraction.jsonPath) {
            lines.push(
                `// Extract ${extraction.name} from response body`,
                `try {`,
                `    const json = pm.response.json();`,
                `    const value = json${convertJsonPathToJsPath(extraction.jsonPath)};`,
                `    if (value !== undefined) {`,
                `        pm.environment.set('${extraction.name}', value);`,
                `        console.log('Extracted ${extraction.name}:', value);`,
                `    }`,
                `} catch(e) {`,
                `    console.error('Failed to extract ${extraction.name}:', e);`,
                `}`,
                ``
            );
        } else if (extraction.source === 'header' && extraction.headerName) {
            lines.push(
                `// Extract ${extraction.name} from header`,
                `const ${extraction.name} = pm.response.headers.get('${extraction.headerName}');`,
                `if (${extraction.name}) {`,
                `    pm.environment.set('${extraction.name}', ${extraction.name});`,
                `}`,
                ``
            );
        } else if (extraction.source === 'status') {
            lines.push(
                `// Extract ${extraction.name} from status`,
                `pm.environment.set('${extraction.name}', pm.response.code);`,
                ``
            );
        }
    }

    return lines;
}

/**
 * Convert JSONPath to JavaScript property access
 * $.id -> ['id']
 * $.data.user.name -> ['data']['user']['name']
 * $.items[0].id -> ['items'][0]['id']
 */
function convertJsonPathToJsPath(jsonPath: string): string {
    // Remove leading $
    const path = jsonPath.replace(/^\$\.?/, '');
    
    // Split by dots, but preserve array indices
    const parts = path.split('.');
    
    return parts.map(part => {
        // Handle array access: items[0] -> ['items'][0]
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            return `['${arrayMatch[1]}'][${arrayMatch[2]}]`;
        }
        // Handle just array index: [0] -> [0]
        if (part.match(/^\[\d+\]$/)) {
            return part;
        }
        // Regular property: name -> ['name']
        return `['${part}']`;
    }).join('');
}

/**
 * Escape string for JavaScript
 */
function escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}
