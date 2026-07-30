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

import { readFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { getMemoryDir, getGlobalMemoryDir } from './paths';
import {
    TYPES_SECTION,
    WHAT_NOT_TO_SAVE_SECTION,
    TRUSTING_RECALL_SECTION,
    WHEN_TO_ACCESS_SECTION,
} from './memoryTypes';
import { MEMORY_TYPE_DEFINITIONS } from './memoryTypeTaxonomy';

export const ENTRYPOINT_NAME = 'MEMORY.md';
export const MAX_ENTRYPOINT_LINES = 200;
export const MAX_ENTRYPOINT_BYTES = 25_000;

export interface EntrypointTruncation {
    content: string;
    lineCount: number;
    byteCount: number;
    wasLineTruncated: boolean;
    wasByteTruncated: boolean;
}

/**
 * Truncates MEMORY.md content to line and byte caps, appending a warning
 * when truncation occurs. Line-truncates first, then byte-truncates at the
 * last newline before the cap to avoid cutting mid-line.
 */
export function truncateEntrypointContent(raw: string): EntrypointTruncation {
    const trimmed = raw.trim();
    const contentLines = trimmed.split('\n');
    const lineCount = contentLines.length;
    const byteCount = Buffer.byteLength(trimmed, 'utf-8');

    const wasLineTruncated = lineCount > MAX_ENTRYPOINT_LINES;
    const wasByteTruncated = byteCount > MAX_ENTRYPOINT_BYTES;

    if (!wasLineTruncated && !wasByteTruncated) {
        return { content: trimmed, lineCount, byteCount, wasLineTruncated, wasByteTruncated };
    }

    let truncated = wasLineTruncated
        ? contentLines.slice(0, MAX_ENTRYPOINT_LINES).join('\n')
        : trimmed;

    if (Buffer.byteLength(truncated, 'utf-8') > MAX_ENTRYPOINT_BYTES) {
        // Slice at the byte limit, then strip any trailing U+FFFD replacement chars
        // that Buffer.toString emits for incomplete multibyte sequences at the boundary.
        // Then walk back to the last newline so we never cut mid-line.
        const safeStr = Buffer.from(truncated, 'utf-8')
            .subarray(0, MAX_ENTRYPOINT_BYTES)
            .toString('utf-8')
            .replace(/\uFFFD+$/, '');
        const cutAt = safeStr.lastIndexOf('\n');
        truncated = cutAt > 0 ? safeStr.slice(0, cutAt) : safeStr;
    }

    const reason =
        wasByteTruncated && !wasLineTruncated
            ? `${byteCount} bytes (limit: 25KB) — index entries are too long`
            : wasLineTruncated && !wasByteTruncated
              ? `${lineCount} lines (limit: ${MAX_ENTRYPOINT_LINES})`
              : `${lineCount} lines and ${byteCount} bytes`;

    return {
        content:
            truncated +
            `\n\n> WARNING: ${ENTRYPOINT_NAME} is ${reason}. ` +
            `Only part of it was loaded. Keep index entries to one line under ~200 chars; ` +
            `move detail into topic files.`,
        lineCount,
        byteCount,
        wasLineTruncated,
        wasByteTruncated,
    };
}

/**
 * Ensures both global and workspace memory directories exist.
 * Called before any memory read/write operation.
 */
export function ensureMemoryDirsExist(workspaceHash: string): void {
    try { mkdirSync(getGlobalMemoryDir(), { recursive: true }); } catch { /* already exists */ }
    try { mkdirSync(getMemoryDir(workspaceHash), { recursive: true }); } catch { /* already exists */ }
}

function readEntrypoint(dir: string): string {
    try {
        return readFileSync(join(dir, ENTRYPOINT_NAME), 'utf-8');
    } catch {
        return '';
    }
}

/**
 * Builds the behavioral memory instructions included in every system prompt.
 * Keeps only what shapes general reasoning: directory layout, access guidance,
 * and the actual MEMORY.md contents. Type taxonomy and save/delete instructions
 * live in the save_memory tool description where they are contextually relevant.
 */
export function buildMemoryLines(globalDir: string, workspaceDir: string): string[] {
    return [
        '# auto memory',
        '',
        'You have a persistent, file-based memory system across two directories:',
        `- **Global** (\`${globalDir}\`): user, history types — applies to all projects`,
        `- **Workspace** (\`${workspaceDir}\`): codingstyle, integration, about, reference types — this project only`,
        '',
        'Use `save_memory` to persist information worth keeping. ' +
        'Use `delete_memory` to remove stale or incorrect entries.',
        '',
        ...WHEN_TO_ACCESS_SECTION,
        '',
        ...TRUSTING_RECALL_SECTION,
        '',
    ];
}

/**
 * Builds the description string for the save_memory tool.
 * Contains the full type taxonomy, routing rules, and what-not-to-save guidance
 * so those instructions are collocated with the tool rather than the system prompt.
 */
export function buildSaveMemoryDescription(): string {
    const typeLines = MEMORY_TYPE_DEFINITIONS.map(def =>
        `- **${def.name}** (scope: "${def.scope}"): ${def.when_to_save}`
    );

    return [
        'Save important information to long-term memory for this project.',
        '',
        '**ROUTING**: user/history → scope:"global" | codingstyle/integration/about/reference → scope:"workspace"',
        '',
        '**TYPES** — choose the type that best fits, then set scope to match:',
        ...typeLines,
        '',
        ...WHAT_NOT_TO_SAVE_SECTION,
        '',
        'Only call when there is something genuinely new or changed. Do not call for routine exchanges.',
    ].join('\n');
}

/**
 * Builds the system prompt for the dream (consolidation) sub-agent.
 * Unlike buildMemoryLines(), this omits save_memory/delete_memory instructions
 * because the dream agent uses file I/O tools directly, not those tools.
 */
export function buildDreamSystemPrompt(globalDir: string, workspaceDir: string): string {
    const lines = [
        '# auto memory — consolidation agent',
        '',
        'You are consolidating a persistent, file-based memory system across **two directories**:',
        `- **Global memory** (\`${globalDir}\`): user, history types — applies to ALL projects`,
        `- **Workspace memory** (\`${workspaceDir}\`): codingstyle, integration, about, reference types — this project only`,
        '',
        '**ROUTING RULE**: user/history types → global directory. ' +
        'codingstyle/integration/about/reference types → workspace directory.',
        '',
        ...TYPES_SECTION,
        ...WHAT_NOT_TO_SAVE_SECTION,
        '',
        '## Your task',
        '',
        'Use the file I/O tools provided to read existing memory files and MEMORY.md indexes, ' +
        'then consolidate, deduplicate, and merge them. ' +
        'Write updated files back and keep each MEMORY.md index accurate.',
        '',
        ...TRUSTING_RECALL_SECTION,
        '',
    ];
    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Per-workspace prompt cache (mtime-based)
// Returns a cached string as long as neither MEMORY.md file has changed.
// Two statSync calls per turn — far cheaper than reading file contents.
// invalidateMemoryPromptCache() forces an immediate rebuild on the next call.
// ---------------------------------------------------------------------------

interface PromptCacheEntry { prompt: string; globalMtime: number; workspaceMtime: number; }
const promptCache = new Map<string, PromptCacheEntry>();

function getIndexMtime(dir: string): number {
    try { return statSync(join(dir, ENTRYPOINT_NAME)).mtimeMs; } catch { return 0; }
}

/** Invalidate the cached prompt for a workspace hash (e.g. after memory consolidation). */
export function invalidateMemoryPromptCache(workspaceHash: string): void {
    promptCache.delete(workspaceHash);
}

/**
 * Loads and builds the full memory prompt section for injection into the agent system prompt.
 * Cached per workspace hash: returns the same string until MEMORY.md mtime changes.
 * Caller is responsible for ensuring memory directories exist (use ensureMemoryDirsExist).
 */
export function loadMemoryPrompt(workspaceHash: string): string {
    const globalDir    = getGlobalMemoryDir();
    const workspaceDir = getMemoryDir(workspaceHash);

    const gMtime = getIndexMtime(globalDir);
    const wMtime = getIndexMtime(workspaceDir);

    const cached = promptCache.get(workspaceHash);
    if (cached && cached.globalMtime === gMtime && cached.workspaceMtime === wMtime) {
        return cached.prompt;
    }

    const lines = buildMemoryLines(globalDir, workspaceDir);

    // Inject global MEMORY.md
    const globalContent = readEntrypoint(globalDir);
    if (globalContent.trim()) {
        const t = truncateEntrypointContent(globalContent);
        lines.push('## Global Memory (applies to all your projects)', '', t.content, '');
    } else {
        lines.push(
            '## Global Memory (applies to all your projects)',
            '',
            '*(No global memories yet. They will appear here as you use the Copilot across projects.)*',
            ''
        );
    }

    // Inject workspace MEMORY.md
    const workspaceContent = readEntrypoint(workspaceDir);
    if (workspaceContent.trim()) {
        const t = truncateEntrypointContent(workspaceContent);
        lines.push('## Workspace Memory (this project)', '', t.content, '');
    } else {
        lines.push(
            '## Workspace Memory (this project)',
            '',
            '*(No workspace memories yet for this project.)*',
            ''
        );
    }

    const prompt = lines.join('\n');
    promptCache.set(workspaceHash, { prompt, globalMtime: gMtime, workspaceMtime: wMtime });
    return prompt;
}
