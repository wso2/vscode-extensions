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

import { statSync, readFileSync, writeFileSync, unlinkSync, utimesSync, readdirSync } from 'fs';
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

/**
 * Attempts to acquire the consolidation lock.
 *
 * Returns the prior mtime (for rollback on failure), or null if blocked by
 * another live process. The lock mtime IS lastConsolidatedAt — stamped at
 * acquisition time and left in place on success, rolled back on failure.
 */
export function tryAcquireLock(lockPath: string): number | null {
    let priorMtime: number | undefined;
    let holderPid: number | undefined;

    try {
        const stat = statSync(lockPath);
        priorMtime = stat.mtimeMs;
        const raw = readFileSync(lockPath, 'utf-8');
        const parsed = parseInt(raw.trim(), 10);
        holderPid = Number.isFinite(parsed) ? parsed : undefined;
    } catch {
        // ENOENT — no prior lock, proceed
    }

    // Abort if a live holder exists and the lock is not stale
    if (priorMtime !== undefined && Date.now() - priorMtime < HOLDER_STALE_MS) {
        if (holderPid !== undefined && isProcessRunning(holderPid)) {
            return null;
        }
    }

    // Write our PID
    try {
        writeFileSync(lockPath, String(process.pid), 'utf-8');
    } catch {
        return null;
    }

    // Race detection: verify we won (last write wins between two concurrent reclaimers)
    try {
        const verify = readFileSync(lockPath, 'utf-8');
        if (parseInt(verify.trim(), 10) !== process.pid) { return null; }
    } catch {
        return null;
    }

    return priorMtime ?? 0;
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
 * @param workspacesBaseDir  ~/.ballerina/copilot/workspaces/
 * @param workspaceHash      16-char SHA-256 hash identifying the workspace
 * @param sinceMs            Count generations with timestamp after this value
 *
 * Note: uses synchronous readFileSync inside a loop over thread directories.
 * This is acceptable because it runs at most once every 10 minutes (scan throttle)
 * and typical workspaces have fewer than 50 threads.
 */
export function countGenerationsSince(
    workspacesBaseDir: string,
    workspaceHash: string,
    sinceMs: number
): number {
    const threadsDir = join(workspacesBaseDir, workspaceHash, 'threads');
    let count = 0;

    try {
        const threadDirs = readdirSync(threadsDir, { withFileTypes: true });

        for (const entry of threadDirs) {
            if (!entry.isDirectory()) { continue; }
            const threadFile = join(threadsDir, entry.name, 'thread.json');
            try {
                const raw = readFileSync(threadFile, 'utf-8');
                const thread = JSON.parse(raw) as PersistedThread;
                if (Array.isArray(thread.generations)) {
                    for (const gen of thread.generations) {
                        if (typeof gen.timestamp === 'number' && gen.timestamp > sinceMs) {
                            count++;
                        }
                    }
                }
            } catch {
                // Skip unreadable thread files
            }
        }
    } catch {
        // threadsDir doesn't exist yet
    }

    return count;
}
