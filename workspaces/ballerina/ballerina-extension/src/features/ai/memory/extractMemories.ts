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
import {
    getMemoryDir,
    getGlobalMemoryDir,
    isAutoMemoryEnabled,
    ensureMemoryDirsExist,
    buildMemoryLines,
    scanMemoryFiles,
    formatMemoryManifest,
    buildExtractPrompt,
} from '@wso2/copilot-utilities/auto-memory';
import { computeWorkspaceHash } from '@wso2/copilot-utilities/chat-persistence';
import { getAnthropicClient, ANTHROPIC_HAIKU } from '../utils/ai-client';
import { createMemoryTools } from './memoryTools';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractionContext {
    /** User's message text for this turn. */
    userMessage: string;
    /** Assistant's response text for this turn. */
    assistantMessage: string;
    /** Workspace root path (workspacePath or projectPath). */
    workspacePath: string;
}

// ---------------------------------------------------------------------------
// Closure-scoped state — reset by initExtractMemories()
// ---------------------------------------------------------------------------

type Extractor = (ctx: ExtractionContext) => void;
type Drainer  = (timeoutMs?: number) => Promise<void>;

let extractor: Extractor = () => { /* noop until init */ };
let drainer:   Drainer   = async () => { /* noop until init */ };

/** Optional provider for VS Code settings — injected from the extension layer. */
export type MemorySettingsProvider = () => { autoMemoryEnabled: boolean };

let settingsProvider: MemorySettingsProvider = () => ({ autoMemoryEnabled: true });

/** Registers a settings provider so the extension layer can gate on VS Code config. */
export function setMemorySettingsProvider(provider: MemorySettingsProvider): void {
    settingsProvider = provider;
}

function isEnabled(): boolean {
    return isAutoMemoryEnabled() && settingsProvider().autoMemoryEnabled;
}

/**
 * Initialises the extraction system. Must be called once at extension activation.
 * Creates a fresh closure capturing in-flight tracking and coalescing state.
 */
export function initExtractMemories(): void {
    const inFlight = new Set<Promise<void>>();
    let inProgress = false;
    let pendingCtx: ExtractionContext | undefined;
    // Track which workspace hashes have had their directories initialised so
    // ensureMemoryDirsExist is only called once per workspace, not every turn.
    const initialisedHashes = new Set<string>();

    async function runExtraction(ctx: ExtractionContext, isTrailing = false): Promise<void> {
        if (!isEnabled()) { return; }

        const workspaceHash = computeWorkspaceHash(ctx.workspacePath);
        const globalDir     = getGlobalMemoryDir();
        const workspaceDir  = getMemoryDir(workspaceHash);

        if (!initialisedHashes.has(workspaceHash)) {
            ensureMemoryDirsExist(workspaceHash);
            initialisedHashes.add(workspaceHash);
        }

        const globalFiles    = scanMemoryFiles(globalDir);
        const workspaceFiles = scanMemoryFiles(workspaceDir);
        const manifest       = formatMemoryManifest(globalFiles, workspaceFiles);

        // TODO(v2): pass recent chat history (last N turns) for better cross-turn context.
        // Currently the extraction agent only sees the current turn. This means if the user
        // provided background context in an earlier turn (e.g. "I've been using WSO2 ESB for
        // 8 years") and that turn was already extracted, it won't be re-processed here.
        // The per-turn extraction is sufficient for most cases since memories are cumulative.
        const newMessageCount = 2;

        const extractionPrompt = buildExtractPrompt({
            globalMemoryDir:    globalDir,
            workspaceMemoryDir: workspaceDir,
            newMessageCount,
            existingMemoriesManifest: manifest,
        });

        const systemPrompt = buildMemoryLines(globalDir, workspaceDir).join('\n');

        const tools = createMemoryTools(globalDir, workspaceDir);

        inProgress = true;
        try {
            const model = await getAnthropicClient(ANTHROPIC_HAIKU);
            await generateText({
                model,
                system: systemPrompt,
                messages: [
                    { role: 'user',      content: ctx.userMessage },
                    { role: 'assistant', content: ctx.assistantMessage },
                    { role: 'user',      content: extractionPrompt },
                ],
                tools,
                stopWhen: [stepCountIs(5)],
            });
        } catch (e: unknown) {
            if (!isTrailing) {
                console.error('[extractMemories] extraction failed:', (e as Error).message);
            }
        } finally {
            inProgress = false;

            // Run any stashed trailing context once
            const trailing = pendingCtx;
            pendingCtx = undefined;
            if (trailing) {
                await runExtraction(trailing, true);
            }
        }
    }

    extractor = (ctx: ExtractionContext): void => {
        if (!isEnabled()) { return; }
        if (inProgress) {
            // Coalesce: stash latest context, run as trailing extraction
            pendingCtx = ctx;
            return;
        }
        const p = runExtraction(ctx).catch(() => { /* errors logged inside */ });
        inFlight.add(p);
        p.finally(() => { inFlight.delete(p); });
    };

    drainer = async (timeoutMs = 60_000): Promise<void> => {
        if (inFlight.size === 0) { return; }
        await Promise.race([
            Promise.allSettled([...inFlight]),
            new Promise<void>(resolve => setTimeout(resolve, timeoutMs).unref()),
        ]);
    };
}

/**
 * Triggers memory extraction fire-and-forget from handleStreamFinish.
 * Safe to call without awaiting — never blocks the agent response.
 */
export function executeExtractMemories(ctx: ExtractionContext): void {
    extractor(ctx);
}

/**
 * Awaits all in-flight extractions with a soft timeout.
 * Should be called during extension deactivation to flush pending writes.
 */
export async function drainPendingExtraction(timeoutMs?: number): Promise<void> {
    await drainer(timeoutMs);
}
