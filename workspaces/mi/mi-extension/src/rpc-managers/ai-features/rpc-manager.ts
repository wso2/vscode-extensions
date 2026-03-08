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
    FillIdpSchemaRequest,
    FillIdpSchemaResponse,
    DmcToTsRequest,
    DmcToTsResponse,
    AutoFillFormRequest,
    AutoFillFormResponse
} from '@wso2/mi-core';
import {RUNTIME_VERSION_440} from "../../constants";
import {compareVersions, getMIVersionFromPom} from "../../util/onboardingUtils";
import {
    fetchCodeGenerationsWithRetry,
    getUserAccessToken,
    refreshUserAccessToken,
    getWorkspaceContext
} from "./utils";
import { CopilotEventHandler } from "./event-handler";
import { MiDiagramRpcManager } from "../mi-diagram/rpc-manager";
import { generateSuggestions as generateSuggestionsFromLLM } from "../../ai-features/copilot/suggestions/suggestions";
import { fillIdpSchema } from '../../ai-features/copilot/idp/fill_schema';
import { codeDiagnostics } from "../../ai-features/copilot/diagnostics/diagnostics";
import { getCopilotLlmApiBaseUrl, getLoginMethod } from '../../ai-features/auth';
import { LoginMethod } from '@wso2/mi-core';
import { logInfo, logWarn, logError, logDebug } from '../../ai-features/copilot/logger';
import { MILanguageClient } from '../../lang-client/activator';

export class MIAIPanelRpcManager implements MIAIPanelAPI {
    private eventHandler: CopilotEventHandler;
    private currentController: AbortController | null = null;
    private miDiagramRpcManager: MiDiagramRpcManager;

    constructor(private projectUri: string) {
        this.eventHandler = this.createEventHandler();
        this.miDiagramRpcManager = new MiDiagramRpcManager(this.projectUri);
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
                logDebug(`[generateSuggestions] Using entry point: ${folder}/${files[0]}`);
                return [content];
            }
        }

        logDebug('[generateSuggestions] No entry points found, using empty context');
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
                logDebug(`[generateSuggestions] Using currently editing file: ${currentFile}`);
                return content;
            } catch (error) {
                logWarn(`[generateSuggestions] Could not read current file: ${currentFile}`);
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
                logDebug('[generateSuggestions] Empty chat history');
                const currentFile = await this.getCurrentlyEditingFile();
                if (currentFile) {
                    context = [currentFile];
                } else {
                    context = await this.getEntryPointContext();
                }
            } else if (lastMessage?.role === 'assistant') {
                // Case 2: Last message from AI (user hasn't interrupted) - Use chat history only
                logDebug('[generateSuggestions] Following AI response, using chat history only');
                context = []; // Chat history contains enough context
            } else {
                // Case 3: Last message from user (user interrupted/new topic) - Use currently editing file OR entry point
                logDebug('[generateSuggestions] User interrupted or new topic');
                const currentFile = await this.getCurrentlyEditingFile();
                if (currentFile) {
                    context = [currentFile];
                } else {
                    context = await this.getEntryPointContext();
                }
            }

            logDebug(`[generateSuggestions] Context size: ${context.length} files, Chat history: ${chatHistory.length} messages`);

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
            logError('Error generating suggestions', error);
            throw new Error(`Failed to generate suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Sends diagnostics to LLM and gets response (migrated to local LLM)
     */
    async analyzeDiagnostics(diagnostics: any, xmlCodes: any): Promise<Response> {
        try {
            // Use the migrated codeDiagnostics function
            const result = await codeDiagnostics({
                diagnostics: diagnostics.diagnostics,
                xmlCodes: xmlCodes
            });

            // Return a mock Response object to match the expected interface
            return new Response(JSON.stringify(result), {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            logError('Error analyzing diagnostics', error);
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
            logError('Error refreshing authentication', error);
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
            logError('Error during code generation', error);
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
                logInfo('Aborting code generation...');
                this.currentController.abort();
                // Send explicit abort acknowledgment to UI
                this.eventHandler.handleAborted();
                this.currentController = null;
                return { success: true };
            }
            logDebug('No active code generation to abort');
            return { success: false };
        } catch (error) {
            logError('Error aborting code generation', error);
            return { success: false };
        }
    }

    /**
     * Core code generation logic with streaming
     */
    private async generateCodeCore(request: GenerateCodeRequest): Promise<void> {
        const { validateAttachments } = await import('../../ai-features/copilot/message-utils');
        const { window } = await import('vscode');

        try {
            // Validate attachments before proceeding
            const validationWarnings = validateAttachments(request.files, request.images);
            if (validationWarnings.length > 0) {
                const errorMessage = `Cannot proceed with code generation. Invalid attachments:\n${validationWarnings.map(w => `  • ${w}`).join('\n')}`;
                logError(errorMessage);
                window.showErrorMessage(
                    `Invalid attachments detected. Please check:\n${validationWarnings.join('\n')}`
                );
                this.eventHandler.handleError(errorMessage);
                throw new Error(errorMessage);
            }

            this.eventHandler.handleStart();

            // Create a new abort controller for this request
            this.currentController = new AbortController();

            // Generate code using local LLM (no backend URL needed)
            const response = await fetchCodeGenerationsWithRetry(
                "", // url parameter is unused in the migrated function
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
                            logInfo('Code generation aborted by user');
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
                    logError("Error reading code generation stream", error);
                }

                // Determine if diagnostics will run before sending the end event
                const runtimeVersion = await getMIVersionFromPom(this.projectUri);
                const shouldRunDiagnostics = runtimeVersion ? compareVersions(runtimeVersion, RUNTIME_VERSION_440) > 0 : false;
                const willRunDiagnostics = shouldRunDiagnostics && !this.currentController?.signal.aborted;

                // Send final response with diagnostics flag
                this.eventHandler.handleEnd(assistantResponse, willRunDiagnostics);

                // Run code diagnostics if needed
                if (willRunDiagnostics) {
                    await this.handleCodeDiagnostics(assistantResponse);
                }

            } else {
                // Fallback: non-streaming response
                const text = await response.text();
                this.eventHandler.handleContentBlock(text);
                // Non-streaming responses don't run diagnostics
                this.eventHandler.handleEnd(text, false);
            }

            this.eventHandler.handleStop("generateCode");

        } catch (error) {
            // Check if error is due to abort
            if (error instanceof Error && error.name === 'AbortError') {
                logInfo('Code generation aborted');
                this.eventHandler.handleStop("generateCode");
            } else {
                logError("Error during code generation", error);
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
            const langClient = await MILanguageClient.getInstance(this.projectUri);
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
                // Send diagnostics to LLM for corrections (using migrated function)
                const llmResponseData = await codeDiagnostics({
                    diagnostics: diagnosticsResults,
                    xmlCodes: xmlCodes
                });

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
            logError('Error during code diagnostics', error);
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
     * Check if user is using their own Anthropic API key or AWS Bedrock credentials
     */
    async hasAnthropicApiKey(): Promise<boolean | undefined> {
        const loginMethod = await getLoginMethod();
        return loginMethod === LoginMethod.ANTHROPIC_KEY || loginMethod === LoginMethod.AWS_BEDROCK;
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
            const { fetchWithAuth } = await import('../../ai-features/connection');
            const { StateMachineAI } = await import('../../ai-features/aiMachine');
            const { AI_EVENT_TYPE } = await import('@wso2/mi-core');

            const backendUrl = getCopilotLlmApiBaseUrl();
            if (!backendUrl) {
                logWarn('Copilot LLM API URL is not configured; skipping usage fetch.');
                return undefined;
            }

            const USER_CHECK_BACKEND_URL = '/usage';
            const response = await fetchWithAuth(`${backendUrl}${USER_CHECK_BACKEND_URL}`);
            if (response.ok) {
                const usageResponse = await response.json();
                const remainingUsagePercentage = typeof usageResponse?.remainingUsagePercentage === 'number'
                    ? usageResponse.remainingUsagePercentage
                    : undefined;
                const resetsIn = typeof usageResponse?.resetsIn === 'number'
                    ? usageResponse.resetsIn
                    : undefined;
                if (remainingUsagePercentage === undefined) {
                    logWarn('Usage response missing remainingUsagePercentage; skipping usage update.');
                    return undefined;
                }
                const usage = { remainingUsagePercentage, resetsIn };

                // Get current state before updating
                const currentState = StateMachineAI.state();

                // Update usage via state machine event (proper XState pattern)
                if (currentState === 'Authenticated' || currentState === 'UsageExceeded') {
                    StateMachineAI.sendEvent({ type: AI_EVENT_TYPE.UPDATE_USAGE, payload: { usage } });
                }

                // Check if quota is exceeded and transition to UsageExceeded state
                const isUsageExceeded = usage.remainingUsagePercentage <= 0;

                if (isUsageExceeded && currentState === 'Authenticated') {
                    logInfo('Quota exceeded. Transitioning to UsageExceeded state.');
                    StateMachineAI.sendEvent(AI_EVENT_TYPE.USAGE_EXCEEDED);
                }

                // Check if we're in UsageExceeded state and if usage has reset
                const isUsageReset = usage.remainingUsagePercentage > 0;

                if (currentState === 'UsageExceeded' && isUsageReset) {
                    logInfo('Usage has reset. Transitioning back to Authenticated state.');
                    StateMachineAI.sendEvent(AI_EVENT_TYPE.USAGE_RESET);
                }

                return usage;
            }
        } catch (error) {
            logError('Failed to fetch usage', error);
        }

        return undefined;
    }

    /**
     * Generates a complete unit test suite for WSO2 Synapse artifacts
     */
    async generateUnitTest(request: import('@wso2/mi-core').GenerateUnitTestRequest): Promise<import('@wso2/mi-core').GenerateUnitTestResponse> {
        try {
            const { generateUnitTest } = await import('../../ai-features/copilot/unit-tests/unit_test_generate');

            const result = await generateUnitTest({
                context: request.context,
                testFileName: request.testFileName,
                fullContext: request.fullContext,
                pomFile: request.pomFile,
                externalConnectors: request.externalConnectors
            });

            return result;
        } catch (error) {
            logError('Error generating unit test', error);
            throw new Error(`Failed to generate unit test: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Adds a new test case to an existing unit test suite
     */
    async generateUnitTestCase(request: import('@wso2/mi-core').GenerateUnitTestCaseRequest): Promise<import('@wso2/mi-core').GenerateUnitTestCaseResponse> {
        try {
            const { generateUnitTestCase } = await import('../../ai-features/copilot/unit-tests/unit_test_case_generate');

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
            logError('Error generating unit test case', error);
            throw new Error(`Failed to generate unit test case: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Processes IDP (Intelligent Document Processor) request
     */
    async processIdp(request: ProcessIdpRequest): Promise<ProcessIdpResponse> {
        try {
            const { processIdp } = await import('../../ai-features/copilot/idp/idp');

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
     * Fills an IDP schema with data extracted from images
     */
    async fillIdpSchema(request: FillIdpSchemaRequest): Promise<FillIdpSchemaResponse> {
        try {
            logDebug('[fillIdpSchema] Starting schema filling');
            logDebug(`[fillIdpSchema] Images count: ${request.images?.length || 0}`);

            const result = await fillIdpSchema({
                jsonSchema: request.jsonSchema,
                images: request.images
            });

            logDebug('[fillIdpSchema] Schema filling completed successfully');
            return result;
        } catch (error) {
            logError('[fillIdpSchema] Error filling schema', error);
            throw new Error(`Failed to fill IDP schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Converts DMC (Data Mapping Configuration) to TypeScript implementation
     */
    async dmcToTs(request: DmcToTsRequest): Promise<DmcToTsResponse> {
        try {
            logDebug('[dmcToTs] Starting DMC to TypeScript conversion');
            logDebug(`[dmcToTs] DMC content length: ${request.dmcContent?.length || 0}`);
            logDebug(`[dmcToTs] TS file length: ${request.tsFile?.length || 0}`);

            const { dmcToTs } = await import('../../ai-features/copilot/dmc_to_ts/dmc_to_ts');

            const result = await dmcToTs({
                dmcContent: request.dmcContent,
                tsFile: request.tsFile
            });

            logDebug('[dmcToTs] Conversion completed successfully');
            return result;
        } catch (error) {
            logError('[dmcToTs] Error converting DMC to TS', error);
            throw new Error(`Failed to convert DMC to TypeScript: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Auto-fills form fields using AI based on context and user input
     */
    async autoFillForm(request: AutoFillFormRequest): Promise<AutoFillFormResponse> {
        try {
            logDebug('[autoFillForm] Starting form auto-fill');
            logDebug(`[autoFillForm] Form fields count: ${Object.keys(request.current_values || {}).length}`);
            logDebug(`[autoFillForm] Has user question: ${!!request.question}`);

            const { autoFillForm } = await import('../../ai-features/copilot/auto-fill/fill');

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

            logDebug('[autoFillForm] Form auto-fill completed successfully');
            return result;
        } catch (error) {
            logError('[autoFillForm] Error auto-filling form', error);
            throw new Error(`Failed to auto-fill form: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
