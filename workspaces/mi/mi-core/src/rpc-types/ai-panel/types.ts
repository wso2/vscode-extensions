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
    | "stop";

export interface CodeGenerationEvent {
    type: CodeGenerationEventType;
    content?: string;
    diagnostics?: DiagnosticEntry[];
    messages?: unknown[];
    error?: string;
    command?: string;
    xmlCodes?: XmlCodeEntry[];
    correctedCodes?: CorrectedCodeItem[];
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
