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

// Storage location: <project>/.mi-copilot/<session_id>/history.jsonl

/**
 * Metadata entry for session start/end
 */
export interface SessionMetadata {
    type: 'session_start' | 'session_end';
    timestamp: string;
    sessionId: string;
    projectPath: string;
    metadata?: {
        projectName?: string;
        gitBranch?: string;
    };
}

/**
 * JSONL entry: either a ModelMessage or session metadata
 * ModelMessages are stored directly as returned by AI SDK
 */
export type JSONLEntry = any | SessionMetadata;

/**
 * Chat History Manager
 * Handles saving and loading conversation history in JSONL format
 *
 * Uses canonical JSON serialization for byte-for-byte consistency
 * which is required for Anthropic prompt caching to work correctly.
 *
 * JSONL file is the single source of truth - no in-memory caching.
 * Public API is simple: saveMessage() and getMessages()
 *
 * Storage: <project>/.mi-copilot/<session-id>/history.jsonl
 */
export class ChatHistoryManager {
    private projectPath: string;
    private sessionId: string;
    private sessionFile: string = '';
    private writeStream: WriteStream | null = null;

    constructor(projectPath: string, sessionId?: string) {
        this.projectPath = projectPath;
        this.sessionId = sessionId || uuidv4();
    }

    /**
     * Initialize the chat history manager
     * Creates necessary directories and opens write stream
     */
    async initialize(): Promise<void> {
        try {
            // Create session directory: <project>/.mi-copilot/<session-id>/
            const sessionDir = path.join(this.projectPath, '.mi-copilot', this.sessionId);
            await fs.mkdir(sessionDir, { recursive: true });

            // Session file path: <project>/.mi-copilot/<session-id>/history.jsonl
            this.sessionFile = path.join(sessionDir, 'history.jsonl');

            // Check if session file exists
            let isNewSession = true;
            try {
                await fs.access(this.sessionFile);
                // File exists
                isNewSession = false;
                logInfo(`[ChatHistory] Resuming existing session`);
            } catch {
                // File doesn't exist, start fresh
                logInfo('[ChatHistory] Starting new session');
            }

            // Open write stream for appending
            this.writeStream = createWriteStream(this.sessionFile, { flags: 'a' });

            logInfo(`[ChatHistory] Initialized for project: ${this.projectPath}`);
            logDebug(`[ChatHistory] Session file: ${this.sessionFile}`);

            // Write session start entry (only if new session)
            if (isNewSession) {
                await this.writeSessionStart();
            }
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
     * Write a JSONL entry to the file using canonical JSON
     * Canonical JSON ensures byte-for-byte consistency for cache key matching
     */
    private async writeEntry(message: any): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.writeStream) {
                reject(new Error('Write stream not initialized'));
                return;
            }

            // Use canonical JSON for cache key consistency
            const line = JSON.stringify(message) + '\n';
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
        const entry: SessionMetadata = {
            type: 'session_start',
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectPath: this.projectPath,
            metadata: {
                projectName: path.basename(this.projectPath),
                // TODO: Get git branch from workspace
            }
        };

        await this.writeEntry(entry);
    }

    /**
     * Write session end entry
     */
    private async writeSessionEnd(): Promise<void> {
        const entry: SessionMetadata = {
            type: 'session_end',
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectPath: this.projectPath
        };

        await this.writeEntry(entry);
    }

    // ============================================================================
    // Public API - Simple Methods
    // ============================================================================

    /**
     * Save a message to history (JSONL file only)
     * System messages are never saved (they're recreated fresh each time)
     *
     * @param message - ModelMessage from AI SDK
     */
    async saveMessage(message: any): Promise<void> {
        try {
            // Write to JSONL
            await this.writeEntry(message);
        } catch (error) {
            logError('[ChatHistory] Failed to save message', error);
            throw error;
        }
    }

    /**
     * Save multiple messages at once (batch operation)
     * Caller is responsible for filtering out already-saved messages
     *
     * @param messages - ModelMessages from AI SDK (only new messages to save)
     */
    async saveMessages(messages: any[]): Promise<void> {
        if (messages.length === 0) {
            return;
        }

        for (const message of messages) {
            await this.saveMessage(message);
        }
    }

    /**
     * Get all messages for the current session
     * Reads directly from JSONL file (single source of truth)
     *
     * @returns Array of ModelMessages
     */
    async getMessages(): Promise<any[]> {
        try {
            const content = await fs.readFile(this.sessionFile, 'utf8');
            const lines = content.trim().split('\n');
            const messages: any[] = [];

            for (const line of lines) {
                if (line.trim()) {
                    const entry = JSON.parse(line);
                    // Skip session metadata, only return messages
                    if (entry.type !== 'session_start' && entry.type !== 'session_end') {
                        messages.push(entry);
                    }
                }
            }
            return messages;
        } catch (error) {
            logError('[ChatHistory] Failed to read messages', error);
            return [];
        }
    }

    /**
     * Clear all messages from the current session
     * Useful for starting fresh
     * Truncates the file and resets message count
     */
    async clearMessages(): Promise<void> {
        try {
            // Close existing stream
            if (this.writeStream) {
                await new Promise<void>((resolve, reject) => {
                    this.writeStream!.end((err: Error | null | undefined) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            // Truncate the file
            await fs.writeFile(this.sessionFile, '');

            // Reopen write stream
            this.writeStream = createWriteStream(this.sessionFile, { flags: 'a' });

            // Write new session start
            await this.writeSessionStart();
            logDebug('[ChatHistory] Cleared all messages');
        } catch (error) {
            logError('[ChatHistory] Failed to clear messages', error);
            throw error;
        }
    }

    /**
     * List all sessions for a project
     * Returns array of session IDs sorted by creation time (newest first)
     */
    static async listSessions(projectPath: string): Promise<string[]> {
        try {
            const copilotDir = path.join(projectPath, '.mi-copilot');

            const entries = await fs.readdir(copilotDir, { withFileTypes: true });
            const sessionDirs = entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);

            // Sort by directory modification time (newest first)
            const sorted = await Promise.all(
                sessionDirs.map(async sessionId => {
                    const dirPath = path.join(copilotDir, sessionId);
                    const stats = await fs.stat(dirPath);
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
            const sessionDir = path.join(projectPath, '.mi-copilot', sessionId);
            // Delete the entire session directory recursively
            await fs.rm(sessionDir, { recursive: true, force: true });
            logInfo(`[ChatHistory] Deleted session: ${sessionId}`);
        } catch (error) {
            logError('[ChatHistory] Failed to delete session', error);
            throw error;
        }
    }


    /**
     * Convert ModelMessages to UI event format
     * Generates events on-the-fly from in-memory messages
     *
     * @param messages - ModelMessages from JSONL or memory
     * @returns UI events for display
     */
    static convertToEventFormat(messages: any[]): Array<{
        type: 'user' | 'assistant' | 'tool_call' | 'tool_result';
        content?: string;
        toolName?: string;
        toolInput?: unknown;
        toolOutput?: unknown;
        toolCallId?: string;
        action?: string;
        timestamp: string;
    }> {
        const events: any[] = [];

        for (const msg of messages) {
            const timestamp = new Date().toISOString();  // Could store timestamps if needed

            switch (msg.role) {
                case 'user':
                    // User content can be string or array of content parts
                    let userContent = '';
                    if (typeof msg.content === 'string') {
                        userContent = msg.content;
                    } else if (Array.isArray(msg.content)) {
                        // Extract text from content parts
                        userContent = msg.content
                            .filter((part: any) => part.type === 'text')
                            .map((part: any) => part.text)
                            .join('');
                    }

                    // Extract content between <USER_QUERY> tags (user's actual query)
                    const queryMatch = userContent.match(/<USER_QUERY>\s*([\s\S]*?)\s*<\/USER_QUERY>/);
                    if (queryMatch && queryMatch[1]) {
                        userContent = queryMatch[1].trim();
                    }

                    events.push({
                        type: 'user',
                        content: userContent,
                        timestamp
                    });
                    break;

                case 'assistant':
                    // Handle text and tool-call content parts
                    if (typeof msg.content === 'string') {
                        // Simple string content (only add if not empty)
                        if (msg.content.trim()) {
                            events.push({
                                type: 'assistant',
                                content: msg.content,
                                timestamp
                            });
                        }
                    } else if (Array.isArray(msg.content)) {
                        // Array of content parts (text and tool-calls)
                        for (const part of msg.content) {
                            if (part.type === 'text') {
                                // Only add non-empty text
                                if (part.text && part.text.trim()) {
                                    events.push({
                                        type: 'assistant',
                                        content: part.text,
                                        timestamp
                                    });
                                }
                            } else if (part.type === 'tool-call') {
                                events.push({
                                    type: 'tool_call',
                                    toolName: part.toolName,
                                    toolInput: part.input,
                                    toolCallId: part.toolCallId,
                                    timestamp
                                });
                            }
                        }
                    }
                    break;

                case 'tool':
                    // Tool results
                    if (Array.isArray(msg.content)) {
                        for (const part of msg.content) {
                            if (part.type === 'tool-result') {
                                const output = part.output?.value || part.output;
                                const toolActions = getToolAction(part.toolName, output, undefined);

                                let action = 'Executed ' + part.toolName;
                                if (output?.success === false && toolActions?.failed) {
                                    action = capitalizeAction(toolActions.failed);
                                } else if (toolActions?.completed) {
                                    action = capitalizeAction(toolActions.completed);
                                }

                                events.push({
                                    type: 'tool_result',
                                    toolName: part.toolName,
                                    toolOutput: output,
                                    toolCallId: part.toolCallId,
                                    action,
                                    timestamp
                                });
                            }
                        }
                    }
                    break;
            }
        }

        return events;
    }

    // ============================================================================
    // Utility Methods
    // ============================================================================

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
