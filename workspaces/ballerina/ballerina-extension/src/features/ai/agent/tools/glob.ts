// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { CopilotEventHandler } from '../../utils/events';

// ============================================================================
// Constants
// ============================================================================

export const GLOB_TOOL_NAME = "glob";

/** Directories to skip during traversal. Entries starting with '.' are also skipped (dotfiles/dirs). */
const SKIP_DIRS = new Set(['target']);

// ============================================================================
// Types
// ============================================================================

interface GlobInput {
    pattern: string;
    path?: string;
}

export interface GlobResult {
    success: boolean;
    message: string;
    error?: string;
}

interface FileEntry {
    relativePath: string;
    mtimeMs: number;
}

// ============================================================================
// Glob Matching
// ============================================================================

/**
 * Converts a glob pattern to a RegExp.
 * Supports: *, **, ?, {a,b}, [abc] and character classes.
 */
function globToRegex(pattern: string): RegExp {
    return new RegExp(`^${globToRegexStr(pattern)}$`);
}

function globToRegexStr(pattern: string): string {
    let regexStr = '';
    let i = 0;

    while (i < pattern.length) {
        const ch = pattern[i];

        if (ch === '*') {
            if (pattern[i + 1] === '*') {
                i += 2;
                if (pattern[i] === '/') {
                    // **/ = optional any-depth directory prefix — must end at a separator
                    regexStr += '(?:.*/)?';
                    i++;
                } else {
                    // ** at end — match everything including separators
                    regexStr += '.*';
                }
            } else {
                // * matches anything except path separator
                regexStr += '[^/]*';
                i++;
            }
        } else if (ch === '?') {
            regexStr += '[^/]';
            i++;
        } else if (ch === '{') {
            // {a,b,c} alternation — each alternative is itself a glob pattern
            const end = pattern.indexOf('}', i);
            if (end === -1) {
                regexStr += '\\{';
                i++;
            } else {
                const alts = pattern.slice(i + 1, end).split(',').map(alt => globToRegexStr(alt.trim()));
                regexStr += `(?:${alts.join('|')})`;
                i = end + 1;
            }
        } else if (ch === '[') {
            // Character class — validate before passing through
            const end = pattern.indexOf(']', i);
            if (end === -1) {
                regexStr += '\\[';
                i++;
            } else {
                const classStr = pattern.slice(i, end + 1);
                try {
                    new RegExp(classStr);
                    regexStr += classStr;
                } catch {
                    // Invalid character class — treat as literal text
                    regexStr += escapeRegex(classStr);
                }
                i = end + 1;
            }
        } else {
            regexStr += escapeRegex(ch);
            i++;
        }
    }

    return regexStr;
}

function escapeRegex(s: string): string {
    return s.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// File Discovery
// ============================================================================

/**
 * Walks the directory tree and collects all files with their mtime.
 */
function walkDir(dir: string, baseDir: string, results: FileEntry[]): void {
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }

    for (const entry of entries) {
        // Skip symlinks — Dirent methods don't follow them, but be explicit to prevent
        // any future traversal if the readdirSync options change.
        if (entry.isSymbolicLink()) {
            continue;
        }
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) {
                continue;
            }
            walkDir(path.join(dir, entry.name), baseDir, results);
        } else if (entry.isFile() && !entry.name.startsWith('.')) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath);
            let mtimeMs = 0;
            try {
                mtimeMs = fs.statSync(fullPath).mtimeMs;
            } catch {
                // keep 0 if stat fails
            }
            results.push({ relativePath, mtimeMs });
        }
    }
}

// ============================================================================
// Tool Execute Function
// ============================================================================

export function createGlobExecute(
    eventHandler: CopilotEventHandler,
    tempProjectPath: string
) {
    // Resolve symlinks on the project root once at setup time
    const realProjectRoot = (() => {
        try { return fs.realpathSync(tempProjectPath); } catch { return tempProjectPath; }
    })();
    const normalizedRoot = realProjectRoot + path.sep;

    // Helper to fire the tool_result event and return a failure result in one step.
    function fail(message: string, error: string): GlobResult {
        const result: GlobResult = { success: false, message, error };
        eventHandler({ type: "tool_result", toolName: GLOB_TOOL_NAME, toolOutput: result });
        return result;
    }

    return async (input: GlobInput): Promise<GlobResult> => {
        const { pattern, path: searchPath } = input;

        eventHandler({
            type: "tool_call",
            toolName: GLOB_TOOL_NAME,
            toolInput: { pattern, path: searchPath }
        });

        console.log(`[GlobTool] Pattern: "${pattern}" in ${searchPath || '.'}`);

        if (!pattern || pattern.trim().length === 0) {
            return fail('Glob pattern cannot be empty.', 'Error: Empty pattern');
        }

        const resolvedPath = searchPath
            ? path.resolve(tempProjectPath, searchPath)
            : tempProjectPath;

        // Prevent path traversal outside the project root (string-based, fast).
        if (resolvedPath !== tempProjectPath && !resolvedPath.startsWith(normalizedRoot)) {
            return fail('Search path must be within the project root.', 'Error: Path traversal detected');
        }

        if (!fs.existsSync(resolvedPath)) {
            return fail(`Search path not found: ${searchPath || '.'}`, 'Error: Path not found');
        }

        if (!fs.statSync(resolvedPath).isDirectory()) {
            return fail(`Path is not a directory: ${searchPath || '.'}`, 'Error: Not a directory');
        }

        // Resolve symlinks and re-validate — catches a symlink inside the project that
        // points outside (e.g. modules/evil -> /etc passes the string check above).
        // Only needed when a custom searchPath is provided; realProjectRoot is already resolved.
        if (searchPath) {
            let realResolvedPath: string;
            try {
                realResolvedPath = fs.realpathSync(resolvedPath);
            } catch {
                return fail(`Cannot resolve search path: ${searchPath}`, 'Error: Path resolution failed');
            }
            if (realResolvedPath !== realProjectRoot && !realResolvedPath.startsWith(normalizedRoot)) {
                return fail('Search path must be within the project root.', 'Error: Symlink traversal detected');
            }
        }

        // Build regex from glob pattern
        let regex: RegExp;
        try {
            regex = globToRegex(pattern);
        } catch (e) {
            return fail(`Invalid glob pattern: ${(e as Error).message}`, 'Error: Invalid pattern');
        }

        // Collect all files
        const allFiles: FileEntry[] = [];
        walkDir(resolvedPath, resolvedPath, allFiles);

        // Filter by glob pattern (normalise path separators to '/')
        const matched = allFiles.filter(f => regex.test(f.relativePath.replace(/\\/g, '/')));

        if (matched.length === 0) {
            const result: GlobResult = {
                success: true,
                message: `No files found matching pattern: "${pattern}"`
            };
            eventHandler({ type: "tool_result", toolName: GLOB_TOOL_NAME, toolOutput: result });
            return result;
        }

        // Sort by modification time descending (most recently modified first)
        matched.sort((a, b) => b.mtimeMs - a.mtimeMs);

        const fileList = matched.map(f => f.relativePath).join('\n');
        const result: GlobResult = {
            success: true,
            message: `Found ${matched.length} file(s) matching "${pattern}":\n${fileList}`
        };

        eventHandler({ type: "tool_result", toolName: GLOB_TOOL_NAME, toolOutput: result });
        console.log(`[GlobTool] Found ${matched.length} file(s).`);

        return result;
    };
}

// ============================================================================
// Tool Definition
// ============================================================================

export function createGlobTool(execute: (input: GlobInput) => Promise<GlobResult>) {
    return tool({
        description: `
Fast file pattern matching tool that work inside the Ballerina projects.
- Supports glob patterns like \`**/*.bal\`, \`modules/**/*.bal\`, \`Ballerina.toml\`, \`**/*.{bal,toml}\`, \`resources/**/*\`
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
- Use this tool when you need to find files by name or path patterns
- It is always better to speculatively perform multiple searches as a batch that are potentially useful.
`,
        inputSchema: z.object({
            pattern: z.string().describe(
                "The glob pattern to match files against.\n" +
                "ALLOWED patterns: **/*.bal, **/*.toml, Ballerina.toml, **/*.{bal,toml}, modules/**/*.bal, tests/**/*.bal, resources/**/*,  modules/*/main.bal, **/*_test.bal, modules/**/*.{bal,toml}, **/*.[bt]al, [Mm]ain.bal\n" +
                "DO NOT use: nested braces like {bal,{toml,json}} (use simple list like {bal,toml}), escaped characters like \\*, negation patterns like !**/*.bal"
            ),
            path: z.string().optional().describe(
                "The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter \"undefined\" or \"null\" - simply omit it for the default behavior. Must be a valid directory path if provided."
            )
        }),
        execute
    });
}
