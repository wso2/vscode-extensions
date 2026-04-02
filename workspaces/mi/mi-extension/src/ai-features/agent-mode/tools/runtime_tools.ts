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
    BUILD_AND_DEPLOY_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
    type BuildAndDeployExecuteFn,
    type ServerManagementExecuteFn,
} from './types';
import { queryArtifacts, controlArtifact, ARTIFACT_TYPE_MAP } from './management_api_client';
import { logDebug, logError, logInfo } from '../../copilot/logger';
import { getBuildCommand, getRunCommand, getStopCommand, loadEnvVariables } from '../../../debugger/tasks';
import { setJavaHomeInEnvironmentAndPath } from '../../../debugger/debugHelper';
import { DebuggerConfig } from '../../../debugger/config';
import { getServerPathFromConfig } from '../../../util/onboardingUtils';
import { serverLog, showServerOutputChannel } from '../../../util/serverLogger';
import { MILanguageClient } from '../../../lang-client/activator';
import treeKill = require('tree-kill');

export {
    BUILD_AND_DEPLOY_TOOL_NAME,
    SERVER_MANAGEMENT_TOOL_NAME,
};
export type {
    BuildAndDeployExecuteFn,
    ServerManagementExecuteFn,
};

// ============================================================================
// Module State
// ============================================================================

let serverProcess: childProcess.ChildProcess | null = null;
let serverStartedInCurrentRun = false;
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

function killProcessTree(pid: number): Promise<void> {
    return new Promise((resolve, reject) => {
        treeKill(pid, 'SIGKILL', (error?: Error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

async function forceKillServerProcess(reason: string): Promise<boolean> {
    const pid = serverProcess?.pid;
    if (!pid) {
        return false;
    }

    try {
        logInfo(`${reason} (pid=${pid})`);
        await killProcessTree(pid);
        return true;
    } catch (error) {
        logError('[ServerManagementTool] Failed to kill server process during cleanup', error);
        return false;
    } finally {
        serverProcess = null;
    }
}

/**
 * Reset per-run tracking for server start cleanup.
 */
export function beginServerManagementRunTracking(): void {
    serverStartedInCurrentRun = false;
}

/**
 * Cleanup hook invoked at the end of an agent run.
 * Optionally stops server instances that were started during the current run.
 */
export async function cleanupServerManagementOnAgentEnd(options?: { stopServerStartedByCurrentRun?: boolean }): Promise<void> {
    const shouldStop = options?.stopServerStartedByCurrentRun === true && serverStartedInCurrentRun;
    if (shouldStop) {
        await forceKillServerProcess('[ServerManagementTool] Cleaning up server started during interrupted/failed run');
    }
    serverStartedInCurrentRun = false;
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
// Shared Runtime Helpers
// ============================================================================

interface BuildCommandResult {
    result: ToolResult;
    carFiles: string[];
    targetDir: string;
    buildOutputFile: string;
}

function resolveServerPath(projectPath: string): { serverPath?: string; errorResult?: ToolResult } {
    const serverPath = getServerPathFromConfig(projectPath);
    if (!serverPath) {
        return {
            errorResult: {
                success: false,
                message: 'MI runtime path is not configured',
                error: 'Please configure the MI runtime path in VS Code settings (MI.SERVER_PATH)'
            }
        };
    }

    if (!fs.existsSync(serverPath)) {
        return {
            errorResult: {
                success: false,
                message: 'MI runtime not found',
                error: `The configured path does not exist: ${serverPath}`
            }
        };
    }

    return { serverPath };
}

function ensureOperationNotAborted(mainAbortSignal: AbortSignal | undefined, context: string): void {
    if (mainAbortSignal?.aborted) {
        throw new Error(`AbortError: Operation aborted by user while ${context}`);
    }
}

function getCarArtifacts(projectPath: string): { targetDir: string; carFiles: string[] } {
    const targetDir = path.join(projectPath, 'target');
    if (!fs.existsSync(targetDir)) {
        return { targetDir, carFiles: [] };
    }

    const carFiles = fs.readdirSync(targetDir).filter(file => file.endsWith('.car'));
    return { targetDir, carFiles };
}

function copyCarArtifactsToRuntime(targetDir: string, carFiles: string[], serverPath: string): ToolResult {
    const carbonappsDir = path.join(serverPath, 'repository', 'deployment', 'server', 'carbonapps');
    if (!fs.existsSync(carbonappsDir)) {
        return {
            success: false,
            message: 'Failed to deploy artifacts',
            error: `MI carbonapps directory not found: ${carbonappsDir}`
        };
    }

    for (const carFile of carFiles) {
        const src = path.join(targetDir, carFile);
        const dest = path.join(carbonappsDir, carFile);
        fs.copyFileSync(src, dest);
        logDebug(`[BuildAndDeployTool] Copied ${carFile} to runtime`);
    }

    return {
        success: true,
        message: `Copied ${carFiles.length} artifact(s) to runtime: ${carFiles.join(', ')}`
    };
}

async function runBuildCommand(projectPath: string, sessionDir: string): Promise<BuildCommandResult> {
    // Show output channel to user
    showServerOutputChannel();
    serverLog('\n========================================\n');
    serverLog('  Building MI Project...\n');
    serverLog('========================================\n\n');

    // Get the build command
    const buildCommand = getBuildCommand(projectPath);
    serverLog(`> ${buildCommand}\n\n`);
    logDebug(`[BuildAndDeployTool] Build command: ${buildCommand}`);

    // Set up environment with JAVA_HOME
    const envVariables = {
        ...process.env,
        ...setJavaHomeInEnvironmentAndPath(projectPath)
    };

    // Execute build
    const buildExecution = await new Promise<{ success: boolean; output: string; error?: string }>((resolve) => {
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

    const fullOutput = buildExecution.output + (buildExecution.error ? `\n\nSTDERR:\n${buildExecution.error}` : '');
    const buildOutputFile = writeOutputToFile(sessionDir, 'build.txt', fullOutput);
    const { targetDir, carFiles } = getCarArtifacts(projectPath);

    if (!buildExecution.success) {
        logError(`[BuildAndDeployTool] Build failed: ${buildExecution.error}`);
        serverLog('\n========================================\n');
        serverLog('  BUILD FAILED\n');
        serverLog('========================================\n');
        return {
            result: {
                success: false,
                message: `Build failed. Full build output saved to: ${buildOutputFile}\nRead this file using file_read to diagnose the build errors.`,
                error: 'Build failed - check build output file for details'
            },
            carFiles,
            targetDir,
            buildOutputFile,
        };
    }

    const summary = carFiles.length > 0
        ? `Build successful. Generated ${carFiles.length} artifact(s): ${carFiles.join(', ')}`
        : 'Build successful but no .car artifacts were generated';

    logInfo(`[BuildAndDeployTool] ${summary}`);
    serverLog('\n========================================\n');
    serverLog('  BUILD SUCCESSFUL\n');
    serverLog('========================================\n');

    return {
        result: {
            success: true,
            message: `${summary}\nFull build output saved to: ${buildOutputFile}`
        },
        carFiles,
        targetDir,
        buildOutputFile,
    };
}

// ============================================================================
// Build and Deploy Tool
// ============================================================================

/**
 * Creates the execute function for the build_and_deploy tool
 */
export function createBuildAndDeployExecute(
    projectPath: string,
    sessionDir: string,
    mainAbortSignal?: AbortSignal
): BuildAndDeployExecuteFn {
    return async (args: { mode: 'build' | 'deploy' | 'build_and_deploy' }): Promise<ToolResult> => {
        const { mode } = args;
        logInfo(`[BuildAndDeployTool] Mode: ${mode}, projectPath: ${projectPath}`);

        try {
            if (mode === 'build') {
                ensureOperationNotAborted(mainAbortSignal, 'starting build');
                const buildResult = await runBuildCommand(projectPath, sessionDir);
                return buildResult.result;
            }

            const { serverPath, errorResult } = resolveServerPath(projectPath);
            if (!serverPath) {
                return errorResult!;
            }

            if (mode === 'deploy') {
                ensureOperationNotAborted(mainAbortSignal, 'validating deployment artifacts');
                const { targetDir, carFiles } = getCarArtifacts(projectPath);
                if (carFiles.length === 0) {
                    return {
                        success: false,
                        message: 'Deploy failed. No .car artifacts found in target/.',
                        error: 'Build artifacts not found. Run mode=build first.'
                    };
                }

                ensureOperationNotAborted(mainAbortSignal, 'stopping server before deploy');
                const stopResult = await stopServer(projectPath, serverPath);
                if (!stopResult.success) {
                    return {
                        success: false,
                        message: `Deploy failed while stopping server. ${stopResult.message}`,
                        error: stopResult.error ?? 'Failed to stop server before deploy'
                    };
                }

                ensureOperationNotAborted(mainAbortSignal, 'copying artifacts to runtime');
                const copyResult = copyCarArtifactsToRuntime(targetDir, carFiles, serverPath);
                if (!copyResult.success) {
                    return copyResult;
                }

                ensureOperationNotAborted(mainAbortSignal, 'starting server after deploy');
                const startResult = await startServer(projectPath, serverPath, sessionDir, mainAbortSignal);
                if (!startResult.success) {
                    return {
                        success: false,
                        message: `Artifacts copied successfully, but server failed to start.\n${startResult.message}`,
                        error: startResult.error ?? 'Deploy incomplete: server startup failed'
                    };
                }

                return {
                    success: true,
                    message: `${copyResult.message}\n${startResult.message}`
                };
            }

            // mode === 'build_and_deploy'
            ensureOperationNotAborted(mainAbortSignal, 'stopping server before build');
            const stopResult = await stopServer(projectPath, serverPath);
            if (!stopResult.success) {
                return {
                    success: false,
                    message: `Build and deploy failed while stopping server. ${stopResult.message}`,
                    error: stopResult.error ?? 'Failed to stop server before build'
                };
            }

            ensureOperationNotAborted(mainAbortSignal, 'building project');
            const buildResult = await runBuildCommand(projectPath, sessionDir);
            if (!buildResult.result.success) {
                return buildResult.result;
            }

            if (buildResult.carFiles.length === 0) {
                return {
                    success: false,
                    message: `${buildResult.result.message}\nNo .car artifacts generated, so deployment was skipped.`,
                    error: 'No deployable artifacts generated'
                };
            }

            ensureOperationNotAborted(mainAbortSignal, 'copying built artifacts to runtime');
            const copyResult = copyCarArtifactsToRuntime(buildResult.targetDir, buildResult.carFiles, serverPath);
            if (!copyResult.success) {
                return copyResult;
            }

            ensureOperationNotAborted(mainAbortSignal, 'starting server after build');
            const startResult = await startServer(projectPath, serverPath, sessionDir, mainAbortSignal);
            if (!startResult.success) {
                return {
                    success: false,
                    message: `${buildResult.result.message}\n${copyResult.message}\nServer failed to start after deployment.\n${startResult.message}`,
                    error: startResult.error ?? 'Build succeeded but deploy/start failed'
                };
            }

            return {
                success: true,
                message: `${buildResult.result.message}\n${copyResult.message}\n${startResult.message}`
            };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logError(`[BuildAndDeployTool] Error: ${errorMsg}`);
            return {
                success: false,
                message: 'Build/deploy failed',
                error: errorMsg
            };
        }
    };
}

/**
 * Input schema for build_and_deploy tool
 */
const buildAndDeployInputSchema = z.object({
    mode: z.enum(['build', 'deploy', 'build_and_deploy']).describe(
        `Execution mode:
        - 'build': Build only (mvn clean install), no server interaction
        - 'deploy': Stop server, copy existing target/*.car artifacts, then start server
        - 'build_and_deploy': Stop server, build, copy artifacts, then start server`
    ),
});

/**
 * Creates the build_and_deploy tool
 */
export function createBuildAndDeployTool(execute: BuildAndDeployExecuteFn) {
    return (tool as any)({
        description: `Build and/or deploy an MI project in one tool call.
            - mode=build: Maven build only.
            - mode=deploy: Deploy existing .car artifacts to runtime and restart server.
            - mode=build_and_deploy: Full stop -> build -> deploy -> start cycle.
            Saves full build output to build.txt and runtime output to run.txt when applicable.`,
        inputSchema: buildAndDeployInputSchema,
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

async function stopServer(projectPath: string, serverPath: string): Promise<ToolResult> {
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
            serverStartedInCurrentRun = false;
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
    const env = { ...process.env, ...setJavaHomeInEnvironmentAndPath(projectPath) };
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
            serverStartedInCurrentRun = false;
            resolve();
        }, 8000);

        stopProcess.on('close', () => {
            clearTimeout(timeout);
            serverProcess = null;
            serverStartedInCurrentRun = false;
            resolve();
        });
    });

    return {
        success: true,
        message: 'Server stopped successfully'
    };
}

function getServerLogHint(serverPath: string): string {
    const logDir = path.join(serverPath, 'repository', 'logs');
    if (!fs.existsSync(logDir)) {
        return '';
    }
    return `\nServer log directory: ${logDir} — use file_read or grep to inspect wso2carbon.log for details.`;
}

async function startServer(
    projectPath: string,
    serverPath: string,
    sessionDir: string,
    mainAbortSignal?: AbortSignal
): Promise<ToolResult> {
    const runActionStartTime = Date.now();
    const runActionDeadline = runActionStartTime + SERVER_START_TOOL_TIMEOUT_MS;
    const runActionTimeoutSeconds = Math.floor(SERVER_START_TOOL_TIMEOUT_MS / 1000);
    const getRemainingRunActionTime = () => runActionDeadline - Date.now();
    const getRunActionTimeoutMessage = (context: string) =>
        `Server start tool timed out after ${runActionTimeoutSeconds} seconds while ${context}.`;
    let removeMainAbortListener: (() => void) | undefined;

    const ensureRunNotAborted = async (context: string) => {
        if (!mainAbortSignal?.aborted) {
            return;
        }
        await forceKillServerProcess(`[ServerManagementTool] Main agent aborted while ${context}; stopping startup process`);
        throw new Error('AbortError: Operation aborted by user');
    };

    try {
        await ensureRunNotAborted('checking current server status');

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

        serverStartedInCurrentRun = true;

        if (mainAbortSignal && serverProcess.pid) {
            const onMainAbort = () => {
                void forceKillServerProcess('[ServerManagementTool] Main agent aborted during startup');
            };

            if (mainAbortSignal.aborted) {
                await ensureRunNotAborted('preparing startup polling');
            } else {
                mainAbortSignal.addEventListener('abort', onMainAbort, { once: true });
                removeMainAbortListener = () => mainAbortSignal.removeEventListener('abort', onMainAbort);
                serverProcess.on('close', () => removeMainAbortListener?.());
                serverProcess.on('error', () => removeMainAbortListener?.());
            }
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
            serverStartedInCurrentRun = false;
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
        await ensureRunNotAborted('waiting for initial startup logs');

        while (Date.now() - startTime < maxTimeout) {
            await ensureRunNotAborted('waiting for server readiness');

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
                    message: `Server process exited with code ${processExitCode} during startup.\nServer output saved to: ${runOutputFile}\nRead this file using file_read to diagnose the startup errors.${getServerLogHint(serverPath)}`,
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
            message: `Server startup timed out after ${maxTimeout / 1000} seconds. The server may still be starting or may have encountered deployment issues.\nServer output saved to: ${runOutputFile}\nRead this file using file_read to diagnose the issue.${getServerLogHint(serverPath)}`,
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
            message: `${timeoutMessage}\nServer output saved to: ${runOutputFile}\nRead this file using file_read to diagnose the issue.${getServerLogHint(serverPath)}`,
            error: timeoutMessage
        };
    } finally {
        removeMainAbortListener?.();
    }
}

/**
 * Creates the execute function for the server_management tool
 */
export function createServerManagementExecute(
    projectPath: string,
    sessionDir: string,
    mainAbortSignal?: AbortSignal
): ServerManagementExecuteFn {
    return async (args): Promise<ToolResult> => {
        const { action } = args;
        logInfo(`[ServerManagementTool] Action: ${action}`);

        try {
            // query and control actions don't need the server path config — they use the Management API
            if (action === 'query') {
                const { artifact_type, artifact_name } = args;
                if (!artifact_type) {
                    return {
                        success: false,
                        message: 'artifact_type is required for query action',
                        error: `Valid types: ${Object.keys(ARTIFACT_TYPE_MAP).join(', ')}`,
                    };
                }
                return queryArtifacts(artifact_type, artifact_name);
            }

            if (action === 'control') {
                const { artifact_type, artifact_name, control_action, body } = args;
                if (!artifact_type || !control_action) {
                    return {
                        success: false,
                        message: 'artifact_type and control_action are required for control action',
                        error: 'Example: action="control", artifact_type="apis", control_action="enableTracing", artifact_name="MyAPI"',
                    };
                }
                if (!artifact_name && !['restart', 'restartGracefully'].includes(control_action)) {
                    return {
                        success: false,
                        message: 'artifact_name is required for this control action',
                        error: `Specify the name of the ${artifact_type} to apply '${control_action}' on`,
                    };
                }
                return controlArtifact(artifact_type, control_action, artifact_name || '', body);
            }

            const { serverPath, errorResult } = resolveServerPath(projectPath);
            if (!serverPath) {
                return errorResult!;
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

                    // Include server log directory path for debugging
                    const logDir = path.join(serverPath, 'repository', 'logs');
                    let logInfo = '';
                    if (fs.existsSync(logDir)) {
                        const logFiles = fs.readdirSync(logDir)
                            .filter(f => f.endsWith('.log'))
                            .sort((a, b) => {
                                try {
                                    return fs.statSync(path.join(logDir, b)).mtimeMs - fs.statSync(path.join(logDir, a)).mtimeMs;
                                } catch { return 0; }
                            })
                            .slice(0, 5);
                        if (logFiles.length > 0) {
                            logInfo = `\nServer log directory: ${logDir}\nRecent log files: ${logFiles.join(', ')}`;
                        }
                    }

                    return {
                        success: true,
                        message: status.message + outputInfo + logInfo
                    };
                }
                case 'run':
                    return startServer(projectPath, serverPath, sessionDir, mainAbortSignal);
                case 'stop':
                    return stopServer(projectPath, serverPath);
                default:
                    return {
                        success: false,
                        message: 'Invalid action',
                        error: `Unknown action: ${action}. Valid actions are: run, stop, status, query, control`
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
    action: z.enum(['run', 'stop', 'status', 'query', 'control']).describe(
        `The server management action:
        - 'run': Start the MI runtime server
        - 'stop': Stop the running MI runtime server
        - 'status': Check if the server is running and ready
        - 'query': Query deployed artifacts via Management API (requires artifact_type)
        - 'control': Control runtime state via Management API (requires artifact_type + control_action)`
    ),
    artifact_type: z.string().optional().describe(
        `Required for query/control actions. The artifact type to query or control:
        apis, proxy-services, endpoints, sequences, inbound-endpoints, connectors,
        templates, local-entries, tasks, message-stores, message-processors,
        applications, data-services, data-sources, server, logging, registry, registry-content, configs`
    ),
    artifact_name: z.string().optional().describe(
        `Optional for query (to get specific artifact details); required for most control actions.
        The name of the specific artifact to query or control.
        For configs: use the config name (e.g. 'correlation').
        For registry/registry-content: use path format 'registry/config/<path>' or 'registry/governance/<path>'.`
    ),
    control_action: z.string().optional().describe(
        `Required for action='control'. The control operation to perform:
        - 'activate'/'deactivate': For proxy-services, endpoints, inbound-endpoints, message-processors, tasks
        - 'enableTracing'/'disableTracing': For apis, proxy-services, endpoints, sequences, inbound-endpoints, templates
        - 'enableStatistics'/'disableStatistics': Same artifacts as tracing
        - 'trigger': For tasks (one-time immediate execution)
        - 'setLogLevel': For logging (requires body with loggingLevel)
        - 'restart'/'restartGracefully': For server`
    ),
    body: z.record(z.string(), z.unknown()).optional().describe(
        `Optional JSON body for control actions that need additional data.
        For setLogLevel: { loggerName: "org-apache-synapse", loggingLevel: "DEBUG" }`
    ),
});

/**
 * Creates the server_management tool
 */
export function createServerManagementTool(execute: ServerManagementExecuteFn) {
    return (tool as any)({
        description: `Manage the MI runtime server and query/control deployed artifacts via Management API.
            - run: Syncs configs, copies libs, starts server, waits until ready.
            - stop: Graceful shutdown (force kill after 8s timeout).
            - status: Check if server is running and ready.
            - query: List or inspect deployed artifacts (APIs, proxies, endpoints, sequences, connectors, etc.). Requires artifact_type.
            - control: Activate/deactivate artifacts, enable/disable tracing/statistics, trigger tasks, set log levels, restart server. Requires artifact_type + control_action.
            Server must be running for query/control actions.`,
        inputSchema: serverManagementInputSchema,
        execute
    });
}
