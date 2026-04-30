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

export interface ResolvedSchema {
    type?: string;
    properties?: Record<string, any>;
    items?: any;
    required?: string[];
    description?: string;
    example?: any;
    $ref?: string;
    [key: string]: any;
}

/**
 * Extract the name/identifier from a $ref string
 * @param ref - Reference string like "#/components/schemas/User"
 * @returns The name part (e.g., "User") or undefined if invalid
 * @example
 * getRefName('#/components/schemas/User') // returns 'User'
 * getRefName('#/components/responses/NotFound') // returns 'NotFound'
 */
export function getRefName(ref: string | undefined): string | undefined {
    if (!ref || typeof ref !== 'string') return undefined;
    const parts = ref.split('/');
    return parts.length > 0 ? parts[parts.length - 1] : undefined;
}

/**
 * Check if an object is a reference object (has $ref property)
 * @param obj - Object to check
 * @returns True if the object has a $ref property
 */
export function isReference(obj: any): boolean {
    return obj && typeof obj === 'object' && '$ref' in obj && typeof obj.$ref === 'string';
}

/**
 * Resolve a schema reference to its actual schema definition
 * @param ref - Schema reference string or reference object
 * @param openAPI - Full OpenAPI specification
 * @returns Resolved schema or undefined if not found
 */
export function resolveSchemaRef(ref: string | { $ref: string } | undefined, openAPI: any): any {
    if (!ref || !openAPI) return undefined;
    
    const refString = typeof ref === 'string' ? ref : ref.$ref;
    if (!refString) return undefined;
    
    const schemaName = getRefName(refString);
    if (!schemaName) return undefined;
    
    return openAPI?.components?.schemas?.[schemaName];
}

/**
 * Resolve a request body reference to its actual definition
 * @param ref - Request body reference string or reference object
 * @param openAPI - Full OpenAPI specification
 * @returns Resolved request body or undefined if not found
 */
export function resolveRequestBodyRef(ref: string | { $ref: string } | undefined, openAPI: any): any {
    if (!ref || !openAPI) return undefined;
    
    const refString = typeof ref === 'string' ? ref : ref.$ref;
    if (!refString) return undefined;
    
    const name = getRefName(refString);
    if (!name) return undefined;
    
    return openAPI?.components?.requestBodies?.[name];
}

/**
 * Resolve a response reference to its actual definition
 * @param ref - Response reference string or reference object
 * @param openAPI - Full OpenAPI specification
 * @returns Resolved response or undefined if not found
 */
export function resolveResponseRef(ref: string | { $ref: string } | undefined, openAPI: any): any {
    if (!ref || !openAPI) return undefined;
    
    const refString = typeof ref === 'string' ? ref : ref.$ref;
    if (!refString) return undefined;
    
    const name = getRefName(refString);
    if (!name) return undefined;
    
    return openAPI?.components?.responses?.[name];
}

/**
 * Resolve a parameter reference to its actual definition
 * @param ref - Parameter reference string or reference object
 * @param openAPI - Full OpenAPI specification
 * @returns Resolved parameter or undefined if not found
 */
export function resolveParameterRef(ref: string | { $ref: string } | undefined, openAPI: any): any {
    if (!ref || !openAPI) return undefined;
    
    const refString = typeof ref === 'string' ? ref : ref.$ref;
    if (!refString) return undefined;
    
    const name = getRefName(refString);
    if (!name) return undefined;
    
    return openAPI?.components?.parameters?.[name];
}

/**
 * Generic component reference resolver
 * @param ref - Component reference string or reference object
 * @param openAPI - Full OpenAPI specification
 * @param componentType - Type of component ('schemas', 'responses', 'parameters', 'requestBodies', etc.)
 * @returns Resolved component or undefined if not found
 */
export function resolveComponentRef(
    ref: string | { $ref: string } | undefined,
    openAPI: any,
    componentType: 'schemas' | 'responses' | 'parameters' | 'requestBodies' | 'headers' | 'securitySchemes'
): any {
    if (!ref || !openAPI) return undefined;
    
    const refString = typeof ref === 'string' ? ref : ref.$ref;
    if (!refString) return undefined;
    
    const name = getRefName(refString);
    if (!name) return undefined;
    
    return openAPI?.components?.[componentType]?.[name];
}

/**
 * Parse a $ref string to get the path components
 * @param ref Reference string like "#/components/schemas/User"
 * @returns Array of path components
 */
function parseRef(ref: string): string[] {
    if (!ref || !ref.startsWith('#/')) {
        return [];
    }
    return ref.substring(2).split('/');
}

/**
 * Navigate through an object using path components
 * @param obj The root object
 * @param path Array of keys
 * @returns The value at the path, or undefined
 */
function navigateToPath(obj: any, path: string[]): any {
    let current = obj;
    for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return undefined;
        }
    }
    return current;
}

/**
 * Recursively resolve a schema, replacing $ref with actual schema definitions
 * @param schema The schema object that may contain $ref
 * @param openApi The full OpenAPI spec
 * @param visited Set of visited $refs to prevent infinite loops
 * @returns Resolved schema
 */
export function resolveSchema(
    schema: any,
    openApi: any,
    visited = new Set<string>()
): ResolvedSchema {
    if (!schema) {
        return {};
    }

    // Handle $ref
    if (schema.$ref) {
        // Prevent infinite loops
        if (visited.has(schema.$ref)) {
            return { $ref: schema.$ref };
        }

        visited.add(schema.$ref);
        const refPath = parseRef(schema.$ref);
        const resolvedRef = navigateToPath(openApi, refPath);

        if (resolvedRef) {
            return resolveSchema(resolvedRef, openApi, visited);
        }

        // Fallback if ref not found
        return { $ref: schema.$ref };
    }

    // Handle arrays with items
    if (schema.type === 'array' && schema.items) {
        return {
            ...schema,
            items: resolveSchema(schema.items, openApi, visited)
        };
    }

    // Handle object properties
    if (schema.properties && typeof schema.properties === 'object') {
        const resolvedProperties: Record<string, any> = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
            resolvedProperties[key] = resolveSchema(prop as any, openApi, visited);
        }
        return {
            ...schema,
            properties: resolvedProperties
        };
    }

    // Handle allOf, oneOf, anyOf
    if (schema.allOf) {
        return {
            ...schema,
            allOf: schema.allOf.map((s: any) => resolveSchema(s, openApi, visited))
        };
    }

    if (schema.oneOf) {
        return {
            ...schema,
            oneOf: schema.oneOf.map((s: any) => resolveSchema(s, openApi, visited))
        };
    }

    if (schema.anyOf) {
        return {
            ...schema,
            anyOf: schema.anyOf.map((s: any) => resolveSchema(s, openApi, visited))
        };
    }

    return schema;
}

/**
 * Get display properties from a schema (resolving $refs)
 * @param schema The schema object
 * @param openApi The full OpenAPI spec
 * @returns Array of property info for display
 */
export function getSchemaProperties(
    schema: any,
    openApi: any
): Array<{ name: string; type: string; required: boolean; description?: string }> {
    const resolved = resolveSchema(schema, openApi);

    if (!resolved.properties) {
        return [];
    }

    return Object.entries(resolved.properties).map(([name, prop]: [string, any]) => ({
        name,
        type: prop.type || (prop.$ref ? 'reference' : 'object'),
        required: resolved.required?.includes(name) || false,
        description: prop.description
    }));
}

/**
 * Format a schema for display (used in UI components)
 * @param schema The schema object
 * @param openApi The full OpenAPI spec
 * @returns Formatted display string
 */
export function formatSchemaType(schema: any, openApi: any): string {
    if (!schema) return 'unknown';

    // If it's a reference, try to get the schema name
    if (schema.$ref) {
        return getRefName(schema.$ref) || 'Reference';
    }

    // If it's an array, show with brackets
    if (schema.type === 'array') {
        const itemType = schema.items?.type || getRefName(schema.items?.$ref) || 'object';
        return `${itemType}[]`;
    }

    return schema.type || 'object';
}
