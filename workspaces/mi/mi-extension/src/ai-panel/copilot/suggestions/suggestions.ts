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

import { streamText, CoreMessage } from "ai";
import * as Handlebars from "handlebars";
import * as path from "path";
import * as fs from "fs";
import { getAnthropicClient, ANTHROPIC_SONNET_4, getProviderCacheControl } from "../connection";
import { GenerateSuggestionsRequest, GenerateSuggestionsResponse } from "@wso2/mi-core";
import { CopilotEventHandler } from "../../../rpc-managers/ai-panel/event-handler";

/**
 * Read and render a template file using Handlebars
 */
function renderTemplate(templateFile: string, context: Record<string, any>): string {
    const templatesDir = path.join(__dirname, ".");
    const templatePath = path.join(templatesDir, templateFile);
    
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
    }

    const templateContent = fs.readFileSync(templatePath, "utf-8");
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
 * Get the project context (placeholder for now - will be implemented with actual project analysis)
 */
function getProjectContext(): string[] {
    // TODO: Implement actual project context extraction
    // This should analyze the current MI project and return relevant information
    // about APIs, sequences, endpoints, etc.
    return [];
}

/**
 * Core suggestion generation function with streaming
 */
export async function generateSuggestionsCore(
    params: GenerateSuggestionsRequest,
    eventHandler: CopilotEventHandler
): Promise<void> {
    const chatHistory = params.chatHistory || [];
    const formattedChatHistory = formatChatHistory(chatHistory);
    const projectContext = getProjectContext();

    // Render system prompt
    const systemPrompt = renderTemplate("system.md", {});

    // Render user prompt
    const userPrompt = renderTemplate("prompt.md", {
        chat_history: formattedChatHistory,
        context: projectContext,
    });

    const cacheOptions = await getProviderCacheControl();

    const messages: CoreMessage[] = [
        {
            role: "system",
            content: systemPrompt,
            providerOptions: cacheOptions,
        },
        {
            role: "user",
            content: userPrompt,
            providerOptions: cacheOptions,
        },
    ];

    try {
        const { fullStream } = streamText({
            model: await getAnthropicClient(ANTHROPIC_SONNET_4),
            maxTokens: 4096,
            temperature: 0.7, // Slightly higher temperature for suggestions
            messages,
        });

        eventHandler.handleStart();
        let assistantResponse: string = "";

        for await (const part of fullStream) {
            switch (part.type) {
                case "text-delta": {
                    const textPart = part.textDelta;
                    assistantResponse += textPart;
                    eventHandler.handleContentBlock(textPart);
                    break;
                }
                case "error": {
                    const error = part.error;
                    console.error("Error during suggestion generation:", error);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    eventHandler.handleError(errorMessage);
                    break;
                }
                case "finish": {
                    const finishReason = part.finishReason;
                    console.log("Suggestion generation finish reason:", finishReason);
                    
                    if (finishReason === "error") {
                        // Error already handled above
                        break;
                    }

                    // Send the complete response
                    eventHandler.handleEnd(assistantResponse);
                    eventHandler.handleStop("suggestions");
                    break;
                }
            }
        }
    } catch (error) {
        console.error("Error generating suggestions:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        eventHandler.handleError(errorMessage);
        eventHandler.handleStop("suggestions");
    }
}

/**
 * Main public function that generates suggestions
 * This is the entry point called by the RPC handler
 */
export async function generateSuggestions(
    params: GenerateSuggestionsRequest,
    projectUri: string
): Promise<GenerateSuggestionsResponse> {
    const eventHandler = new CopilotEventHandler(projectUri);

    try {
        await generateSuggestionsCore(params, eventHandler);

        // Return success response
        return {
            response: "Suggestions generated successfully",
            files: [],
            images: [],
        };
    } catch (error) {
        console.error("Error in generateSuggestions:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        eventHandler.handleError(errorMessage);

        return {
            response: `Error: ${errorMessage}`,
            files: [],
            images: [],
        };
    }
}

