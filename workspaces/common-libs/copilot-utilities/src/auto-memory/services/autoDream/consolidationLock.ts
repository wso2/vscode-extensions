// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import {
    statSync,
    readFileSync,
    writeFileSync,
    openSync,
    writeSync,
    closeSync,
    unlinkSync,
    utimesSync,
    promises as fsp,
} from 'fs';
import { join, sep } from 'path';
import type { PersistedThread } from '../../../chat-persistence/types';

const LOCK_FILE = '.consolidate-lock';
/** Lock is considered stale after 60 minutes even if PID is still alive. */
const HOLDER_STALE_MS = 60 * 60 * 1_000;

/** Returns the lock file path for a given memory directory. */
export function getLockPath(memoryDir: string): string {
    return join(memoryDir.endsWith(sep) ? memoryDir.slice(0, -1) : memoryDir, LOCK_FILE);
}

/**
 * Returns the mtime of the lock file as the "last consolidated at" timestamp.
 * Returns 0 if the lock file does not exist.
 */
export function readLastConsolidatedAt(lockPath: string): number {
    try {
        return statSync(lockPath).mtimeMs;
    } catch {
        return 0;
    }
}

function isProcessRunning(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

interface LockHolder {
    mtime: number;
    pid: number | undefined;
}

/** Reads the current lock file's mtime and PID, or null if it does not exist / is unreadable. */
function readLockHolder(lockPath: string): LockHolder | null {
    try {
        const stat = statSync(lockPath);
        const raw = readFileSync(lockPath, 'utf-8');
        const parsed = parseInt(raw.trim(), 10);
        return { mtime: stat.mtimeMs, pid: Number.isFinite(parsed) ? parsed : undefined };
    } catch {
        return null;  // ENOENT / unreadable
    }
}

/** A lock is "live" — and must not be reclaimed — when it is not stale and its PID is still running. */
function isLiveHolder(holder: LockHolder): boolean {
    if (Date.now() - holder.mtime >= HOLDER_STALE_MS) { return false; }
    return holder.pid !== undefined && isProcessRunning(holder.pid);
}

/**
 * Attempts to acquire the consolidation lock.
 *
 * Returns the prior mtime (for rollback on failure), or null if blocked by
 * another live process. The lock mtime IS lastConsolidatedAt — stamped at
 * acquisition time and left in place on success, rolled back on failure.
 */
export function tryAcquireLock(lockPath: string): number | null {
    const prior = readLockHolder(lockPath);

    // Abort if a live holder exists and the lock is not stale
    if (prior && isLiveHolder(prior)) {
        return null;
    }

    let fd: number;
    try {
        fd = openSync(lockPath, 'wx');
    } catch (e: unknown) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') { return null; }
        // A lock appeared between our stat and this exclusive create (TOCTOU window).
        // Re-inspect the file that now exists: only reclaim it if it is stale or its
        // holder is dead. Never unlink a lock we have confirmed is live — doing so
        // would let two processes both believe they hold it.
        const current = readLockHolder(lockPath);
        if (current && isLiveHolder(current)) { return null; }
        try { unlinkSync(lockPath); } catch { return null; }
        // If another process recreated the lock in the meantime, this exclusive create
        // fails with EEXIST again and we back off (return null) rather than force-take it.
        try { fd = openSync(lockPath, 'wx'); } catch { return null; }
    }
    try {
        writeSync(fd, String(process.pid));
        closeSync(fd);
    } catch {
        try { unlinkSync(lockPath); } catch { /* best-effort */ }
        return null;
    }

    return prior?.mtime ?? 0;
}

/**
 * Releases the lock on dream success.
 *
 * Clears the PID body so a future `tryAcquireLock` does not treat this
 * extension host as a live holder, while leaving the mtime as the dream's
 * completion timestamp (= lastConsolidatedAt). Without this, subsequent
 * dreams from the same extension host would be blocked for up to
 * HOLDER_STALE_MS minutes because the PID stays alive between dreams.
 */
export function releaseLock(lockPath: string): void {
    try {
        writeFileSync(lockPath, '', 'utf-8');
    } catch (e: unknown) {
        console.error('[consolidationLock] release failed:', (e as Error).message);
    }
}

/**
 * Rolls back the lock file mtime to the pre-acquisition value.
 * Called on dream failure so the time gate can pass again.
 *
 * - priorMtime === 0 → unlink (no lock existed before)
 * - priorMtime >  0 → rewrite with empty body and restore mtime via utimes
 */
export function rollbackLock(lockPath: string, priorMtime: number): void {
    try {
        if (priorMtime === 0) {
            unlinkSync(lockPath);
            return;
        }
        writeFileSync(lockPath, '', 'utf-8');
        const t = priorMtime / 1_000;
        utimesSync(lockPath, t, t);
    } catch (e: unknown) {
        console.error('[consolidationLock] rollback failed:', (e as Error).message);
    }
}

/**
 * Counts generations with timestamp > sinceMs across all threads in the
 * given workspace directory. Uses the existing chat-persistence thread.json
 * files — no new files are created.
 *
 * Async I/O so the dream gate scan does not block the event loop, even on
 * workspaces with many threads.
 *
 * @param workspacesBaseDir  ~/.ballerina/copilot/workspaces/
 * @param workspaceHash      16-char SHA-256 hash identifying the workspace
 * @param sinceMs            Count generations with timestamp after this value
 */
export async function countGenerationsSince(
    workspacesBaseDir: string,
    workspaceHash: string,
    sinceMs: number
): Promise<number> {
    const threadsDir = join(workspacesBaseDir, workspaceHash, 'threads');

    let entries: import('fs').Dirent[];
    try {
        entries = await fsp.readdir(threadsDir, { withFileTypes: true });
    } catch {
        return 0;  // threadsDir doesn't exist yet
    }

    const counts = await Promise.all(
        entries
            .filter(e => e.isDirectory())
            .map(async (entry): Promise<number> => {
                const threadFile = join(threadsDir, entry.name, 'thread.json');
                try {
                    const raw = await fsp.readFile(threadFile, 'utf-8');
                    const thread = JSON.parse(raw) as PersistedThread;
                    if (!Array.isArray(thread.generations)) { return 0; }
                    return thread.generations.reduce(
                        (acc, gen) =>
                            typeof gen.timestamp === 'number' && gen.timestamp > sinceMs
                                ? acc + 1
                                : acc,
                        0
                    );
                } catch {
                    return 0;  // skip unreadable thread files
                }
            })
    );

    return counts.reduce((a, b) => a + b, 0);
}
