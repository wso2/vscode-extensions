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

import {
    GetBackendRootUrlResponse,
    GenerateSuggestionsRequest,
    GenerateSuggestionsResponse,
    GenerateCodeRequest,
    GenerateCodeResponse,
    MIAIPanelAPI,
    CopilotChatEntry
} from '@wso2/mi-core';
import {RUNTIME_VERSION_440} from "../../constants";
import {compareVersions, getMIVersionFromPom} from "../../util/onboardingUtils";
import {
    generateSuggestions as generateSuggestionsUtil,
    fetchBackendUrl,
    MI_SUGGESTIVE_QUESTIONS_BACKEND_URL,
    fetchCodeGenerationsWithRetry,
    getDiagnosticsReponseFromLlm,
    getBackendUrlAndView,
    getUserAccessToken,
    refreshUserAccessToken
} from "./utils";
import { CopilotEventHandler } from "./event-handler";

export class MIAIPanelRpcManager implements MIAIPanelAPI {
    private eventHandler: CopilotEventHandler;

    constructor(private projectUri: string) {
        this.eventHandler = this.createEventHandler();
     }

    async getBackendRootUrl(): Promise<GetBackendRootUrlResponse> {
        const MI_COPILOT_BACKEND_V2 = process.env.MI_COPILOT_BACKEND_V2 as string;
        const MI_COPILOT_BACKEND_V3 = process.env.MI_COPILOT_BACKEND_V3 as string;
        const RUNTIME_THRESHOLD_VERSION = RUNTIME_VERSION_440;
        const runtimeVersion = await getMIVersionFromPom(this.projectUri);

        const isVersionThresholdReached = runtimeVersion ? compareVersions(runtimeVersion, RUNTIME_THRESHOLD_VERSION) : -1;

        return isVersionThresholdReached < 0 ? { url: MI_COPILOT_BACKEND_V2 } : { url: MI_COPILOT_BACKEND_V3 };
    }

    async generateSuggestions(request: GenerateSuggestionsRequest): Promise<GenerateSuggestionsResponse> {
        try {
            const controller = new AbortController();
            
            // Use the utility function to generate suggestions
            const suggestions = await generateSuggestionsUtil(
                this.projectUri,
                request.chatHistory,
                controller
            );

            // Convert the suggestions to the expected format
            return {
                response: suggestions.length > 0 ? suggestions[0].content : "",
                files: [], // This would need to be populated based on your specific requirements
                images: [] // This would need to be populated based on your specific requirements
            };
        } catch (error) {
            console.error('Error generating suggestions:', error);
            throw new Error(`Failed to generate suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Additional utility methods that can be used by the AI panel

    /**
     * Fetches code generations from the backend
     */
    async fetchCodeGenerations(
        chatHistory: CopilotChatEntry[],
        files: any[] = [],
        images: any[] = [],
        selective: boolean = false,
        thinking?: boolean
    ): Promise<Response> {
        try {
            const controller = new AbortController();
            const { backendUrl } = await getBackendUrlAndView(this.projectUri);
            const backendRootUri = await fetchBackendUrl(this.projectUri);
            const url = backendRootUri + backendUrl;

            return await fetchCodeGenerationsWithRetry(
                url,
                chatHistory,
                files,
                images,
                this.projectUri,
                controller,
                selective,
                thinking
            );
        } catch (error) {
            console.error('Error fetching code generations:', error);
            throw new Error(`Failed to fetch code generations: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Sends diagnostics to LLM and gets response
     */
    async analyzeDiagnostics(diagnostics: any, xmlCodes: any): Promise<Response> {
        try {
            const controller = new AbortController();
            return await getDiagnosticsReponseFromLlm(
                diagnostics,
                xmlCodes,
                this.projectUri,
                controller
            );
        } catch (error) {
            console.error('Error analyzing diagnostics:', error);
            throw new Error(`Failed to analyze diagnostics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Checks if user is authenticated
     */
    async isUserAuthenticated(): Promise<boolean> {
        try {
            await getUserAccessToken();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Refreshes user authentication token
     */
    async refreshAuthentication(): Promise<boolean> {
        try {
            await refreshUserAccessToken();
            return true;
        } catch (error) {
            console.error('Error refreshing authentication:', error);
            return false;
        }
    }

    /**
     * Generates code with streaming response
     */
    async generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
        try {
            await this.generateCodeCore(request);
            return { success: true };
        } catch (error) {
            console.error('Error during code generation:', error);
            this.eventHandler.handleError(error instanceof Error ? error.message : "Unknown error occurred during code generation");
            throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Core code generation logic with streaming
     */
    private async generateCodeCore(request: GenerateCodeRequest): Promise<void> {
        // TODO: Can make this global if needed instead of creating per request
        
        try {
            this.eventHandler.handleStart();

            // Get backend URL and construct the request URL
            const { backendUrl } = await getBackendUrlAndView(this.projectUri, request.view);
            const backendRootUri = await fetchBackendUrl(this.projectUri);
            const url = backendRootUri + backendUrl;

            // Make the request to backend
            const response = await fetchCodeGenerationsWithRetry(
                url,
                request.chatHistory,
                request.files,
                request.images,
                this.projectUri,
                new AbortController(), // TODO: Use proper abort controller
                request.view === "selective",
                request.thinking
            );

            if (!response.ok) {
                throw new Error(`Backend request failed with status ${response.status}`);
            }

            // Check if response has streaming data
            if (response.body) { 
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let assistantResponse = "";

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        assistantResponse += chunk;

                        console.log("chunk", chunk);
                        
                        // Send content block event
                        this.eventHandler.handleContentBlock(chunk);
                    }
                } finally {
                    reader.releaseLock();
                }

                // Send final response
                this.eventHandler.handleContentReplace(assistantResponse);
            } else {
                // Fallback: non-streaming response
                const text = await response.text();
                this.eventHandler.handleContentBlock(text);
                this.eventHandler.handleContentReplace(text);
            }

            this.eventHandler.handleStop("generateCode");

        } catch (error) {
            console.error("Error during code generation:", error);
            this.eventHandler.handleError(error instanceof Error ? error.message : "Unknown error occurred");
            throw error;
        }
    }

    /**
     * Creates an event handler that sends events to the visualizer
     */
    private createEventHandler(): CopilotEventHandler {
        return new CopilotEventHandler(this.projectUri);
    }
}
