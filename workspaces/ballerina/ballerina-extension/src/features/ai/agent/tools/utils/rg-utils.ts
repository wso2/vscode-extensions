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

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { rgPath as builtinRgPath } from '@vscode/ripgrep';

// ============================================================================
// Ripgrep binary resolution
// ============================================================================

/**
 * Returns the ripgrep binary path.
 * Prefers the bundled @vscode/ripgrep binary; falls back to the system `rg`
 * when the bundled binary is absent (e.g. installed with --ignore-scripts).
 */
export function getRgExecutable(): string {
    if (fs.existsSync(builtinRgPath)) {
        return builtinRgPath;
    }
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const result = spawnSync(whichCmd, ['rg'], { encoding: 'utf-8' });
    if (result.status === 0 && result.stdout?.trim()) {
        return result.stdout.trim();
    }
    throw new Error('ripgrep binary not found. Install `@vscode/ripgrep` or ensure `rg` is on PATH.');
}

// ============================================================================
// Project root resolution
// ============================================================================

export interface ProjectRoots {
    /** Symlink-resolved absolute project root. */
    realProjectRoot: string;
    /** realProjectRoot + path.sep — for containment checks after realpathSync. */
    normalizedRoot: string;
    /** Raw tempProjectPath + path.sep — for containment checks before realpathSync. */
    normalizedRawRoot: string;
}

/**
 * Resolves symlinks on the project root once at tool-executor setup time.
 * Reuse the result across invocations instead of calling realpathSync per request.
 */
export function resolveProjectRoots(tempProjectPath: string): ProjectRoots {
    const realProjectRoot = (() => {
        try { return fs.realpathSync(tempProjectPath); } catch { return tempProjectPath; }
    })();
    return {
        realProjectRoot,
        normalizedRoot: realProjectRoot + path.sep,
        normalizedRawRoot: tempProjectPath.endsWith(path.sep) ? tempProjectPath : tempProjectPath + path.sep,
    };
}

// ============================================================================
// Path validation
// ============================================================================

/**
 * `ok: true`  — resolvedPath is safe to pass to ripgrep.
 * `ok: false` — message is user-facing; error is a short tag for logging.
 */
export type PathValidationResult =
    | { ok: true; resolvedPath: string }
    | { ok: false; message: string; error: string };

/**
 * Resolves searchPath relative to tempProjectPath and verifies it stays within
 * the project root. Guards against both string-level traversal (`../../outside`)
 * and symlink-based traversal (in-project symlink pointing outside).
 *
 * @param options.requireDirectory  When true, also verifies the path is a directory.
 */
export function validateSearchPath(
    tempProjectPath: string,
    searchPath: string | undefined,
    roots: ProjectRoots,
    options?: { requireDirectory?: boolean }
): PathValidationResult {
    const resolvedPath = searchPath
        ? path.resolve(tempProjectPath, searchPath)
        : tempProjectPath;

    // Pre-symlink check: path.resolve eliminates `..` segments, so this catches
    // naive traversal without touching the filesystem.
    if (resolvedPath !== tempProjectPath
        && !resolvedPath.startsWith(roots.normalizedRoot)
        && !resolvedPath.startsWith(roots.normalizedRawRoot)) {
        return { ok: false, message: 'Search path must be within the project root.', error: 'Error: Path traversal detected' };
    }

    if (!fs.existsSync(resolvedPath)) {
        return { ok: false, message: `Search path not found: ${searchPath || '.'}`, error: 'Error: Path not found' };
    }

    if (options?.requireDirectory) {
        let isDir: boolean;
        try {
            isDir = fs.statSync(resolvedPath).isDirectory();
        } catch (e) {
            return { ok: false, message: `Path is not a directory: ${searchPath || '.'}`, error: `Error: ${(e as Error).message}` };
        }
        if (!isDir) {
            return { ok: false, message: `Path is not a directory: ${searchPath || '.'}`, error: 'Error: Not a directory' };
        }
    }

    // Post-symlink check: catches in-project symlinks pointing outside the root.
    if (searchPath) {
        let realResolvedPath: string;
        try {
            realResolvedPath = fs.realpathSync(resolvedPath);
        } catch {
            return { ok: false, message: `Cannot resolve search path: ${searchPath}`, error: 'Error: Path resolution failed' };
        }
        if (realResolvedPath !== roots.realProjectRoot && !realResolvedPath.startsWith(roots.normalizedRoot)) {
            return { ok: false, message: 'Search path must be within the project root.', error: 'Error: Symlink traversal detected' };
        }
    }

    return { ok: true, resolvedPath };
}

// ============================================================================
// Output path stripping
// ============================================================================

/**
 * Strips the absolute project root prefix from a ripgrep output line so paths
 * are relative to the project root.
 *
 * Handles two forms:
 *  - "/project/pkg/file.bal:42:..."  →  "pkg/file.bal:42:..."
 *  - "/project/file.bal:42:..."      →  "file.bal:42:..."  (root-level file)
 */
export function stripRootPrefix(line: string, rootPrefix: string, tempProjectPath: string): string {
    if (line.startsWith(rootPrefix)) {
        return line.slice(rootPrefix.length);
    }
    // Edge case: rg omits the trailing sep when the searched path is a single
    // root-level file, so the line starts with the bare project path + ':'.
    if (line.startsWith(tempProjectPath + ':')) {
        return line.slice(tempProjectPath.length + 1);
    }
    return line;
}
