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
import { canonicalizeMessage } from '../cache-utils';

// Cross-platform home directory
const os = require('os');
const homeDir = os.homedir();

// Storage location: ~/.wso2-mi/copilot/projects/<projectpath>/<session_id>.jsonl
const BASE_STORAGE_DIR = path.join(homeDir, '.wso2-mi', 'copilot', 'projects');

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
 * Similar to Claude Code's approach
 * 
 * Uses canonical JSON serialization for byte-for-byte consistency
 * which is required for Anthropic prompt caching to work correctly.
 * 
 * IMPORTANT: For active sessions, we keep ModelMessages in memory to ensure
 * cache key consistency. JSONL is used for persistence across extension restarts.
 */
export class ChatHistoryManager {
    private projectPath: string;
    private projectHash: string;
    private sessionId: string;
    private sessionFile: string = '';
    private writeStream: WriteStream | null = null;

    /**
     * In-memory ModelMessages for the current session.
     * These are the EXACT messages returned by the AI SDK, preserving cache keys.
     * Updated incrementally as messages are recorded to JSONL.
     */
    private inMemoryMessages: any[] = [];

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
            const line = canonicalizeMessage(message) + '\n';
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

    /**
     * Record a ModelMessage to JSONL and in-memory store
     * Called incrementally as new messages arrive from SDK
     *
     * @param message - Exact ModelMessage from AI SDK
     */
    async recordMessage(message: any): Promise<void> {
        try {
            // Write to JSONL
            await this.writeEntry(message);

            // Append to in-memory store
            this.inMemoryMessages.push(message);

            logDebug(`[ChatHistory] Recorded ${message.role} message (${this.inMemoryMessages.length} total)`);
        } catch (error) {
            logError('[ChatHistory] Failed to record message', error);
            throw error;
        }
    }

    /**
     * Record multiple ModelMessages at once (batch)
     * Used after each step to record all new messages
     *
     * @param messages - New ModelMessages from step
     */
    async recordMessages(messages: any[]): Promise<void> {
        for (const message of messages) {
            await this.recordMessage(message);
        }
        logDebug(`[ChatHistory] Recorded ${messages.length} messages`);
    }

    /**
     * Load conversation messages from JSONL file
     * Returns exact ModelMessages (no reconstruction needed)
     */
    static async loadSession(projectPath: string, sessionId: string): Promise<any[]> {
        try {
            const projectHash = this.hashProjectPath(projectPath);
            const sessionFile = path.join(BASE_STORAGE_DIR, projectHash, `${sessionId}.jsonl`);

            const content = await fs.readFile(sessionFile, 'utf8');
            const lines = content.trim().split('\n');
            const messages: any[] = [];

            for (const line of lines) {
                if (line.trim()) {
                    const entry = JSON.parse(line);
                    // Skip session metadata entries
                    if (entry.type !== 'session_start' && entry.type !== 'session_end') {
                        messages.push(entry);  // Direct ModelMessage
                    }
                }
            }

            logInfo(`[ChatHistory] Loaded ${messages.length} messages from session: ${sessionId}`);
            return messages;
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
                    events.push({
                        type: 'user',
                        content: msg.content,
                        timestamp
                    });
                    break;

                case 'assistant':
                    // Handle text and tool-call content parts
                    if (typeof msg.content === 'string') {
                        events.push({
                            type: 'assistant',
                            content: msg.content,
                            timestamp
                        });
                    } else if (Array.isArray(msg.content)) {
                        for (const part of msg.content) {
                            if (part.type === 'text') {
                                events.push({
                                    type: 'assistant',
                                    content: part.text,
                                    timestamp
                                });
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

    // ============================================================================
    // In-Memory Message Methods (for prompt caching)
    // ============================================================================

    /**
     * Set the in-memory messages from loaded session.
     * Used when loading from JSONL on session resume.
     *
     * @param messages - The ModelMessage array from JSONL
     */
    setInMemoryMessages(messages: any[]): void {
        this.inMemoryMessages = messages;
        logDebug(`[ChatHistory] Set ${messages.length} in-memory messages`);
    }

    /**
     * Get in-memory messages.
     * Returns current in-memory messages (updated incrementally via recordMessage).
     *
     * @returns The in-memory ModelMessage array, or null if empty
     */
    getInMemoryMessages(): any[] | null {
        if (this.inMemoryMessages.length > 0) {
            logDebug(`[ChatHistory] Returning ${this.inMemoryMessages.length} in-memory messages`);
            return this.inMemoryMessages;
        }
        return null;
    }

    /**
     * Clear in-memory messages (e.g., when starting a new session).
     */
    clearInMemoryMessages(): void {
        this.inMemoryMessages = [];
        logDebug('[ChatHistory] Cleared in-memory messages');
    }
}
