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
}

/**
 * Tool result entry
 */
export interface ToolResultEntry extends JSONLEntry {
    type: 'tool_result';
    toolName: string;
    toolOutput: unknown;
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
    async recordToolCall(toolName: string, toolInput: unknown): Promise<string> {
        const toolUuid = uuidv4();
        const entry: ToolCallEntry = {
            type: 'tool_call',
            uuid: toolUuid,
            parentUuid: this.lastMessageUuid,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectPath: this.projectPath,
            toolName,
            toolInput
        };

        await this.writeEntry(entry);
        this.lastMessageUuid = toolUuid;
        logDebug(`[ChatHistory] Recorded tool call: ${toolName} (${toolUuid})`);
        return toolUuid;
    }

    /**
     * Record a tool result
     */
    async recordToolResult(toolName: string, toolOutput: unknown): Promise<string> {
        const resultUuid = uuidv4();
        const entry: ToolResultEntry = {
            type: 'tool_result',
            uuid: resultUuid,
            parentUuid: this.lastMessageUuid,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectPath: this.projectPath,
            toolName,
            toolOutput
        };

        await this.writeEntry(entry);
        this.lastMessageUuid = resultUuid;
        logDebug(`[ChatHistory] Recorded tool result: ${toolName} (${resultUuid})`);
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
     * Convert chat history entries to UI format
     * Reconstructs the conversation from JSONL entries
     */
    static convertToUIFormat(entries: ConversationEntry[]): Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: string;
        toolCalls?: Array<{ name: string; input: unknown; output: unknown }>;
    }> {
        const messages: Array<{
            role: 'user' | 'assistant';
            content: string;
            timestamp: string;
            toolCalls?: Array<{ name: string; input: unknown; output: unknown }>;
        }> = [];

        let currentMessage: any = null;
        let currentToolCalls: Array<{ name: string; input: unknown; output?: unknown }> = [];

        for (const entry of entries) {
            switch (entry.type) {
                case 'user':
                    messages.push({
                        role: 'user',
                        content: entry.message.content,
                        timestamp: entry.timestamp
                    });
                    break;

                case 'assistant':
                    if (entry.message.isComplete) {
                        // Complete assistant message
                        if (currentMessage) {
                            // Flush previous message if any
                            messages.push(currentMessage);
                        }
                        currentMessage = {
                            role: 'assistant',
                            content: entry.message.content,
                            timestamp: entry.timestamp,
                            toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined
                        };
                        currentToolCalls = [];
                    } else {
                        // Streaming chunk - accumulate content
                        if (!currentMessage) {
                            currentMessage = {
                                role: 'assistant',
                                content: entry.message.content,
                                timestamp: entry.timestamp,
                                toolCalls: []
                            };
                        } else {
                            currentMessage.content += entry.message.content;
                        }
                    }
                    break;

                case 'tool_call':
                    currentToolCalls.push({
                        name: entry.toolName,
                        input: entry.toolInput
                    });
                    break;

                case 'tool_result':
                    // Find matching tool call and add output
                    const toolCall = currentToolCalls.find(tc => tc.name === entry.toolName && !tc.output);
                    if (toolCall) {
                        toolCall.output = entry.toolOutput;
                    }
                    break;
            }
        }

        // Flush last message if any
        if (currentMessage) {
            messages.push(currentMessage);
        }

        return messages;
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
