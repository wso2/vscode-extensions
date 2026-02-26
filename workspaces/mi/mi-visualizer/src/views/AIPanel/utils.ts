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

interface ContentSegment {
    isCode?: boolean;
    isToolCall?: boolean;
    isTodoList?: boolean;
    isBashOutput?: boolean;
    isCompactSummary?: boolean;
    isFileChanges?: boolean;
    isPlan?: boolean;
    isThinking?: boolean;
    loading: boolean;
    text: string;
    language?: string;
    failed?: boolean;
    filePath?: string;
}

export function splitContent(content: string): ContentSegment[] {
    if (!content) {
        return [];
    }
    const segments: ContentSegment[] = [];
    let match;
    // Updated regex to include <toolcall>, <todolist>, <bashoutput>, <compact>, <filechanges>, <plan>, and <thinking> tags.
    // Code block regex matches any language (or no language) followed by a newline
    const regex = /```(\w*)\n([\s\S]*?)```|<toolcall([^>]*)>([^<]*?)<\/toolcall>|<todolist>([\s\S]*?)<\/todolist>|<bashoutput(?:\s+[^>]*)?>([\s\S]*?)<\/bashoutput>|<compact>([\s\S]*?)<\/compact>|<filechanges>([\s\S]*?)<\/filechanges>|<plan>([\s\S]*?)<\/plan>|<thinking(?:\s+[^>]*)?>([\s\S]*?)<\/thinking>/g;
    let start = 0;

    // Helper function to mark the last toolcall segment as complete
    function updateLastToolCallSegmentLoading(failed: boolean = false) {
        const lastSegment = segments[segments.length - 1];
        if (lastSegment && lastSegment.isToolCall) {
            lastSegment.loading = false;
            lastSegment.failed = failed;
        }
    }

    while ((match = regex.exec(content)) !== null) {
        if (match.index > start) {
            // Mark previous toolcall as complete before adding text
            updateLastToolCallSegmentLoading();
            const segment = content.slice(start, match.index);
            segments.push(...splitHalfGeneratedCode(segment));
        }

        if (match[2] !== undefined) {
            // Code block matched (match[1] is language, may be empty for bare ``` fences)
            updateLastToolCallSegmentLoading();
            segments.push({ isCode: true, loading: false, language: match[1] || undefined, text: match[2] });
        } else if (match[4] !== undefined) {
            // <toolcall> block matched
            updateLastToolCallSegmentLoading();
            const toolcallAttrs = match[3] || '';
            const toolcallText = match[4];
            const filePathMatch = toolcallAttrs.match(/data-file="([^"]*)"/);
            const filePath = filePathMatch?.[1] ? filePathMatch[1] : undefined;
            // Determine loading state: if text ends with "...", it's still loading
            const isLoading = toolcallText.trim().endsWith('...');
            segments.push({ isToolCall: true, loading: isLoading, text: toolcallText, failed: false, filePath });
        } else if (match[5] !== undefined) {
            // <todolist> block matched
            updateLastToolCallSegmentLoading();
            segments.push({ isTodoList: true, loading: false, text: match[5] });
        } else if (match[6] !== undefined) {
            // <bashoutput> block matched
            updateLastToolCallSegmentLoading();
            segments.push({ isBashOutput: true, loading: false, text: match[6] });
        } else if (match[7] !== undefined) {
            // <compact> block matched
            updateLastToolCallSegmentLoading();
            segments.push({ isCompactSummary: true, loading: false, text: match[7] });
        } else if (match[8] !== undefined) {
            // <filechanges> block matched
            updateLastToolCallSegmentLoading();
            segments.push({ isFileChanges: true, loading: false, text: match[8] });
        } else if (match[9] !== undefined) {
            // <plan> block matched
            updateLastToolCallSegmentLoading();
            segments.push({ isPlan: true, loading: false, text: match[9] });
        } else if (match[10] !== undefined) {
            // <thinking> block matched
            updateLastToolCallSegmentLoading();
            const isLoading = /data-loading="true"/.test(match[0]);
            segments.push({ isThinking: true, loading: isLoading, text: match[10] });
        }
        start = regex.lastIndex;
    }
    if (start < content.length) {
        updateLastToolCallSegmentLoading();
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
    // For custom API key users or when token info is not available, return unlimited.
    if (!machineView.usage) {
        return { 
            timeToReset: 0, 
            remainingTokenPercentage: -1, // -1 indicates unlimited
            remaingTokenLessThanOne: false 
        };
    }

    const remainingUsagePercentage = machineView.usage.remainingUsagePercentage;
    const resetsIn = machineView.usage.resetsIn;
    const resetsInDays = typeof resetsIn === "number" ? resetsIn / (60 * 60 * 24) : 0;
    if (typeof remainingUsagePercentage === "number") {
        const normalized = Math.max(0, Math.min(100, Math.round(remainingUsagePercentage)));
        return {
            timeToReset: resetsInDays,
            remainingTokenPercentage: normalized,
            remaingTokenLessThanOne: normalized > 0 && normalized < 1
        };
    }

    return {
        timeToReset: resetsInDays,
        remainingTokenPercentage: -1,
        remaingTokenLessThanOne: false
    };
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
const FILE_EXTENSION_TO_MIME: Record<string, string> = {
    txt: "text/plain",
    md: "text/markdown",
    markdown: "text/markdown",
    csv: "text/csv",
    json: "application/json",
    xml: "application/xml",
    yaml: "application/x-yaml",
    yml: "application/x-yaml",
    html: "text/html",
    js: "text/javascript",
    mjs: "text/javascript",
    cjs: "text/javascript",
    ts: "text/typescript",
    css: "text/css",
    rtf: "text/rtf",
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
};

function resolveMimeType(file: File): string {
    if (file.type) {
        return file.type;
    }
    const extension = file.name.split(".").pop()?.toLowerCase();
    return extension ? FILE_EXTENSION_TO_MIME[extension] || "" : "";
}

export const handleFileAttach = (e: any, existingFiles: FileObject[], setFiles: Function, existingImages: ImageObject[], setImages: Function, setFileUploadStatus: Function) => {
    const files = e.target.files;
    const validFileTypes = VALID_FILE_TYPES.files;
    const validImageTypes = VALID_FILE_TYPES.images;

    for (const file of files) {
        const mimeType = resolveMimeType(file);

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

        if (validFileTypes.includes(mimeType)) {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                let fileContents = event.target.result;
                if (mimeType === "application/pdf" && typeof fileContents === "string") {
                    const [, base64Content] = fileContents.split(",", 2);
                    if (base64Content) {
                        fileContents = base64Content;
                    }
                }
                setFiles((prevFiles: any) => [
                    ...prevFiles,
                    { name: file.name, mimetype: mimeType, content: fileContents },
                ]);
                setFileUploadStatus({ type: "success", text: `File uploaded successfully.` });
            };
            if (mimeType === "application/pdf") {
                reader.readAsDataURL(file); // Convert PDF to base64
            } else {
                reader.readAsText(file);
            }
        } else if (validImageTypes.includes(mimeType)) {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                let imageBase64 = event.target.result;
                if (typeof imageBase64 === "string") {
                    const base64Marker = "base64,";
                    const base64Index = imageBase64.indexOf(base64Marker);
                    if (base64Index !== -1) {
                        const base64Content = imageBase64.substring(base64Index + base64Marker.length);
                        imageBase64 = `data:${mimeType};base64,${base64Content}`;
                    }
                }
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
        case 'webp':
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

/**
 * Converts copilot chat history to AI SDK model messages format
 * Extracts modelMessages from assistant entries to preserve tool calls/results
 *
 * @param chatHistory - The copilot chat history array
 * @returns Array of AI SDK model messages with tool calls preserved
 */
export function convertChatHistoryToModelMessages(chatHistory: CopilotChatEntry[]): any[] {
    const messages: any[] = [];

    for (const entry of chatHistory) {
        if (entry.role === Role.CopilotAssistant && entry.modelMessages && entry.modelMessages.length > 0) {
            // Assistant message: use stored modelMessages (includes tool calls/results)
            messages.push(...entry.modelMessages);
        } else if (entry.role === Role.CopilotUser) {
            // User message: create simple text message
            messages.push({
                role: 'user',
                content: entry.content
            });
        }
    }

    return messages;
}
