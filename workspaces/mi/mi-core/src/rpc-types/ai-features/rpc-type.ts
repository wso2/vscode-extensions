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

import { RequestType, NotificationType } from "vscode-messenger-common";
import {
    GenerateSuggestionsRequest, GenerateSuggestionsResponse,
    GenerateCodeRequest, GenerateCodeResponse,
    AbortCodeGenerationResponse,
    CodeGenerationEvent,
    GenerateUnitTestRequest, GenerateUnitTestResponse,
    GenerateUnitTestCaseRequest, GenerateUnitTestCaseResponse,
    ProcessIdpRequest, ProcessIdpResponse,
    FillIdpSchemaRequest, FillIdpSchemaResponse,
    DmcToTsRequest, DmcToTsResponse,
    AutoFillFormRequest, AutoFillFormResponse
} from "./types";

const _prefix = "mi-ai-panel";

export const generateSuggestions: RequestType<GenerateSuggestionsRequest, GenerateSuggestionsResponse> = { method: `${_prefix}/generateSuggestions` };
export const generateCode: RequestType<GenerateCodeRequest, GenerateCodeResponse> = { method: `${_prefix}/generateCode` };
export const abortCodeGeneration: RequestType<void, AbortCodeGenerationResponse> = { method: `${_prefix}/abortCodeGeneration` };
export const hasAnthropicApiKey: RequestType<void, boolean | undefined> = { method: `${_prefix}/hasAnthropicApiKey` };
export const fetchUsage: RequestType<void, {
    remainingUsagePercentage?: number;
    resetsIn?: number;
} | undefined> = { method: `${_prefix}/fetchUsage` };

// Unit test generation methods
export const generateUnitTest: RequestType<GenerateUnitTestRequest, GenerateUnitTestResponse> = { method: `${_prefix}/generateUnitTest` };
export const generateUnitTestCase: RequestType<GenerateUnitTestCaseRequest, GenerateUnitTestCaseResponse> = { method: `${_prefix}/generateUnitTestCase` };

// IDP (Intelligent Document Processor) method
export const processIdp: RequestType<ProcessIdpRequest, ProcessIdpResponse> = { method: `${_prefix}/processIdp` };

// IDP schema filling method
export const fillIdpSchema: RequestType<FillIdpSchemaRequest, FillIdpSchemaResponse> = { method: `${_prefix}/fillIdpSchema` };

// DMC to TypeScript conversion method
export const dmcToTs: RequestType<DmcToTsRequest, DmcToTsResponse> = { method: `${_prefix}/dmcToTs` };

// Auto-fill form method
export const autoFillForm: RequestType<AutoFillFormRequest, AutoFillFormResponse> = { method: `${_prefix}/autoFillForm` };

// Notification for streaming events
export const codeGenerationEvent: NotificationType<CodeGenerationEvent> = { method: `${_prefix}/codeGenerationEvent` };
