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

import { tool } from 'ai';
import { z } from 'zod';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import {
    ValidationResult,
    ToolResult,
    VALID_FILE_EXTENSIONS,
    VALID_SPECIAL_FILE_NAMES,
    MAX_LINE_LENGTH,
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
import { logDebug, logError } from '../../copilot/logger';
import { validateXmlFile, formatValidationMessage } from './validation-utils';
import { AgentUndoCheckpointManager } from '../undo/checkpoint-manager';
import { getCopilotProjectsRootDir } from '../storage-paths';
import {
    runRipgrepGuarded,
    parseRgJsonMatches,
    parseRgFiles,
    parseRgCountOutput,
    validateRgTypeName,
    RG_EXCLUDED_DIRS,
    RG_EXCLUDED_SENSITIVE_GLOBS,
} from './ripgrep_runner';
import { isSensitiveTokenName } from './shell_sandbox';
import { stripAnsiAndControl } from '../../utils/sanitize-text';

// ============================================================================
// Validation Functions
// ============================================================================

const READ_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'] as const;
const READ_PDF_EXTENSION = '.pdf';
const PDF_MAX_PAGES_PER_REQUEST = 5;
// Pattern/glob length bounds are enforced by the grep tool's Zod schema; the
// constants are kept here so the schema's `describe` text remains in sync.
const MAX_GREP_PATTERN_LENGTH = 512;
const MAX_GREP_GLOB_LENGTH = 256;
const MAX_GREP_MATCH_LINE_LENGTH = 500;
const POST_WRITE_VALIDATION_DELAY_MS = 500;

const IMAGE_MEDIA_TYPE_BY_EXTENSION: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
};

type ReadFileKind = 'text' | 'pdf' | 'image' | 'unsupported';

interface PdfPageSelection {
    start: number;
    end: number;
    count: number;
}

interface PdfPageSelectionResult {
    valid: boolean;
    error?: string;
    selection?: PdfPageSelection;
}

interface PdfDocumentInstanceLike {
    getPageCount(): number;
    copyPages(sourceDoc: PdfDocumentInstanceLike, indices: number[]): Promise<any[]>;
    addPage(page: any): void;
    save(): Promise<Uint8Array>;
}

interface PdfDocumentStaticLike {
    load(data: Uint8Array | Buffer): Promise<PdfDocumentInstanceLike>;
    create(): Promise<PdfDocumentInstanceLike>;
}

function getPdfDocumentStatic(): PdfDocumentStaticLike {
    try {
        // Use lazy require so TypeScript compilation does not hard-fail when dependency is not installed yet.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfLib = require('pdf-lib');
        if (!pdfLib?.PDFDocument) {
            throw new Error('Invalid pdf-lib export');
        }
        return pdfLib.PDFDocument as PdfDocumentStaticLike;
    } catch {
        throw new Error(
            'PDF support requires the optional dependency "pdf-lib". Run `pnpm install --filter micro-integrator` and retry.'
        );
    }
}

function isTextAllowedFilePath(filePath: string): boolean {
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

function getReadAllowedFileTypesDescription(): string {
    return [...VALID_FILE_EXTENSIONS, ...VALID_SPECIAL_FILE_NAMES, READ_PDF_EXTENSION, ...READ_IMAGE_EXTENSIONS].join(', ');
}

function getReadFileKind(filePath: string): ReadFileKind {
    if (isTextAllowedFilePath(filePath)) {
        return 'text';
    }

    const lowerExt = path.extname(filePath).toLowerCase();
    if (lowerExt === READ_PDF_EXTENSION) {
        return 'pdf';
    }

    if ((READ_IMAGE_EXTENSIONS as readonly string[]).includes(lowerExt)) {
        return 'image';
    }

    return 'unsupported';
}

function getImageMediaType(filePath: string): string | undefined {
    return IMAGE_MEDIA_TYPE_BY_EXTENSION[path.extname(filePath).toLowerCase()];
}

function normalizePathForComparison(targetPath: string): string {
    const normalized = path.resolve(targetPath).replace(/\\/g, '/').replace(/\/+$/, '');
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isPathWithin(basePath: string, targetPath: string): boolean {
    const normalizedBase = normalizePathForComparison(basePath);
    const normalizedTarget = normalizePathForComparison(targetPath);
    return normalizedTarget === normalizedBase || normalizedTarget.startsWith(`${normalizedBase}/`);
}

function resolveFullPath(projectPath: string, filePath: string): string {
    const expanded = /^~(?:[\\/]|$)/.test(filePath)
        ? path.join(os.homedir(), filePath.slice(1))
        : filePath;
    return path.isAbsolute(expanded) ? path.resolve(expanded) : path.resolve(projectPath, expanded);
}

function isCopilotGlobalPath(fullPath: string): boolean {
    return isPathWithin(getCopilotProjectsRootDir(), fullPath);
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validates path security rules that apply to all file tools.
 *
 * By default, paths must resolve inside the project or the copilot global dir.
 * Pass `allowOutsideProject: true` for read-only callers (read/grep/glob) where
 * reading arbitrary filesystem locations is acceptable; writes/edits must stay strict.
 */
function validateFilePathSecurity(
    projectPath: string,
    filePath: string,
    options: { allowOutsideProject?: boolean } = {}
): ValidationResult {
    if (!filePath || typeof filePath !== 'string') {
        return {
            valid: false,
            error: 'File path is required and must be a string.'
        };
    }

    const normalizedPath = filePath.trim();
    if (!normalizedPath) {
        return {
            valid: false,
            error: 'File path is required and must be a string.'
        };
    }

    const allowOutside = options.allowOutsideProject === true;

    // Security: prevent home shorthand (strict mode only) and traversal in relative paths.
    // Read-only mode allows `~/...` expansion via resolveFullPath.
    if (!allowOutside && /^~(?:[\\/]|$)/.test(normalizedPath)) {
        return {
            valid: false,
            error: 'File path contains invalid traversal segments (.., leading ~).'
        };
    }
    if (!path.isAbsolute(normalizedPath) && !/^~(?:[\\/]|$)/.test(normalizedPath) && normalizedPath.includes('..')) {
        return {
            valid: false,
            error: 'File path contains invalid traversal segments (.., leading ~).'
        };
    }

    const fullPath = resolveFullPath(projectPath, normalizedPath);

    // Sensitive-path denylist applies even when `allowOutsideProject` is set —
    // parity with the shell sandbox so read/grep/glob can't exfiltrate SSH
    // keys, AWS credentials, `.env` files, shell rc files, etc. via a
    // prompt-injected instruction.
    if (isSensitiveTokenName(fullPath)) {
        return {
            valid: false,
            error: 'Access to sensitive credential paths (SSH keys, cloud credentials, .env files, shell rc files) is not allowed.'
        };
    }

    // Realpath-based denylist runs for BOTH read and write modes — otherwise a
    // symlink in an `allowOutside` read would exfiltrate credentials while the
    // lexical check above passes. The containment check (isPathWithin /
    // isCopilotGlobalPath) is still restricted to write/strict mode because
    // reads may legitimately traverse outside the project tree.
    //
    // For writes (fullPath doesn't exist yet), walk up to the nearest existing
    // parent and realpath *that*. Otherwise writes through a symlinked parent
    // (e.g. `project/link/new.xml`) bypass containment entirely.
    let realTargetForChecks: string | undefined;
    try {
        if (fs.existsSync(fullPath)) {
            realTargetForChecks = fs.realpathSync(fullPath);
        } else {
            let probe = path.dirname(fullPath);
            const seenRoot = path.parse(probe).root;
            while (!fs.existsSync(probe)) {
                const parent = path.dirname(probe);
                if (parent === probe || probe === seenRoot) {
                    break;
                }
                probe = parent;
            }
            if (fs.existsSync(probe)) {
                const realParent = fs.realpathSync(probe);
                const rel = path.relative(probe, fullPath);
                realTargetForChecks = path.resolve(realParent, rel);
            }
        }
        if (realTargetForChecks && isSensitiveTokenName(realTargetForChecks)) {
            return {
                valid: false,
                error: 'Access to sensitive credential paths (SSH keys, cloud credentials, .env files, shell rc files) is not allowed.'
            };
        }
    } catch {
        return {
            valid: false,
            error: 'File path could not be resolved (broken symlink or permission error).'
        };
    }

    if (!allowOutside) {
        if (!isPathWithin(projectPath, fullPath) && !isCopilotGlobalPath(fullPath)) {
            return {
                valid: false,
                error: 'File path must be within the project or ~/.wso2-mi/copilot/projects.'
            };
        }

        // Symlink protection: re-check containment against the realpath we
        // already resolved above (avoids a second fs.realpathSync call).
        if (realTargetForChecks !== undefined) {
            try {
                const realProject = fs.realpathSync(projectPath);
                if (!isPathWithin(realProject, realTargetForChecks) && !isCopilotGlobalPath(realTargetForChecks)) {
                    return {
                        valid: false,
                        error: 'File path resolves via symlink to a location outside the project.'
                    };
                }
            } catch {
                return {
                    valid: false,
                    error: 'File path could not be resolved (broken symlink or permission error).'
                };
            }
        }
    }

    return { valid: true };
}

/**
 * Validates file paths for text-only operations (write/edit/grep).
 */
function validateTextFilePath(projectPath: string, filePath: string): ValidationResult {
    const securityValidation = validateFilePathSecurity(projectPath, filePath);
    if (!securityValidation.valid) {
        return securityValidation;
    }

    // Reject non-text files (images, PDFs, binaries) to prevent corrupt overwrites
    if (!isTextAllowedFilePath(filePath)) {
        return {
            valid: false,
            error: `Cannot write/edit binary or non-text file '${filePath}'. Allowed text file types: ${getAllowedFileTypesDescription()}`
        };
    }

    return { valid: true };
}

/**
 * Validates file paths for read operations (text + multimodal).
 *
 * Reads are allowed outside the project — convenient for inspecting logs,
 * connector JARs, or other files the agent needs to reason about.
 */
function validateReadableFilePath(projectPath: string, filePath: string): ValidationResult {
    const securityValidation = validateFilePathSecurity(projectPath, filePath, { allowOutsideProject: true });
    if (!securityValidation.valid) {
        return securityValidation;
    }

    if (getReadFileKind(filePath) === 'unsupported') {
        return {
            valid: false,
            error: `File must use an allowed read type: ${getReadAllowedFileTypesDescription()}`
        };
    }

    return { valid: true };
}

function parsePdfPageSelection(pages: string, totalPages: number): PdfPageSelectionResult {
    const normalizedPages = pages.trim();
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(normalizedPages);
    if (!match) {
        return {
            valid: false,
            error: `Invalid pages format '${pages}'. Use "N" or "N-M" (e.g., "3" or "1-5").`
        };
    }

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < 1) {
        return {
            valid: false,
            error: `Invalid pages '${pages}'. Page numbers are 1-indexed and must be positive.`
        };
    }

    if (start > end) {
        return {
            valid: false,
            error: `Invalid pages '${pages}'. Start page cannot be greater than end page.`
        };
    }

    if (end > totalPages) {
        return {
            valid: false,
            error: `Invalid pages '${pages}'. PDF has ${totalPages} page(s).`
        };
    }

    const count = end - start + 1;
    if (count > PDF_MAX_PAGES_PER_REQUEST) {
        return {
            valid: false,
            error: `Invalid pages '${pages}'. You can read at most ${PDF_MAX_PAGES_PER_REQUEST} pages per request.`
        };
    }

    return {
        valid: true,
        selection: { start, end, count }
    };
}

function resolvePdfPageSelection(pages: string | undefined, totalPages: number): PdfPageSelectionResult {
    if (pages && pages.trim().length > 0) {
        return parsePdfPageSelection(pages, totalPages);
    }

    if (totalPages > PDF_MAX_PAGES_PER_REQUEST) {
        return {
            valid: false,
            error: `PDF has ${totalPages} pages. Specify a page range using pages (e.g., "1-5"). Maximum ${PDF_MAX_PAGES_PER_REQUEST} pages per request.`
        };
    }

    return {
        valid: true,
        selection: {
            start: 1,
            end: totalPages,
            count: totalPages
        }
    };
}

async function createPdfSubsetBase64(fileBuffer: Buffer, selection: PdfPageSelection): Promise<string> {
    const PDFDocument = getPdfDocumentStatic();
    const sourcePdf = await PDFDocument.load(fileBuffer);
    const subsetPdf = await PDFDocument.create();
    const pageIndices = Array.from({ length: selection.count }, (_, idx) => selection.start + idx - 1);
    const copiedPages = await subsetPdf.copyPages(sourcePdf, pageIndices);

    for (const page of copiedPages) {
        subsetPdf.addPage(page);
    }

    const subsetBytes = await subsetPdf.save();
    return Buffer.from(subsetBytes).toString('base64');
}

function formatPdfSelection(selection: PdfPageSelection): string {
    return selection.start === selection.end ? `${selection.start}` : `${selection.start}-${selection.end}`;
}

function getToolResultText(output: unknown): string {
    if (typeof output === 'string') {
        return output;
    }

    if (output && typeof output === 'object' && 'message' in output) {
        const message = (output as { message?: unknown }).message;
        if (typeof message === 'string') {
            return message;
        }
    }

    return JSON.stringify(output ?? '');
}

async function buildReadToolModelOutput(
    projectPath: string,
    input: { file_path?: string; pages?: string },
    output: unknown
): Promise<unknown> {
    const textOutput = getToolResultText(output);
    const filePath = input?.file_path;
    if (!filePath) {
        return { type: 'text', value: textOutput };
    }

    const readFileKind = getReadFileKind(filePath);
    if (readFileKind === 'text' || readFileKind === 'unsupported') {
        return { type: 'text', value: textOutput };
    }

    const isSuccess = output && typeof output === 'object' && (output as { success?: unknown }).success === true;
    if (!isSuccess) {
        return { type: 'text', value: textOutput };
    }

    const fullPath = resolveFullPath(projectPath, filePath);
    if (!fs.existsSync(fullPath)) {
        return { type: 'text', value: textOutput };
    }

    try {
        if (readFileKind === 'image') {
            const mediaType = getImageMediaType(filePath);
            if (!mediaType) {
                return { type: 'text', value: textOutput };
            }

            const imageData = fs.readFileSync(fullPath).toString('base64');
            return {
                type: 'content',
                value: [
                    { type: 'text', text: textOutput },
                    { type: 'image-data', data: imageData, mediaType }
                ]
            };
        }

        const pdfBuffer = fs.readFileSync(fullPath);
        const PDFDocument = getPdfDocumentStatic();
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pageSelection = resolvePdfPageSelection(input.pages, pdfDoc.getPageCount());
        if (!pageSelection.valid || !pageSelection.selection) {
            return { type: 'text', value: textOutput };
        }

        const pdfData = await createPdfSubsetBase64(pdfBuffer, pageSelection.selection);
        return {
            type: 'content',
            value: [
                { type: 'text', text: textOutput },
                {
                    type: 'file-data',
                    data: pdfData,
                    mediaType: 'application/pdf',
                    filename: path.basename(filePath),
                }
            ]
        };
    } catch (error) {
        logError(`[FileReadTool] Failed to build multimodal model output for ${filePath}`, error);
        return { type: 'text', value: textOutput };
    }
}

/**
 * Validates a file path for security and extension requirements
 */
function validateFilePath(projectPath: string, filePath: string): ValidationResult {
    return validateTextFilePath(projectPath, filePath);
}

/**
 * Validates a file path for read operations
 */
function validateReadFilePath(projectPath: string, filePath: string): ValidationResult {
    return validateReadableFilePath(projectPath, filePath);
}

/**
 * Validates read options for multimodal files (images/PDFs).
 */
function validateMultimodalReadOptions(
    filePath: string,
    options: { offset?: number; limit?: number; pages?: string }
): ValidationResult {
    const fileKind = getReadFileKind(filePath);
    if (fileKind === 'text' || fileKind === 'unsupported') {
        return { valid: true };
    }

    if (fileKind === 'image') {
        if (options.offset !== undefined || options.limit !== undefined || options.pages !== undefined) {
            return {
                valid: false,
                error: 'offset/limit/pages are not supported for image files. Read the whole image without range options.'
            };
        }
        return { valid: true };
    }

    if (options.offset !== undefined || options.limit !== undefined) {
        return {
            valid: false,
            error: 'offset/limit are not supported for PDF files. Use pages (e.g., "1-5").'
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
    const normalizedPath = filePath.replace(/\\/g, '/').replace(/^\.\//, '');
    const normalizedCopilotRoot = getCopilotProjectsRootDir().replace(/\\/g, '/');
    const normalizedComparablePath = process.platform === 'win32' ? normalizedPath.toLowerCase() : normalizedPath;
    const normalizedComparableCopilotRoot = process.platform === 'win32'
        ? normalizedCopilotRoot.toLowerCase()
        : normalizedCopilotRoot;
    const isCopilotInternalPath = normalizedPath === '.mi-copilot' || normalizedPath.startsWith('.mi-copilot/');
    const isCopilotGlobalPath = path.isAbsolute(filePath) && (
        normalizedComparablePath === normalizedComparableCopilotRoot ||
        normalizedComparablePath.startsWith(`${normalizedComparableCopilotRoot}/`)
    );

    if (isCopilotInternalPath || isCopilotGlobalPath) {
        return;
    }

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
    undoCheckpointManager?: AgentUndoCheckpointManager,
    readFiles?: Set<string>
): WriteExecuteFn {
    return async (args: { file_path: string; content: string }): Promise<ToolResult> => {
        const { file_path, content } = args;
        console.log(`[FileWriteTool] Writing to ${file_path}, content length: ${content.length}`);

        // Validate file path
        const pathValidation = validateFilePath(projectPath, file_path);
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

        const fullPath = resolveFullPath(projectPath, file_path);

        // Check if file exists — allow overwrites but require Read first
        const fileExists = fs.existsSync(fullPath);
        if (fileExists) {
            let existingContent = '';
            try {
                existingContent = fs.readFileSync(fullPath, 'utf-8');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    success: false,
                    message: `Failed to read existing file '${file_path}': ${errorMessage}`,
                    error: `Error: ${ErrorMessages.FILE_WRITE_FAILED}`,
                };
            }
            if (existingContent.trim().length > 0) {
                // Read-before-write guard: require the file to have been read first
                const wasRead = readFiles?.has(file_path) || readFiles?.has(fullPath);
                const isAgentCreated = modifiedFiles?.includes(file_path)
                    || modifiedFiles?.includes(fullPath);
                if (!wasRead && !isAgentCreated) {
                    console.error(`[FileWriteTool] Overwrite blocked — file not read first: ${file_path}`);
                    return {
                        success: false,
                        message: `File '${file_path}' already exists. You must use ${FILE_READ_TOOL_NAME} to read it before overwriting. Prefer ${FILE_EDIT_TOOL_NAME} for modifying existing files — it only sends the diff.`,
                        error: `Error: ${ErrorMessages.FILE_ALREADY_EXISTS}`
                    };
                }
                console.log(`[FileWriteTool] Overwriting existing file: ${file_path}`);
            }
        }

        await undoCheckpointManager?.captureBeforeChange(file_path);

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

        // Give language services a brief moment to settle before automatic validation.
        await delay(POST_WRITE_VALIDATION_DELAY_MS);
        // Automatically validate the file and get structured diagnostics (include code actions for agent)
        const validation = await validateXmlFile(fullPath, projectPath, true);

        console.log(`[FileWriteTool] Successfully ${action} and synced file: ${file_path} with ${lineCount} lines`);

        // Build result with structured validation data
        const result: ToolResult = {
            success: true,
            message: `Successfully ${action} file '${file_path}' with ${lineCount} line(s).${validation ? formatValidationMessage(validation, 15) : ''}`
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
export function createReadExecute(projectPath: string, readFiles?: Set<string>): ReadExecuteFn {
    return async (args: { file_path: string; offset?: number; limit?: number; pages?: string }): Promise<ToolResult> => {
        const { file_path, offset, limit, pages } = args;
        logDebug(`[FileReadTool] Reading ${file_path}, offset: ${offset}, limit: ${limit}, pages: ${pages}`);

        // Validate file path
        const pathValidation = validateReadFilePath(projectPath, file_path);
        if (!pathValidation.valid) {
            logError(`[FileReadTool] Invalid file path: ${file_path}`);
            return {
                success: false,
                message: pathValidation.error!,
                error: `Error: ${ErrorMessages.INVALID_FILE_PATH}`
            };
        }

        const fullPath = resolveFullPath(projectPath, file_path);

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            logError(`[FileReadTool] File not found: ${file_path}`);
            return {
                success: false,
                message: `File '${file_path}' not found.`,
                error: `Error: ${ErrorMessages.FILE_NOT_FOUND}`
            };
        }

        const readOptionValidation = validateMultimodalReadOptions(file_path, { offset, limit, pages });
        if (!readOptionValidation.valid) {
            logError(`[FileReadTool] Invalid read options for file: ${file_path}`);
            return {
                success: false,
                message: readOptionValidation.error!,
                error: `Error: ${ErrorMessages.INVALID_READ_OPTIONS}`
            };
        }

        // Track that this file has been read (used by write tool's read-before-write guard)
        // Placed after existence check and option validation so failed reads are not tracked.
        readFiles?.add(file_path);
        readFiles?.add(fullPath);

        const fileKind = getReadFileKind(file_path);
        if (fileKind === 'image') {
            const mediaType = getImageMediaType(file_path) || 'image/*';
            logDebug(`[FileReadTool] Read image file: ${file_path}`);
            return {
                success: true,
                message: `Read image file '${file_path}' (${mediaType}). Image content is available for multimodal analysis.`,
            };
        }

        if (fileKind === 'pdf') {
            try {
                const pdfBuffer = fs.readFileSync(fullPath);
                const PDFDocument = getPdfDocumentStatic();
                const pdfDoc = await PDFDocument.load(pdfBuffer);
                const totalPages = pdfDoc.getPageCount();
                const selectionResult = resolvePdfPageSelection(pages, totalPages);
                if (!selectionResult.valid || !selectionResult.selection) {
                    return {
                        success: false,
                        message: selectionResult.error!,
                        error: `Error: ${ErrorMessages.INVALID_READ_OPTIONS}`
                    };
                }

                logDebug(`[FileReadTool] Read PDF file: ${file_path}, pages: ${formatPdfSelection(selectionResult.selection)}`);
                return {
                    success: true,
                    message: `Read PDF file '${file_path}' pages ${formatPdfSelection(selectionResult.selection)} (${selectionResult.selection.count} page(s) of ${totalPages}). PDF content is available for multimodal analysis.`,
                };
            } catch (error) {
                logError(`[FileReadTool] Failed to parse PDF file: ${file_path}`, error);
                return {
                    success: false,
                    message: `Failed to read PDF file '${file_path}': ${error instanceof Error ? error.message : String(error)}`,
                    error: `Error: ${ErrorMessages.INVALID_READ_OPTIONS}`
                };
            }
        }

        // Read file content. Strip ANSI escapes / stray control bytes — common
        // in captured Maven/Gradle/npm build logs. The Copilot proxy rejects
        // tool-result strings containing raw 0x00-0x1F bytes with
        // `unexpected control character in string`.
        const rawContent = fs.readFileSync(fullPath, 'utf-8');
        const content = stripAnsiAndControl(rawContent);

        // Handle empty file — distinguish truly empty from "sanitized to empty"
        // so the user knows the file actually contained ANSI/control bytes.
        if (rawContent.trim().length === 0) {
            logDebug(`[FileReadTool] File is empty: ${file_path}`);
            return {
                success: true,
                message: `File '${file_path}' is empty.`,
            };
        }
        if (content.trim().length === 0) {
            logDebug(`[FileReadTool] File contained only ANSI/control characters after sanitization: ${file_path}`);
            return {
                success: true,
                message: `File '${file_path}' contained only ANSI escape sequences or control characters; no readable text after sanitization.`,
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
        const pathValidation = validateFilePath(projectPath, file_path);
        if (!pathValidation.valid) {
            logError(`[FileEditTool] Invalid file path: ${file_path}`);
            return {
                success: false,
                message: pathValidation.error!,
                error: `Error: ${ErrorMessages.INVALID_FILE_PATH}`
            };
        }

        if (!old_string) {
            return {
                success: false,
                message: 'old_string cannot be empty.',
                error: `Error: ${ErrorMessages.NO_EDITS}`
            };
        }

        if (old_string === new_string) {
            return {
                success: false,
                message: 'new_string must be different from old_string.',
                error: `Error: ${ErrorMessages.NO_EDITS}`
            };
        }

        const fullPath = resolveFullPath(projectPath, file_path);

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            logError(`[FileEditTool] File not found: ${file_path}`);
            return {
                success: false,
                message: `File '${file_path}' not found. Use ${FILE_WRITE_TOOL_NAME} to create new files.`,
                error: `Error: ${ErrorMessages.FILE_NOT_FOUND}`
            };
        }

        // Read file content and normalize CRLF → LF so old_string from the LLM (always LF) matches
        const rawContent = fs.readFileSync(fullPath, 'utf-8');
        const hasCRLF = rawContent.includes('\r\n');
        const content = hasCRLF ? rawContent.replace(/\r\n/g, '\n') : rawContent;

        if (!content.includes(old_string)) {
            return {
                success: false,
                message: `old_string not found in '${file_path}'. Make sure it matches exactly, including whitespace and indentation.`,
                error: `Error: ${ErrorMessages.HUNK_NOT_FOUND}`
            };
        }

        // Count occurrences
        const occurrences = content.split(old_string).length - 1;

        if (occurrences > 1 && !replace_all) {
            return {
                success: false,
                message: `old_string found ${occurrences} times in '${file_path}'. Provide a larger string with more surrounding context to make it unique, or set replace_all=true to replace all occurrences.`,
                error: `Error: ${ErrorMessages.HUNK_AMBIGUOUS}`
            };
        }

        await undoCheckpointManager?.captureBeforeChange(file_path);

        let newContent = replace_all
            ? content.split(old_string).join(new_string)
            : content.replace(old_string, new_string);

        // Restore original CRLF line endings if the file had them
        if (hasCRLF) {
            newContent = newContent.replace(/\n/g, '\r\n');
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

        // Give language services a brief moment to settle before automatic validation.
        await delay(POST_WRITE_VALIDATION_DELAY_MS);
        const validation = await validateXmlFile(fullPath, projectPath, true);

        const replacedCount = replace_all ? occurrences : 1;
        logDebug(`[FileEditTool] Successfully replaced ${replacedCount} occurrence(s) in: ${file_path}`);

        const result: ToolResult = {
            success: true,
            message: `Replaced ${replacedCount} occurrence(s) in '${file_path}'.${validation ? formatValidationMessage(validation, 15) : ''}`
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
        type?: string;
        output_mode?: 'content' | 'files_with_matches' | 'count';
        '-i'?: boolean;
        '-A'?: number;
        '-B'?: number;
        '-C'?: number;
        multiline?: boolean;
        head_limit?: number;
    }): Promise<ToolResult> => {
        const {
            pattern,
            path: searchPath = '.',
            glob: globFilter,
            type: fileType,
            output_mode = 'files_with_matches',
            '-i': caseInsensitive = false,
            '-A': afterLines,
            '-B': beforeLines,
            '-C': contextLines,
            multiline = false,
            head_limit = 100,
        } = args;

        logDebug(`[GrepTool] Searching for pattern '${pattern}' in ${searchPath} (mode=${output_mode})`);

        // Glob control-character guard (Zod enforces length, but not control chars).
        if (globFilter && /[\r\n\0]/.test(globFilter)) {
            return {
                success: false,
                message: 'Glob contains invalid control characters.',
                error: 'Error: Invalid glob pattern',
            };
        }

        // Format-validate the user-supplied --type for argv safety. The actual
        // type name is passed straight to rg; rg rejects unknown types itself.
        let typeArgs: string[] = [];
        if (fileType) {
            const validated = validateRgTypeName(fileType);
            if ('error' in validated) {
                return {
                    success: false,
                    message: validated.error,
                    error: 'Error: Invalid file type filter',
                };
            }
            if (validated.value) {
                typeArgs = ['--type', validated.value];
            }
        }

        const pathValidation = validateFilePathSecurity(projectPath, searchPath, { allowOutsideProject: true });
        if (!pathValidation.valid) {
            return {
                success: false,
                message: pathValidation.error!,
                error: `Error: ${ErrorMessages.INVALID_FILE_PATH}`,
            };
        }

        const fullSearchPath = resolveFullPath(projectPath, searchPath);

        if (!fs.existsSync(fullSearchPath)) {
            return {
                success: false,
                message: `Path '${searchPath}' does not exist.`,
                error: 'Error: Path not found',
            };
        }

        // Build the rg argument list. Match glob's ignore semantics (--no-ignore
        // + --no-ignore-vcs) so grep results don't silently skip files the glob
        // tool would return — e.g. target/, build/, and anything else covered
        // by a project .gitignore. RG_EXCLUDED_DIRS / RG_EXCLUDED_SENSITIVE_GLOBS
        // below are the single source of truth for what grep hides.
        const rgArgs: string[] = ['--no-follow', '--no-ignore', '--no-ignore-vcs'];
        if (output_mode === 'files_with_matches') {
            rgArgs.push('-l');
        } else if (output_mode === 'count') {
            // --with-filename forces `file:count` output even when rg is run
            // against a single file; parseRgCountOutput needs the `file:` prefix
            // on every line, otherwise single-file searches silently drop the
            // result (lastIndexOf(':') is negative on a bare number).
            rgArgs.push('-c', '--with-filename');
        } else {
            // content mode — use --json for structured parsing of matches + context events
            rgArgs.push('--json');
        }
        if (caseInsensitive) {
            rgArgs.push('-i');
        }
        if (multiline) {
            rgArgs.push('-U', '--multiline-dotall');
        }
        // Context flags only meaningful in content mode. -C overrides -A/-B if set.
        if (output_mode === 'content') {
            if (typeof contextLines === 'number' && contextLines > 0) {
                rgArgs.push('-C', String(contextLines));
            } else {
                if (typeof afterLines === 'number' && afterLines > 0) {
                    rgArgs.push('-A', String(afterLines));
                }
                if (typeof beforeLines === 'number' && beforeLines > 0) {
                    rgArgs.push('-B', String(beforeLines));
                }
            }
        }
        rgArgs.push(...typeArgs);
        if (globFilter) {
            rgArgs.push('--glob', globFilter);
        }
        for (const dir of RG_EXCLUDED_DIRS) {
            rgArgs.push('--glob', `!${dir}`);
        }
        for (const pat of RG_EXCLUDED_SENSITIVE_GLOBS) {
            rgArgs.push('--glob', `!${pat}`);
        }
        // Positional separator prevents a pattern starting with `-` from being parsed as a flag.
        rgArgs.push('--', pattern, fullSearchPath);

        const guarded = await runRipgrepGuarded(rgArgs, projectPath, 'GrepTool');
        if (guarded.failure) {
            return guarded.failure;
        }
        const rgResult = guarded.result;

        // head_limit: 0 means unlimited; positive means cap.
        const limit = head_limit > 0 ? head_limit : Number.POSITIVE_INFINITY;
        const truncationNote = rgResult.truncated
            ? '\n\n(Note: rg output was truncated at 16 MB. Results are partial — narrow your search.)'
            : '';

        if (output_mode === 'files_with_matches') {
            const rawFiles = parseRgFiles(rgResult.stdout);
            const wasCapped = rawFiles.length > limit;
            const filesWithMatches = rawFiles
                .slice(0, limit)
                .map(absPath => path.relative(projectPath, absPath));

            if (filesWithMatches.length === 0) {
                return {
                    success: true,
                    message: `No matches found for pattern '${pattern}' in ${searchPath}.${truncationNote}`,
                };
            }

            let message = `Found ${filesWithMatches.length} file(s) with matches for pattern '${pattern}':\n\n`;
            for (const file of filesWithMatches) {
                message += `${file}\n`;
            }
            if (wasCapped) {
                message += `\n(Limited to ${head_limit} files. Use head_limit parameter to see more.)`;
            }
            message += truncationNote;

            logDebug(`[GrepTool] Found ${filesWithMatches.length} files with matches`);
            return {
                success: true,
                message: message.trim(),
            };
        }

        if (output_mode === 'count') {
            const rawCounts = parseRgCountOutput(rgResult.stdout);
            const wasCapped = rawCounts.length > limit;
            const counts = rawCounts
                .slice(0, limit)
                .map(c => ({ file: path.relative(projectPath, c.file), count: c.count }));

            if (counts.length === 0) {
                return {
                    success: true,
                    message: `No matches found for pattern '${pattern}' in ${searchPath}.${truncationNote}`,
                };
            }

            let message = `Found matches in ${counts.length} file(s) for pattern '${pattern}':\n\n`;
            for (const c of counts) {
                message += `${c.file}:${c.count}\n`;
            }
            if (wasCapped) {
                message += `\n(Limited to ${head_limit} files. Use head_limit parameter to see more.)`;
            }
            message += truncationNote;

            logDebug(`[GrepTool] Counted matches in ${counts.length} files`);
            return {
                success: true,
                message: message.trim(),
            };
        }

        // content mode — entries can be matches or context lines
        const allEntries = parseRgJsonMatches(rgResult.stdout);
        const wasCapped = allEntries.length > limit;
        const entries = allEntries.slice(0, limit);

        if (entries.length === 0) {
            return {
                success: true,
                message: `No matches found for pattern '${pattern}' in ${searchPath}.${truncationNote}`,
            };
        }

        const matchCount = entries.filter(e => e.kind === 'match').length;
        let message = `Found ${matchCount} match(es) for pattern '${pattern}':\n\n`;
        for (const entry of entries) {
            const relFile = path.relative(projectPath, entry.file);
            const trimmedLine = entry.content.trim();
            const displayLine = trimmedLine.length > MAX_GREP_MATCH_LINE_LENGTH
                ? trimmedLine.substring(0, MAX_GREP_MATCH_LINE_LENGTH) + '… [truncated]'
                : trimmedLine;
            // Standard grep convention: `:` separator for matches, `-` for context lines.
            const sep = entry.kind === 'match' ? ':' : '-';
            message += `${relFile}${sep}${entry.line}${sep} ${displayLine}\n`;
        }
        if (wasCapped) {
            message += `\n(Limited to ${head_limit} lines. Use head_limit parameter to see more.)`;
        }
        message += truncationNote;

        logDebug(`[GrepTool] Returned ${entries.length} content lines (${matchCount} matches)`);
        return {
            success: true,
            message: message.trim(),
        };
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

        logDebug(`[GlobTool] Searching for pattern '${pattern}' in ${searchPath}`);

        // Glob control-character guard.
        if (/[\r\n\0]/.test(pattern)) {
            return {
                success: false,
                message: 'Glob contains invalid control characters.',
                error: 'Error: Invalid glob pattern',
            };
        }

        const pathValidation = validateFilePathSecurity(projectPath, searchPath, { allowOutsideProject: true });
        if (!pathValidation.valid) {
            return {
                success: false,
                message: pathValidation.error!,
                error: `Error: ${ErrorMessages.INVALID_FILE_PATH}`,
            };
        }

        const fullSearchPath = resolveFullPath(projectPath, searchPath);

        if (!fs.existsSync(fullSearchPath)) {
            return {
                success: false,
                message: `Path '${searchPath}' does not exist.`,
                error: 'Error: Path not found',
            };
        }

        // rg --files lists every file under the search path; --glob filters the listing.
        // --no-ignore makes results independent of whether the project has a .gitignore.
        // We do NOT pass --hidden because dotfiles are usually noise here.
        // target/ and build/ are intentionally NOT excluded — see createGrepExecute for rationale.
        const rgArgs: string[] = [
            '--files',
            '--no-follow',
            '--no-ignore',
            '--glob', pattern,
        ];
        for (const dir of RG_EXCLUDED_DIRS) {
            rgArgs.push('--glob', `!${dir}`);
        }
        for (const pat of RG_EXCLUDED_SENSITIVE_GLOBS) {
            rgArgs.push('--glob', `!${pat}`);
        }
        rgArgs.push(fullSearchPath);

        const guarded = await runRipgrepGuarded(rgArgs, projectPath, 'GlobTool');
        if (guarded.failure) {
            return guarded.failure;
        }
        const rgResult = guarded.result;

        // Resolve to absolute paths so isPathWithin and stat behave deterministically,
        // then containment-filter as defense in depth against any path-escape edge cases.
        const matches = parseRgFiles(rgResult.stdout)
            .map(p => path.isAbsolute(p) ? path.resolve(p) : path.resolve(projectPath, p))
            .filter(absPath => isPathWithin(fullSearchPath, absPath));

        // Stat in parallel — large monorepo glob results can be hundreds of files.
        // A file that vanished between rg listing and stat is silently dropped.
        const statResults = await Promise.all(matches.map(async (file) => {
            try {
                const stat = await fs.promises.stat(file);
                return { file, mtime: stat.mtime.getTime() };
            } catch {
                return null;
            }
        }));
        const filesWithStats = statResults.filter((s): s is { file: string; mtime: number } => s !== null);
        filesWithStats.sort((a, b) => b.mtime - a.mtime);

        const relativePaths = filesWithStats.map(f => path.relative(projectPath, f.file));
        const truncationNote = rgResult.truncated
            ? '\n\n(Note: rg output was truncated at 16 MB. Results are partial — narrow your pattern.)'
            : '';

        if (relativePaths.length === 0) {
            return {
                success: true,
                message: `No files found matching pattern '${pattern}' in ${searchPath}.${truncationNote}`,
            };
        }

        let message = `Found ${relativePaths.length} file(s) matching pattern '${pattern}':\n\n`;
        for (const filePath of relativePaths) {
            message += `${filePath}\n`;
        }
        message += truncationNote;

        logDebug(`[GlobTool] Found ${relativePaths.length} files`);
        return {
            success: true,
            message: message.trim(),
        };
    };
}

// ============================================================================
// Tool Definitions (Vercel AI SDK format)
// ============================================================================


/**
 * Creates the file_write tool
 */

const writeInputSchema = z.object({
    file_path: z.string().describe(`The file path to write. Use a path relative to the project root, or an absolute path under ~/.wso2-mi/copilot/projects for copilot session artifacts (e.g., plan files).`),
    content: z.string().describe(`The content to write to the file. Cannot be empty.`)
});

export function createWriteTool(execute: WriteExecuteFn) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `Writes a file to the filesystem. Creates new files or overwrites existing ones.
            If the file already exists, you MUST use ${FILE_READ_TOOL_NAME} first — this tool will fail if you haven't read it.
            Prefer ${FILE_EDIT_TOOL_NAME} for modifying existing files — it only sends the diff. Use this tool for new files or complete rewrites.
            Parent directories are created automatically.
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
    file_path: z.string().describe(`The file path to read. Use a path relative to the project root, or an absolute path under ~/.wso2-mi/copilot/projects for copilot session artifacts.`),
    offset: z.number().optional().describe(`The line number to start reading from`),
    limit: z.number().optional().describe(`The number of lines to read`),
    pages: z.string().optional().describe(`PDF page selection. Use "N" or "N-M" (e.g., "3" or "1-5"). Maximum 5 pages per request.`)
});

export function createReadTool(execute: ReadExecuteFn, projectPath: string) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `Reads a file from the project.
            Text files return line-numbered content (supports offset/limit). When you already know which part of the file you need, only read that part.
            Image files (.png, .jpg, .jpeg, .gif, .webp) are provided for multimodal analysis.
            PDFs can be read with pages ("N" or "N-M"). For PDFs over ${PDF_MAX_PAGES_PER_REQUEST} pages, pages is required. Maximum ${PDF_MAX_PAGES_PER_REQUEST} pages per request.
            You can call this tool multiple times in parallel — speculatively read multiple potentially useful files at once rather than one at a time.`,
        inputSchema: readInputSchema,
        execute,
        toModelOutput: async ({ input, output }: { input: { file_path?: string; pages?: string }; output: unknown }) => {
            return buildReadToolModelOutput(projectPath, input, output);
        }
    });
}

/**
 * Creates the file_edit tool
 */

const editInputSchema = z.object({
    file_path: z.string().describe(`The file path to edit. Use a path relative to the project root, or an absolute path under ~/.wso2-mi/copilot/projects for copilot session artifacts.`),
    old_string: z.string().describe(`The exact text to replace. Must match exactly (including whitespace and indentation). Must be unique in the file unless replace_all is true.`),
    new_string: z.string().describe(`The replacement text. Must be different from old_string. Use empty string to delete the matched text.`),
    replace_all: z.boolean().default(false).describe(`Replace all occurrences of old_string. Default false. Use for renaming variables or changing repeated patterns across the file.`),
});

export function createEditTool(execute: EditExecuteFn) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `Performs exact string replacements in an existing file.
            The edit will FAIL if old_string is not unique in the file — provide a larger string with more surrounding context to make it unique, or use replace_all to change every instance.
            Use replace_all for renaming variables or replacing repeated strings across the file.
            For multiple edits: call this tool in parallel for different files; call sequentially for the same file.
            Cannot create new files — use ${FILE_WRITE_TOOL_NAME} for that.
            XML files are automatically validated after editing (results included in response).`,
        inputSchema: editInputSchema,
        execute
    });
}

/**
 * Creates the grep tool
 */

const grepInputSchema = z.object({
    pattern: z.string().min(1).max(MAX_GREP_PATTERN_LENGTH).describe(`The regular expression pattern to search for in file contents`),
    path: z.string().optional().describe(`File or directory to search in (rg PATH). Defaults to current working directory.`),
    glob: z.string().max(MAX_GREP_GLOB_LENGTH).optional().describe(`Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}") - maps to rg --glob`),
    type: z.string().optional().describe(`File type to search (rg --type). Run \`rg --type-list\` for the full list of supported types. Common: js, ts, py, rust, go, java, xml.`),
    output_mode: z.enum(['content', 'files_with_matches', 'count']).optional().describe(`Output mode: "content" shows matching lines (supports -A/-B/-C context, head_limit), "files_with_matches" shows file paths (default), "count" shows match counts per file.`),
    '-i': z.boolean().optional().describe(`Case insensitive search (rg -i)`),
    '-A': z.number().int().min(0).max(50).optional().describe(`Number of lines to show after each match (rg -A). Requires output_mode: "content", ignored otherwise.`),
    '-B': z.number().int().min(0).max(50).optional().describe(`Number of lines to show before each match (rg -B). Requires output_mode: "content", ignored otherwise.`),
    '-C': z.number().int().min(0).max(50).optional().describe(`Number of lines to show before and after each match (rg -C). Requires output_mode: "content", ignored otherwise.`),
    multiline: z.boolean().optional().describe(`Enable multiline mode where . matches newlines and patterns can span lines (rg -U --multiline-dotall). Default: false.`),
    head_limit: z.number().int().min(0).optional().describe(`Limit output to first N lines/entries, equivalent to "| head -N". Works across all output modes: content (limits output lines), files_with_matches (limits file paths), count (limits count entries). Defaults to 100. Pass 0 for unlimited (use sparingly — large result sets waste context).`),
});

export function createGrepTool(execute: GrepExecuteFn) {
    // Type assertion to avoid TypeScript deep instantiation issues with Zod
    return (tool as any)({
        description: `A powerful search tool built on ripgrep.

Usage:
- ALWAYS use this tool for search tasks. NEVER invoke \`grep\` or \`rg\` via the shell tool. This tool has been optimized for correct permissions, sandboxing, and output handling.
- Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
- Filter files with the \`glob\` parameter (e.g., "*.xml", "**/*.{xml,yaml}") or the \`type\` parameter (e.g., "xml", "ts", "java"). Run \`rg --type-list\` mentally to recall supported types.
- Output modes: "content" shows matching lines (verbose — use sparingly), "files_with_matches" shows only file paths (default), "count" shows match counts per file.
- Pattern syntax: Uses ripgrep, not POSIX grep. Literal braces need escaping (e.g. \`interface\\{\\}\` to find \`interface{}\`).
- Multiline matching: By default patterns match within a single line only. For cross-line patterns like \`<sequence>[\\s\\S]*?</sequence>\`, set \`multiline: true\`.
- Skips node_modules, .git, .devtools. Binary files (.car, .class, .jar, etc.) are auto-detected and skipped.
- target/ and build/ ARE searchable so you can inspect deployed synapse-config under target/<artifact>/synapse-config/ and built artifacts.`,
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
        description: `Find files by glob pattern (e.g., "**/*.xml") using ripgrep. Returns paths sorted by modification time (most recent first).
            Skips node_modules, .git, .devtools. target/ and build/ are searchable so you can locate built artifacts and deployed synapse-config files.`,
        inputSchema: globInputSchema,
        execute
    });
}
