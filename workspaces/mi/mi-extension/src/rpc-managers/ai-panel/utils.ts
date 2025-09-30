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
import { refreshAuthCode } from "../../ai-panel/auth";
import { openSignInView } from "../../util/ai-datamapper-utils";
import { extension } from "../../MIExtensionContext";
import { EVENT_TYPE, MACHINE_VIEW } from "@wso2/mi-core";
import * as vscode from "vscode";

// Backend URL constants
export const MI_ARTIFACT_GENERATION_BACKEND_URL = `/chat/artifact-generation`;
export const MI_ARTIFACT_EDIT_BACKEND_URL = `/chat/artifact-editing`;
export const MI_SUGGESTIVE_QUESTIONS_BACKEND_URL = `/suggestions`;
export const MI_DIAGNOSTICS_RESPONSE_BACKEND_URL = `/synapse/bug-fix`;

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
 * Fetches the backend URL for the given project
 */
export async function fetchBackendUrl(projectUri: string): Promise<string> {
    try {
        const miDiagramRpcManager = new MiDiagramRpcManager(projectUri);
        const { url } = await miDiagramRpcManager.getBackendRootUrl();
        return url;
    } catch (error) {
        console.error('Failed to fetch backend URL:', error);
        throw error;
    }
}

/**
 * Gets the user access token from extension secrets
 */
export async function getUserAccessToken(): Promise<string> {
    const token = await extension.context.secrets.get('MIAIUser');
    if (!token) {
        throw new Error('User access token not available');
    }
    return token;
}

/**
 * Gets the Anthropic API key from extension secrets
 */
export async function getAnthropicApiKey(): Promise<string | undefined> {
    return await extension.context.secrets.get('AnthropicApiKey');
}

/**
 * Refreshes the user access token
 */
export async function refreshUserAccessToken(): Promise<string> {
    const newToken = await refreshAuthCode();
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
            // Trigger the API key input dialog
            const miDiagramRpcManager = new MiDiagramRpcManager(projectUri);
            miDiagramRpcManager.setAnthropicApiKey();
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
 * Main function to fetch data from backend with retry logic
 */
export async function fetchWithRetry(
    type: BackendRequestType,
    url: string,
    body: any,
    projectUri: string,
    controller: AbortController,
    thinking?: boolean
): Promise<Response> {
    let retryCount = 0;
    const maxRetries = 2;
    let token = await getUserAccessToken();
    const anthropicApiKey = await getAnthropicApiKey();

    const bodyWithThinking = {
        ...body,
        thinking: thinking || false
    };

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    // Add Anthropic API key header if available
    if (anthropicApiKey) {
        headers["X-ANTHROPIC-KEY"] = anthropicApiKey;
    }

    let response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(bodyWithThinking),
        signal: controller.signal,
    });

    // Handle 401 - Unauthorized (token expired)
    if (response.status === 401) {
        try {
            token = await refreshUserAccessToken();
            
            // Update headers with new token
            headers.Authorization = `Bearer ${token}`;
            
            response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(bodyWithThinking),
                signal: controller.signal,
            });
        } catch (error) {
            console.error('Failed to refresh token:', error);
            showSignedOutNotification(projectUri);
            throw new Error("Authentication failed");
        }
    } 
    // Handle 429 - Quota Exceeded (must be checked before 404)
    else if (response.status === 429) {
        // Quota exceeded - show notification to user
        showQuotaExceededNotification(projectUri);
        let error = "Free usage quota exceeded. Please set your own Anthropic API key to continue.";
        try {
            const responseBody = await response.json();
            if (responseBody.detail) {
                error += ` ${responseBody.detail}`;
            }
        } catch (e) {
            // Ignore JSON parsing error
        }
        throw new Error(error);
    }
    // Handle 404 - Not Found (retry with exponential backoff)
    else if (response.status === 404) {
        if (retryCount < maxRetries) {
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay));
            return fetchWithRetry(type, url, body, projectUri, controller, thinking);
        } else {
            openUpdateExtensionView(projectUri);
            throw new Error("Resource not found : Check backend URL");
        }
    } 
    // Handle other error responses
    else if (!response.ok) {
        const statusText = getStatusText(response.status);
        let error = `Failed to fetch response. Status: ${statusText}`;

        if (response.status === 422) {
            error = getStatusText(422);
        }

        switch (type) {
            case BackendRequestType.Suggestions:
                openUpdateExtensionView(projectUri);
                throw new Error("Failed to fetch initial questions");
            case BackendRequestType.UserPrompt:
                throw new Error(`Failed to fetch code generations: ${error}`);
            default:
                throw new Error(error);
        }
    }

    return response;
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
 * Gets backend URL and view type based on current view
 */
export async function getBackendUrlAndView(projectUri: string, view?: string): Promise<{ backendUrl: string; view: string }> {
    // This would need to be adapted based on how you determine the current view in the extension
    // For now, defaulting to artifact editing view
    const currentView = view || "Artifact";
    
    switch (currentView) {
        case "Overview":
        case "ADD_ARTIFACT":
            return { backendUrl: MI_ARTIFACT_GENERATION_BACKEND_URL, view: "Overview" };
        default:
            return { backendUrl: MI_ARTIFACT_EDIT_BACKEND_URL, view: "Artifact" };
    }
}

/**
 * Generates suggestions from the backend
 */
export async function generateSuggestions(
    projectUri: string,
    chatHistory: any[],
    controller: AbortController
): Promise<any[]> {
    try {
        const backendRootUri = await fetchBackendUrl(projectUri);
        const url = backendRootUri + MI_SUGGESTIVE_QUESTIONS_BACKEND_URL;
        const context = await getWorkspaceContext(projectUri);
        
        const response = await fetchWithRetry(
            BackendRequestType.Suggestions,
            url,
            {
                messages: chatHistory,
                context: context.context,
                num_suggestions: 1,
                type: "artifact_gen",
            },
            projectUri,
            controller
        );

        const data = (await response.json()) as ApiResponse;

        if (data.event === "suggestion_generation_success") {
            return data.questions.map((question) => ({
                id: generateId(),
                role: "default",
                content: question,
                type: "Question",
            }));
        } else {
            console.error("Error generating suggestions:", data.error);
            throw new Error("Failed to generate suggestions: " + data.error);
        }
    } catch (error) {
        console.error(error);
        return [];
    }
}

/**
 * Fetches code generations from backend
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
    const context = await getWorkspaceContext(projectUri, selective);
    const miDiagramRpcManager = new MiDiagramRpcManager(projectUri);
    const defaultPayloads = await miDiagramRpcManager.getAllInputDefaultPayloads();
    
    return fetchWithRetry(BackendRequestType.UserPrompt, url, {
        messages: chatHistory,
        context: context.context,
        files: files,
        images: images.map((image: any) => image.imageBase64),
        payloads: defaultPayloads,
    }, projectUri, controller, thinking);
}

/**
 * Sends diagnostics to LLM backend and gets response
 */
export async function getDiagnosticsReponseFromLlm(
    diagnostics: any,
    xmlCodes: any,
    projectUri: string,
    controller: AbortController
): Promise<Response> {
    try {
        const backendRootUri = await fetchBackendUrl(projectUri);
        const url = backendRootUri + MI_DIAGNOSTICS_RESPONSE_BACKEND_URL;
        const context = await getWorkspaceContext(projectUri);
        
        const requestBody = {
            diagnostics: diagnostics.diagnostics,
            xmlCodes: xmlCodes,
            context: context.context
        };
        
        return fetchWithRetry(
            BackendRequestType.UserPrompt,
            url,
            requestBody,
            projectUri,
            controller,
            false // Not in thinking mode for diagnostics
        );
    } catch (error) {
        console.error("Error sending diagnostics to LLM:", error);
        
        const errorMessage = error instanceof Error 
            ? error.message 
            : "Unknown error occurred when analyzing diagnostics";
        
        return Promise.reject({
            status: "error",
            message: `Failed to analyze diagnostics: ${errorMessage}`,
            originalError: error
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
