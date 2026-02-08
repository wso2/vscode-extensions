/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
    ChangedFileSummary,
    UndoCheckpointSummary,
} from '@wso2/mi-core';
import { logDebug, logError } from '../../copilot/logger';

export type UndoCheckpointSource = 'agent' | 'code_segment';

interface FileBeforeState {
    exists: boolean;
    content?: string;
    hash: string;
}

export interface StoredUndoCheckpointFile {
    path: string;
    before: FileBeforeState;
    afterHash: string;
    addedLines: number;
    deletedLines: number;
}

export interface StoredUndoCheckpoint {
    summary: UndoCheckpointSummary;
    files: StoredUndoCheckpointFile[];
}

interface PendingUndoCheckpoint {
    source: UndoCheckpointSource;
    checkpointId: string;
    createdAt: string;
    files: Map<string, FileBeforeState>;
}

const MISSING_FILE_HASH = '__MISSING_FILE__';
const UNDO_CHECKPOINT_FILE_NAME = 'undo-checkpoint.json';

function hashContent(content?: string): string {
    if (content === undefined) {
        return MISSING_FILE_HASH;
    }
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function normalizeRelativePath(projectPath: string, candidatePath: string): string | null {
    if (!candidatePath) {
        return null;
    }

    const normalized = candidatePath.replace(/\\/g, '/').trim().replace(/^\.\/+/, '');
    if (!normalized || path.isAbsolute(normalized)) {
        return null;
    }

    const fullPath = path.resolve(projectPath, normalized);
    const relative = path.relative(projectPath, fullPath).replace(/\\/g, '/');
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        return null;
    }
    return relative;
}

function isCopilotInternalPath(relativePath: string): boolean {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
    return normalized === '.mi-copilot' || normalized.startsWith('.mi-copilot/');
}

function calculateLineChanges(beforeContent: string, afterContent: string): { addedLines: number; deletedLines: number } {
    const beforeLines = beforeContent.split('\n');
    const afterLines = afterContent.split('\n');

    const rows = beforeLines.length;
    const cols = afterLines.length;
    const dp: number[][] = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));

    for (let i = 1; i <= rows; i++) {
        for (let j = 1; j <= cols; j++) {
            if (beforeLines[i - 1] === afterLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    const lcs = dp[rows][cols];
    return {
        deletedLines: rows - lcs,
        addedLines: cols - lcs,
    };
}

export class AgentUndoCheckpointManager {
    private pendingCheckpoint: PendingUndoCheckpoint | null = null;

    constructor(
        private readonly projectPath: string,
        private readonly sessionId: string,
    ) {}

    private getCheckpointFilePath(): string {
        return path.join(this.projectPath, '.mi-copilot', this.sessionId, UNDO_CHECKPOINT_FILE_NAME);
    }

    private async ensureCheckpointDir(): Promise<void> {
        await fs.mkdir(path.dirname(this.getCheckpointFilePath()), { recursive: true });
    }

    private createCheckpointId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }

    private async readFileState(relativePath: string): Promise<FileBeforeState> {
        const fullPath = path.join(this.projectPath, relativePath);
        try {
            const content = await fs.readFile(fullPath, 'utf8');
            return {
                exists: true,
                content,
                hash: hashContent(content),
            };
        } catch {
            return {
                exists: false,
                hash: hashContent(undefined),
            };
        }
    }

    async beginRun(source: UndoCheckpointSource): Promise<void> {
        this.pendingCheckpoint = {
            source,
            checkpointId: this.createCheckpointId(),
            createdAt: new Date().toISOString(),
            files: new Map<string, FileBeforeState>(),
        };
    }

    async discardPendingRun(): Promise<void> {
        this.pendingCheckpoint = null;
    }

    async captureBeforeChange(relativePath: string): Promise<void> {
        if (!this.pendingCheckpoint) {
            return;
        }

        const normalizedPath = normalizeRelativePath(this.projectPath, relativePath);
        if (!normalizedPath) {
            logDebug(`[UndoCheckpoint] Ignoring invalid path capture: ${relativePath}`);
            return;
        }

        if (isCopilotInternalPath(normalizedPath)) {
            logDebug(`[UndoCheckpoint] Ignoring internal copilot path: ${normalizedPath}`);
            return;
        }

        if (this.pendingCheckpoint.files.has(normalizedPath)) {
            return;
        }

        const state = await this.readFileState(normalizedPath);
        this.pendingCheckpoint.files.set(normalizedPath, state);
    }

    async commitRun(): Promise<UndoCheckpointSummary | undefined> {
        const pending = this.pendingCheckpoint;
        this.pendingCheckpoint = null;

        if (!pending || pending.files.size === 0) {
            return undefined;
        }

        const fileDetails: StoredUndoCheckpointFile[] = [];
        const fileSummaries: ChangedFileSummary[] = [];
        let totalAdded = 0;
        let totalDeleted = 0;

        for (const [relativePath, beforeState] of pending.files.entries()) {
            const afterState = await this.readFileState(relativePath);

            if (beforeState.hash === afterState.hash) {
                continue;
            }

            const beforeContent = beforeState.exists ? (beforeState.content || '') : '';
            const afterContent = afterState.exists ? (afterState.content || '') : '';
            const { addedLines, deletedLines } = calculateLineChanges(beforeContent, afterContent);

            fileDetails.push({
                path: relativePath,
                before: beforeState,
                afterHash: afterState.hash,
                addedLines,
                deletedLines,
            });

            fileSummaries.push({
                path: relativePath,
                addedLines,
                deletedLines,
            });
            totalAdded += addedLines;
            totalDeleted += deletedLines;
        }

        if (fileDetails.length === 0) {
            return undefined;
        }

        const summary: UndoCheckpointSummary = {
            checkpointId: pending.checkpointId,
            source: pending.source,
            createdAt: pending.createdAt,
            files: fileSummaries,
            totalAdded,
            totalDeleted,
            undoable: true,
        };

        const payload: StoredUndoCheckpoint = {
            summary,
            files: fileDetails,
        };

        await this.ensureCheckpointDir();
        await fs.writeFile(this.getCheckpointFilePath(), JSON.stringify(payload), 'utf8');
        return summary;
    }

    async getLatestCheckpoint(): Promise<StoredUndoCheckpoint | undefined> {
        try {
            const payload = await fs.readFile(this.getCheckpointFilePath(), 'utf8');
            const parsed = JSON.parse(payload) as StoredUndoCheckpoint;
            if (!parsed?.summary || !Array.isArray(parsed.files)) {
                return undefined;
            }
            return parsed;
        } catch {
            return undefined;
        }
    }

    async getConflictedFiles(checkpoint: StoredUndoCheckpoint): Promise<string[]> {
        const conflicts: string[] = [];
        for (const file of checkpoint.files) {
            const currentState = await this.readFileState(file.path);
            if (currentState.hash !== file.afterHash) {
                conflicts.push(file.path);
            }
        }
        return conflicts;
    }

    async clearLatestCheckpoint(): Promise<void> {
        try {
            await fs.unlink(this.getCheckpointFilePath());
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            if (err?.code !== 'ENOENT') {
                logError('[UndoCheckpoint] Failed to clear latest checkpoint', error);
            }
        }
    }
}
