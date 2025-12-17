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

import { generateText } from "ai";
import * as Handlebars from "handlebars";
import { getAnthropicClient, ANTHROPIC_HAIKU_4_5 } from "../../connection";
import { SYSTEM_IDP } from "./system";
import { IDP_PROMPT } from "./prompt";
import { logError } from "../logger";

/**
 * Register Handlebars helper for equality check
 */
Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
});

/**
 * Render a template using Handlebars
 */
function renderTemplate(templateContent: string, context: Record<string, any>): string {
    const template = Handlebars.compile(templateContent);
    return template(context);
}

/**
 * Extract JSON from markdown code blocks or raw text
 */
function extractJSON(text: string): string {
    // Try to extract from JSON code block first
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
        return jsonMatch[1].trim();
    }

    // Try to extract from generic code block
    const codeMatch = text.match(/```\s*([\s\S]*?)```/);
    if (codeMatch) {
        return codeMatch[1].trim();
    }

    // If no code block, try to find JSON object in the text
    const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
        return jsonObjectMatch[0].trim();
    }

    // Return as is if nothing matched
    return text.trim();
}

/**
 * Parameters for IDP request
 */
export interface IdpParams {
    /** Operation type: "generate" or "finetune" */
    operation: 'generate' | 'finetune';
    /** User input for fine-tuning (optional for generate) */
    userInput?: string;
    /** Existing JSON schema for fine-tuning */
    jsonSchema?: string;
    /** Array of base64-encoded images */
    images?: string[];
}

/**
 * Response from IDP
 */
export interface IdpResponse {
    /** Generated or modified JSON schema */
    schema: string;
}

/**
 * Intelligent Document Processor - Generates or modifies JSON schemas
 *
 * Two modes:
 * 1. **Generate**: Extract schema from images
 * 2. **Finetune**: Modify existing schema based on user input and/or images
 */
export async function processIdp(params: IdpParams): Promise<IdpResponse> {
    try {
        // Render user prompt
        const userPrompt = renderTemplate(IDP_PROMPT, {
            operation: params.operation,
            user_input: params.userInput || '',
            json_schema: params.jsonSchema || '',
            image_provided: params.images && params.images.length > 0
        });

        const model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);

        // Build messages array
        const messages: any[] = [];

        // Add text content
        const textContent = {
            type: 'text' as const,
            text: userPrompt
        };

        // If images are provided, create a multi-part message
        if (params.images && params.images.length > 0) {
            const contentParts: any[] = [textContent];

            // Add all images
            for (const image of params.images) {
                contentParts.push({
                    type: 'image' as const,
                    image: image  // Base64-encoded image
                });
            }

            messages.push({
                role: 'user',
                content: contentParts
            });
        } else {
            // No images, just text
            messages.push({
                role: 'user',
                content: userPrompt
            });
        }

        // Generate response
        const { text } = await generateText({
            model: model,
            system: SYSTEM_IDP,
            messages: messages,
            maxOutputTokens: 8000,  // JSON schemas can be large
            temperature: 0.2,        // Deterministic for schema generation
            maxRetries: 0,           // Prevent retry loops on quota errors
        });

        // Extract JSON from response
        const extractedJSON = extractJSON(text);

        return {
            schema: extractedJSON
        };
    } catch (error) {
        logError("Error processing IDP", error);
        throw error;
    }
}
