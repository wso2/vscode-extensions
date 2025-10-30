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
    CopilotChatEntry,
    ProcessIdpRequest,
    ProcessIdpResponse,
    DmcToTsRequest,
    DmcToTsResponse,
    AutoFillFormRequest,
    AutoFillFormResponse
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
    refreshUserAccessToken,
    getWorkspaceContext
} from "./utils";
import { CopilotEventHandler } from "./event-handler";
import { MiDiagramRpcManager } from "../mi-diagram/rpc-manager";
import { generateSuggestions as generateSuggestionsFromLLM } from "../../ai-panel/copilot/suggestions/suggestions";
import { getLoginMethod } from '../../ai-panel/auth';
import { LoginMethod } from '@wso2/mi-core';

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

    /**
     * Gets a single entry point file (API, sequence, or inbound endpoint) for context
     * Priority: APIs → Sequences → Inbound Endpoints
     */
    private async getEntryPointContext(): Promise<string[]> {
        const artifactDirPath = require('path').join(this.projectUri, 'src', 'main', 'wso2mi', 'artifacts');
        const fs = require('fs');

        // Priority order: APIs → Sequences → Inbound Endpoints
        const entryPointFolders = ['apis', 'sequences', 'inbound-endpoints'];

        for (const folder of entryPointFolders) {
            const folderPath = require('path').join(artifactDirPath, folder);
            if (!fs.existsSync(folderPath)) {
                continue;
            }

            const files = fs.readdirSync(folderPath).filter((file: string) => file.toLowerCase().endsWith('.xml'));
            if (files.length > 0) {
                const firstFile = require('path').join(folderPath, files[0]);
                const content = fs.readFileSync(firstFile, 'utf-8');
                console.log(`[generateSuggestions] Using entry point: ${folder}/${files[0]}`);
                return [content];
            }
        }

        console.log('[generateSuggestions] No entry points found, using empty context');
        return [];
    }

    /**
     * Gets the currently open file content if it's an XML file
     */
    private async getCurrentlyEditingFile(): Promise<string | null> {
        const { getStateMachine } = await import('../../stateMachine');
        const fs = require('fs');

        const currentFile = getStateMachine(this.projectUri).context().documentUri;
        if (currentFile && fs.existsSync(currentFile) && currentFile.toLowerCase().endsWith('.xml')) {
            try {
                const content = fs.readFileSync(currentFile, 'utf-8');
                console.log(`[generateSuggestions] Using currently editing file: ${currentFile}`);
                return content;
            } catch (error) {
                console.warn(`[generateSuggestions] Could not read current file: ${currentFile}`, error);
            }
        }
        return null;
    }

    async generateSuggestions(request: GenerateSuggestionsRequest): Promise<GenerateSuggestionsResponse> {
        try {
            let context: string[] = [];
            const chatHistory = request.chatHistory || [];
            const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;

            // Decision tree for context selection:
            if (chatHistory.length === 0) {
                // Case 1: Empty chat - Use currently editing file OR entry point
                console.log('[generateSuggestions] Empty chat history');
                const currentFile = await this.getCurrentlyEditingFile();
                if (currentFile) {
                    context = [currentFile];
                } else {
                    context = await this.getEntryPointContext();
                }
            } else if (lastMessage?.role === 'assistant') {
                // Case 2: Last message from AI (user hasn't interrupted) - Use chat history only
                console.log('[generateSuggestions] Following AI response, using chat history only');
                context = []; // Chat history contains enough context
            } else {
                // Case 3: Last message from user (user interrupted/new topic) - Use currently editing file OR entry point
                console.log('[generateSuggestions] User interrupted or new topic');
                const currentFile = await this.getCurrentlyEditingFile();
                if (currentFile) {
                    context = [currentFile];
                } else {
                    context = await this.getEntryPointContext();
                }
            }

            console.log(`[generateSuggestions] Context size: ${context.length} files, Chat history: ${chatHistory.length} messages`);

            // Use the new LLM-based suggestion generation
            const suggestionText = await generateSuggestionsFromLLM(
                context,
                chatHistory
            );

            return {
                response: suggestionText,
                files: [],
                images: []
            };
        } catch (error) {
            console.error('Error generating suggestions:', error);
            throw new Error(`Failed to generate suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                    while (true) {
                        // Check if abort was requested
                        if (this.currentController?.signal.aborted) {
                            console.log('Code generation aborted by user');
                            reader.cancel();
                            break;
                        }

                        const { done, value } = await reader.read();
                        if (done) break;

                        // Decode the text chunk
                        const textChunk = decoder.decode(value, { stream: true });
                        this.eventHandler.handleContentBlock(textChunk);
                        assistantResponse += textChunk;
                    }
                } catch (error) {
                    console.error("Error reading code generation stream:", error);
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
     * Check if user is using their own Anthropic API key
     */
    async hasAnthropicApiKey(): Promise<boolean | undefined> {
        const loginMethod = await getLoginMethod();
        return loginMethod === LoginMethod.ANTHROPIC_KEY;
    }

    /**
     * Fetches usage information from backend and updates state machine
     * Only works for MI_INTEL users
     * Also checks if usage has reset and transitions back to Authenticated if in UsageExceeded state
     */
    async fetchUsage(): Promise<any> {
        const loginMethod = await getLoginMethod();

        // Only fetch for MI_INTEL users
        if (loginMethod !== LoginMethod.MI_INTEL) {
            return undefined;
        }

        try {
            const { fetchWithAuth } = await import('../../ai-panel/copilot/connection');
            const { StateMachineAI } = await import('../../ai-panel/aiMachine');
            const { AI_EVENT_TYPE } = await import('@wso2/mi-core');

            const backendUrl = process.env.MI_COPILOT_ANTHROPIC_PROXY_URL as string;
            const USER_CHECK_BACKEND_URL = '/usage';
            const response = await fetchWithAuth(backendUrl + USER_CHECK_BACKEND_URL);
            if (response.ok) {
                const usage = await response.json();

                // Update state machine context
                const context = StateMachineAI.context();
                const currentState = StateMachineAI.state();

                // Update context with usage data FIRST before any state transitions
                if (context && (currentState === 'Authenticated' || currentState === 'UsageExceeded')) {
                    Object.assign(context, { usage: usage });
                }

                // Check if quota is exceeded and transition to UsageExceeded state
                if (usage.remaining_tokens <= 0 && currentState === 'Authenticated') {
                    console.log('Quota exceeded. Transitioning to UsageExceeded state.');
                    StateMachineAI.sendEvent(AI_EVENT_TYPE.USAGE_EXCEEDED);
                }

                // Check if we're in UsageExceeded state and if usage has reset
                if (currentState === 'UsageExceeded' && usage.remaining_tokens > 0) {
                    console.log('Usage has reset. Transitioning back to Authenticated state.');
                    StateMachineAI.sendEvent(AI_EVENT_TYPE.USAGE_RESET);
                }

                return usage;
            }
        } catch (error) {
            console.error('Failed to fetch usage:', error);
        }

        return undefined;
    }

    /**
     * Generates a complete unit test suite for WSO2 Synapse artifacts
     */
    async generateUnitTest(request: import('@wso2/mi-core').GenerateUnitTestRequest): Promise<import('@wso2/mi-core').GenerateUnitTestResponse> {
        try {
            const { generateUnitTest } = await import('../../ai-panel/copilot/unit-tests/unit_test_generate');

            const result = await generateUnitTest({
                context: request.context,
                testFileName: request.testFileName,
                fullContext: request.fullContext,
                pomFile: request.pomFile,
                externalConnectors: request.externalConnectors
            });

            return result;
        } catch (error) {
            console.error('Error generating unit test:', error);
            throw new Error(`Failed to generate unit test: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Adds a new test case to an existing unit test suite
     */
    async generateUnitTestCase(request: import('@wso2/mi-core').GenerateUnitTestCaseRequest): Promise<import('@wso2/mi-core').GenerateUnitTestCaseResponse> {
        try {
            const { generateUnitTestCase } = await import('../../ai-panel/copilot/unit-tests/unit_test_case_generate');

            const result = await generateUnitTestCase({
                context: request.context,
                testFileName: request.testFileName,
                testSuiteFile: request.testSuiteFile,
                testCaseDescription: request.testCaseDescription,
                existingMockServices: request.existingMockServices,
                existingMockServiceNames: request.existingMockServiceNames,
                fullContext: request.fullContext,
                pomFile: request.pomFile,
                externalConnectors: request.externalConnectors
            });

            return result;
        } catch (error) {
            console.error('Error generating unit test case:', error);
            throw new Error(`Failed to generate unit test case: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Processes IDP (Intelligent Document Processor) request
     */
    async processIdp(request: ProcessIdpRequest): Promise<ProcessIdpResponse> {
        try {
            const { processIdp } = await import('../../ai-panel/copilot/idp/idp');

            const result = await processIdp({
                operation: request.operation,
                userInput: request.userInput,
                jsonSchema: request.jsonSchema,
                images: request.images
            });

            return result;
        } catch (error) {
            throw new Error(`Failed to process IDP: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Converts DMC (Data Mapping Configuration) to TypeScript implementation
     */
    async dmcToTs(request: DmcToTsRequest): Promise<DmcToTsResponse> {
        try {
            console.log('[dmcToTs] Starting DMC to TypeScript conversion');
            console.log('[dmcToTs] DMC content length:', request.dmcContent?.length || 0);
            console.log('[dmcToTs] TS file length:', request.tsFile?.length || 0);

            const { dmcToTs } = await import('../../ai-panel/copilot/dmc_to_ts/dmc_to_ts');

            const result = await dmcToTs({
                dmcContent: request.dmcContent,
                tsFile: request.tsFile
            });

            console.log('[dmcToTs] Conversion completed successfully');
            return result;
        } catch (error) {
            console.error('[dmcToTs] Error converting DMC to TS:', error);
            throw new Error(`Failed to convert DMC to TypeScript: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Auto-fills form fields using AI based on context and user input
     */
    async autoFillForm(request: AutoFillFormRequest): Promise<AutoFillFormResponse> {
        try {
            console.log('[autoFillForm] Starting form auto-fill');
            console.log('[autoFillForm] Form fields count:', Object.keys(request.current_values || {}).length);
            console.log('[autoFillForm] Has user question:', !!request.question);

            const { autoFillForm } = await import('../../ai-panel/copilot/auto-fill/fill');

            const result = await autoFillForm({
                payloads: request.payloads,
                variables: request.variables,
                params: request.params,
                properties: request.properties,
                headers: request.headers,
                configs: request.configs,
                connection_names: request.connection_names,
                form_details: request.form_details,
                current_values: request.current_values,
                field_descriptions: request.field_descriptions,
                question: request.question
            });

            console.log('[autoFillForm] Form auto-fill completed successfully');
            return result;
        } catch (error) {
            console.error('[autoFillForm] Error auto-filling form:', error);
            throw new Error(`Failed to auto-fill form: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
