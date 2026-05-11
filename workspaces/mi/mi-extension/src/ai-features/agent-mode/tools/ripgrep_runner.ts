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

import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { logInfo, logWarn } from '../../copilot/logger';

/**
 * Thrown when no usable ripgrep binary can be located on the system.
 * Callers should catch this and surface a user-facing error rather than crash.
 */
export class RipgrepUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RipgrepUnavailableError';
    }
}

const RG_EXECUTABLE = process.platform === 'win32' ? 'rg.exe' : 'rg';

/**
 * Candidate suffixes (relative to vscode.env.appRoot) where VS Code may ship
 * the bundled ripgrep binary. The exact path depends on the VS Code version
 * and whether the install is asar-packed:
 *   - Modern VS Code (1.85+): node_modules/@vscode/ripgrep/bin/rg
 *   - Older VS Code with asar packing: node_modules.asar.unpacked/@vscode/ripgrep/bin/rg
 *   - Legacy (pre-2021) versions used the unscoped vscode-ripgrep package.
 */
const RG_APP_ROOT_CANDIDATES = [
    ['node_modules', '@vscode', 'ripgrep', 'bin', RG_EXECUTABLE],
    ['node_modules.asar.unpacked', '@vscode', 'ripgrep', 'bin', RG_EXECUTABLE],
    ['node_modules', 'vscode-ripgrep', 'bin', RG_EXECUTABLE],
    ['node_modules.asar.unpacked', 'vscode-ripgrep', 'bin', RG_EXECUTABLE],
];

let cachedRgPath: string | undefined;

/**
 * Directories that should never be searched. Shared by grep + glob callers.
 * target/ and build/ are intentionally NOT excluded — deployed synapse-config
 * under target/<artifact>/synapse-config/ is useful for runtime debugging, and
 * binary artifacts (.car, .class, .jar) are auto-skipped by ripgrep.
 */
export const RG_EXCLUDED_DIRS = ['node_modules', '.git', '.devtools'] as const;

/**
 * Glob patterns (ripgrep negated globs) that exclude sensitive credential
 * files and directories from grep/glob results. Mirrors the shell sandbox's
 * denylist (SENSITIVE_PATH_SEGMENTS + SENSITIVE_FILE_BASENAMES in
 * shell_sandbox.ts) so the agent can't exfiltrate SSH keys, cloud credentials,
 * or shell rc files via a search that happens to cross into the user's home dir.
 * Keep this list in sync with shell_sandbox.ts.
 */
export const RG_EXCLUDED_SENSITIVE_GLOBS = [
    '.ssh',
    '.aws',
    '.azure',
    '.gnupg',
    '.kube',
    '.npm',
    '.env',
    '.env.*',
    '.bashrc',
    '.bash_profile',
    '.zshrc',
    '.zprofile',
    '.zsh_history',
    '.profile',
    '.netrc',
    '.npmrc',
    '.pypirc',
    '.git-credentials',
    'authorized_keys',
    'credentials',
    'known_hosts',
    'id_rsa',
    'id_dsa',
    'id_ecdsa',
    'id_ed25519',
] as const;

/**
 * Resolves the path to a usable ripgrep binary. Resolution order:
 *   1. VS Code's bundled rg (the binary that powers the built-in search feature).
 *   2. MI_RG_PATH env var (developer override).
 *   3. 'rg' on PATH (last-resort fallback for non-VS-Code hosts e.g. node test scripts).
 *
 * Result is cached after the first call. The cache is cleared when runRipgrep
 * encounters ENOENT, allowing recovery if the binary appears on disk later.
 */
function resolveRgBinary(): string {
    if (cachedRgPath !== undefined) {
        return cachedRgPath;
    }

    // 1. VS Code bundled rg
    const appRoot = vscode.env.appRoot;
    if (appRoot) {
        for (const segments of RG_APP_ROOT_CANDIDATES) {
            const candidate = path.join(appRoot, ...segments);
            if (fileExists(candidate)) {
                cachedRgPath = candidate;
                logInfo(`[ripgrep_runner] Using VS Code bundled rg at ${candidate}`);
                return candidate;
            }
        }
    }

    // 2. MI_RG_PATH env var override
    const envOverride = process.env.MI_RG_PATH;
    if (envOverride && fileExists(envOverride)) {
        cachedRgPath = envOverride;
        logInfo(`[ripgrep_runner] Using rg from MI_RG_PATH at ${envOverride}`);
        return envOverride;
    }

    // 3. PATH fallback — let spawn() resolve via $PATH. We can't fs.existsSync this
    //    because it's not a real file path, so we trust spawn to surface ENOENT later.
    cachedRgPath = RG_EXECUTABLE;
    logWarn(`[ripgrep_runner] VS Code bundled rg not found; falling back to '${RG_EXECUTABLE}' on PATH.`);
    return RG_EXECUTABLE;
}

function fileExists(p: string): boolean {
    try {
        return fs.existsSync(p);
    } catch {
        return false;
    }
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_STDOUT_BYTES = 16 * 1024 * 1024; // 16 MB cap for --json output on huge searches
const MAX_STDERR_BYTES = 256 * 1024;

export interface RgRunResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    truncated: boolean;
}

/**
 * Spawns ripgrep with the given args and returns its captured output.
 *
 * - Uses child_process.spawn directly (matches the bash_tools.ts pattern).
 * - Bounds stdout at MAX_STDOUT_BYTES; further output is dropped and `truncated` is set.
 * - Aborts after timeoutMs (default 30s) and sets `timedOut`.
 * - Throws RipgrepUnavailableError if the binary cannot be spawned (ENOENT).
 *
 * The caller is responsible for inspecting `exitCode` to distinguish:
 *   0  -> matches found
 *   1  -> no matches (NOT an error for ripgrep)
 *   2+ -> real error; consult `stderr`
 */
export async function runRipgrep(
    args: string[],
    cwd: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<RgRunResult> {
    const rgPath = resolveRgBinary();

    return new Promise<RgRunResult>((resolve, reject) => {
        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let truncated = false;
        let timedOut = false;
        let settled = false;

        let proc: childProcess.ChildProcessWithoutNullStreams;
        try {
            proc = childProcess.spawn(rgPath, args, {
                cwd,
                env: process.env,
                windowsHide: true,
            });
        } catch (err) {
            // Synchronous spawn failure — rare, only fires on truly invalid argv
            // (non-string args). ENOENT comes through the 'error' event below.
            cachedRgPath = undefined;
            reject(new RipgrepUnavailableError(
                `Failed to spawn ripgrep at ${rgPath}: ${err instanceof Error ? err.message : String(err)}`
            ));
            return;
        }

        const timer = setTimeout(() => {
            timedOut = true;
            try { proc.kill('SIGKILL'); } catch { /* noop */ }
        }, timeoutMs);

        proc.stdout.on('data', (chunk: Buffer) => {
            if (stdoutBytes + chunk.length > MAX_STDOUT_BYTES) {
                const remaining = MAX_STDOUT_BYTES - stdoutBytes;
                if (remaining > 0) {
                    stdoutChunks.push(chunk.subarray(0, remaining));
                    stdoutBytes += remaining;
                }
                truncated = true;
                // Stop reading further stdout and kill the process to avoid wasted work
                try { proc.kill('SIGTERM'); } catch { /* noop */ }
                return;
            }
            stdoutChunks.push(chunk);
            stdoutBytes += chunk.length;
        });

        proc.stderr.on('data', (chunk: Buffer) => {
            if (stderrBytes >= MAX_STDERR_BYTES) {
                return;
            }
            const remaining = MAX_STDERR_BYTES - stderrBytes;
            if (chunk.length > remaining) {
                stderrChunks.push(chunk.subarray(0, remaining));
                stderrBytes = MAX_STDERR_BYTES;
            } else {
                stderrChunks.push(chunk);
                stderrBytes += chunk.length;
            }
        });

        proc.on('error', (err: NodeJS.ErrnoException) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (err.code === 'ENOENT') {
                // Invalidate cache so a future call can re-resolve (e.g. after PATH change)
                cachedRgPath = undefined;
                reject(new RipgrepUnavailableError(
                    `ripgrep binary not found (tried ${rgPath}). ${err.message}`
                ));
                return;
            }
            reject(err);
        });

        proc.on('close', (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve({
                stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
                stderr: Buffer.concat(stderrChunks).toString('utf-8'),
                exitCode: code,
                timedOut,
                truncated,
            });
        });
    });
}

/**
 * Result of a guarded ripgrep run. Either `result` is a successful RgRunResult
 * (rg ran, exit code 0 or 1) or `failure` is a ready-to-return tool result
 * describing the error (binary missing, timeout, or rg exit >= 2).
 */
export type GuardedRgResult =
    | { result: RgRunResult; failure?: undefined }
    | { result?: undefined; failure: { success: false; message: string; error: string } };

/**
 * Spawns ripgrep and folds the standard binary-missing / timeout / bad-exit-code
 * checks into one ToolResult-shaped failure. Callers only need to handle the
 * happy path (`result`) plus their own output parsing.
 *
 * Identifying which tool ran lets log lines stay attributable.
 */
export async function runRipgrepGuarded(
    args: string[],
    cwd: string,
    toolTag: string
): Promise<GuardedRgResult> {
    let rgResult: RgRunResult;
    try {
        rgResult = await runRipgrep(args, cwd);
    } catch (err) {
        if (err instanceof RipgrepUnavailableError) {
            logWarn(`[${toolTag}] ripgrep binary unavailable: ${err.message}`);
            return {
                failure: {
                    success: false,
                    message: 'Search tool unavailable: ripgrep binary not found.',
                    error: 'Error: ripgrep unavailable',
                },
            };
        }
        logWarn(`[${toolTag}] Unexpected error spawning ripgrep: ${err instanceof Error ? err.message : String(err)}`);
        return {
            failure: {
                success: false,
                message: `Error searching: ${err instanceof Error ? err.message : String(err)}`,
                error: 'Error: Search failed',
            },
        };
    }

    if (rgResult.timedOut) {
        return {
            failure: {
                success: false,
                message: `Search timed out after ${DEFAULT_TIMEOUT_MS / 1000}s.`,
                error: 'Error: Search timed out',
            },
        };
    }
    // Truncation short-circuits the process (we SIGTERM rg once MAX_STDOUT_BYTES
    // is hit), which leaves exitCode=null. That is NOT an error — the captured
    // stdout up to the cap is valid partial output; treat it as a success.
    if (rgResult.truncated) {
        return { result: rgResult };
    }
    // rg exit codes: 0 = matches, 1 = no matches (NOT an error), 2+ = real failure.
    if (rgResult.exitCode !== 0 && rgResult.exitCode !== 1) {
        const stderrSnippet = rgResult.stderr.trim().slice(0, 500);
        return {
            failure: {
                success: false,
                message: stderrSnippet
                    ? `Search failed: ${stderrSnippet}`
                    : `Search failed (rg exit code ${rgResult.exitCode}).`,
                error: 'Error: Search failed',
            },
        };
    }

    return { result: rgResult };
}

/**
 * One entry produced by parsing `rg --json` output. `kind` distinguishes
 * actual matches from surrounding context lines emitted when -A/-B/-C flags
 * are passed. Caller is expected to render them differently (e.g. `:` separator
 * for matches and `-` separator for context, matching grep convention).
 */
export interface RgJsonMatch {
    file: string;
    line: number;
    content: string;
    kind: 'match' | 'context';
}

/**
 * Parses `rg --json` line-delimited output into match + context records.
 *
 * Each non-empty line is one event:
 *   {"type":"begin","data":{"path":{"text":"..."}}}
 *   {"type":"context","data":{"path":{...},"line_number":N,"lines":{"text":"..."}}}
 *   {"type":"match","data":{"path":{...},"line_number":N,"lines":{"text":"..."}}}
 *   {"type":"end","data":{...}}
 *   {"type":"summary","data":{...}}
 *
 * Only `match` and `context` events become records. Per-line JSON parse errors
 * are skipped silently — rg's --json stream should be clean, but we are defensive
 * against unexpected warnings.
 */
export function parseRgJsonMatches(stdout: string): RgJsonMatch[] {
    const out: RgJsonMatch[] = [];
    if (!stdout) return out;

    for (const line of stdout.split('\n')) {
        if (!line) continue;
        let parsed: any;
        try {
            parsed = JSON.parse(line);
        } catch {
            continue;
        }
        if (!parsed || !parsed.data) continue;
        const kind: 'match' | 'context' | null =
            parsed.type === 'match' ? 'match' :
            parsed.type === 'context' ? 'context' : null;
        if (!kind) continue;

        const file: string | undefined = parsed.data?.path?.text;
        const lineNumber: number | undefined = parsed.data?.line_number;
        const content: string | undefined = parsed.data?.lines?.text;

        if (typeof file !== 'string' || typeof lineNumber !== 'number' || typeof content !== 'string') {
            continue;
        }

        // rg appends a trailing newline to `lines.text`; strip before downstream trim.
        const cleaned = content.endsWith('\n') ? content.slice(0, -1) : content;
        out.push({ file, line: lineNumber, content: cleaned, kind });
    }
    return out;
}

/**
 * Parses plain `rg -l` (files-with-matches) or `rg --files` output into a list
 * of file paths. Splits on newline and filters empty entries.
 */
export function parseRgFiles(stdout: string): string[] {
    if (!stdout) return [];
    const out: string[] = [];
    for (const line of stdout.split('\n')) {
        const trimmed = line.trim();
        if (trimmed) out.push(trimmed);
    }
    return out;
}

/**
 * Parses `rg -c` (count mode) output into per-file match counts. Each non-empty
 * line has shape `<file-path>:<count>`. The path can itself contain colons on
 * Windows, so we split on the LAST colon, not the first.
 */
export function parseRgCountOutput(stdout: string): Array<{ file: string; count: number }> {
    if (!stdout) return [];
    const out: Array<{ file: string; count: number }> = [];
    for (const line of stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const lastColon = trimmed.lastIndexOf(':');
        if (lastColon < 0) continue;
        const file = trimmed.slice(0, lastColon);
        const countStr = trimmed.slice(lastColon + 1);
        const count = Number.parseInt(countStr, 10);
        if (!file || !Number.isFinite(count)) continue;
        out.push({ file, count });
    }
    return out;
}

/**
 * Validates a user-supplied --type value for argv safety. Format-only check —
 * unknown type names are passed through to rg, which rejects them with its own
 * error message ("unrecognized type ..."). Run `rg --type-list` to see what rg
 * supports natively.
 */
export function validateRgTypeName(userType: string): { value: string } | { error: string } {
    const normalized = userType.trim().toLowerCase();
    if (!normalized) {
        return { value: '' };
    }
    if (normalized.length > 32 || !/^[a-z0-9_+-]+$/.test(normalized)) {
        return { error: 'Invalid file type filter. Use an alphanumeric rg type (run `rg --type-list` for the full list).' };
    }
    return { value: normalized };
}
