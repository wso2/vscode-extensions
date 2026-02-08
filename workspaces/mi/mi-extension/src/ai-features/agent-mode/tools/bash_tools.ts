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
import * as childProcess from 'child_process';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BashResult, ToolResult, BashExecuteFn, KillShellExecuteFn, TaskOutputExecuteFn, TaskOutputResult, BASH_TOOL_NAME, KILL_SHELL_TOOL_NAME, TASK_OUTPUT_TOOL_NAME } from './types';
import { logDebug, logError, logInfo } from '../../copilot/logger';
import { getBackgroundSubagents } from './subagent_tool';
import { setJavaHomeInEnvironmentAndPath } from '../../../debugger/debugHelper';
import treeKill = require('tree-kill');

// ============================================================================
// Tool Name Constants (re-exported for convenience)
// ============================================================================

export { BASH_TOOL_NAME, KILL_SHELL_TOOL_NAME, TASK_OUTPUT_TOOL_NAME };

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

// ============================================================================
// Bash Tool
// ============================================================================

/**
 * Creates the execute function for the bash tool
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

        logInfo(`[BashTool] Executing: ${command}${description ? ` (${description})` : ''}`);

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
            const shellId = uuidv4();

            const proc = childProcess.spawn(command, [], {
                shell: true,
                cwd: projectPath,
                env: envVariables,
                detached: false
            });

            const shell: BackgroundShell = {
                id: shellId,
                process: proc,
                command,
                startTime: new Date(),
                output: '',
                completed: false,
                exitCode: null
            };

            backgroundShells.set(shellId, shell);

            proc.stdout?.on('data', (data) => {
                shell.output += data.toString();
            });

            proc.stderr?.on('data', (data) => {
                shell.output += data.toString();
            });

            proc.on('close', (code) => {
                shell.completed = true;
                shell.exitCode = code;
                logInfo(`[BashTool] Background shell ${shellId} completed with code ${code}`);
            });

            proc.on('error', (error) => {
                shell.completed = true;
                shell.exitCode = -1;
                shell.output += `\nError: ${error.message}`;
                logError(`[BashTool] Background shell ${shellId} error: ${error.message}`);
            });

            logInfo(`[BashTool] Started background shell: ${shellId}`);

            return {
                success: true,
                message: `Command started in background with shell ID: ${shellId}. Use ${KILL_SHELL_TOOL_NAME} tool to terminate if needed. and use ${TASK_OUTPUT_TOOL_NAME} tool to get the output of the command.`,
                shellId
            };
        } else {
            // Foreground execution with timeout
            return new Promise<BashResult>((resolve) => {
                let stdout = '';
                let stderr = '';
                let timedOut = false;

                const proc = childProcess.spawn(command, [], {
                    shell: true,
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
 * Input schema for bash tool
 */
const bashInputSchema = z.object({
    command: z.string().describe('The bash command to execute'),
    description: z.string().optional().describe(
        'Clear, concise description of what this command does. Keep it brief (5-10 words) for simple commands. Add more context for complex commands.'
    ),
    timeout: z.number().optional().default(DEFAULT_TIMEOUT).describe(
        `Optional timeout in milliseconds (default: ${DEFAULT_TIMEOUT}ms, max: ${MAX_TIMEOUT}ms)`
    ),
    run_in_background: z.boolean().optional().default(false).describe(
        'Set to true to run the command in the background. Returns a shell_id that can be used with kill_shell tool.'
    ),
});

/**
 * Creates the bash tool
 */
export function createBashTool(execute: BashExecuteFn) {
    return (tool as any)({
        description: `Execute bash commands in the MI project directory (JAVA_HOME pre-configured).
            Use run_in_background=true for long-running commands; use ${KILL_SHELL_TOOL_NAME} to terminate.
            Do NOT use bash for file reading (use file_read), content search (use grep), or file search (use glob).
            No interactive commands (vim, nano, etc.).`,
        inputSchema: bashInputSchema,
        execute
    });
}

// ============================================================================
// Kill Shell Tool
// ============================================================================

/**
 * Creates the execute function for the kill_shell tool
 */
export function createKillShellExecute(): KillShellExecuteFn {
    return async (args: { shell_id: string }): Promise<ToolResult> => {
        const { shell_id } = args;

        logInfo(`[KillShellTool] Attempting to kill shell: ${shell_id}`);

        const shell = backgroundShells.get(shell_id);

        if (!shell) {
            return {
                success: false,
                message: `Shell not found: ${shell_id}`,
                error: 'No background shell with that ID exists. It may have already completed or been killed.'
            };
        }

        if (shell.completed) {
            const output = shell.output;
            backgroundShells.delete(shell_id);
            return {
                success: true,
                message: `Shell ${shell_id} had already completed with exit code ${shell.exitCode}.\n\n**Final output:**\n\`\`\`\n${output}\n\`\`\``
            };
        }

        // Kill the process tree
        return new Promise<ToolResult>((resolve) => {
            if (!shell.process.pid) {
                resolve({
                    success: false,
                    message: `Shell ${shell_id} has no process ID`,
                    error: 'Cannot kill shell without process ID'
                });
                return;
            }

            treeKill(shell.process.pid, 'SIGKILL', (err) => {
                if (err) {
                    logError(`[KillShellTool] Error killing shell ${shell_id}: ${err.message}`);
                    resolve({
                        success: false,
                        message: `Failed to kill shell ${shell_id}`,
                        error: err.message
                    });
                } else {
                    shell.completed = true;
                    shell.exitCode = -9; // SIGKILL
                    const output = shell.output;
                    backgroundShells.delete(shell_id);
                    logInfo(`[KillShellTool] Successfully killed shell ${shell_id}`);
                    resolve({
                        success: true,
                        message: `Successfully killed shell ${shell_id}.\n\n**Output before kill:**\n\`\`\`\n${output}\n\`\`\``
                    });
                }
            });
        });
    };
}

/**
 * Input schema for kill_shell tool
 */
const killShellInputSchema = z.object({
    shell_id: z.string().describe('The ID of the background shell to kill'),
});

/**
 * Creates the kill_shell tool
 */
export function createKillShellTool(execute: KillShellExecuteFn) {
    return (tool as any)({
        description: `Terminate a background bash command by its shell_id. Returns any output produced before termination.`,
        inputSchema: killShellInputSchema,
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
 * Checks both backgroundShells (bash) and backgroundSubagents (task tool) maps
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
                        message: `Task ${task_id} is still running after ${effectiveTimeout / 1000}s wait.\n\n**Output so far:**\n\`\`\`\n${output}\n\`\`\`\n\nUse task_output again to check later, or kill_shell to terminate.`,
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
    task_id: z.string().describe('The ID of the background task (shell_id from bash or subagentId from task tool with run_in_background=true)'),
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
        description: `Retrieve output from a background bash command or subagent by subagentId.
            Use block=true (default) to wait for completion, block=false for immediate status check.
            Works with both shell_id from bash and subagentId from subagent background execution.`,
        inputSchema: taskOutputInputSchema,
        execute
    });
}
