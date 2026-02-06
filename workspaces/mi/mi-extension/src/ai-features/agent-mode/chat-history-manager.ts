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
import { BASH_TOOL_NAME } from './tools/types';

// Storage location: <project>/.mi-copilot/<session_id>/history.jsonl
// Metadata location: <project>/.mi-copilot/<session_id>/metadata.json

/**
 * Session metadata stored in metadata.json
 * Re-exported from @wso2/mi-core after build
 */
export interface SessionMetadata {
    sessionId: string;
    /** First user message (truncated to 50 chars) */
    title: string;
    /** ISO timestamp of session creation */
    createdAt: string;
    /** ISO timestamp of last modification (updated on each message) */
    lastModifiedAt: string;
    /** Total messages in session */
    messageCount: number;
}

/**
 * Session summary for UI list display
 */
export interface SessionSummary {
    sessionId: string;
    title: string;
    createdAt: string;
    lastModifiedAt: string;
    messageCount: number;
    isCurrentSession: boolean;
}

/**
 * Time-grouped sessions for UI display
 */
export interface GroupedSessions {
    today: SessionSummary[];
    yesterday: SessionSummary[];
    pastWeek: SessionSummary[];
    older: SessionSummary[];
}

/**
 * JSONL entry for session start/end markers
 * Different from SessionMetadata which is stored in metadata.json
 */
export interface SessionJSONLEntry {
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
 * JSONL entry: either a ModelMessage or session JSONL entry
 * ModelMessages are stored directly as returned by AI SDK
 */
export type JSONLEntry = any | SessionJSONLEntry;

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
 * Metadata: <project>/.mi-copilot/<session-id>/metadata.json
 */
export class ChatHistoryManager {
    private projectPath: string;
    private sessionId: string;
    private sessionFile: string = '';
    private metadataFile: string = '';
    private writeStream: WriteStream | null = null;

    constructor(projectPath: string, sessionId?: string) {
        this.projectPath = projectPath;
        this.sessionId = sessionId || uuidv4();
    }

    /**
     * Initialize the chat history manager
     * Creates necessary directories, opens write stream, and manages metadata
     */
    async initialize(): Promise<void> {
        try {
            // Create session directory: <project>/.mi-copilot/<session-id>/
            const sessionDir = path.join(this.projectPath, '.mi-copilot', this.sessionId);
            await fs.mkdir(sessionDir, { recursive: true });

            // Session file path: <project>/.mi-copilot/<session-id>/history.jsonl
            this.sessionFile = path.join(sessionDir, 'history.jsonl');
            // Metadata file path: <project>/.mi-copilot/<session-id>/metadata.json
            this.metadataFile = path.join(sessionDir, 'metadata.json');

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

            // Write session start entry and create metadata (only if new session)
            if (isNewSession) {
                await this.writeSessionStart();
                await this.createInitialMetadata();
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
        const entry: SessionJSONLEntry = {
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
        const entry: SessionJSONLEntry = {
            type: 'session_end',
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            projectPath: this.projectPath
        };

        await this.writeEntry(entry);
    }

    // ============================================================================
    // Metadata Management
    // ============================================================================

    /**
     * Create initial metadata for a new session
     */
    private async createInitialMetadata(): Promise<void> {
        const now = new Date().toISOString();
        const metadata: SessionMetadata = {
            sessionId: this.sessionId,
            title: 'New Chat',
            createdAt: now,
            lastModifiedAt: now,
            messageCount: 0
        };

        await this.saveMetadata(metadata);
        logDebug(`[ChatHistory] Created initial metadata for session: ${this.sessionId}`);
    }

    /**
     * Save metadata to metadata.json
     */
    async saveMetadata(metadata: SessionMetadata): Promise<void> {
        try {
            await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2));
        } catch (error) {
            logError('[ChatHistory] Failed to save metadata', error);
            throw error;
        }
    }

    /**
     * Load metadata from metadata.json
     */
    async loadMetadata(): Promise<SessionMetadata | null> {
        try {
            const content = await fs.readFile(this.metadataFile, 'utf8');
            return JSON.parse(content) as SessionMetadata;
        } catch {
            // Metadata file doesn't exist or is invalid
            return null;
        }
    }

    /**
     * Update metadata with new values
     */
    async updateMetadata(updates: Partial<SessionMetadata>): Promise<void> {
        const metadata = await this.loadMetadata();
        if (metadata) {
            const updated = { ...metadata, ...updates, lastModifiedAt: new Date().toISOString() };
            await this.saveMetadata(updated);
        }
    }

    /**
     * Update session title from first user message (if not already set)
     */
    async updateTitleFromMessage(messageContent: string): Promise<void> {
        const metadata = await this.loadMetadata();
        if (metadata && metadata.title === 'New Chat') {
            const title = ChatHistoryManager.extractTitle(messageContent);
            await this.updateMetadata({ title });
            logDebug(`[ChatHistory] Updated session title: ${title}`);
        }
    }

    /**
     * Increment message count in metadata
     */
    private async incrementMessageCount(): Promise<void> {
        const metadata = await this.loadMetadata();
        if (metadata) {
            await this.updateMetadata({ messageCount: metadata.messageCount + 1 });
        }
    }

    /**
     * Extract title from user message content
     * Strips <USER_QUERY> tags and truncates to 50 chars
     */
    static extractTitle(messageContent: string): string {
        let content = messageContent;

        // Extract content between <USER_QUERY> tags if present
        const queryMatch = content.match(/<USER_QUERY>\s*([\s\S]*?)\s*<\/USER_QUERY>/);
        if (queryMatch && queryMatch[1]) {
            content = queryMatch[1].trim();
        }

        // Handle array content (for multi-part messages)
        if (content.startsWith('[')) {
            try {
                const parts = JSON.parse(content);
                if (Array.isArray(parts)) {
                    content = parts
                        .filter((p: any) => p.type === 'text')
                        .map((p: any) => p.text)
                        .join(' ');
                }
            } catch {
                // Not JSON, use as-is
            }
        }

        // Clean up and truncate
        content = content.trim().replace(/\s+/g, ' ');
        if (content.length > 50) {
            content = content.substring(0, 47) + '...';
        }

        return content || 'New Chat';
    }

    // ============================================================================
    // Public API - Simple Methods
    // ============================================================================

    /**
     * Save a message to history (JSONL file only)
     * System messages are never saved (they're recreated fresh each time)
     * Also updates metadata (message count, title for first user message)
     *
     * @param message - ModelMessage from AI SDK
     */
    async saveMessage(message: any): Promise<void> {
        try {
            // Write to JSONL
            await this.writeEntry(message);

            // Update metadata
            await this.incrementMessageCount();

            // Update title from first user message
            if (message.role === 'user') {
                const content = typeof message.content === 'string'
                    ? message.content
                    : Array.isArray(message.content)
                        ? message.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ')
                        : '';
                await this.updateTitleFromMessage(content);
            }
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
     * Save an interruption message when user aborts the request
     * This helps the LLM understand in the next session that the previous request was interrupted
     * Following Claude Code's pattern for handling user interruptions
     *
     * @param wasToolUse - Whether the interruption happened during tool use
     */
    async saveInterruptionMessage(wasToolUse: boolean = false): Promise<void> {
        const interruptionText = wasToolUse
            ? '[Request interrupted by user during tool use]'
            : '[Request interrupted by user]';

        const interruptionMessage = {
            role: 'user',
            content: [{
                type: 'text',
                text: interruptionText,
            }]
        };

        try {
            await this.writeEntry(interruptionMessage);
            logDebug(`[ChatHistory] Saved interruption message: ${interruptionText}`);
        } catch (error) {
            logError('[ChatHistory] Failed to save interruption message', error);
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
     * Truncates the file and resets message count and metadata
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

            // Reset metadata
            await this.createInitialMetadata();

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
     * Get session summary for a single session
     * Handles backward compatibility for sessions without metadata.json
     */
    static async getSessionSummary(projectPath: string, sessionId: string, currentSessionId?: string): Promise<SessionSummary | null> {
        const sessionDir = path.join(projectPath, '.mi-copilot', sessionId);
        const metadataPath = path.join(sessionDir, 'metadata.json');
        const historyPath = path.join(sessionDir, 'history.jsonl');

        try {
            // Try to load existing metadata
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata: SessionMetadata = JSON.parse(metadataContent);
            return {
                sessionId: metadata.sessionId,
                title: metadata.title,
                createdAt: metadata.createdAt,
                lastModifiedAt: metadata.lastModifiedAt,
                messageCount: metadata.messageCount,
                isCurrentSession: sessionId === currentSessionId
            };
        } catch {
            // Fallback: extract from JSONL and directory stats
            try {
                const stats = await fs.stat(sessionDir);
                let title = 'New Chat';
                let messageCount = 0;

                try {
                    const content = await fs.readFile(historyPath, 'utf8');
                    const lines = content.trim().split('\n');

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const entry = JSON.parse(line);
                            // Find first user message for title
                            if (entry.role === 'user' && entry.content && title === 'New Chat') {
                                const msgContent = typeof entry.content === 'string'
                                    ? entry.content
                                    : Array.isArray(entry.content)
                                        ? entry.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ')
                                        : '';
                                title = ChatHistoryManager.extractTitle(msgContent);
                            }
                            // Count non-metadata entries
                            if (entry.role && entry.type !== 'session_start' && entry.type !== 'session_end') {
                                messageCount++;
                            }
                        } catch {
                            // Skip invalid lines
                        }
                    }
                } catch {
                    // Empty or missing history
                }

                return {
                    sessionId,
                    title,
                    createdAt: stats.birthtime.toISOString(),
                    lastModifiedAt: stats.mtime.toISOString(),
                    messageCount,
                    isCurrentSession: sessionId === currentSessionId
                };
            } catch {
                // Session directory doesn't exist
                return null;
            }
        }
    }

    /**
     * List all sessions with metadata, grouped by time
     */
    static async listSessionsWithMetadata(projectPath: string, currentSessionId?: string): Promise<GroupedSessions> {
        const sessionIds = await ChatHistoryManager.listSessions(projectPath);
        const summaries: SessionSummary[] = [];

        for (const sessionId of sessionIds) {
            const summary = await ChatHistoryManager.getSessionSummary(projectPath, sessionId, currentSessionId);
            if (summary) {
                summaries.push(summary);
            }
        }

        // Group by time
        return ChatHistoryManager.groupSessionsByTime(summaries);
    }

    /**
     * Group sessions by time (today, yesterday, past week, older)
     */
    private static groupSessionsByTime(sessions: SessionSummary[]): GroupedSessions {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const pastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const grouped: GroupedSessions = {
            today: [],
            yesterday: [],
            pastWeek: [],
            older: []
        };

        for (const session of sessions) {
            const lastModified = new Date(session.lastModifiedAt);

            if (lastModified >= today) {
                grouped.today.push(session);
            } else if (lastModified >= yesterday) {
                grouped.yesterday.push(session);
            } else if (lastModified >= pastWeek) {
                grouped.pastWeek.push(session);
            } else {
                grouped.older.push(session);
            }
        }

        // Sort each group by lastModifiedAt descending (most recent first)
        const sortByRecent = (a: SessionSummary, b: SessionSummary) =>
            new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime();

        grouped.today.sort(sortByRecent);
        grouped.yesterday.sort(sortByRecent);
        grouped.pastWeek.sort(sortByRecent);
        grouped.older.sort(sortByRecent);

        return grouped;
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
        // Track tool inputs by toolCallId for bash output display
        const toolInputMap = new Map<string, any>();

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

                    // Skip interruption messages from UI display (they're only for LLM context)
                    // These are saved when user aborts a request
                    if (userContent.includes('[Request interrupted by user')) {
                        continue;
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
                                // Store tool input for later use in tool_result
                                if (part.toolCallId) {
                                    toolInputMap.set(part.toolCallId, part.input);
                                }
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
                                const toolInput = toolInputMap.get(part.toolCallId);
                                const toolActions = getToolAction(part.toolName, output, toolInput);

                                let action = 'Executed ' + part.toolName;
                                if (output?.success === false && toolActions?.failed) {
                                    action = capitalizeAction(toolActions.failed);
                                } else if (toolActions?.completed) {
                                    action = capitalizeAction(toolActions.completed);
                                }

                                const event: any = {
                                    type: 'tool_result',
                                    toolName: part.toolName,
                                    toolOutput: output,
                                    toolCallId: part.toolCallId,
                                    action,
                                    timestamp
                                };

                                // Add bash-specific fields for bash tool
                                if (part.toolName === BASH_TOOL_NAME && toolInput) {
                                    event.bashCommand = toolInput.command;
                                    event.bashDescription = toolInput.description;
                                    event.bashStdout = output?.stdout || output?.message;
                                    event.bashExitCode = output?.exitCode ?? 0;
                                }

                                events.push(event);
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
