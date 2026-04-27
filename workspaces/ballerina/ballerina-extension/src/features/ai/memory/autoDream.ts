// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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

import { generateText, stepCountIs } from 'ai';
import { join } from 'path';
import { homedir } from 'os';
import {
    getMemoryDir,
    getGlobalMemoryDir,
    isAutoMemoryEnabled,
    ensureMemoryDirsExist,
    buildMemoryLines,
    getLockPath,
    readLastConsolidatedAt,
    tryAcquireLock,
    rollbackLock,
    countGenerationsSince,
    buildConsolidationPrompt,
} from '@wso2/copilot-utilities/auto-memory';
import { computeWorkspaceHash } from '@wso2/copilot-utilities/chat-persistence';
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from '../utils/ai-client';
import { createMemoryTools } from './memoryTools';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_HOURS_BETWEEN_DREAMS   = 24;
const MIN_GENERATIONS_SINCE_LAST = 10;
const SCAN_THROTTLE_MS           = 10 * 60 * 1_000; // 10 minutes

/** ~/.ballerina/copilot/workspaces/ */
const WORKSPACES_BASE_DIR = join(homedir(), '.ballerina', 'copilot', 'workspaces');

// ---------------------------------------------------------------------------
// Closure-scoped state — reset by initAutoDream()
// ---------------------------------------------------------------------------

export interface DreamContext {
    /** Workspace root path (workspacePath or projectPath). */
    workspacePath: string;
}

type DreamRunner = (ctx: DreamContext) => void;

let runner: DreamRunner = () => { /* noop until init */ };

/** Optional provider for VS Code settings — injected from the extension layer. */
export type DreamSettingsProvider = () => { autoDreamEnabled: boolean };

let dreamSettingsProvider: DreamSettingsProvider = () => ({ autoDreamEnabled: true });

/** Registers a settings provider so the extension layer can gate on VS Code config. */
export function setDreamSettingsProvider(provider: DreamSettingsProvider): void {
    dreamSettingsProvider = provider;
}

function isDreamEnabled(): boolean {
    return isAutoMemoryEnabled() && dreamSettingsProvider().autoDreamEnabled;
}

/**
 * Initialises the auto-dream system. Must be called once at extension activation.
 */
export function initAutoDream(): void {
    // Per-workspace-hash state so two open workspaces don't interfere with each other.
    const dreamsInProgress = new Set<string>();
    const lastScanAtByHash = new Map<string, number>();

    runner = (ctx: DreamContext): void => {
        if (!isDreamEnabled()) { return; }
        const hash = computeWorkspaceHash(ctx.workspacePath);
        if (dreamsInProgress.has(hash)) { return; }

        dreamsInProgress.add(hash);
        const lastScanAt = lastScanAtByHash.get(hash) ?? 0;

        void (async () => {
            try {
                await runDream(ctx, lastScanAt, (t) => { lastScanAtByHash.set(hash, t); });
            } finally {
                dreamsInProgress.delete(hash);
            }
        })();
    };
}

async function runDream(
    ctx: DreamContext,
    lastScanAt: number,
    setLastScanAt: (t: number) => void
): Promise<void> {
    const workspaceHash = computeWorkspaceHash(ctx.workspacePath);
    const workspaceDir  = getMemoryDir(workspaceHash);
    const globalDir     = getGlobalMemoryDir();

    const workspaceLockPath = getLockPath(workspaceDir);

    // --- Gate 1: Time gate (cheapest — one stat call) ---
    const lastWorkspaceDreamAt = readLastConsolidatedAt(workspaceLockPath);
    const hoursSince = (Date.now() - lastWorkspaceDreamAt) / 3_600_000;
    if (hoursSince < MIN_HOURS_BETWEEN_DREAMS) { return; }

    // --- Gate 2: Scan throttle ---
    const now = Date.now();
    if (now - lastScanAt < SCAN_THROTTLE_MS) { return; }
    setLastScanAt(now);

    // --- Gate 3: Activity gate (reads thread.json files) ---
    const generationCount = countGenerationsSince(WORKSPACES_BASE_DIR, workspaceHash, lastWorkspaceDreamAt);
    if (generationCount < MIN_GENERATIONS_SINCE_LAST) { return; }

    // --- Acquire workspace lock (required) ---
    ensureMemoryDirsExist(workspaceHash);
    const workspacePriorMtime = tryAcquireLock(workspaceLockPath);
    if (workspacePriorMtime === null) { return; }

    // --- Try to acquire global lock (optional) ---
    const globalLockPath      = getLockPath(globalDir);
    const globalPriorMtime    = tryAcquireLock(globalLockPath);
    const hasGlobalLock       = globalPriorMtime !== null;

    const lastGlobalDreamAt = hasGlobalLock
        ? (globalPriorMtime ?? 0)
        : readLastConsolidatedAt(globalLockPath);

    try {
        const model   = await getAnthropicClient(ANTHROPIC_SONNET_4);
        const tools   = createMemoryTools(globalDir, workspaceDir);
        const system  = buildMemoryLines(globalDir, workspaceDir).join('\n');
        const prompt  = buildConsolidationPrompt(globalDir, workspaceDir, {
            newGenerationCount:    generationCount,
            lastWorkspaceDreamAt,
            lastGlobalDreamAt,
            hasGlobalLock,
        });

        await generateText({
            model,
            system,
            messages: [{ role: 'user', content: prompt }],
            tools,
            stopWhen: [stepCountIs(30)],
        });

        console.log('[autoDream] consolidation complete');
    } catch (e: unknown) {
        console.error('[autoDream] consolidation failed:', (e as Error).message);
        rollbackLock(workspaceLockPath, workspacePriorMtime);
        if (hasGlobalLock && globalPriorMtime !== null) {
            rollbackLock(globalLockPath, globalPriorMtime);
        }
    }
}

/**
 * Triggers auto-dream fire-and-forget from handleStreamFinish.
 * Gates are checked internally — safe to call on every turn.
 */
export function executeAutoDream(ctx: DreamContext): void {
    runner(ctx);
}
