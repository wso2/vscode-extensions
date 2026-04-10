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
import { getAnthropicClient, ANTHROPIC_HAIKU_4_5, getProviderCacheControl } from "../../connection";
import { SYSTEM_TEMPLATE } from "./system";
import { PROMPT_TEMPLATE } from "./prompt";
import { logError } from "../logger";

/**
 * Render a template using Handlebars
 */
function renderTemplate(templateContent: string, context: Record<string, any>): string {
    const template = Handlebars.compile(templateContent);
    return template(context);
}

/**
 * Format chat history for the prompt
 */
function formatChatHistory(chatHistory: any[]): string {
    if (!chatHistory || chatHistory.length === 0) {
        return "";
    }

    return chatHistory
        .map((entry) => {
            const role = entry.role === "user" ? "User" : "Assistant";
            return `${role}: ${entry.content}`;
        })
        .join("\n\n");
}

/**
 * Generates suggestions based on the provided parameters
 * Returns the generated suggestions text
 */
export async function generateSuggestions(
    codeContext: string[],
    chatHistory: any[]
): Promise<string> {
    const formattedChatHistory = formatChatHistory(chatHistory);
    const projectContext = codeContext;

    // Render system prompt
    const systemPrompt = renderTemplate(SYSTEM_TEMPLATE, {});

    // Render user prompt
    const userPrompt = renderTemplate(PROMPT_TEMPLATE, {
        chat_history: formattedChatHistory,
        context: projectContext,
    });

    const cacheOptions = await getProviderCacheControl();

    const messages = [
        {
            role: "system" as const,
            content: systemPrompt,
            providerOptions: cacheOptions, // Cache system prompt only
        },
        {
            role: "user" as const,
            content: userPrompt,
        },
    ];

    const model = await getAnthropicClient(ANTHROPIC_HAIKU_4_5);

    try{
        const { text } = await generateText({
            model: model,
            maxOutputTokens: 100,
            temperature: 0.6, // Slightly higher temperature for suggestions
            messages,
            maxRetries: 0, // Disable retries to prevent retry loops on quota errors (429)
        });
        return text;
    } catch (error) {
        logError("Error generating suggestions", error);
        return "";
    }
}
