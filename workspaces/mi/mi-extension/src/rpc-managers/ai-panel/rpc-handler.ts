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

import { MessengerAPI } from "vscode-messenger-common";
import { MIAIPanelRpcManager } from "./rpc-manager";
import {
    generateSuggestions,
    generateCode,
    abortCodeGeneration,
    GenerateSuggestionsRequest,
    GenerateCodeRequest,
    hasAnthropicApiKey,
    fetchUsage,
    generateUnitTest,
    generateUnitTestCase,
    GenerateUnitTestRequest,
    GenerateUnitTestCaseRequest,
    processIdp,
    ProcessIdpRequest,
    fillIdpSchema,
    FillIdpSchemaRequest,
    dmcToTs,
    DmcToTsRequest,
    autoFillForm,
    AutoFillFormRequest
} from "@wso2/mi-core";

export function registerMIAiPanelRpcHandlers(messenger: MessengerAPI, projectUri: string) {
    const rpcManager = new MIAIPanelRpcManager(projectUri);

    // ==================================
    // AI Functions
    // ==================================
    messenger.onRequest(generateSuggestions, (request: GenerateSuggestionsRequest) => rpcManager.generateSuggestions(request));
    messenger.onRequest(generateCode, (request: GenerateCodeRequest) => rpcManager.generateCode(request));
    messenger.onRequest(abortCodeGeneration, () => rpcManager.abortCodeGeneration());
    messenger.onRequest(hasAnthropicApiKey, () => rpcManager.hasAnthropicApiKey());
    messenger.onRequest(fetchUsage, () => rpcManager.fetchUsage());

    // ==================================
    // Unit Test Generation
    // ==================================
    messenger.onRequest(generateUnitTest, (request: GenerateUnitTestRequest) => rpcManager.generateUnitTest(request));
    messenger.onRequest(generateUnitTestCase, (request: GenerateUnitTestCaseRequest) => rpcManager.generateUnitTestCase(request));

    // ==================================
    // IDP (Intelligent Document Processor)
    // ==================================
    messenger.onRequest(processIdp, (request: ProcessIdpRequest) => rpcManager.processIdp(request));
    messenger.onRequest(fillIdpSchema, (request: FillIdpSchemaRequest) => rpcManager.fillIdpSchema(request));

    // ==================================
    // DMC to TypeScript Conversion
    // ==================================
    messenger.onRequest(dmcToTs, (request: DmcToTsRequest) => rpcManager.dmcToTs(request));

    // ==================================
    // Auto-Fill Form
    // ==================================
    messenger.onRequest(autoFillForm, (request: AutoFillFormRequest) => rpcManager.autoFillForm(request));
}
