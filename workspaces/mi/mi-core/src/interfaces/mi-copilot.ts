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

export interface FileObject {
    name: string;
    mimetype: string;
    content: string;
}

export interface ImageObject {
    imageName: string;
    imageBase64: string;
}

export interface PromptObject {
    aiPrompt: string;
    files: FileObject[];
    images: ImageObject[];
}

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

export type CopilotChatEntry = {
    id: number;
    role: Role.CopilotUser | Role.CopilotAssistant;
    content: string;
    type?: MessageType;
    /** Full AI SDK messages (includes tool calls/results) - only for assistant messages */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelMessages?: any[];
};

export type ChatMessage = {
    id?: number;
    role: Role.MICopilot | Role.MIUser | Role.default;
    content: string;
    type: MessageType;
    files?: FileObject[];
    images?: ImageObject[];
};
