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
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import * as net from 'net';
import axios from 'axios';
import {
    ToolResult,
    BUILD_PROJECT_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    type BuildProjectExecuteFn,
    type ServerManagementExecuteFn,
} from './types';
import { logDebug, logError, logInfo } from '../../copilot/logger';
import { getBuildCommand, getRunCommand, getStopCommand, loadEnvVariables } from '../../../debugger/tasks';
import { setJavaHomeInEnvironmentAndPath } from '../../../debugger/debugHelper';
import { DebuggerConfig } from '../../../debugger/config';
import { getServerPathFromConfig } from '../../../util/onboardingUtils';
import { serverLog, showServerOutputChannel, getOutputChannel } from '../../../util/serverLogger';
import { MILanguageClient } from '../../../lang-client/activator';
import treeKill = require('tree-kill');

export {
    BUILD_PROJECT_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
};
export type {
    BuildProjectExecuteFn,
    ServerManagementExecuteFn,
};

// ============================================================================
// Module State
// ============================================================================

let serverProcess: childProcess.ChildProcess | null = null;
const SERVER_START_TOOL_TIMEOUT_MS = 10000; // hard timeout for the entire run action
const SERVER_START_STEP_TIMEOUT_MS = 5000;

// ============================================================================
// Server Output Buffer (captures server logs during runtime)
// ============================================================================

let serverOutputBuffer = '';
const MAX_SERVER_OUTPUT_BUFFER = 512 * 1024; // 512KB cap

function appendToServerOutputBuffer(text: string) {
    serverOutputBuffer += text;
    // Keep the tail (most recent output) if buffer exceeds cap
    if (serverOutputBuffer.length > MAX_SERVER_OUTPUT_BUFFER) {
        serverOutputBuffer = serverOutputBuffer.slice(-MAX_SERVER_OUTPUT_BUFFER);
    }
}

function clearServerOutputBuffer() {
    serverOutputBuffer = '';
}

function getServerOutputBuffer(): string {
    return serverOutputBuffer;
}

function createServerStartTimeoutError(message: string): Error {
    const error = new Error(message);
    (error as Error & { code?: string }).code = 'SERVER_START_TOOL_TIMEOUT';
    return error;
}

function isServerStartTimeoutError(error: unknown): boolean {
    return error instanceof Error && (error as Error & { code?: string }).code === 'SERVER_START_TOOL_TIMEOUT';
}

async function withServerStartTimeout<T>(operation: Promise<T>, timeoutMs: number, context: string): Promise<T> {
    if (timeoutMs <= 0) {
        throw createServerStartTimeoutError(context);
    }

    return new Promise<T>((resolve, reject) => {
        const timeoutHandle = setTimeout(() => {
            reject(createServerStartTimeoutError(context));
        }, timeoutMs);

        operation.then(
            (value) => {
                clearTimeout(timeoutHandle);
                resolve(value);
            },
            (error) => {
                clearTimeout(timeoutHandle);
                reject(error);
            }
        );
    });
}

/**
 * Write output content to a file in the session directory.
 * Returns the file path on success, empty string on failure.
 */
function writeOutputToFile(sessionDir: string, fileName: string, content: string): string {
    const filePath = path.join(sessionDir, fileName);
    try {
        fs.mkdirSync(sessionDir, { recursive: true });
        fs.writeFileSync(filePath, content, 'utf8');
        logDebug(`[RuntimeTools] Wrote ${fileName} (${content.length} chars) to ${filePath}`);
        return filePath;
    } catch (error) {
        logError(`[RuntimeTools] Failed to write ${fileName}: ${error}`);
        return '';
    }
}

// ============================================================================
// Build Project Tool
// ============================================================================

/**
 * Creates the execute function for the build_project tool
 */
export function createBuildProjectExecute(projectPath: string, sessionDir: string): BuildProjectExecuteFn {
    return async (args: { copy_to_runtime?: boolean }): Promise<ToolResult> => {
        const { copy_to_runtime = false } = args;

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

            // Combine stdout and stderr for full output and write to file
            const fullOutput = result.output + (result.error ? `\n\nSTDERR:\n${result.error}` : '');
            const buildOutputFile = writeOutputToFile(sessionDir, 'build.txt', fullOutput);

            if (!result.success) {
                logError(`[BuildProjectTool] Build failed: ${result.error}`);
                serverLog('\n========================================\n');
                serverLog('  BUILD FAILED\n');
                serverLog('========================================\n');
                return {
                    success: false,
                    message: `Build failed. Full build output saved to: ${buildOutputFile}\nRead this file using file_read to diagnose the build errors.`,
                    error: 'Build failed - check build output file for details'
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
                message: `${summary}\nFull build output saved to: ${buildOutputFile}`
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
});

/**
 * Creates the build_project tool
 */
export function createBuildProjectTool(execute: BuildProjectExecuteFn) {
    return (tool as any)({
        description: `Build the MI project using Maven ('mvn clean install'). Generates .car artifacts in target/.
            Optionally copies artifacts to MI runtime if copy_to_runtime=true.
            Saves full build output to build.txt - use file_read to diagnose build errors.`,
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
export function createServerManagementExecute(projectPath: string, sessionDir: string): ServerManagementExecuteFn {
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
                    const recentOutput = getServerOutputBuffer();
                    let outputInfo = '';
                    if (recentOutput) {
                        const runOutputFile = writeOutputToFile(sessionDir, 'run.txt', recentOutput);
                        if (runOutputFile) {
                            outputInfo = `\nServer output saved to: ${runOutputFile}`;
                        }
                    }
                    return {
                        success: true,
                        message: status.message + outputInfo
                    };
                }

                case 'run': {
                    const runActionStartTime = Date.now();
                    const runActionDeadline = runActionStartTime + SERVER_START_TOOL_TIMEOUT_MS;
                    const runActionTimeoutSeconds = Math.floor(SERVER_START_TOOL_TIMEOUT_MS / 1000);
                    const getRemainingRunActionTime = () => runActionDeadline - Date.now();
                    const getRunActionTimeoutMessage = (context: string) =>
                        `Server start tool timed out after ${runActionTimeoutSeconds} seconds while ${context}.`;

                    try {
                        // Check if already running
                        const currentStatus = await withServerStartTimeout(
                            checkServerStatus(projectPath),
                            Math.min(SERVER_START_STEP_TIMEOUT_MS, Math.max(1, getRemainingRunActionTime())),
                            getRunActionTimeoutMessage('checking current server status')
                        );
                        if (currentStatus.running) {
                            return {
                                success: true,
                                message: `Server is already running. ${currentStatus.message}`
                            };
                        }

                        // Show output channel
                        showServerOutputChannel();
                        serverLog('\n========================================\n');
                        serverLog('  Preparing to Start MI Server...\n');
                        serverLog('========================================\n\n');

                        // Shutdown tryout server if running (same as IDE's run button)
                        try {
                            serverLog('> Shutting down tryout server if running...\n');
                            const langClient = await withServerStartTimeout(
                                MILanguageClient.getInstance(projectPath),
                                Math.min(SERVER_START_STEP_TIMEOUT_MS, Math.max(1, getRemainingRunActionTime())),
                                getRunActionTimeoutMessage('initializing language client')
                            );
                            const isTerminated = await withServerStartTimeout(
                                langClient.shutdownTryoutServer(),
                                Math.min(SERVER_START_STEP_TIMEOUT_MS, Math.max(1, getRemainingRunActionTime())),
                                getRunActionTimeoutMessage('shutting down tryout server')
                            );
                            if (!isTerminated) {
                                logInfo('[ServerManagementTool] Tryout server was not running or already terminated');
                                serverLog('  Tryout server was not running\n');
                            } else {
                                logInfo('[ServerManagementTool] Tryout server shutdown successfully');
                                serverLog('  Tryout server shutdown successfully\n');
                            }
                        } catch (error) {
                            if (isServerStartTimeoutError(error)) {
                                throw error;
                            }
                            // Non-fatal: tryout server might not be running
                            logDebug(`[ServerManagementTool] Could not shutdown tryout server: ${error}`);
                        }

                        // Sync deployment.toml from project to server (use project configurations)
                        const projectDeploymentToml = path.join(projectPath, 'deployment', 'deployment.toml');
                        const serverDeploymentToml = path.join(serverPath, 'conf', 'deployment.toml');
                        if (fs.existsSync(projectDeploymentToml) && fs.existsSync(serverDeploymentToml)) {
                            try {
                                serverLog('\n> Syncing deployment.toml from project to server...\n');
                                // Backup server config before overwriting
                                const backupPath = path.join(serverPath, 'conf', 'deployment-backup.toml');
                                fs.copyFileSync(serverDeploymentToml, backupPath);
                                // Copy project config to server
                                fs.copyFileSync(projectDeploymentToml, serverDeploymentToml);
                                logInfo('[ServerManagementTool] Synced deployment.toml from project to server');
                                serverLog('  Backed up server config to deployment-backup.toml\n');
                                serverLog('  Copied project deployment.toml to server\n');
                                // Update port offset config
                                DebuggerConfig.setConfigPortOffset(projectPath);
                            } catch (error) {
                                logDebug(`[ServerManagementTool] Could not sync deployment.toml: ${error}`);
                            }
                        }

                        // Copy deployment/libs/*.jar to server/lib (same as IDE's executeBuildTask)
                        const projectLibsDir = path.join(projectPath, 'deployment', 'libs');
                        const serverLibDir = path.join(serverPath, 'lib');
                        if (fs.existsSync(projectLibsDir) && fs.existsSync(serverLibDir)) {
                            try {
                                const files = fs.readdirSync(projectLibsDir);
                                const jarFiles = files.filter(f => f.endsWith('.jar'));
                                if (jarFiles.length > 0) {
                                    serverLog('\n> Copying library JARs to server...\n');
                                }
                                for (const jarFile of jarFiles) {
                                    const src = path.join(projectLibsDir, jarFile);
                                    const dest = path.join(serverLibDir, jarFile);
                                    fs.copyFileSync(src, dest);
                                    DebuggerConfig.setCopiedLibs(dest);
                                    logDebug(`[ServerManagementTool] Copied lib: ${jarFile}`);
                                    serverLog(`  Copied: ${jarFile}\n`);
                                }
                                if (jarFiles.length > 0) {
                                    logInfo(`[ServerManagementTool] Copied ${jarFiles.length} library JAR(s) to server`);
                                }
                            } catch (error) {
                                logDebug(`[ServerManagementTool] Could not copy libs: ${error}`);
                            }
                        }

                        // Load .env if exists
                        const envFilePath = path.resolve(projectPath, '.env');
                        if (fs.existsSync(envFilePath)) {
                            loadEnvVariables(envFilePath);
                        }

                        // Get run command (non-debug mode)
                        const runCommand = await withServerStartTimeout(
                            getRunCommand(serverPath, false),
                            Math.min(SERVER_START_STEP_TIMEOUT_MS, Math.max(1, getRemainingRunActionTime())),
                            getRunActionTimeoutMessage('resolving runtime startup command')
                        );
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

                        // Log server start command
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

                        // Clear output buffer and start capturing
                        clearServerOutputBuffer();
                        logDebug(`[ServerManagementTool] Server process spawned with PID: ${serverProcess.pid}`);

                        // Track process state
                        let processExited = false;
                        let processExitCode: number | null = null;

                        serverProcess.stdout?.on('data', (data) => {
                            const text = data.toString();
                            serverLog(text);
                            appendToServerOutputBuffer(text);
                        });

                        serverProcess.stderr?.on('data', (data) => {
                            const text = data.toString();
                            serverLog(text);
                            appendToServerOutputBuffer(text);
                        });

                        serverProcess.on('error', (error) => {
                            logError(`[ServerManagementTool] Server process error: ${error.message}`);
                            serverLog(`\nERROR: ${error.message}\n`);
                            appendToServerOutputBuffer(`\nERROR: ${error.message}\n`);
                            processExited = true;
                        });

                        serverProcess.on('exit', (code, signal) => {
                            logInfo(`[ServerManagementTool] Server process exited with code ${code}, signal ${signal}`);
                            processExitCode = code;
                            processExited = true;
                            if (code !== 0 && code !== null) {
                                serverLog(`\nServer process exited with code ${code}\n`);
                            }
                            serverProcess = null;
                        });

                        // Wait for server to become ready, fail, or timeout
                        const readinessConfig = vscode.workspace.getConfiguration('MI', vscode.Uri.file(projectPath));
                        const configuredTimeout = readinessConfig.get("serverTimeoutInSecs");
                        const maxTimeout = (Number.isFinite(Number(configuredTimeout)) && Number(configuredTimeout) > 0)
                            ? Number(configuredTimeout) * 1000 : 120000;
                        const pollInterval = 3000;
                        const startTime = Date.now();

                        // Initial wait for process to begin starting
                        await new Promise(resolve => setTimeout(resolve, 3000));

                        while (Date.now() - startTime < maxTimeout) {
                            if (getRemainingRunActionTime() <= 0) {
                                throw createServerStartTimeoutError(
                                    getRunActionTimeoutMessage('waiting for the server to become ready')
                                );
                            }

                            // Check if process died
                            if (processExited) {
                                const runOutputFile = writeOutputToFile(sessionDir, 'run.txt', getServerOutputBuffer());
                                logError(`[ServerManagementTool] Server process exited during startup with code ${processExitCode}`);
                                serverLog('\n========================================\n');
                                serverLog('  SERVER FAILED TO START\n');
                                serverLog('========================================\n');
                                return {
                                    success: false,
                                    message: `Server process exited with code ${processExitCode} during startup.\nServer output saved to: ${runOutputFile}\nRead this file using file_read to diagnose the startup errors.`,
                                    error: `Server process exited with code ${processExitCode}`
                                };
                            }

                            // Check health endpoint
                            const healthStatus = await withServerStartTimeout(
                                checkServerStatus(projectPath),
                                Math.min(SERVER_START_STEP_TIMEOUT_MS, Math.max(1, getRemainingRunActionTime())),
                                getRunActionTimeoutMessage('checking server readiness')
                            );
                            if (healthStatus.ready) {
                                const port = DebuggerConfig.getServerPort();
                                const runOutputFile = writeOutputToFile(sessionDir, 'run.txt', getServerOutputBuffer());
                                logInfo(`[ServerManagementTool] Server is running and ready on port ${port}`);
                                serverLog('\n========================================\n');
                                serverLog('  SERVER IS READY\n');
                                serverLog('========================================\n');
                                return {
                                    success: true,
                                    message: `Server is running and ready on port ${port}.\nServer startup output saved to: ${runOutputFile}`
                                };
                            }

                            await new Promise(resolve => setTimeout(resolve, pollInterval));
                        }

                        // Timeout reached - server may still be starting
                        const runOutputFile = writeOutputToFile(sessionDir, 'run.txt', getServerOutputBuffer());
                        logError(`[ServerManagementTool] Server startup timed out after ${maxTimeout / 1000}s`);
                        serverLog('\n========================================\n');
                        serverLog('  SERVER STARTUP TIMED OUT\n');
                        serverLog('========================================\n');
                        return {
                            success: false,
                            message: `Server startup timed out after ${maxTimeout / 1000} seconds. The server may still be starting or may have encountered deployment issues.\nServer output saved to: ${runOutputFile}\nRead this file using file_read to diagnose the issue.`,
                            error: `Server startup timed out after ${maxTimeout / 1000}s`
                        };
                    } catch (error) {
                        if (!isServerStartTimeoutError(error)) {
                            throw error;
                        }

                        const timeoutMessage = error instanceof Error
                            ? error.message
                            : `Server start tool timed out after ${runActionTimeoutSeconds} seconds.`;
                        const runOutputFile = writeOutputToFile(sessionDir, 'run.txt', getServerOutputBuffer());
                        logError(`[ServerManagementTool] ${timeoutMessage}`);
                        serverLog('\n========================================\n');
                        serverLog('  SERVER START TOOL TIMED OUT\n');
                        serverLog('========================================\n');
                        return {
                            success: false,
                            message: `${timeoutMessage}\nServer output saved to: ${runOutputFile}\nRead this file using file_read to diagnose the issue.`,
                            error: timeoutMessage
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
        description: `Manage the MI runtime server (run/stop/status).
            - run: Syncs configs, copies libs, starts server, waits until ready (health check). Build first using build_project.
            - stop: Graceful shutdown (force kill after 8s timeout).
            - status: Check if server is running and ready.
            Server output saved to run.txt - use file_read to debug issues.`,
        inputSchema: serverManagementInputSchema,
        execute
    });
}
