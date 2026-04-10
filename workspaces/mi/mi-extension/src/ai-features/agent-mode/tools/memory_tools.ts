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

// ============================================================================
// Memory Tool — Anthropic Native memory_20250818
//
// Client-side implementation for the Anthropic memory tool. Claude sends
// tool_use calls with commands (view, create, str_replace, insert, delete,
// rename) and we execute them against a project-scoped /memories directory.
//
// Storage: ~/.wso2-mi/copilot/projects/<project-key>/memories/
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { logInfo, logDebug, logError } from '../../copilot/logger';

// ============================================================================
// Types
// ============================================================================

/** Union of all memory tool input shapes (matches Anthropic spec) */
export type MemoryInput =
    | { command: 'view'; path: string; view_range?: [number, number] }
    | { command: 'create'; path: string; file_text: string }
    | { command: 'str_replace'; path: string; old_str: string; new_str: string }
    | { command: 'insert'; path: string; insert_line: number; insert_text: string }
    | { command: 'delete'; path: string }
    | { command: 'rename'; old_path: string; new_path: string };

const MUTATION_COMMANDS = new Set(['create', 'str_replace', 'insert', 'delete', 'rename']);

// ============================================================================
// Expiration Constants
// ============================================================================

const STALE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_FILES = 50;
const MAX_TOTAL_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_LINES = 999_999;

// ============================================================================
// Path Security
// ============================================================================

/**
 * Resolve a raw path from Claude (e.g., "/memories/notes.txt") to an absolute
 * filesystem path within the memories directory.
 */
function resolveMemoryPath(memoriesDir: string, rawPath: string): string {
    // Strip /memories or /memories/ prefix — Claude sends paths like /memories/foo.txt
    let relativePath = rawPath;
    if (relativePath.startsWith('/memories/')) {
        relativePath = relativePath.slice('/memories/'.length);
    } else if (relativePath === '/memories') {
        relativePath = '';
    } else if (relativePath.startsWith('/')) {
        relativePath = relativePath.slice(1);
    }

    // Decode any URL-encoded sequences
    relativePath = decodeURIComponent(relativePath);

    // Resolve to absolute path
    const resolved = relativePath === ''
        ? memoriesDir
        : path.resolve(memoriesDir, relativePath);

    return resolved;
}

/**
 * Validate that a resolved path is within the memories directory.
 * Throws if path traversal is detected.
 */
function validateMemoryPath(memoriesDir: string, resolvedPath: string): void {
    const normalizedBase = path.resolve(memoriesDir);
    const normalizedTarget = path.resolve(resolvedPath);

    if (normalizedTarget !== normalizedBase && !normalizedTarget.startsWith(normalizedBase + path.sep)) {
        throw new Error(`Path traversal detected: ${resolvedPath} is outside the memories directory.`);
    }
}

/**
 * Resolve and validate a path in one step. Returns the resolved absolute path.
 */
function safeResolvePath(memoriesDir: string, rawPath: string): string {
    const resolved = resolveMemoryPath(memoriesDir, rawPath);
    validateMemoryPath(memoriesDir, resolved);
    return resolved;
}

// ============================================================================
// Memory Expiration / Cleanup
// ============================================================================

/**
 * Clean up stale memory files. Called lazily on root directory view.
 * Non-throwing — logs errors but doesn't interrupt the view operation.
 */
async function cleanupStaleMemoryFiles(memoriesDir: string): Promise<void> {
    try {
        if (!fs.existsSync(memoriesDir)) {
            return;
        }

        const allFiles = collectFiles(memoriesDir, memoriesDir, 10);
        if (allFiles.length === 0) {
            return;
        }

        const now = Date.now();
        const fileStats: Array<{ filePath: string; size: number; atimeMs: number; mtimeMs: number }> = [];

        for (const filePath of allFiles) {
            try {
                const stat = fs.statSync(filePath);
                fileStats.push({
                    filePath,
                    size: stat.size,
                    atimeMs: stat.atimeMs,
                    mtimeMs: stat.mtimeMs,
                });
            } catch {
                // File may have been deleted concurrently
            }
        }

        const toDelete = new Set<string>();

        // 1. Delete files not accessed in 30 days
        for (const f of fileStats) {
            if (now - f.atimeMs > STALE_AGE_MS) {
                toDelete.add(f.filePath);
                logInfo(`[Memory] Expiring stale file (not accessed in 30 days): ${f.filePath}`);
            }
        }

        // 2. Enforce max file count (delete oldest by mtime first)
        const remaining = fileStats.filter(f => !toDelete.has(f.filePath));
        if (remaining.length > MAX_FILES) {
            remaining.sort((a, b) => a.mtimeMs - b.mtimeMs);
            const excess = remaining.length - MAX_FILES;
            for (let i = 0; i < excess; i++) {
                toDelete.add(remaining[i].filePath);
                logInfo(`[Memory] Expiring file (max count ${MAX_FILES} exceeded): ${remaining[i].filePath}`);
            }
        }

        // 3. Enforce max total size (delete largest first)
        const afterCountPrune = fileStats.filter(f => !toDelete.has(f.filePath));
        let totalSize = afterCountPrune.reduce((sum, f) => sum + f.size, 0);
        if (totalSize > MAX_TOTAL_SIZE_BYTES) {
            const bySize = [...afterCountPrune].sort((a, b) => b.size - a.size);
            for (const f of bySize) {
                if (totalSize <= MAX_TOTAL_SIZE_BYTES) {
                    break;
                }
                toDelete.add(f.filePath);
                totalSize -= f.size;
                logInfo(`[Memory] Expiring file (max size 5MB exceeded): ${f.filePath}`);
            }
        }

        // Execute deletions
        for (const filePath of toDelete) {
            try {
                fs.unlinkSync(filePath);
            } catch {
                // Ignore — file may already be deleted
            }
        }

        // Clean up empty directories
        if (toDelete.size > 0) {
            cleanupEmptyDirs(memoriesDir);
        }
    } catch (error) {
        logError('[Memory] Cleanup error (non-fatal):', error);
    }
}

/**
 * Recursively collect all files under a directory (up to maxDepth).
 */
function collectFiles(dir: string, baseDir: string, maxDepth: number): string[] {
    const files: string[] = [];
    if (maxDepth <= 0) {
        return files;
    }
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.')) {
                continue;
            }
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile()) {
                files.push(fullPath);
            } else if (entry.isDirectory()) {
                files.push(...collectFiles(fullPath, baseDir, maxDepth - 1));
            }
        }
    } catch {
        // Directory may not exist or be inaccessible
    }
    return files;
}

/**
 * Remove empty directories under memoriesDir (bottom-up).
 */
function cleanupEmptyDirs(memoriesDir: string): void {
    try {
        const entries = fs.readdirSync(memoriesDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const subDir = path.join(memoriesDir, entry.name);
                cleanupEmptyDirs(subDir);
                try {
                    const remaining = fs.readdirSync(subDir);
                    if (remaining.length === 0) {
                        fs.rmdirSync(subDir);
                    }
                } catch {
                    // Ignore
                }
            }
        }
    } catch {
        // Ignore
    }
}

// ============================================================================
// Command Handlers
// ============================================================================

/**
 * View a file or directory listing.
 */
async function handleView(
    memoriesDir: string,
    rawPath: string,
    viewRange?: [number, number]
): Promise<string> {
    const resolved = safeResolvePath(memoriesDir, rawPath);

    // If the memories directory doesn't exist yet, create it and return empty listing
    if (!fs.existsSync(resolved)) {
        if (resolved === memoriesDir || resolved === path.resolve(memoriesDir)) {
            fs.mkdirSync(memoriesDir, { recursive: true });
            return `Here're the files and directories up to 2 levels deep in /memories, excluding hidden items and node_modules:\n0\t/memories`;
        }
        return `The path ${rawPath} does not exist. Please provide a valid path.`;
    }

    const stat = fs.statSync(resolved);

    if (stat.isDirectory()) {
        // Run cleanup on root directory view
        const isRoot = path.resolve(resolved) === path.resolve(memoriesDir);
        if (isRoot) {
            await cleanupStaleMemoryFiles(memoriesDir);
        }

        return listDirectory(memoriesDir, resolved);
    }

    // File view
    return viewFile(rawPath, resolved, viewRange);
}

/**
 * List directory contents (2 levels deep, with sizes).
 */
function listDirectory(memoriesDir: string, dirPath: string): string {
    const displayPath = toDisplayPath(memoriesDir, dirPath);
    const lines: string[] = [];

    function walkDir(currentDir: string, depth: number): void {
        if (depth > 2) {
            return;
        }
        try {
            const dirSize = getDirectorySize(currentDir);
            lines.push(`${formatSize(dirSize)}\t${toDisplayPath(memoriesDir, currentDir)}`);

            if (depth < 2) {
                const entries = fs.readdirSync(currentDir, { withFileTypes: true })
                    .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
                    .sort((a, b) => a.name.localeCompare(b.name));

                for (const entry of entries) {
                    const fullPath = path.join(currentDir, entry.name);
                    if (entry.isDirectory()) {
                        walkDir(fullPath, depth + 1);
                    } else if (entry.isFile()) {
                        try {
                            const fileStat = fs.statSync(fullPath);
                            lines.push(`${formatSize(fileStat.size)}\t${toDisplayPath(memoriesDir, fullPath)}`);
                        } catch {
                            // Skip inaccessible files
                        }
                    }
                }
            }
        } catch {
            // Skip inaccessible directories
        }
    }

    walkDir(dirPath, 0);
    return `Here're the files and directories up to 2 levels deep in ${displayPath}, excluding hidden items and node_modules:\n${lines.join('\n')}`;
}

/**
 * View file contents with line numbers.
 */
function viewFile(
    rawPath: string,
    resolvedPath: string,
    viewRange?: [number, number]
): string {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const allLines = content.split('\n');

    if (allLines.length > MAX_LINES) {
        return `File ${rawPath} exceeds maximum line limit of ${MAX_LINES} lines.`;
    }

    let startLine = 1;
    let endLine = allLines.length;

    if (viewRange) {
        startLine = Math.max(1, viewRange[0]);
        endLine = Math.min(allLines.length, viewRange[1]);
    }

    const numberedLines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
        const lineNum = String(i).padStart(6, ' ');
        numberedLines.push(`${lineNum}\t${allLines[i - 1]}`);
    }

    return `Here's the content of ${rawPath} with line numbers:\n${numberedLines.join('\n')}`;
}

/**
 * Create a new file.
 */
async function handleCreate(
    memoriesDir: string,
    rawPath: string,
    fileText: string
): Promise<string> {
    const resolved = safeResolvePath(memoriesDir, rawPath);

    if (fs.existsSync(resolved)) {
        return `Error: File ${rawPath} already exists`;
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(resolved);
    fs.mkdirSync(parentDir, { recursive: true });

    fs.writeFileSync(resolved, fileText, 'utf-8');
    logDebug(`[Memory] Created file: ${rawPath}`);
    return `File created successfully at: ${rawPath}`;
}

/**
 * Replace text in a file (must be unique occurrence).
 */
async function handleStrReplace(
    memoriesDir: string,
    rawPath: string,
    oldStr: string,
    newStr: string
): Promise<string> {
    const resolved = safeResolvePath(memoriesDir, rawPath);

    if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
        return `Error: The path ${rawPath} does not exist. Please provide a valid path.`;
    }

    const content = fs.readFileSync(resolved, 'utf-8');

    // Find all occurrences
    const lines = content.split('\n');
    const matchLineNumbers: number[] = [];
    let searchIdx = 0;
    while (true) {
        const idx = content.indexOf(oldStr, searchIdx);
        if (idx === -1) {
            break;
        }
        // Find the line number of this occurrence
        const lineNum = content.substring(0, idx).split('\n').length;
        matchLineNumbers.push(lineNum);
        searchIdx = idx + 1;
    }

    if (matchLineNumbers.length === 0) {
        return `No replacement was performed, old_str \`${oldStr}\` did not appear verbatim in ${rawPath}.`;
    }

    if (matchLineNumbers.length > 1) {
        return `No replacement was performed. Multiple occurrences of old_str \`${oldStr}\` in lines: ${matchLineNumbers.join(', ')}. Please ensure it is unique`;
    }

    // Single occurrence — perform replacement
    const newContent = content.replace(oldStr, newStr);
    fs.writeFileSync(resolved, newContent, 'utf-8');

    // Build snippet around the replacement
    const newLines = newContent.split('\n');
    const replacementLine = matchLineNumbers[0];
    const snippetStart = Math.max(1, replacementLine - 2);
    const snippetEnd = Math.min(newLines.length, replacementLine + newStr.split('\n').length + 1);
    const snippetLines: string[] = [];
    for (let i = snippetStart; i <= snippetEnd; i++) {
        const lineNum = String(i).padStart(6, ' ');
        snippetLines.push(`${lineNum}\t${newLines[i - 1]}`);
    }

    logDebug(`[Memory] str_replace in: ${rawPath}`);
    return `The memory file has been edited.\n${snippetLines.join('\n')}`;
}

/**
 * Insert text at a specific line.
 */
async function handleInsert(
    memoriesDir: string,
    rawPath: string,
    insertLine: number,
    insertText: string
): Promise<string> {
    const resolved = safeResolvePath(memoriesDir, rawPath);

    if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
        return `Error: The path ${rawPath} does not exist`;
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    const lines = content.split('\n');

    if (insertLine < 0 || insertLine > lines.length) {
        return `Error: Invalid \`insert_line\` parameter: ${insertLine}. It should be within the range of lines of the file: [0, ${lines.length}]`;
    }

    // Insert at the specified line (0 = before first line, n = after nth line)
    const newLines = insertText.split('\n');
    lines.splice(insertLine, 0, ...newLines);
    fs.writeFileSync(resolved, lines.join('\n'), 'utf-8');

    logDebug(`[Memory] Inserted at line ${insertLine} in: ${rawPath}`);
    return `The file ${rawPath} has been edited.`;
}

/**
 * Delete a file or directory.
 */
async function handleDelete(
    memoriesDir: string,
    rawPath: string
): Promise<string> {
    const resolved = safeResolvePath(memoriesDir, rawPath);

    // Prevent deleting the memories root itself
    if (path.resolve(resolved) === path.resolve(memoriesDir)) {
        return `Error: Cannot delete the root memories directory.`;
    }

    if (!fs.existsSync(resolved)) {
        return `Error: The path ${rawPath} does not exist`;
    }

    fs.rmSync(resolved, { recursive: true, force: true });
    logDebug(`[Memory] Deleted: ${rawPath}`);
    return `Successfully deleted ${rawPath}`;
}

/**
 * Rename/move a file or directory.
 */
async function handleRename(
    memoriesDir: string,
    oldRawPath: string,
    newRawPath: string
): Promise<string> {
    const resolvedOld = safeResolvePath(memoriesDir, oldRawPath);
    const resolvedNew = safeResolvePath(memoriesDir, newRawPath);

    if (!fs.existsSync(resolvedOld)) {
        return `Error: The path ${oldRawPath} does not exist`;
    }

    if (fs.existsSync(resolvedNew)) {
        return `Error: The destination ${newRawPath} already exists`;
    }

    // Ensure parent directory of destination exists
    const parentDir = path.dirname(resolvedNew);
    fs.mkdirSync(parentDir, { recursive: true });

    fs.renameSync(resolvedOld, resolvedNew);
    logDebug(`[Memory] Renamed: ${oldRawPath} → ${newRawPath}`);
    return `Successfully renamed ${oldRawPath} to ${newRawPath}`;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert an absolute path back to a /memories/... display path.
 */
function toDisplayPath(memoriesDir: string, absolutePath: string): string {
    const base = path.resolve(memoriesDir);
    const target = path.resolve(absolutePath);
    if (target === base) {
        return '/memories';
    }
    const relative = path.relative(base, target).replace(/\\/g, '/');
    return `/memories/${relative}`;
}

/**
 * Get total size of a directory (non-recursive for performance).
 */
function getDirectorySize(dirPath: string): number {
    let total = 0;
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.')) {
                continue;
            }
            const fullPath = path.join(dirPath, entry.name);
            try {
                const stat = fs.statSync(fullPath);
                total += stat.size;
            } catch {
                // Skip inaccessible entries
            }
        }
    } catch {
        // Directory inaccessible
    }
    return total;
}

/**
 * Format bytes to human-readable size (matches du output style).
 */
function formatSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes}`;
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
        return `${kb.toFixed(1)}K`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)}M`;
}

// ============================================================================
// Execute Functions
// ============================================================================

/**
 * Creates the memory tool execute function.
 * Dispatches to the appropriate handler based on the command.
 *
 * @param memoriesDir - Absolute path to the memories directory
 * @returns Execute function for the Anthropic memory_20250818 provider tool
 */
export function createMemoryExecute(
    memoriesDir: string
): (input: MemoryInput) => Promise<string> {
    return async (input: MemoryInput): Promise<string> => {
        try {
            switch (input.command) {
                case 'view':
                    return await handleView(memoriesDir, input.path, input.view_range);
                case 'create':
                    return await handleCreate(memoriesDir, input.path, input.file_text);
                case 'str_replace':
                    return await handleStrReplace(memoriesDir, input.path, input.old_str, input.new_str);
                case 'insert':
                    return await handleInsert(memoriesDir, input.path, input.insert_line, input.insert_text);
                case 'delete':
                    return await handleDelete(memoriesDir, input.path);
                case 'rename':
                    return await handleRename(memoriesDir, input.old_path, input.new_path);
                default:
                    return `Error: Unknown memory command: ${(input as any).command}`;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logError(`[Memory] Command '${input.command}' failed:`, error);
            return `Error: ${message}`;
        }
    };
}

/**
 * Creates a read-only wrapper for Ask/Plan modes.
 * Only allows 'view' command; all mutations return an error string.
 */
export function createReadOnlyMemoryExecute(
    execute: (input: MemoryInput) => Promise<string>
): (input: MemoryInput) => Promise<string> {
    return async (input: MemoryInput): Promise<string> => {
        if (MUTATION_COMMANDS.has(input.command)) {
            return `Error: Memory tool command '${input.command}' is not allowed in Ask/Plan mode. Only 'view' is available. Switch to Edit mode to modify memory files.`;
        }
        return execute(input);
    };
}
