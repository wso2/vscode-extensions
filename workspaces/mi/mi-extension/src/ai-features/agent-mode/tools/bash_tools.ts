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
import * as childProcess from 'child_process';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AgentEvent } from '@wso2/mi-core';
import { BashResult, ToolResult, BashExecuteFn, KillTaskExecuteFn, TaskOutputExecuteFn, TaskOutputResult, BASH_TOOL_NAME, KILL_TASK_TOOL_NAME, TASK_OUTPUT_TOOL_NAME, ShellApprovalRuleStore } from './types';
import { logDebug, logError, logInfo } from '../../copilot/logger';
import { getBackgroundSubagents } from './subagent_tool';
import { setJavaHomeInEnvironmentAndPath } from '../../../debugger/debugHelper';
import { PendingPlanApproval } from './plan_mode_tools';
import {
    analyzeShellCommand,
    buildShellCommandDeniedResult,
    buildShellSandboxBlockedResult,
    isAnalysisCoveredByRules,
    normalizePrefixRule,
} from './shell_sandbox';
import { AgentUndoCheckpointManager } from '../undo/checkpoint-manager';
import treeKill = require('tree-kill');

// ============================================================================
// Tool Name Constants (re-exported for convenience)
// ============================================================================

export { BASH_TOOL_NAME, KILL_TASK_TOOL_NAME, TASK_OUTPUT_TOOL_NAME };

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TIMEOUT = 120000; // 2 minutes
const MAX_TIMEOUT = 600000; // 10 minutes
const MAX_SHELL_OUTPUT_CHARS = 512 * 1024; // 512KB
const SHELL_OUTPUT_TRUNCATION_NOTICE = `[Output truncated. Showing last ${Math.round(MAX_SHELL_OUTPUT_CHARS / 1024)}KB.]`;
const BACKGROUND_SHELL_TTL_MS = 60 * 60 * 1000; // 1 hour
const BACKGROUND_SHELL_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BACKGROUND_SHELLS = 50;

// ============================================================================
// Module State - Background Shell Tracking
// ============================================================================

interface BackgroundShell {
    id: string;
    process: childProcess.ChildProcess;
    command: string;
    startTime: Date;
    completedAt?: Date;
    output: string;
    outputTruncated: boolean;
    completed: boolean;
    exitCode: number | null;
    notified: boolean;           // true once completion notification has been injected into a tool result
    sessionId: string;
}

const backgroundShells: Map<string, BackgroundShell> = new Map();
let backgroundShellCleanupTimer: NodeJS.Timeout | null = null;

/**
 * Get all running background shells (for status/listing)
 */
export function getBackgroundShells(): Map<string, BackgroundShell> {
    return backgroundShells;
}

/**
 * Kill and remove all running background shells.
 * Used by RPC-level run cleanup to prevent orphaned shell processes on failed/aborted runs.
 */
export async function cleanupRunningBackgroundShells(): Promise<number> {
    const runningShells = Array.from(backgroundShells.entries()).filter(([, shell]) => !shell.completed);
    if (runningShells.length === 0) {
        return 0;
    }

    await Promise.all(runningShells.map(([id, shell]) => new Promise<void>((resolve) => {
        const pid = shell.process.pid;
        markShellCompleted(shell, -9);
        if (!shell.output) {
            shell.output = `Shell task ${id} was terminated because the main agent run ended.`;
        }
        backgroundShells.delete(id);

        if (!pid) {
            resolve();
            return;
        }

        treeKill(pid, 'SIGKILL', (error) => {
            if (error) {
                logError(`[ShellTool] Failed to kill background shell ${id} during cleanup: ${error.message}`);
            }
            resolve();
        });
    })));

    logInfo(`[ShellTool] Cleaned up ${runningShells.length} running background shell(s) at agent run end`);
    return runningShells.length;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clean up completed background shells older than 1 hour
 */
function cleanupOldShells(): number {
    const threshold = Date.now() - BACKGROUND_SHELL_TTL_MS;
    let removed = 0;
    for (const [id, shell] of backgroundShells.entries()) {
        const completedAt = shell.completedAt?.getTime() ?? shell.startTime.getTime();
        if (shell.completed && completedAt < threshold) {
            backgroundShells.delete(id);
            removed++;
        }
    }
    return removed;
}

function startBackgroundShellCleanup(): void {
    if (backgroundShellCleanupTimer) {
        return;
    }

    backgroundShellCleanupTimer = setInterval(() => {
        const removed = cleanupOldShells();
        if (removed > 0) {
            logDebug(`[ShellTool] Cleanup sweep removed ${removed} stale background shell task(s)`);
        }
    }, BACKGROUND_SHELL_CLEANUP_INTERVAL_MS);
    backgroundShellCleanupTimer.unref?.();
}

function evictOldestCompletedShell(): boolean {
    let oldestId: string | null = null;
    let oldestTimestamp = Number.POSITIVE_INFINITY;

    for (const [id, shell] of backgroundShells.entries()) {
        if (!shell.completed) {
            continue;
        }

        const completedAt = shell.completedAt?.getTime() ?? shell.startTime.getTime();
        if (completedAt < oldestTimestamp) {
            oldestTimestamp = completedAt;
            oldestId = id;
        }
    }

    if (!oldestId) {
        return false;
    }

    backgroundShells.delete(oldestId);
    return true;
}

function ensureBackgroundShellCapacity(): { ok: true } | { ok: false; reason: string } {
    if (backgroundShells.size < MAX_BACKGROUND_SHELLS) {
        return { ok: true };
    }

    const cleaned = cleanupOldShells();
    if (cleaned > 0 && backgroundShells.size < MAX_BACKGROUND_SHELLS) {
        return { ok: true };
    }

    if (evictOldestCompletedShell()) {
        return { ok: true };
    }

    return {
        ok: false,
        reason: `Background shell limit reached (${MAX_BACKGROUND_SHELLS}). Wait for an existing task to complete or terminate one before starting a new task.`,
    };
}

/**
 * Escape a string for safe inclusion inside an internal tag boundary (e.g. <system-reminder>).
 * Prevents crafted task text from breaking the tag structure.
 */
function escapeForInternalTag(value: string): string {
    return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Drain completion notifications for background tasks (shells + subagents)
 * that belong to the given session.
 * Returns a system-reminder string for any tasks that completed since last drain, or empty string.
 * Marks drained tasks as notified so they are only reported once.
 */
export function drainBackgroundTaskNotifications(sessionId: string): string {
    const notifications: string[] = [];

    // Check background shells owned by this session
    for (const [, shell] of backgroundShells) {
        if (shell.sessionId !== sessionId) {
            continue;
        }
        if (shell.completed && !shell.notified) {
            shell.notified = true;
            const status = shell.exitCode === 0 ? 'completed successfully' : `completed with exit code ${shell.exitCode}`;
            const safeCommand = escapeForInternalTag(shell.command);
            notifications.push(`Background shell "${safeCommand}" (${shell.id}) ${status}. Use task_output to retrieve the result.`);
        }
    }

    // Check background subagents owned by this session
    for (const [, subagent] of getBackgroundSubagents()) {
        if (subagent.sessionId !== sessionId) {
            continue;
        }
        if (subagent.completed && !subagent.notified) {
            subagent.notified = true;
            const status = subagent.success ? 'completed successfully' : (subagent.aborted ? 'was aborted' : 'failed');
            const safeDescription = escapeForInternalTag(subagent.description);
            notifications.push(`Background ${subagent.subagentType} subagent "${safeDescription}" (${subagent.id}) ${status}. Use task_output to retrieve the result.`);
        }
    }

    if (notifications.length === 0) {
        return '';
    }

    return `\n\n<system-reminder>\n${notifications.join('\n')}\n</system-reminder>`;
}

function generateShellTaskId(): string {
    return `task-shell-${uuidv4().split('-')[0]}`;
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

async function captureShellMutationCheckpointCandidates(
    projectPath: string,
    analysis: ReturnType<typeof analyzeShellCommand>,
    undoCheckpointManager?: AgentUndoCheckpointManager
): Promise<void> {
    if (!undoCheckpointManager) {
        return;
    }

    const projectRoot = path.resolve(projectPath);
    const seenRelativePaths = new Set<string>();
    for (const segment of analysis.segments) {
        const resolvedMutationPaths = segment.resolvedMutationPaths ?? [];
        for (const resolvedPath of resolvedMutationPaths) {
            if (!resolvedPath || !isPathWithin(projectRoot, resolvedPath)) {
                continue;
            }

            const relativePath = path.relative(projectRoot, resolvedPath).replace(/\\/g, '/');
            if (
                !relativePath
                || relativePath === '.'
                || relativePath.startsWith('..')
                || path.isAbsolute(relativePath)
                || seenRelativePaths.has(relativePath)
            ) {
                continue;
            }

            seenRelativePaths.add(relativePath);
            await undoCheckpointManager.captureBeforeChange(relativePath);
        }
    }
}

type AgentEventHandler = (event: AgentEvent) => void;

function formatApprovalReasons(reasons: string[]): string {
    if (reasons.length === 0) {
        return '- Shell policy requires explicit user approval for this command.';
    }

    return reasons.map((reason) => `- ${reason}`).join('\n');
}

function summarizeCommandForLog(command: string): string {
    const trimmed = command.trim();
    if (!trimmed) {
        return '<empty>';
    }

    const tokens = trimmed.split(/\s+/);
    const commandName = tokens[0].replace(/^['"`]+|['"`]+$/g, '');
    const argCount = Math.max(tokens.length - 1, 0);
    return `${commandName || '<unknown>'} (args=${argCount})`;
}

function appendBoundedOutput(
    current: string,
    chunk: string,
    alreadyTruncated: boolean
): { output: string; truncated: boolean } {
    if (!chunk) {
        return { output: current, truncated: alreadyTruncated };
    }

    const combined = current + chunk;
    if (combined.length <= MAX_SHELL_OUTPUT_CHARS) {
        return { output: combined, truncated: alreadyTruncated };
    }

    return {
        output: combined.slice(-MAX_SHELL_OUTPUT_CHARS),
        truncated: true,
    };
}

function appendToShellOutput(shell: BackgroundShell, chunk: string): void {
    const updated = appendBoundedOutput(shell.output, chunk, shell.outputTruncated);
    shell.output = updated.output;
    shell.outputTruncated = updated.truncated;
}

function markShellCompleted(shell: BackgroundShell, exitCode: number | null): void {
    shell.completed = true;
    shell.exitCode = exitCode;
    shell.completedAt = new Date();
}

function withTruncationNotice(output: string, truncated: boolean): string {
    return truncated ? `${SHELL_OUTPUT_TRUNCATION_NOTICE}\n${output}` : output;
}

function getBackgroundShellOutput(shell: BackgroundShell): string {
    return withTruncationNotice(shell.output, shell.outputTruncated);
}

function buildShellApprovalContent(command: string, reasons: string[], suggestedPrefixRule: string[]): string {
    const lines: string[] = [
        'Agent wants to run this shell command:',
        `\`${command}\``,
        '',
        'Why approval is required:',
        formatApprovalReasons(reasons),
    ];

    if (suggestedPrefixRule.length > 0) {
        lines.push('', `Suggested session rule prefix: \`${suggestedPrefixRule.join(' ')}\``);
    }

    return lines.join('\n');
}

async function requestShellApproval(
    eventHandler: AgentEventHandler,
    pendingApprovals: Map<string, PendingPlanApproval>,
    request: {
        sessionId: string;
        command: string;
        description?: string;
        reasons: string[];
        suggestedPrefixRule: string[];
    }
): Promise<{ approved: boolean; feedback?: string; rememberForSession?: boolean; suggestedPrefixRule?: string[] }> {
    const approvalId = uuidv4();

    eventHandler({
        type: 'plan_approval_requested',
        approvalId,
        approvalKind: 'shell_command',
        approvalTitle: 'Allow Shell Command?',
        approveLabel: 'Allow',
        rejectLabel: 'Deny',
        allowFeedback: false,
        content: buildShellApprovalContent(request.command, request.reasons, request.suggestedPrefixRule),
        bashCommand: request.command,
        bashDescription: request.description,
        suggestedPrefixRule: request.suggestedPrefixRule,
    });

    return new Promise((resolve, reject) => {
        pendingApprovals.set(approvalId, {
            approvalId,
            approvalKind: 'shell_command',
            sessionId: request.sessionId,
            resolve: (result) => {
                pendingApprovals.delete(approvalId);
                resolve(result);
            },
            reject: (error: Error) => {
                pendingApprovals.delete(approvalId);
                reject(error);
            }
        });
    });
}

// ============================================================================
// Shell Tool
// ============================================================================

/**
 * Creates the execute function for the shell tool
 */
export function createBashExecute(
    projectPath: string,
    eventHandler?: AgentEventHandler,
    pendingApprovals?: Map<string, PendingPlanApproval>,
    shellApprovalRuleStore?: ShellApprovalRuleStore,
    sessionId: string = '',
    mainAbortSignal?: AbortSignal,
    undoCheckpointManager?: AgentUndoCheckpointManager
): BashExecuteFn {
    startBackgroundShellCleanup();

    return async (args: {
        command: string;
        description?: string;
        timeout?: number;
        run_in_background?: boolean;
    }): Promise<BashResult> => {
        const {
            command,
            description,
            timeout = DEFAULT_TIMEOUT,
            run_in_background = false
        } = args;

        const analysis = analyzeShellCommand(command, process.platform, projectPath, run_in_background);
        if (analysis.blocked) {
            return buildShellSandboxBlockedResult(analysis.reasons);
        }

        const sessionRules = shellApprovalRuleStore?.getRules() ?? [];
        const approvalBypassedByRule = analysis.requiresApproval
            && !analysis.isDestructive
            && isAnalysisCoveredByRules(analysis, sessionRules);

        if (analysis.requiresApproval && !approvalBypassedByRule) {
            if (!eventHandler || !pendingApprovals) {
                return {
                    success: false,
                    message: 'Shell command requires user approval, but approval flow is unavailable in this context.',
                    error: 'SHELL_APPROVAL_UNAVAILABLE',
                };
            }

            const approvalResult = await requestShellApproval(eventHandler, pendingApprovals, {
                sessionId,
                command,
                description,
                reasons: analysis.reasons,
                suggestedPrefixRule: analysis.suggestedPrefixRule,
            });

            if (!approvalResult.approved) {
                return buildShellCommandDeniedResult();
            }

            const rememberForSession = approvalResult.rememberForSession === true;
            if (rememberForSession && shellApprovalRuleStore && !analysis.isDestructive) {
                const selectedRule = normalizePrefixRule(
                    (approvalResult.suggestedPrefixRule && approvalResult.suggestedPrefixRule.length > 0)
                        ? approvalResult.suggestedPrefixRule
                        : analysis.suggestedPrefixRule
                );
                if (selectedRule.length > 0) {
                    try {
                        await shellApprovalRuleStore.addRule(selectedRule);
                    } catch (error) {
                        logError('[ShellTool] Failed to persist shell approval rule', error);
                    }
                }
            }
        } else if (approvalBypassedByRule) {
            logInfo(`[ShellTool] Approval bypassed by session rule for command summary: ${summarizeCommandForLog(command)}`);
        }

        try {
            await captureShellMutationCheckpointCandidates(projectPath, analysis, undoCheckpointManager);
        } catch (error) {
            logDebug(`[ShellTool] Failed to capture shell mutation checkpoint candidates: ${error instanceof Error ? error.message : String(error)}`);
        }

        logInfo(`[ShellTool] Executing: ${command}${description ? ` (${description})` : ''}`);

        // Validate timeout
        const effectiveTimeout = Math.min(Math.max(timeout, 1000), MAX_TIMEOUT);

        // Set up environment with JAVA_HOME
        const envVariables = {
            ...process.env,
            ...setJavaHomeInEnvironmentAndPath(projectPath)
        };

        if (run_in_background) {
            const capacityCheck = ensureBackgroundShellCapacity();
            if (!capacityCheck.ok) {
                return {
                    success: false,
                    message: capacityCheck.reason,
                    error: 'TOO_MANY_BACKGROUND_SHELLS',
                };
            }

            // Background execution
            const taskId = generateShellTaskId();

            const isWindows = process.platform === 'win32';
            const proc = childProcess.spawn(
                isWindows ? 'powershell.exe' : 'bash',
                isWindows
                    ? ['-NoProfile', '-NonInteractive', '-Command', command]
                    : ['-c', command],
                {
                cwd: projectPath,
                env: envVariables,
                detached: false
            });

            const shell: BackgroundShell = {
                id: taskId,
                process: proc,
                command,
                startTime: new Date(),
                output: '',
                outputTruncated: false,
                completed: false,
                exitCode: null,
                notified: false,
                sessionId,
            };

            backgroundShells.set(taskId, shell);

            proc.stdout?.on('data', (data) => {
                appendToShellOutput(shell, data.toString());
            });

            proc.stderr?.on('data', (data) => {
                appendToShellOutput(shell, data.toString());
            });

            proc.on('close', (code) => {
                markShellCompleted(shell, code);
                logInfo(`[ShellTool] Background shell ${taskId} completed with code ${code}`);
            });

            proc.on('error', (error) => {
                markShellCompleted(shell, -1);
                appendToShellOutput(shell, `\nError: ${error.message}`);
                logError(`[ShellTool] Background shell ${taskId} error: ${error.message}`);
            });

            // Kill background shell if main agent is aborted
            if (mainAbortSignal && proc.pid) {
                const onMainAbort = () => {
                    if (!shell.completed && proc.pid) {
                        logInfo(`[ShellTool] Main agent aborted, killing background shell: ${taskId}`);
                        treeKill(proc.pid, 'SIGKILL');
                    }
                };
                if (mainAbortSignal.aborted) {
                    onMainAbort();
                } else {
                    mainAbortSignal.addEventListener('abort', onMainAbort, { once: true });
                    // Clean up listener when shell completes naturally
                    proc.on('close', () => mainAbortSignal.removeEventListener('abort', onMainAbort));
                }
            }

            logInfo(`[ShellTool] Started background shell: ${taskId}`);

            return {
                success: true,
                message: `Command started in background with task ID: ${taskId}. Use ${KILL_TASK_TOOL_NAME} tool to terminate if needed and ${TASK_OUTPUT_TOOL_NAME} tool to get output.`,
                taskId
            };
        } else {
            // Foreground execution with timeout
            return new Promise<BashResult>((resolve) => {
                let stdout = '';
                let stderr = '';
                let stdoutTruncated = false;
                let stderrTruncated = false;
                let timedOut = false;

                const isWindows = process.platform === 'win32';
                const proc = childProcess.spawn(
                    isWindows ? 'powershell.exe' : 'bash',
                    isWindows
                        ? ['-NoProfile', '-NonInteractive', '-Command', command]
                        : ['-c', command],
                    {
                    cwd: projectPath,
                    env: envVariables
                });

                const timeoutHandle = setTimeout(() => {
                    timedOut = true;
                    if (proc.pid) {
                        treeKill(proc.pid, 'SIGKILL');
                    }
                }, effectiveTimeout);

                // Kill foreground process if main agent is aborted
                let aborted = false;
                const onMainAbort = () => {
                    if (!aborted && proc.pid) {
                        aborted = true;
                        clearTimeout(timeoutHandle);
                        treeKill(proc.pid, 'SIGKILL');
                    }
                };
                if (mainAbortSignal) {
                    if (mainAbortSignal.aborted) {
                        onMainAbort();
                    } else {
                        mainAbortSignal.addEventListener('abort', onMainAbort, { once: true });
                    }
                }

                proc.stdout?.on('data', (data) => {
                    const updated = appendBoundedOutput(stdout, data.toString(), stdoutTruncated);
                    stdout = updated.output;
                    stdoutTruncated = updated.truncated;
                });

                proc.stderr?.on('data', (data) => {
                    const updated = appendBoundedOutput(stderr, data.toString(), stderrTruncated);
                    stderr = updated.output;
                    stderrTruncated = updated.truncated;
                });

                proc.on('close', (code) => {
                    clearTimeout(timeoutHandle);
                    mainAbortSignal?.removeEventListener('abort', onMainAbort);

                    if (aborted) {
                        const formattedStdout = withTruncationNotice(stdout, stdoutTruncated);
                        const formattedStderr = withTruncationNotice(stderr, stderrTruncated);
                        const combinedOutput = formattedStdout + (formattedStderr ? `\n\nSTDERR:\n${formattedStderr}` : '');
                        resolve({
                            success: false,
                            message: `Command was aborted.\n\n**Output before abort:**\n\`\`\`\n${combinedOutput}\n\`\`\``,
                            stdout: formattedStdout,
                            stderr: formattedStderr,
                            exitCode: -1,
                            error: 'Command aborted'
                        });
                        return;
                    }

                    const formattedStdout = withTruncationNotice(stdout, stdoutTruncated);
                    const formattedStderr = withTruncationNotice(stderr, stderrTruncated);
                    const combinedOutput = formattedStdout + (formattedStderr ? `\n\nSTDERR:\n${formattedStderr}` : '');

                    if (timedOut) {
                        resolve({
                            success: false,
                            message: `Command timed out after ${effectiveTimeout / 1000} seconds.\n\n**Output before timeout:**\n\`\`\`\n${combinedOutput}\n\`\`\``,
                            stdout: formattedStdout,
                            stderr: formattedStderr,
                            exitCode: -1,
                            error: 'Command timed out'
                        });
                    } else if (code === 0) {
                        resolve({
                            success: true,
                            message: combinedOutput || 'Command completed successfully with no output.',
                            stdout: formattedStdout,
                            stderr: formattedStderr,
                            exitCode: code
                        });
                    } else {
                        resolve({
                            success: false,
                            message: `Command failed with exit code ${code}.\n\n**Output:**\n\`\`\`\n${combinedOutput}\n\`\`\``,
                            stdout: formattedStdout,
                            stderr: formattedStderr,
                            exitCode: code ?? -1,
                            error: `Exit code: ${code}`
                        });
                    }
                });

                proc.on('error', (error) => {
                    clearTimeout(timeoutHandle);
                    mainAbortSignal?.removeEventListener('abort', onMainAbort);
                    resolve({
                        success: false,
                        message: `Failed to execute command: ${error.message}`,
                        error: error.message,
                        exitCode: -1
                    });
                });
            });
        }
    };
}

/**
 * Input schema for shell tool
 */
const bashInputSchema = z.object({
    command: z.string().describe(
        'The shell command to execute. Use platform-specific syntax based on <env> (Windows: PowerShell, macOS/Linux: bash).'
    ),
    description: z.string().optional().describe(
        'Clear, concise description of what this command does. Keep it brief (5-10 words) for simple commands. Add more context for complex commands.'
    ),
    timeout: z.number().optional().default(DEFAULT_TIMEOUT).describe(
        `Optional timeout in milliseconds (default: ${DEFAULT_TIMEOUT}ms, max: ${MAX_TIMEOUT}ms)`
    ),
    run_in_background: z.boolean().optional().default(false).describe(
        `Set to true to run the command in the background. Returns a task_id that can be checked with ${TASK_OUTPUT_TOOL_NAME} and terminated with ${KILL_TASK_TOOL_NAME}.`
    ),
});

/**
 * Creates the shell tool
 */
export function createBashTool(execute: BashExecuteFn) {
    return (tool as any)({
        description: `Execute shell commands in the MI project directory (JAVA_HOME pre-configured).
            Always provide platform-specific commands according to <env> (Windows: PowerShell syntax, macOS/Linux: bash syntax).
            Use run_in_background=true for long-running commands; this returns a task_id usable with ${TASK_OUTPUT_TOOL_NAME} and ${KILL_TASK_TOOL_NAME}.
            Do NOT use shell for file reading (use file_read), content search (use grep), or file search (use glob).
            No interactive commands (vim, nano, etc.).`,
        inputSchema: bashInputSchema,
        execute
    });
}

// ============================================================================
// Kill Task Tool
// ============================================================================

/**
 * Creates the execute function for the kill_task tool
 */
export function createKillTaskExecute(): KillTaskExecuteFn {
    return async (args: { task_id: string }): Promise<ToolResult> => {
        const taskId = args.task_id;

        logInfo(`[KillTaskTool] Attempting to kill task: ${taskId}`);

        const shell = backgroundShells.get(taskId);
        const subagent = getBackgroundSubagents().get(taskId);

        if (shell) {
            if (shell.completed) {
                shell.notified = true;
                const output = getBackgroundShellOutput(shell);
                backgroundShells.delete(taskId);
                return {
                    success: true,
                    message: `Shell ${taskId} had already completed with exit code ${shell.exitCode}.\n\n**Final output:**\n\`\`\`\n${output}\n\`\`\``
                };
            }

            // Kill the process tree
            return new Promise<ToolResult>((resolve) => {
                if (!shell.process.pid) {
                    resolve({
                        success: false,
                        message: `Shell ${taskId} has no process ID`,
                        error: 'Cannot kill shell without process ID'
                    });
                    return;
                }

                treeKill(shell.process.pid, 'SIGKILL', (err) => {
                    if (err) {
                        logError(`[KillTaskTool] Error killing shell ${taskId}: ${err.message}`);
                        resolve({
                            success: false,
                            message: `Failed to kill shell ${taskId}`,
                            error: err.message
                        });
                    } else {
                        markShellCompleted(shell, -9);
                        const output = getBackgroundShellOutput(shell);
                        backgroundShells.delete(taskId);
                        logInfo(`[KillTaskTool] Successfully killed shell ${taskId}`);
                        resolve({
                            success: true,
                            message: `Successfully killed shell ${taskId}.\n\n**Output before kill:**\n\`\`\`\n${output}\n\`\`\``
                        });
                    }
                });
            });
        }

        if (!subagent) {
            return {
                success: false,
                message: `Task not found: ${taskId}`,
                error: 'No background shell or subagent with that ID exists. It may have already completed or been killed.'
            };
        }

        if (subagent.completed) {
            subagent.notified = true;
            const output = subagent.output;
            getBackgroundSubagents().delete(taskId);
            return {
                success: true,
                message: `Subagent ${taskId} had already completed.\n\n**Final output:**\n\`\`\`\n${output}\n\`\`\``
            };
        }

        subagent.aborted = true;
        subagent.abortController.abort();
        subagent.completed = true;
        subagent.success = false;
        subagent.completedAt = new Date();
        if (!subagent.output) {
            subagent.output = `Subagent ${taskId} was terminated by user request.`;
        }
        const output = subagent.output;
        getBackgroundSubagents().delete(taskId);
        logInfo(`[KillTaskTool] Successfully terminated subagent ${taskId}`);
        return {
            success: true,
            message: `Successfully terminated subagent ${taskId}.\n\n**Output before termination:**\n\`\`\`\n${output}\n\`\`\``
        };
    };
}

/**
 * Input schema for kill_task tool
 */
const killTaskInputSchema = z.object({
    task_id: z.string().describe('The ID of the background task to terminate (shell or subagent).'),
});

/**
 * Creates the kill_task tool
 */
export function createKillTaskTool(execute: KillTaskExecuteFn) {
    return (tool as any)({
        description: `Terminate a background task by ID. Supports both shell IDs and subagent IDs. Returns any output produced before termination.`,
        inputSchema: killTaskInputSchema,
        execute
    });
}

// ============================================================================
// Task Output Tool
// ============================================================================

const DEFAULT_BLOCK_TIMEOUT = 30000; // 30 seconds
const MAX_BLOCK_TIMEOUT = 600000; // 10 minutes

/**
 * Creates the execute function for the task_output tool
 * Checks both backgroundShells (shell) and backgroundSubagents (task tool) maps
 */
export function createTaskOutputExecute(): TaskOutputExecuteFn {
    return async (args: {
        task_id: string;
        block?: boolean;
        timeout?: number;
    }): Promise<TaskOutputResult> => {
        const { task_id, block = true, timeout = DEFAULT_BLOCK_TIMEOUT } = args;

        logInfo(`[TaskOutputTool] Getting output for task: ${task_id}, block: ${block}`);

        const shell = backgroundShells.get(task_id);
        const subagent = getBackgroundSubagents().get(task_id);

        if (!shell && !subagent) {
            return {
                success: false,
                message: `Task not found: ${task_id}`,
                error: 'No background task with that ID exists. It may have already been cleaned up.',
                completed: true
            };
        }

        // Use a unified view: either shell or subagent
        const task = shell
            ? { output: getBackgroundShellOutput(shell), completed: shell.completed, exitCode: shell.exitCode, type: 'shell' as const }
            : { output: subagent!.output, completed: subagent!.completed, exitCode: subagent!.success === true ? 0 : subagent!.success === false ? 1 : null, type: 'subagent' as const };

        // Mark as notified so drainBackgroundTaskNotifications() won't duplicate this
        const markNotified = () => {
            if (shell) { shell.notified = true; }
            if (subagent) { subagent.notified = true; }
        };

        // If not blocking, return current state immediately
        if (!block) {
            if (task.completed) { markNotified(); }
            const output = task.output;
            return {
                success: true,
                message: task.completed
                    ? `Task ${task_id} completed.\n\n**Output:**\n\`\`\`\n${output}\n\`\`\``
                    : `Task ${task_id} is still running.\n\n**Output so far:**\n\`\`\`\n${output}\n\`\`\``,
                output: output,
                completed: task.completed,
                exitCode: task.exitCode,
                running: !task.completed
            };
        }

        // If already completed, return immediately
        if (task.completed) {
            markNotified();
            const output = task.output;
            return {
                success: task.exitCode === 0,
                message: `Task ${task_id} completed.\n\n**Output:**\n\`\`\`\n${output}\n\`\`\``,
                output: output,
                completed: true,
                exitCode: task.exitCode,
                running: false
            };
        }

        // Block and wait for completion with timeout
        const effectiveTimeout = Math.min(Math.max(timeout, 1000), MAX_BLOCK_TIMEOUT);

        return new Promise<TaskOutputResult>((resolve) => {
            const startTime = Date.now();

            const checkInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;

                // Re-read current state (mutable references)
                const currentCompleted = shell ? shell.completed : subagent!.completed;
                const currentOutput = shell ? getBackgroundShellOutput(shell) : subagent!.output;
                const currentExitCode = shell
                    ? shell.exitCode
                    : (subagent!.success === true ? 0 : subagent!.success === false ? 1 : null);

                if (currentCompleted) {
                    clearInterval(checkInterval);
                    markNotified();
                    const output = currentOutput;
                    resolve({
                        success: currentExitCode === 0,
                        message: `Task ${task_id} completed.\n\n**Output:**\n\`\`\`\n${output}\n\`\`\``,
                        output: output,
                        completed: true,
                        exitCode: currentExitCode,
                        running: false
                    });
                } else if (elapsed >= effectiveTimeout) {
                    clearInterval(checkInterval);
                    const output = currentOutput;
                    resolve({
                        success: true,
                        message: `Task ${task_id} is still running after ${effectiveTimeout / 1000}s wait.\n\n**Output so far:**\n\`\`\`\n${output}\n\`\`\`\n\nUse task_output again to check later, or ${KILL_TASK_TOOL_NAME} to terminate.`,
                        output: output,
                        completed: false,
                        exitCode: null,
                        running: true
                    });
                }
            }, 500); // Check every 500ms
        });
    };
}

/**
 * Input schema for task_output tool
 */
const taskOutputInputSchema = z.object({
    task_id: z.string().describe('The ID of the background task (from shell tool or subagent tool with run_in_background=true)'),
    block: z.boolean().optional().default(true).describe(
        'Whether to wait for task completion. Default is true. Set to false to check current status immediately.'
    ),
    timeout: z.number().optional().default(DEFAULT_BLOCK_TIMEOUT).describe(
        `Max wait time in milliseconds when block=true (default: ${DEFAULT_BLOCK_TIMEOUT}ms, max: ${MAX_BLOCK_TIMEOUT}ms)`
    ),
});

/**
 * Creates the task_output tool
 */
export function createTaskOutputTool(execute: TaskOutputExecuteFn) {
    return (tool as any)({
        description: `Retrieve output from a background shell command or subagent by task_id.
            Use block=true (default) to wait for completion, block=false for immediate status check.
            Works with task IDs returned from shell and subagent background execution.`,
        inputSchema: taskOutputInputSchema,
        execute
    });
}
