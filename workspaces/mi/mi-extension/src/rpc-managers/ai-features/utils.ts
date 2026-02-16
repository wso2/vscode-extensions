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

import { MiDiagramRpcManager } from "../mi-diagram/rpc-manager";
import { MiVisualizerRpcManager } from "../mi-visualizer/rpc-manager";
import { getAccessToken, getAuthCredentials, getLoginMethod, getRefreshedAccessToken } from "../../ai-features/auth";
import { openSignInView } from "../../util/ai-datamapper-utils";
import { EVENT_TYPE, MACHINE_VIEW, AI_EVENT_TYPE, Role, LoginMethod } from "@wso2/mi-core";
import * as vscode from "vscode";
import { MIAIPanelRpcManager } from "./rpc-manager";
import { generateSynapse } from "../../ai-features/copilot/generation/generations";
import { getConnectors } from "../../ai-features/copilot/connectors/connectors";
import { codeDiagnostics } from "../../ai-features/copilot/diagnostics/diagnostics";
import { openAIWebview, StateMachineAI } from "../../ai-features/aiMachine";

// Error messages
export const COPILOT_ERROR_MESSAGES = {
    BAD_REQUEST: "Bad request. Please check your input and try again.",
    UNAUTHORIZED: "Unauthorized access. Please sign in and try again.",
    FORBIDDEN: "Access forbidden. You don't have permission to perform this action.",
    NOT_FOUND: "Resource not found. Please check the backend URL or try again later.",
    TOKEN_COUNT_EXCEEDED: "Token limit exceeded. Please wait before making another request.",
    ERROR_422: "Unprocessable entity. Please check your input format and try again."
};

// Backend request types
export enum BackendRequestType {
    InitialPrompt = "initial_prompt",
    QuestionClick = "question_click", 
    UserPrompt = "user_prompt",
    Suggestions = "suggestions"
}

// API Response interface
export interface ApiResponse {
    event: string;
    error: string | null;
    questions: string[];
}

// Types for handling fixed/corrected code from LLM
export interface FixedConfigItem {
    name: string;
    configuration?: string;
    code?: string;
}

export interface CorrectedCodeItem {
    fileName: string;
    code: string;
}

/**
 * Gets the MI_INTEL access token from unified auth storage.
 */
export async function getUserAccessToken(): Promise<string> {
    const [token, loginMethod] = await Promise.all([
        getAccessToken(),
        getLoginMethod(),
    ]);

    if (!token || loginMethod !== LoginMethod.MI_INTEL) {
        throw new Error('User access token not available');
    }

    return token;
}

/**
 * Checks if the current auth mode is Anthropic API key.
 */
export async function hasAnthropicApiKey(): Promise<string | undefined> {
    const credentials = await getAuthCredentials();
    if (credentials?.loginMethod === LoginMethod.ANTHROPIC_KEY) {
        return credentials.secrets.apiKey;
    }
    return undefined;
}

/**
 * Refreshes the user access token
 */
export async function refreshUserAccessToken(): Promise<string> {
    const newToken = await getRefreshedAccessToken();
    if (!newToken) {
        throw new Error('Failed to refresh access token');
    }
    return newToken;
}

/**
 * Gets status text for HTTP status codes
 */
export function getStatusText(status: number): string {
    switch (status) {
        case 400: return COPILOT_ERROR_MESSAGES.BAD_REQUEST;
        case 401: return COPILOT_ERROR_MESSAGES.UNAUTHORIZED;
        case 403: return COPILOT_ERROR_MESSAGES.FORBIDDEN;
        case 404: return COPILOT_ERROR_MESSAGES.NOT_FOUND;
        case 429: return COPILOT_ERROR_MESSAGES.TOKEN_COUNT_EXCEEDED;
        case 422: return COPILOT_ERROR_MESSAGES.ERROR_422;
        default: return '';
    }
}

/**
 * Shows notification when user is signed out
 */
function showSignedOutNotification(projectUri: string) {
    vscode.window.showWarningMessage(
        "You are signed out. Please sign in to continue.",
        "Sign In"
    ).then(selection => {
        if (selection === "Sign In") {
            openSignInView(projectUri);
        }
    });
}

/**
 * Shows notification when user's free quota is exceeded
 */
function showQuotaExceededNotification(projectUri: string) {
    vscode.window.showWarningMessage(
        "Your free usage quota has been exceeded. Set your own Anthropic API key to continue using MI Copilot with unlimited access.",
        "Set API Key",
        "Learn More"
    ).then(selection => {
        if (selection === "Set API Key") {
            // Open AI panel and trigger API key authentication flow
            openAIWebview();
            StateMachineAI.sendEvent(AI_EVENT_TYPE.AUTH_WITH_API_KEY);
        } else if (selection === "Learn More") {
            vscode.env.openExternal(vscode.Uri.parse("https://console.anthropic.com/"));
        }
    });
}

/**
 * Opens update extension view
 */
export function openUpdateExtensionView(projectUri: string) {
    const miVisualizerRpcManager = new MiVisualizerRpcManager(projectUri);
    miVisualizerRpcManager.openView({ 
        type: EVENT_TYPE.OPEN_VIEW, 
        location: { view: MACHINE_VIEW.UpdateExtension } 
    });
}

/**
 * Gets workspace context for the project
 */
export async function getWorkspaceContext(projectUri: string, selective: boolean = false) {
    const miDiagramRpcManager = new MiDiagramRpcManager(projectUri);
    if (selective) {
        return await miDiagramRpcManager.getSelectiveWorkspaceContext();
    } else {
        return await miDiagramRpcManager.getWorkspaceContext();
    }
}

/**
 * Generates code using local LLM (ditching backend)
 */
export async function fetchCodeGenerationsWithRetry(
    url: string,
    chatHistory: any[],
    files: any[],
    images: any[],
    projectUri: string,
    controller: AbortController,
    selective: boolean = false,
    thinking?: boolean
): Promise<Response> {
    // Get workspace context
    const context = await getWorkspaceContext(projectUri, selective);
    const miDiagramRpcManager = new MiDiagramRpcManager(projectUri);
    const defaultPayloads = await miDiagramRpcManager.getAllInputDefaultPayloads();

    // Extract the user's question from chat history (last user message)
    // Check for Role.CopilotUser enum or fallback to 'user' string for backward compatibility
    const lastUserMessage = [...chatHistory].reverse().find(entry =>
        entry.role === Role.CopilotUser || entry.role === 'user'
    );
    const userQuestion = lastUserMessage?.content || '';

    // Get currently editing file content if available (first file only)
    const currentFile = files.length > 0 ? files[0]?.content : undefined;

    // Get relevant connectors and inbound endpoints for the user's query
    const { connectors: selectedConnectors, inbound_endpoints: selectedInboundEndpoints } = await getConnectors({
        question: userQuestion,
        files: files.length > 0 ? files : undefined,
        images: images.length > 0 ? images : undefined,
    });

    // Convert chat history to the format expected by generateSynapse
    // Take last 6 messages (3 conversations) as sliding window, excluding the current message
    const historyMessages = chatHistory
        .slice(-7, -1) // Take last 7 messages and exclude the last one (current question) = 6 messages
        .map(entry => ({
            role: entry.role === Role.CopilotUser || entry.role === 'user'
                ? 'user' as const
                : 'assistant' as const,
            content: entry.content
        }));

    // Call generateSynapse - it returns a Response with streaming text
    // AI SDK handles all the stream conversion and abort logic
    return generateSynapse({
        question: userQuestion,
        projectUri: projectUri,
        file: currentFile,
        context: context.context,
        payloads: defaultPayloads ? JSON.stringify(defaultPayloads, null, 2) : undefined,
        connectors: selectedConnectors,
        inbound_endpoints: selectedInboundEndpoints,
        files: files.length > 0 ? files : undefined,
        images: images.length > 0 ? images : undefined,
        thinking_enabled: thinking || false,
        chatHistory: historyMessages.length > 0 ? historyMessages : undefined,
        abortController: controller, // Pass abort controller to handle cancellation
    });
}

/**
 * Analyzes diagnostics and gets fixed configurations using local LLM
 */
export async function getDiagnosticsReponseFromLlm(
    diagnostics: any,
    xmlCodes: any,
    projectUri: string,
    controller: AbortController
): Promise<Response> {
    try {
        console.log("Analyzing diagnostics and fixing configurations...");
        
        // Call the local codeDiagnostics function
        const result = await codeDiagnostics({
            diagnostics: diagnostics.diagnostics,
            xmlCodes: xmlCodes,
        });
        
        console.log(`Fixed ${result.fixed_config.length} configurations`);
        
        // Return a Response object with the fixed configurations
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error("Error fixing diagnostics:", error);
        
        const errorMessage = error instanceof Error 
            ? error.message 
            : "Unknown error occurred when fixing diagnostics";
        
        return new Response(JSON.stringify({
            status: "error",
            message: `Failed to fix diagnostics: ${errorMessage}`,
            fixed_config: []
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}

/**
 * Utility function to generate unique 8-digit numeric IDs
 */
export function generateId(): number {
    const min = 10000000; // Minimum 8-digit number
    const max = 99999999; // Maximum 8-digit number
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Utility function to replace code blocks in chat messages
 */
export function replaceCodeBlock(content: string, fileName: string, correctedCode: string): string {
    // Normalize the file name for consistent matching
    const normalizedFileName = fileName.endsWith('.xml') ? fileName : `${fileName}.xml`;
    const fileNameWithoutExt = normalizedFileName.replace('.xml', '');
    
    // Try to find code blocks in the content
    const codeBlockRegex = /```xml\s*([\s\S]*?)```/g;
    let match;
    let modifiedContent = content;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
        const xmlContent = match[1];
        
        // Check if this XML block contains the target API/artifact name
        const nameMatch = xmlContent.match(/name="([^"]+)"/);
        if (nameMatch && nameMatch[1] === fileNameWithoutExt) {
            // Found the right code block, replace it
            const originalBlock = match[0]; // The complete ```xml ... ``` block
            const newBlock = `\`\`\`xml\n${correctedCode}\n\`\`\``;
            
            return modifiedContent.replace(originalBlock, newBlock);
        }
    }
    
    // If no matching code block was found, append the corrected code
    return modifiedContent + `\n\n**Updated ${normalizedFileName}**\n\`\`\`xml\n${correctedCode}\n\`\`\``;
}
