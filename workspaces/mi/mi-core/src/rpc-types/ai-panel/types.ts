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

import { AI_MACHINE_VIEW } from "../../state-machine-types";
import { FileObject, ImageObject } from "../../interfaces/mi-copilot";
import { CopilotChatEntry } from "../../interfaces/mi-copilot";

export interface AIMachineSnapshot {
    state: AI_MACHINE_VIEW;
    context: unknown;
}

export interface GetBackendRootUrlResponse {
    url: string;
}

export interface GenerateSuggestionsRequest {
    chatHistory: CopilotChatEntry[];
}

export interface GenerateSuggestionsResponse {
    response: string;
    files: FileObject[];
    images: ImageObject[];
}

// Code generation streaming types
export interface GenerateCodeRequest {
    chatHistory: CopilotChatEntry[];
    files: FileObject[];
    images: ImageObject[];
    view?: string;
    thinking?: boolean;
}

export interface GenerateCodeResponse {
    success: boolean;
}

export interface AbortCodeGenerationResponse {
    success: boolean;
}

// Event types for streaming
export type CodeGenerationEventType =
    | "code_generation_start"
    | "content_block"
    | "code_generation_end"
    | "code_diagnostic_start"
    | "code_diagnostic_end"
    | "messages"
    | "error"
    | "stop"
    | "aborted";

export interface CodeGenerationEvent {
    type: CodeGenerationEventType;
    content?: string;
    diagnostics?: DiagnosticEntry[];
    messages?: unknown[];
    error?: string;
    command?: string;
    xmlCodes?: XmlCodeEntry[];
    correctedCodes?: CorrectedCodeItem[];
    willRunDiagnostics?: boolean;
}

// Diagnostics types
export interface DiagnosticEntry {
    message: string;
    severity: string;
    range?: unknown;
    source?: string;
}

// XML code entry for diagnostics
export interface XmlCodeEntry {
    fileName: string;
    code: string;
}

// Corrected code item from LLM response
export interface CorrectedCodeItem {
    name: string;
    configuration?: string;
    code?: string;
}

// Unit Test Generation Types
export interface GenerateUnitTestRequest {
    context: string[];
    testFileName: string;
    fullContext?: string[];
    pomFile?: string;
    externalConnectors?: string[];
}

export interface GenerateUnitTestResponse {
    response: string; // Markdown response containing unit test and mock services
}

// Unit Test Case Addition Types
export interface GenerateUnitTestCaseRequest {
    context: string[];
    testFileName: string;
    testSuiteFile: string;
    testCaseDescription: string;
    existingMockServices?: string[];
    existingMockServiceNames?: string[];
    fullContext?: string[];
    pomFile?: string;
    externalConnectors?: string[];
}

export interface GenerateUnitTestCaseResponse {
    response: string; // Markdown response containing updated test suite and new mock services
}

// IDP (Intelligent Document Processor) Types
export interface ProcessIdpRequest {
    operation: 'generate' | 'finetune';
    userInput?: string;
    jsonSchema?: string;
    images?: string[]; // Base64-encoded images
}

export interface ProcessIdpResponse {
    schema: string; // Generated or modified JSON schema
}

// IDP Schema Filling Types (populate schema with data from images)
export interface FillIdpSchemaRequest {
    jsonSchema: string;      // Schema to populate
    images: string[];        // Base64-encoded images
}

export interface FillIdpSchemaResponse {
    filledData: string;      // JSON data matching schema
}

// DMC to TypeScript Conversion Types
export interface DmcToTsRequest {
    dmcContent: string;  // DMC (Data Mapping Configuration) file content
    tsFile: string;      // TypeScript file with interfaces and empty mapFunction
}

export interface DmcToTsResponse {
    mapping: string;  // Complete TypeScript file with implemented mapFunction
}

// Auto-Fill Form Types
export interface AutoFillFormRequest {
    payloads?: string[];           // Pre-defined user payloads (JSON structures)
    variables?: string[];          // Pre-defined variables
    params?: string[];             // Pre-defined parameters
    properties?: string[];         // Pre-defined properties
    headers?: string[];            // Pre-defined headers
    configs?: string[];            // Pre-defined configurations
    connection_names?: string[];   // Available connection names (for config_key fields)
    form_details?: string;         // Schema/structure of the form
    current_values: Record<string, unknown>;  // Current form field values
    field_descriptions?: Record<string, string>;  // Field descriptions for schema
    question?: string;             // Optional user query/instructions (User Prompt Mode)
}

export interface AutoFillFormResponse {
    filled_values: Record<string, unknown>;  // Filled form values matching input structure
}
