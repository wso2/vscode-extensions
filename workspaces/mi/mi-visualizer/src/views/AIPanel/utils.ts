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

import { CopilotChatEntry, RpcClientType, Role, MessageType, ChatMessage, ApiResponse, BackendRequestType } from "./types";

import { GetWorkspaceContextResponse, MACHINE_VIEW, EVENT_TYPE, FileObject, ImageObject} from "@wso2/mi-core";
import {
    MI_ARTIFACT_EDIT_BACKEND_URL,
    MI_ARTIFACT_GENERATION_BACKEND_URL,
    MI_SUGGESTIVE_QUESTIONS_BACKEND_URL,
    MI_DIAGNOSTICS_RESPONSE_BACKEND_URL,
    COPILOT_ERROR_MESSAGES,
    MAX_FILE_SIZE, VALID_FILE_TYPES,
} from "./constants";
import path from "path";


export async function getProjectRuntimeVersion(rpcClient: RpcClientType): Promise<string | undefined> {
        try {
            return ((await rpcClient.getMiVisualizerRpcClient().getProjectDetails()).primaryDetails.runtimeVersion.value);
        } catch (error) {
            console.error('Failed to fetch project version:', error);
            return undefined;
        }
    }

export async function fetchBackendUrl(rpcClient:RpcClientType): Promise<string | undefined> {
        try {
            return (await rpcClient.getMiDiagramRpcClient().getBackendRootUrl()).url;
        } catch (error) {
            console.error('Failed to fetch backend URL:', error);
            return undefined;
        }
    }

export async function getProjectUUID(rpcClient: RpcClientType): Promise<string | undefined> {
        try {
            return (await rpcClient.getMiDiagramRpcClient().getProjectUuid()).uuid;
        } catch (error) {
            console.error('Failed to fetch project UUID:', error);
            return undefined;
        }
    }

// Add set of code blocks to the workspace
export async function handleAddtoWorkspace(rpcClient: RpcClientType, codeBlocks: string[]) {
    await rpcClient.getMiDiagramRpcClient().writeContentToFile({ content: codeBlocks })

    rpcClient.getMiDiagramRpcClient().executeCommand({ commands: ["MI.project-explorer.refresh"] });
};    

// Add a selected code to the workspace
export async function handleAddSelectiveCodetoWorkspace(rpcClient: RpcClientType, codeSegment: string) {
        var selectiveCodeBlocks: string[] = [];
        selectiveCodeBlocks.push(codeSegment);
        await rpcClient.getMiDiagramRpcClient().writeContentToFile({ content: selectiveCodeBlocks })

        rpcClient.getMiDiagramRpcClient().executeCommand({ commands: ["MI.project-explorer.refresh"] });   
    };

export function getStatusText(status: number) {
        switch (status) {
            case 400: return COPILOT_ERROR_MESSAGES.BAD_REQUEST;
            case 401: return COPILOT_ERROR_MESSAGES.UNAUTHORIZED;
            case 403: return COPILOT_ERROR_MESSAGES.FORBIDDEN;
            case 404: return COPILOT_ERROR_MESSAGES.NOT_FOUND;
            case 429: return COPILOT_ERROR_MESSAGES.TOKEN_COUNT_EXCEEDED;
            case 422: return COPILOT_ERROR_MESSAGES.ERROR_422
            // Add more status codes as needed
            default: return '';
        }
    }

export function splitHalfGeneratedCode(content: string) {
        const segments = [];
        const regex = /```([\s\S]*?)$/g;
        let match;
        let lastIndex = 0;

        while ((match = regex.exec(content)) !== null) {
            if (match.index > lastIndex) {
                segments.push({ isCode: false, loading: false, text: content.slice(lastIndex, match.index) });
            }
            segments.push({ isCode: true, loading: true, text: match[0] });
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < content.length) {
            segments.push({ isCode: false, loading: false, text: content });
        }
        return segments;
    }

export function splitContent(content: string) {
    if (!content) {
        return [];
    }
    const segments = [];
    let match;
    const regex = /```(xml|bash|json|javascript|java|python)([\s\S]*?)```/g;
    let start = 0;

    while ((match = regex.exec(content)) !== null) {
        if (match.index > start) {
        const segment = content.slice(start, match.index);
        segments.push(...splitHalfGeneratedCode(segment));
        }
        segments.push({ isCode: true, loading: false, language: match[1], text: match[2] });
        start = regex.lastIndex;
    }
    if (start < content.length) {
        segments.push(...splitHalfGeneratedCode(content.slice(start)));
    }
    return segments;
    }

export function identifyLanguage(segmentText: string): string {
        if (segmentText.includes('<') && segmentText.includes('>') && /(?:name|key)="([^"]+)"/.test(segmentText)) {
            return "xml";
        } else if (segmentText.includes('```toml')) {
            return "toml";
        } else if (segmentText.startsWith('```')) {
            // Split the string to get the first line
            const firstLine = segmentText.split('\n', 1)[0];
            // Remove the starting ```
            return firstLine.substring(3).trim();
        } else {
            return "";
        }
    }

export async function identifyArtifactTypeAndPath(name: string, segmentText: string, rpcClient: RpcClientType): Promise<{type: string, path: string}> {
    const tagMatch = segmentText.match(/<(\w+)[^>]*>/);
    let fileType = "";
    if (tagMatch) {
        const tag = tagMatch[1];
        switch (tag) {
            case "api":
                fileType = "apis";
                break;
            case "endpoint":
                fileType = "endpoints";
                break;
            case "sequence":
                fileType = "sequences";
                break;
            case "proxy":
                fileType = "proxy-services";
                break;
            case "inboundEndpoint":
                fileType = "inbound-endpoints";
                break;
            case "messageStore":
                fileType = "message-stores";
                break;
            case "messageProcessor":
                fileType = "message-processors";
                break;
            case "task":
                fileType = "tasks";
                break;
            case "localEntry":
                fileType = "local-entries";
                break;
            case "template":
                fileType = "templates";
                break;
            case "registry":
                fileType = "registry";
                break;
            case "unit":
                fileType = "unit-test";
                break;
            default:
                fileType = "";
        }
    }
    if (fileType) {
        const directoryPath = (await getContext(rpcClient))[0].rootPath;
        
        var fullPath = "";
        if (fileType === "apis") {
            const version = segmentText.match(/<api [^>]*version="([^"]+)"/);
            if (version) {
                fullPath = path.join(
                    directoryPath ?? "",
                    "src",
                    "main",
                    "wso2mi",
                    "artifacts",
                    fileType,
                    path.sep,
                    `${name}_v${version[1]}.xml`
                );
            } else {
                fullPath = path.join(
                    directoryPath ?? "",
                    "src",
                    "main",
                    "wso2mi",
                    "artifacts",
                    fileType,
                    path.sep,
                    `${name}.xml`
                );
            }
        } else if (fileType === "unit-test") {
            fullPath = path.join(directoryPath ?? "", "src", "main", "test", path.sep, `${name}.xml`);
        } else {
            fullPath = path.join(
                directoryPath ?? "",
                "src",
                "main",
                "wso2mi",
                "artifacts",
                fileType,
                path.sep,
                `${name}.xml`
            );
        }
    }
    return {type: fileType, path: fullPath};
} 

export function compareVersions(v1: string, v2: string): number {
        // Extract only the numeric parts of the version string
        const getVersionNumbers = (str: string): string => {
            const match = str.match(/(\d+(\.\d+)*)/);
            return match ? match[0] : '0';
        };
    
        const version1 = getVersionNumbers(v1);
        const version2 = getVersionNumbers(v2);
    
        const parts1 = version1.split('.').map(part => parseInt(part, 10));
        const parts2 = version2.split('.').map(part => parseInt(part, 10));
    
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
    
            if (part1 > part2) { return 1; }
            if (part1 < part2) { return -1; }
        }
        return 0;
    }

export async function generateSuggestions(
    backendRootUri: string,
    chatHistory: CopilotChatEntry[],
    rpcClient: RpcClientType,
    controller: AbortController
): Promise<ChatMessage[]> {
    try {
        const url = backendRootUri + MI_SUGGESTIVE_QUESTIONS_BACKEND_URL;
        const context = await getContext(rpcClient);
        const response = await fetchWithRetry(
            BackendRequestType.Suggestions,
            url,
            {
                messages: chatHistory,
                context: context[0].context,
                num_suggestions: 1,
                type: "artifact_gen",
            },
            rpcClient,
            controller,
            chatHistory
        );

        const data = (await response.json()) as ApiResponse;

        if (data.event === "suggestion_generation_success") {
            return data.questions.map((question) => ({
                id: generateId(),
                role: Role.default,
                content: question,
                type: MessageType.Question,
            }));
        } else {
            console.error("Error generating suggestions:", data.error);
            throw new Error("Failed to generate suggestions: " + data.error);
        }
    } catch (error) {
        console.error(error);
        return [];
    }
}

export function updateTokenInfo(machineView: any) {
    let timeToReset = machineView.userTokens.time_to_reset;
    timeToReset = timeToReset / (60 * 60 * 24);
    const maxTokens = machineView.userTokens.max_usage;
    let remainingTokenPercentage: number;
    let remaingTokenLessThanOne: boolean = false;

    if (maxTokens == -1) {
        remainingTokenPercentage = -1;
    } else {
        const remainingTokens = machineView.userTokens.remaining_tokens;
        remainingTokenPercentage = (remainingTokens / maxTokens) * 100;

        remainingTokenPercentage = Math.round(remainingTokenPercentage);
        if (remainingTokenPercentage < 0) {
            remainingTokenPercentage = 0;
        }
    }

    return { timeToReset, remainingTokenPercentage, remaingTokenLessThanOne };
}

export async function getBackendUrlAndView(rpcClient: RpcClientType): Promise<{ backendUrl: string; view: string }> {
    const machineView = await rpcClient?.getVisualizerState();
    switch (machineView?.view) {
        case MACHINE_VIEW.Overview:
        case MACHINE_VIEW.ADD_ARTIFACT:
            return { backendUrl: MI_ARTIFACT_GENERATION_BACKEND_URL, view: "Overview" };
        default:
            return { backendUrl: MI_ARTIFACT_EDIT_BACKEND_URL, view: "Artifact" };
    }
}

// Helper Functions
async function getContext(rpcClient: RpcClientType, view?: string): Promise<GetWorkspaceContextResponse[]> {
    const machineView = await rpcClient?.getVisualizerState();
    const currentView = view || machineView?.view;

    switch (currentView) {
        case MACHINE_VIEW.Overview:
            return [await rpcClient?.getMiDiagramRpcClient()?.getWorkspaceContext()];
        default:
            return [await rpcClient?.getMiDiagramRpcClient()?.getSelectiveWorkspaceContext()];
    }
}

export function openUpdateExtensionView (rpcClient: RpcClientType) {
    rpcClient?.getMiVisualizerRpcClient().openView({ 
      type: EVENT_TYPE.OPEN_VIEW, 
      location: { view: MACHINE_VIEW.UpdateExtension } 
    });
  };

// Utility function to generate unique 8-digit numeric IDs
export function generateId(): number {
    const min = 10000000; // Minimum 8-digit number
    const max = 99999999; // Maximum 8-digit number
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Utility function to convert CopilotChatEntry to ChatMessage
export function convertChat(entry: CopilotChatEntry): ChatMessage {
    let role: Role.MIUser | Role.MICopilot | Role.default, type;
    if (entry.role === Role.CopilotUser) {
        role = Role.MIUser;
        type = MessageType.UserMessage;
    } else if (entry.role === Role.CopilotAssistant) {
        role = Role.MICopilot;
        type = MessageType.AssistantMessage;
    }

    return {
        id: entry.id,
        role: role,
        content: entry.content,
        type: type,
    };
}

export async function fetchCodeGenerationsWithRetry(
    url: string,
    isRutimeVersionThresholdReached: boolean,
    chatHistory: CopilotChatEntry[],
    files: FileObject[],
    images: ImageObject[],
    rpcClient: RpcClientType,
    controller: AbortController,
    view?: string,
    thinking?: boolean
): Promise<Response> {

    const context = await getContext(rpcClient, view);
    const imageList = images.map((image) => image.imageBase64);
    const defaultPayloads = await rpcClient.getMiDiagramRpcClient().getAllInputDefaultPayloads();
    const fileList = isRutimeVersionThresholdReached ? files : files.map((file) => JSON.stringify(file));

    return fetchWithRetry(BackendRequestType.UserPrompt, url, {
        messages: chatHistory,
        context: context[0].context,
        files: fileList,
        images: imageList,
        payloads: defaultPayloads,
    }, rpcClient, controller, chatHistory, thinking);
}

export async function fetchWithRetry(
    type: BackendRequestType,
    url: string,
    body: {},
    rpcClient: RpcClientType,
    controller: AbortController,
    chatHistory?: CopilotChatEntry[],
    thinking?: boolean
): Promise<Response> {
    let retryCount = 0;
    const maxRetries = 2;
    const token = await rpcClient?.getMiDiagramRpcClient().getUserAccessToken();

    const bodyWithThinking = {
        ...body,
        thinking: thinking || false
    };

    let response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token.token}`,
        },
        body: JSON.stringify(bodyWithThinking),
        signal: controller.signal,
    });

    const handleFetchError = (response: Response) => {
        const newMessages = [...chatHistory];
        const statusText = getStatusText(response.status);
        let error = `Failed to fetch response. Status: ${statusText}`;

        if (response.status == 429) {
            response.json().then((body) => {
                error += body.detail;
            });
        } else if (response.status == 422) {
            error = getStatusText(422);
        }

        newMessages[newMessages.length - 1].content += error;
        newMessages[newMessages.length - 1].type = MessageType.Error;
        return newMessages;
    };

    if (response.status == 401) {
        await rpcClient?.getMiDiagramRpcClient().refreshAccessToken();
        const newToken = await rpcClient?.getMiDiagramRpcClient().getUserAccessToken();

        response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${newToken.token}`,
            },
            body: JSON.stringify(bodyWithThinking),
            signal: controller.signal,
        });
    } else if (response.status == 404) {
        if (retryCount < maxRetries) {
            retryCount++;
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay));
            return fetchWithRetry(type, url, body, rpcClient, controller, chatHistory, thinking); // Retry the request with all parameters
        } else {
            openUpdateExtensionView(rpcClient);
            throw new Error("Resource not found : Check backend URL");
        }
    } else if (!response.ok) {
        switch (type) {
            case BackendRequestType.Suggestions:
                openUpdateExtensionView(rpcClient);
                throw new Error("Failed to fetch initial questions");
            case BackendRequestType.UserPrompt:
                handleFetchError(response);
                throw new Error("Failed to fetch code genrations");
            default:
        }
    } else {
        return response;
    }
}

// Utilities for file handling
export const handleFileAttach = (e: any, existingFiles: FileObject[], setFiles: Function, existingImages: ImageObject[], setImages: Function, setFileUploadStatus: Function) => {
    const files = e.target.files;
    const validFileTypes = VALID_FILE_TYPES.files;
    const validImageTypes = VALID_FILE_TYPES.images;

    for (const file of files) {

        if (file.size > MAX_FILE_SIZE) {
            setFileUploadStatus({ type: "error", text: `File '${file.name}' exceeds the size limit of 5 MB.` });
            continue;
        }
        
        if (existingFiles.some(existingFile => existingFile.name === file.name)) {
            setFileUploadStatus({ type: "error", text: `File '${file.name}' already added.` });
            continue;
        } else if (existingImages.some(existingImage => existingImage.imageName === file.name)) {
            setFileUploadStatus({ type: "error", text: `Image '${file.name}' already added.` });
            continue;
        }

        if (validFileTypes.includes(file.type)) {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                let fileContents = event.target.result;
                if (file.type === "application/pdf" && fileContents.startsWith("data:application/pdf;base64,")) {
                    fileContents = fileContents.replace("data:application/pdf;base64,", "");
                }
                setFiles((prevFiles: any) => [
                    ...prevFiles,
                    { name: file.name, mimetype: file.type, content: fileContents },
                ]);
                setFileUploadStatus({ type: "success", text: `File uploaded successfully.` });
            };
            if (file.type === "application/pdf") {
                reader.readAsDataURL(file); // Convert PDF to base64
            } else {
                reader.readAsText(file);
            }
        } else if (validImageTypes.includes(file.type)) {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                const imageBase64 = event.target.result;
                setImages((prevImages: any) => [...prevImages, { imageName: file.name, imageBase64: imageBase64 }]);
                setFileUploadStatus({ type: "success", text: `File uploaded successfully.` });
            };
            reader.readAsDataURL(file);
        } else {
            setFileUploadStatus({ type: "error", text: `File format not supported for '${file.name}'` });
        }
    }
    e.target.value = "";
};

export const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'js':
        case 'ts':
        case 'jsx':
        case 'tsx':
        case 'json':
        case 'yaml':
        case 'yml':
            return "file-code"; 
        case 'md':
        case 'markdown':
            return 'book';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
            return 'file-media';
        case 'pdf':
            return 'file-pdf';
        case 'zip':
        case 'rar':
        case '7z':
            return 'file-zip';
        default:
            return 'file';
    }
};

export const isDarkMode = (): boolean => {
    if (document.body) {
        const bodyClasses = document.body.className;
        if (bodyClasses.includes('vscode-dark')) {
            return true;
        } else if (bodyClasses.includes('vscode-light')) {
            return false;
        }
                
        // Fallback: check the computed background color
        const backgroundColor = getComputedStyle(document.body).backgroundColor;
        const rgb = backgroundColor.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            const [r, g, b] = rgb.map(Number);
            // Calculate brightness - lower values mean darker colors
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
            return brightness < 128;
        }
    }
    
    // Ultimate fallback to system preference
    if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
            
    return false;                         
}

/**
 * Function to send diagnostics to the LLM backend and get a response
 * @param diagnostics The diagnostics response received from the code diagnostics
 * @param xmlCodes The XML code content for each file
 * @param rpcClient The RPC client instance
 * @param controller The abort controller for the fetch request
 * @returns Promise with the response from the LLM backend
 */
export async function getDiagnosticsReponseFromLlm(
    diagnostics: any,
    xmlCodes: any,
    rpcClient: RpcClientType,
    controller: AbortController
): Promise<Response> {
    try {
        // Get the backend URL
        const backendRootUri = await fetchBackendUrl(rpcClient);
        if (!backendRootUri) {
            throw new Error("Failed to fetch backend URL");
        }

        // Construct the full URL
        const url = backendRootUri + MI_DIAGNOSTICS_RESPONSE_BACKEND_URL;
        
        // Get the context
        const context = await getContext(rpcClient);
        
        // Get the user token
        const token = await rpcClient?.getMiDiagramRpcClient().getUserAccessToken();
        
        // Prepare the request body
        const requestBody = {
            diagnostics: diagnostics.diagnostics,
            xmlCodes: xmlCodes,
            context: context[0].context
        };
        
        // Send the request to the backend
        return fetchWithRetry(
            BackendRequestType.UserPrompt,
            url,
            requestBody,
            rpcClient,
            controller,
            undefined,
            false // Not in thinking mode for diagnostics
        );
    } catch (error) {
        console.error("Error sending diagnostics to LLM:", error);
        
        const errorMessage = error instanceof Error 
            ? error.message 
            : "Unknown error occurred when analyzing diagnostics";
        
        return Promise.reject({
            status: "error",
            message: `Failed to analyze diagnostics: ${errorMessage}`,
            originalError: error
        });
    }
}

/**
 * Utility function to replace code blocks in chat messages
 * @param content The original content of the message
 * @param fileName The name of the file to replace
 * @param correctedCode The corrected code to replace with
 * @returns The updated content with the code block replaced
 */
export function replaceCodeBlock(content: string, fileName: string, correctedCode: string): string {
    // Normalize the file name for consistent matching
    const normalizedFileName = fileName.endsWith('.xml') ? fileName : `${fileName}.xml`;
    const fileNameWithoutExt = normalizedFileName.replace('.xml', '');
    
    // Try to find code blocks in the content
    const codeBlockRegex = /```xml\s*([\s\S]*?)```/g;
    let match;
    let modifiedContent = content;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
        const xmlContent = match[1];
        
        // Check if this XML block contains the target API/artifact name
        const nameMatch = xmlContent.match(/name="([^"]+)"/);
        if (nameMatch && nameMatch[1] === fileNameWithoutExt) {
            // Found the right code block, replace it
            const originalBlock = match[0]; // The complete ```xml ... ``` block
            const newBlock = `\`\`\`xml\n${correctedCode}\n\`\`\``;
            
            return modifiedContent.replace(originalBlock, newBlock);
        }
    }
    
    // If no matching code block was found, append the corrected code
    return modifiedContent + `\n\n**Updated ${normalizedFileName}**\n\`\`\`xml\n${correctedCode}\n\`\`\``;
}
