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

import * as fs from 'fs';
import * as path from 'path';
import {
    IPC_PROTOCOL_VERSION,
    IpcErrorShape,
    IpcInboundMessage,
    IpcOutboundMessage,
    IpcRequestMessage,
    IpcRequestMethod,
    IpcResponseMessage,
    IndexProgressEventPayload,
    SemanticSearchHit,
    SemanticSearchResponsePayload,
    WorkerLogEventPayload,
    WorkerStatusPayload,
} from './ipc-types';
import { OramaDB } from '../db/orama';
import { Embedder } from './embedder';
import { downloadModel, isModelDownloaded } from './model-manager';
import { Pipeline } from './pipeline';

interface WorkerRuntimeState {
    available: boolean;
    initializing: boolean;
    chunkCount: number;
    projectPath?: string;
    dbPath?: string;
    modelRootPath?: string;
    artifactsSubPath?: string;
    reason?: string;
}

const state: WorkerRuntimeState = {
    available: false,
    initializing: false,
    chunkCount: 0,
    reason: 'Worker not initialized',
};

let db: OramaDB | null = null;
let embedder: Embedder | null = null;
let pipeline: Pipeline | null = null;
let artifactDirs: string[] = [];
let pollTimer: NodeJS.Timeout | null = null;
let shuttingDown = false;

// Indexing job queue — ensures only one indexing operation runs at a time
let indexingJob: Promise<void> = Promise.resolve();
// Incremental indexing requests are coalesced while a flush is queued/running,
// so bursts of file notifications merge into one bounded worker job.
let incrementalFlushPromise: Promise<void> | null = null;
const pendingIncrementalDirs = new Set<string>();

function enqueueIndexing(job: () => Promise<void>): Promise<void> {
    const run = indexingJob.then(job, job);
    indexingJob = run.catch(() => undefined);
    return run;
}

function enqueueIncrementalIndexing(dirs: string[]): Promise<void> {
    for (const dir of dirs) {
        pendingIncrementalDirs.add(dir);
    }

    if (!incrementalFlushPromise) {
        incrementalFlushPromise = enqueueIndexing(async () => {
            try {
                while (pendingIncrementalDirs.size > 0) {
                    const batch = Array.from(pendingIncrementalDirs);
                    pendingIncrementalDirs.clear();
                    await runIncrementalIndexing(batch);
                }
            } finally {
                incrementalFlushPromise = null;
            }
        });
    }

    return incrementalFlushPromise;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function sendMessage(message: IpcOutboundMessage): void {
    if (typeof process.send !== 'function') {
        return;
    }
    process.send(message);
}

function emitLog(level: WorkerLogEventPayload['level'], message: string): void {
    sendMessage({
        v: IPC_PROTOCOL_VERSION,
        id: `evt-log-${Date.now()}`,
        ts: Date.now(),
        type: 'event',
        method: 'worker.log',
        payload: { level, message } satisfies WorkerLogEventPayload,
    });
}

function emitStatusChanged(): void {
    const payload: WorkerStatusPayload = {
        available: state.available,
        initializing: state.initializing,
        chunkCount: state.chunkCount,
        projectPath: state.projectPath,
        reason: state.reason,
    };

    sendMessage({
        v: IPC_PROTOCOL_VERSION,
        id: `evt-status-${Date.now()}`,
        ts: Date.now(),
        type: 'event',
        method: 'status.changed',
        payload,
    });
}

function emitProgress(stage: IndexProgressEventPayload['stage'], detail: string, fileIndex: number, totalFiles: number): void {
    const payload: IndexProgressEventPayload = {
        stage,
        detail,
        fileIndex,
        totalFiles,
    };

    sendMessage({
        v: IPC_PROTOCOL_VERSION,
        id: `evt-index-${Date.now()}`,
        ts: Date.now(),
        type: 'event',
        method: 'index.progress',
        payload,
    });
}

function responseOk<TResult>(
    req: IpcRequestMessage,
    payload: TResult
): IpcResponseMessage<TResult> {
    return {
        v: IPC_PROTOCOL_VERSION,
        id: req.id,
        ts: Date.now(),
        type: 'response',
        method: req.method,
        ok: true,
        payload,
    };
}

function responseError(
    req: IpcRequestMessage,
    error: IpcErrorShape
): IpcResponseMessage {
    return {
        v: IPC_PROTOCOL_VERSION,
        id: req.id,
        ts: Date.now(),
        type: 'response',
        method: req.method,
        ok: false,
        error,
    };
}

function invalidPayload(req: IpcRequestMessage, reason: string): IpcResponseMessage {
    return responseError(req, {
        code: 'INVALID_PAYLOAD',
        message: reason,
        retryable: false,
    });
}

function getStatusPayload(): WorkerStatusPayload {
    return {
        available: state.available,
        initializing: state.initializing,
        chunkCount: state.chunkCount,
        projectPath: state.projectPath,
        reason: state.reason,
    };
}

function resolveArtifactDirs(projectPath: string, artifactsSubPath: string): string[] {
    const resolved: string[] = [];
    const direct = path.join(projectPath, artifactsSubPath);
    if (fs.existsSync(direct)) {
        resolved.push(direct);
        return resolved;
    }

    try {
        const entries = fs.readdirSync(projectPath, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            const sub = path.join(projectPath, entry.name, artifactsSubPath);
            if (fs.existsSync(sub)) {
                resolved.push(sub);
            }
        }
    } catch {
        // Ignore directory scan errors; caller handles empty result
    }

    return resolved;
}

function clearPolling(): void {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

async function updateChunkCount(): Promise<void> {
    state.chunkCount = db ? await db.getChunkCount() : 0;
}

async function runInitialIndexing(dirs: string[]): Promise<void> {
    if (!pipeline || dirs.length === 0) {
        await updateChunkCount();
        return;
    }

    await pipeline.processInitial(dirs, (stage, detail, fileIndex, totalFiles) => {
        emitProgress(stage, detail, fileIndex, totalFiles);
    });
    await updateChunkCount();
}

async function runIncrementalIndexing(dirs: string[]): Promise<void> {
    if (!pipeline || dirs.length === 0) {
        await updateChunkCount();
        return;
    }

    await pipeline.processIncremental(dirs, (stage, detail, fileIndex, totalFiles) => {
        emitProgress(stage, detail, fileIndex, totalFiles);
    });
    await updateChunkCount();
}

async function handleInit(req: IpcRequestMessage): Promise<IpcResponseMessage> {
    if (!isObject(req.payload)) {
        return invalidPayload(req, 'init payload must be an object');
    }

    const projectPath = req.payload.projectPath;
    const dbPath = req.payload.dbPath;
    const modelRootPath = req.payload.modelRootPath;
    const artifactsSubPath = req.payload.artifactsSubPath;
    const pollIntervalMs = req.payload.pollIntervalMs;

    if (typeof projectPath !== 'string' || projectPath.trim().length === 0) {
        return invalidPayload(req, 'init.projectPath is required');
    }
    if (typeof dbPath !== 'string' || dbPath.trim().length === 0) {
        return invalidPayload(req, 'init.dbPath is required');
    }
    if (typeof modelRootPath !== 'string' || modelRootPath.trim().length === 0) {
        return invalidPayload(req, 'init.modelRootPath is required');
    }
    if (typeof artifactsSubPath !== 'string' || artifactsSubPath.trim().length === 0) {
        return invalidPayload(req, 'init.artifactsSubPath is required');
    }
    if (typeof pollIntervalMs !== 'number' || pollIntervalMs <= 0) {
        return invalidPayload(req, 'init.pollIntervalMs must be a positive number');
    }

    state.initializing = true;
    state.available = false;
    state.projectPath = projectPath;
    state.dbPath = dbPath;
    state.modelRootPath = modelRootPath;
    state.artifactsSubPath = artifactsSubPath;
    state.reason = 'Initializing worker resources';
    emitStatusChanged();

    let nextDb: OramaDB | null = null;
    let nextEmbedder: Embedder | null = null;

    try {
        const dbDirectory = path.dirname(dbPath);
        if (!fs.existsSync(dbDirectory)) {
            fs.mkdirSync(dbDirectory, { recursive: true });
        }

        if (!isModelDownloaded(modelRootPath)) {
            emitLog('info', '[Worker] Model not found; downloading before init');
            await downloadModel(undefined, modelRootPath);
        }

        nextDb = new OramaDB(dbPath);
        await nextDb.initialize();
        nextEmbedder = new Embedder();

        // Phase 1: Load the ONNX model 
        emitLog('info', '[Worker] Loading ONNX model — this may take a moment for large models');
        await nextEmbedder.initialize(modelRootPath);
        emitLog('info', '[Worker] ONNX model loaded successfully');

        const nextPipeline = new Pipeline(nextDb, nextEmbedder);

        if (db) {
            try {
                await db.close();
            } catch {
                // Ignore close errors
            }
        }
        if (embedder) {
            await embedder.close();
        }

        clearPolling();

        db = nextDb;
        embedder = nextEmbedder;
        pipeline = nextPipeline;
        nextDb = null;
        nextEmbedder = null;
        artifactDirs = resolveArtifactDirs(projectPath, artifactsSubPath);

        // Phase 2: Mark worker as available immediately 
        state.chunkCount = await db.getChunkCount();
        state.initializing = false;
        state.available = true;
        state.reason = 'Worker ready';
        emitStatusChanged();

        // Phase 3: Kick off initial indexing asynchronously
        setImmediate(() => {
            state.initializing = true;
            state.reason = 'Running initial indexing';
            emitStatusChanged();

            runInitialIndexing(artifactDirs)
                .then(async () => {
                    state.chunkCount = db ? await db.getChunkCount() : 0;
                    state.initializing = false;
                    state.reason = 'Worker ready';
                    emitStatusChanged();

                    // After initial indexing completes, schedule each incremental poll only
                    // after the previous indexing job finishes. This intentionally allows
                    // interval drift so long indexing runs never overlap.
                    clearPolling();
                    const scheduleNextPoll = () => {
                        pollTimer = setTimeout(async () => {
                            try {
                                await enqueueIncrementalIndexing(artifactDirs);
                                emitStatusChanged();
                            } catch (error) {
                                const msg = error instanceof Error ? error.message : String(error);
                                emitLog('warn', `[Worker] Incremental indexing failed: ${msg}`);
                            } finally {
                                scheduleNextPoll();
                            }
                        }, pollIntervalMs);
                    };
                    scheduleNextPoll();
                })
                .catch((error) => {
                    const msg = error instanceof Error ? error.message : String(error);
                    emitLog('error', `[Worker] Initial indexing failed: ${msg}`);
                    state.initializing = false;
                    // Worker stays available — host can still search existing chunks
                    state.reason = `Initial indexing failed: ${msg}`;
                    emitStatusChanged();
                });
        });

        return responseOk(req, getStatusPayload());
    } catch (error) {
        await Promise.allSettled([
            nextEmbedder ? (async () => {
                try {
                    await nextEmbedder.close();
                } catch {
                    // Ignore close errors during failed init cleanup
                }
            })() : Promise.resolve(),
            nextDb ? (async () => {
                try {
                    await nextDb.close();
                } catch {
                    // Ignore close errors during failed init cleanup
                }
            })() : Promise.resolve(),
        ]);
        const message = error instanceof Error ? error.message : String(error);
        state.initializing = false;
        state.available = false;
        state.reason = message;
        emitStatusChanged();
        return responseError(req, {
            code: 'INTERNAL',
            message: `Worker init failed: ${message}`,
            retryable: true,
        });
    }
}

async function handleHealth(req: IpcRequestMessage): Promise<IpcResponseMessage> {
    return responseOk(req, {
        status: state.available ? 'ready' : (state.initializing ? 'initializing' : 'unavailable'),
        available: state.available,
        initializing: state.initializing,
        ts: Date.now(),
    });
}

async function handleIndexInitial(req: IpcRequestMessage): Promise<IpcResponseMessage> {
    if (!state.available || !pipeline) {
        return responseError(req, {
            code: 'WORKER_NOT_READY',
            message: 'Worker is not ready for index.initial',
            retryable: true,
        });
    }

    let dirs = artifactDirs;
    if (isObject(req.payload) && Array.isArray(req.payload.directories)) {
        const filtered = req.payload.directories.filter((d): d is string => typeof d === 'string' && d.length > 0);
        if (filtered.length > 0) {
            dirs = filtered;
        }
    }

    await enqueueIndexing(() => runInitialIndexing(dirs));

    return responseOk(req, {
        accepted: true,
        chunkCount: state.chunkCount,
        message: 'index.initial completed',
    });
}

async function handleIndexIncremental(req: IpcRequestMessage): Promise<IpcResponseMessage> {
    if (!state.available || !pipeline) {
        return responseError(req, {
            code: 'WORKER_NOT_READY',
            message: 'Worker is not ready for index.incremental',
            retryable: true,
        });
    }

    let dirs: string[] = artifactDirs;

    if (isObject(req.payload)) {
        const explicitDirs = Array.isArray(req.payload.directories)
            ? req.payload.directories.filter((d): d is string => typeof d === 'string' && d.length > 0)
            : [];

        const changedFiles = Array.isArray(req.payload.changedFiles)
            ? req.payload.changedFiles.filter((f): f is string => typeof f === 'string' && f.length > 0)
            : [];

        if (explicitDirs.length > 0) {
            dirs = explicitDirs;
        } else if (changedFiles.length > 0) {
            dirs = Array.from(new Set(changedFiles.map((f) => path.dirname(f))));
        }
    }

    await enqueueIncrementalIndexing(dirs);
    emitStatusChanged();

    return responseOk(req, {
        accepted: true,
        chunkCount: state.chunkCount,
        message: 'index.incremental completed',
    });
}

async function handleNotifyFileChange(req: IpcRequestMessage): Promise<IpcResponseMessage> {
    if (!isObject(req.payload) || typeof req.payload.filePath !== 'string') {
        return invalidPayload(req, 'notify.fileChange.filePath is required');
    }

    if (!state.available || !pipeline) {
        return responseError(req, {
            code: 'WORKER_NOT_READY',
            message: 'Worker is not ready for notify.fileChange',
            retryable: true,
        });
    }

    const dir = path.dirname(req.payload.filePath);
    await enqueueIncrementalIndexing([dir]);
    emitStatusChanged();

    return responseOk(req, {
        accepted: true,
        filePath: req.payload.filePath,
        chunkCount: state.chunkCount,
        message: 'notify.fileChange processed',
    });
}

async function handleSearchSemantic(req: IpcRequestMessage): Promise<IpcResponseMessage> {
    if (!isObject(req.payload) || typeof req.payload.query !== 'string') {
        return invalidPayload(req, 'search.semantic.query is required');
    }

    if (!state.available || !db || !embedder) {
        return responseError(req, {
            code: 'MODEL_NOT_READY',
            message: 'Worker is not ready for semantic search',
            retryable: true,
        });
    }

    if (state.initializing) {
        return responseError(req, {
            code: 'INDEX_NOT_READY',
            message: 'Semantic index is still being built',
            retryable: true,
        });
    }

    const topK = typeof req.payload.topK === 'number' && req.payload.topK > 0
        ? Math.floor(req.payload.topK)
        : 8;
    const scoreThreshold = typeof req.payload.scoreThreshold === 'number'
        ? req.payload.scoreThreshold
        : 0.35;

    const startedAt = Date.now();

    const queryEmbedding = await embedder.embed(req.payload.query);
    
    // Orama semantic search directly
    const rawHits = await db.semanticSearch(
        Array.from(queryEmbedding),
        topK,
        scoreThreshold
    );

    const hits: SemanticSearchHit[] = rawHits.map(hit => ({
        id: hit.id,
        filePath: hit.filePath,
        chunkType: hit.chunkType,
        startLine: hit.startLine,
        endLine: hit.endLine,
        context: hit.context,
        score: hit.score ?? 0,
    }));

    state.chunkCount = await db.getChunkCount();

    const result: SemanticSearchResponsePayload = {
        query: req.payload.query,
        latencyMs: Date.now() - startedAt,
        totalChunksScanned: state.chunkCount, // Not exactly scanned, but the total db size
        hits,
    };

    return responseOk(req, result);
}

async function handleShutdown(req: IpcRequestMessage): Promise<IpcResponseMessage> {
    shuttingDown = true;
    clearPolling();

    state.available = false;
    state.initializing = false;
    state.reason = 'Shutdown in progress';
    emitStatusChanged();

    // Wait for any pending indexing job to complete before shutting down
    try {
        await indexingJob;
    } catch {
        // Ignore errors in pending indexing job during shutdown
    }

    if (embedder) {
        await embedder.close();
        embedder = null;
    }
    if (db) {
        try {
            await db.close();
        } catch {
            // Ignore close errors
        }
        db = null;
    }

    pipeline = null;
    artifactDirs = [];
    indexingJob = Promise.resolve();

    state.chunkCount = 0;
    state.reason = 'Shutdown requested';
    emitStatusChanged();

    setTimeout(() => {
        process.exit(0);
    }, 0);

    return responseOk(req, { accepted: true });
}

async function handleStatusGet(req: IpcRequestMessage): Promise<IpcResponseMessage> {
    return responseOk(req, getStatusPayload());
}

async function dispatchRequest(req: IpcRequestMessage): Promise<IpcResponseMessage> {
    const method: IpcRequestMethod = req.method;

    switch (method) {
        case 'init':
            return handleInit(req);
        case 'health':
            return handleHealth(req);
        case 'index.initial':
            return handleIndexInitial(req);
        case 'index.incremental':
            return handleIndexIncremental(req);
        case 'notify.fileChange':
            return handleNotifyFileChange(req);
        case 'search.semantic':
            return handleSearchSemantic(req);
        case 'shutdown':
            return handleShutdown(req);
        case 'status.get':
            return handleStatusGet(req);
        default:
            return responseError(req, {
                code: 'INVALID_PAYLOAD',
                message: `Unsupported method: ${String(method)}`,
                retryable: false,
            });
    }
}

function isInboundRequest(value: unknown): value is IpcInboundMessage {
    if (!isObject(value)) {
        return false;
    }

    return value.type === 'request'
        && value.v === IPC_PROTOCOL_VERSION
        && typeof value.id === 'string'
        && typeof value.ts === 'number'
        && typeof value.method === 'string';
}



process.on('message', async (raw: unknown) => {
    if (!isInboundRequest(raw)) {
        emitLog('warn', 'Received invalid IPC message shape');
        return;
    }

    if (shuttingDown && raw.method !== 'shutdown') {
        sendMessage(responseError(raw, {
            code: 'WORKER_NOT_READY',
            message: 'Worker is shutting down',
            retryable: true,
        }));
        return;
    }

    try {
        const response = await dispatchRequest(raw);
        sendMessage(response);
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const response = responseError(raw, {
            code: 'INTERNAL',
            message: err.message,
            retryable: true,
            details: { stack: err.stack },
        });
        sendMessage(response);
    }
});

process.on('uncaughtException', (error: Error) => {
    emitLog('error', `[Worker] Uncaught exception: ${error.message}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    emitLog('error', `[Worker] Unhandled rejection: ${message}`);
    process.exit(1);
});

emitLog('info', '[Worker] Embedding worker skeleton started');
