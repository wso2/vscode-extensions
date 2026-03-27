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
import { DATA_MAPPER_SYSTEM_TEMPLATE } from "./system";
import { DATA_MAPPER_PROMPT } from "./prompt";
import { logError } from "../logger";

/**
 * Render a template using Handlebars
 */
function renderTemplate(templateContent: string, context: Record<string, any>): string {
    const template = Handlebars.compile(templateContent);
    return template(context);
}

/**
 * Extract TypeScript code from markdown code block
 */
function extractTypeScriptCode(text: string): string {
    // Match the entire TypeScript code block
    const fullMatch = text.match(/```(?:typescript|ts)\s*([\s\S]*?)\s*```/i);
    
    if (fullMatch && fullMatch[1]) {
        return fullMatch[1].trim();
    }
    
    // If no code block found, return the original text
    return text;
}

/**
 * Parameters for data mapper
 */
export interface MapDataMapperParams {
    /** TypeScript file content with input/output interfaces and mapFunction to be completed */
    tsFile: string;
}

/**
 * Maps TypeScript interfaces between input and output schemas
 * Uses AI to complete the mapFunction with appropriate field mappings
 */
export async function mapDataMapper(
    params: MapDataMapperParams
): Promise<string> {
    try {
        // Render system and user prompts
        const systemPrompt = DATA_MAPPER_SYSTEM_TEMPLATE;
        const userPrompt = renderTemplate(DATA_MAPPER_PROMPT, {
            ts_file: params.tsFile
        });
        
        const model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);
        
        // Stream the text response
        const { text } = await generateText({
            model: model,
            system: systemPrompt,
            prompt: userPrompt,
            maxOutputTokens: 8000,
            temperature: 0.2, // Lower temperature for more deterministic mappings
            maxRetries: 0, // Disable retries to prevent retry loops on quota errors (429)
        });
        
        return extractTypeScriptCode(text);
    } catch (error) {
        logError("Error mapping data", error);
        throw error;
    }
}
