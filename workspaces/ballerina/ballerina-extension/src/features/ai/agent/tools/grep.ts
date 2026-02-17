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

export const GREP_TOOL_NAME = "Grep";

/** File extensions to search by default in Ballerina projects */
const DEFAULT_SEARCH_EXTENSIONS = ['.bal', '.toml', '.md', '.json', '.yaml', '.yml', '.sql'];

/** Maximum number of output entries to return to avoid overwhelming the model */
const DEFAULT_HEAD_LIMIT = 200;

/** Maximum number of context lines allowed */
const MAX_CONTEXT_LINES = 10;

// ============================================================================
// Types
// ============================================================================

type OutputMode = 'content' | 'files_with_matches' | 'count';

interface GrepInput {
    pattern: string;
    path?: string;
    glob?: string;
    output_mode?: OutputMode;
    before_context?: number;
    after_context?: number;
    context?: number;
    line_numbers?: boolean;
    case_insensitive?: boolean;
    head_limit?: number;
    multiline?: boolean;
}

export interface GrepResult {
    success: boolean;
    message: string;
    error?: string;
}

interface FileMatch {
    filePath: string;
    matches: LineMatch[];
}

interface LineMatch {
    lineNumber: number;
    lineContent: string;
}

// ============================================================================
// File Discovery
// ============================================================================

/**
 * Recursively collects all files under a directory, respecting glob filters.
 */
function collectFiles(dir: string, globPattern?: string): string[] {
    const results: string[] = [];

    if (!fs.existsSync(dir)) {
        return results;
    }

    const stat = fs.statSync(dir);
    if (stat.isFile()) {
        if (matchesGlob(dir, globPattern)) {
            results.push(dir);
        }
        return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip hidden directories and common non-source directories
        if (entry.isDirectory()) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'target') {
                continue;
            }
            results.push(...collectFiles(fullPath, globPattern));
        } else if (entry.isFile()) {
            if (matchesGlob(entry.name, globPattern)) {
                results.push(fullPath);
            }
        }
    }

    return results;
}

/**
 * Glob matching supporting *.ext and *.{ext1,ext2} patterns.
 */
function matchesGlob(filePath: string, globPattern?: string): boolean {
    if (!globPattern) {
        const ext = path.extname(filePath).toLowerCase();
        return DEFAULT_SEARCH_EXTENSIONS.includes(ext);
    }

    const fileName = path.basename(filePath);

    // Handle *.{ext1,ext2} pattern
    const braceMatch = globPattern.match(/^\*\.\{(.+)\}$/);
    if (braceMatch) {
        const extensions = braceMatch[1].split(',').map(e => e.trim());
        const ext = path.extname(fileName).replace('.', '');
        return extensions.includes(ext);
    }

    // Handle *.ext pattern
    if (globPattern.startsWith('*.')) {
        const ext = globPattern.slice(1); // e.g., ".bal"
        return fileName.endsWith(ext);
    }

    // Handle **/*.ext pattern
    if (globPattern.startsWith('**/')) {
        return matchesGlob(filePath, globPattern.slice(3));
    }

    // Exact filename match
    return fileName === globPattern;
}

// ============================================================================
// Search Logic
// ============================================================================

/**
 * Searches files for a regex pattern and returns structured matches.
 */
function searchFiles(
    files: string[],
    pattern: string,
    basePath: string,
    caseInsensitive: boolean,
    multiline: boolean
): FileMatch[] {
    const flags = (caseInsensitive ? 'i' : '') + (multiline ? 'gms' : 'gm');
    let regex: RegExp;
    try {
        regex = new RegExp(pattern, flags);
    } catch {
        return [];
    }

    const results: FileMatch[] = [];

    for (const filePath of files) {
        let content: string;
        try {
            content = fs.readFileSync(filePath, 'utf-8');
        } catch {
            continue;
        }

        const lines = content.split('\n');
        const matchedLines: LineMatch[] = [];

        if (multiline) {
            // For multiline patterns, find which lines are part of matches
            const matchedLineNumbers = new Set<number>();
            let match: RegExpExecArray | null;
            regex.lastIndex = 0;
            while ((match = regex.exec(content)) !== null) {
                const matchStart = match.index;
                const matchEnd = matchStart + match[0].length;

                // Find line numbers that this match spans
                let charCount = 0;
                for (let i = 0; i < lines.length; i++) {
                    const lineStart = charCount;
                    const lineEnd = charCount + lines[i].length;
                    if (lineEnd >= matchStart && lineStart <= matchEnd) {
                        matchedLineNumbers.add(i);
                    }
                    charCount = lineEnd + 1; // +1 for \n
                    if (charCount > matchEnd) {
                        break;
                    }
                }

                // Prevent infinite loops on zero-length matches
                if (match[0].length === 0) {
                    regex.lastIndex++;
                }
            }

            for (const lineNum of matchedLineNumbers) {
                matchedLines.push({
                    lineNumber: lineNum + 1,
                    lineContent: lines[lineNum]
                });
            }
        } else {
            // Standard per-line matching
            for (let i = 0; i < lines.length; i++) {
                regex.lastIndex = 0;
                if (regex.test(lines[i])) {
                    matchedLines.push({
                        lineNumber: i + 1,
                        lineContent: lines[i]
                    });
                }
            }
        }

        if (matchedLines.length > 0) {
            const relativePath = path.relative(basePath, filePath);
            results.push({
                filePath: relativePath,
                matches: matchedLines
            });
        }
    }

    return results;
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatContentOutput(
    fileMatches: FileMatch[],
    basePath: string,
    beforeContext: number,
    afterContext: number,
    showLineNumbers: boolean,
    headLimit: number
): string {
    const outputLines: string[] = [];
    let totalEntries = 0;

    for (const fileMatch of fileMatches) {
        if (headLimit > 0 && totalEntries >= headLimit) {
            break;
        }

        const fullPath = path.join(basePath, fileMatch.filePath);
        let lines: string[];
        try {
            lines = fs.readFileSync(fullPath, 'utf-8').split('\n');
        } catch {
            continue;
        }

        outputLines.push(`\n${fileMatch.filePath}:`);

        // Collect all line numbers to display (matches + context)
        const linesToShow = new Set<number>();
        for (const match of fileMatch.matches) {
            const start = Math.max(1, match.lineNumber - beforeContext);
            const end = Math.min(lines.length, match.lineNumber + afterContext);
            for (let i = start; i <= end; i++) {
                linesToShow.add(i);
            }
        }

        const matchLineNumbers = new Set(fileMatch.matches.map(m => m.lineNumber));
        const sortedLines = Array.from(linesToShow).sort((a, b) => a - b);

        let prevLine = 0;
        for (const lineNum of sortedLines) {
            if (headLimit > 0 && totalEntries >= headLimit) {
                break;
            }

            // Add separator for non-contiguous blocks
            if (prevLine > 0 && lineNum > prevLine + 1) {
                outputLines.push('--');
            }

            const lineContent = lines[lineNum - 1] || '';
            const isMatch = matchLineNumbers.has(lineNum);

            if (showLineNumbers) {
                const separator = isMatch ? ':' : '-';
                outputLines.push(`${lineNum}${separator}${lineContent}`);
            } else {
                outputLines.push(lineContent);
            }

            totalEntries++;
            prevLine = lineNum;
        }
    }

    return outputLines.join('\n');
}

function formatFilesOutput(fileMatches: FileMatch[], headLimit: number): string {
    const files = fileMatches.map(fm => fm.filePath);
    const limited = headLimit > 0 ? files.slice(0, headLimit) : files;
    return limited.join('\n');
}

function formatCountOutput(fileMatches: FileMatch[], headLimit: number): string {
    const entries = fileMatches.map(fm => `${fm.filePath}:${fm.matches.length}`);
    const limited = headLimit > 0 ? entries.slice(0, headLimit) : entries;
    return limited.join('\n');
}

// ============================================================================
// Tool Execute Function
// ============================================================================

export function createGrepExecute(
    eventHandler: CopilotEventHandler,
    tempProjectPath: string
) {
    return async (input: GrepInput): Promise<GrepResult> => {
        const {
            pattern,
            path: searchPath,
            glob: globPattern,
            output_mode = 'files_with_matches',
            before_context = 0,
            after_context = 0,
            context = 0,
            line_numbers = true,
            case_insensitive = false,
            head_limit = DEFAULT_HEAD_LIMIT,
            multiline = false
        } = input;

        // Emit tool_call event
        eventHandler({
            type: "tool_call",
            toolName: GREP_TOOL_NAME,
            toolInput: { pattern, path: searchPath, glob: globPattern, output_mode }
        });

        console.log(`[GrepTool] Searching for pattern: "${pattern}" in ${searchPath || '.'}, glob: ${globPattern || 'default'}, mode: ${output_mode}`);

        // Validate pattern
        if (!pattern || pattern.trim().length === 0) {
            const result: GrepResult = {
                success: false,
                message: 'Search pattern cannot be empty.',
                error: 'Error: Empty pattern'
            };
            eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
            return result;
        }

        // Validate regex
        try {
            new RegExp(pattern);
        } catch (e) {
            const result: GrepResult = {
                success: false,
                message: `Invalid regex pattern: ${(e as Error).message}`,
                error: 'Error: Invalid regex'
            };
            eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
            return result;
        }

        // Resolve search directory
        const resolvedPath = searchPath
            ? path.resolve(tempProjectPath, searchPath)
            : tempProjectPath;

        if (!fs.existsSync(resolvedPath)) {
            const result: GrepResult = {
                success: false,
                message: `Search path not found: ${searchPath || '.'}`,
                error: 'Error: Path not found'
            };
            eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
            return result;
        }

        // Collect files
        const files = collectFiles(resolvedPath, globPattern);
        if (files.length === 0) {
            const result: GrepResult = {
                success: true,
                message: 'No files found matching the search criteria.'
            };
            eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
            return result;
        }

        // Search
        const fileMatches = searchFiles(files, pattern, tempProjectPath, case_insensitive, multiline);

        if (fileMatches.length === 0) {
            const result: GrepResult = {
                success: true,
                message: `No matches found for pattern: "${pattern}"`
            };
            eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
            return result;
        }

        // Compute effective context values
        const effectiveBefore = Math.min(context > 0 ? context : before_context, MAX_CONTEXT_LINES);
        const effectiveAfter = Math.min(context > 0 ? context : after_context, MAX_CONTEXT_LINES);

        // Format output based on mode
        let output: string;
        const effectiveLimit = head_limit > 0 ? head_limit : 0;

        switch (output_mode) {
            case 'content':
                output = formatContentOutput(
                    fileMatches,
                    tempProjectPath,
                    effectiveBefore,
                    effectiveAfter,
                    line_numbers,
                    effectiveLimit
                );
                break;
            case 'count':
                output = formatCountOutput(fileMatches, effectiveLimit);
                break;
            case 'files_with_matches':
            default:
                output = formatFilesOutput(fileMatches, effectiveLimit);
                break;
        }

        const totalMatches = fileMatches.reduce((sum, fm) => sum + fm.matches.length, 0);
        const result: GrepResult = {
            success: true,
            message: `Found ${totalMatches} match(es) across ${fileMatches.length} file(s).\n${output}`
        };

        eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
        console.log(`[GrepTool] Found ${totalMatches} matches across ${fileMatches.length} files.`);

        return result;
    };
}

// ============================================================================
// Tool Definition
// ============================================================================

export function createGrepTool(execute: (input: GrepInput) => Promise<GrepResult>) {
    return tool({
        description: `
A powerful search tool built on ripgrep, optimized for Ballerina source code

Usage:
 - ALWAYS use Grep for search tasks. NEVER invoke \`grep\` as a Bash command. The Grep tool has been optimized for correct permissions and access.
 - Supports full regex syntax (e.g., \`error.*message\`, \`function\\s+\\w+\`)
 - Filter files with glob parameter (e.g., \`*.bal\`, \`**/*.bal\`) or type parameter (e.g., \`bal\`)
 - Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts
 - Pattern syntax: Uses ripgrep (not grep) — literal braces need escaping (use \`record\\{\\}\` to find \`record{}\`, \`map\\<string\\>\` to find \`map<string>\`)
 - Multiline matching: By default patterns match within single lines only. For cross-line patterns like \`service\\s+\\w+\\s+on[\\s\\S]*?{\`, use \`multiline: true\`
`,
        inputSchema: z.object({
            pattern: z.string().describe(
                "The regular expression pattern to search for in file contents"
            ),
            path: z.string().optional().describe(
                "File or directory to search in, relative to the project root. Defaults to searching the entire project."
            ),
            glob: z.string().optional().describe(
                "Glob pattern to filter files (e.g., \"*.bal\", \"*.{bal,toml}\"). Defaults to common Ballerina project file types."
            ),
            output_mode: z.enum(['content', 'files_with_matches', 'count']).optional().describe(
                "Output mode: \"content\" shows matching lines with optional context, \"files_with_matches\" shows only file paths (default), \"count\" shows match counts per file."
            ),
            before_context: z.number().optional().describe(
                "Number of lines to show before each match. Only applies when output_mode is \"content\"."
            ),
            after_context: z.number().optional().describe(
                "Number of lines to show after each match. Only applies when output_mode is \"content\"."
            ),
            context: z.number().optional().describe(
                "Number of lines to show before and after each match. Overrides before_context and after_context. Only applies when output_mode is \"content\"."
            ),
            line_numbers: z.boolean().optional().describe(
                "Show line numbers in output. Defaults to true. Only applies when output_mode is \"content\"."
            ),
            case_insensitive: z.boolean().optional().describe(
                "Case insensitive search. Defaults to false."
            ),
            head_limit: z.number().optional().describe(
                "Limit output to first N lines/entries. Works across all output modes."
            ),
            multiline: z.boolean().optional().describe(
                "Enable multiline mode where . matches newlines and patterns can span lines. Default: false."
            )
        }),
        execute
    });
}
