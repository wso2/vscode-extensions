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
import { spawnSync } from 'child_process';
import type { CopilotEventHandler } from '../../utils/events';
import { getRgExecutable, resolveProjectRoots, validateSearchPath, stripRootPrefix } from './utils/rg-utils';

// ============================================================================
// Constants
// ============================================================================

export const GREP_TOOL_NAME = "grep";

/** File globs to search by default in Ballerina projects */
const DEFAULT_GLOB_ARGS = [
    '--glob', '*.bal',
    '--glob', '*.toml',
    '--glob', '*.md',
    '--glob', '*.json',
    '--glob', '*.yaml',
    '--glob', '*.yml',
    '--glob', '*.sql',
];

/** Maximum number of output lines to return to avoid overwhelming the model */
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

// ============================================================================
// Tool Execute Function
// ============================================================================

export function createGrepExecute(
    eventHandler: CopilotEventHandler,
    tempProjectPath: string
) {
    const roots = resolveProjectRoots(tempProjectPath);

    function fail(message: string, error: string): GrepResult {
        const result: GrepResult = { success: false, message, error };
        eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
        return result;
    }

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

        eventHandler({
            type: "tool_call",
            toolName: GREP_TOOL_NAME,
            toolInput: { pattern, path: searchPath, glob: globPattern, output_mode }
        });

        console.log(`[GrepTool] Searching for pattern: "${pattern}" in ${searchPath || '.'}, glob: ${globPattern || 'default'}, mode: ${output_mode}`);

        if (!pattern || pattern.trim().length === 0) {
            return fail('Search pattern cannot be empty.', 'Error: Empty pattern');
        }

        const validation = validateSearchPath(tempProjectPath, searchPath);
        if (validation.ok === false) {
            return fail(validation.message, validation.error);
        }
        const { resolvedPath } = validation;

        // Build ripgrep args
        const args: string[] = ['--engine', 'default'];

        // Output mode flags
        switch (output_mode) {
            case 'files_with_matches':
                args.push('--files-with-matches');
                break;
            case 'count':
                args.push('--count');
                break;
            case 'content':
            default:
                // no special flag; ripgrep outputs content by default
                break;
        }

        if (case_insensitive) {
            args.push('--ignore-case');
        }

        if (multiline) {
            args.push('--multiline');
        }

        if (output_mode === 'content') {
            const effectiveBefore = Math.min(context > 0 ? context : before_context, MAX_CONTEXT_LINES);
            const effectiveAfter = Math.min(context > 0 ? context : after_context, MAX_CONTEXT_LINES);
            if (multiline && (effectiveBefore > 0 || effectiveAfter > 0)) {
                console.warn('[GrepTool] Context lines with multiline mode may produce unexpected output: a single match can span many lines.');
            }
            if (effectiveBefore > 0) { args.push('--before-context', String(effectiveBefore)); }
            if (effectiveAfter > 0) { args.push('--after-context', String(effectiveAfter)); }
            if (line_numbers) { args.push('--line-number'); }
        }

        // Glob filters
        if (globPattern) {
            args.push('--glob', globPattern);
        } else {
            args.push(...DEFAULT_GLOB_ARGS);
        }

        // Always exclude common non-source directories and sensitive config files
        args.push('--glob', '!.git/**', '--glob', '!target/**', '--glob', '!Config.toml');

        args.push('--', pattern, resolvedPath);

        const proc = spawnSync(getRgExecutable(), args, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

        // ripgrep exit codes: 0 = matches found, 1 = no matches, 2 = error
        if (proc.status === 2) {
            const errMsg = (proc.stderr || '').trim();
            const result: GrepResult = { success: false, message: `ripgrep error: ${errMsg}`, error: errMsg };
            eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
            return result;
        }

        if (proc.status === 1 || !proc.stdout || proc.stdout.trim().length === 0) {
            const result: GrepResult = { success: true, message: `No matches found for pattern: "${pattern}"` };
            eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
            return result;
        }

        let lines = proc.stdout.split('\n').filter(l => l.length > 0);

        // Make paths relative to project root (always strip from tempProjectPath, not resolvedPath,
        // so scoped searches like path:'order_service' still return 'order_service/file.bal')
        lines = lines.map(line => stripRootPrefix(line, roots.normalizedRawRoot, tempProjectPath));

        // head_limit > 0 caps output; head_limit = 0 means unlimited.
        const effectiveLimit = head_limit > 0 ? head_limit : 0;
        const truncated = effectiveLimit > 0 && lines.length > effectiveLimit;
        if (truncated) {
            lines = lines.slice(0, effectiveLimit);
            lines.push(`... (results truncated at ${effectiveLimit} lines; narrow your search or increase head_limit)`);
        }

        const output = lines.join('\n');
        const result: GrepResult = {
            success: true,
            message: output
        };

        eventHandler({ type: "tool_result", toolName: GREP_TOOL_NAME, toolOutput: result });
        console.log(`[GrepTool] ripgrep returned ${lines.length} lines.`);

        return result;
    };
}

// ============================================================================
// Tool Definition
// ============================================================================

export function createGrepTool(execute: (input: GrepInput) => Promise<GrepResult>) {
    return tool({
        description: `
A powerful search tool build on ripgrep.
Usage:
 - ALWAYS use Grep for search tasks. NEVER invoke \`grep\` as a Bash command.
 - Supports full ripgrep regex syntax
 - Filter files with glob parameter
 - Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts
 - Pattern syntax: Uses ripgrep (not grep)
 - Multiline matching: By default patterns match within single lines only. For cross-line patterns, use \`multiline: true\`
`,
        inputSchema: z.object({
            pattern: z.string().describe(
                "The regular expression pattern to search for in file contents"
            ),
            path: z.string().optional().describe(
                "File or directory to search in (rg PATH), Defaults to searching the entire project."
            ),
            glob: z.string().optional().describe(
                "Glob pattern to filter files - maps to rg --glob."
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
                "Limit output to first N lines/entries. Works across all output modes. Defaults to 200. Pass 0 for unlimited output (use with caution on large repos)."
            ),
            multiline: z.boolean().optional().describe(
                "Enable multiline mode where patterns can span lines. Default: false."
            )
        }),
        execute
    });
}