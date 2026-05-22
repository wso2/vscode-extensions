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

/** Directories to skip during traversal */
const SKIP_DIRS = new Set(['.git', 'target']);

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
    return async (input: GlobInput): Promise<GlobResult> => {
        const { pattern, path: searchPath } = input;

        eventHandler({
            type: "tool_call",
            toolName: GLOB_TOOL_NAME,
            toolInput: { pattern, path: searchPath }
        });

        console.log(`[GlobTool] Pattern: "${pattern}" in ${searchPath || '.'}`);

        if (!pattern || pattern.trim().length === 0) {
            const result: GlobResult = {
                success: false,
                message: 'Glob pattern cannot be empty.',
                error: 'Error: Empty pattern'
            };
            eventHandler({ type: "tool_result", toolName: GLOB_TOOL_NAME, toolOutput: result });
            return result;
        }

        const resolvedPath = searchPath
            ? path.resolve(tempProjectPath, searchPath)
            : tempProjectPath;

        // Prevent path traversal outside the project root
        const normalizedRoot = tempProjectPath.endsWith(path.sep) ? tempProjectPath : tempProjectPath + path.sep;
        if (resolvedPath !== tempProjectPath && !resolvedPath.startsWith(normalizedRoot)) {
            const result: GlobResult = {
                success: false,
                message: `Search path must be within the project root.`,
                error: 'Error: Path traversal detected'
            };
            eventHandler({ type: "tool_result", toolName: GLOB_TOOL_NAME, toolOutput: result });
            return result;
        }

        if (!fs.existsSync(resolvedPath)) {
            const result: GlobResult = {
                success: false,
                message: `Search path not found: ${searchPath || '.'}`,
                error: 'Error: Path not found'
            };
            eventHandler({ type: "tool_result", toolName: GLOB_TOOL_NAME, toolOutput: result });
            return result;
        }

        const stat = fs.statSync(resolvedPath);
        if (!stat.isDirectory()) {
            const result: GlobResult = {
                success: false,
                message: `Path is not a directory: ${searchPath || '.'}`,
                error: 'Error: Not a directory'
            };
            eventHandler({ type: "tool_result", toolName: GLOB_TOOL_NAME, toolOutput: result });
            return result;
        }

        // Build regex from glob pattern
        let regex: RegExp;
        try {
            regex = globToRegex(pattern);
        } catch (e) {
            const result: GlobResult = {
                success: false,
                message: `Invalid glob pattern: ${(e as Error).message}`,
                error: 'Error: Invalid pattern'
            };
            eventHandler({ type: "tool_result", toolName: GLOB_TOOL_NAME, toolOutput: result });
            return result;
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
Fast file pattern matching tool for Ballerina projects.
- Supports glob patterns like \`**/*.bal\`, \`modules/**/*.bal\`, \`Ballerina.toml\`, \`**/*.{bal,toml}\`, \`resources/**/*\`
- Returns matching file paths sorted by modification time (most recent first)
- Skips irrelevant directories automatically: \`.git\`, \`target\`
- Use this tool when you need to find files by name or path patterns
- You can call multiple tools in a single response — speculative batched glob calls are encouraged
`,
        inputSchema: z.object({
            pattern: z.string().describe(
                "The glob pattern to match files against (e.g. \"**/*.bal\", \"*.toml\", \"**/*.{bal,toml}\", \"resources/**/*\")"
            ),
            path: z.string().optional().describe(
                "Directory to search in, relative to the project root. Defaults to the project root. Omit this field for the default behaviour — do NOT pass \"undefined\" or \"null\"."
            )
        }),
        execute
    });
}
