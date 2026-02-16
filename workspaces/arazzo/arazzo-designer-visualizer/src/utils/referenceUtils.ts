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

import { ArazzoDefinition } from '@wso2/arazzo-designer-core';

/**
 * Resolves a JSON pointer reference string to the actual component data
 * from the Arazzo definition, recursively resolving any nested $ref objects.
 * 
 * @param ref - JSON pointer string (e.g., "#/components/inputs/myInput")
 * @param definition - The Arazzo definition containing reusable components
 * @param visited - Set of already visited refs to prevent circular references
 * @returns The resolved component data, or null if not found
 * 
 * @example
 * resolveReference("#/components/inputs/apply_coupon_input", arazzoDefinition)
 */
export function resolveReference(
    ref: string, 
    definition: ArazzoDefinition | undefined,
    visited: Set<string> = new Set()
): any {
    if (!ref || !definition) {
        return null;
    }

    // Prevent circular references
    if (visited.has(ref)) {
        console.warn(`Circular reference detected: "${ref}"`);
        return null;
    }
    visited.add(ref);

    // Parse JSON pointer: remove leading '#/' and split by '/'
    const path = ref.startsWith('#/') ? ref.slice(2) : ref;
    const parts = path.split('/');

    // Traverse the definition object following the path
    let current: any = definition;
    
    try {
        for (const part of parts) {
            if (current === null || current === undefined) {
                return null;
            }
            
            // Decode URI components (e.g., ~0 -> ~, ~1 -> /)
            const decodedPart = part.replace(/~1/g, '/').replace(/~0/g, '~');
            current = current[decodedPart];
        }
        
        // Recursively resolve any nested $ref objects in the resolved component
        return resolveNestedReferences(current, definition, visited);
    } catch (error) {
        console.warn(`Failed to resolve reference "${ref}":`, error);
        return null;
    }
}

/**
 * Recursively resolves any nested $ref objects within a component
 * 
 * @param obj - The object to process
 * @param definition - The Arazzo definition
 * @param visited - Set of visited refs to prevent circular references
 * @returns The object with all nested references resolved
 */
function resolveNestedReferences(
    obj: any,
    definition: ArazzoDefinition | undefined,
    visited: Set<string>
): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // If this object is itself a reference, resolve it
    if (isReference(obj)) {
        return resolveReference(obj.$ref, definition, visited);
    }

    // If it's an array, resolve each element
    if (Array.isArray(obj)) {
        return obj.map(item => resolveNestedReferences(item, definition, visited));
    }

    // If it's an object, resolve each property
    if (typeof obj === 'object') {
        const resolved: any = {};
        for (const [key, value] of Object.entries(obj)) {
            resolved[key] = resolveNestedReferences(value, definition, visited);
        }
        return resolved;
    }

    // Primitive value, return as-is
    return obj;
}

/**
 * Checks if a value is a reference object (has a $ref property)
 * 
 * @param value - The value to check
 * @returns True if the value is a reference object
 */
export function isReference(value: any): boolean {
    return value !== null && 
           typeof value === 'object' && 
           '$ref' in value && 
           typeof value.$ref === 'string';
}

/**
 * Resolves a reference if it is one, otherwise returns the original value
 * 
 * @param value - The value that might be a reference
 * @param definition - The Arazzo definition
 * @returns The resolved value or the original value
 */
export function resolveIfReference(value: any, definition: ArazzoDefinition | undefined): any {
    if (isReference(value)) {
        return resolveReference(value.$ref, definition);
    }
    return value;
}
