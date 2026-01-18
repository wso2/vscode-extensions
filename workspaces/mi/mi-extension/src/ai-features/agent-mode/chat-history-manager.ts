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

import * as fs from 'fs/promises';
import * as path from 'path';
import { createWriteStream, WriteStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logDebug, logError, logInfo } from '../copilot/logger';
import { getToolAction, capitalizeAction } from './tool-action-mapper';

// Cross-platform home directory
const os = require('os');
const homeDir = os.homedir();

// Storage location: ~/.wso2-mi/copilot/projects/<projectpath>/<session_id>.jsonl
const BASE_STORAGE_DIR = path.join(homeDir, '.wso2-mi', 'copilot', 'projects');

/**
 * Message types in JSONL
 */
export type MessageType = 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'session_start' | 'session_end';

/**
 * Base structure for JSONL entries
 */
export interface JSONLEntry {
    type: MessageType;
    uuid: string;
    parentUuid: string | null;
    timestamp: string;
    sessionId: string;
    projectPath: string;
}

/**
 * User message entry
 */
export interface UserMessageEntry extends JSONLEntry {
    type: 'user';
    message: {
        role: 'user';
        content: string;
    };
}

/**
 * Assistant message entry (streaming or complete)
 */
export interface AssistantMessageEntry extends JSONLEntry {
    type: 'assistant';
    message: {
        role: 'assistant';
        content: string;
        isComplete: boolean; // false for streaming chunks, true for final
    };
}

/**
 * Tool call entry
 */
export interface ToolCallEntry extends JSONLEntry {
    type: 'tool_call';
    toolName: string;
    toolInput: unknown;
    /** AI SDK tool call ID - required for prompt caching */
    toolCallId: string;
}

/**
 * Tool result entry
 */
export interface ToolResultEntry extends JSONLEntry {
    type: 'tool_result';
    toolName: string;
    toolOutput: unknown;
    /** AI SDK tool call ID - required for prompt caching */
    toolCallId: string;
}

/**
 * Session metadata entry
 */
export interface SessionEntry extends JSONLEntry {
    type: 'session_start' | 'session_end';
    metadata?: {
        projectName?: string;
        gitBranch?: string;
    };
}

/**
 * Union type for all entry types
 */
export type ConversationEntry =
    | UserMessageEntry
    | AssistantMessageEntry
    | ToolCallEntry
    | ToolResultEntry
    | SessionEntry;

/**
 * Chat History Manager
 * Handles saving and loading conversation history in JSONL format
 * Similar to Claude Code's approach
 */
export class ChatHistoryManager {
    private projectPath: string;
    private projectHash: string;
    private sessionId: string;
    private sessionFile: string = '';
    private writeStream: WriteStream | null = null;
    private lastMessageUuid: string | null = null;

    constructor(projectPath: string, sessionId?: string) {
        this.projectPath = projectPath;
        this.projectHash = ChatHistoryManager.hashProjectPath(projectPath);
        this.sessionId = sessionId || uuidv4();
    }

    /**
     * Initialize the chat history manager
     * Creates necessary directories and opens write stream
     */
    async initialize(): Promise<void> {
        try {
            // Create project directory
            const projectDir = path.join(BASE_STORAGE_DIR, this.projectHash);
            await fs.mkdir(projectDir, { recursive: true });

            // Session file path
            this.sessionFile = path.join(projectDir, `${this.sessionId}.jsonl`);

            // Open write stream for appending
            this.writeStream = createWriteStream(this.sessionFile, { flags: 'a' });

            logInfo(`[ChatHistory] Initialized for project: ${this.projectPath}`);
            logDebug(`[ChatHistory] Session file: ${this.sessionFile}`);

            // Write session start entry
            await this.writeSessionStart();
        } catch (error) {
            logError('[ChatHistory] Failed to initialize', error);
            throw error;
        }
    }

    /**
     * Close the write stream
     */
    async close(): Promise<void> {
        if (this.writeStream) {
            await this.writeSessionEnd();
            return new Promise((resolve, reject) => {
                this.writeStream!.end((err: Error | null | undefined) => {
                    if (err) {
                        logError('[ChatHistory] Failed to close stream', err);
                        reject(err);
                    } else {
                        logInfo('[ChatHistory] Session closed');
                        resolve();
                    }
                });
            });
        }
    }

    /**
     * Write a JSONL entry to the file
     */
    private async writeEntry(entry: ConversationEntry): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.writeStream) {
                reject(new Error('Write stream not initialized'));
                return;
            }

            const line = JSON.stringify(entry) + '\n';
            this.writeStream.write(line, (err: Error | null | undefined) => {
                if (err) {
                    logError('[ChatHistory] Failed to write entry', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Write session start entry
     */
    private async writeSessionStart(): Promise<void> {
        const entry: SessionEntry = {
            type: 'session_start',
            uuid: uuidv4(),
            parentUuid: null,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectPath: this.projectPath,
            metadata: {
                projectName: path.basename(this.projectPath),
                // TODO: Get git branch from workspace
            }
        };

        await this.writeEntry(entry);
        this.lastMessageUuid = entry.uuid;
    }

    /**
     * Write session end entry
     */
    private async writeSessionEnd(): Promise<void> {
        const entry: SessionEntry = {
            type: 'session_end',
            uuid: uuidv4(),
            parentUuid: this.lastMessageUuid,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectPath: this.projectPath
        };

        await this.writeEntry(entry);
    }

    /**
     * Record a user message
     */
    async recordUserMessage(content: string): Promise<string> {
        const messageUuid = uuidv4();
        const entry: UserMessageEntry = {
            type: 'user',
            uuid: messageUuid,
            parentUuid: this.lastMessageUuid,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectPath: this.projectPath,
            message: {
                role: 'user',
                content
            }
        };

        await this.writeEntry(entry);
        this.lastMessageUuid = messageUuid;
        logDebug(`[ChatHistory] Recorded user message: ${messageUuid}`);
        return messageUuid;
    }

    /**
     * Record an assistant message chunk (streaming)
     */
    async recordAssistantChunk(content: string, isComplete: boolean = false): Promise<string> {
        const messageUuid = uuidv4();
        const entry: AssistantMessageEntry = {
            type: 'assistant',
            uuid: messageUuid,
            parentUuid: this.lastMessageUuid,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectPath: this.projectPath,
            message: {
                role: 'assistant',
                content,
                isComplete
            }
        };

        await this.writeEntry(entry);

        // Only update lastMessageUuid if this is the complete message
        if (isComplete) {
            this.lastMessageUuid = messageUuid;
            logDebug(`[ChatHistory] Recorded complete assistant message: ${messageUuid}`);
        } else {
            logDebug(`[ChatHistory] Recorded assistant chunk: ${messageUuid}`);
        }

        return messageUuid;
    }

    /**
     * Record a tool call
     */
    async recordToolCall(toolName: string, toolInput: unknown, toolCallId: string): Promise<string> {
        const toolUuid = uuidv4();
        const entry: ToolCallEntry = {
            type: 'tool_call',
            uuid: toolUuid,
            parentUuid: this.lastMessageUuid,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectPath: this.projectPath,
            toolName,
            toolInput,
            toolCallId
        };

        await this.writeEntry(entry);
        this.lastMessageUuid = toolUuid;
        logDebug(`[ChatHistory] Recorded tool call: ${toolName} (${toolUuid}, toolCallId: ${toolCallId})`);
        return toolUuid;
    }

    /**
     * Record a tool result
     */
    async recordToolResult(toolName: string, toolOutput: unknown, toolCallId: string): Promise<string> {
        const resultUuid = uuidv4();
        const entry: ToolResultEntry = {
            type: 'tool_result',
            uuid: resultUuid,
            parentUuid: this.lastMessageUuid,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectPath: this.projectPath,
            toolName,
            toolOutput,
            toolCallId
        };

        await this.writeEntry(entry);
        this.lastMessageUuid = resultUuid;
        logDebug(`[ChatHistory] Recorded tool result: ${toolName} (${resultUuid}, toolCallId: ${toolCallId})`);
        return resultUuid;
    }

    /**
     * Load conversation history from JSONL file
     * Returns array of entries in chronological order
     */
    static async loadSession(projectPath: string, sessionId: string): Promise<ConversationEntry[]> {
        try {
            const projectHash = this.hashProjectPath(projectPath);
            const sessionFile = path.join(BASE_STORAGE_DIR, projectHash, `${sessionId}.jsonl`);

            const content = await fs.readFile(sessionFile, 'utf8');
            const lines = content.trim().split('\n');
            const entries: ConversationEntry[] = [];

            for (const line of lines) {
                if (line.trim()) {
                    entries.push(JSON.parse(line));
                }
            }

            logInfo(`[ChatHistory] Loaded ${entries.length} entries from session: ${sessionId}`);
            return entries;
        } catch (error) {
            logError('[ChatHistory] Failed to load session', error);
            return [];
        }
    }

    /**
     * List all sessions for a project
     * Returns array of session IDs sorted by creation time (newest first)
     */
    static async listSessions(projectPath: string): Promise<string[]> {
        try {
            const projectHash = this.hashProjectPath(projectPath);
            const projectDir = path.join(BASE_STORAGE_DIR, projectHash);

            const files = await fs.readdir(projectDir);
            const sessionFiles = files
                .filter(file => file.endsWith('.jsonl'))
                .map(file => file.replace('.jsonl', ''));

            // Sort by file modification time (newest first)
            const sorted = await Promise.all(
                sessionFiles.map(async sessionId => {
                    const filePath = path.join(projectDir, `${sessionId}.jsonl`);
                    const stats = await fs.stat(filePath);
                    return { sessionId, mtime: stats.mtime.getTime() };
                })
            );

            sorted.sort((a, b) => b.mtime - a.mtime);
            return sorted.map(s => s.sessionId);
        } catch (error) {
            logError('[ChatHistory] Failed to list sessions', error);
            return [];
        }
    }

    /**
     * Delete a session file
     */
    static async deleteSession(projectPath: string, sessionId: string): Promise<void> {
        try {
            const projectHash = this.hashProjectPath(projectPath);
            const sessionFile = path.join(BASE_STORAGE_DIR, projectHash, `${sessionId}.jsonl`);
            await fs.unlink(sessionFile);
            logInfo(`[ChatHistory] Deleted session: ${sessionId}`);
        } catch (error) {
            logError('[ChatHistory] Failed to delete session', error);
            throw error;
        }
    }

    /**
     * Convert chat history entries to AI SDK ModelMessage format
     * Used to provide conversation context to the agent
     * 
     * IMPORTANT: For prompt caching to work correctly, tool calls must be
     * reconstructed with their exact toolCallIds. The AI SDK expects:
     * - Assistant messages with tool_call content parts (including toolCallId)
     * - Tool messages with matching toolCallId
     */
    static convertToModelMessages(entries: ConversationEntry[]): any[] {
        const messages: any[] = [];
        
        // Track pending tool calls to group with results
        const pendingToolCalls: Map<string, { toolName: string; toolInput: unknown; toolCallId: string }> = new Map();
        // Track assistant content that precedes tool calls
        let pendingAssistantContent: string = '';

        for (const entry of entries) {
            switch (entry.type) {
                case 'user':
                    // Flush any pending assistant content before user message
                    if (pendingAssistantContent) {
                        messages.push({
                            role: 'assistant',
                            content: pendingAssistantContent
                        });
                        pendingAssistantContent = '';
                    }
                    messages.push({
                        role: 'user',
                        content: entry.message.content
                    });
                    break;

                case 'assistant':
                    if (entry.message.isComplete) {
                        // Complete assistant message - add directly
                        messages.push({
                            role: 'assistant',
                            content: entry.message.content
                        });
                    } else {
                        // Incomplete chunk - accumulate for context
                        pendingAssistantContent += entry.message.content;
                    }
                    break;

                case 'tool_call':
                    // Store tool call for pairing with result
                    pendingToolCalls.set(entry.toolCallId, {
                        toolName: entry.toolName,
                        toolInput: entry.toolInput,
                        toolCallId: entry.toolCallId
                    });
                    
                    // Create assistant message with tool call
                    // Include any pending assistant content as text part
                    const toolCallParts: any[] = [];
                    if (pendingAssistantContent) {
                        toolCallParts.push({
                            type: 'text',
                            text: pendingAssistantContent
                        });
                        pendingAssistantContent = '';
                    }
                    toolCallParts.push({
                        type: 'tool-call',
                        toolCallId: entry.toolCallId,
                        toolName: entry.toolName,
                        input: entry.toolInput
                    });
                    
                    messages.push({
                        role: 'assistant',
                        content: toolCallParts
                    });
                    break;

                case 'tool_result':
                    // Create tool result message with matching toolCallId
                    // The output must be a ToolResultOutput type: { type: 'json', value: ... }
                    messages.push({
                        role: 'tool',
                        content: [{
                            type: 'tool-result',
                            toolCallId: entry.toolCallId,
                            toolName: entry.toolName,
                            output: {
                                type: 'json',
                                value: entry.toolOutput
                            }
                        }]
                    });
                    // Remove from pending
                    pendingToolCalls.delete(entry.toolCallId);
                    break;
            }
        }

        // Flush any remaining assistant content
        if (pendingAssistantContent) {
            messages.push({
                role: 'assistant',
                content: pendingAssistantContent
            });
        }

        return messages;
    }

    /**
     * Convert chat history entries to event format (similar to AgentEvent)
     * Frontend will format these events into UI messages with inline tool calls
     */
    static convertToEventFormat(entries: ConversationEntry[]): Array<{
        type: 'user' | 'assistant' | 'tool_call' | 'tool_result';
        content?: string;
        toolName?: string;
        toolInput?: unknown;
        toolOutput?: unknown;
        toolCallId?: string;
        action?: string;
        timestamp: string;
    }> {
        const events: Array<{
            type: 'user' | 'assistant' | 'tool_call' | 'tool_result';
            content?: string;
            toolName?: string;
            toolInput?: unknown;
            toolOutput?: unknown;
            toolCallId?: string;
            action?: string;
            timestamp: string;
        }> = [];

        let pendingToolCall: { name: string; input: unknown; toolCallId: string; timestamp: string } | null = null;

        for (const entry of entries) {
            switch (entry.type) {
                case 'user':
                    events.push({
                        type: 'user',
                        content: entry.message.content,
                        timestamp: entry.timestamp
                    });
                    break;

                case 'assistant':
                    // Send assistant content chunks (frontend handles assembly)
                    if (entry.message.content) {
                        events.push({
                            type: 'assistant',
                            content: entry.message.content,
                            timestamp: entry.timestamp
                        });
                    }
                    break;

                case 'tool_call':
                    // Store tool call info and send event
                    pendingToolCall = {
                        name: entry.toolName,
                        input: entry.toolInput,
                        toolCallId: entry.toolCallId,
                        timestamp: entry.timestamp
                    };

                    events.push({
                        type: 'tool_call',
                        toolName: entry.toolName,
                        toolInput: entry.toolInput,
                        toolCallId: entry.toolCallId,
                        timestamp: entry.timestamp
                    });
                    break;

                case 'tool_result':
                    if (pendingToolCall && pendingToolCall.toolCallId === entry.toolCallId) {
                        // Calculate user-friendly action from shared utility
                        const output = entry.toolOutput as any;
                        const toolActions = getToolAction(entry.toolName, output, pendingToolCall.input);

                        let action: string;
                        if (output?.success === false && toolActions?.failed) {
                            action = capitalizeAction(toolActions.failed);
                        } else if (toolActions?.completed) {
                            action = capitalizeAction(toolActions.completed);
                        } else {
                            action = `Executed ${entry.toolName}`;
                        }

                        events.push({
                            type: 'tool_result',
                            toolName: entry.toolName,
                            toolInput: pendingToolCall.input,
                            toolOutput: entry.toolOutput,
                            toolCallId: entry.toolCallId,
                            action,
                            timestamp: entry.timestamp
                        });

                        pendingToolCall = null;
                    }
                    break;
            }
        }

        return events;
    }

    /**
     * Hash project path for filesystem safety
     * Uses simple encoding similar to Claude Code
     */
    private static hashProjectPath(projectPath: string): string {
        // Encode path by replacing slashes and special chars
        return projectPath
            .replace(/\\/g, '-')  // Windows backslashes
            .replace(/\//g, '-')  // Unix forward slashes
            .replace(/:/g, '')    // Windows drive letters
            .replace(/^-/, '');   // Remove leading dash
    }

    /**
     * Get session ID
     */
    getSessionId(): string {
        return this.sessionId;
    }

    /**
     * Get session file path
     */
    getSessionFile(): string {
        return this.sessionFile;
    }

    /**
     * Get project path
     */
    getProjectPath(): string {
        return this.projectPath;
    }
}
