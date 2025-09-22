// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import {
    ChatEntry,
    ChatError,
    ChatNotify,
    ChatStart,
    DiagnosticEntry,
    GENERATE_CODE_AGAINST_THE_REQUIREMENT,
    GENERATE_TEST_AGAINST_THE_REQUIREMENT,
    GenerateCodeRequest,
    IntermidaryState,
    onChatNotify,
    ProjectSource,
    SourceFiles,
    TestGeneratorIntermediaryState,
    Command,
    DocumentationGeneratorIntermediaryState
} from "@wso2/ballerina-core";
import { CoreMessage } from "ai";
import { MessageRole } from "./types";
import { RPCLayer } from "../../../../src/RPCLayer";
import { AiPanelWebview } from "../../../views/ai-panel/webview";
import { GenerationType } from "./libs/libs";
import { REQUIREMENTS_DOCUMENT_KEY } from "./code/np_prompts";

export function populateHistory(chatHistory: ChatEntry[]): CoreMessage[] {
    if (!chatHistory || chatHistory.length === 0) {
        return [];
    }

    const messages: CoreMessage[] = [];
    for (const history of chatHistory) {
        // Map actor to role, defaulting to "user" if not "assistant"
        const role: MessageRole = history.actor === "assistant" ? "assistant" : "user";

        messages.push({
            role: role,
            content: history.message,
        });
    }
    return messages;
}

export function transformProjectSource(project: ProjectSource): SourceFiles[] {
    const sourceFiles: SourceFiles[] = [];
    project.sourceFiles.forEach((file) => {
        sourceFiles.push({
            filePath: file.filePath,
            content: file.content,
        });
    });
    project.projectModules?.forEach((module) => {
        let basePath = "";
        if (!module.isGenerated) {
            basePath += "modules/";
        } else {
            basePath += "generated/";
        }

        basePath += module.moduleName + "/";
        // const path =
        module.sourceFiles.forEach((file) => {
            sourceFiles.push({
                filePath: basePath + file.filePath,
                content: file.content,
            });
        });
    });
    return sourceFiles;
}

export function extractResourceDocumentContent(sourceFiles: readonly SourceFiles[]): string {
    const requirementFiles = sourceFiles
        .filter(sourceFile => sourceFile.filePath.toLowerCase().endsWith(REQUIREMENTS_DOCUMENT_KEY))
        .slice(0, 1)
        .map(sourceFile => sourceFile.content);

    if (requirementFiles.length === 0) {
        return "";
    }
    return requirementFiles[0];
}

//TODO: This should be a query rewriter ideally.
export function getRewrittenPrompt(params: GenerateCodeRequest, sourceFiles: SourceFiles[]) {
    const prompt = params.usecase;
    if (prompt.trim() === GENERATE_CODE_AGAINST_THE_REQUIREMENT) {
        const resourceContent = extractResourceDocumentContent(sourceFiles);
        return `${GENERATE_CODE_AGAINST_THE_REQUIREMENT}:
${resourceContent}`;
    }
    if (prompt.trim() === GENERATE_TEST_AGAINST_THE_REQUIREMENT) {
        const resourceContent = extractResourceDocumentContent(sourceFiles);
        return `${GENERATE_TEST_AGAINST_THE_REQUIREMENT}:
${resourceContent}`;
    }

    if (!prompt.toLowerCase().includes("readme")) {
        return prompt;
    }

    const readmeFiles = sourceFiles
        .filter((sourceFile) => sourceFile.filePath.toLowerCase().endsWith("readme.md"))
        .map((sourceFile) => sourceFile.content);

    if (readmeFiles.length === 0) {
        return prompt;
    }

    const readmeContent = readmeFiles[0];

    return `${prompt}
Readme Contents: 
${readmeContent}`;
}

export function sendMessagesNotification(messages: any[]): void {
    const msg: ChatNotify = {
        type: "messages",
        messages: messages,
    };
    sendAIPanelNotification(msg);
}

export function sendDiagnosticMessageNotification(diags: DiagnosticEntry[]): void {
    const msg: ChatNotify = {
        type: "diagnostics",
        diagnostics: diags,
    };
    sendAIPanelNotification(msg);
}

export function sendContentReplaceNotification(content: string): void {
    const msg: ChatNotify = {
        type: "content_replace",
        content: content,
    };
    sendAIPanelNotification(msg);
}

export function sendContentAppendNotification(chunk: string): void {
    const msg: ChatNotify = {
        type: "content_block",
        content: chunk,
    };
    sendAIPanelNotification(msg);
}

export function sendMessageStopNotification(command: Command): void {
    const msg: ChatNotify = {
        type: "stop",
        command
    };
    sendAIPanelNotification(msg);
}

export function sendErrorNotification(errorMessage: string): void {
    const msg: ChatError = {
        type: "error",
        content: errorMessage,
    };
    sendAIPanelNotification(msg);
}

export function sendMessageStartNotification(): void {
    const msg: ChatStart = {
        type: "start",
    };
    sendAIPanelNotification(msg);
}

export function sendIntermidateStateNotification(intermediaryState: TestGeneratorIntermediaryState | DocumentationGeneratorIntermediaryState): void {
    const msg: IntermidaryState = {
        type: "intermediary_state",
        state: intermediaryState,
    };
    sendAIPanelNotification(msg);
}

function sendAIPanelNotification(msg: ChatNotify): void {
    RPCLayer._messenger.sendNotification(onChatNotify, { type: "webview", webviewType: AiPanelWebview.viewType }, msg);
}

export function getGenerationMode(generationType: GenerationType) {
    return generationType === GenerationType.CODE_GENERATION ? "CORE" : "HEALTHCARE";
}

/**
 * Normalize any thrown value into a string message.
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        // Standard Error objects have a .message property
        if (error.name === "AI_RetryError") {
            return "An error occured connecting with the AI service. Please try again later.";
        }
        if (error.name === "AbortError") {
            return "Generation stopped by the user.";
        }

        return error.message;
    }
    // If it’s an object with a .message field, use that
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as Record<string, unknown>).message === "string"
    ) {
        return (error as { message: string }).message;
    }
    // Fallback: try to JSON-stringify, otherwise call toString()
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}
