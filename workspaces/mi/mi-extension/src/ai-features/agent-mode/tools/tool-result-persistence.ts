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

import * as fs from 'fs/promises';
import * as path from 'path';
import { logDebug, logError } from '../../copilot/logger';
import { FILE_READ_TOOL_NAME } from './types';
import { getCopilotProjectStorageDir } from '../storage-paths';

const PERSIST_THRESHOLD_CHARS = 30_000;
const PREVIEW_CHARS = 2_048;
const MAX_FILE_COUNT = 50;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TRUNCATED_NOTE = '\n... [output truncated] ...\n';

interface ToolResultPersistenceParams {
    sessionDir: string;
    toolName: string;
    toolArgs?: unknown;
    result: unknown;
}

interface FileEntry {
    fullPath: string;
    mtimeMs: number;
    size: number;
}

function sanitizeSegment(input: string): string {
    return input.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'value';
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes}B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)}KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getDisplayPath(filePath: string): string {
    return filePath;
}

function truncateForInlineDisplay(value: string): string {
    if (value.length <= PERSIST_THRESHOLD_CHARS) {
        return value;
    }
    const available = PERSIST_THRESHOLD_CHARS - TRUNCATED_NOTE.length;
    return value.slice(0, Math.max(0, available)) + TRUNCATED_NOTE;
}

function isPersistedOutputText(value: string): boolean {
    return value.includes('<persisted-output>') && value.includes('</persisted-output>');
}

function shouldSkipPersistenceForResult(
    toolName: string,
    toolArgs: unknown,
): boolean {
    if (toolName !== FILE_READ_TOOL_NAME || !toolArgs || typeof toolArgs !== 'object') {
        return false;
    }

    const filePath = (toolArgs as { file_path?: string }).file_path;
    if (!filePath) {
        return false;
    }

    const normalized = filePath.replace(/\\/g, '/');
    const isLegacyPath = normalized.includes('.mi-copilot/') && normalized.includes('/tool-results/');
    const isWso2MiPath = normalized.includes('/.wso2-mi/copilot/projects/') && normalized.includes('/tool-results/');
    return isLegacyPath || isWso2MiPath;
}

async function getToolResultFiles(toolResultsDir: string): Promise<FileEntry[]> {
    const entries = await fs.readdir(toolResultsDir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile());

    const fileEntries = await Promise.all(files.map(async (file): Promise<FileEntry> => {
        const fullPath = path.join(toolResultsDir, file.name);
        const stat = await fs.stat(fullPath);
        return {
            fullPath,
            mtimeMs: stat.mtimeMs,
            size: stat.size,
        };
    }));

    return fileEntries.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

async function removeFile(filePath: string): Promise<void> {
    try {
        await fs.unlink(filePath);
    } catch {
        // Ignore race conditions and missing files.
    }
}

export async function cleanupPersistedToolResults(sessionDir: string): Promise<void> {
    const toolResultsDir = path.join(sessionDir, 'tool-results');

    try {
        const files = await getToolResultFiles(toolResultsDir);
        if (files.length === 0) {
            return;
        }

        const now = Date.now();
        const remaining: FileEntry[] = [];
        let removedCount = 0;

        // 1) Remove stale files by age.
        for (const file of files) {
            if (now - file.mtimeMs > MAX_AGE_MS) {
                await removeFile(file.fullPath);
                removedCount++;
            } else {
                remaining.push(file);
            }
        }

        // 2) Enforce count + size caps (newest files kept first).
        let totalBytes = remaining.reduce((sum, file) => sum + file.size, 0);
        while (remaining.length > MAX_FILE_COUNT || totalBytes > MAX_TOTAL_BYTES) {
            const oldest = remaining.pop();
            if (!oldest) {
                break;
            }
            await removeFile(oldest.fullPath);
            totalBytes -= oldest.size;
            removedCount++;
        }

        if (removedCount > 0) {
            logDebug(`[ToolResultPersistence] Removed ${removedCount} stale tool result file(s) from ${toolResultsDir}`);
        }
    } catch {
        // Directory may not exist yet.
    }
}

export async function cleanupPersistedToolResultsForProject(projectPath: string): Promise<void> {
    const miCopilotDir = getCopilotProjectStorageDir(projectPath);
    try {
        const entries = await fs.readdir(miCopilotDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            await cleanupPersistedToolResults(path.join(miCopilotDir, entry.name));
        }
    } catch {
        // Project storage directory may not exist yet.
    }
}

export async function persistOversizedToolResult({
    sessionDir,
    toolName,
    toolArgs,
    result,
}: ToolResultPersistenceParams): Promise<unknown> {
    if (!result || typeof result !== 'object') {
        return result;
    }

    const skipPersistence = shouldSkipPersistenceForResult(toolName, toolArgs);
    let fileCounter = 0;
    const seen = new WeakSet<object>();

    const persistString = async (value: string, fieldPath: string): Promise<string> => {
        if (value.length <= PERSIST_THRESHOLD_CHARS || isPersistedOutputText(value)) {
            return value;
        }

        // Avoid recursive file creation when reading already persisted tool result files.
        if (skipPersistence) {
            return truncateForInlineDisplay(value);
        }

        const toolResultsDir = path.join(sessionDir, 'tool-results');
        const timestamp = Date.now();
        const fileName = `${timestamp}-${sanitizeSegment(toolName)}-${sanitizeSegment(fieldPath)}-${String(++fileCounter).padStart(2, '0')}.txt`;
        const filePath = path.join(toolResultsDir, fileName);

        try {
            await fs.mkdir(toolResultsDir, { recursive: true });
            await fs.writeFile(filePath, value, 'utf8');
            await cleanupPersistedToolResults(sessionDir);

            const displayPath = getDisplayPath(filePath);
            const preview = value.slice(0, PREVIEW_CHARS);
            const ellipsis = value.length > PREVIEW_CHARS ? '\n...' : '';

            return [
                '<persisted-output>',
                `Output too large (${formatBytes(Buffer.byteLength(value, 'utf8'))}). Full output saved to: ${displayPath}`,
                '',
                'Preview (first 2KB):',
                `${preview}${ellipsis}`,
                '</persisted-output>',
            ].join('\n');
        } catch (error) {
            logError(`[ToolResultPersistence] Failed to persist oversized output for ${toolName}/${fieldPath}`, error);
            return truncateForInlineDisplay(value);
        }
    };

    const transformValue = async (value: unknown, fieldPath: string): Promise<unknown> => {
        if (typeof value === 'string') {
            return persistString(value, fieldPath);
        }

        if (!value || typeof value !== 'object') {
            return value;
        }

        if (seen.has(value as object)) {
            return value;
        }
        seen.add(value as object);

        if (Array.isArray(value)) {
            const transformed = await Promise.all(value.map((item, index) =>
                transformValue(item, `${fieldPath}-${index}`)
            ));
            return transformed;
        }

        const transformedObject: Record<string, unknown> = {};
        for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
            transformedObject[key] = await transformValue(nestedValue, `${fieldPath}-${key}`);
        }
        return transformedObject;
    };

    try {
        return await transformValue(result, 'result');
    } catch (error) {
        logError(`[ToolResultPersistence] Failed to process tool result for ${toolName}`, error);
        return result;
    }
}
