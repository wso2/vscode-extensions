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

import { streamText } from "ai";
import * as Handlebars from "handlebars";
import { getAnthropicClient, ANTHROPIC_SONNET_4_5, getProviderCacheControl } from "../connection";
import { SYSTEM_TEMPLATE } from "./system_v2";
import { PROMPT_TEMPLATE } from "./prompt_v2";
import { SYNAPSE_GUIDE } from "../context/synapse_guide";
import { SYNAPSE_EXPRESSION_GUIDE } from "../context/synapse_expression_guide";
import { SYNAPSE_EXPRESSION_EXAMPLES } from "../context/synapse_expression_examples";
import { AI_MODULE_GUIDE } from "../context/ai_module";

// Register Handlebars helpers
Handlebars.registerHelper("upper", (str: string) => {
    return str ? str.toUpperCase() : "";
});

Handlebars.registerHelper("eq", (a: any, b: any) => {
    return a === b;
});

// Register Handlebars partials
Handlebars.registerPartial("synapse_guide", SYNAPSE_GUIDE);
Handlebars.registerPartial("synapse_expression_guide", SYNAPSE_EXPRESSION_GUIDE);
Handlebars.registerPartial("synapse_expression_examples", SYNAPSE_EXPRESSION_EXAMPLES);
Handlebars.registerPartial("ai_module", AI_MODULE_GUIDE);

/**
 * Render a template using Handlebars
 */
function renderTemplate(templateContent: string, context: Record<string, any>): string {
    const template = Handlebars.compile(templateContent);
    return template(context);
}

/**
 * Parameters for generating Synapse integrations
 */
export interface GenerateSynapseParams {
    /** The user's question or request */
    question: string;
    /** Currently editing file content (optional) */
    file?: string;
    /** Project context - array of file contents or context information */
    context?: string[];
    /** Pre-configured payloads, query params, or path params (optional) */
    payloads?: string;
    /** Available connectors with their JSON signatures (optional) */
    connectors?: Record<string, string>;
    /** Available inbound endpoints with their JSON signatures (optional) */
    inbound_endpoints?: Record<string, string>;
    /** Additional files attached by the user (optional) */
    files?: string[];
    /** Whether images are attached (optional) */
    images?: boolean;
    /** Enable thinking mode for complex queries (optional) */
    thinking_enabled?: boolean;
    /** Abort controller to cancel generation (optional) */
    abortController?: AbortController;
}

/**
 * Generates Synapse integration code with streaming support
 * Returns a Response object with streaming text
 */
export async function generateSynapse(
    params: GenerateSynapseParams
): Promise<Response> {
    // Render system prompt with partials
    const systemPrompt = renderTemplate(SYSTEM_TEMPLATE, {});

    // Render user prompt with all parameters
    const userPrompt = renderTemplate(PROMPT_TEMPLATE, {
        question: params.question,
        file: params.file,
        context: params.context,
        payloads: params.payloads,
        connectors: params.connectors,
        inbound_endpoints: params.inbound_endpoints,
        files: params.files,
        images: params.images,
        thinking_enabled: params.thinking_enabled || false,
    });

    const cacheOptions = await getProviderCacheControl();

    const messages = [
        {
            role: "system" as const,
            content: systemPrompt,
            providerOptions: cacheOptions,
        },
        {
            role: "user" as const,
            content: userPrompt,
            providerOptions: cacheOptions,
        },
    ];

    const model = await getAnthropicClient(ANTHROPIC_SONNET_4_5);

    const result = streamText({
        model: model,
        maxOutputTokens: 8000,
        temperature: 0.3,
        messages,
        maxRetries: 0, // Disable retries to prevent retry loops on quota errors (429)
        abortSignal: params.abortController?.signal,
        onAbort: () => {
            console.log('Code generation aborted by user');
        },
    });

    // Use AI SDK's built-in method to convert to Response with streaming
    return result.toTextStreamResponse();
}
