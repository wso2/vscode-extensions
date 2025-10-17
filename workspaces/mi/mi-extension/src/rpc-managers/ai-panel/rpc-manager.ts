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
    AbortCodeGenerationResponse,
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
import { MiDiagramRpcManager } from "../mi-diagram/rpc-manager";

export class MIAIPanelRpcManager implements MIAIPanelAPI {
    private eventHandler: CopilotEventHandler;
    private currentController: AbortController | null = null;
    private miDiagramRpcManager: MiDiagramRpcManager;

    constructor(private projectUri: string) {
        this.eventHandler = this.createEventHandler();
        this.miDiagramRpcManager = new MiDiagramRpcManager(this.projectUri);
    }

    async getBackendRootUrl(): Promise<GetBackendRootUrlResponse> {
        const MI_COPILOT_BACKEND_V2 = process.env.MI_COPILOT_BACKEND_V2 as string;
        const MI_COPILOT_BACKEND_V3 = process.env.MI_COPILOT_BACKEND_V3 as string;
        const RUNTIME_THRESHOLD_VERSION = RUNTIME_VERSION_440;
        const runtimeVersion = await getMIVersionFromPom(this.projectUri);

        const versionThreshold = runtimeVersion ? compareVersions(runtimeVersion, RUNTIME_THRESHOLD_VERSION) : -1;

        return versionThreshold < 0 ? { url: MI_COPILOT_BACKEND_V2 } : { url: MI_COPILOT_BACKEND_V3 };
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
     * Aborts the current code generation
     */
    async abortCodeGeneration(): Promise<AbortCodeGenerationResponse> {
        try {
            if (this.currentController) {
                console.log('Aborting code generation...');
                this.currentController.abort();
                this.currentController = null;
                return { success: true };
            }
            console.log('No active code generation to abort');
            return { success: false };
        } catch (error) {
            console.error('Error aborting code generation:', error);
            return { success: false };
        }
    }

    /**
     * Core code generation logic with streaming
     */
    private async generateCodeCore(request: GenerateCodeRequest): Promise<void> {
        
        try {
            this.eventHandler.handleStart();

            // Create a new abort controller for this request
            this.currentController = new AbortController();

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
                this.currentController,
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
                    let buffer = "";
                    while (true) {
                        // Check if abort was requested
                        if (this.currentController?.signal.aborted) {
                            console.log('Code generation aborted by user');
                            reader.cancel();
                            break;
                        }

                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });

                        const lines = buffer.split("\n");
                        buffer = lines.pop() ?? "";

                        for (const line of lines) {
                            if (!line.trim()) continue;
                            try {
                                const obj = JSON.parse(line);
                                assistantResponse += obj.content;
                                this.eventHandler.handleContentBlock(line);
                            } catch (err) {
                                // If JSON parsing fails, it might be an incomplete object
                                // Add it back to the buffer to be processed with the next chunk
                                buffer = line + "\n" + buffer;
                            }
                        }
                    }
                    
                    // Process any remaining data in the buffer after the stream ends
                    if (buffer.trim()) {
                        try {
                            const obj = JSON.parse(buffer);
                            assistantResponse += obj.content;
                            this.eventHandler.handleContentBlock(buffer);
                        } catch (err) {
                            console.error("JSON parse error for remaining buffer:", err, "buffer:", buffer);
                        }
                    }
                } finally {
                    reader.releaseLock();
                }

                // Send final response
                this.eventHandler.handleEnd(assistantResponse);

                // Run code diagnostics on the generated response only for runtime versions > 4.4.0
                const runtimeVersion = await getMIVersionFromPom(this.projectUri);
                const shouldRunDiagnostics = runtimeVersion ? compareVersions(runtimeVersion, RUNTIME_VERSION_440) > 0 : false;
                
                if (shouldRunDiagnostics) {
                    await this.handleCodeDiagnostics(assistantResponse);
                }

            } else {
                // Fallback: non-streaming response
                const text = await response.text();
                this.eventHandler.handleContentBlock(text);
                this.eventHandler.handleEnd(text);
            }

            this.eventHandler.handleStop("generateCode");

        } catch (error) {
            // Check if error is due to abort
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Code generation aborted');
                this.eventHandler.handleStop("generateCode");
            } else {
                console.error("Error during code generation:", error);
                this.eventHandler.handleError(error instanceof Error ? error.message : "Unknown error occurred");
                throw error;
            }
        } finally {
            // Clean up the controller reference
            this.currentController = null;
        }
    }

    /**
     * Creates an event handler that sends events to the visualizer
     */
    private createEventHandler(): CopilotEventHandler {
        return new CopilotEventHandler(this.projectUri);
    }

    /**
     * Handles code diagnostics for the generated content
     */
    private async handleCodeDiagnostics(assistantResponse: string): Promise<void> {
        try {
            // Extract XML code blocks from the response
            const xmlCodes = this.extractXmlCodeBlocks(assistantResponse);
            
            if (xmlCodes.length === 0) {
                return; // No XML code blocks to process
            }

            // Start diagnostics process - send xmlCodes via content block
            this.eventHandler.handleCodeDiagnosticStart(xmlCodes);  

            // Get diagnostics using existing RPC infrastructure
            const { getStateMachine } = await import('../../stateMachine');
            const stateMachine = getStateMachine(this.projectUri);
            if (!stateMachine) {
                throw new Error('State machine not found for project');
            }

            const langClient = stateMachine.context().langClient;
            if (!langClient) {
                throw new Error('Language client not available');
            }

            // Track connectors that were added so we can remove them later
            let added_connectors: string[] = [];

            // Get diagnostics for each XML file
            let hasAnyDiagnostics = false;
            const diagnosticsResults: Array<{fileName: string, diagnostics: any[]}> = [];
            for (const xmlCode of xmlCodes) {
                // Check if the XML code contains a connector and add it temporarily
                const connectorMatch = xmlCode.code.match(/<(\w+\.\w+)\b/);
                if (connectorMatch) {
                    const tagParts = connectorMatch[1].split('.');
                    const connectorName = tagParts[0];
                    const add_response = await this.miDiagramRpcManager.fetchConnectors(connectorName, 'add');
                    if (add_response?.dependenciesResponse) {
                        added_connectors.push(connectorName);
                    }
                }

                // Get diagnostics from language client
                const res = await langClient.getCodeDiagnostics(xmlCode);
                diagnosticsResults.push({
                    fileName: xmlCode.fileName,
                    diagnostics: res.diagnostics
                });
                if (res.diagnostics.length > 0) {
                    hasAnyDiagnostics = true;
                }
            }

            // Remove temporarily added connectors
            if (added_connectors.length > 0) {
                for (const connector of added_connectors) {
                    await this.miDiagramRpcManager.fetchConnectors(connector, 'remove');
                }
            }

            if (hasAnyDiagnostics) {
                // Send diagnostics to LLM for corrections
                const llmResponse = await getDiagnosticsReponseFromLlm(
                    { diagnostics: diagnosticsResults },
                    xmlCodes,
                    this.projectUri,
                    new AbortController()
                );

                const llmResponseData = await llmResponse.json();

                // Process corrections
                if (llmResponseData.fixed_config && Array.isArray(llmResponseData.fixed_config)) {
                    const correctedCodes = llmResponseData.fixed_config
                        .filter((item: any) => item.name && (item.configuration || item.code))
                        .map((item: any) => ({
                            name: item.name,
                            configuration: item.configuration,
                            code: item.code
                        }));

                    // End diagnostics with corrections
                    this.eventHandler.handleCodeDiagnosticEnd(correctedCodes);
                } else {
                    // End diagnostics without corrections
                    this.eventHandler.handleCodeDiagnosticEnd();
                }
            } else {
                // No diagnostics found, end process
                this.eventHandler.handleCodeDiagnosticEnd();
            }
        } catch (error) {
            console.error('Error during code diagnostics:', error);
            // End diagnostics on error
            this.eventHandler.handleCodeDiagnosticEnd();
        }
    }

    /**
     * Extracts XML code blocks from assistant response
     */
    private extractXmlCodeBlocks(content: string): Array<{fileName: string, code: string}> {
        const codeBlockRegex = /```([\w#+]*)\s*\n([\s\S]*?)```/g;
        const xmlCodes: Array<{fileName: string, code: string}> = [];
        let match;

        while ((match = codeBlockRegex.exec(content)) !== null) {
            const language = match[1].trim().toLowerCase();
            const code = match[2];

            // Check if this is XML code
            if (language === 'xml') {
                const nameMatch = code.match(/name=["']([^"']+)["']/);
                const fileName = nameMatch ? `${nameMatch[1]}.xml` : `code_${xmlCodes.length}.xml`;
                
                xmlCodes.push({
                    fileName,
                    code
                });
            }
        }

        return xmlCodes;
    }

    /**
     * Sets the Anthropic API key for unlimited usage
     */
    async setAnthropicApiKey(): Promise<void> {
        const vscode = await import('vscode');
        const { extension } = await import('../../MIExtensionContext');

        const apiKey = await vscode.window.showInputBox({
            prompt: "Enter your Anthropic API Key for Unlimited Usage",
            password: true,
            placeHolder: "sk-ant-...",
            validateInput: (value) => {
                if (!value || value.trim() === "") {
                    return "API key cannot be empty";
                }
                if (!value.startsWith("sk-ant-")) {
                    return "Invalid Anthropic API key format. Should start with 'sk-ant-'";
                }
                return null;
            }
        });

        if (apiKey) {
            await extension.context.secrets.store('AnthropicApiKey', apiKey);
            vscode.window.showInformationMessage("Anthropic API key has been saved successfully");
        }
    }

    /**
     * Gets the stored Anthropic API key
     */
    async hasAnthropicApiKey(): Promise<boolean | undefined> {
        const { extension } = await import('../../MIExtensionContext');
        return await extension.context.secrets.get('AnthropicApiKey') !== undefined;
    }
}
