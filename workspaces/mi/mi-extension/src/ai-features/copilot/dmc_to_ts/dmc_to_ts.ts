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
import { getAnthropicClient, ANTHROPIC_SONNET_4_6 } from "../../connection";
import { DMC_TO_TS_SYSTEM_TEMPLATE } from "./system";
import { DMC_TO_TS_PROMPT } from "./prompt";
import { logInfo } from "../logger";

/**
 * Render a template using Handlebars
 */
function renderTemplate(templateContent: string, context: Record<string, any>): string {
    const template = Handlebars.compile(templateContent);
    return template(context);
}

/**
 * Extracts TypeScript code from markdown code blocks
 */
function extractTypeScriptCode(text: string): string {
    // Try to match TypeScript code block
    const fullMatch = text.match(/```typescript\s*([\s\S]*?)\s*```/);

    if (fullMatch) {
        const codeBlock = fullMatch[1].trim();
        return codeBlock;
    }

    // If no code block found, return the original text
    return text;
}

/**
 * Parameters for DMC to TypeScript conversion
 */
export interface DmcToTsParams {
    /** DMC (Data Mapping Configuration) file content */
    dmcContent: string;
    /** TypeScript file content with interfaces and empty mapFunction */
    tsFile: string;
}

/**
 * Response from DMC to TypeScript conversion
 */
export interface DmcToTsResponse {
    /** Complete TypeScript file with implemented mapFunction */
    mapping: string;
}

/**
 * Converts DMC (Data Mapping Configuration) file to TypeScript implementation
 *
 * Takes a DMC file (JavaScript mapping configuration) and a TypeScript file
 * with interfaces, and returns the complete TypeScript file with the mapFunction
 * implemented based on the mappings in the DMC file.
 */
export async function dmcToTs(params: DmcToTsParams): Promise<DmcToTsResponse> {
    logInfo('Starting DMC to TypeScript conversion');
    logInfo(`DMC content length: ${params.dmcContent.length}`);
    logInfo(`TS file length: ${params.tsFile.length}`);

    const systemPrompt = DMC_TO_TS_SYSTEM_TEMPLATE;
    const userPrompt = renderTemplate(DMC_TO_TS_PROMPT, {
        dmc_content: params.dmcContent,
        ts_file: params.tsFile
    });

    const model = await getAnthropicClient(ANTHROPIC_SONNET_4_6);

    const { text } = await generateText({
        model: model,
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: 16000,
        temperature: 0.2, // Deterministic for code generation
        maxRetries: 0,
    });

    logInfo(`Conversion completed, response length: ${text.length}`);

    // Extract TypeScript code from markdown blocks
    const extractedCode = extractTypeScriptCode(text);

    return { mapping: extractedCode };
}
