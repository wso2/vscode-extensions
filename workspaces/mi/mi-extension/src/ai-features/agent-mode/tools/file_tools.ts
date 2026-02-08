/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as vscode from 'vscode';

import {
    ValidationResult,
    ToolResult,
    VALID_FILE_EXTENSIONS,
    VALID_SPECIAL_FILE_NAMES,
    MAX_LINE_LENGTH,
    PREVIEW_LENGTH,
    ErrorMessages,
    FILE_READ_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    WriteExecuteFn,
    ReadExecuteFn,
    EditExecuteFn,
    GrepExecuteFn,
    GlobExecuteFn,
} from './types';
import { getProviderCacheControl } from '../../connection';
import { logDebug, logError } from '../../copilot/logger';
import { validateXmlFile, formatValidationMessage } from './validation-utils';
import { AgentUndoCheckpointManager } from '../undo/checkpoint-manager';

// ============================================================================
// Validation Functions
// ============================================================================

function isAllowedFilePath(filePath: string): boolean {
    const normalizedPath = filePath.trim();
    if (!normalizedPath) {
        return false;
    }

    const fileName = path.basename(normalizedPath);
    const lowerFileName = fileName.toLowerCase();
    const hasValidExtension = VALID_FILE_EXTENSIONS.some(ext =>
        lowerFileName.endsWith(ext)
    );
    if (hasValidExtension) {
        return true;
    }

    return VALID_SPECIAL_FILE_NAMES.some(
        (specialName) => specialName.toLowerCase() === lowerFileName
    );
}

function getAllowedFileTypesDescription(): string {
    return [...VALID_FILE_EXTENSIONS, ...VALID_SPECIAL_FILE_NAMES].join(', ');
}

/**
 * Validates a file path for security and extension requirements
 */
function validateFilePath(filePath: string): ValidationResult {
    if (!filePath || typeof filePath !== 'string') {
        return {
            valid: false,
            error: 'File path is required and must be a string.'
        };
    }

    // Security: prevent path traversal
    if (filePath.includes('..') || filePath.includes('~')) {
        return {
            valid: false,
            error: 'File path contains invalid characters (.., ~). Use relative paths within the project.'
        };
    }

    if (!isAllowedFilePath(filePath)) {
        return {
            valid: false,
            error: `File must use an allowed file type: ${getAllowedFileTypesDescription()}`
        };
    }

    return { valid: true };
}

/**
 * Validates line range for read operations
 */
function validateLineRange(
    offset: number,
    limit: number,
    totalLines: number
): ValidationResult {
    if (offset < 1 || offset > totalLines) {
        return {
            valid: false,
            error: `Invalid offset ${offset}. File has ${totalLines} lines (1-indexed).`
        };
    }

    if (limit < 1) {
        return {
            valid: false,
            error: `Invalid limit ${limit}. Must be at least 1.`
        };
    }

    return { valid: true };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Replace all occurrences of a string (ES2020 compatible)
 */
function replaceAll(text: string, search: string, replacement: string): string {
    return text.split(search).join(replacement);
}

/**
 * Counts non-overlapping occurrences of a search string in text
 */
function countOccurrences(text: string, searchString: string): number {
    // Handle edge case of empty strings
    if (searchString.trim().length === 0 && text.trim().length === 0) {
        return 1;
    }

    if (!searchString) {
        return 0;
    }

    let count = 0;
    let position = 0;

    while ((position = text.indexOf(searchString, position)) !== -1) {
        count++;
        position += searchString.length;
    }

    return count;
}

/**
 * Truncates lines that exceed maximum length
 */
function truncateLongLines(content: string, maxLength: number = MAX_LINE_LENGTH): string {
    const lines = content.split('\n');
    return lines.map(line => {
        if (line.length > maxLength) {
            return line.substring(0, maxLength) + '... [truncated]';
        }
        return line;
    }).join('\n');
}

/**
 * Adds a file path to the modified files list if not already present
 */
function trackModifiedFile(modifiedFiles: string[] | undefined, filePath: string): void {
    if (modifiedFiles && !modifiedFiles.includes(filePath)) {
        modifiedFiles.push(filePath);
    }
}


// ============================================================================
// Execute Functions (Business Logic)
// ============================================================================

/**
 * Creates the execute function for file_write tool
 */
export function createWriteExecute(
    projectPath: string,
    modifiedFiles?: string[],
    undoCheckpointManager?: AgentUndoCheckpointManager
): WriteExecuteFn {
    return async (args: { file_path: string; content: string }): Promise<ToolResult> => {
        const { file_path, content } = args;
        console.log(`[FileWriteTool] Writing to ${file_path}, content length: ${content.length}`);

        // Validate file path
        const pathValidation = validateFilePath(file_path);
        if (!pathValidation.valid) {
            console.error(`[FileWriteTool] Invalid file path: ${file_path}`);
            return {
                success: false,
                message: pathValidation.error!,
                error: `Error: ${ErrorMessages.INVALID_FILE_PATH}`
            };
        }

        // Validate content is not empty
        if (!content || content.trim().length === 0) {
            console.error(`[FileWriteTool] Empty content provided for file: ${file_path}`);
            return {
                success: false,
                message: 'Content cannot be empty when writing a file.',
                error: `Error: ${ErrorMessages.EMPTY_CONTENT}`
            };
        }

        const fullPath = path.join(projectPath, file_path);
        await undoCheckpointManager?.captureBeforeChange(file_path);

        // Check if file exists with non-empty content
        const fileExists = fs.existsSync(fullPath);
        if (fileExists) {
            const existingContent = fs.readFileSync(fullPath, 'utf-8');
            if (existingContent.trim().length > 0) {
                console.error(`[FileWriteTool] File already exists with content: ${file_path}`);
                return {
                    success: false,
                    message: `File '${file_path}' already exists with content. Use ${FILE_EDIT_TOOL_NAME} to modify it instead.`,
                    error: `Error: ${ErrorMessages.FILE_ALREADY_EXISTS}`
                };
            }
        }

        // Create parent directories if they don't exist
        const dirPath = path.dirname(fullPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // Use WorkspaceEdit for LSP synchronization
        const uri = vscode.Uri.file(fullPath);
        const edit = new vscode.WorkspaceEdit();

        if (fileExists) {
            // Replace entire file content
            const doc = await vscode.workspace.openTextDocument(uri);
            const fullRange = new vscode.Range(
                doc.lineAt(0).range.start,
                doc.lineAt(doc.lineCount - 1).range.end
            );
            edit.replace(uri, fullRange, content);
        } else {
            // Create new file
            edit.createFile(uri, { overwrite: false, ignoreIfExists: true });
            edit.insert(uri, new vscode.Position(0, 0), content);
        }

        // Apply edit - automatically syncs with LSP
        const success = await vscode.workspace.applyEdit(edit);

        if (!success) {
            console.error(`[FileWriteTool] Failed to apply workspace edit for: ${file_path}`);
            return {
                success: false,
                message: `Failed to ${fileExists ? 'update' : 'create'} file '${file_path}'. WorkspaceEdit failed.`,
                error: `Error: ${ErrorMessages.FILE_WRITE_FAILED}`
            };
        }

        // Save the document
        const document = await vscode.workspace.openTextDocument(uri);
        await document.save();

        // Track modified file
        trackModifiedFile(modifiedFiles, file_path);

        const lineCount = content.split('\n').length;
        const action = fileExists ? 'updated' : 'created';

        // Automatically validate the file and get structured diagnostics
        const validation = await validateXmlFile(fullPath, projectPath, false);

        console.log(`[FileWriteTool] Successfully ${action} and synced file: ${file_path} with ${lineCount} lines`);

        // Build result with structured validation data
        const result: ToolResult = {
            success: true,
            message: `Successfully ${action} file '${file_path}' with ${lineCount} line(s).${validation ? formatValidationMessage(validation) : ''}`
        };

        if (validation) {
            result.validation = validation;
        }

        return result;
    };
}

/**
 * Creates the execute function for file_read tool
 */
export function createReadExecute(projectPath: string): ReadExecuteFn {
    return async (args: { file_path: string; offset?: number; limit?: number }): Promise<ToolResult> => {
        const { file_path, offset, limit } = args;
        logDebug(`[FileReadTool] Reading ${file_path}, offset: ${offset}, limit: ${limit}`);

        // Validate file path
        const pathValidation = validateFilePath(file_path);
        if (!pathValidation.valid) {
            logError(`[FileReadTool] Invalid file path: ${file_path}`);
            return {
                success: false,
                message: pathValidation.error!,
                error: `Error: ${ErrorMessages.INVALID_FILE_PATH}`
            };
        }

        const fullPath = path.join(projectPath, file_path);

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            logError(`[FileReadTool] File not found: ${file_path}`);
            return {
                success: false,
                message: `File '${file_path}' not found.`,
                error: `Error: ${ErrorMessages.FILE_NOT_FOUND}`
            };
        }

        // Read file content
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Handle empty file
        if (content.trim().length === 0) {
            logDebug(`[FileReadTool] File is empty: ${file_path}`);
            return {
                success: true,
                message: `File '${file_path}' is empty.`,
            };
        }

        // Split content into lines
        const lines = content.split('\n');
        const totalLines = lines.length;

        // Handle ranged read
        if (offset !== undefined && limit !== undefined) {
            const validation = validateLineRange(offset, limit, totalLines);
            if (!validation.valid) {
                logError(`[FileReadTool] Invalid line range for file: ${file_path}`);
                return {
                    success: false,
                    message: validation.error!,
                    error: `Error: ${ErrorMessages.INVALID_LINE_RANGE}`
                };
            }

            const startIndex = offset - 1; // Convert to 0-based index
            const endIndex = Math.min(startIndex + limit, totalLines);
            const rangedLines = lines.slice(startIndex, endIndex);

            // Add line numbers
            const numberedContent = rangedLines
                .map((line, idx) => `${(startIndex + idx + 1).toString().padStart(4, ' ')}\t${line}`)
                .join('\n');
            const truncatedContent = truncateLongLines(numberedContent);

            logDebug(`[FileReadTool] Read lines ${offset} to ${endIndex} from file: ${file_path}`);
            return {
                success: true,
                message: `Read lines ${offset} to ${endIndex} from '${file_path}' (${endIndex - startIndex} of ${totalLines} lines).\n\nContent:\n${truncatedContent}`,
            };
        }

        // Return full content with line numbers
        const numberedContent = lines
            .map((line, idx) => `${(idx + 1).toString().padStart(4, ' ')}\t${line}`)
            .join('\n');
        const truncatedContent = truncateLongLines(numberedContent);

        logDebug(`[FileReadTool] Read entire file: ${file_path}, total lines: ${totalLines}`);
        return {
            success: true,
            message: `Read entire file '${file_path}' (${totalLines} lines).\n\nContent:\n${truncatedContent}`,
        };
    };
}

/**
 * Creates the execute function for file_edit tool
 */
export function createEditExecute(
    projectPath: string,
    modifiedFiles?: string[],
    undoCheckpointManager?: AgentUndoCheckpointManager
): EditExecuteFn {
    return async (args: {
        file_path: string;
        old_string: string;
        new_string: string;
        replace_all?: boolean;
    }): Promise<ToolResult> => {
        const { file_path, old_string, new_string, replace_all = false } = args;
        logDebug(`[FileEditTool] Editing ${file_path}, replace_all: ${replace_all}`);

        // Validate file path
        const pathValidation = validateFilePath(file_path);
        if (!pathValidation.valid) {
            logError(`[FileEditTool] Invalid file path: ${file_path}`);
            return {
                success: false,
                message: pathValidation.error!,
                error: `Error: ${ErrorMessages.INVALID_FILE_PATH}`
            };
        }

        // Check if old_string and new_string are identical
        if (old_string === new_string) {
            logError(`[FileEditTool] old_string and new_string are identical`);
            return {
                success: false,
                message: 'old_string and new_string are identical. No changes to make.',
                error: `Error: ${ErrorMessages.IDENTICAL_STRINGS}`
            };
        }

        const fullPath = path.join(projectPath, file_path);
        await undoCheckpointManager?.captureBeforeChange(file_path);

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            logError(`[FileEditTool] File not found: ${file_path}`);
            return {
                success: false,
                message: `File '${file_path}' not found. Use ${FILE_WRITE_TOOL_NAME} to create new files.`,
                error: `Error: ${ErrorMessages.FILE_NOT_FOUND}`
            };
        }

        // Read file content
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Count occurrences
        const occurrenceCount = countOccurrences(content, old_string);

        if (occurrenceCount === 0) {
            const preview = content.substring(0, PREVIEW_LENGTH);
            logError(`[FileEditTool] No occurrences of old_string found in file: ${file_path}`);
            return {
                success: false,
                message: `String to replace was not found in '${file_path}'. Please verify the exact text to replace, including whitespace and indentation.\n\nFile Preview:\n${preview}${content.length > PREVIEW_LENGTH ? '...' : ''}`,
                error: `Error: ${ErrorMessages.NO_MATCH_FOUND}`,
            };
        }

        // If not replace_all, ensure exactly one match
        if (!replace_all && occurrenceCount > 1) {
            logError(`[FileEditTool] Multiple occurrences (${occurrenceCount}) found`);
            return {
                success: false,
                message: `Found ${occurrenceCount} occurrences of the text in '${file_path}'. Either make old_string more specific to match exactly one occurrence, or set replace_all to true to replace all occurrences.`,
                error: `Error: ${ErrorMessages.MULTIPLE_MATCHES}`,
            };
        }

        // Perform replacement
        let newContent: string;
        if (content.trim() === '' && old_string.trim() === '') {
            newContent = new_string;
        } else {
            newContent = replace_all
                ? replaceAll(content, old_string, new_string)
                : content.replace(old_string, new_string);
        }

        // Use WorkspaceEdit for LSP synchronization
        const uri = vscode.Uri.file(fullPath);
        const edit = new vscode.WorkspaceEdit();

        const doc = await vscode.workspace.openTextDocument(uri);
        const fullRange = new vscode.Range(
            doc.lineAt(0).range.start,
            doc.lineAt(doc.lineCount - 1).range.end
        );
        edit.replace(uri, fullRange, newContent);

        // Apply edit - automatically syncs with LSP
        const success = await vscode.workspace.applyEdit(edit);

        if (!success) {
            logError(`[FileEditTool] Failed to apply workspace edit for: ${file_path}`);
            return {
                success: false,
                message: `Failed to edit file '${file_path}'. WorkspaceEdit failed.`,
                error: `Error: ${ErrorMessages.FILE_WRITE_FAILED}`
            };
        }

        // Save the document
        await doc.save();

        // Track modified file
        trackModifiedFile(modifiedFiles, file_path);

        const replacedCount = replace_all ? occurrenceCount : 1;

        // Automatically validate the file and get structured diagnostics
        const validation = await validateXmlFile(fullPath, projectPath, false);

        logDebug(`[FileEditTool] Successfully replaced ${replacedCount} occurrence(s) and synced file: ${file_path}`);

        // Build result with structured validation data
        const result: ToolResult = {
            success: true,
            message: `Successfully replaced ${replacedCount} occurrence(s) in '${file_path}'.${validation ? formatValidationMessage(validation) : ''}`
        };

        if (validation) {
            result.validation = validation;
        }

        return result;
    };
}

/**
 * Creates the execute function for grep tool
 */
export function createGrepExecute(projectPath: string): GrepExecuteFn {
    return async (args: {
        pattern: string;
        path?: string;
        glob?: string;
        output_mode?: 'content' | 'files_with_matches';
        '-i'?: boolean;
        head_limit?: number;
    }): Promise<ToolResult> => {
        const { pattern, path: searchPath = '.', glob, output_mode = 'content', '-i': caseInsensitive = false, head_limit = 100 } = args;

        logDebug(`[GrepTool] Searching for pattern '${pattern}' in ${searchPath}`);

        try {
            const results: Array<{file: string; line: number; content: string}> = [];
            const filesWithMatches: Set<string> = new Set();
            const regex = new RegExp(pattern, caseInsensitive ? 'gi' : 'g');

            // Resolve the search path (always relative to projectPath for security)
            const fullSearchPath = path.join(projectPath, searchPath);

            if (!fs.existsSync(fullSearchPath)) {
                return {
                    success: false,
                    message: `Path '${searchPath}' does not exist.`,
                    error: 'Error: Path not found'
                };
            }

            // Recursive function to search through directories
            const searchInDirectory = (dirPath: string) => {
                if (output_mode === 'content' && results.length >= head_limit) return;
                if (output_mode === 'files_with_matches' && filesWithMatches.size >= head_limit) return;

                const entries = fs.readdirSync(dirPath, { withFileTypes: true });

                for (const entry of entries) {
                    if (output_mode === 'content' && results.length >= head_limit) break;
                    if (output_mode === 'files_with_matches' && filesWithMatches.size >= head_limit) break;

                    const fullPath = path.join(dirPath, entry.name);

                    if (entry.isDirectory()) {
                        // Skip common directories
                        if (entry.name === 'node_modules' || entry.name === '.git' ||
                            entry.name === 'target' || entry.name === 'build') {
                            continue;
                        }
                        searchInDirectory(fullPath);
                    } else if (entry.isFile()) {
                        // Check glob pattern if specified
                        if (glob) {
                            const globRegex = new RegExp(
                                glob.replace(/\*/g, '.*').replace(/\?/g, '.')
                            );
                            if (!globRegex.test(entry.name)) {
                                continue;
                            }
                        }

                        if (!isAllowedFilePath(entry.name)) {
                            continue;
                        }

                        // Search in file
                        try {
                            const content = fs.readFileSync(fullPath, 'utf-8');
                            const lines = content.split('\n');

                            for (let i = 0; i < lines.length; i++) {
                                if (regex.test(lines[i])) {
                                    const relativePath = path.relative(projectPath, fullPath);

                                    if (output_mode === 'files_with_matches') {
                                        filesWithMatches.add(relativePath);
                                        break; // Only need one match per file
                                    } else {
                                        if (results.length >= head_limit) break;
                                        results.push({
                                            file: relativePath,
                                            line: i + 1,
                                            content: lines[i].trim()
                                        });
                                    }
                                }
                                // Reset regex lastIndex for global regex
                                regex.lastIndex = 0;
                            }
                        } catch (error) {
                            // Skip files that can't be read
                            logError(`[GrepTool] Error reading file ${fullPath}:`, error);
                        }
                    }
                }
            };

            // Start search
            const stats = fs.statSync(fullSearchPath);
            if (stats.isDirectory()) {
                searchInDirectory(fullSearchPath);
            } else if (stats.isFile()) {
                // Search in single file
                const content = fs.readFileSync(fullSearchPath, 'utf-8');
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    if (regex.test(lines[i])) {
                        const relativePath = path.relative(projectPath, fullSearchPath);

                        if (output_mode === 'files_with_matches') {
                            filesWithMatches.add(relativePath);
                            break; // Only need one match per file
                        } else {
                            if (results.length >= head_limit) break;
                            results.push({
                                file: relativePath,
                                line: i + 1,
                                content: lines[i].trim()
                            });
                        }
                    }
                    regex.lastIndex = 0;
                }
            }

            // Build response message based on output mode
            if (output_mode === 'files_with_matches') {
                if (filesWithMatches.size === 0) {
                    return {
                        success: true,
                        message: `No matches found for pattern '${pattern}' in ${searchPath}.`
                    };
                }

                let message = `Found ${filesWithMatches.size} file(s) with matches for pattern '${pattern}':\n\n`;
                for (const file of filesWithMatches) {
                    message += `${file}\n`;
                }

                if (filesWithMatches.size >= head_limit) {
                    message += `\n(Limited to ${head_limit} files. Use head_limit parameter to see more.)`;
                }

                logDebug(`[GrepTool] Found ${filesWithMatches.size} files with matches`);
                return {
                    success: true,
                    message: message.trim()
                };
            } else {
                // output_mode === 'content'
                if (results.length === 0) {
                    return {
                        success: true,
                        message: `No matches found for pattern '${pattern}' in ${searchPath}.`
                    };
                }

                let message = `Found ${results.length} match(es) for pattern '${pattern}':\n\n`;
                for (const result of results) {
                    message += `${result.file}:${result.line}: ${result.content}\n`;
                }

                if (results.length >= head_limit) {
                    message += `\n(Limited to ${head_limit} results. Use head_limit parameter to see more.)`;
                }

                console.log(`[GrepTool] Found ${results.length} matches`);
                return {
                    success: true,
                    message: message.trim()
                };
            }

        } catch (error) {
            console.error(`[GrepTool] Error during search:`, error);
            return {
                success: false,
                message: `Error searching for pattern: ${error instanceof Error ? error.message : String(error)}`,
                error: `Error: Search failed`
            };
        }
    };
}

/**
 * Creates the execute function for glob tool
 */
export function createGlobExecute(projectPath: string): GlobExecuteFn {
    return async (args: {
        pattern: string;
        path?: string;
    }): Promise<ToolResult> => {
        const { pattern, path: searchPath = '.' } = args;

        console.log(`[GlobTool] Searching for pattern '${pattern}' in ${searchPath}`);

        try {
            // Resolve the search path (always relative to projectPath for security)
            const fullSearchPath = path.join(projectPath, searchPath);

            if (!fs.existsSync(fullSearchPath)) {
                return {
                    success: false,
                    message: `Path '${searchPath}' does not exist.`,
                    error: 'Error: Path not found'
                };
            }

            // Convert glob pattern to work from search path
            const globPattern = path.join(fullSearchPath, pattern);

            // Use glob.sync() to find matching files (like Ballerina extension)
            const matches: string[] = glob.sync(globPattern, { nodir: true });

            // Get file stats and sort by modification time (most recent first)
            const filesWithStats = matches.map(file => ({
                file,
                mtime: fs.statSync(file).mtime.getTime()
            }));

            filesWithStats.sort((a, b) => b.mtime - a.mtime);

            // Convert to relative paths
            const relativePaths = filesWithStats.map(f => path.relative(projectPath, f.file));

            if (relativePaths.length === 0) {
                return {
                    success: true,
                    message: `No files found matching pattern '${pattern}' in ${searchPath}.`
                };
            }

            let message = `Found ${relativePaths.length} file(s) matching pattern '${pattern}':\n\n`;
            for (const filePath of relativePaths) {
                message += `${filePath}\n`;
            }

            console.log(`[GlobTool] Found ${relativePaths.length} files`);
            return {
                success: true,
                message: message.trim()
            };

        } catch (error) {
            console.error(`[GlobTool] Error during search:`, error);
            return {
                success: false,
                message: `Error searching for pattern: ${error instanceof Error ? error.message : String(error)}`,
                error: `Error: Search failed`
            };
        }
    };
}

// ============================================================================
// Tool Definitions (Vercel AI SDK format)
// ============================================================================


/**
 * Creates the file_write tool
 */

const writeInputSchema = z.object({
    file_path: z.string().describe(`The relative path to the file to write. Use paths relative to the project root (e.g., "src/main/wso2mi/artifacts/apis/MyAPI.xml")`),
    content: z.string().describe(`The content to write to the file. Cannot be empty.`)
});

export function createWriteTool(execute: WriteExecuteFn) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `Creates a new file. Will NOT overwrite existing files with content - use ${FILE_EDIT_TOOL_NAME} for that.
            Parent directories are created automatically. Allowed file types: ${getAllowedFileTypesDescription()}.
            XML files are automatically validated after writing (results included in response).
            Do NOT create documentation files unless explicitly requested.`,
        inputSchema: writeInputSchema,
        execute
    });
}

/**
 * Creates the file_read tool
 */

const readInputSchema = z.object({
    file_path: z.string().describe(`The relative path to the file to read. Use paths relative to the project root (e.g., "src/main/wso2mi/artifacts/apis/MyAPI.xml")`),
    offset: z.number().optional().describe(`The line number to start reading from`),
    limit: z.number().optional().describe(`The number of lines to read`)
});

export function createReadTool(execute: ReadExecuteFn) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `Reads a file from the project. Returns content with line numbers.
            Use offset/limit for large files. ALWAYS read a file before editing it.
            You can speculatively read multiple files in parallel.`,
        inputSchema: readInputSchema,
        execute
    });
}

/**
 * Creates the file_edit to
 */

const editInputSchema = z.object({
    file_path: z.string().describe(`The relative path to the file to edit. Use paths relative to the project root (e.g., "src/main/wso2mi/artifacts/apis/MyAPI.xml")`),
    old_string: z.string().describe(`The exact text to replace (must match file contents exactly, including whitespace)`),
    new_string: z.string().describe(`The replacement text (must be different from old_string)`),
    replace_all: z.boolean().optional().describe(`Replace all occurrences (default false)`)
});

export function createEditTool(execute: EditExecuteFn) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `Find-and-replace on an existing file. ALWAYS read the file first.
            old_string must match EXACTLY (whitespace, indentation, line breaks).
            Fails if old_string is not unique - provide more context or set replace_all=true.
            Cannot create new files - use ${FILE_WRITE_TOOL_NAME} for that.
            XML files are automatically validated after editing (results included in response).`,
        inputSchema: editInputSchema,
        execute
    });
}

/**
 * Creates the grep tool
 */

const grepInputSchema = z.object({
    pattern: z.string().describe(`The regular expression pattern to search for in file contents`),
    path: z.string().optional().describe(`File or directory to search in (rg PATH). Defaults to current working directory.`),
    glob: z.string().optional().describe(`Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}") - maps to rg --glob`),
    type: z.string().optional().describe(`File type to search (rg --type). Common types: js, py, rust, go, java, etc. More efficient than include for standard file types.`),
    output_mode: z.enum(['content', 'files_with_matches']).optional().describe(`Output mode: "content" shows matching lines (supports -A/-B/-C context, -n line numbers, head_limit), "files_with_matches" shows only file paths (supports head_limit). Defaults to "files_with_matches".`),
    '-i': z.boolean().optional().describe(`Case insensitive search`),
    head_limit: z.number().optional().describe(`Limit the number of results (default: 100)`)
});

export function createGrepTool(execute: GrepExecuteFn) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `Search for regex patterns in project files. Supports glob filtering.
            Output modes: "content" (matching lines, default) or "files_with_matches" (file paths only).
            Skips node_modules, .git, target, build. Limited to allowed file types: ${getAllowedFileTypesDescription()}.`,
        inputSchema: grepInputSchema,
        execute
    });
}

/**
 * Creates the glob tool
 */

const globInputSchema = z.object({
    pattern: z.string().describe(`The glob pattern to match files against`),
    path: z.string().optional().describe(`The relative path to the directory to search in. Use paths relative to the project root (e.g., "src/main/wso2mi/artifacts/apis")`),
});

export function createGlobTool(execute: GlobExecuteFn) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `Find files by glob pattern (e.g., "**/*.xml"). Returns paths sorted by modification time (most recent first).`,
        inputSchema: globInputSchema,
        execute
    });
}
