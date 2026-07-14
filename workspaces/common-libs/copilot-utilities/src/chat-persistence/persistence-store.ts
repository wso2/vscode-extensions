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
    PersistedGeneration,
    PersistedGenerationHeader,
    ThreadLogRecord,
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
    atomicWriteSync,
    appendLineSync,
    readJsonlSync,
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
const THREAD_LOG_FILE = 'thread.jsonl';
const CHECKPOINT_SUFFIX = '.snapshot.gz';

/**
 * Compaction tuning for the append-only thread log.
 *
 * Live-session compaction is **size-proportional** so that per-append cost stays
 * genuinely amortized O(1) (not just smaller): a thread is compacted once it has
 * received more than `max(COMPACT_MIN_APPENDS, COMPACT_GROWTH_FACTOR × liveGens)`
 * appends since its last compaction. A compaction costs O(liveGens) and happens
 * at most once per that many appends, so the amortized cost per append does not
 * grow with the conversation length — this is what keeps the format from
 * regressing to the O(n²)-per-session behaviour of full-file rewrites. Using a
 * fixed interval instead would make each compaction O(liveGens) every N appends,
 * i.e. still superlinear for large threads.
 *
 * `COMPACT_LOAD_FACTOR` / `COMPACT_LOAD_MIN_LINES` bound startup replay cost:
 * on load, if the log holds more than `FACTOR ×` the records a compact log
 * would (and more than the minimum), it is compacted opportunistically.
 */
const COMPACT_MIN_APPENDS = 64;
const COMPACT_GROWTH_FACTOR = 3;
const COMPACT_LOAD_FACTOR = 3;
const COMPACT_LOAD_MIN_LINES = 16;

/**
 * File-based persistence store for copilot chat threads and checkpoints.
 *
 * Zero VS Code dependencies — uses only Node.js built-ins.
 * All thread reads/writes are synchronous (files are typically 1-2MB).
 * Checkpoint writes offer an async variant for large snapshots.
 */
/**
 * Build the compact record sequence for a thread: a `head`, a `meta`, then for
 * each generation in order a `gen` header followed by one `msg` per model
 * message. Replaying this sequence reproduces `thread`, and every message
 * appears exactly once (no duplication to compact away later).
 */
function buildCompactedRecords(thread: PersistedThread): ThreadLogRecord[] {
    const records: ThreadLogRecord[] = [
        { t: 'head', v: thread.schemaVersion, id: thread.id, createdAt: thread.createdAt },
        {
            t: 'meta',
            updatedAt: thread.updatedAt,
            name: thread.name,
            ...(thread.sessionId !== undefined ? { sessionId: thread.sessionId } : {}),
        },
    ];
    for (const gen of thread.generations) {
        const { modelMessages, ...header } = gen;
        records.push({ t: 'gen', updatedAt: thread.updatedAt, gen: header });
        for (const message of modelMessages ?? []) {
            records.push({ t: 'msg', updatedAt: thread.updatedAt, genId: gen.id, message });
        }
    }
    return records;
}

export class CopilotPersistenceStore {
    private readonly baseDir: string;
    private readonly workspaceIdResolver: (workspacePath: string) => string;

    // Per-thread count of appends since the last compaction (runtime-only) and
    // the size-proportional threshold at which the next compaction fires. Both
    // are keyed by `${workspaceHash}/${threadId}` and live for the process
    // lifetime. Drives amortized (size-aware) compaction.
    private readonly appendsSinceCompaction: Map<string, number> = new Map();
    private readonly compactionThreshold: Map<string, number> = new Map();

    // Per-generation append tracking (runtime-only), keyed by
    // `${workspaceHash}/${threadId}#${generationId}`. Lets appendGeneration
    // persist only what changed: the header when it differs, and only the model
    // messages not yet written. `count` = messages already persisted;
    // `lastJson` = JSON of the last persisted message (used to detect whether a
    // new modelMessages array extends what we have or was rewritten).
    private readonly lastHeaderJson: Map<string, string> = new Map();
    private readonly msgState: Map<string, { count: number; lastJson: string }> = new Map();

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

    /** Resolve the path to the legacy whole-file thread JSON (pre-v2). */
    private getThreadFilePath(workspacePath: string, threadId: string): string {
        return path.join(this.getThreadDir(workspacePath, threadId), THREAD_FILE);
    }

    /** Resolve the path to the append-only thread log (`thread.jsonl`). */
    private getThreadLogFilePath(workspacePath: string, threadId: string): string {
        return path.join(this.getThreadDir(workspacePath, threadId), THREAD_LOG_FILE);
    }

    /** Key used to track per-thread append counts for amortized compaction. */
    private compactionKey(workspacePath: string, threadId: string): string {
        return `${computeWorkspaceHash(this.workspaceIdResolver(workspacePath))}/${threadId}`;
    }

    /** Key used to track per-generation persisted header/messages. */
    private genKey(workspacePath: string, threadId: string, generationId: string): string {
        return `${this.compactionKey(workspacePath, threadId)}#${generationId}`;
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
        const prefix = `${computeWorkspaceHash(this.workspaceIdResolver(workspacePath))}/`;
        this.clearRuntimeStateByPrefix(prefix);
    }

    /** Drop all in-memory tracking whose key starts with `prefix`. */
    private clearRuntimeStateByPrefix(prefix: string): void {
        for (const map of [this.appendsSinceCompaction, this.compactionThreshold, this.lastHeaderJson, this.msgState]) {
            for (const key of map.keys()) {
                if (key.startsWith(prefix)) { map.delete(key); }
            }
        }
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
     * Load a thread from disk.
     *
     * Threads persist as an append-only log (`thread.jsonl`, schema v2). The log
     * is replayed to rebuild the thread. If only a legacy whole-file snapshot
     * (`thread.json`, schema v1) exists, it is read, migrated, rewritten as a
     * `thread.jsonl`, and the legacy file is deleted (one-time migration).
     *
     * Returns `null` if the thread does not exist or is corrupt.
     */
    loadThread(workspacePath: string, threadId: string): PersistedThread | null {
        const logPath = this.getThreadLogFilePath(workspacePath, threadId);
        const records = readJsonlSync<ThreadLogRecord>(logPath);

        if (records !== null) {
            // Append-only log is the source of truth once it exists.
            const thread = this.replayThread(threadId, records);
            if (thread) {
                this.compactOnLoadIfNeeded(workspacePath, threadId, thread, records.length);
                // Prime per-generation tracking so subsequent appends persist only
                // deltas (idempotent if on-load compaction already rebuilt it).
                this.rebuildGenTracking(workspacePath, threadId, thread.generations);
                // A stale legacy snapshot may linger if a previous migration was
                // interrupted after writing the log but before deleting the JSON.
                this.deleteLegacyThreadFile(workspacePath, threadId);
                return thread;
            }
            // The log exists but yielded nothing recoverable (empty or every line
            // corrupt). Fall through to the legacy snapshot if one still exists,
            // rather than reporting the thread as gone.
        }

        // Legacy fallback: whole-file thread.json (schema v1).
        const raw = readJsonSync<Record<string, unknown>>(this.getThreadFilePath(workspacePath, threadId));
        if (!raw) {
            return null;
        }
        try {
            const migrated = migrateThread(raw);
            // Convert to the append-only format and remove the legacy file.
            this.saveThread(workspacePath, threadId, migrated);
            return migrated;
        } catch (err) {
            console.error(`[CopilotPersistenceStore] Failed to migrate thread ${threadId}:`, err);
            return null;
        }
    }

    /**
     * Persist a thread by rewriting its log in compact form (one record per
     * live generation), atomically. Used for thread creation, one-time
     * migration from the legacy format, and compaction.
     *
     * This does NOT append — for incremental mutations use {@link appendGeneration},
     * {@link removeGenerationRecord}, {@link truncateFromGeneration} and
     * {@link updateThreadMeta}, which append a single record instead of
     * rewriting the whole thread.
     */
    saveThread(workspacePath: string, threadId: string, thread: Omit<PersistedThread, 'schemaVersion'>): void {
        const data: PersistedThread = {
            ...thread,
            schemaVersion: CURRENT_THREAD_SCHEMA_VERSION,
        };
        const records = buildCompactedRecords(data);
        const content = records.map(r => JSON.stringify(r)).join('\n') + '\n';
        atomicWriteSync(this.getThreadLogFilePath(workspacePath, threadId), content);
        // The compacted log fully supersedes any legacy whole-file snapshot.
        this.deleteLegacyThreadFile(workspacePath, threadId);
        // Reset the append counter and set the next compaction threshold
        // proportional to the live generation count.
        const key = this.compactionKey(workspacePath, threadId);
        this.appendsSinceCompaction.set(key, 0);
        this.compactionThreshold.set(
            key,
            Math.max(COMPACT_MIN_APPENDS, COMPACT_GROWTH_FACTOR * data.generations.length)
        );
        // Rebuild per-generation tracking to match what we just wrote.
        this.rebuildGenTracking(workspacePath, threadId, data.generations);
    }

    /**
     * Reset per-generation header/message tracking to match a known-persisted
     * set of generations (after a full write, compaction, or load). Clears any
     * stale entries for the thread so removed generations don't linger.
     */
    private rebuildGenTracking(
        workspacePath: string,
        threadId: string,
        generations: PersistedGeneration[]
    ): void {
        const prefix = `${this.compactionKey(workspacePath, threadId)}#`;
        for (const k of this.lastHeaderJson.keys()) {
            if (k.startsWith(prefix)) { this.lastHeaderJson.delete(k); }
        }
        for (const k of this.msgState.keys()) {
            if (k.startsWith(prefix)) { this.msgState.delete(k); }
        }
        for (const gen of generations) {
            const gKey = this.genKey(workspacePath, threadId, gen.id);
            const { modelMessages, ...header } = gen;
            const msgs = modelMessages ?? [];
            this.lastHeaderJson.set(gKey, JSON.stringify(header));
            this.msgState.set(gKey, {
                count: msgs.length,
                lastJson: msgs.length ? JSON.stringify(msgs[msgs.length - 1]) : '',
            });
        }
    }

    // ============================================
    // Thread Log — Append API (incremental persistence)
    // ============================================

    /** Append one record to the log without touching the compaction counter. */
    private rawAppendRecord(workspacePath: string, threadId: string, record: ThreadLogRecord): void {
        appendLineSync(this.getThreadLogFilePath(workspacePath, threadId), JSON.stringify(record));
    }

    /**
     * Append a single record to a thread's log, then run amortized compaction.
     */
    appendThreadRecord(workspacePath: string, threadId: string, record: ThreadLogRecord): void {
        this.rawAppendRecord(workspacePath, threadId, record);
        this.noteAppend(workspacePath, threadId, 1);
    }

    /**
     * Persist a generation incrementally (covers both add and in-place update).
     *
     * Writes only what actually changed:
     *  - a `gen` header record iff the header (everything except `modelMessages`)
     *    differs from what was last persisted for this generation;
     *  - one `msg` record for each model message not yet persisted, when the new
     *    `modelMessages` extend what we already have (the normal per-step case);
     *  - a single `msgs` reset record when `modelMessages` were rewritten rather
     *    than extended (e.g. server-side context compaction shortened them).
     *
     * This is what makes a turn cost O(messages) to persist instead of
     * O(messages²): a message is written once, not re-written on every step.
     */
    appendGeneration(
        workspacePath: string,
        threadId: string,
        generation: PersistedGeneration,
        updatedAt: number = Date.now()
    ): void {
        const gKey = this.genKey(workspacePath, threadId, generation.id);
        const { modelMessages, ...header } = generation;
        const msgs = modelMessages ?? [];
        let written = 0;

        // 1) Header: append only when it changed.
        const headerJson = JSON.stringify(header);
        if (this.lastHeaderJson.get(gKey) !== headerJson) {
            this.rawAppendRecord(workspacePath, threadId, { t: 'gen', updatedAt, gen: header });
            this.lastHeaderJson.set(gKey, headerJson);
            written++;
        }

        // 2) Messages: append only the new ones, or reset if rewritten.
        const state = this.msgState.get(gKey) ?? { count: 0, lastJson: '' };
        const extendsPrevious =
            msgs.length >= state.count &&
            (state.count === 0 || JSON.stringify(msgs[state.count - 1]) === state.lastJson);
        if (extendsPrevious) {
            for (let i = state.count; i < msgs.length; i++) {
                this.rawAppendRecord(workspacePath, threadId, { t: 'msg', updatedAt, genId: generation.id, message: msgs[i] });
                written++;
            }
        } else {
            // Prefix changed or list shrank — the incremental model no longer
            // holds; replace the whole message list for this generation.
            this.rawAppendRecord(workspacePath, threadId, { t: 'msgs', updatedAt, genId: generation.id, messages: msgs });
            written++;
        }
        this.msgState.set(gKey, {
            count: msgs.length,
            lastJson: msgs.length ? JSON.stringify(msgs[msgs.length - 1]) : '',
        });

        // Trigger amortized compaction once for the whole batch (never mid-batch,
        // so the log is always in a consistent state when compaction reads it).
        if (written > 0) {
            this.noteAppend(workspacePath, threadId, written);
        }
    }

    /**
     * Append a tombstone removing a generation by id.
     */
    removeGenerationRecord(
        workspacePath: string,
        threadId: string,
        generationId: string,
        updatedAt: number = Date.now()
    ): void {
        const gKey = this.genKey(workspacePath, threadId, generationId);
        this.lastHeaderJson.delete(gKey);
        this.msgState.delete(gKey);
        this.appendThreadRecord(workspacePath, threadId, { t: 'del', updatedAt, id: generationId });
    }

    /**
     * Append a truncation removing `fromGenerationId` and every generation
     * appended after it (restore-to-checkpoint).
     */
    truncateFromGeneration(
        workspacePath: string,
        threadId: string,
        fromGenerationId: string,
        updatedAt: number = Date.now()
    ): void {
        this.appendThreadRecord(workspacePath, threadId, { t: 'trunc', updatedAt, fromId: fromGenerationId });
    }

    /**
     * Append a thread-level metadata update (name / sessionId).
     */
    updateThreadMeta(
        workspacePath: string,
        threadId: string,
        meta: { name?: string; sessionId?: string },
        updatedAt: number = Date.now()
    ): void {
        this.appendThreadRecord(workspacePath, threadId, { t: 'meta', updatedAt, ...meta });
    }

    /**
     * Rewrite a thread's log in compact form. Safe to call at any time; a no-op
     * if the thread has no log yet.
     */
    compactThread(workspacePath: string, threadId: string): void {
        const records = readJsonlSync<ThreadLogRecord>(this.getThreadLogFilePath(workspacePath, threadId));
        if (records === null) {
            return;
        }
        const thread = this.replayThread(threadId, records);
        if (thread) {
            this.saveThread(workspacePath, threadId, thread);
        }
    }

    // ============================================
    // Thread Log — internal helpers
    // ============================================

    /**
     * Rebuild a {@link PersistedThread} by replaying log records in order.
     *
     * Returns `null` only when there is nothing to reconstruct (empty file, or a
     * file whose every line was unparseable). A `head` record supplies the
     * thread's precise `id`/`createdAt`; if it is missing but other records
     * exist (e.g. appends reached disk before an interrupted init), the thread
     * is still reconstructed using the directory's `threadId` and the earliest
     * record timestamp — so no committed data is lost.
     */
    private replayThread(threadId: string, records: ThreadLogRecord[]): PersistedThread | null {
        let hasHead = false;
        let recognized = 0;
        let minTimestamp = Number.POSITIVE_INFINITY;
        let id = threadId;
        let name = '';
        let sessionId: string | undefined;
        let createdAt = 0;
        let updatedAt = 0;

        // Preserve first-seen order of generations; headers and messages are
        // tracked separately and stitched together at the end.
        const order: string[] = [];
        const headers = new Map<string, PersistedGenerationHeader>();
        const messages = new Map<string, unknown[]>();
        const seen = (genId: string): boolean => headers.has(genId) || messages.has(genId);
        const noteGen = (genId: string): void => { if (!seen(genId)) { order.push(genId); } };
        const removeGen = (genId: string): boolean => {
            const existed = headers.delete(genId);
            const existedM = messages.delete(genId);
            if (existed || existedM) {
                const idx = order.indexOf(genId);
                if (idx !== -1) { order.splice(idx, 1); }
                return true;
            }
            return false;
        };

        for (const record of records) {
            switch (record.t) {
                case 'head':
                    hasHead = true;
                    recognized++;
                    id = record.id;
                    createdAt = record.createdAt;
                    updatedAt = Math.max(updatedAt, record.createdAt);
                    minTimestamp = Math.min(minTimestamp, record.createdAt);
                    break;
                case 'meta':
                    recognized++;
                    if (record.name !== undefined) { name = record.name; }
                    if (record.sessionId !== undefined) { sessionId = record.sessionId; }
                    updatedAt = Math.max(updatedAt, record.updatedAt);
                    minTimestamp = Math.min(minTimestamp, record.updatedAt);
                    break;
                case 'gen':
                    recognized++;
                    noteGen(record.gen.id);
                    headers.set(record.gen.id, record.gen);
                    updatedAt = Math.max(updatedAt, record.updatedAt);
                    minTimestamp = Math.min(minTimestamp, record.updatedAt);
                    break;
                case 'msg': {
                    recognized++;
                    noteGen(record.genId);
                    const arr = messages.get(record.genId) ?? [];
                    arr.push(record.message);
                    messages.set(record.genId, arr);
                    updatedAt = Math.max(updatedAt, record.updatedAt);
                    minTimestamp = Math.min(minTimestamp, record.updatedAt);
                    break;
                }
                case 'msgs':
                    recognized++;
                    noteGen(record.genId);
                    messages.set(record.genId, [...record.messages]);
                    updatedAt = Math.max(updatedAt, record.updatedAt);
                    minTimestamp = Math.min(minTimestamp, record.updatedAt);
                    break;
                case 'del':
                    recognized++;
                    removeGen(record.id);
                    updatedAt = Math.max(updatedAt, record.updatedAt);
                    minTimestamp = Math.min(minTimestamp, record.updatedAt);
                    break;
                case 'trunc': {
                    recognized++;
                    const idx = order.indexOf(record.fromId);
                    if (idx !== -1) {
                        for (const genId of order.slice(idx)) {
                            headers.delete(genId);
                            messages.delete(genId);
                        }
                        order.splice(idx);
                    }
                    updatedAt = Math.max(updatedAt, record.updatedAt);
                    minTimestamp = Math.min(minTimestamp, record.updatedAt);
                    break;
                }
            }
        }

        if (recognized === 0) {
            // Nothing recoverable — empty file or every line was corrupt.
            return null;
        }
        if (!hasHead && Number.isFinite(minTimestamp)) {
            // Reconstruct createdAt from the earliest record when head is absent.
            createdAt = minTimestamp;
        }

        const generations: PersistedGeneration[] = [];
        for (const genId of order) {
            const header = headers.get(genId);
            // A generation needs its header to be reconstructable. In practice the
            // header is always written before its messages; skip if it is missing.
            if (!header) { continue; }
            generations.push({ ...header, modelMessages: messages.get(genId) ?? [] });
        }
        const thread: PersistedThread = {
            schemaVersion: CURRENT_THREAD_SCHEMA_VERSION,
            id,
            name,
            createdAt,
            updatedAt,
            generations,
        };
        if (sessionId !== undefined) {
            thread.sessionId = sessionId;
        }
        return thread;
    }

    /**
     * Increment the append counter and compact once the size-proportional
     * threshold is reached. Compaction is a pure optimization — a write failure
     * (e.g. transient disk error) must never propagate out of an append, so it
     * is caught and the counter is reset to back off until the next interval.
     */
    private noteAppend(workspacePath: string, threadId: string, count: number): void {
        const key = this.compactionKey(workspacePath, threadId);
        const next = (this.appendsSinceCompaction.get(key) ?? 0) + count;
        const threshold = this.compactionThreshold.get(key) ?? COMPACT_MIN_APPENDS;
        if (next >= threshold) {
            try {
                // compactThread -> saveThread resets the counter + threshold.
                this.compactThread(workspacePath, threadId);
            } catch (err) {
                console.error(`[CopilotPersistenceStore] Compaction failed for thread ${threadId}:`, err);
                this.appendsSinceCompaction.set(key, 0); // back off; retry after another interval
            }
        } else {
            this.appendsSinceCompaction.set(key, next);
        }
    }

    /**
     * Compact on load when the log has grown well beyond its compact size.
     * Purely an optimization: `loadThread` has already replayed the thread, so a
     * write failure here must be swallowed rather than fail the (previously
     * read-only) load and abort the whole workspace restore.
     */
    private compactOnLoadIfNeeded(
        workspacePath: string,
        threadId: string,
        thread: PersistedThread,
        lineCount: number
    ): void {
        const compactSize = thread.generations.length + 2; // head + meta + gens
        if (lineCount > COMPACT_LOAD_MIN_LINES && lineCount > COMPACT_LOAD_FACTOR * compactSize) {
            try {
                this.saveThread(workspacePath, threadId, thread);
            } catch (err) {
                console.error(`[CopilotPersistenceStore] On-load compaction failed for thread ${threadId}:`, err);
                // Keep the already-replayed thread; compaction will retry later.
            }
        }
    }

    /** Remove a superseded legacy `thread.json`, if present. */
    private deleteLegacyThreadFile(workspacePath: string, threadId: string): void {
        const legacyPath = this.getThreadFilePath(workspacePath, threadId);
        try {
            if (fs.existsSync(legacyPath)) {
                fs.unlinkSync(legacyPath);
            }
        } catch (err) {
            console.error(`[CopilotPersistenceStore] Failed to remove legacy thread file ${threadId}:`, err);
        }
    }

    /**
     * Delete a thread and all its checkpoint files.
     */
    deleteThread(workspacePath: string, threadId: string): void {
        removeDirSync(this.getThreadDir(workspacePath, threadId));
        const key = this.compactionKey(workspacePath, threadId);
        this.appendsSinceCompaction.delete(key);
        this.compactionThreshold.delete(key);
        // Clear per-generation tracking for this thread (keys are `${key}#genId`).
        this.clearRuntimeStateByPrefix(`${key}#`);
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
