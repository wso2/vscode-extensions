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
    MIAIPanelAPI,
    GenerateSuggestionsRequest,
    GenerateSuggestionsResponse,
    generateSuggestions,
    GenerateCodeRequest,
    GenerateCodeResponse,
    generateCode,
    AbortCodeGenerationResponse,
    abortCodeGeneration,
    hasAnthropicApiKey,
    fetchUsage,
    GenerateUnitTestRequest,
    GenerateUnitTestResponse,
    generateUnitTest,
    GenerateUnitTestCaseRequest,
    GenerateUnitTestCaseResponse,
    generateUnitTestCase,
    ProcessIdpRequest,
    ProcessIdpResponse,
    processIdp,
    FillIdpSchemaRequest,
    FillIdpSchemaResponse,
    fillIdpSchema,
    DmcToTsRequest,
    DmcToTsResponse,
    dmcToTs,
    AutoFillFormRequest,
    AutoFillFormResponse,
    autoFillForm
} from "@wso2/mi-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class MiAiPanelRpcClient implements MIAIPanelAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    // ==================================
    // AI Functions
    // ==================================
    generateSuggestions(request: GenerateSuggestionsRequest): Promise<GenerateSuggestionsResponse> {
        return this._messenger.sendRequest(generateSuggestions, HOST_EXTENSION, request);
    }

    generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
        return this._messenger.sendRequest(generateCode, HOST_EXTENSION, request);
    }

    abortCodeGeneration(): Promise<AbortCodeGenerationResponse> {
        return this._messenger.sendRequest(abortCodeGeneration, HOST_EXTENSION);
    }

    // ==================================
    // API Key Management
    // ==================================
    hasAnthropicApiKey(): Promise<boolean | undefined> {
        return this._messenger.sendRequest(hasAnthropicApiKey, HOST_EXTENSION);
    }

    // ==================================
    // Usage Management
    // ==================================
    fetchUsage(): Promise<{
        remainingUsagePercentage?: number;
        resetsIn?: number;
    } | undefined> {
        return this._messenger.sendRequest(fetchUsage, HOST_EXTENSION);
    }

    // ==================================
    // Unit Test Generation
    // ==================================
    generateUnitTest(request: GenerateUnitTestRequest): Promise<GenerateUnitTestResponse> {
        return this._messenger.sendRequest(generateUnitTest, HOST_EXTENSION, request);
    }

    generateUnitTestCase(request: GenerateUnitTestCaseRequest): Promise<GenerateUnitTestCaseResponse> {
        return this._messenger.sendRequest(generateUnitTestCase, HOST_EXTENSION, request);
    }

    // ==================================
    // IDP (Intelligent Document Processor)
    // ==================================
    processIdp(request: ProcessIdpRequest): Promise<ProcessIdpResponse> {
        return this._messenger.sendRequest(processIdp, HOST_EXTENSION, request);
    }

    fillIdpSchema(request: FillIdpSchemaRequest): Promise<FillIdpSchemaResponse> {
        return this._messenger.sendRequest(fillIdpSchema, HOST_EXTENSION, request);
    }

    // ==================================
    // DMC to TypeScript Conversion
    // ==================================
    dmcToTs(request: DmcToTsRequest): Promise<DmcToTsResponse> {
        return this._messenger.sendRequest(dmcToTs, HOST_EXTENSION, request);
    }

    // ==================================
    // Auto-Fill Form
    // ==================================
    autoFillForm(request: AutoFillFormRequest): Promise<AutoFillFormResponse> {
        return this._messenger.sendRequest(autoFillForm, HOST_EXTENSION, request);
    }
}
