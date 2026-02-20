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
import { BashResult, ToolResult, BashExecuteFn, KillTaskExecuteFn, TaskOutputExecuteFn, TaskOutputResult, BASH_TOOL_NAME, KILL_TASK_TOOL_NAME, TASK_OUTPUT_TOOL_NAME } from './types';
import { logDebug, logError, logInfo } from '../../copilot/logger';
import { getBackgroundSubagents } from './subagent_tool';
import { setJavaHomeInEnvironmentAndPath } from '../../../debugger/debugHelper';
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

// ============================================================================
// Module State - Background Shell Tracking
// ============================================================================

interface BackgroundShell {
    id: string;
    process: childProcess.ChildProcess;
    command: string;
    startTime: Date;
    output: string;
    completed: boolean;
    exitCode: number | null;
}

const backgroundShells: Map<string, BackgroundShell> = new Map();

/**
 * Get all running background shells (for status/listing)
 */
export function getBackgroundShells(): Map<string, BackgroundShell> {
    return backgroundShells;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clean up completed background shells older than 1 hour
 */
function cleanupOldShells(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, shell] of backgroundShells.entries()) {
        if (shell.completed && shell.startTime < oneHourAgo) {
            backgroundShells.delete(id);
        }
    }
}

function generateShellTaskId(): string {
    return `task-shell-${uuidv4().split('-')[0]}`;
}

// ============================================================================
// Shell Tool
// ============================================================================

/**
 * Creates the execute function for the shell tool
 */
export function createBashExecute(projectPath: string): BashExecuteFn {
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

        logInfo(`[ShellTool] Executing: ${command}${description ? ` (${description})` : ''}`);

        // Validate timeout
        const effectiveTimeout = Math.min(Math.max(timeout, 1000), MAX_TIMEOUT);

        // Set up environment with JAVA_HOME
        const envVariables = {
            ...process.env,
            ...setJavaHomeInEnvironmentAndPath(projectPath)
        };

        // Clean up old shells periodically
        cleanupOldShells();

        if (run_in_background) {
            // Background execution
            const taskId = generateShellTaskId();

            const isWindows = process.platform === 'win32';
            const proc = childProcess.spawn(
                isWindows ? 'powershell.exe' : 'bash',
                isWindows
                    ? ['-NoProfile', '-NonInteractive', '-Command', command]
                    : ['-lc', command],
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
                completed: false,
                exitCode: null
            };

            backgroundShells.set(taskId, shell);

            proc.stdout?.on('data', (data) => {
                shell.output += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                shell.output += data.toString();
            });

            proc.on('close', (code) => {
                shell.completed = true;
                shell.exitCode = code;
                logInfo(`[ShellTool] Background shell ${taskId} completed with code ${code}`);
            });

            proc.on('error', (error) => {
                shell.completed = true;
                shell.exitCode = -1;
                shell.output += `\nError: ${error.message}`;
                logError(`[ShellTool] Background shell ${taskId} error: ${error.message}`);
            });

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
                let timedOut = false;

                const isWindows = process.platform === 'win32';
                const proc = childProcess.spawn(
                    isWindows ? 'powershell.exe' : 'bash',
                    isWindows
                        ? ['-NoProfile', '-NonInteractive', '-Command', command]
                        : ['-lc', command],
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

                proc.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });

                proc.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    clearTimeout(timeoutHandle);

                    const combinedOutput = stdout + (stderr ? `\n\nSTDERR:\n${stderr}` : '');

                    if (timedOut) {
                        resolve({
                            success: false,
                            message: `Command timed out after ${effectiveTimeout / 1000} seconds.\n\n**Output before timeout:**\n\`\`\`\n${combinedOutput}\n\`\`\``,
                            stdout: stdout,
                            stderr: stderr,
                            exitCode: -1,
                            error: 'Command timed out'
                        });
                    } else if (code === 0) {
                        resolve({
                            success: true,
                            message: combinedOutput || 'Command completed successfully with no output.',
                            stdout: stdout,
                            stderr: stderr,
                            exitCode: code
                        });
                    } else {
                        resolve({
                            success: false,
                            message: `Command failed with exit code ${code}.\n\n**Output:**\n\`\`\`\n${combinedOutput}\n\`\`\``,
                            stdout: stdout,
                            stderr: stderr,
                            exitCode: code ?? -1,
                            error: `Exit code: ${code}`
                        });
                    }
                });

                proc.on('error', (error) => {
                    clearTimeout(timeoutHandle);
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
        'Set to true to run the command in the background. Returns a task_id that can be used with kill_task tool.'
    ),
});

/**
 * Creates the shell tool
 */
export function createBashTool(execute: BashExecuteFn) {
    return (tool as any)({
        description: `Execute shell commands in the MI project directory (JAVA_HOME pre-configured).
            Always provide platform-specific commands according to <env> (Windows: PowerShell syntax, macOS/Linux: bash syntax).
            Use run_in_background=true for long-running commands; use ${KILL_TASK_TOOL_NAME} to terminate.
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
                const output = shell.output;
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
                        shell.completed = true;
                        shell.exitCode = -9; // SIGKILL
                        const output = shell.output;
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
            ? { output: shell.output, completed: shell.completed, exitCode: shell.exitCode, type: 'shell' as const }
            : { output: subagent!.output, completed: subagent!.completed, exitCode: subagent!.success === true ? 0 : subagent!.success === false ? 1 : null, type: 'subagent' as const };

        // If not blocking, return current state immediately
        if (!block) {
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
                const currentOutput = shell ? shell.output : subagent!.output;
                const currentExitCode = shell
                    ? shell.exitCode
                    : (subagent!.success === true ? 0 : subagent!.success === false ? 1 : null);

                if (currentCompleted) {
                    clearInterval(checkInterval);
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
