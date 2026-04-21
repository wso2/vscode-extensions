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

import { resolveSchema } from './schemaResolver';

/**
 * Generate a realistic example from a schema object
 * @param schema - The OpenAPI schema object
 * @param openAPI - The full OpenAPI specification (optional, for resolving $refs)
 * @returns Generated example object/value
 */
export function generateExampleFromSchema(schema: any, openAPI?: any): any {
    if (!schema) return {};
    
    // If openAPI is provided, resolve all $refs first for better examples
    const resolvedSchema = openAPI ? resolveSchema(schema, openAPI) : schema;
    
    if (resolvedSchema.type === 'object' && resolvedSchema.properties) {
        const example: any = {};
        for (const [key, prop] of Object.entries(resolvedSchema.properties)) {
            const property = prop as any;
            example[key] = generateExampleFromProperty(key, property);
        }
        return example;
    } else if (resolvedSchema.type === 'array' && resolvedSchema.items) {
        // For arrays, recursively generate example but don't resolve again
        return [generateExampleFromSchema(resolvedSchema.items)];
    } else {
        return generateExampleFromProperty('value', resolvedSchema);
    }
}

/**
 * Generate a realistic example for a specific property
 * @param fieldName - The name of the field/property
 * @param property - The property schema definition
 * @returns Generated example value
 */
export function generateExampleFromProperty(fieldName: string, property: any): any {
    // Use property's example if available
    if (property.example !== undefined) {
        return property.example;
    }

    // Format-based defaults
    if (property.format) {
        switch (property.format) {
            case 'date-time':
                return '2025-01-01T00:00:00Z';
            case 'date':
                return '2025-01-01';
            case 'time':
                return '12:00:00';
            case 'uuid':
                return '123e4567-e89b-12d3-a456-426614174000';
            case 'email':
                return 'user@example.com';
            case 'uri':
            case 'url':
                return 'https://example.com';
            case 'hostname':
                return 'example.com';
            case 'ipv4':
                return '192.168.0.1';
            case 'ipv6':
                return '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
            default:
                break;
        }
    }
    
    const lowerFieldName = fieldName.toLowerCase();
    
    // Smart defaults based on common field names
    if (lowerFieldName.includes('email')) return 'user@example.com';
    if (lowerFieldName.includes('phone')) return '+1234567890';
    if (lowerFieldName.includes('url') || lowerFieldName.includes('link')) return 'https://example.com';
    if (lowerFieldName.includes('date')) return '2025-01-01';
    if (lowerFieldName === 'id') return 1;
    if (lowerFieldName.includes('name')) return 'Example Name';
    if (lowerFieldName.includes('description')) return 'Example description';
    if (lowerFieldName.includes('title')) return 'Example Title';
    const looksLikeAgeField =
        lowerFieldName === 'age' ||
        lowerFieldName.endsWith('_age') ||
        lowerFieldName.endsWith('-age') ||
        lowerFieldName.endsWith('.age') ||
        fieldName.endsWith('Age');
    if ((property.type === 'number' || property.type === 'integer') && looksLikeAgeField) {
        return 25;
    }
    if (lowerFieldName.includes('price') || lowerFieldName.includes('amount')) return 99.99;
    
    // Type-based defaults
    switch (property.type) {
        case 'string':
            return property.enum?.[0] || 'string';
        case 'number':
        case 'integer':
            return 0;
        case 'boolean':
            return false;
        case 'array':
            return property.items ? [generateExampleFromSchema(property.items)] : [];
        case 'object':
            return property.properties ? generateExampleFromSchema(property) : {};
        default:
            return null;
    }
}
