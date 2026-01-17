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
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import * as net from 'net';
import axios from 'axios';
import { ToolResult } from './types';
import { logDebug, logError, logInfo } from '../../copilot/logger';
import { getBuildCommand, getRunCommand, getStopCommand, loadEnvVariables } from '../../../debugger/tasks';
import { setJavaHomeInEnvironmentAndPath } from '../../../debugger/debugHelper';
import { DebuggerConfig } from '../../../debugger/config';
import { getServerPathFromConfig } from '../../../util/onboardingUtils';
import { serverLog, showServerOutputChannel, getOutputChannel } from '../../../util/serverLogger';
import treeKill = require('tree-kill');

// ============================================================================
// Tool Name Constants
// ============================================================================

export const BUILD_PROJECT_TOOL_NAME = 'build_project';
export const SERVER_MANAGEMENT_TOOL_NAME = 'server_management';

// ============================================================================
// Type Definitions
// ============================================================================

export type BuildProjectExecuteFn = (args: {
    copy_to_runtime?: boolean;
    full_output?: boolean;
}) => Promise<ToolResult>;

export type ServerManagementExecuteFn = (args: {
    action: 'run' | 'stop' | 'status';
}) => Promise<ToolResult>;

// ============================================================================
// Module State
// ============================================================================

let serverProcess: childProcess.ChildProcess | null = null;

// Maximum output length to return to LLM (to avoid context overflow)
const MAX_OUTPUT_LENGTH = 8000;

/**
 * Truncates output to fit within limits, keeping most relevant parts
 * For build output, keeps the end (where errors typically appear)
 */
function truncateOutput(output: string, maxLength: number = MAX_OUTPUT_LENGTH): string {
    if (output.length <= maxLength) {
        return output;
    }
    const truncatedNote = '\n... [output truncated] ...\n\n';
    const availableLength = maxLength - truncatedNote.length;
    // Keep the last part of output (where build errors typically appear)
    return truncatedNote + output.slice(-availableLength);
}

// ============================================================================
// Build Project Tool
// ============================================================================

/**
 * Creates the execute function for the build_project tool
 */
export function createBuildProjectExecute(projectPath: string): BuildProjectExecuteFn {
    return async (args: { copy_to_runtime?: boolean; full_output?: boolean }): Promise<ToolResult> => {
        const { copy_to_runtime = false, full_output = false } = args;

        logInfo(`[BuildProjectTool] Building project at ${projectPath}, copy_to_runtime=${copy_to_runtime}`);

        try {
            // Show output channel to user
            showServerOutputChannel();
            serverLog('\n========================================\n');
            serverLog('  Building MI Project...\n');
            serverLog('========================================\n\n');

            // Get the build command
            const buildCommand = getBuildCommand(projectPath);
            serverLog(`> ${buildCommand}\n\n`);
            logDebug(`[BuildProjectTool] Build command: ${buildCommand}`);

            // Set up environment with JAVA_HOME
            const envVariables = {
                ...process.env,
                ...setJavaHomeInEnvironmentAndPath(projectPath)
            };

            // Execute build
            const result = await new Promise<{ success: boolean; output: string; error?: string }>((resolve) => {
                let stdout = '';
                let stderr = '';

                const buildProcess = childProcess.spawn(buildCommand, [], {
                    shell: true,
                    cwd: projectPath,
                    env: envVariables
                });

                buildProcess.stdout?.on('data', (data) => {
                    const text = data.toString('utf8');
                    stdout += text;
                    serverLog(text);
                });

                buildProcess.stderr?.on('data', (data) => {
                    const text = data.toString('utf8');
                    stderr += text;
                    serverLog(`Build error:\n${text}`);
                });

                buildProcess.on('close', (code) => {
                    if (code === 0) {
                        resolve({ success: true, output: stdout });
                    } else {
                        resolve({ success: false, output: stdout, error: stderr || `Build failed with exit code ${code}` });
                    }
                });

                buildProcess.on('error', (error) => {
                    resolve({ success: false, output: stdout, error: error.message });
                });
            });

            // Combine stdout and stderr for full output
            const fullOutput = result.output + (result.error ? `\n\nSTDERR:\n${result.error}` : '');
            const outputToReturn = full_output ? fullOutput : truncateOutput(fullOutput);

            if (!result.success) {
                logError(`[BuildProjectTool] Build failed: ${result.error}`);
                serverLog('\n========================================\n');
                serverLog('  BUILD FAILED\n');
                serverLog('========================================\n');
                return {
                    success: false,
                    message: `Build failed.\n\n**Build Output:**\n\`\`\`\n${outputToReturn}\n\`\`\``,
                    error: 'Build failed - see output above for details'
                };
            }

            // Check for .car files
            const targetDir = path.join(projectPath, 'target');
            let carFiles: string[] = [];
            if (fs.existsSync(targetDir)) {
                const files = fs.readdirSync(targetDir);
                carFiles = files.filter(f => f.endsWith('.car'));
            }

            // Copy to runtime if requested
            if (copy_to_runtime && carFiles.length > 0) {
                const serverPath = getServerPathFromConfig(projectPath);
                if (serverPath && fs.existsSync(serverPath)) {
                    const carbonappsDir = path.join(serverPath, 'repository', 'deployment', 'server', 'carbonapps');
                    if (fs.existsSync(carbonappsDir)) {
                        for (const carFile of carFiles) {
                            const src = path.join(targetDir, carFile);
                            const dest = path.join(carbonappsDir, carFile);
                            fs.copyFileSync(src, dest);
                            logDebug(`[BuildProjectTool] Copied ${carFile} to runtime`);
                        }
                    }
                }
            }

            const summary = carFiles.length > 0
                ? `Build successful. Generated ${carFiles.length} artifact(s): ${carFiles.join(', ')}${copy_to_runtime ? ' (copied to runtime)' : ''}`
                : 'Build successful but no .car artifacts were generated';

            logInfo(`[BuildProjectTool] ${summary}`);
            serverLog('\n========================================\n');
            serverLog('  BUILD SUCCESSFUL\n');
            serverLog('========================================\n');
            return {
                success: true,
                message: `${summary}\n\n**Build Output:**\n\`\`\`\n${outputToReturn}\n\`\`\``
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logError(`[BuildProjectTool] Error: ${errorMsg}`);
            return {
                success: false,
                message: 'Build failed',
                error: errorMsg
            };
        }
    };
}

/**
 * Input schema for build_project tool
 */
const buildProjectInputSchema = z.object({
    copy_to_runtime: z.boolean().optional().default(false).describe(
        'Whether to copy built .car artifacts to the MI runtime carbonapps directory after successful build'
    ),
    full_output: z.boolean().optional().default(false).describe(
        'Whether to return the complete build output without truncation. Use this for debugging when you need to see the full Maven output (default: false, output is truncated to ~8000 chars)'
    ),
});

/**
 * Creates the build_project tool
 */
export function createBuildProjectTool(execute: BuildProjectExecuteFn) {
    return (tool as any)({
        description: `Build the MI integration project using Maven.

This tool runs 'mvn clean install' to build the project and generate .car (Carbon Application) artifacts.

**When to use:**
- After creating or modifying integration artifacts (APIs, sequences, endpoints, etc.)
- Before running the server to test changes
- To verify that code changes compile successfully

**What it does:**
1. Executes Maven build command
2. Generates .car artifacts in the target/ directory
3. Optionally copies artifacts to the MI runtime for deployment
4. Returns full build output (stdout/stderr) for error analysis

**Returns:**
- Build success/failure status
- List of generated .car artifacts
- Full Maven build output (truncated if too long) - useful for diagnosing compilation errors`,
        inputSchema: buildProjectInputSchema,
        execute
    });
}

// ============================================================================
// Server Management Tool
// ============================================================================

/**
 * Check if server is running by testing port connectivity
 */
async function checkServerStatus(projectPath: string): Promise<{ running: boolean; ready: boolean; message: string }> {
    const port = DebuggerConfig.getServerPort();
    const host = DebuggerConfig.getHost();

    // Check if port is listening
    const isListening = await new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.connect(port, host);
    });

    if (!isListening) {
        return { running: false, ready: false, message: `Server is not running (port ${port} is not active)` };
    }

    // Check health endpoint
    try {
        const readinessPort = DebuggerConfig.getServerReadinessPort();
        const response = await axios.get(`http://${host}:${readinessPort}/healthz`, { timeout: 5000 });
        if (response.status === 200 && response.data?.status === 'ready') {
            return { running: true, ready: true, message: `Server is running and ready (port ${port})` };
        }
        return { running: true, ready: false, message: `Server is running but not ready: ${response.data?.status || 'unknown status'}` };
    } catch {
        return { running: true, ready: false, message: `Server is running on port ${port} but health check failed` };
    }
}

/**
 * Creates the execute function for the server_management tool
 */
export function createServerManagementExecute(projectPath: string): ServerManagementExecuteFn {
    return async (args: { action: 'run' | 'stop' | 'status' }): Promise<ToolResult> => {
        const { action } = args;

        logInfo(`[ServerManagementTool] Action: ${action}`);

        try {
            const serverPath = getServerPathFromConfig(projectPath);

            if (!serverPath) {
                return {
                    success: false,
                    message: 'MI runtime path is not configured',
                    error: 'Please configure the MI runtime path in VS Code settings (MI.SERVER_PATH)'
                };
            }

            if (!fs.existsSync(serverPath)) {
                return {
                    success: false,
                    message: 'MI runtime not found',
                    error: `The configured path does not exist: ${serverPath}`
                };
            }

            switch (action) {
                case 'status': {
                    const status = await checkServerStatus(projectPath);
                    return {
                        success: true,
                        message: status.message
                    };
                }

                case 'run': {
                    // Check if already running
                    const currentStatus = await checkServerStatus(projectPath);
                    if (currentStatus.running) {
                        return {
                            success: true,
                            message: `Server is already running. ${currentStatus.message}`
                        };
                    }

                    // Load .env if exists
                    const envFilePath = path.resolve(projectPath, '.env');
                    if (fs.existsSync(envFilePath)) {
                        loadEnvVariables(envFilePath);
                    }

                    // Get run command (non-debug mode)
                    const runCommand = await getRunCommand(serverPath, false);
                    if (!runCommand) {
                        return {
                            success: false,
                            message: 'Failed to get run command',
                            error: 'Could not determine the MI runtime startup command'
                        };
                    }

                    // Set up environment
                    const definedEnvVariables = DebuggerConfig.getEnvVariables();
                    const vmArgs = DebuggerConfig.getVmArgs();
                    const envVariables = {
                        ...process.env,
                        ...setJavaHomeInEnvironmentAndPath(projectPath),
                        ...definedEnvVariables
                    };

                    // Show output channel and log server start
                    showServerOutputChannel();
                    serverLog('\n========================================\n');
                    serverLog('  Starting MI Server...\n');
                    serverLog('========================================\n\n');
                    serverLog(`> ${runCommand}\n\n`);

                    // Start server
                    logDebug(`[ServerManagementTool] Spawning server with command: ${runCommand}`);
                    logDebug(`[ServerManagementTool] VM Args: ${JSON.stringify(vmArgs)}`);

                    serverProcess = childProcess.spawn(runCommand, vmArgs, {
                        shell: true,
                        env: envVariables,
                        detached: false
                    });

                    if (!serverProcess) {
                        return {
                            success: false,
                            message: 'Failed to start server',
                            error: 'Server process could not be spawned'
                        };
                    }

                    logDebug(`[ServerManagementTool] Server process spawned with PID: ${serverProcess.pid}`);

                    // Track if process failed immediately
                    let immediateError: string | null = null;

                    serverProcess.stdout?.on('data', (data) => {
                        serverLog(data.toString());
                    });

                    serverProcess.stderr?.on('data', (data) => {
                        serverLog(data.toString());
                    });

                    serverProcess.on('error', (error) => {
                        immediateError = error.message;
                        logError(`[ServerManagementTool] Server process error: ${error.message}`);
                        serverLog(`\nERROR: ${error.message}\n`);
                    });

                    serverProcess.on('exit', (code, signal) => {
                        logInfo(`[ServerManagementTool] Server process exited with code ${code}, signal ${signal}`);
                        if (code !== 0 && code !== null) {
                            serverLog(`\nServer process exited with code ${code}\n`);
                        }
                        serverProcess = null;
                    });

                    // Wait briefly to check if process fails immediately
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    if (immediateError) {
                        return {
                            success: false,
                            message: 'Server failed to start',
                            error: immediateError
                        };
                    }

                    // Check if process is still alive
                    if (serverProcess && serverProcess.exitCode === null) {
                        const port = DebuggerConfig.getServerPort();
                        logInfo(`[ServerManagementTool] Server process is running (PID: ${serverProcess.pid})`);
                        return {
                            success: true,
                            message: `Server started (PID: ${serverProcess.pid}). The server is starting on port ${port}. Use 'status' action to check when it's ready.`
                        };
                    } else {
                        const exitCode = serverProcess?.exitCode;
                        return {
                            success: false,
                            message: 'Server process terminated immediately',
                            error: `Process exited with code ${exitCode}`
                        };
                    }
                }

                case 'stop': {
                    // Check if running
                    const currentStatus = await checkServerStatus(projectPath);
                    if (!currentStatus.running) {
                        return {
                            success: true,
                            message: 'Server is not running'
                        };
                    }

                    const stopCommand = getStopCommand(serverPath);
                    if (!stopCommand) {
                        // Try to kill by process if we have reference
                        if (serverProcess && serverProcess.pid) {
                            treeKill(serverProcess.pid, 'SIGKILL');
                            serverProcess = null;
                            return {
                                success: true,
                                message: 'Server stopped (force killed)'
                            };
                        }
                        return {
                            success: false,
                            message: 'Failed to stop server',
                            error: 'Could not determine stop command and no process reference available'
                        };
                    }

                    // Execute stop command
                    const env = setJavaHomeInEnvironmentAndPath(projectPath);
                    const stopProcess = childProcess.spawn(stopCommand, [], { shell: true, env });

                    showServerOutputChannel();

                    stopProcess.stdout?.on('data', (data) => {
                        serverLog(data.toString());
                    });

                    stopProcess.stderr?.on('data', (data) => {
                        serverLog(data.toString());
                    });

                    // Wait for graceful shutdown with timeout
                    await new Promise<void>((resolve) => {
                        const timeout = setTimeout(() => {
                            if (serverProcess && serverProcess.pid) {
                                treeKill(serverProcess.pid, 'SIGKILL');
                                logInfo('[ServerManagementTool] Server force killed after timeout');
                            }
                            serverProcess = null;
                            resolve();
                        }, 8000);

                        stopProcess.on('close', () => {
                            clearTimeout(timeout);
                            serverProcess = null;
                            resolve();
                        });
                    });

                    return {
                        success: true,
                        message: 'Server stopped successfully'
                    };
                }

                default:
                    return {
                        success: false,
                        message: 'Invalid action',
                        error: `Unknown action: ${action}. Valid actions are: run, stop, status`
                    };
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logError(`[ServerManagementTool] Error: ${errorMsg}`);
            return {
                success: false,
                message: `Server ${action} failed`,
                error: errorMsg
            };
        }
    };
}

/**
 * Input schema for server_management tool
 */
const serverManagementInputSchema = z.object({
    action: z.enum(['run', 'stop', 'status']).describe(
        `The server management action to perform:
- 'run': Start the MI runtime server (builds should be done first using build_project)
- 'stop': Stop the running MI runtime server
- 'status': Check if the server is running and ready`
    ),
});

/**
 * Creates the server_management tool
 */
export function createServerManagementTool(execute: ServerManagementExecuteFn) {
    return (tool as any)({
        description: `Manage the WSO2 Micro Integrator runtime server.

This tool allows you to start, stop, and check the status of the MI runtime.

**Actions:**

1. **run** - Start the MI runtime server
   - Loads environment variables from .env file if present
   - Starts the server in non-debug mode
   - Returns immediately; use 'status' to check when ready

2. **stop** - Stop the running MI runtime server
   - Attempts graceful shutdown first
   - Force kills after 8 seconds if needed

3. **status** - Check server status
   - Reports if server is running (port active)
   - Reports if server is ready (health check passed)

**Prerequisites:**
- MI runtime must be configured (MI.SERVER_PATH setting)
- For 'run': Build the project first using build_project tool
- For 'run': JAVA_HOME must be configured

**Typical workflow:**
1. Make code changes
2. Run build_project (with copy_to_runtime=true)
3. Run server_management with action='run'
4. Check server_management with action='status' until ready
5. Test your integration
6. Run server_management with action='stop' when done`,
        inputSchema: serverManagementInputSchema,
        execute
    });
}
