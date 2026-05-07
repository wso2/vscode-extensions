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

import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getMemoryDir, getGlobalMemoryDir } from './paths';
import {
    TYPES_SECTION,
    WHAT_NOT_TO_SAVE_SECTION,
    MEMORY_FRONTMATTER_EXAMPLE,
    TRUSTING_RECALL_SECTION,
    WHEN_TO_ACCESS_SECTION,
} from './memoryTypes';

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
 * Explains the two-directory layout, type routing rules, and how-to-save.
 */
export function buildMemoryLines(globalDir: string, workspaceDir: string): string[] {
    const howToSave: string[] = [
        '## How to save memories',
        '',
        'Saving a memory is a two-step process:',
        '',
        `**Step 1** — write the memory to its own file ` +
        `(e.g., \`user_expertise.md\`, \`integration_shopify.md\`, \`codingstyle_error_handling.md\`) ` +
        `using this frontmatter format:`,
        '',
        ...MEMORY_FRONTMATTER_EXAMPLE,
        '',
        `**Step 2** — add a pointer to that file in the correct \`${ENTRYPOINT_NAME}\`. ` +
        `\`${ENTRYPOINT_NAME}\` is an index, not a memory — each entry should be one line ` +
        `under ~150 characters: \`- [Title](file.md) — one-line hook\`.`,
        '',
        `- Global \`${ENTRYPOINT_NAME}\` lives in: \`${globalDir}\` — for user, history types`,
        `- Workspace \`${ENTRYPOINT_NAME}\` lives in: \`${workspaceDir}\` — for codingstyle, integration, about, reference types`,
        `- Lines after ${MAX_ENTRYPOINT_LINES} will be truncated — keep the index concise`,
        '- Organize memory semantically by topic, not chronologically',
        '- Update or remove memories that turn out to be wrong or outdated',
        '- Do not write duplicate memories. Check both lists before creating a new file.',
    ];

    return [
        '# auto memory',
        '',
        'You have a persistent, file-based memory system across **two directories**:',
        `- **Global memory** (\`${globalDir}\`): user, history types — applies to ALL projects`,
        `- **Workspace memory** (\`${workspaceDir}\`): codingstyle, integration, about, reference types — this project only`,
        '',
        '**ROUTING RULE**: user/history types → global directory. ' +
        'codingstyle/integration/about/reference types → workspace directory.',
        '',
        'If the user explicitly asks you to remember something, save it immediately as whichever type fits best. ' +
        'If they ask you to forget something, find and remove the relevant entry.',
        '',
        ...TYPES_SECTION,
        ...WHAT_NOT_TO_SAVE_SECTION,
        '',
        ...howToSave,
        '',
        ...WHEN_TO_ACCESS_SECTION,
        '',
        ...TRUSTING_RECALL_SECTION,
        '',
    ];
}

// ---------------------------------------------------------------------------
// Per-workspace prompt cache (5-second TTL)
// Eliminates repeated readFileSync calls during multi-turn conversations.
// The short TTL ensures newly saved memories surface within one turn cycle.
// ---------------------------------------------------------------------------

interface PromptCacheEntry { prompt: string; expiresAt: number; }
const promptCache = new Map<string, PromptCacheEntry>();
const PROMPT_CACHE_TTL_MS = 5_000;

/** Invalidate the cached prompt for a workspace hash (e.g. after memory files change). */
export function invalidateMemoryPromptCache(workspaceHash: string): void {
    promptCache.delete(workspaceHash);
}

/**
 * Loads and builds the full memory prompt section for injection into the
 * agent system prompt at session start.
 * Results are cached for 5 seconds per workspace hash to avoid a readFileSync
 * pair on every turn. Caller is responsible for ensuring memory directories
 * exist before calling (use ensureMemoryDirsExist once at init time).
 */
export function loadMemoryPrompt(workspaceHash: string): string {
    const cached = promptCache.get(workspaceHash);
    if (cached && Date.now() < cached.expiresAt) { return cached.prompt; }

    const globalDir = getGlobalMemoryDir();
    const workspaceDir = getMemoryDir(workspaceHash);

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
    promptCache.set(workspaceHash, { prompt, expiresAt: Date.now() + PROMPT_CACHE_TTL_MS });
    return prompt;
}
