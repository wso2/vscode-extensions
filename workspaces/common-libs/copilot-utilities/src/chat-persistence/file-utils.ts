/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

/**
 * Write data to a file atomically by writing to a temp file first,
 * then renaming. `fs.renameSync` is atomic on macOS, Linux, and Windows NTFS.
 */
export function atomicWriteSync(filePath: string, data: string | Buffer): void {
    const dir = path.dirname(filePath);
    ensureDirSync(dir);

    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    try {
        if (typeof data === 'string') {
            fs.writeFileSync(tmpPath, data, 'utf8');
        } else {
            fs.writeFileSync(tmpPath, data);
        }
        fs.renameSync(tmpPath, filePath);
    } catch (err) {
        // Clean up temp file on failure
        try {
            fs.unlinkSync(tmpPath);
        } catch {
            // Ignore cleanup errors
        }
        throw err;
    }
}

/**
 * Write data to a file atomically (async variant).
 * Preferred for large payloads to avoid blocking the event loop.
 */
export async function atomicWriteAsync(filePath: string, data: string | Buffer): Promise<void> {
    const dir = path.dirname(filePath);
    ensureDirSync(dir);

    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    try {
        await fs.promises.writeFile(tmpPath, data);
        await fs.promises.rename(tmpPath, filePath);
    } catch (err) {
        try {
            await fs.promises.unlink(tmpPath);
        } catch {
            // Ignore cleanup errors
        }
        throw err;
    }
}

/**
 * Read and parse a JSON file synchronously.
 * Returns `null` if the file does not exist or contains invalid JSON.
 */
export function readJsonSync<T>(filePath: string): T | null {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/**
 * Write an object as JSON to a file atomically.
 */
export function writeJsonSync(filePath: string, data: unknown): void {
    atomicWriteSync(filePath, JSON.stringify(data));
}

/**
 * Append a single line to a file (creating it and any parent directories if
 * needed). The newline terminator is added automatically.
 *
 * This is the core primitive behind the append-only (JSONL) thread log: adding
 * a record costs O(size of the record) regardless of how large the file already
 * is, unlike a full-file rewrite which costs O(size of the whole file).
 */
export function appendLineSync(filePath: string, line: string): void {
    ensureDirSync(path.dirname(filePath));
    fs.appendFileSync(filePath, line + '\n', 'utf8');
}

/**
 * Read a newline-delimited JSON (JSONL) file and parse each line.
 *
 * Returns `null` if the file does not exist (so callers can distinguish
 * "no log" from "empty log"). Blank lines are skipped. Individual lines that
 * fail to parse are skipped rather than aborting the whole read — this makes
 * replay resilient to a torn trailing line left behind by a crash mid-append
 * (`fs.appendFileSync` is not atomic across a crash) and to any single corrupt
 * record, without losing the rest of the history.
 */
export function readJsonlSync<T>(filePath: string): T[] | null {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        const records: T[] = [];
        for (const line of raw.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.length === 0) {
                continue;
            }
            try {
                records.push(JSON.parse(trimmed) as T);
            } catch {
                // Skip a torn/corrupt line; keep replaying the rest.
            }
        }
        return records;
    } catch {
        return null;
    }
}

/**
 * Write data as gzip-compressed JSON atomically.
 * Used for large checkpoint snapshots.
 */
export function writeGzipSync(filePath: string, data: unknown): void {
    const compressed = zlib.gzipSync(JSON.stringify(data));
    atomicWriteSync(filePath, compressed);
}

/**
 * Read and decompress a gzip-compressed JSON file synchronously.
 * Returns `null` if the file does not exist or is corrupt.
 */
export function readGzipSync<T>(filePath: string): T | null {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const compressed = fs.readFileSync(filePath);
        const json = zlib.gunzipSync(compressed).toString('utf8');
        return JSON.parse(json) as T;
    } catch {
        return null;
    }
}

/**
 * Write data as gzip-compressed JSON atomically (async variant).
 * Preferred for large checkpoint snapshots to avoid blocking the event loop.
 */
export async function writeGzipAsync(filePath: string, data: unknown): Promise<void> {
    const json = JSON.stringify(data);

    const compressed = await new Promise<Buffer>((resolve, reject) => {
        zlib.gzip(json, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });

    await atomicWriteAsync(filePath, compressed);
}

/**
 * Create a directory and all parent directories if they don't exist.
 */
export function ensureDirSync(dirPath: string): void {
    fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Remove a directory and all its contents recursively.
 * No-op if the directory does not exist.
 */
export function removeDirSync(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
}

/**
 * List immediate subdirectory names in a directory.
 * Returns an empty array if the directory does not exist.
 */
export function listSubdirectoriesSync(dirPath: string): string[] {
    try {
        if (!fs.existsSync(dirPath)) {
            return [];
        }
        return fs.readdirSync(dirPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
    } catch {
        return [];
    }
}

/**
 * List files matching a suffix in a directory.
 * Returns an empty array if the directory does not exist.
 */
export function listFilesBySuffixSync(dirPath: string, suffix: string): string[] {
    try {
        if (!fs.existsSync(dirPath)) {
            return [];
        }
        return fs.readdirSync(dirPath, { withFileTypes: true })
            .filter(entry => entry.isFile() && entry.name.endsWith(suffix))
            .map(entry => entry.name);
    } catch {
        return [];
    }
}
