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

import { generateObject } from "ai";
import { z } from "zod";
import { getAnthropicClient, ANTHROPIC_HAIKU_4_5 } from "../../connection";
import { logInfo, logError } from "../logger";

// System prompt from IdpUtills.tsx
const SYSTEM_PROMPT =
    "You are an expert AI assistant specialized in analyzing multiple images and extracting structured data. " +
    "Your task is to accurately populate the provided JSON schema using the given images. " +
    "Each field in the schema has a description. Use it to infer the correct value if possible. " +
    "If a field cannot be confidently inferred from the images or its description, return null for that field. " +
    "Field names in the output must exactly match the keys in the schema, including case sensitivity.";

const USER_PROMPT =
    "Please analyze all the provided images thoroughly and populate the JSON schema based on the information extracted.";

export interface FillIdpSchemaParams {
    jsonSchema: string;
    images: string[];
}

export interface FillIdpSchemaResult {
    filledData: string;
}

/**
 * Converts JSON Schema to Zod schema dynamically
 * Supports nested objects, arrays, strings, numbers, booleans, and descriptions
 */
function jsonSchemaToZod(schema: any): z.ZodTypeAny {
    const type = schema.type;

    // Handle object types
    if (type === 'object' && schema.properties) {
        const shape: Record<string, z.ZodTypeAny> = {};

        for (const [key, value] of Object.entries(schema.properties as Record<string, any>)) {
            let fieldSchema = jsonSchemaToZod(value).nullable();

            // Add description if available
            if (value.description) {
                fieldSchema = fieldSchema.describe(value.description);
            }

            // Check if field is required
            const isRequired = schema.required?.includes(key);
            shape[key] = isRequired ? fieldSchema : fieldSchema.optional();
        }

        return z.object(shape);
    }

    // Handle array types
    if (type === 'array' && schema.items) {
        const itemSchema = jsonSchemaToZod(schema.items);
        return z.array(itemSchema).nullable();
    }

    // Handle primitive types
    switch (type) {
        case 'string':
            return z.string().nullable();
        case 'number':
        case 'integer':
            return z.number().nullable();
        case 'boolean':
            return z.boolean().nullable();
        case 'null':
            return z.null();
        default:
            // Fallback for unknown types
            return z.any().nullable();
    }
}

/**
 * Fills an IDP schema with data extracted from images
 *
 * This function:
 * 1. Takes an existing JSON schema structure
 * 2. Converts JSON schema to Zod schema for structured output
 * 3. Analyzes provided images (invoices, forms, documents)
 * 4. Extracts data from images to populate the schema fields
 * 5. Returns filled JSON data matching the schema structure
 *
 * @param params - Schema and images for data extraction
 * @returns Filled JSON data matching the schema
 */
export async function fillIdpSchema(
    params: FillIdpSchemaParams
): Promise<FillIdpSchemaResult> {
    try {
        logInfo('Starting schema filling');
        logInfo(`Schema length: ${params.jsonSchema?.length || 0}`);
        logInfo(`Images count: ${params.images.length}`);

        // Parse JSON schema
        const parsedSchema = JSON.parse(params.jsonSchema);

        // Convert JSON schema to Zod schema
        const zodSchema = jsonSchemaToZod(parsedSchema);

        const model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);

        // Build multimodal content (text + images)
        const contentParts: any[] = [
            {
                type: 'text' as const,
                text: USER_PROMPT
            }
        ];

        // Add all images to the request
        for (const image of params.images) {
            contentParts.push({
                type: 'image' as const,
                image: image  // Base64-encoded image (with or without data URL prefix)
            });
        }

        logInfo('Calling AI model with structured output...');

        // Call Anthropic with multimodal input and structured output
        // Type assertion to avoid TypeScript deep instantiation issues with Zod
        const result = await (generateObject as any)({
            model: model,
            system: SYSTEM_PROMPT,
            messages: [{
                role: 'user',
                content: contentParts
            }],
            schema: zodSchema,
            maxOutputTokens: 8000,
            temperature: 0.2, // Low temperature for deterministic extraction
        });

        logInfo('Schema filling completed successfully');

        // Return the structured object as JSON string
        return {
            filledData: JSON.stringify(result.object, null, 2)
        };
    } catch (error) {
        logError('Error filling schema', error);
        throw error;
    }
}
