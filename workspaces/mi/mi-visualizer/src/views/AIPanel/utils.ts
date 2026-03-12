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

import { RpcClientType, ApiResponse, BackendRequestType } from "./types";
import { CopilotChatEntry, Role, MessageType, ChatMessage } from "@wso2/mi-core";

import { GetWorkspaceContextResponse, MACHINE_VIEW, EVENT_TYPE, FileObject, ImageObject} from "@wso2/mi-core";
import {
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

export async function getProjectUUID(rpcClient: RpcClientType): Promise<string | undefined> {
        try {
            return (await rpcClient.getMiDiagramRpcClient().getProjectUuid()).uuid;
        } catch (error) {
            console.error('Failed to fetch project UUID:', error);
            return undefined;
        }
    }   

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

/**
 * Sets up event listener for code generation streaming events
 */
export function setupCodeGenerationEventListener(
    rpcClient: RpcClientType,
    onEvent: (event: any) => void
): void {
    try {
        // Use the proper RpcClient method for code generation events
        rpcClient.onCodeGenerationEvent(onEvent);
    } catch (error) {
        console.error("Error setting up code generation event listener:", error);
    }
}

export async function generateSuggestions(
    chatHistory: CopilotChatEntry[],
    rpcClient: RpcClientType,
    controller: AbortController
): Promise<string[]> {
    try {
        // Use RPC call to extension - extension handles all backend communication
        const response = await rpcClient.getMiAiPanelRpcClient().generateSuggestions({
            chatHistory: chatHistory
        });

        // Check if we got a valid response
        if (response.response) {
            // If the response contains a single suggestion, convert it to the expected format
            return [response.response];
        } else {
            console.error("Error generating suggestions: Empty response from extension");
            return [];
        }
    } catch (error) {
        console.error("Error generating suggestions via RPC:", error);
        // No fallback - all backend communication should go through extension
        throw new Error(`Failed to generate suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function updateTokenInfo(machineView: any) {
    // For custom API key users or when token info is not available, return unlimited
    if (!machineView.usage || !machineView.usage.time_to_reset) {
        return { 
            timeToReset: 0, 
            remainingTokenPercentage: -1, // -1 indicates unlimited
            remaingTokenLessThanOne: false 
        };
    }

    let timeToReset = machineView.usage.time_to_reset;
    timeToReset = timeToReset / (60 * 60 * 24);
    const maxTokens = machineView.usage.max_usage;
    let remainingTokenPercentage: number;
    let remaingTokenLessThanOne: boolean = false;

    if (maxTokens == -1) {
        remainingTokenPercentage = -1;
    } else {
        const remainingTokens = machineView.usage.remaining_tokens;
        remainingTokenPercentage = (remainingTokens / maxTokens) * 100;

        remainingTokenPercentage = Math.round(remainingTokenPercentage);
        if (remainingTokenPercentage < 0) {
            remainingTokenPercentage = 0;
        }
    }

    return { timeToReset, remainingTokenPercentage, remaingTokenLessThanOne };
}

export async function getView(rpcClient: RpcClientType): Promise<string> {
    const machineView = await rpcClient?.getVisualizerState();
    switch (machineView?.view) {
        case MACHINE_VIEW.Overview:
        case MACHINE_VIEW.ADD_ARTIFACT:
            return "Overview";
        default:
            return "Artifact";
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
    chatHistory: CopilotChatEntry[],
    files: FileObject[],
    images: ImageObject[],
    rpcClient: RpcClientType,
    controller: AbortController,
    view?: string,
    thinking?: boolean
): Promise<Response> {
    // Use RPC call to extension for streaming code generation
        try {
        const response = await rpcClient.getMiAiPanelRpcClient().generateCode({
            chatHistory: chatHistory,
            files: files,
            images: images,
            view: view,
            thinking: thinking
        });

        // Return a mock Response object since we're now using streaming via events
        // The actual streaming data will come through RPC notifications
        return new Response(JSON.stringify(response), {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error in code generation RPC call:', error);
        // Return error response
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            status: 500,
            statusText: 'Internal Server Error',
            headers: { 'Content-Type': 'application/json' }
        });
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
