/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { AgentMode, UndoCheckpointSummary } from '@wso2/mi-core';
import { getCopilotProjectStorageDir, getCopilotSessionDir } from './storage-paths';

// Storage location: ~/.wso2-mi/copilot/projects/<encoded-project>/<session_id>/history.jsonl
// Metadata location: ~/.wso2-mi/copilot/projects/<encoded-project>/<session_id>/metadata.json

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
    /**
     * Session storage version written by this release.
     * Used to skip loading unsupported sessions after breaking storage changes.
     */
    sessionVersion?: number;
}

export const TOOL_USE_INTERRUPTION_CONTEXT = `The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.`;

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
 * Session storage version for compatibility checks.
 * Increase this only when introducing breaking changes to persisted session data.
 */
export const SESSION_STORAGE_VERSION = 1;

/**
 * JSONL entry format (Claude Code style).
 * Every line in the JSONL file is a JournalEntry.
 * Model messages are stored in the `message` field; metadata lives at the top level.
 * Usage data (totalInputTokens) is attached to the last message entry of each step.
 */
export interface JournalEntry {
    /** Entry type: message role for model messages, or a special marker */
    type: 'user' | 'assistant' | 'tool' | 'session_start' | 'session_end' | 'compact_summary' | 'mode_change' | 'undo_checkpoint';
    /** The model message (for user/assistant/tool entries) */
    message?: any;
    /** Stable UI chat id for grouping a user turn and assistant output */
    chatId?: number;
    /** ISO timestamp */
    timestamp: string;
    /** Session ID */
    sessionId: string;
    /** Project path (session_start / session_end) */
    projectPath?: string;
    /** Session metadata (session_start) */
    metadata?: {
        projectName?: string;
        gitBranch?: string;
    };
    /** Summary content (compact_summary) */
    summary?: string;
    /** Mode value (mode_change) */
    mode?: AgentMode;
    /** Undo checkpoint summary (undo_checkpoint) */
    undoCheckpoint?: UndoCheckpointSummary;
    /** Assistant chat id this undo checkpoint belongs to (undo_checkpoint) */
    targetChatId?: number;
    /** Total input tokens — attached to last message entry of each agent step */
    totalInputTokens?: number;
    /** Lightweight attachment metadata for user messages (for UI replay) */
    attachmentMetadata?: {
        files?: Array<{ name: string; mimetype: string }>;
        images?: Array<{ imageName: string }>;
    };
}

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
 * Storage: ~/.wso2-mi/copilot/projects/<encoded-project>/<session-id>/history.jsonl
 * Metadata: ~/.wso2-mi/copilot/projects/<encoded-project>/<session-id>/metadata.json
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
     * Returns true when the session metadata is compatible with the current history schema.
     * Sessions without a metadata version are treated as legacy-compatible.
     */
    static isCompatibleSessionVersion(version: unknown): boolean {
        if (version === undefined) {
            return true;
        }
        return version === SESSION_STORAGE_VERSION;
    }

    /**
     * Check whether a session can be safely loaded with the current history schema.
     */
    static async isSessionCompatible(projectPath: string, sessionId: string): Promise<boolean> {
        const metadataPath = path.join(getCopilotSessionDir(projectPath, sessionId), 'metadata.json');
        try {
            const content = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(content) as SessionMetadata;
            return ChatHistoryManager.isCompatibleSessionVersion(metadata.sessionVersion);
        } catch {
            // Missing/invalid metadata is treated as legacy-compatible; per-entry guards still apply.
            return true;
        }
    }

    /**
     * Initialize the chat history manager
     * Creates necessary directories, opens write stream, and manages metadata
     */
    async initialize(): Promise<void> {
        try {
            // Create session directory: ~/.wso2-mi/copilot/projects/<encoded-project>/<session-id>/
            const sessionDir = getCopilotSessionDir(this.projectPath, this.sessionId);
            await fs.mkdir(sessionDir, { recursive: true });

            // Session file path
            this.sessionFile = path.join(sessionDir, 'history.jsonl');
            // Metadata file path
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

            if (!isNewSession) {
                const isCompatible = await ChatHistoryManager.isSessionCompatible(this.projectPath, this.sessionId);
                if (!isCompatible) {
                    throw new Error(
                        `Session ${this.sessionId} has incompatible session version (expected ${SESSION_STORAGE_VERSION})`
                    );
                }
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
        const entry: JournalEntry = {
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
        const entry: JournalEntry = {
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
            messageCount: 0,
            sessionVersion: SESSION_STORAGE_VERSION,
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
            const metadata = JSON.parse(content) as SessionMetadata;
            if (metadata.sessionVersion === undefined) {
                return {
                    ...metadata,
                    sessionVersion: SESSION_STORAGE_VERSION,
                };
            }
            return metadata;
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
     * Strips <user_query> tags and truncates to 50 chars
     */
    static extractTitle(messageContent: string): string {
        let content = messageContent;

        // Extract content between <user_query> tags if present
        const queryMatch = content.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/);
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
     * Wraps the ModelMessage in a JournalEntry with metadata.
     * System messages are never saved (they're recreated fresh each time)
     * Also updates metadata (message count, title for first user message)
     *
     * @param message - ModelMessage from AI SDK
     * @param options - Optional metadata to attach (e.g. totalInputTokens)
     */
    async saveMessage(
        message: any,
        options?: {
            totalInputTokens?: number;
            chatId?: number;
            attachmentMetadata?: {
                files?: Array<{ name: string; mimetype: string }>;
                images?: Array<{ imageName: string }>;
            };
        }
    ): Promise<void> {
        try {
            // Wrap in JournalEntry
            const entry: JournalEntry = {
                type: message.role,
                message,
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId,
            };
            if (options?.chatId !== undefined) {
                entry.chatId = options.chatId;
            }
            if (options?.totalInputTokens !== undefined) {
                entry.totalInputTokens = options.totalInputTokens;
            }
            if (options?.attachmentMetadata) {
                entry.attachmentMetadata = options.attachmentMetadata;
            }

            // Write to JSONL
            await this.writeEntry(entry);

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
     * Caller is responsible for filtering out already-saved messages.
     * Usage metadata (if provided) is attached to the last entry only.
     *
     * @param messages - ModelMessages from AI SDK (only new messages to save)
     * @param options - Optional metadata to attach to the last message (e.g. totalInputTokens)
     */
    async saveMessages(messages: any[], options?: { totalInputTokens?: number; chatId?: number }): Promise<void> {
        if (messages.length === 0) {
            return;
        }

        for (let i = 0; i < messages.length; i++) {
            const isLast = i === messages.length - 1;
            await this.saveMessage(messages[i], isLast ? options : options?.chatId !== undefined ? { chatId: options.chatId } : undefined);
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
            ? TOOL_USE_INTERRUPTION_CONTEXT
            : '[Request interrupted by user]';

        const message = {
            role: 'user',
            content: [{
                type: 'text',
                text: interruptionText,
            }]
        };

        const entry: JournalEntry = {
            type: 'user',
            message,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
        };

        try {
            await this.writeEntry(entry);
            logDebug(`[ChatHistory] Saved interruption message: ${interruptionText}`);
        } catch (error) {
            logError('[ChatHistory] Failed to save interruption message', error);
        }
    }

    /**
     * Save an undo reminder as a user message with <system-reminder> tags.
     * This is used for future model turns and should not be shown in UI replay.
     */
    async saveUndoReminderMessage(summary: UndoCheckpointSummary, restoredFiles: string[]): Promise<void> {
        const restored = restoredFiles.length > 0
            ? restoredFiles.join(', ')
            : summary.files.map((file) => file.path).join(', ');
        const reminderText = [
            '<system-reminder>',
            `The user executed an undo for the latest checkpoint (${summary.checkpointId}).`,
            `Restored files: ${restored || 'none'}.`,
            'Treat the undone changes as reverted and use the restored file state for subsequent edits.',
            '</system-reminder>',
        ].join('\n');

        const message = {
            role: 'user',
            content: [{
                type: 'text',
                text: reminderText,
            }]
        };

        const entry: JournalEntry = {
            type: 'user',
            message,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
        };

        try {
            await this.writeEntry(entry);
            logDebug(`[ChatHistory] Saved undo reminder message for checkpoint: ${summary.checkpointId}`);
        } catch (error) {
            logError('[ChatHistory] Failed to save undo reminder message', error);
        }
    }

    /**
     * Save a compact summary to history
     * This creates a special JSONL entry that acts as a checkpoint.
     * When loading history, everything before the last compact_summary is ignored.
     * The summary is reattached as a user message for the next LLM turn.
     *
     * @param summary - The generated summary text
     */
    async saveSummaryMessage(summary: string): Promise<void> {
        const entry: JournalEntry = {
            type: 'compact_summary',
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            summary,
        };

        try {
            await this.writeEntry(entry);
            logInfo(`[ChatHistory] Saved compact summary (${summary.length} chars)`);
        } catch (error) {
            logError('[ChatHistory] Failed to save compact summary', error);
            throw error;
        }
    }

    /**
     * Save a mode change entry to history
     */
    async saveModeChange(mode: AgentMode): Promise<void> {
        const entry: JournalEntry = {
            type: 'mode_change',
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            mode,
        };

        try {
            await this.writeEntry(entry);
            logInfo(`[ChatHistory] Saved mode change: ${mode}`);
        } catch (error) {
            logError('[ChatHistory] Failed to save mode change', error);
            throw error;
        }
    }

    /**
     * Save an undo checkpoint summary to history for session replay.
     */
    async saveUndoCheckpoint(summary: UndoCheckpointSummary, targetChatId?: number): Promise<void> {
        const entry: JournalEntry = {
            type: 'undo_checkpoint',
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            undoCheckpoint: summary,
            targetChatId,
        };

        try {
            await this.writeEntry(entry);
            logInfo(`[ChatHistory] Saved undo checkpoint: ${summary.checkpointId}`);
        } catch (error) {
            logError('[ChatHistory] Failed to save undo checkpoint', error);
            throw error;
        }
    }

    /**
     * Get the latest known mode from JSONL. Defaults to edit if no mode entry exists.
     */
    async getLatestMode(defaultMode: AgentMode = 'edit'): Promise<AgentMode> {
        try {
            const content = await fs.readFile(this.sessionFile, 'utf8');
            const lines = content.trim().split('\n');

            for (let i = lines.length - 1; i >= 0; i--) {
                if (!lines[i].trim()) continue;
                const entry = JSON.parse(lines[i]) as JournalEntry;
                if (entry.type === 'mode_change' && entry.mode) {
                    return entry.mode;
                }
            }
        } catch {
            // Ignore and return default
        }

        return defaultMode;
    }

    /**
     * Get the last known total input tokens from JSONL.
     * Scans backward for the most recent entry that has totalInputTokens.
     * Stops at the latest compact_summary checkpoint so usage prior to the
     * checkpoint does not trigger repeated auto-compaction loops.
     */
    async getLastUsage(): Promise<number | undefined> {
        try {
            const content = await fs.readFile(this.sessionFile, 'utf8');
            const lines = content.trim().split('\n');

            for (let i = lines.length - 1; i >= 0; i--) {
                if (!lines[i].trim()) continue;
                const entry = JSON.parse(lines[i]);
                if (entry.type === 'compact_summary') {
                    return undefined;
                }
                if (entry.totalInputTokens !== undefined) {
                    return entry.totalInputTokens;
                }
            }
            return undefined;
        } catch {
            return undefined;
        }
    }

    /**
     * Get all messages for the current session
     * Reads directly from JSONL file (single source of truth)
     *
     * @param options - Controls inclusion of non-ModelMessage checkpoint entries
     * @returns Array of ModelMessages (plus compact_summary entry when requested)
     */
    async getMessages(options?: { includeCompactSummaryEntry?: boolean; includeUndoCheckpointEntry?: boolean }): Promise<any[]> {
        try {
            const includeCompactSummaryEntry = options?.includeCompactSummaryEntry === true;
            const includeUndoCheckpointEntry = options?.includeUndoCheckpointEntry === true;
            const content = await fs.readFile(this.sessionFile, 'utf8');
            const lines = content.trim().split('\n');
            const allEntries: JournalEntry[] = [];

            // Parse all entries first
            for (const line of lines) {
                if (line.trim()) {
                    const entry = JSON.parse(line) as JournalEntry;
                    allEntries.push(entry);
                }
            }

            // Find the index of the last compact_summary entry
            let lastCompactIndex = -1;
            for (let i = allEntries.length - 1; i >= 0; i--) {
                if (allEntries[i].type === 'compact_summary') {
                    lastCompactIndex = i;
                    break;
                }
            }

            // If a compact summary exists, return it as a synthetic user message
            // followed by any messages that appear after it in the JSONL
            if (lastCompactIndex >= 0) {
                const summaryEntry = allEntries[lastCompactIndex];

                // Synthetic user message for the LLM (provides conversation context).
                // Flagged with _compactSynthetic so convertToEventFormat() skips it for UI.
                const summaryMessage = {
                    role: 'user',
                    content: [{
                        type: 'text',
                        text: `<CONVERSATION_SUMMARY>\n${summaryEntry.summary}\n</CONVERSATION_SUMMARY>`
                    }],
                    _compactSynthetic: true,
                };

                // LLM path: only include valid model messages.
                // UI/history path can opt-in to include the raw compact_summary checkpoint entry.
                const messages: any[] = includeCompactSummaryEntry
                    ? [summaryEntry, summaryMessage]
                    : [summaryMessage];

                // Add unwrapped model messages after the compact summary
                for (let i = lastCompactIndex + 1; i < allEntries.length; i++) {
                    const entry = allEntries[i];
                    if (entry.type === 'user' || entry.type === 'assistant' || entry.type === 'tool') {
                        let modelMessage = entry.message;
                        if (entry.chatId !== undefined && modelMessage && typeof modelMessage === 'object') {
                            modelMessage = {
                                ...modelMessage,
                                _chatId: entry.chatId,
                            };
                        }
                        if (entry.type === 'user' && entry.attachmentMetadata && modelMessage) {
                            modelMessage = {
                                ...modelMessage,
                                _attachmentMetadata: entry.attachmentMetadata,
                            };
                        }
                        messages.push(modelMessage);
                    } else if (includeUndoCheckpointEntry && entry.type === 'undo_checkpoint') {
                        messages.push(entry);
                    }
                }

                logInfo(`[ChatHistory] Loaded messages from compact summary checkpoint (${messages.length} messages)`);
                return messages;
            }

            // No compact summary: return all unwrapped model messages
            const messages: any[] = [];
            for (const entry of allEntries) {
                if (entry.type === 'user' || entry.type === 'assistant' || entry.type === 'tool') {
                    let modelMessage = entry.message;
                    if (entry.chatId !== undefined && modelMessage && typeof modelMessage === 'object') {
                        modelMessage = {
                            ...modelMessage,
                            _chatId: entry.chatId,
                        };
                    }
                    if (entry.type === 'user' && entry.attachmentMetadata && modelMessage) {
                        modelMessage = {
                            ...modelMessage,
                            _attachmentMetadata: entry.attachmentMetadata,
                        };
                    }
                    messages.push(modelMessage);
                } else if (includeUndoCheckpointEntry && entry.type === 'undo_checkpoint') {
                    messages.push(entry);
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
            const copilotDir = getCopilotProjectStorageDir(projectPath);

            const entries = await fs.readdir(copilotDir, { withFileTypes: true });
            const sessionDirs = entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);

            // Sort by directory modification time (newest first)
            const sorted = await Promise.all(
                sessionDirs.map(async sessionId => {
                    const dirPath = path.join(copilotDir, sessionId);
                    const stats = await fs.stat(dirPath);
                    const isCompatible = await ChatHistoryManager.isSessionCompatible(projectPath, sessionId);
                    return { sessionId, mtime: stats.mtime.getTime(), isCompatible };
                })
            );

            const compatibleSessions = sorted.filter((entry) => entry.isCompatible);
            const skippedSessions = sorted.length - compatibleSessions.length;
            if (skippedSessions > 0) {
                logInfo(
                    `[ChatHistory] Skipped ${skippedSessions} incompatible session(s) while listing sessions (expected session version ${SESSION_STORAGE_VERSION})`
                );
            }

            compatibleSessions.sort((a, b) => b.mtime - a.mtime);
            return compatibleSessions.map(s => s.sessionId);
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
            const sessionDir = getCopilotSessionDir(projectPath, sessionId);
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
        const sessionDir = getCopilotSessionDir(projectPath, sessionId);
        const metadataPath = path.join(sessionDir, 'metadata.json');
        const historyPath = path.join(sessionDir, 'history.jsonl');

        try {
            // Try to load existing metadata
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata: SessionMetadata = JSON.parse(metadataContent);
            if (!ChatHistoryManager.isCompatibleSessionVersion(metadata.sessionVersion)) {
                logInfo(
                    `[ChatHistory] Skipping incompatible session summary for ${sessionId} (expected session version ${SESSION_STORAGE_VERSION})`
                );
                return null;
            }
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
                            const entry = JSON.parse(line) as JournalEntry;
                            // Find first user message for title
                            if (entry.type === 'user' && entry.message?.content && title === 'New Chat') {
                                const msgContent = typeof entry.message.content === 'string'
                                    ? entry.message.content
                                    : Array.isArray(entry.message.content)
                                        ? entry.message.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ')
                                        : '';
                                title = ChatHistoryManager.extractTitle(msgContent);
                            }
                            // Count model message entries
                            if (entry.type === 'user' || entry.type === 'assistant' || entry.type === 'tool') {
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
        type: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'compact_summary' | 'undo_checkpoint';
        chatId?: number;
        content?: string;
        files?: Array<{ name: string; mimetype: string; content: string }>;
        images?: Array<{ imageName: string; imageBase64: string }>;
        toolName?: string;
        toolInput?: unknown;
        toolOutput?: unknown;
        toolCallId?: string;
        action?: string;
        undoCheckpoint?: UndoCheckpointSummary;
        targetChatId?: number;
        timestamp: string;
    }> {
        const events: any[] = [];
        // Track tool inputs by toolCallId for bash output display
        const toolInputMap = new Map<string, any>();

        for (const msg of messages) {
            const timestamp = new Date().toISOString();  // Could store timestamps if needed

            // Handle compact_summary entries (JSONL session entries, not role-based messages)
            if (msg.type === 'compact_summary') {
                events.push({
                    type: 'compact_summary',
                    content: msg.summary,
                    timestamp: msg.timestamp || timestamp,
                });
                continue;
            }

            if (msg.type === 'undo_checkpoint') {
                if (msg.undoCheckpoint) {
                    events.push({
                        type: 'undo_checkpoint',
                        undoCheckpoint: msg.undoCheckpoint,
                        targetChatId: typeof msg.targetChatId === 'number' ? msg.targetChatId : undefined,
                        timestamp: msg.timestamp || timestamp,
                    });
                }
                continue;
            }

            switch (msg.role) {
                case 'user':
                    // Skip synthetic compact summary messages (they're for LLM context only;
                    // the raw compact_summary entry is handled above for UI rendering)
                    if (msg._compactSynthetic) {
                        continue;
                    }

                    // User content can be string or array of content parts
                    let userContent = '';
                    const files: Array<{ name: string; mimetype: string; content: string }> = [];
                    const images: Array<{ imageName: string; imageBase64: string }> = [];

                    // Prefer explicit metadata captured at save time
                    const attachmentMetadata = msg._attachmentMetadata;
                    if (attachmentMetadata?.files && Array.isArray(attachmentMetadata.files)) {
                        for (const file of attachmentMetadata.files) {
                            files.push({
                                name: file.name,
                                mimetype: file.mimetype,
                                content: '',
                            });
                        }
                    }
                    if (attachmentMetadata?.images && Array.isArray(attachmentMetadata.images)) {
                        for (const image of attachmentMetadata.images) {
                            images.push({
                                imageName: image.imageName,
                                imageBase64: '',
                            });
                        }
                    }

                    if (typeof msg.content === 'string') {
                        userContent = msg.content;
                    } else if (Array.isArray(msg.content)) {
                        // Extract text from content parts and fallback attachment markers for older history
                        const textParts: string[] = [];
                        let unnamedPdfCount = 0;
                        let unnamedImageCount = 0;

                        for (const part of msg.content) {
                            if (part.type === 'text') {
                                if (part.text) {
                                    textParts.push(part.text);
                                }
                                // Fallback extraction for text file names from formatted text block
                                const fileRegex = /---\s*File:\s*(.+?)\s*---/g;
                                let match: RegExpExecArray | null = null;
                                while ((match = fileRegex.exec(part.text || '')) !== null) {
                                    const fileName = match[1]?.trim();
                                    if (fileName && !files.some((f) => f.name === fileName)) {
                                        files.push({
                                            name: fileName,
                                            mimetype: 'text/plain',
                                            content: '',
                                        });
                                    }
                                }
                            } else if (part.type === 'file' && !attachmentMetadata?.files?.length) {
                                // Older history fallback: file blocks don't include original names
                                unnamedPdfCount++;
                                files.push({
                                    name: `attachment-${unnamedPdfCount}.pdf`,
                                    mimetype: part.mediaType || 'application/pdf',
                                    content: '',
                                });
                            } else if (part.type === 'image' && !attachmentMetadata?.images?.length) {
                                // Older history fallback: image blocks don't include original names
                                unnamedImageCount++;
                                images.push({
                                    imageName: `image-${unnamedImageCount}`,
                                    imageBase64: '',
                                });
                            }
                        }
                        userContent = textParts.join('');
                    }

                    // Skip interruption messages from UI display (they're only for LLM context)
                    // These are saved when user aborts a request
                    if (
                        userContent.includes('[Request interrupted by user') ||
                        userContent.includes("The user doesn't want to proceed with this tool use.") ||
                        userContent.includes('<system-reminder>')
                    ) {
                        continue;
                    }

                    // Extract content between <user_query> tags (user's actual query)
                    const queryMatch = userContent.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/);
                    if (queryMatch && queryMatch[1]) {
                        userContent = queryMatch[1].trim();
                    }

                    events.push({
                        type: 'user',
                        chatId: typeof msg._chatId === 'number' ? msg._chatId : undefined,
                        content: userContent,
                        files: files.length > 0 ? files : undefined,
                        images: images.length > 0 ? images : undefined,
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
                                chatId: typeof msg._chatId === 'number' ? msg._chatId : undefined,
                                content: msg.content,
                                timestamp
                            });
                        }
                    } else if (Array.isArray(msg.content)) {
                        // Array of content parts (text, reasoning, and tool-calls)
                        for (const part of msg.content) {
                            if (part.type === 'text') {
                                // Only add non-empty text
                                if (part.text && part.text.trim()) {
                                    events.push({
                                        type: 'assistant',
                                        chatId: typeof msg._chatId === 'number' ? msg._chatId : undefined,
                                        content: part.text,
                                        timestamp
                                    });
                                }
                            } else if (part.type === 'reasoning') {
                                const reasoningText = (part.text || '').trim();
                                if (reasoningText) {
                                    events.push({
                                        type: 'assistant',
                                        chatId: typeof msg._chatId === 'number' ? msg._chatId : undefined,
                                        content: `\n\n<thinking>${reasoningText}</thinking>\n\n`,
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
                                    chatId: typeof msg._chatId === 'number' ? msg._chatId : undefined,
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
                                    chatId: typeof msg._chatId === 'number' ? msg._chatId : undefined,
                                    toolName: part.toolName,
                                    toolOutput: output,
                                    toolCallId: part.toolCallId,
                                    action,
                                    timestamp
                                };

                                // Add shell-specific fields for shell tool
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
