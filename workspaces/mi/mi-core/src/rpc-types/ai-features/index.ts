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
    GenerateSuggestionsRequest, GenerateSuggestionsResponse,
    GenerateCodeRequest, GenerateCodeResponse,
    AbortCodeGenerationResponse,
    GenerateUnitTestRequest, GenerateUnitTestResponse,
    GenerateUnitTestCaseRequest, GenerateUnitTestCaseResponse,
    ProcessIdpRequest, ProcessIdpResponse,
    FillIdpSchemaRequest, FillIdpSchemaResponse,
    DmcToTsRequest, DmcToTsResponse,
    AutoFillFormRequest, AutoFillFormResponse
} from "./types";

// Export types for external use
export type {
    GenerateSuggestionsRequest,
    GenerateSuggestionsResponse,
    GenerateCodeRequest,
    GenerateCodeResponse,
    AbortCodeGenerationResponse,
    CodeGenerationEvent,
    XmlCodeEntry,
    CorrectedCodeItem,
    GenerateUnitTestRequest,
    GenerateUnitTestResponse,
    GenerateUnitTestCaseRequest,
    GenerateUnitTestCaseResponse,
    ProcessIdpRequest,
    ProcessIdpResponse,
    FillIdpSchemaRequest,
    FillIdpSchemaResponse,
    DmcToTsRequest,
    DmcToTsResponse,
    AutoFillFormRequest,
    AutoFillFormResponse
} from './types';

export interface MIAIPanelAPI {
    // ==================================
    // General Functions
    // ==================================
    generateSuggestions: (request: GenerateSuggestionsRequest) => Promise<GenerateSuggestionsResponse>
    generateCode: (request: GenerateCodeRequest) => Promise<GenerateCodeResponse>
    abortCodeGeneration: () => Promise<AbortCodeGenerationResponse>

    // ==================================
    // API Key Management
    // ==================================
    hasAnthropicApiKey: () => Promise<boolean | undefined>

    // ==================================
    // Usage Management
    // ==================================
    fetchUsage: () => Promise<{
        remainingUsagePercentage?: number;
        resetsIn?: number;
    } | undefined>

    // ==================================
    // Unit Test Generation
    // ==================================
    generateUnitTest: (request: GenerateUnitTestRequest) => Promise<GenerateUnitTestResponse>
    generateUnitTestCase: (request: GenerateUnitTestCaseRequest) => Promise<GenerateUnitTestCaseResponse>

    // ==================================
    // IDP (Intelligent Document Processor)
    // ==================================
    processIdp: (request: ProcessIdpRequest) => Promise<ProcessIdpResponse>
    fillIdpSchema: (request: FillIdpSchemaRequest) => Promise<FillIdpSchemaResponse>

    // ==================================
    // DMC to TypeScript Conversion
    // ==================================
    dmcToTs: (request: DmcToTsRequest) => Promise<DmcToTsResponse>

    // ==================================
    // Auto-Fill Form
    // ==================================
    autoFillForm: (request: AutoFillFormRequest) => Promise<AutoFillFormResponse>
}

// Export RPC type definitions
export {
    generateSuggestions,
    generateCode,
    abortCodeGeneration,
    codeGenerationEvent,
    hasAnthropicApiKey,
    fetchUsage,
    generateUnitTest,
    generateUnitTestCase,
    processIdp,
    fillIdpSchema,
    dmcToTs,
    autoFillForm
} from './rpc-type';
