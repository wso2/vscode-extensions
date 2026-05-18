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
import { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import * as Handlebars from "handlebars";
import { FileObject, ImageObject } from "@wso2/mi-core";
import { getAnthropicClient, ANTHROPIC_SONNET_4_6, getProviderCacheControl } from "../../connection";
import { SYSTEM_TEMPLATE } from "./system_v2";
import { PROMPT_TEMPLATE } from "./prompt_v2";
import { SYSTEM_TEMPLATE as SYSTEM_TEMPLATE_V1 } from "./system_v1";
import { PROMPT_TEMPLATE as PROMPT_TEMPLATE_V1 } from "./prompt_v1";
import { SYNAPSE_GUIDE } from "../context/synapse_guide";
import { SYNAPSE_GUIDE as SYNAPSE_GUIDE_V1 } from "../context/synapse_guide_v1";
import { SYNAPSE_EXPRESSION_GUIDE } from "../context/synapse_expression_guide";
import { SYNAPSE_EXPRESSION_EXAMPLES } from "../context/synapse_expression_examples";
import { AI_MODULE_GUIDE } from "../context/ai_module";
import { getMIVersionFromPom, compareVersions } from "../../../util/onboardingUtils";
import { RUNTIME_VERSION_440 } from "../../../constants";
import { logInfo, logError } from "../logger";
import { buildMessageContent } from "../message-utils";
import * as vscode from "vscode";

// Register Handlebars helpers
Handlebars.registerHelper("upper", (str: string) => {
    return str ? str.toUpperCase() : "";
});

Handlebars.registerHelper("eq", (a: any, b: any) => {
    return a === b;
});

// Register Handlebars partials
Handlebars.registerPartial("synapse_guide", SYNAPSE_GUIDE);
Handlebars.registerPartial("synapse_guide_v1", SYNAPSE_GUIDE_V1);
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
 * Chat message in the conversation history
 */
export interface ChatMessage {
    /** Role of the message sender */
    role: "user" | "assistant";
    /** Content of the message */
    content: string;
}

/**
 * Parameters for generating Synapse integrations
 */
export interface GenerateSynapseParams {
    /** The user's question or request */
    question: string;
    /** Project URI for version detection */
    projectUri: string;
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
    /** Additional files attached by the user (optional) - FileObject array */
    files?: FileObject[];
    /** Images attached by the user (optional) - ImageObject array */
    images?: ImageObject[];
    /** Enable thinking mode for complex queries (optional) */
    thinking_enabled?: boolean;
    /** Chat history - last 3 conversations (sliding window) (optional) */
    chatHistory?: ChatMessage[];
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
    // Get MI version from project to determine which prompt template to use
    const runtimeVersion = await getMIVersionFromPom(params.projectUri);
    const useV2Prompts = runtimeVersion ? compareVersions(runtimeVersion, RUNTIME_VERSION_440) >= 0 : true;

    // Select appropriate templates based on runtime version
    const selectedSystemTemplate = useV2Prompts ? SYSTEM_TEMPLATE : SYSTEM_TEMPLATE_V1;
    const selectedPromptTemplate = useV2Prompts ? PROMPT_TEMPLATE : PROMPT_TEMPLATE_V1;

    logInfo(`Runtime version: ${runtimeVersion}, Using ${useV2Prompts ? 'v2' : 'v1'} prompts`);

    // Render system prompt with partials
    const systemPrompt = renderTemplate(selectedSystemTemplate, {});

    // Render user prompt with all parameters
    const userPrompt = renderTemplate(selectedPromptTemplate, {
        question: params.question,
        file: params.file,
        context: params.context,
        payloads: params.payloads,
        connectors: params.connectors,
        inbound_endpoints: params.inbound_endpoints,
        thinking_enabled: params.thinking_enabled || false,
    });

    const cacheOptions = await getProviderCacheControl();

    // Build messages array with chat history
    const messages: any[] = [
        {
            role: "system" as const,
            content: systemPrompt,
            providerOptions: cacheOptions,
        }
    ];

    // Add chat history (already filtered to last 6 messages by caller)
    if (params.chatHistory && params.chatHistory.length > 0) {
        logInfo(`Including ${params.chatHistory.length} messages from chat history`);

        for (const msg of params.chatHistory) {
            messages.push({
                role: msg.role,
                content: msg.content,
                providerOptions: cacheOptions,
            });
        }
    }

    // Build message content with files and images if present
    const hasFiles = params.files && params.files.length > 0;
    const hasImages = params.images && params.images.length > 0;

    if (hasFiles || hasImages) {
        logInfo(`Including ${params.files?.length || 0} files and ${params.images?.length || 0} images in the message`);

        // Use buildMessageContent to create content array with files, PDFs, and images
        // Note: Attachments are pre-validated in RPC manager via validateAttachments()
        const messageContent = buildMessageContent(userPrompt, params.files, params.images);

        messages.push({
            role: "user" as const,
            content: messageContent
        });
    } else {
        // No attachments, use simple text content
        messages.push({
            role: "user" as const,
            content: userPrompt
        });
    }

    const model = await getAnthropicClient(ANTHROPIC_SONNET_4_6);

    // Configure provider options for thinking mode if enabled
    const anthropicOptions: AnthropicProviderOptions = params.thinking_enabled
        ? { thinking: { type: 'enabled', budgetTokens: 1024 } }
        : {};

    const result = streamText({
        model: model,
        maxOutputTokens: 8000,
        temperature: 0.3,
        messages,
        maxRetries: 0, // Disable retries to prevent retry loops on quota errors (429)
        abortSignal: params.abortController?.signal,
        providerOptions: {
            anthropic: anthropicOptions
        },
        onAbort: () => {
            logInfo('Code generation aborted by user');
        },
        onError: (error) => {
            logError('AI SDK error during code generation', error);

            // Show error message with Report Issue button
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object') {
                // Try to extract meaningful error info from object
                errorMessage = (error as any).message ||
                              (error as any).error ||
                              (error as any).detail ||
                              JSON.stringify(error);
            }

            vscode.window.showErrorMessage(
                `Unexpected error occurred during AI Copilot generation: ${errorMessage}`,
                "Report Issue",
                "Retry"
            ).then(selection => {
                if (selection === "Report Issue") {
                    vscode.env.openExternal(vscode.Uri.parse("https://github.com/wso2/vscode-extensions/issues"));
                }
                // Note: Retry would need to be handled by the caller
            });
        },
    });

    // Use AI SDK's built-in method to convert to Response with streaming
    return result.toTextStreamResponse();
}
