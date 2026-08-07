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

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

import {
    PersistenceStoreConfig,
    PersistedThread,
    PersistedCheckpoint,
    WorkspaceMetadata,
    ThreadSummary,
} from './types';
import {
    readJsonSync,
    writeJsonSync,
    readGzipSync,
    writeGzipSync,
    writeGzipAsync,
    removeDirSync,
    listSubdirectoriesSync,
    listFilesBySuffixSync,
} from './file-utils';
import { computeWorkspaceHash } from './workspace-hash';
import {
    migrateThread,
    migrateWorkspaceMetadata,
    migrateCheckpoint,
    CURRENT_THREAD_SCHEMA_VERSION,
    CURRENT_WORKSPACE_SCHEMA_VERSION,
    CURRENT_CHECKPOINT_SCHEMA_VERSION,
} from './schema-migration';

const DEFAULT_BASE_DIR = path.join(os.homedir(), '.ballerina', 'copilot');
const WORKSPACES_DIR = 'workspaces';
const THREADS_DIR = 'threads';
const CHECKPOINTS_DIR = 'checkpoints';
const WORKSPACE_META_FILE = 'workspace.meta.json';
const THREAD_FILE = 'thread.json';
const CHECKPOINT_SUFFIX = '.snapshot.gz';

/**
 * File-based persistence store for copilot chat threads and checkpoints.
 *
 * Zero VS Code dependencies — uses only Node.js built-ins.
 * All thread reads/writes are synchronous (files are typically 1-2MB).
 * Checkpoint writes offer an async variant for large snapshots.
 */
export class CopilotPersistenceStore {
    private readonly baseDir: string;
    private readonly workspaceIdResolver: (workspacePath: string) => string;

    constructor(config: PersistenceStoreConfig = {}) {
        this.baseDir = config.baseDir ?? DEFAULT_BASE_DIR;
        this.workspaceIdResolver = config.workspaceIdResolver ?? ((p) => path.resolve(p));
    }

    // ============================================
    // Path Helpers
    // ============================================

    /** Resolve the on-disk directory for a workspace. */
    getWorkspaceDir(workspacePath: string): string {
        const hash = computeWorkspaceHash(this.workspaceIdResolver(workspacePath));
        return path.join(this.baseDir, WORKSPACES_DIR, hash);
    }

    /** Resolve the on-disk directory for a thread within a workspace. */
    private getThreadDir(workspacePath: string, threadId: string): string {
        return path.join(this.getWorkspaceDir(workspacePath), THREADS_DIR, threadId);
    }

    /** Resolve the path to the thread JSON file. */
    private getThreadFilePath(workspacePath: string, threadId: string): string {
        return path.join(this.getThreadDir(workspacePath, threadId), THREAD_FILE);
    }

    /** Resolve the path to a checkpoint snapshot file. */
    private getCheckpointFilePath(workspacePath: string, threadId: string, generationId: string): string {
        return path.join(
            this.getThreadDir(workspacePath, threadId),
            CHECKPOINTS_DIR,
            `${generationId}${CHECKPOINT_SUFFIX}`
        );
    }

    /** Resolve the path to workspace.meta.json. */
    private getWorkspaceMetaPath(workspacePath: string): string {
        return path.join(this.getWorkspaceDir(workspacePath), WORKSPACE_META_FILE);
    }

    // ============================================
    // Workspace Operations
    // ============================================

    /**
     * Read workspace metadata from disk.
     * Returns `null` if the workspace has not been persisted.
     */
    getWorkspaceMetadata(workspacePath: string): WorkspaceMetadata | null {
        const raw = readJsonSync<Record<string, unknown>>(this.getWorkspaceMetaPath(workspacePath));
        if (!raw) {
            return null;
        }
        try {
            return migrateWorkspaceMetadata(raw);
        } catch (err) {
            console.error('[CopilotPersistenceStore] Failed to migrate workspace metadata:', err);
            return null;
        }
    }

    /**
     * Write workspace metadata to disk atomically.
     */
    saveWorkspaceMetadata(workspacePath: string, metadata: Omit<WorkspaceMetadata, 'schemaVersion'>): void {
        const data: WorkspaceMetadata = {
            schemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
            ...metadata,
        };
        writeJsonSync(this.getWorkspaceMetaPath(workspacePath), data);
    }

    /**
     * List all persisted workspaces.
     * Returns metadata for each workspace directory that has a valid workspace.meta.json.
     */
    listWorkspaces(): WorkspaceMetadata[] {
        const workspacesDir = path.join(this.baseDir, WORKSPACES_DIR);
        const hashes = listSubdirectoriesSync(workspacesDir);
        const results: WorkspaceMetadata[] = [];

        for (const hash of hashes) {
            const metaPath = path.join(workspacesDir, hash, WORKSPACE_META_FILE);
            const raw = readJsonSync<Record<string, unknown>>(metaPath);
            if (raw) {
                try {
                    results.push(migrateWorkspaceMetadata(raw));
                } catch {
                    // Skip corrupt workspace metadata
                }
            }
        }

        return results;
    }

    /**
     * Delete a workspace and all its threads, checkpoints, and metadata.
     */
    deleteWorkspace(workspacePath: string): void {
        removeDirSync(this.getWorkspaceDir(workspacePath));
    }

    // ============================================
    // Thread Operations
    // ============================================

    /**
     * List thread directory names for a workspace without loading thread data.
     */
    listThreadIds(workspacePath: string): string[] {
        const threadsDir = path.join(this.getWorkspaceDir(workspacePath), THREADS_DIR);
        return listSubdirectoriesSync(threadsDir);
    }

    /**
     * List all threads for a workspace as lightweight summaries.
     */
    listThreads(workspacePath: string): ThreadSummary[] {
        const threadsDir = path.join(this.getWorkspaceDir(workspacePath), THREADS_DIR);
        const threadIds = listSubdirectoriesSync(threadsDir);
        const results: ThreadSummary[] = [];

        for (const threadId of threadIds) {
            const thread = this.loadThread(workspacePath, threadId);
            if (thread) {
                results.push({
                    id: thread.id,
                    name: thread.name,
                    createdAt: thread.createdAt,
                    updatedAt: thread.updatedAt,
                    generationCount: thread.generations.length,
                });
            }
        }

        return results;
    }

    /**
     * Load a thread from disk. Applies schema migrations if needed.
     * Returns `null` if the thread does not exist or is corrupt.
     */
    loadThread(workspacePath: string, threadId: string): PersistedThread | null {
        const raw = readJsonSync<Record<string, unknown>>(this.getThreadFilePath(workspacePath, threadId));
        if (!raw) {
            return null;
        }
        try {
            const migrated = migrateThread(raw);
            // Re-save if migration changed the schema version
            if ((raw.schemaVersion as number) !== CURRENT_THREAD_SCHEMA_VERSION) {
                this.saveThread(workspacePath, threadId, migrated);
            }
            return migrated;
        } catch (err) {
            console.error(`[CopilotPersistenceStore] Failed to migrate thread ${threadId}:`, err);
            return null;
        }
    }

    /**
     * Save a thread to disk atomically.
     * Injects the current schemaVersion automatically.
     */
    saveThread(workspacePath: string, threadId: string, thread: Omit<PersistedThread, 'schemaVersion'>): void {
        const data: PersistedThread = {
            ...thread,
            schemaVersion: CURRENT_THREAD_SCHEMA_VERSION,
        };
        writeJsonSync(this.getThreadFilePath(workspacePath, threadId), data);
    }

    /**
     * Delete a thread and all its checkpoint files.
     */
    deleteThread(workspacePath: string, threadId: string): void {
        removeDirSync(this.getThreadDir(workspacePath, threadId));
    }

    // ============================================
    // Checkpoint Operations
    // ============================================

    /**
     * Load a checkpoint snapshot from disk (gunzip + parse).
     * Returns `null` if the checkpoint does not exist or is corrupt.
     */
    loadCheckpoint(workspacePath: string, threadId: string, generationId: string): PersistedCheckpoint | null {
        const raw = readGzipSync<Record<string, unknown>>(
            this.getCheckpointFilePath(workspacePath, threadId, generationId)
        );
        if (!raw) {
            return null;
        }
        try {
            return migrateCheckpoint(raw);
        } catch (err) {
            console.error(`[CopilotPersistenceStore] Failed to migrate checkpoint for gen ${generationId}:`, err);
            return null;
        }
    }

    /**
     * Save a checkpoint snapshot to disk synchronously (gzip + atomic write).
     */
    saveCheckpoint(
        workspacePath: string,
        threadId: string,
        generationId: string,
        checkpoint: Omit<PersistedCheckpoint, 'schemaVersion'>
    ): void {
        const data: PersistedCheckpoint = {
            ...checkpoint,
            schemaVersion: CURRENT_CHECKPOINT_SCHEMA_VERSION,
        };
        writeGzipSync(this.getCheckpointFilePath(workspacePath, threadId, generationId), data);
    }

    /**
     * Save a checkpoint snapshot to disk asynchronously.
     * Preferred for large snapshots to avoid blocking the event loop.
     */
    async saveCheckpointAsync(
        workspacePath: string,
        threadId: string,
        generationId: string,
        checkpoint: Omit<PersistedCheckpoint, 'schemaVersion'>
    ): Promise<void> {
        const data: PersistedCheckpoint = {
            ...checkpoint,
            schemaVersion: CURRENT_CHECKPOINT_SCHEMA_VERSION,
        };
        await writeGzipAsync(this.getCheckpointFilePath(workspacePath, threadId, generationId), data);
    }

    /**
     * Delete a checkpoint snapshot file.
     */
    deleteCheckpoint(workspacePath: string, threadId: string, generationId: string): void {
        const filePath = this.getCheckpointFilePath(workspacePath, threadId, generationId);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.error(`[CopilotPersistenceStore] Failed to delete checkpoint ${generationId}:`, err);
        }
    }

    /**
     * List generation IDs that have persisted checkpoint snapshots.
     */
    listCheckpoints(workspacePath: string, threadId: string): string[] {
        const checkpointsDir = path.join(
            this.getThreadDir(workspacePath, threadId),
            CHECKPOINTS_DIR
        );
        return listFilesBySuffixSync(checkpointsDir, CHECKPOINT_SUFFIX)
            .map(fileName => fileName.replace(CHECKPOINT_SUFFIX, ''));
    }

    /**
     * Check whether any persisted data exists for a workspace.
     */
    hasWorkspaceData(workspacePath: string): boolean {
        return fs.existsSync(this.getWorkspaceMetaPath(workspacePath));
    }
}
