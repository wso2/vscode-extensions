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

import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { ChildProcess, fork } from 'child_process';
import { createEmbeddingFileWatcher } from './file-watcher';
import { getCopilotProjectStorageDir } from '../../storage-paths';
import { getWso2MiModelsDir, isModelDownloaded, downloadModel } from './model-manager';
import {
    IPC_PROTOCOL_VERSION,
    IpcRequestMethod,
    IpcResponseMessage,
    SemanticSearchResponsePayload,
    WorkerStatusPayload,
    WorkerLogEventPayload,
} from './ipc-types';

const DEFAULT_WORKER_REQUEST_TIMEOUT_MS = 30_000;
const WORKER_INIT_TIMEOUT_MS = 15 * 60_000;
const WORKER_RESTART_BASE_DELAY_MS = 1_000;
const WORKER_RESTART_MAX_DELAY_MS = 30_000;
const WORKER_RESTART_MAX_ATTEMPTS = 5;
const WORKER_SHUTDOWN_TIMEOUT_MS = 3_000;

interface PendingWorkerRequest {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    timeout: NodeJS.Timeout;
}

/** Re-export for local use — canonical definition lives in ipc-types.ts */
type WorkerStatusSnapshot = WorkerStatusPayload;

/** Configuration for the VSCode-integrated embedding service. */
export interface VSCodeEmbeddingServiceConfig {
    /** Absolute path to the MI project root */
    projectPath: string;
    /** Sub-path within each project to artifacts (e.g. 'src/main/wso2mi/artifacts') */
    artifactsSubPath: string;
    /** Polling interval in milliseconds for incremental re-indexing */
    pollIntervalMs: number;
    /** Absolute path to the database file */
    dbPath: string;
    /** Absolute path to the ONNX model root directory */
    modelPath: string;
}

/** Returns default configuration for the VSCode embedding service. */
export function resolveDefaultConfig(projectPath: string): VSCodeEmbeddingServiceConfig {
    return {
        projectPath,
        artifactsSubPath: 'src/main/wso2mi/artifacts',
        pollIntervalMs: 60_000,
        // Never written into the user's project directory.
        dbPath: path.join(getCopilotProjectStorageDir(projectPath), 'embeddings.json'),
        modelPath: getWso2MiModelsDir(),
    };
}

/** Singleton state per project path */
const activeServices = new Map<string, VSCodeEmbeddingService>();

/**
 * Get or create a singleton embedding service instance for a given project.
 */
export function getEmbeddingService(projectPath: string): VSCodeEmbeddingService {
    const normalized = path.resolve(projectPath);
    let service = activeServices.get(normalized);
    if (!service) {
        service = new VSCodeEmbeddingService(resolveDefaultConfig(normalized));
        activeServices.set(normalized, service);
    }
    return service;
}

/**
 * Dispose the embedding service for a specific project.
 * Call when a workspace folder is removed or closed.
 */
export async function disposeEmbeddingService(projectPath: string): Promise<void> {
    const normalized = path.resolve(projectPath);
    const service = activeServices.get(normalized);
    if (service) {
        await service.stop();
        activeServices.delete(normalized);
        console.log(`[EmbeddingService] Disposed for project: ${normalized}`);
    }
}

/**
 * Dispose all active embedding services. Call on extension deactivation.
 */
export async function disposeAllEmbeddingServices(): Promise<void> {
    for (const [projectPath, service] of activeServices) {
        await service.stop();
        console.log(`[EmbeddingService] Disposed for project: ${projectPath}`);
    }
    activeServices.clear();
}

/**
 * Manages a forked worker process running the indexing pipeline (chunker → embedder → OramaDB).
 * Handles worker lifecycle, IPC, VS Code status bar, and file watching.
 */
export class VSCodeEmbeddingService {
    private config: VSCodeEmbeddingServiceConfig;
    private fileWatcher: { dispose(): void } | null = null;
    private _isAvailable = false;
    private _isInitializing = false;
    private _initPromise: Promise<void> | null = null;
    private _statusBarItem: vscode.StatusBarItem | null = null;
    private _disposed = false;
    private workerProcess: ChildProcess | null = null;
    private workerReady = false;
    private workerRequestSeq = 0;
    private workerPendingRequests = new Map<string, PendingWorkerRequest>();
    private workerRestartAttempts = 0;
    private workerRestartTimer: NodeJS.Timeout | null = null;
    private workerStopRequested = false;
    private workerStatusSnapshot: WorkerStatusSnapshot | null = null;
    private _onReady = new vscode.EventEmitter<boolean>();
    private _onReadyDisposed = false;
    /** Fires when the service finishes initialization (true = success, false = failed). */
    public readonly onReady = this._onReady.event;

    constructor(config: VSCodeEmbeddingServiceConfig) {
        this.config = config;
    }

    /** Whether the service is initialized and ready to serve queries. */
    get isAvailable(): boolean {
        return this._isAvailable;
    }

    /** Whether the service is currently initializing. */
    get isInitializing(): boolean {
        return this._isInitializing;
    }

    /**
     * Wait for the service to finish initializing (if in progress).
     * Returns immediately if already available or not initializing.
     * After this resolves, check `isAvailable` to confirm the service started.
     */
    async waitForReady(): Promise<void> {
        if (this._isAvailable) {
            return;
        }
        if (this._initPromise) {
            // Await but don't propagate — _start() handles its own errors.
            try {
                await this._initPromise;
            } catch {
                // Initialization failed — caller should check isAvailable.
            }
        }
    }

    /** Returns indexed chunk count from the worker status snapshot. */
    async getIndexedChunkCount(): Promise<number> {
        return this.workerStatusSnapshot?.chunkCount ?? 0;
    }

    /**
     * Execute semantic search via the worker process.
     * Returns the search response payload, or null if the worker is unavailable.
     */
    async semanticSearch(
        query: string,
        topK: number,
        scoreThreshold: number,
    ): Promise<SemanticSearchResponsePayload | null> {
        if (!this.workerReady) {
            return null;
        }

        try {
            const response = await this.sendWorkerRequest<
                { query: string; topK: number; scoreThreshold: number },
                SemanticSearchResponsePayload
            >(
                'search.semantic',
                { query, topK, scoreThreshold },
            );
            return response;
        } catch (error) {
            console.warn('[EmbeddingService] Worker semantic search failed:', error);
            return null;
        }
    }

    /**
     * Start the background embedding service.
     * Safe to call multiple times — subsequent calls return the same init promise.
     * If a previous attempt failed, calling start() again will retry initialization.
     */
    async start(): Promise<void> {
        if (this._isAvailable) {
            return;
        }
        if (this._isInitializing && this._initPromise) {
            return this._initPromise;
        }
        this._isInitializing = true;
        this._initPromise = this._start();
        try {
            await this._initPromise;
        } catch {
            // _start() handles its own errors internally and never throws,
            // but guard against unexpected throws so _isInitializing is reset.
        } finally {
            this._isInitializing = this.workerStatusSnapshot?.initializing ?? false;
            // If initialization failed, null out _initPromise so the next
            // call to start() will retry instead of returning a stale promise.
            if (!this._isAvailable) {
                this._initPromise = null;
            }
        }
    }

    private async _start(): Promise<void> {
        if (this._disposed) {
            return;
        }
        try {
            // ── Phase 1: Download model with VS Code progress UI (one-time) ──
            if (!isModelDownloaded()) {
                console.log(`[EmbeddingService] Model not found — starting download to ${this.config.modelPath}`);
                const modelsDir = getWso2MiModelsDir();
                const downloadTooltip = process.env.MI_COPILOT_MODELS_DIR
                    ? `Downloading embedding model to ${modelsDir} (from MI_COPILOT_MODELS_DIR) — this happens once`
                    : `Downloading embedding model to ${modelsDir} (~/.wso2-mi/copilot/models by default) — this happens once`;
                this.showStatusBar('$(cloud-download) MI: Downloading model…', downloadTooltip);
                try {
                    await vscode.window.withProgress(
                        {
                            location: vscode.ProgressLocation.Notification,
                            title: 'MI Copilot: Downloading embedding model',
                            cancellable: false,
                        },
                        async (progress) => {
                            await downloadModel((fileName, percent) => {
                                progress.report({ message: `${fileName} — ${percent}%` });
                            });
                        }
                    );
                    console.log(`[EmbeddingService] Model downloaded to: ${this.config.modelPath}`);
                    if (this._disposed) {
                        return;
                    }
                } catch (downloadError) {
                    if (this._disposed) {
                        return;
                    }
                    console.error('[EmbeddingService] Model download failed:', downloadError);
                    this.showStatusBar('$(warning) MI: Model Download Failed',
                        `Failed to download embedding model: ${downloadError}`);
                    this._onReady.fire(false);
                    return;
                }
            }

            // ── Phase 2: Start the worker process ────────────────────────────
            const workerStarted = await this.tryStartWorkerMode();
            if (this._disposed) {
                return;
            }
            if (workerStarted) {
                this.ensureFileWatcher();
                return;
            }

            console.error('[EmbeddingService] Worker process startup failed');
            this._isAvailable = false;
            this._isInitializing = false;
            this.showStatusBar(
                '$(error) MI: Embedding Worker Init Failed',
                'Semantic worker failed to start.'
            );
            this._onReady.fire(false);
        } catch (error) {
            if (this._disposed) {
                return;
            }
            console.error('[EmbeddingService] Failed to start:', error);
            this._isAvailable = false;
            this.showStatusBar('$(error) MI: Index Error', `Embedding service failed: ${error}`);
            this._onReady.fire(false);
        }
    }

    private async tryStartWorkerMode(): Promise<boolean> {
        this.startWorkerSupervisor();

        if (this._disposed) {
            return false;
        }

        if (!this.workerProcess) {
            this.workerReady = false;
            return false;
        }

        try {
            this.showStatusBar('$(sync~spin) MI: Initializing worker…', 'Starting semantic worker process');

            await this.sendWorkerRequest('init', {
                projectPath: this.config.projectPath,
                artifactsSubPath: this.config.artifactsSubPath,
                dbPath: this.config.dbPath,
                modelRootPath: this.config.modelPath,
                pollIntervalMs: this.config.pollIntervalMs,
            }, WORKER_INIT_TIMEOUT_MS);

            if (this._disposed) {
                return false;
            }

            await this.sendWorkerRequest('health', { ping: true });
            const status = await this.sendWorkerRequest<{}, WorkerStatusSnapshot>('status.get', {});

            if (this._disposed) {
                return false;
            }

            this.workerReady = status.available;
            this.workerStatusSnapshot = status;
            this._isAvailable = status.available;
            this._isInitializing = status.initializing;

            if (status.available) {
                this.workerRestartAttempts = 0;
                // Worker is ready — initial indexing may still be running in the
                // background (status.initializing === true). Show the appropriate
                // status bar message based on the current indexing state.
                if (status.initializing) {
                    this.showStatusBar(
                        '$(sync~spin) MI: Indexing…',
                        'Semantic worker ready — building initial index in background'
                    );
                } else {
                    this.showStatusBar(
                        `$(check) MI: Indexed (${status.chunkCount})`,
                        `Semantic worker ready — ${status.chunkCount} chunks indexed`
                    );
                }
                this._onReady.fire(true);
                return true;
            }

            this.showStatusBar(
                '$(warning) MI: Worker Unavailable',
                status.reason || 'Semantic worker is unavailable'
            );
            this._onReady.fire(false);
            return false;
        } catch (error) {
            if (this._disposed) {
                return false;
            }
            this.workerReady = false;
            this.workerStatusSnapshot = {
                available: false,
                initializing: false,
                chunkCount: 0,
                projectPath: this.config.projectPath,
                reason: String(error),
            };
            this._isAvailable = false;
            this._isInitializing = false;
            this.showStatusBar('$(warning) MI: Worker Init Failed', `Worker init failed: ${error}`);
            this._onReady.fire(false);
            return false;
        }
    }

    private ensureFileWatcher(): void {
        if (this.fileWatcher) {
            return;
        }

        try {
            this.fileWatcher = createEmbeddingFileWatcher(
                this.config.projectPath,
                this
            );
        } catch (watcherError) {
            console.warn('[EmbeddingService] File watcher creation failed (non-fatal):', watcherError);
        }
    }

    /** Notify the service that a specific file has changed for incremental re-indexing. */
    async notifyFileChange(filePath: string): Promise<void> {
        if (!this.workerReady) {
            return;
        }
        try {
            await this.sendWorkerRequest('notify.fileChange', { filePath });
        } catch (error) {
            console.warn(`[EmbeddingService] Worker notify.fileChange failed for ${filePath}:`, error);
        }
    }

    /**
     * Stop the service and release all resources.
     */
    async stop(): Promise<void> {
        this._disposed = true;
        await this.stopWorkerSupervisor();
        if (this._statusBarItem) {
            this._statusBarItem.dispose();
            this._statusBarItem = null;
        }
        this._onReadyDisposed = true;
        this._onReady.dispose();
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;
        }
        this._isAvailable = false;
        this._initPromise = null;
    }

    // ── Status Bar Helpers ────────────────────────────────────────────

    private showStatusBar(text: string, tooltip: string): void {
        if (!this._statusBarItem) {
            this._statusBarItem = vscode.window.createStatusBarItem(
                vscode.StatusBarAlignment.Right,
                50
            );
        }
        this._statusBarItem.text = text;
        this._statusBarItem.tooltip = tooltip;
        this._statusBarItem.show();
    }

    // ── Worker Supervisor ─────────────────────────────────────────────

    private getWorkerEntryPath(): string {
        return path.join(__dirname, 'embedding-worker.js');
    }

    private startWorkerSupervisor(): void {
        if (this._disposed || this.workerStopRequested) {
            return;
        }
        if (this.workerProcess) {
            return;
        }

        if (this.workerRestartTimer) {
            clearTimeout(this.workerRestartTimer);
            this.workerRestartTimer = null;
        }

        const workerEntry = this.getWorkerEntryPath();
        if (!fs.existsSync(workerEntry)) {
            console.warn(`[EmbeddingService] Worker entry not found: ${workerEntry}`);
            return;
        }

        try {
            this.workerProcess = fork(workerEntry, [], {
                stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
            });

            this.workerProcess.stdout?.on('data', (data: Buffer) => {
                const text = data.toString().trim();
                if (text) {
                    console.log(`[EmbeddingWorker:stdout] ${text}`);
                }
            });

            this.workerProcess.stderr?.on('data', (data: Buffer) => {
                const text = data.toString().trim();
                if (text) {
                    console.warn(`[EmbeddingWorker:stderr] ${text}`);
                }
            });

            this.workerProcess.on('message', (raw: unknown) => {
                this.handleWorkerMessage(raw);
            });

            this.workerProcess.on('exit', (code, signal) => {
                this.workerReady = false;
                this.workerProcess = null;
                this._isAvailable = false;
                this._isInitializing = false;
                const exitReason = `Worker exited (code=${code}, signal=${signal})`;
                this.workerStatusSnapshot = {
                    available: false,
                    initializing: false,
                    chunkCount: 0,
                    reason: exitReason,
                };
                this.showStatusBar('$(warning) MI: Worker Unavailable', exitReason);
                if (!this._onReadyDisposed) {
                    this._onReady.fire(false);
                }
                this.rejectAllPendingWorkerRequests(
                    new Error(`[EmbeddingService] Worker exited (code=${code}, signal=${signal})`)
                );

                if (!this.workerStopRequested) {
                    this.scheduleWorkerRestart(`exit(code=${code}, signal=${signal})`);
                }
            });

            this.workerProcess.on('error', (error) => {
                console.error('[EmbeddingService] Worker process error:', error);
                this.workerReady = false;
                this.workerProcess = null;
                this._isAvailable = false;
                this._isInitializing = false;
                const errorReason = `Worker error: ${error?.message || error}`;
                this.workerStatusSnapshot = {
                    available: false,
                    initializing: false,
                    chunkCount: 0,
                    reason: errorReason,
                };
                this.showStatusBar('$(warning) MI: Worker Unavailable', errorReason);
                if (!this._onReadyDisposed) {
                    this._onReady.fire(false);
                }
                this.rejectAllPendingWorkerRequests(
                    new Error(`[EmbeddingService] Worker error: ${error?.message || error}`)
                );
                if (!this.workerStopRequested) {
                    this.scheduleWorkerRestart(`error(${error.message})`);
                }
            });
        } catch (error) {
            console.error('[EmbeddingService] Failed to start worker supervisor:', error);
            this.workerProcess = null;
            this.workerReady = false;
            if (!this.workerStopRequested) {
                this.scheduleWorkerRestart('startup-failure');
            }
        }
    }

    private async stopWorkerSupervisor(): Promise<void> {
        this.workerStopRequested = true;
        this.workerStatusSnapshot = null;

        if (this.workerRestartTimer) {
            clearTimeout(this.workerRestartTimer);
            this.workerRestartTimer = null;
        }

        if (!this.workerProcess) {
            return;
        }

        const proc = this.workerProcess;
        this.workerProcess = null;
        this.workerReady = false;
        this.rejectAllPendingWorkerRequests(
            new Error('[EmbeddingService] Worker supervisor stopped')
        );

        proc.removeAllListeners('message');
        proc.removeAllListeners('exit');
        proc.removeAllListeners('error');

        let shutdownSent = false;
        try {
            proc.send({
                v: IPC_PROTOCOL_VERSION,
                id: `ws-shutdown-${Date.now()}`,
                ts: Date.now(),
                type: 'request',
                method: 'shutdown',
                payload: {},
            });
            shutdownSent = true;
        } catch {
            // IPC channel already closed — skip to force kill
        }

        if (shutdownSent) {
            await new Promise<void>((resolve) => {
                const timer = setTimeout(resolve, WORKER_SHUTDOWN_TIMEOUT_MS);
                proc.once('exit', () => {
                    clearTimeout(timer);
                    resolve();
                });
            });
        }

        try {
            if (proc.exitCode === null && !proc.killed) {
                proc.kill();
            }
        } catch {
            // Ignore force-kill errors
        }
    }

    private scheduleWorkerRestart(reason: string): void {
        if (this.workerStopRequested) {
            return;
        }

        if (this.workerProcess || this.workerRestartTimer) {
            return;
        }

        if (this.workerRestartAttempts >= WORKER_RESTART_MAX_ATTEMPTS) {
            console.error(
                `[EmbeddingService] Worker restart attempts exceeded (${WORKER_RESTART_MAX_ATTEMPTS}); ` +
                `keeping worker disabled for this service lifecycle. Last reason: ${reason}`
            );
            return;
        }

        const attempt = this.workerRestartAttempts + 1;
        const delay = Math.min(
            WORKER_RESTART_BASE_DELAY_MS * Math.pow(2, this.workerRestartAttempts),
            WORKER_RESTART_MAX_DELAY_MS,
        );
        this.workerRestartAttempts = attempt;

        console.warn(
            `[EmbeddingService] Scheduling worker restart attempt ${attempt}/${WORKER_RESTART_MAX_ATTEMPTS} ` +
            `in ${delay}ms (reason: ${reason})`
        );

        this.workerRestartTimer = setTimeout(() => {
            this.workerRestartTimer = null;
            this.tryStartWorkerMode()
                .then((started) => {
                    if (!started) {
                        this.scheduleWorkerRestart('restart-init-failed');
                    }
                })
                .catch((error) => {
                    const message = error instanceof Error ? error.message : String(error);
                    console.warn(`[EmbeddingService] Worker restart attempt failed: ${message}`);
                    this.scheduleWorkerRestart('restart-init-failed');
                });
        }, delay);
    }

    private handleWorkerMessage(raw: unknown): void {
        if (!raw || typeof raw !== 'object') {
            return;
        }

        const message = raw as Record<string, unknown>;

        // ── Handle event messages from the worker ─────────────────────
        if (message.type === 'event') {
            if (message.method === 'status.changed') {
                const payload = message.payload;
                if (payload && typeof payload === 'object') {
                    const status = payload as Partial<WorkerStatusSnapshot>;
                    const prev = this.workerStatusSnapshot;
                    this.workerStatusSnapshot = {
                        available: typeof status.available === 'boolean' ? status.available : (prev?.available ?? false),
                        initializing: typeof status.initializing === 'boolean' ? status.initializing : (prev?.initializing ?? false),
                        chunkCount: typeof status.chunkCount === 'number' ? status.chunkCount : (prev?.chunkCount ?? 0),
                        projectPath: typeof status.projectPath === 'string' ? status.projectPath : (prev?.projectPath ?? this.config.projectPath),
                        reason: typeof status.reason === 'string' ? status.reason : prev?.reason,
                    };
                    if (typeof status.available === 'boolean') {
                        this.workerReady = status.available;
                        this._isAvailable = status.available;
                    }
                    if (typeof status.initializing === 'boolean') {
                        this._isInitializing = status.initializing;
                    }
                    // Refresh status bar to reflect the latest worker state.
                    // This fires when background indexing completes (initializing
                    // transitions from true → false) or when chunkCount updates.
                    const snap = this.workerStatusSnapshot;
                    if (snap.available && !snap.initializing) {
                        this.showStatusBar(
                            `$(check) MI: Indexed (${snap.chunkCount})`,
                            `Semantic worker ready — ${snap.chunkCount} chunks indexed`
                        );
                    } else if (snap.available && snap.initializing) {
                        this.showStatusBar(
                            '$(sync~spin) MI: Indexing…',
                            'Semantic worker — building initial index in background'
                        );
                    } else if (!snap.available) {
                        this.showStatusBar(
                            '$(warning) MI: Worker Unavailable',
                            snap.reason || 'Semantic worker is unavailable'
                        );
                    }
                }
            } else if (message.method === 'worker.log') {
                const payload = message.payload as WorkerLogEventPayload | undefined;
                if (payload && typeof payload.message === 'string') {
                    const level = payload.level ?? 'info';
                    switch (level) {
                        case 'error':
                            console.error(`[EmbeddingWorker] ${payload.message}`);
                            break;
                        case 'warn':
                            console.warn(`[EmbeddingWorker] ${payload.message}`);
                            break;
                        case 'debug':
                            console.debug(`[EmbeddingWorker] ${payload.message}`);
                            break;
                        default:
                            console.log(`[EmbeddingWorker] ${payload.message}`);
                    }
                }
            } else if (message.method === 'index.progress') {
                // Progress events are informational — update status bar
                const payload = message.payload as Record<string, unknown> | undefined;
                if (payload) {
                    const stage = payload.stage as string;
                    const detail = payload.detail as string;
                    if (stage === 'embedding' || stage === 'updating') {
                        this.showStatusBar(`$(sync~spin) MI: ${stage}…`, detail || 'Worker indexing');
                    } else if (stage === 'complete') {
                        const chunkCount = this.workerStatusSnapshot?.chunkCount ?? 0;
                        this.showStatusBar(
                            `$(check) MI: Indexed (${chunkCount})`,
                            `Semantic worker ready — ${chunkCount} chunks indexed`
                        );
                    }
                }
            }
            return;
        }

        if (message.type !== 'response') {
            return;
        }

        const id = message.id;
        if (typeof id !== 'string') {
            return;
        }

        const pending = this.workerPendingRequests.get(id);
        if (!pending) {
            return;
        }

        clearTimeout(pending.timeout);
        this.workerPendingRequests.delete(id);

        const response = message as unknown as IpcResponseMessage;
        if (response.ok) {
            pending.resolve(response.payload);
            return;
        }

        const errorMessage = response.error?.message || 'Unknown worker error';
        pending.reject(new Error(errorMessage));
    }

    private rejectAllPendingWorkerRequests(reason: Error): void {
        for (const [, pending] of this.workerPendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(reason);
        }
        this.workerPendingRequests.clear();
    }

    private sendWorkerRequest<TRequest, TResponse>(
        method: IpcRequestMethod,
        payload: TRequest,
        timeoutMs = DEFAULT_WORKER_REQUEST_TIMEOUT_MS,
    ): Promise<TResponse> {
        if (!this.workerProcess || typeof this.workerProcess.send !== 'function') {
            return Promise.reject(new Error('[EmbeddingService] Worker process is not available'));
        }

        const id = `ws-req-${++this.workerRequestSeq}`;

        return new Promise<TResponse>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.workerPendingRequests.delete(id);
                reject(new Error(`[EmbeddingService] Worker request timed out: ${method}`));
            }, timeoutMs);

            this.workerPendingRequests.set(id, {
                resolve: (value: unknown) => resolve(value as TResponse),
                reject,
                timeout,
            });

            try {
                this.workerProcess!.send({
                    v: IPC_PROTOCOL_VERSION,
                    id,
                    ts: Date.now(),
                    type: 'request',
                    method,
                    payload,
                });
            } catch (error) {
                clearTimeout(timeout);
                this.workerPendingRequests.delete(id);
                reject(error);
            }
        });
    }
}
