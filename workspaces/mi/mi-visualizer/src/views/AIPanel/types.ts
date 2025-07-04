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
import { useVisualizerContext } from "@wso2/mi-rpc-client";
import { FileObject, ImageObject } from "@wso2/mi-core";

export type RpcClientType = ReturnType<typeof useVisualizerContext>["rpcClient"];
export interface MarkdownRendererProps {
    markdownContent: string;
}

export interface ApiResponse {
    event: string;
    error: string | null;
    questions: string[];
}

export interface EntryContainerProps {
    isOpen: boolean;
}

export interface FileHistoryEntry {
    filepath: string; 
    content: string;
    timestamp: number;
    currentAddedfFromChatIndex: number; 
    maxAddedFromChatIndex: number;
}

// Define enums for role and type
export enum Role {
    // UI roles
    MIUser = "You",
    MICopilot = "Copilot",
    default = "",
    
    // Copilot roles
    CopilotAssistant = "assistant",
    CopilotUser = "user"
}

export enum MessageType {
    UserMessage = "user_message",
    AssistantMessage = "assistant_message",
    Question = "question",
    Label = "label",
    InitialPrompt = "initial_prompt",
    Error = "Error"
}

// Type of entries shown in UI 
export type ChatMessage = {
    id?: number;
    role: Role.MICopilot | Role.MIUser | Role.default; 
    content: string;
    type: MessageType; 
    files?: FileObject[];
    images?: ImageObject[];
};

// Type of messeges send to MI Copilot backend 
export type CopilotChatEntry = {
    id: number;
    role: Role.CopilotUser | Role.CopilotAssistant;
    content: string;
    type?: MessageType;
};

// Type of messeges send to MI Copilot backend 
export type ChatEntry = {
    id: string;
    role: string; 
    content: string;
};

export enum BackendRequestType {
    InitialPrompt = "initial_prompt",
    QuestionClick = "question_click",
    UserPrompt = "user_prompt",
    Suggestions = "suggestions",
}

// Types for handling fixed/corrected code from LLM
export interface FixedConfigItem {
    name: string;
    configuration?: string;
    code?: string;
}

export interface CorrectedCodeItem {
    fileName: string;
    code: string;
}
