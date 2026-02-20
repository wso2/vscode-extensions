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
import * as Handlebars from "handlebars";
import { getAnthropicClient, ANTHROPIC_HAIKU_4_5 } from "../../connection";
import { SYSTEM } from "./system";
import { PROMPT } from "./prompt";
import { SYNAPSE_GUIDE } from "../context/synapse_guide";
import { SYNAPSE_EXPRESSION_GUIDE } from "../context/synapse_expression_guide";
import { logInfo, logError } from "../logger";

// Register Handlebars partials
Handlebars.registerPartial("synapse_guide", SYNAPSE_GUIDE);
Handlebars.registerPartial("synapse_expression_guide", SYNAPSE_EXPRESSION_GUIDE);

/**
 * Helper function to render Handlebars templates
 */
function renderTemplate(template: string, context: any): string {
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(context);
}

/**
 * Request parameters for auto-fill
 */
export interface AutoFillFormParams {
    payloads?: string[];
    variables?: string[];
    params?: string[];
    properties?: string[];
    headers?: string[];
    configs?: string[];
    connection_names?: string[];
    form_details?: string;
    current_values: Record<string, any>;
    field_descriptions?: Record<string, string>;
    question?: string;
}

/**
 * Response from auto-fill
 */
export interface AutoFillFormResult {
    filled_values: Record<string, any>;
}

/**
 * Creates a dynamic Zod schema based on the current form values structure
 * This mimics Python's dynamic Pydantic model creation
 */
function createDynamicZodSchema(
    currentValues: Record<string, any>,
    fieldDescriptions?: Record<string, string>
): z.ZodObject<any> {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    for (const [key, value] of Object.entries(currentValues)) {
        let fieldSchema: z.ZodTypeAny;

        // Determine field type based on current value
        if (typeof value === 'string') {
            fieldSchema = z.string();
        } else if (typeof value === 'boolean') {
            fieldSchema = z.boolean();
        } else if (typeof value === 'number') {
            fieldSchema = z.number();
        } else if (Array.isArray(value)) {
            // Handle array fields - infer element type from first element if available
            if (value.length > 0) {
                const firstElement = value[0];
                if (Array.isArray(firstElement)) {
                    // Array of arrays
                    fieldSchema = z.array(z.array(z.any()));
                } else if (typeof firstElement === 'object' && firstElement !== null) {
                    // Array of objects
                    if ('is_expression' in firstElement && 'value' in firstElement) {
                        // Array of PropertyData objects
                        fieldSchema = z.array(z.object({
                            is_expression: z.boolean().describe("Whether the value is a Synapse expression"),
                            value: z.string().describe("The actual value or expression"),
                        }));
                    } else {
                        // Array of generic objects
                        fieldSchema = z.array(z.record(z.string(), z.any()));
                    }
                } else if (typeof firstElement === 'string') {
                    fieldSchema = z.array(z.string());
                } else if (typeof firstElement === 'number') {
                    fieldSchema = z.array(z.number());
                } else if (typeof firstElement === 'boolean') {
                    fieldSchema = z.array(z.boolean());
                } else {
                    // Fallback for unknown element types
                    fieldSchema = z.array(z.any());
                }
            } else {
                // Empty array - default to array of any
                fieldSchema = z.array(z.any());
            }
        } else if (typeof value === 'object' && value !== null) {
            // Check if it's a PropertyData object (has is_expression and value)
            if ('is_expression' in value && 'value' in value) {
                fieldSchema = z.object({
                    is_expression: z.boolean().describe("Whether the value is a Synapse expression"),
                    value: z.string().describe("The actual value or expression"),
                });
            } else {
                // Generic object - try to infer structure
                fieldSchema = z.record(z.string(), z.any());
            }
        } else {
            // Default to any for unknown types
            fieldSchema = z.any();
        }

        // Add description if available
        if (fieldDescriptions && fieldDescriptions[key]) {
            fieldSchema = fieldSchema.describe(fieldDescriptions[key]);
        }

        // Handle special case: config_key should be renamed to configKey in the response
        const schemaKey = key === 'config_key' ? 'configKey' : key;
        schemaFields[schemaKey] = fieldSchema;
    }

    return z.object(schemaFields);
}

/**
 * Maps the AI response back to match the original field names
 * Handles the configKey → config_key conversion
 */
function mapResponseToOriginalKeys(
    aiResponse: Record<string, any>,
    originalKeys: string[]
): Record<string, any> {
    const result: Record<string, any> = {};

    for (const originalKey of originalKeys) {
        // Handle configKey → config_key mapping
        if (originalKey === 'config_key' && 'configKey' in aiResponse) {
            result['config_key'] = aiResponse['configKey'];
        } else if (originalKey in aiResponse) {
            result[originalKey] = aiResponse[originalKey];
        }
    }

    return result;
}

/**
 * Auto-fills form fields using AI based on context and user input
 *
 * This function:
 * 1. Builds a dynamic Zod schema from the current form structure
 * 2. Renders prompts with available context (payloads, variables, etc.)
 * 3. Calls the AI model with structured output
 * 4. Returns filled form values matching the original structure
 *
 * @param params - Auto-fill parameters including form context and current values
 * @returns Filled form values with AI-suggested content
 */
export async function autoFillForm(
    params: AutoFillFormParams
): Promise<AutoFillFormResult> {
    try {
        // Create dynamic Zod schema based on current form structure
        const dynamicSchema = createDynamicZodSchema(
            params.current_values,
            params.field_descriptions
        );

        // Render system prompt (includes synapse_guide and expression_guide)
        const systemPrompt = renderTemplate(SYSTEM, {});

        // Render user prompt with all available context
        const userPrompt = renderTemplate(PROMPT, {
            payloads: params.payloads || [],
            variables: params.variables || [],
            params: params.params || [],
            properties: params.properties || [],
            headers: params.headers || [],
            configs: params.configs || [],
            connection_names: params.connection_names || [],
            form_details: params.form_details || '',
            current_values: params.current_values,
            question: params.question || '', // Empty means No-Prompt Mode (auto-fill)
        });

        logInfo('Generating AI suggestions for form...');

        // Get AI model
        const model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);

        // Generate structured output using the dynamic schema
        // Type assertion to avoid TypeScript deep instantiation issues with Zod
        const result = await (generateObject as any)({
            model: model,
            system: systemPrompt,
            prompt: userPrompt,
            schema: dynamicSchema,
            maxOutputTokens: 8000,
            temperature: 0.2, // Lower temperature for deterministic form filling
        });

        // Extract the filled values from the result
        const aiResponse = result.object as Record<string, any>;

        // Map response back to original field names (handle configKey → config_key)
        const originalKeys = Object.keys(params.current_values);
        const filledValues = mapResponseToOriginalKeys(aiResponse, originalKeys);

        logInfo('Successfully generated form suggestions');

        return {
            filled_values: filledValues,
        };
    } catch (error) {
        logError('Error generating form suggestions', error);
        throw error;
    }
}
