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
import { getBackgroundSubagents } from './task_tool';
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
const MAX_OUTPUT_LENGTH = 30000; // Characters before truncation

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
 * Truncates output to fit within limits
 * Keeps the end of output (where errors typically appear)
 */
function truncateOutput(output: string, maxLength: number = MAX_OUTPUT_LENGTH): string {
    if (output.length <= maxLength) {
        return output;
    }
    const truncatedNote = '\n... [output truncated] ...\n\n';
    const availableLength = maxLength - truncatedNote.length;
    return truncatedNote + output.slice(-availableLength);
}

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
                    const truncatedOutput = truncateOutput(combinedOutput);

                    if (timedOut) {
                        resolve({
                            success: false,
                            message: `Command timed out after ${effectiveTimeout / 1000} seconds.\n\n**Output before timeout:**\n\`\`\`\n${truncatedOutput}\n\`\`\``,
                            stdout: truncateOutput(stdout),
                            stderr: truncateOutput(stderr),
                            exitCode: -1,
                            error: 'Command timed out'
                        });
                    } else if (code === 0) {
                        resolve({
                            success: true,
                            message: truncatedOutput || 'Command completed successfully with no output.',
                            stdout: truncateOutput(stdout),
                            stderr: truncateOutput(stderr),
                            exitCode: code
                        });
                    } else {
                        resolve({
                            success: false,
                            message: `Command failed with exit code ${code}.\n\n**Output:**\n\`\`\`\n${truncatedOutput}\n\`\`\``,
                            stdout: truncateOutput(stdout),
                            stderr: truncateOutput(stderr),
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
        description: `Execute bash commands in the MI project directory.

**Purpose:**
Run shell commands for tasks like:
- Git operations (status, diff, commit, push)
- Maven commands (mvn clean, mvn test)
- File system operations (mkdir, rm, cp, mv)
- Other CLI tools (curl, docker, etc.)

**Important Notes:**
- Commands run in the project directory with JAVA_HOME configured
- Default timeout is 2 minutes, max is 10 minutes
- Output is truncated if it exceeds 30,000 characters
- Use run_in_background for long-running commands

**Examples:**
- \`git status\` - Show git working tree status
- \`mvn test -Dtest=MyTest\` - Run specific Maven test
- \`curl -s http://localhost:8290/health\` - Check server health
- \`docker ps\` - List running containers

**Background Commands:**
Set run_in_background=true for commands that take a long time.
Use the kill_shell tool with the returned shell_id to terminate if needed.

**Avoid:**
- Using cat/head/tail for file reading (use file_read tool)
- Using grep for content search (use grep tool)
- Using find for file search (use glob tool)
- Interactive commands (vim, nano, etc.)`,
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
            const output = truncateOutput(shell.output);
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
                    const output = truncateOutput(shell.output);
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
        description: `Kill a running background bash shell by its ID.

**Purpose:**
Terminate a long-running background command that was started with the bash tool's run_in_background option.

**When to use:**
- A background command is taking too long
- You need to stop a process that's no longer needed
- A background command is stuck or unresponsive

**Returns:**
- Success status
- Any output the command produced before being killed`,
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
            const output = truncateOutput(task.output);
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
            const output = truncateOutput(task.output);
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
                    const output = truncateOutput(currentOutput);
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
                    const output = truncateOutput(currentOutput);
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
    task_id: z.string().describe('The ID of the background task (shell_id from bash or task_id from task tool with run_in_background=true)'),
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
        description: `Get output from a running or completed background task (bash command or subagent).

**Purpose:**
Check on the status and retrieve output from:
- A background bash command (started with bash tool's run_in_background=true)
- A background subagent (started with task tool's run_in_background=true)

**Parameters:**
- task_id: The shell_id or task_id returned when the background task was started
- block: If true (default), waits for completion up to the timeout
- timeout: Max wait time in milliseconds (default 30s, max 10min)

**When to use:**
- Check if a long-running build has completed
- Retrieve the output of a completed background task or subagent
- Monitor progress of a background operation

**Returns:**
- Current output (truncated if very long)
- Completion status
- Exit code (if completed)

**Example usage:**
1. Start background bash: bash(command="mvn test", run_in_background=true) → returns shell_id
2. Start background subagent: task(subagent_type="Explore", run_in_background=true) → returns task_id
3. Check status: task_output(task_id=id, block=false) → current status
4. Wait for completion: task_output(task_id=id, block=true) → blocks until done`,
        inputSchema: taskOutputInputSchema,
        execute
    });
}
