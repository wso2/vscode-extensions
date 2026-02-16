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

const SUPPORTED_COMPONENT_BUCKETS = new Set([
    'inputs',
    'parameters',
    'successActions',
    'failureActions',
]);

/**
 * Resolves a JSON pointer reference string to the actual component data
 * from the Arazzo definition, recursively resolving nested references.
 * 
 * Supports:
 * - JSON pointer refs: "#/components/inputs/myInput"
 * - reusable-object refs: "$components.parameters.RequestId"
 *
 * @param ref - reference string
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

    let current: any = null;
    
    try {
        if (ref.startsWith('$components.')) {
            current = resolveReusableReference(ref, definition);
        } else {
            // Parse JSON pointer: remove leading '#/' and split by '/'
            const path = ref.startsWith('#/') ? ref.slice(2) : ref;
            const parts = path.split('/');

            // Traverse the definition object following the path
            current = definition;
            for (const part of parts) {
                if (current === null || current === undefined) {
                    return null;
                }
                
                // Decode URI components (e.g., ~0 -> ~, ~1 -> /)
                const decodedPart = part.replace(/~1/g, '/').replace(/~0/g, '~');
                current = current[decodedPart];
            }
        }
        
        // Recursively resolve any nested $ref objects in the resolved component
        return resolveNestedReferences(current, definition, visited);
    } catch (error) {
        console.warn(`Failed to resolve reference "${ref}":`, error);
        return null;
    }
}

function resolveReusableReference(
    ref: string,
    definition: ArazzoDefinition | undefined
): any {
    if (!definition || !ref.startsWith('$components.')) {
        return null;
    }

    const rawPath = ref.slice('$components.'.length);
    const separatorIndex = rawPath.indexOf('.');
    if (separatorIndex === -1) {
        return null;
    }

    const bucket = rawPath.slice(0, separatorIndex);
    const componentKey = rawPath.slice(separatorIndex + 1);

    if (!SUPPORTED_COMPONENT_BUCKETS.has(bucket) || !componentKey) {
        return null;
    }

    const bucketObj = (definition as any)?.components?.[bucket];
    if (!bucketObj || typeof bucketObj !== 'object') {
        return null;
    }

    return bucketObj[componentKey] ?? null;
}

/**
 * Recursively resolves nested reference objects within a component.
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

    // If this object is itself a reference-like object, resolve it
    if (isReferenceLike(obj)) {
        const refPath = getReferencePath(obj);
        if (refPath) {
            return resolveReference(refPath, definition, visited);
        }
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
 * Checks if a value is a reusable reference object (has a `reference` property).
 */
export function isReusableReference(value: any): boolean {
    return value !== null &&
           typeof value === 'object' &&
           'reference' in value &&
           typeof value.reference === 'string';
}

/**
 * Checks if a value is either a JSON-pointer reference object (`$ref`) or
 * an Arazzo reusable-object reference (`reference`).
 */
export function isReferenceLike(value: any): boolean {
    return isReference(value) || isReusableReference(value);
}

/**
 * Extracts the original reference path from a reference-like object.
 */
export function getReferencePath(value: any): string | null {
    if (isReference(value)) {
        return value.$ref;
    }
    if (isReusableReference(value)) {
        return value.reference;
    }
    return null;
}


