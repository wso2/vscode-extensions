/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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
    FileHistoryBackupReference,
    FileHistorySnapshot,
    UndoCheckpointSummary,
} from '@wso2/mi-core';
import { logDebug, logError } from '../../copilot/logger';
import { getCopilotSessionDir } from '../storage-paths';

export type UndoCheckpointSource = 'agent' | 'code_segment';

interface FileState {
    exists: boolean;
    content?: string;
    hash: string;
}

interface PendingUndoCheckpoint {
    source: UndoCheckpointSource;
    checkpointId: string;
    createdAt: string;
    targetChatId?: number;
    trackedFileBackups: Map<string, FileHistoryBackupReference>;
    planFileSnapshot?: {
        planPath: string;
        backup: FileHistoryBackupReference;
    };
}

export interface SnapshotRestoreFile {
    path: string;
    before: {
        exists: boolean;
        content?: string;
    };
}

export interface SnapshotRestorePlan {
    checkpointId: string;
    source: UndoCheckpointSource;
    createdAt: string;
    targetChatId?: number;
    files: SnapshotRestoreFile[];
    sessionFiles?: SnapshotRestoreFile[];
}

export interface SnapshotJournalStore {
    saveFileHistorySnapshot(
        snapshot: FileHistorySnapshot,
        options: { isSnapshotUpdate: boolean; messageId?: string }
    ): Promise<void>;
    getLatestFileHistorySnapshot(checkpointId: string): Promise<FileHistorySnapshot | undefined>;
    listReferencedBackupFiles(): Promise<Set<string>>;
}

const MISSING_FILE_HASH = '__MISSING_FILE__';
const FILE_HISTORY_DIR_NAME = 'file-history';
const MAX_EXACT_LINE_DIFF_LINES = 2000;
const MAX_EXACT_LINE_DIFF_MATRIX_CELLS = 1_000_000;

function hashContent(content?: string): string {
    if (content === undefined) {
        return MISSING_FILE_HASH;
    }
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function normalizeAbsolutePath(filePath: string): string {
    const normalized = path.resolve(filePath).replace(/\\/g, '/');
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
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

function calculateApproximateLineChanges(beforeLines: string[], afterLines: string[]): { addedLines: number; deletedLines: number } {
    const beforeLength = beforeLines.length;
    const afterLength = afterLines.length;
    const minLength = Math.min(beforeLength, afterLength);

    let prefixMatchCount = 0;
    while (prefixMatchCount < minLength && beforeLines[prefixMatchCount] === afterLines[prefixMatchCount]) {
        prefixMatchCount += 1;
    }

    let beforeSuffixIndex = beforeLength - 1;
    let afterSuffixIndex = afterLength - 1;
    while (
        beforeSuffixIndex >= prefixMatchCount
        && afterSuffixIndex >= prefixMatchCount
        && beforeLines[beforeSuffixIndex] === afterLines[afterSuffixIndex]
    ) {
        beforeSuffixIndex -= 1;
        afterSuffixIndex -= 1;
    }

    const deletedLines = Math.max(0, beforeSuffixIndex - prefixMatchCount + 1);
    const addedLines = Math.max(0, afterSuffixIndex - prefixMatchCount + 1);

    return {
        addedLines,
        deletedLines,
    };
}

function calculateLineChanges(beforeContent: string, afterContent: string): { addedLines: number; deletedLines: number } {
    const beforeLines = beforeContent.split('\n');
    const afterLines = afterContent.split('\n');

    const rows = beforeLines.length;
    const cols = afterLines.length;

    if (
        rows > MAX_EXACT_LINE_DIFF_LINES
        || cols > MAX_EXACT_LINE_DIFF_LINES
        || rows * cols > MAX_EXACT_LINE_DIFF_MATRIX_CELLS
    ) {
        return calculateApproximateLineChanges(beforeLines, afterLines);
    }

    const previous = new Uint32Array(cols + 1);
    const current = new Uint32Array(cols + 1);

    for (let i = 1; i <= rows; i++) {
        for (let j = 1; j <= cols; j++) {
            if (beforeLines[i - 1] === afterLines[j - 1]) {
                current[j] = previous[j - 1] + 1;
            } else {
                current[j] = Math.max(previous[j], current[j - 1]);
            }
        }

        previous.set(current);
        current.fill(0);
    }

    const lcs = previous[cols];
    return {
        deletedLines: rows - lcs,
        addedLines: cols - lcs,
    };
}

export class AgentUndoCheckpointManager {
    private pendingCheckpoint: PendingUndoCheckpoint | null = null;
    private versionCountersLoaded = false;
    private readonly hashVersionCounters = new Map<string, number>();

    constructor(
        private readonly projectPath: string,
        private readonly sessionId: string,
        private readonly journalStore: SnapshotJournalStore,
    ) {}

    private getFileHistoryDirPath(): string {
        return path.join(getCopilotSessionDir(this.projectPath, this.sessionId), FILE_HISTORY_DIR_NAME);
    }

    private async ensureFileHistoryDir(): Promise<void> {
        await fs.mkdir(this.getFileHistoryDirPath(), { recursive: true });
    }

    private async loadVersionCounters(): Promise<void> {
        if (this.versionCountersLoaded) {
            return;
        }

        this.hashVersionCounters.clear();

        try {
            const entries = await fs.readdir(this.getFileHistoryDirPath(), { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isFile()) {
                    continue;
                }

                const match = entry.name.match(/^([a-f0-9]+)@v(\d+)$/i);
                if (!match) {
                    continue;
                }

                const pathHash = match[1].toLowerCase();
                const version = Number.parseInt(match[2], 10);
                if (!Number.isFinite(version) || version <= 0) {
                    continue;
                }

                const previous = this.hashVersionCounters.get(pathHash) || 0;
                if (version > previous) {
                    this.hashVersionCounters.set(pathHash, version);
                }
            }
        } catch (error) {
            const nodeError = error as NodeJS.ErrnoException;
            if (nodeError?.code !== 'ENOENT') {
                logError('[UndoCheckpoint] Failed to load file-history version counters', error);
            }
        }

        this.versionCountersLoaded = true;
    }

    private allocateNextVersion(pathHash: string): number {
        const current = this.hashVersionCounters.get(pathHash) || 0;
        const next = current + 1;
        this.hashVersionCounters.set(pathHash, next);
        return next;
    }

    private createPathHashFromAbsolutePath(absolutePath: string): string {
        return crypto
            .createHash('sha256')
            .update(normalizeAbsolutePath(absolutePath), 'utf8')
            .digest('hex')
            .slice(0, 16);
    }

    private getBackupFilePath(backupFileName: string): string {
        return path.join(this.getFileHistoryDirPath(), backupFileName);
    }

    private async readAbsoluteFileState(fullPath: string): Promise<FileState> {
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

    private async readFileState(relativePath: string): Promise<FileState> {
        const fullPath = path.join(this.projectPath, relativePath);
        return this.readAbsoluteFileState(fullPath);
    }

    private async captureAbsoluteFileBackup(absolutePath: string): Promise<FileHistoryBackupReference> {
        await this.ensureFileHistoryDir();
        await this.loadVersionCounters();

        const fileState = await this.readAbsoluteFileState(absolutePath);
        const backupTime = new Date().toISOString();
        const pathHash = this.createPathHashFromAbsolutePath(absolutePath);
        const version = this.allocateNextVersion(pathHash);

        let backupFileName: string | null = null;
        if (fileState.exists) {
            backupFileName = `${pathHash}@v${version}`;
            await fs.writeFile(this.getBackupFilePath(backupFileName), fileState.content || '', 'utf8');
        }

        return {
            backupFileName,
            version,
            backupTime,
        };
    }

    private async captureFileBackup(relativePath: string): Promise<FileHistoryBackupReference> {
        await this.ensureFileHistoryDir();
        await this.loadVersionCounters();

        const fileState = await this.readFileState(relativePath);
        const backupTime = new Date().toISOString();
        const pathHash = this.createPathHashFromAbsolutePath(path.join(this.projectPath, relativePath));
        const version = this.allocateNextVersion(pathHash);

        let backupFileName: string | null = null;
        if (fileState.exists) {
            backupFileName = `${pathHash}@v${version}`;
            await fs.writeFile(this.getBackupFilePath(backupFileName), fileState.content || '', 'utf8');
        }

        return {
            backupFileName,
            version,
            backupTime,
        };
    }

    private buildSnapshotFromPending(pending: PendingUndoCheckpoint, timestamp?: string): FileHistorySnapshot {
        const trackedFileBackups: Record<string, FileHistoryBackupReference> = {};
        for (const [relativePath, backupReference] of pending.trackedFileBackups.entries()) {
            trackedFileBackups[relativePath] = backupReference;
        }

        return {
            messageId: pending.checkpointId,
            source: pending.source,
            trackedFileBackups,
            timestamp: timestamp || new Date().toISOString(),
            targetChatId: pending.targetChatId,
            planFileSnapshot: pending.planFileSnapshot ? { ...pending.planFileSnapshot } : undefined,
        };
    }

    private async resolveBeforeState(backupReference: FileHistoryBackupReference): Promise<FileState> {
        if (!backupReference.backupFileName) {
            return {
                exists: false,
                hash: hashContent(undefined),
            };
        }

        try {
            const content = await fs.readFile(this.getBackupFilePath(backupReference.backupFileName), 'utf8');
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

    private isSafeSessionPlanPath(planPath: string): boolean {
        const resolvedPlanPath = path.resolve(planPath);
        const planRoot = path.resolve(getCopilotSessionDir(this.projectPath, this.sessionId), 'plan');
        const underPlanRoot = (
            resolvedPlanPath === planRoot
            || resolvedPlanPath.startsWith(`${planRoot}${path.sep}`)
        );
        if (!underPlanRoot) {
            return false;
        }

        const statsPath = resolvedPlanPath.toLowerCase();
        return statsPath.endsWith('.md');
    }

    async beginRun(
        source: UndoCheckpointSource,
        options?: {
            checkpointId?: string;
            targetChatId?: number;
            createdAt?: string;
            planFilePath?: string;
        }
    ): Promise<void> {
        const pendingCheckpoint: PendingUndoCheckpoint = {
            source,
            checkpointId: options?.checkpointId?.trim() || crypto.randomUUID(),
            createdAt: options?.createdAt || new Date().toISOString(),
            targetChatId: options?.targetChatId,
            trackedFileBackups: new Map<string, FileHistoryBackupReference>(),
        };

        const planFilePath = options?.planFilePath?.trim();
        if (planFilePath && this.isSafeSessionPlanPath(planFilePath)) {
            try {
                const resolvedPlanPath = path.resolve(planFilePath);
                pendingCheckpoint.planFileSnapshot = {
                    planPath: resolvedPlanPath,
                    backup: await this.captureAbsoluteFileBackup(resolvedPlanPath),
                };
            } catch (error) {
                logError(`[UndoCheckpoint] Failed to capture plan-file baseline: ${planFilePath}`, error);
            }
        }

        this.pendingCheckpoint = pendingCheckpoint;

        const snapshot = this.buildSnapshotFromPending(pendingCheckpoint, pendingCheckpoint.createdAt);
        await this.journalStore.saveFileHistorySnapshot(snapshot, {
            isSnapshotUpdate: false,
            messageId: pendingCheckpoint.checkpointId,
        });
    }

    async discardPendingRun(): Promise<void> {
        this.pendingCheckpoint = null;
    }

    async captureBeforeChange(relativePath: string): Promise<void> {
        const pending = this.pendingCheckpoint;
        if (!pending) {
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

        const backupReference = await this.captureFileBackup(normalizedPath);

        // Keep first backup reference for the checkpoint so restore returns to true checkpoint state.
        if (!pending.trackedFileBackups.has(normalizedPath)) {
            pending.trackedFileBackups.set(normalizedPath, backupReference);
        }

        const snapshot = this.buildSnapshotFromPending(pending, new Date().toISOString());
        await this.journalStore.saveFileHistorySnapshot(snapshot, { isSnapshotUpdate: true });
    }

    async commitRun(): Promise<UndoCheckpointSummary | undefined> {
        const pending = this.pendingCheckpoint;
        this.pendingCheckpoint = null;

        if (!pending || pending.trackedFileBackups.size === 0) {
            return undefined;
        }

        const fileSummaries: ChangedFileSummary[] = [];
        let totalAdded = 0;
        let totalDeleted = 0;

        for (const [relativePath, backupReference] of pending.trackedFileBackups.entries()) {
            const beforeState = await this.resolveBeforeState(backupReference);
            const afterState = await this.readFileState(relativePath);

            if (beforeState.hash === afterState.hash) {
                continue;
            }

            const beforeContent = beforeState.exists ? (beforeState.content || '') : '';
            const afterContent = afterState.exists ? (afterState.content || '') : '';
            const { addedLines, deletedLines } = calculateLineChanges(beforeContent, afterContent);

            fileSummaries.push({
                path: relativePath,
                addedLines,
                deletedLines,
            });
            totalAdded += addedLines;
            totalDeleted += deletedLines;
        }

        if (fileSummaries.length === 0) {
            return undefined;
        }

        return {
            checkpointId: pending.checkpointId,
            source: pending.source,
            createdAt: pending.createdAt,
            files: fileSummaries,
            totalAdded,
            totalDeleted,
            undoable: true,
        };
    }

    async buildRestorePlan(checkpointId: string): Promise<SnapshotRestorePlan | undefined> {
        if (!checkpointId?.trim()) {
            return undefined;
        }

        const snapshot = await this.journalStore.getLatestFileHistorySnapshot(checkpointId);
        if (!snapshot) {
            return undefined;
        }

        const entries = Object.entries(snapshot.trackedFileBackups || {});
        const files: SnapshotRestoreFile[] = await Promise.all(
            entries.map(async ([relativePath, backupReference]) => {
                if (!backupReference.backupFileName) {
                    return { path: relativePath, before: { exists: false } };
                }
                try {
                    const content = await fs.readFile(this.getBackupFilePath(backupReference.backupFileName), 'utf8');
                    return { path: relativePath, before: { exists: true, content } };
                } catch {
                    return { path: relativePath, before: { exists: false } };
                }
            })
        );

        let sessionFiles: SnapshotRestoreFile[] | undefined;
        const planSnapshot = snapshot.planFileSnapshot;
        if (planSnapshot?.planPath) {
            const planPath = path.resolve(planSnapshot.planPath);
            const planBackupFileName = planSnapshot.backup?.backupFileName?.trim();
            if (!planBackupFileName) {
                sessionFiles = [{
                    path: planPath,
                    before: { exists: false },
                }];
            } else {
                try {
                    const content = await fs.readFile(this.getBackupFilePath(planBackupFileName), 'utf8');
                    sessionFiles = [{
                        path: planPath,
                        before: { exists: true, content },
                    }];
                } catch {
                    sessionFiles = [{
                        path: planPath,
                        before: { exists: false },
                    }];
                }
            }
        }

        return {
            checkpointId: snapshot.messageId,
            source: snapshot.source,
            createdAt: snapshot.timestamp,
            targetChatId: snapshot.targetChatId,
            files,
            sessionFiles,
        };
    }

    async cleanupOrphanSnapshotFiles(): Promise<void> {
        await this.ensureFileHistoryDir();

        const referencedBackupFiles = await this.journalStore.listReferencedBackupFiles();
        let deletedCount = 0;

        try {
            const entries = await fs.readdir(this.getFileHistoryDirPath(), { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isFile()) {
                    continue;
                }

                if (referencedBackupFiles.has(entry.name)) {
                    continue;
                }

                await fs.unlink(path.join(this.getFileHistoryDirPath(), entry.name));
                deletedCount += 1;
            }
        } catch (error) {
            const nodeError = error as NodeJS.ErrnoException;
            if (nodeError?.code !== 'ENOENT') {
                logError('[UndoCheckpoint] Failed to cleanup orphan snapshot files', error);
                throw error;
            }
        }

        this.versionCountersLoaded = false;
        await this.loadVersionCounters();

        if (deletedCount > 0) {
            logDebug(`[UndoCheckpoint] Removed ${deletedCount} orphan snapshot file(s)`);
        }
    }
}
