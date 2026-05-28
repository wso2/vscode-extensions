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
import { getAnthropicClient, ANTHROPIC_HAIKU_4_5, getProviderCacheControl } from "../../connection";
import { DIAGNOSTICS_SYSTEM_TEMPLATE } from "./system";
import { DIAGNOSTICS_PROMPT } from "./prompt";
import { SYNAPSE_GUIDE } from "../context/synapse_guide";
import { logInfo, logError } from "../logger";

// Register Handlebars partial for synapse guide
Handlebars.registerPartial("synapse_guide", SYNAPSE_GUIDE);

// Zod schemas matching Python Pydantic models
const synapseConfigurationSchema = z.object({
    name: z.string().describe("The name of the configuration."),
    configuration: z.string().describe("Correct XML configuration"),
    id: z.string().optional().describe("The unique identifier for the configuration"),
});

// Type definition for fixed configurations
type SynapseConfiguration = {
    name: string;
    configuration: string;
    id?: string;
};

type BugFixResponse = {
    fixed_config: SynapseConfiguration[];
};

// Zod schema for the response
const bugFixResponseSchema: z.ZodType<BugFixResponse> = z.object({
    fixed_config: z.array(synapseConfigurationSchema)
        .describe("List of corrected synapse configurations"),
});

/**
 * Render a template using Handlebars
 */
function renderTemplate(templateContent: string, context: Record<string, any>): string {
    const template = Handlebars.compile(templateContent);
    return template(context);
}

/**
 * Parameters for code diagnostics
 */
export interface CodeDiagnosticsParams {
    /** Diagnostics information from language server */
    diagnostics: Array<{
        fileName: string;
        diagnostics: Array<{
            message: string;
            range: {
                start: { line: number; character: number };
                end: { line: number; character: number };
            };
            severity?: string;
            source?: string;
        }>;
    }>;
    /** XML codes for the files with issues */
    xmlCodes: Array<{
        fileName: string;
        code: string;
        id?: string;
    }>;
}

/**
 * Result of code diagnostics with fixed configurations
 */
export interface CodeDiagnosticsResult {
    /** Fixed configurations */
    fixed_config: SynapseConfiguration[];
}

/**
 * Analyzes diagnostics and fixes Synapse configuration errors
 * Uses AI with structured output to generate corrected configurations
 */
export async function codeDiagnostics(
    params: CodeDiagnosticsParams
): Promise<CodeDiagnosticsResult> {
    try {
        // Create a mapping between file names and XML codes
        const xmlCodeMap: Record<string, string> = {};
        for (const xmlCode of params.xmlCodes) {
            xmlCodeMap[xmlCode.fileName] = xmlCode.code;
        }
        
        // Create a mapping between file names and XML IDs
        const xmlIdMap: Record<string, string> = {};
        for (const xmlCode of params.xmlCodes) {
            if (xmlCode.id !== undefined && xmlCode.id !== null) {
                xmlIdMap[xmlCode.fileName] = xmlCode.id;
            }
        }
        
        // Render system prompt with synapse guide
        const systemPrompt = renderTemplate(DIAGNOSTICS_SYSTEM_TEMPLATE, {});
        
        // Render user prompt with diagnostics and XML codes
        const userPrompt = renderTemplate(DIAGNOSTICS_PROMPT, {
            diagnostics: params.diagnostics,
            xml_code_map: xmlCodeMap,
        });
        
        const model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);
        const cacheOptions = await getProviderCacheControl();

        // Build messages array with cache control on system message
        const messages: Array<{
            role: "system" | "user";
            content: string;
            providerOptions?: any;
        }> = [
            {
                role: "system" as const,
                content: systemPrompt,
                providerOptions: cacheOptions,
            },
            {
                role: "user" as const,
                content: userPrompt,
            }
        ];

        // Use structured output to get fixed configurations
        // Type assertion to avoid TypeScript deep instantiation issues with Zod
        const result = await (generateObject as any)({
            model: model,
            messages: messages,
            schema: bugFixResponseSchema,
            maxOutputTokens: 8000,
            temperature: 0.2, // Lower temperature for more deterministic fixes
        });
        
        // Extract the fixed configurations from the result
        const bugFixResponse = result.object as BugFixResponse;
        const fixedConfigs = bugFixResponse.fixed_config;
        
        // Add IDs to configurations if available
        for (const config of fixedConfigs) {
            if (config.name in xmlIdMap && !config.id) {
                config.id = xmlIdMap[config.name];
            }
        }
        
        logInfo(`Fixed ${fixedConfigs.length} Synapse configurations`);

        return {
            fixed_config: fixedConfigs,
        };
    } catch (error) {
        logError("Error fixing Synapse configurations", error);
        throw error;
    }
}
