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

import * as fs from 'fs';
import * as path from 'path';

interface BrunoCollection {
    name: string;
    version: string;
}

interface BrunoEnvironment {
    name: string;
    variables: Record<string, string>;
}

interface BrunoRequest {
    name: string;
    type: 'http-request';
    method: string;
    url: string;
    params?: Array<{ name: string; value: string; enabled: boolean }>;
    headers?: Array<{ name: string; value: string; enabled: boolean }>;
    body?: {
        mode: string;
        json?: string;
        formUrlEncoded?: Array<{ name: string; value: string; enabled: boolean }>;
        multipartForm?: Array<{ name: string; value: string; enabled: boolean; type: string }>;
        text?: string;
    };
    docs?: string;
}

/**
 * Generate Bruno collection structure
 */
export function generateBrunoCollection(serviceName: string, port: number, basePath: string): string {
    const collection: BrunoCollection = {
        name: serviceName || 'Ballerina Service',
        version: '1'
    };

    return `meta {
  name: ${collection.name}
  type: collection
  version: ${collection.version}
}
`;
}

/**
 * Generate Bruno environment file
 */
export function generateBrunoEnvironment(port: number, basePath: string): string {
    const sanitizedBasePath = basePath === '/' ? '' : basePath.replace(/\/$/, '');
    
    return `vars {
  baseUrl: http://localhost:${port}${sanitizedBasePath}
  port: ${port}
}
`;
}

/**
 * Convert HTTP method to Bruno format
 */
function formatMethod(method: string): string {
    return method.toLowerCase();
}

/**
 * Generate query parameters string for Bruno
 */
function generateQueryParams(parameters: any[]): string {
    const queryParams = parameters.filter(p => p.in === 'query');
    if (queryParams.length === 0) {
        return '';
    }

    let result = '\nparams:query {\n';
    for (const param of queryParams) {
        const required = param.required ? '' : '~';
        const value = param.schema?.default || param.schema?.example || `<${param.name}>`;
        const comment = param.description ? `  // ${param.description}` : '';
        result += `  ${required}${param.name}: ${value}${comment}\n`;
    }
    result += '}\n';
    return result;
}

/**
 * Generate headers string for Bruno
 */
function generateHeaders(parameters: any[]): string {
    const headerParams = parameters.filter(p => p.in === 'header');
    if (headerParams.length === 0) {
        return '';
    }

    let result = '\nheaders {\n';
    for (const param of headerParams) {
        const required = param.required ? '' : '~';
        const value = param.schema?.default || param.schema?.example || `<${param.name}>`;
        const comment = param.description ? `  // ${param.description}` : '';
        result += `  ${required}${param.name}: ${value}${comment}\n`;
    }
    result += '}\n';
    return result;
}

/**
 * Generate request body for Bruno
 */
function generateBody(requestBody: any, context: any): string {
    if (!requestBody || !requestBody.content) {
        return '';
    }

    const contentType = Object.keys(requestBody.content)[0];
    const content = requestBody.content[contentType];
    
    let result = '\nheaders {\n';
    result += `  Content-Type: ${contentType}\n`;
    result += '}\n';

    if (contentType === 'application/json') {
        result += '\nbody:json {\n';
        const schema = content.schema;
        const sample = generateSampleJson(schema, context);
        result += `  ${JSON.stringify(sample, null, 2).split('\n').join('\n  ')}\n`;
        result += '}\n';
    } else if (contentType === 'application/x-www-form-urlencoded') {
        result += '\nbody:form-urlencoded {\n';
        if (content.schema?.properties) {
            for (const [key, value] of Object.entries(content.schema.properties)) {
                result += `  ${key}: \n`;
            }
        }
        result += '}\n';
    } else if (contentType === 'multipart/form-data') {
        result += '\nbody:multipart-form {\n';
        if (content.schema?.properties) {
            for (const [key, value] of Object.entries(content.schema.properties)) {
                result += `  ${key}: \n`;
            }
        }
        result += '}\n';
    } else if (contentType === 'text/plain') {
        result += '\nbody:text {\n';
        result += '  \n';
        result += '}\n';
    }

    return result;
}

/**
 * Generate sample JSON from schema
 */
function generateSampleJson(schema: any, context: any): any {
    if (!schema) {
        return {};
    }

    if (schema.$ref) {
        const refSchema = resolveSchemaRef(schema.$ref, context);
        if (refSchema) {
            return generateSampleJson(refSchema, context);
        }
    }

    if (schema.type === 'object' && schema.properties) {
        const obj: any = {};
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            obj[key] = generateSampleJson(propSchema, context);
        }
        return obj;
    }

    if (schema.type === 'array' && schema.items) {
        return [generateSampleJson(schema.items, context)];
    }

    // Return example values based on type
    if (schema.example !== undefined) {
        return schema.example;
    }
    if (schema.default !== undefined) {
        return schema.default;
    }

    switch (schema.type) {
        case 'string':
            return schema.format === 'date-time' ? '2024-01-01T00:00:00Z' : 'string';
        case 'number':
        case 'integer':
            return 0;
        case 'boolean':
            return false;
        default:
            return null;
    }
}

/**
 * Resolve schema reference
 */
function resolveSchemaRef(ref: string, context: any): any {
    if (!ref.startsWith('#/components/schemas/')) {
        return undefined;
    }
    const schemaName = ref.replace('#/components/schemas/', '');
    return context.components?.schemas?.[schemaName];
}

/**
 * Replace path parameters with Bruno variables
 */
function replacePathParameters(path: string, parameters: any[]): string {
    const pathParams = parameters.filter(p => p.in === 'path');
    let result = path;
    
    for (const param of pathParams) {
        const placeholder = `{${param.name}}`;
        const value = param.schema?.default || param.schema?.example || `<${param.name}>`;
        result = result.replace(placeholder, value);
    }
    
    return result;
}

/**
 * Generate a single Bruno request file (.bru)
 */
export function generateBrunoRequest(
    operationId: string,
    method: string,
    path: string,
    operation: any,
    baseUrl: string,
    context: any
): string {
    const name = operation.summary || operationId || `${method.toUpperCase()} ${path}`;
    const parameters = operation.parameters || [];
    
    let bru = `meta {\n`;
    bru += `  name: ${name}\n`;
    bru += `  type: http\n`;
    bru += `  seq: 1\n`;
    bru += `}\n\n`;

    // HTTP method and URL
    const processedPath = replacePathParameters(path, parameters);
    bru += `${formatMethod(method)} {\n`;
    bru += `  url: {{baseUrl}}${processedPath}\n`;
    bru += `  body: none\n`;
    bru += `  auth: none\n`;
    bru += `}\n`;

    // Query parameters
    bru += generateQueryParams(parameters);

    // Headers
    bru += generateHeaders(parameters);

    // Request body
    if (operation.requestBody) {
        bru += generateBody(operation.requestBody, context);
    }

    // Documentation
    if (operation.description) {
        bru += `\ndocs {\n`;
        bru += `  ${operation.description.split('\n').join('\n  ')}\n`;
        bru += `}\n`;
    }

    return bru;
}

/**
 * Create Bruno collection structure from OpenAPI spec
 */
export function createBrunoCollectionStructure(
    targetDir: string,
    openapiSpec: any,
    serviceName: string,
    port: number,
    basePath: string,
    resourceMetadata?: { methodValue: string; pathValue: string }
): string {
    const collectionDir = path.join(targetDir);

    // Create collection directory
    if (!fs.existsSync(collectionDir)) {
        fs.mkdirSync(collectionDir, { recursive: true });
    }

    // Create bruno.json (collection metadata)
    const brunoJson = generateBrunoCollection(serviceName, port, basePath);
    fs.writeFileSync(path.join(collectionDir, 'bruno.json'), brunoJson);

    // Create environments directory
    const envsDir = path.join(collectionDir, 'environments');
    if (!fs.existsSync(envsDir)) {
        fs.mkdirSync(envsDir, { recursive: true });
    }

    // Create Local environment
    const envContent = generateBrunoEnvironment(port, basePath);
    fs.writeFileSync(path.join(envsDir, 'Local.bru'), envContent);

    const baseUrl = `http://localhost:${port}${basePath === '/' ? '' : basePath}`;

    // Filter paths if resource mode
    let pathsToGenerate = openapiSpec.paths;
    if (resourceMetadata) {
        pathsToGenerate = {};
        for (const [pathKey, pathValue] of Object.entries(openapiSpec.paths)) {
            if (comparePathPatterns(pathKey, resourceMetadata.pathValue)) {
                const method = resourceMetadata.methodValue.toLowerCase();
                if ((pathValue as any)[method]) {
                    pathsToGenerate[pathKey] = { [method]: (pathValue as any)[method] };
                }
                break;
            }
        }
    }

    // Generate request files
    let requestCount = 0;
    for (const [pathKey, pathValue] of Object.entries(pathsToGenerate)) {
        for (const [method, operation] of Object.entries(pathValue as any)) {
            if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method)) {
                const operationId = (operation as any).operationId || `${method}_${pathKey.replace(/\//g, '_')}`;
                const requestContent = generateBrunoRequest(
                    operationId,
                    method,
                    pathKey,
                    operation,
                    baseUrl,
                    openapiSpec
                );

                // Create safe filename
                const fileName = sanitizeFileName(`${method.toUpperCase()} ${pathKey}`) + '.bru';
                const filePath = path.join(collectionDir, fileName);
                
                fs.writeFileSync(filePath, requestContent);
                requestCount++;
            }
        }
    }

    console.log(`Generated ${requestCount} Bruno request(s) in ${collectionDir}`);
    return collectionDir;
}

/**
 * Sanitize filename for Bruno
 */
function sanitizeFileName(name: string): string {
    return name
        .replace(/[/\\:*?"<>|]/g, '-')
        .replace(/\{|\}/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100); // Limit length
}

/**
 * Compare path patterns (same as in activator.ts)
 */
function comparePathPatterns(specPath: string, targetPath: string): boolean {
    const specSegments = specPath.split('/').filter(Boolean);
    const targetSegments = targetPath.split('/').filter(Boolean);

    if (specSegments.length !== targetSegments.length) {
        return false;
    }

    for (let i = 0; i < specSegments.length; i++) {
        const specSeg = specSegments[i];
        const targetSeg = targetSegments[i];

        // Check if spec segment is a path parameter
        if (specSeg.startsWith('{') && specSeg.endsWith('}')) {
            continue; // Match any value for path parameters
        }

        if (specSeg !== targetSeg) {
            return false;
        }
    }

    return true;
}
