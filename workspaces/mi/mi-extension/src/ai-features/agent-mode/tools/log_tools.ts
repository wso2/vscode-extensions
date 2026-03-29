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
import { promises as fsp } from 'fs';
import * as path from 'path';
import { ToolResult, READ_SERVER_LOGS_TOOL_NAME } from './types';
import { getServerPathFromConfig } from '../../../util/onboardingUtils';

export { READ_SERVER_LOGS_TOOL_NAME };

// ============================================================================
// Types
// ============================================================================

export type ReadServerLogsExecuteFn = (args: {
    log_file?: 'errors' | 'main' | 'http' | 'service' | 'correlation';
    tail_lines?: number;
    artifact_name?: string;
    grep_pattern?: string;
    parse_mode?: 'summary' | 'raw';
    max_stack_frames?: number;
}) => Promise<ToolResult>;

// ============================================================================
// Constants
// ============================================================================

const LOG_FILES = {
    errors: 'wso2error.log',
    main: 'wso2carbon.log',
    http: 'http_access.log',
    service: 'wso2-mi-service.log',
    correlation: 'correlation.log',
} as const;

const DEFAULT_TAIL_LINES: Record<string, number> = {
    errors: 300,
    main: 500,
    http: 100,
    service: 100,
    correlation: 100,
};

// Log line formats:
// [2025-07-25 17:12:12,585] ERROR {ClassName} - Message
// TID: [2025-07-25 17:12:09,617]  INFO {ClassName} - Message {ClassName}
const LOG_LINE_RE = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})\]\s+(ERROR|WARN|INFO|DEBUG|TRACE)\s+\{([^}]+)\}\s+-\s+(.*)$/;
const TID_LOG_LINE_RE = /^TID:\s+\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})\]\s+(ERROR|WARN|INFO|DEBUG|TRACE)\s+\{([^}]+)\}\s+-\s+(.*)$/;

// Apache-style: - IP - - [timestamp] "METHOD /path HTTP/x" status bytes "ref" "ua"
const HTTP_LINE_RE = /^-\s+(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s[^"]*"\s+(-|\d+)\s/;

// OSGi/JDK stack frame noise — strip these from error output
const NOISE_FRAME_RES = [
    /\borg\.eclipse\b/,
    /\borg\.osgi\b/,
    /\bjdk\.internal\b/,
    /\bjava\.base\//,
    /\bsun\.reflect\b/,
];

// ============================================================================
// Parsing helpers
// ============================================================================

interface ParsedLine {
    timestamp: string;   // full: "2025-07-25 17:12:12,585"
    level: string;
    className: string;
    message: string;
    continuations: string[];  // stack trace / continuation lines
}

interface DeploymentEvent {
    artifact: string;
    artifactType: string;
    success: boolean;
    file?: string;
    failureReason?: string;
}

function isNoiseFrame(line: string): boolean {
    return NOISE_FRAME_RES.some(re => re.test(line));
}

function shortClass(fullClass: string): string {
    const parts = fullClass.split('.');
    return parts[parts.length - 1] || fullClass;
}

function dateOf(ts: string): string {
    // "2025-07-25 17:12:12,585" → "2025-07-25"
    return ts.substring(0, 10);
}

function timeOnly(ts: string): string {
    // "2025-07-25 17:12:12,585" → "17:12:12"
    return ts.substring(11, 19);
}

/** Show date+time if logs span multiple days, otherwise just time. */
function formatTimestamp(ts: string, spansMultipleDays: boolean): string {
    return spansMultipleDays ? `${dateOf(ts)} ${timeOnly(ts)}` : timeOnly(ts);
}

/** Max bytes to read from the end of the file (2 MB). */
const TAIL_BYTE_CAP = 2 * 1024 * 1024;

async function readTail(filePath: string, numLines: number): Promise<string[]> {
    const stat = await fsp.stat(filePath);
    if (stat.size === 0) {
        return [];
    }
    const start = Math.max(0, stat.size - TAIL_BYTE_CAP);

    return new Promise<string[]>((resolve, reject) => {
        const chunks: Buffer[] = [];
        const stream = fs.createReadStream(filePath, { start, end: stat.size - 1 });
        stream.on('data', (chunk: string | Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        stream.on('error', reject);
        stream.on('end', () => {
            let text = Buffer.concat(chunks).toString('utf-8');
            // If we started mid-file, drop the first (likely partial) line
            if (start > 0) {
                const idx = text.indexOf('\n');
                if (idx >= 0) {
                    text = text.slice(idx + 1);
                }
            }
            const lines = text.split('\n');
            resolve(lines.slice(Math.max(0, lines.length - numLines)));
        });
    });
}

function parseStructuredLines(lines: string[]): ParsedLine[] {
    const result: ParsedLine[] = [];
    let current: ParsedLine | null = null;

    for (const line of lines) {
        const m = LOG_LINE_RE.exec(line) ?? TID_LOG_LINE_RE.exec(line);
        if (m) {
            if (current) { result.push(current); }
            current = { timestamp: m[1], level: m[2], className: m[3], message: m[4], continuations: [] };
        } else if (current && line.trim()) {
            current.continuations.push(line);
        }
    }
    if (current) { result.push(current); }
    return result;
}

function extractDeployments(parsed: ParsedLine[]): DeploymentEvent[] {
    const events: DeploymentEvent[] = [];
    for (const p of parsed) {
        // "X named 'Y' has been deployed from file : ..."
        const successNamed = /^(\w[\w\s]*?)\s+named\s+'([^']+)'\s+has been deployed/.exec(p.message);
        if (successNamed) {
            events.push({ artifact: successNamed[2], artifactType: successNamed[1].trim(), success: true });
            continue;
        }
        // "Synapse Library named 'Y' has been deployed ..."
        const successLib = /^Synapse Library named\s+'([^']+)'\s+has been deployed/.exec(p.message);
        if (successLib) {
            events.push({ artifact: successLib[1], artifactType: 'Library', success: true });
            continue;
        }
        // "X Deployment from the file : /path/to/file : Failed"
        const failed = /^(\w[\w\s]*?) Deployment from the file\s*:\s*(\S+)\s*:\s*Failed/.exec(p.message);
        if (failed) {
            const filePart = failed[2];
            events.push({
                artifact: path.basename(filePart, path.extname(filePart)),
                artifactType: failed[1].trim(),
                success: false,
                file: filePart,
                failureReason: innermostCause(p.continuations) ?? undefined,
            });
        }
    }
    return events;
}

function innermostCause(continuations: string[]): string | null {
    let last: string | null = null;
    for (const line of continuations) {
        if (line.trim().startsWith('Caused by:')) {
            last = line.trim().replace(/^Caused by:\s*/, '');
        }
    }
    return last;
}

function topAppFrames(continuations: string[], limit: number): { frames: string[]; totalAppFrames: number } {
    const allAppFrames = continuations
        .filter(l => l.trim().startsWith('at ') && !isNoiseFrame(l));
    return {
        frames: allAppFrames.slice(0, limit).map(l => l.trim()),
        totalAppFrames: allAppFrames.length,
    };
}

const DEFAULT_MAX_STACK_FRAMES = 3;
const MAX_ALLOWED_STACK_FRAMES = 15;

/** Check if a parsed log entry matches a text query (searches message + className + all continuations). */
function entryMatchesText(entry: ParsedLine, text: string): boolean {
    const lower = text.toLowerCase();
    if (entry.message.toLowerCase().includes(lower)) { return true; }
    if (entry.className.toLowerCase().includes(lower)) { return true; }
    return entry.continuations.some(c => c.toLowerCase().includes(lower));
}

/** Check if a parsed log entry matches a regex (searches message + className + all continuations). */
function entryMatchesRegex(entry: ParsedLine, re: RegExp): boolean {
    if (re.test(entry.message)) { return true; }
    if (re.test(entry.className)) { return true; }
    return entry.continuations.some(c => re.test(c));
}

// ============================================================================
// Formatters
// ============================================================================

function formatStructured(
    lines: string[],
    logFileName: string,
    logFile: string,
    tailLines: number,
    stackFrameLimit: number,
    artifactName?: string,
    grepPattern?: string,
): string {
    const isErrorsLog = logFile === 'errors';

    // Parse all lines first, then filter at the entry level (message + class + stack trace)
    let parsed = parseStructuredLines(lines);

    // Filter order: grep_pattern first, then artifact_name scopes further (AND logic)
    if (grepPattern) {
        try {
            const re = new RegExp(grepPattern, 'i');
            parsed = parsed.filter(entry => entryMatchesRegex(entry, re));
        } catch {
            // invalid regex — skip
        }
    }
    if (artifactName) {
        parsed = parsed.filter(entry => entryMatchesText(entry, artifactName));
    }

    if (parsed.length === 0) {
        const hasFilters = !!(artifactName || grepPattern);
        const noMatchMsg = hasFilters
            ? `No log entries matched the filters (artifact_name=${artifactName || 'none'}, grep_pattern=${grepPattern || 'none'}).`
            : 'Log file is empty or contains no parseable entries. Use parse_mode=\'raw\' to see raw content.';
        return `=== MI Log: ${logFileName} (tail ${tailLines}) ===\n${noMatchMsg}`;
    }

    const errors = parsed.filter(p => p.level === 'ERROR');
    const warns  = parsed.filter(p => p.level === 'WARN');
    const deployments = extractDeployments(parsed);

    // #1: Include date when logs span multiple calendar days
    const spansMultipleDays = dateOf(parsed[0].timestamp) !== dateOf(parsed[parsed.length - 1].timestamp);
    const fmtTs = (ts: string) => formatTimestamp(ts, spansMultipleDays);

    const out: string[] = [];
    // #2: Always show (tail N) in header
    out.push(`=== MI Log: ${logFileName} (tail ${tailLines}) ===`);
    out.push(`Time range: ${fmtTs(parsed[0].timestamp)} → ${fmtTs(parsed[parsed.length - 1].timestamp)}`);

    // Deployment summary
    if (deployments.length > 0) {
        out.push('');
        out.push('DEPLOYMENT SUMMARY');
        for (const d of deployments) {
            const icon = d.success ? '✓' : '✗';
            if (d.success) {
                out.push(`${icon} ${d.artifact} (${d.artifactType})`);
            } else {
                const reason = d.failureReason ? ` — ${d.failureReason}` : '';
                out.push(`${icon} ${d.artifact} (${d.artifactType}) — FAILED${reason}`);
            }
        }
    }

    // Errors — deduplicate repeated messages, show count + time range
    if (errors.length > 0) {
        out.push('');
        out.push(`ERRORS (${errors.length})`);

        // Group by message text for deduplication
        const errorGroups: { entry: ParsedLine; count: number; firstTs: string; lastTs: string }[] = [];
        const seenMessages = new Map<string, number>(); // message → index in errorGroups

        for (const e of errors) {
            const existing = seenMessages.get(e.message);
            if (existing !== undefined) {
                errorGroups[existing].count++;
                errorGroups[existing].lastTs = e.timestamp;
            } else {
                seenMessages.set(e.message, errorGroups.length);
                errorGroups.push({ entry: e, count: 1, firstTs: e.timestamp, lastTs: e.timestamp });
            }
        }

        for (const g of errorGroups) {
            const e = g.entry;
            const tsLabel = g.count > 1
                ? `${fmtTs(g.firstTs)}..${fmtTs(g.lastTs)}, ×${g.count}`
                : fmtTs(e.timestamp);
            out.push(`[${tsLabel}] ${shortClass(e.className)}`);
            out.push(`  ${e.message}`);
            const cause = innermostCause(e.continuations);
            if (cause && cause !== e.message) {
                out.push(`  Root cause: ${cause}`);
            }
            const { frames, totalAppFrames } = topAppFrames(e.continuations, stackFrameLimit);
            if (frames.length > 0) {
                out.push(`  Stack:`);
                frames.forEach((f: string) => out.push(`    ${f}`));
                if (totalAppFrames > frames.length) {
                    out.push(`    (${frames.length} of ${totalAppFrames} app frames shown — increase max_stack_frames to see all)`);
                }
            }
            out.push('');
        }
    }

    // #7: Only show warnings section for logs that actually contain them (not errors-only log)
    if (!isErrorsLog && warns.length > 0) {
        out.push(`WARNINGS (${warns.length})`);
        for (const w of warns) {
            out.push(`[${fmtTs(w.timestamp)}] ${shortClass(w.className)}: ${w.message}`);
        }
        out.push('');
    }

    // Stats — omit warnings count for errors-only log
    const okDeps   = deployments.filter(d => d.success).length;
    const failDeps = deployments.filter(d => !d.success).length;
    const depStr   = deployments.length > 0
        ? ` · ${deployments.length} deployments (${okDeps} ok, ${failDeps} failed)`
        : '';
    const warnStr = isErrorsLog ? '' : ` · ${warns.length} warnings`;
    out.push(`STATS: ${errors.length} errors${warnStr}${depStr}`);

    return out.join('\n');
}

function formatHttp(lines: string[], logFileName: string, tailLines: number): string {
    interface Entry { method: string; reqPath: string; status: number; count: number; }
    const groups = new Map<string, Entry>();

    for (const line of lines) {
        const m = HTTP_LINE_RE.exec(line);
        if (!m) { continue; }
        const status = parseInt(m[5], 10);
        if (isNaN(status)) { continue; }
        const key = `${m[3]} ${m[4]} ${status}`;
        const ex = groups.get(key);
        if (ex) { ex.count++; } else { groups.set(key, { method: m[3], reqPath: m[4], status, count: 1 }); }
    }

    if (groups.size === 0) {
        return `=== MI Log: ${logFileName} (tail ${tailLines}) ===\nNo HTTP requests found. HTTP access logging may be disabled — check conf/log4j2.properties for the HTTP access appender.`;
    }

    const entries = [...groups.values()];
    const total   = entries.reduce((s, e) => s + e.count, 0);
    const ok      = entries.filter(e => e.status >= 200 && e.status < 300).reduce((s, e) => s + e.count, 0);
    const err5xx  = entries.filter(e => e.status >= 500).reduce((s, e) => s + e.count, 0);
    const err4xx  = entries.filter(e => e.status >= 400 && e.status < 500).reduce((s, e) => s + e.count, 0);

    const out: string[] = [];
    out.push(`=== MI Log: ${logFileName} (tail ${tailLines}) ===`);
    out.push('');
    out.push('HTTP SUMMARY');
    for (const e of entries) {
        const countStr  = e.count > 1 ? ` ×${e.count}` : '';
        const statusTag = e.status >= 500 ? ' (server error)' : e.status >= 400 ? ' (client error)' : '';
        out.push(`  ${e.method} ${e.reqPath}${countStr} → ${e.status}${statusTag}`);
    }
    out.push('');
    if (err5xx > 0) { out.push(`SERVER ERRORS (5xx): ${err5xx} requests`); }
    if (err4xx > 0) { out.push(`CLIENT ERRORS (4xx): ${err4xx} requests`); }
    out.push(`STATS: ${total} requests · ${ok} success · ${total - ok} errors`);

    return out.join('\n');
}

// ============================================================================
// Execute + Tool factory
// ============================================================================

export function createReadServerLogsExecute(projectPath: string): ReadServerLogsExecuteFn {
    return async (args) => {
        const {
            log_file = 'errors',
            tail_lines,
            artifact_name,
            grep_pattern,
            parse_mode = 'summary',
            max_stack_frames,
        } = args;

        const serverPath = getServerPathFromConfig(projectPath);
        if (!serverPath || !serverPath.trim()) {
            return {
                success: false,
                message: 'MI runtime path is not configured. Set it in VSCode settings under MI.SERVER_PATH.',
                error: 'RUNTIME_NOT_CONFIGURED',
            };
        }

        const logDir = path.join(path.resolve(serverPath.trim()), 'repository', 'logs');
        if (!fs.existsSync(logDir)) {
            return {
                success: false,
                message: `Log directory not found: ${logDir}. Ensure the MI runtime is installed and has been started at least once.`,
                error: 'LOG_DIR_NOT_FOUND',
            };
        }

        const logFileName = LOG_FILES[log_file];
        const logFilePath = path.join(logDir, logFileName);
        if (!fs.existsSync(logFilePath)) {
            return {
                success: false,
                message: `Log file not found: ${logFilePath}. The server may not have generated this log yet.`,
                error: 'LOG_FILE_NOT_FOUND',
            };
        }

        const tailLines = tail_lines ?? DEFAULT_TAIL_LINES[log_file];
        const stackFrameLimit = Math.min(max_stack_frames ?? DEFAULT_MAX_STACK_FRAMES, MAX_ALLOWED_STACK_FRAMES);

        let lines: string[];
        try {
            lines = await readTail(logFilePath, tailLines);
        } catch (err) {
            return {
                success: false,
                message: `Failed to read log file: ${err instanceof Error ? err.message : String(err)}`,
                error: 'LOG_READ_ERROR',
            };
        }

        // #3: Detect empty file before parse_mode branching
        const nonEmptyLines = lines.filter(l => l.trim().length > 0);
        if (nonEmptyLines.length === 0) {
            let hint = `Log file is empty: ${logFileName}`;
            // #5: Correlation log hint
            if (log_file === 'correlation') {
                hint += '\nCorrelation logging may be disabled. Enable it in deployment.toml: [mediation] flow.statistics.capture_all=true';
            }
            return { success: true, message: hint };
        }

        if (parse_mode === 'raw') {
            return { success: true, message: lines.join('\n') };
        }

        const summary = log_file === 'http'
            ? formatHttp(lines, logFileName, tailLines)
            : formatStructured(lines, logFileName, log_file, tailLines, stackFrameLimit, artifact_name, grep_pattern);

        return { success: true, message: summary };
    };
}

const inputSchema = z.object({
    log_file: z.enum(['errors', 'main', 'http', 'service', 'correlation'])
        .default('errors')
        .describe(
            "Which log to read. " +
            "'errors' = wso2error.log — errors + full stack traces, start here (default). " +
            "'main' = wso2carbon.log — all levels, good for deployment timeline. " +
            "'http' = http_access.log — HTTP requests with status codes. " +
            "'service' = wso2-mi-service.log — service lifecycle events. " +
            "'correlation' = correlation.log — per-request tracing."
        ),
    tail_lines: z.number().optional()
        .describe('Lines to read from end of file. Defaults: 500 for main, 300 for errors, 100 for http/service/correlation.'),
    artifact_name: z.string().optional()
        .describe("Full-text filter across log entry (message, class name, and stack trace). Matches artifact names, class names, or any text. Applied after grep_pattern."),
    grep_pattern: z.string().optional()
        .describe('Regex to pre-filter lines before parsing. Applied first, then artifact_name scopes further (AND logic).'),
    parse_mode: z.enum(['summary', 'raw'])
        .default('summary')
        .describe("'summary' = structured parse: grouped errors, deployment events, stats (default). 'raw' = return raw lines."),
    max_stack_frames: z.number().optional()
        .describe('Max application stack frames to show per error in summary mode. Default 3, max 15. Increase when 3 frames are insufficient to identify root cause.'),
});

export function createReadServerLogsTool(execute: ReadServerLogsExecuteFn) {
    return (tool as any)({
        description:
            'Read and analyze MI server log files. Returns structured summaries with grouped errors, ' +
            'deployment events, and stats. Default log_file=\'errors\' (wso2error.log) is the fastest way ' +
            'to diagnose issues — errors only with full stack traces. Use log_file=\'main\' for the full ' +
            'deployment timeline. Use log_file=\'http\' for HTTP request analysis.',
        inputSchema,
        execute,
    });
}
