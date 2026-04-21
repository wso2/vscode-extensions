/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as vscode from 'vscode';
import * as net from 'net';
import * as http from 'http';
import * as child_process from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { MockServerStatus, MockServerConfig, MockServerTool, MockServerRuntimeState } from '@wso2/api-designer-core';
import { logInfo, logError, logDebug } from '../util/logger';
import {
    isDockerAvailable,
    isDockerDaemonRunning,
    buildAIGeneratedDockerCommand,
    buildPrismDockerCommand,
    buildMokapiDockerCommand,
    stopDockerContainer,
    extractContainerId
} from './docker-utils';

const exec = promisify(child_process.exec);

/**
 * Manager for mock server operations
 */
export class MockServerManager {
    private static instance: MockServerManager;
    // Track servers by filePath for independent management per spec
    private runningServers: Map<string, { 
        terminal?: vscode.Terminal; // Optional for Docker-based servers
        containerId?: string; // Docker container ID
        config: MockServerConfig; 
        filePath: string;
        startTime: number;
        verificationTimer?: NodeJS.Timeout; // Timer for verifying server actually started
        isVerified?: boolean; // Whether server has been verified as running
        useDocker?: boolean; // Whether this server is running in Docker
        runtimeState: MockServerRuntimeState; // Current runtime state
        lastStateChange: number; // Timestamp of last state change
    }> = new Map<string, {
        terminal?: vscode.Terminal;
        containerId?: string;
        config: MockServerConfig;
        filePath: string;
        startTime: number;
        verificationTimer?: NodeJS.Timeout;
        isVerified?: boolean;
        useDocker?: boolean;
        runtimeState: MockServerRuntimeState;
        lastStateChange: number;
    }>();
    // Also maintain port-to-filePath mapping for quick lookups
    private portToFilePath: Map<number, string> = new Map();

    private constructor() {}

    public static getInstance(): MockServerManager {
        if (!MockServerManager.instance) {
            MockServerManager.instance = new MockServerManager();
        }
        return MockServerManager.instance;
    }

    /**
     * Check if a port is available (not in use)
     */
    public async isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.once('error', () => {
                // Port is in use
                resolve(false);
            });

            server.once('listening', () => {
                server.close();
                // Port is available
                resolve(true);
            });

            // Try both localhost and 0.0.0.0
            server.listen(port, '0.0.0.0');
        });
    }

    /**
     * Check if a server is actually responding on a port
     * This is critical to verify the server is actually running, not just that the port is in use
     * Uses both TCP connection check and HTTP request for better reliability
     */
    public async isServerResponding(port: number, host: string = 'localhost'): Promise<boolean> {
        // First try TCP connection check (fastest)
        const tcpCheck = await new Promise<boolean>((resolve) => {
            const socket = new net.Socket();
            const timeout = 2000; // 2 second timeout

            socket.setTimeout(timeout);
            
            socket.once('connect', () => {
                socket.destroy();
                resolve(true);
            });

            socket.once('error', () => {
                socket.destroy();
                resolve(false);
            });

            socket.once('timeout', () => {
                socket.destroy();
                resolve(false);
            });

            const connectHost = host === 'localhost' ? '127.0.0.1' : host;
            try {
                socket.connect(port, connectHost);
            } catch {
                socket.destroy();
                resolve(false);
            }
        });

        // If TCP check passes, server is definitely running
        if (tcpCheck) {
            return true;
        }

        // TCP check failed - try HTTP request as fallback
        // Some servers might not accept raw TCP but respond to HTTP
        try {
            const url = `http://${host}:${port}`;
            
            return new Promise<boolean>((resolve) => {
                const req = http.get(url, { timeout: 2000 }, (res: any) => {
                    // Got a response - server is running
                    res.on('data', () => {}); // Consume response
                    res.on('end', () => resolve(true));
                });

                req.on('error', () => {
                    resolve(false);
                });

                req.on('timeout', () => {
                    req.destroy();
                    resolve(false);
                });

                req.setTimeout(2000);
            });
        } catch {
            // HTTP check failed - assume not responding
            return false;
        }
    }

    /**
     * Find an available port starting from the preferred port
     */
    public async findAvailablePort(preferredPort: number = 4010): Promise<number> {
        let port = preferredPort;
        const maxAttempts = 100;

        for (let i = 0; i < maxAttempts; i++) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
            port++;
        }

        throw new Error(`Could not find an available port after ${maxAttempts} attempts`);
    }

    /**
     * Normalize file path for consistent matching
     */
    private normalizeFilePath(filePath: string): string {
        // Normalize to handle different path formats (file://, absolute paths, etc.)
        try {
            // Remove file:// protocol if present
            let normalized = filePath.replace(/^file:\/\//, '');
            // Convert to absolute path if needed
            if (path.isAbsolute(normalized)) {
                return normalized;
            }
            return filePath;
        } catch {
            return filePath;
        }
    }

    /**
     * Check if a mock server is running for a specific file path
     */
    public async checkServerStatusByFilePath(filePath: string): Promise<MockServerStatus> {
        const normalizedPath = this.normalizeFilePath(filePath);
        
        // Try exact match first
        let serverInfo = this.runningServers.get(normalizedPath);
        
        // If not found, try to find by comparing normalized paths
        if (!serverInfo) {
            for (const [key, value] of this.runningServers.entries()) {
                if (this.normalizeFilePath(key) === normalizedPath) {
                    serverInfo = value;
                    break;
                }
            }
        }
        
        if (!serverInfo) {
            return {
                isRunning: false,
                state: 'stopped'
            };
        }

        const port = serverInfo.config.port;
        const host = serverInfo.config.host || 'localhost';
        
        // Return status with current state
        const getStatusMessage = (state: MockServerRuntimeState): string => {
            switch (state) {
                case 'starting':
                    return 'Starting mock server...';
                case 'pulling-image':
                    return 'Pulling Docker image (this may take a few minutes)...';
                case 'container-starting':
                    return 'Starting container...';
                case 'app-starting':
                    return 'Starting mock server application...';
                case 'running':
                    return 'Mock server running';
                case 'failed':
                    return 'Mock server failed to start. Check the terminal for errors.';
                case 'stopped':
                    return 'Mock server stopped';
                default:
                    return 'Unknown status';
            }
        };
        
        // Check if server is still active (Docker container or terminal)
        if (serverInfo.useDocker) {
            // For Docker containers, check container status immediately
            let containerId = serverInfo.containerId;
            
            // If we don't have container ID yet, try to find it
            if (!containerId) {
                const namePatterns = [
                    `mock-server-${port}-`,
                    `prism-mock-${port}-`,
                    `mokapi-${port}-`
                ];
                
                for (const pattern of namePatterns) {
                    try {
                        const { stdout } = await exec(`docker ps --filter "name=${pattern}" --format "{{.ID}}" --no-trunc`);
                        const foundId = stdout.trim().split('\n')[0];
                        if (foundId && foundId.length >= 12) {
                            containerId = foundId;
                            serverInfo.containerId = containerId; // Cache it
                            break;
                        }
                    } catch {
                        continue;
                    }
                }
            }
            
            if (containerId) {
                // Check if container is running
                try {
                    const { stdout: psOutput } = await exec(`docker ps --filter id=${containerId} --format "{{.ID}}"`);
                    if (!psOutput.trim()) {
                        // Container stopped, clean up
                        this.runningServers.delete(normalizedPath);
                        this.portToFilePath.delete(port);
                        logInfo(`Docker container stopped for ${normalizedPath}, marking server as stopped`);
                        return {
                            isRunning: false,
                            state: 'stopped'
                        };
                    }
                    
                    // Container is running - check current state and update accordingly
                    // Only check HTTP/TCP if we're past the pulling/container-starting phase
                    const currentState = serverInfo.runtimeState;
                    if (currentState === 'pulling-image' || currentState === 'container-starting') {
                        // Don't check ports while pulling or container starting
                        return {
                            isRunning: false,
                            state: currentState,
                            message: getStatusMessage(currentState)
                        };
                    }
                    
                    // Check if server is responding (only for app-starting or running states)
                    const isResponding = await this.isServerResponding(port, host);
                    if (isResponding) {
                        // Server is running and responding
                        if (currentState !== 'running') {
                            serverInfo.runtimeState = 'running';
                            serverInfo.lastStateChange = Date.now();
                        }
                        if (!serverInfo.isVerified) {
                            serverInfo.isVerified = true;
                            this.portToFilePath.set(port, normalizedPath);
                            logInfo(`[MockServerManager] Server on port ${port} for ${normalizedPath} verified as running (via status check)`);
                        }
                        return {
                            isRunning: true,
                            state: 'running',
                            message: getStatusMessage('running'),
                            port: port,
                            tool: serverInfo.config.tool,
                            specType: serverInfo.config.specType,
                            url: `http://${host}:${port}`
                        };
                    } else {
                        // Container running but server not responding yet
                        const updatedState = serverInfo.runtimeState;
                        // Move to app-starting if we're still in starting/container-starting phase
                        if (updatedState === 'starting' || updatedState === 'container-starting' || updatedState === 'pulling-image') {
                            serverInfo.runtimeState = 'app-starting';
                            serverInfo.lastStateChange = Date.now();
                        }
                        return {
                            isRunning: false,
                            state: serverInfo.runtimeState,
                            message: getStatusMessage(serverInfo.runtimeState)
                        };
                    }
                } catch {
                    // Container check failed, clean up
                    this.runningServers.delete(normalizedPath);
                    this.portToFilePath.delete(port);
                    logInfo(`Docker container check failed for ${normalizedPath}, marking server as stopped`);
                    return {
                        isRunning: false,
                        state: 'stopped'
                    };
                }
            } else {
                // No container ID found yet - might still be starting (e.g., pulling image)
                // Check current state - if we're pulling, that's expected
                if (serverInfo.runtimeState === 'pulling-image' || serverInfo.runtimeState === 'starting') {
                    return {
                        isRunning: false,
                        state: serverInfo.runtimeState,
                        message: getStatusMessage(serverInfo.runtimeState)
                    };
                }
                // Otherwise, not found yet but might still be starting
                return {
                    isRunning: false,
                    state: serverInfo.runtimeState || 'starting',
                    message: getStatusMessage(serverInfo.runtimeState || 'starting')
                };
            }
        } else if (serverInfo.terminal && serverInfo.terminal.exitStatus !== undefined) {
            // Terminal was closed, clean up
            this.runningServers.delete(normalizedPath);
            this.portToFilePath.delete(port);
            logInfo(`Terminal closed for ${normalizedPath}, marking server as stopped`);
            return {
                isRunning: false
            };
        }
        
        // For non-Docker servers, check if server has been verified as running
        // If verification hasn't completed yet, check if it's still in verification period
        const timeSinceStart = Date.now() - serverInfo.startTime;
        const MAX_VERIFICATION_TIME = 3000 + (3 * 2000); // Initial delay + max retries (9 seconds total)
        
        if (!serverInfo.isVerified) {
            // Server hasn't been verified yet
            if (timeSinceStart < MAX_VERIFICATION_TIME) {
                // Still in verification period - show as starting (not running yet)
                logInfo(`[MockServerManager] Server on port ${port} for ${normalizedPath} is still being verified...`);
                return {
                    isRunning: false // Don't show as running until verified
                };
            } else {
                // Verification period passed but not verified - server likely failed
                logInfo(`[MockServerManager] Server on port ${port} for ${normalizedPath} verification period passed but not verified - cleaning up`);
                // Clear timer if exists
                if (serverInfo.verificationTimer) {
                    clearTimeout(serverInfo.verificationTimer);
                }
                this.runningServers.delete(normalizedPath);
                this.portToFilePath.delete(port);
                return {
                    isRunning: false
                };
            }
        }
        
        // Server has been verified - give it a grace period before checking connection again
        // This allows servers time to fully start up
        const GRACE_PERIOD = 10000; // 10 seconds
        
        // If server just started, trust terminal state and don't check connection yet
        if (timeSinceStart < GRACE_PERIOD) {
            const remainingSeconds = Math.round((GRACE_PERIOD - timeSinceStart) / 1000);
            logInfo(`[MockServerManager] Server on port ${port} for ${normalizedPath} is in grace period (${remainingSeconds}s remaining)`);
            return {
                isRunning: true,
                port,
                tool: serverInfo.config.tool,
                specType: serverInfo.config.specType,
                startTime: serverInfo.startTime,
                url: `http://${host}:${port}`
            };
        }
        
        // After grace period, verify the server is actually responding on the port
        // This is critical: a server might have crashed but the terminal is still open
        logInfo(`[MockServerManager] Checking if server on port ${port} is responding (after grace period)...`);
        const isResponding = await this.isServerResponding(port, host);
        
        if (!isResponding) {
            // Server is not responding even though terminal is open
            // This means the server likely crashed or failed to start
            // Clean up the tracking and mark as not running
            logInfo(`[MockServerManager] Server on port ${port} for ${normalizedPath} is not responding after grace period, cleaning up stale entry`);
            this.runningServers.delete(normalizedPath);
            this.portToFilePath.delete(port);
            return {
                isRunning: false
            };
        }
        
        // Server is tracked, terminal is active, AND server is responding on the port
        logInfo(`[MockServerManager] Server on port ${port} for ${normalizedPath} is running and responding`);
        return {
            isRunning: true,
            port,
            tool: serverInfo.config.tool,
            specType: serverInfo.config.specType,
            startTime: serverInfo.startTime,
            url: `http://${host}:${port}`
        };
    }

    /**
     * Check if a mock server is running on a specific port
     * Uses filePath-based tracking only
     */
    public async checkServerStatus(port: number): Promise<MockServerStatus> {
        const filePath = this.portToFilePath.get(port);
        
        if (filePath) {
            return this.checkServerStatusByFilePath(filePath);
        }
        
        // Server not tracked - return not running
            return {
            isRunning: false
        };
    }

    /**
     * Start a mock server using Docker
     */
    public async startServerWithDocker(
        dockerCommand: string,
        config: MockServerConfig,
        filePath: string,
        workspaceRoot: string
    ): Promise<{ containerId: string; port: number; url: string }> {
        // Check Docker availability with user-friendly error messages
        if (!(await isDockerAvailable())) {
            const errorMessage = 'Docker is not installed. Please install Docker to use mock servers.\n\n' +
                'Installation:\n' +
                '• Windows/Mac: Download Docker Desktop from https://www.docker.com/products/docker-desktop\n' +
                '• Linux: Follow instructions at https://docs.docker.com/engine/install/\n\n' +
                'After installation, restart VS Code and try again.';
            throw new Error(errorMessage);
        }

        // Check if Docker daemon is running, but don't block if check fails
        // Let Docker itself handle the error when we try to run the command
        const daemonRunning = await isDockerDaemonRunning();
        if (!daemonRunning) {
            logInfo('Docker daemon check failed, but proceeding anyway - Docker will report the actual error if daemon is not running');
            // Don't throw error here - let Docker command execution handle it
            // This allows the command to run and show the actual Docker error
        }

        const port = config.port;
        const normalizedPath = this.normalizeFilePath(filePath);

        // Check if port is available
        const isAvailable = await this.isPortAvailable(port);
        if (!isAvailable) {
            const existingFilePath = this.portToFilePath.get(port);
            if (existingFilePath && existingFilePath !== normalizedPath) {
                const otherServerStatus = await this.checkServerStatusByFilePath(existingFilePath);
                if (otherServerStatus.isRunning) {
                    throw new Error(`Port ${port} is already in use by another API spec. Please choose a different port.`);
                } else {
                    this.portToFilePath.delete(port);
                }
            } else {
                throw new Error(`Port ${port} is already in use by another process. Please choose a different port.`);
            }
        }

        // Execute Docker command in a visible terminal
        try {
            // Create a terminal to run the Docker command
            const fileName = path.basename(filePath);
            const terminalName = `Mock Server: ${fileName} (${config.tool}) - Port ${port}`;
            const terminal = vscode.window.createTerminal({
                name: terminalName,
                cwd: workspaceRoot
            });

            // Show terminal
            terminal.show();

            // Run the Docker command in the terminal
            // The container ID will be printed to the terminal, but we'll also capture it
            // by checking running containers after the command executes
            terminal.sendText(dockerCommand);
            
            const startTime = Date.now();
            
            // Store server info with terminal reference
            const serverInfo = {
                terminal,
                containerId: undefined as string | undefined, // Will be set after container starts
                config,
                filePath: normalizedPath,
                startTime,
                verificationTimer: undefined as NodeJS.Timeout | undefined,
                isVerified: false,
                useDocker: true,
                runtimeState: 'starting' as MockServerRuntimeState,
                lastStateChange: startTime
            };

            this.runningServers.set(normalizedPath, serverInfo);
            
            // State-based verification with progress tracking
            // Replace fixed attempt limits with progress-based timeout
            const MAX_NO_PROGRESS_TIME = 120_000; // 2 minutes without state change = failure
            const INITIAL_VERIFICATION_DELAY = 500; // Start checking after 500ms
            const FAST_POLL_INTERVAL = 500; // Fast polling while pulling/starting (500ms)
            const NORMAL_POLL_INTERVAL = 1000; // Normal polling (1s)
            const SLOW_POLL_INTERVAL = 2000; // Slower polling (2s)

            let retryCount = 0;
            
            // Helper function to check container logs for state indicators
            const checkContainerLogsForState = async (containerId: string, tool: string): Promise<{
                isPulling: boolean;
                isStarting: boolean;
                isReady: boolean;
            }> => {
                try {
                    const { stdout } = await exec(`docker logs --tail 50 ${containerId} 2>&1`);
                    const logs = stdout.toLowerCase();
                    
                    // Detect image pulling
                    const isPulling = logs.includes('unable to find image') || 
                                     logs.includes('pulling from') || 
                                     logs.includes('downloading') || 
                                     logs.includes('extracting') ||
                                     logs.includes('pull complete') === false && logs.includes('pulling');
                    
                    // Check for startup indicators based on tool type
                    let isReady = false;
                    if (tool === 'prism' || tool === 'PRISM') {
                        isReady = logs.includes('prism is listening') || logs.includes('listening on');
                    } else if (tool === 'ai-generated-js' || tool === 'AI_GENERATED_JS') {
                        isReady = logs.includes('listening on') || logs.includes('server started') || logs.includes('server running');
                    } else if (tool === 'mokapi' || tool === 'MOKAPI') {
                        isReady = logs.includes('mokapi') || logs.includes('listening') || logs.includes('started') || logs.includes('server running');
                    } else {
                        // Generic check
                        isReady = logs.includes('listening') || logs.includes('started') || logs.includes('running');
                    }
                    
                    // If container has logs but not ready, it's starting
                    const isStarting = !isPulling && !isReady && logs.length > 0;
                    
                    return { isPulling, isStarting, isReady };
                } catch {
                    return { isPulling: false, isStarting: false, isReady: false };
                }
            };
            
            // Helper function to find container ID
            const findContainerId = async (): Promise<string | undefined> => {
                const currentServerInfo = this.runningServers.get(normalizedPath);
                if (!currentServerInfo) {
                    return undefined;
                }
                
                // First, try using container ID if we have it
                if (currentServerInfo.containerId && currentServerInfo.containerId.length >= 12) {
                    try {
                        const result = await exec(`docker ps --filter id=${currentServerInfo.containerId} --format "{{.ID}}"`);
                        if (result.stdout.trim()) {
                            return currentServerInfo.containerId;
                        }
                    } catch {
                        // Container ID might be invalid, try name patterns
                    }
                }
                
                // If not found by ID, try name patterns (supports all mock server types)
                const namePatterns = [
                    `mock-server-${port}-`,
                    `prism-mock-${port}-`,
                    `mokapi-${port}-`
                ];
                
                for (const pattern of namePatterns) {
                    try {
                        const result = await exec(`docker ps --filter "name=${pattern}" --format "{{.ID}}" --no-trunc`);
                        const output = result.stdout.trim();
                        if (output) {
                            const foundId = output.split('\n')[0];
                            if (foundId && foundId.length >= 12) {
                                // Update container ID if we found it
                                if (!currentServerInfo.containerId) {
                                    currentServerInfo.containerId = foundId;
                                    logInfo(`[MockServerManager] Container ID captured: ${foundId.substring(0, 12)}`);
                                }
                                return foundId;
                            }
                        }
                    } catch {
                        // Try next pattern
                        continue;
                    }
                }
                
                return undefined;
            };
            
            const attemptVerification = async () => {
                const currentServerInfo = this.runningServers.get(normalizedPath);
                if (!currentServerInfo) {
                    return;
                }

                try {
                    // Check for no progress timeout (2 minutes without state change)
                    const timeSinceLastStateChange = Date.now() - currentServerInfo.lastStateChange;
                    if (timeSinceLastStateChange > MAX_NO_PROGRESS_TIME) {
                        logInfo(`[MockServerManager] No progress for ${normalizedPath} after ${MAX_NO_PROGRESS_TIME}ms, marking as failed`);
                        currentServerInfo.runtimeState = 'failed';
                        currentServerInfo.lastStateChange = Date.now();
                        // Don't clean up - let status check show the failed state
                        if (currentServerInfo.verificationTimer) {
                            clearTimeout(currentServerInfo.verificationTimer);
                            currentServerInfo.verificationTimer = undefined;
                        }
                        return;
                    }

                    // Step 1: Find container ID
                    const containerId = await findContainerId();
                    
                    if (!containerId) {
                        // Container not found - check if we're in pulling state
                        if (currentServerInfo.runtimeState === 'pulling-image' || currentServerInfo.runtimeState === 'starting') {
                            // Still pulling/starting - continue checking
                            const pollInterval = currentServerInfo.runtimeState === 'pulling-image' 
                                ? SLOW_POLL_INTERVAL 
                                : FAST_POLL_INTERVAL;
                            serverInfo.verificationTimer = setTimeout(attemptVerification, pollInterval);
                            return;
                        } else {
                            // Container not found and not pulling - might have failed
                            // But don't give up immediately - could be Docker daemon delay
                            if (timeSinceLastStateChange < 5000) {
                                // Less than 5 seconds since last change - keep checking
                                serverInfo.verificationTimer = setTimeout(attemptVerification, FAST_POLL_INTERVAL);
                                return;
                            } else {
                                // No container found after reasonable time - mark as failed
                                logInfo(`[MockServerManager] Docker container for ${normalizedPath} not found (check terminal for details)`);
                                currentServerInfo.runtimeState = 'failed';
                                currentServerInfo.lastStateChange = Date.now();
                                if (currentServerInfo.verificationTimer) {
                                    clearTimeout(currentServerInfo.verificationTimer);
                                    currentServerInfo.verificationTimer = undefined;
                                }
                                return;
                            }
                        }
                    }
                    
                    // Update container ID in server info
                    if (!currentServerInfo.containerId) {
                        currentServerInfo.containerId = containerId;
                        // Container found - move to container-starting state
                        if (currentServerInfo.runtimeState === 'starting' || currentServerInfo.runtimeState === 'pulling-image') {
                            currentServerInfo.runtimeState = 'container-starting';
                            currentServerInfo.lastStateChange = Date.now();
                        }
                    }
                    
                    // Step 2: Check container logs for state indicators
                    const logState = await checkContainerLogsForState(containerId, config.tool);
                    
                    // Update state based on logs (logs are hints, not definitive)
                    if (logState.isPulling && currentServerInfo.runtimeState !== 'pulling-image') {
                        currentServerInfo.runtimeState = 'pulling-image';
                        currentServerInfo.lastStateChange = Date.now();
                        // Don't check ports while pulling
                        serverInfo.verificationTimer = setTimeout(attemptVerification, SLOW_POLL_INTERVAL);
                        return;
                    }
                    
                    if (logState.isPulling) {
                        // Still pulling - don't check ports
                        serverInfo.verificationTimer = setTimeout(attemptVerification, SLOW_POLL_INTERVAL);
                        return;
                    }
                    
                    // Not pulling anymore - move to container-starting if needed
                    if (currentServerInfo.runtimeState === 'pulling-image') {
                        currentServerInfo.runtimeState = 'container-starting';
                        currentServerInfo.lastStateChange = Date.now();
                    }
                    
                    // Step 3: Check if container is running
                    try {
                        const { stdout: containerStatus } = await exec(`docker ps --filter id=${containerId} --format "{{.Status}}"`);
                        const isContainerRunning = containerStatus.trim().length > 0 && !containerStatus.includes('Exited');
                        
                        if (!isContainerRunning) {
                            // Container exited/crashed
                            logInfo(`[MockServerManager] Docker container for ${normalizedPath} exited (check terminal for details)`);
                            currentServerInfo.runtimeState = 'failed';
                            currentServerInfo.lastStateChange = Date.now();
                            if (currentServerInfo.verificationTimer) {
                                clearTimeout(currentServerInfo.verificationTimer);
                                currentServerInfo.verificationTimer = undefined;
                            }
                            return;
                        }
                        
                        // Container is running - move to app-starting if needed
                        const stateAfterContainerCheck: MockServerRuntimeState = currentServerInfo.runtimeState;
                        if (stateAfterContainerCheck === 'container-starting') {
                            currentServerInfo.runtimeState = 'app-starting';
                            currentServerInfo.lastStateChange = Date.now();
                        }
                    } catch {
                        // Error checking container - assume still starting
                        serverInfo.verificationTimer = setTimeout(attemptVerification, NORMAL_POLL_INTERVAL);
                        return;
                    }
                    
                    // Step 4: Only check HTTP/TCP if we're past pulling/container-starting
                    // This is the ONLY definitive check for "running" state
                    // Get fresh state value directly from object to avoid type narrowing issues
                    const stateBeforePortCheck = currentServerInfo.runtimeState as MockServerRuntimeState;
                    if (stateBeforePortCheck === 'pulling-image' || stateBeforePortCheck === 'container-starting') {
                        // Don't check ports yet
                        serverInfo.verificationTimer = setTimeout(attemptVerification, FAST_POLL_INTERVAL);
                        return;
                    }
                    
                    // Now check if server is responding (only for app-starting or running states)
                    const isResponding = await this.isServerResponding(port, config.host || 'localhost');
                    
                    if (isResponding) {
                        // Server is responding - this is the ONLY way to confirm "running"
                        if (currentServerInfo.runtimeState !== 'running') {
                            currentServerInfo.runtimeState = 'running';
                            currentServerInfo.lastStateChange = Date.now();
                        }
                        this.portToFilePath.set(port, normalizedPath);
                        logInfo(`[MockServerManager] Docker server for ${normalizedPath} verified as running on port ${port}`);
                        currentServerInfo.isVerified = true;
                        if (currentServerInfo.verificationTimer) {
                            clearTimeout(currentServerInfo.verificationTimer);
                            currentServerInfo.verificationTimer = undefined;
                        }
                    } else {
                        // Not responding yet - keep checking
                        if (logState.isReady && currentServerInfo.runtimeState !== 'app-starting') {
                            // Logs say ready but HTTP not responding - might be starting
                            currentServerInfo.runtimeState = 'app-starting';
                            currentServerInfo.lastStateChange = Date.now();
                        }
                        serverInfo.verificationTimer = setTimeout(attemptVerification, NORMAL_POLL_INTERVAL);
                    }
                } catch (error: any) {
                    logInfo(`[MockServerManager] Error during verification:`, error?.message || String(error));
                    // Continue checking unless we've exceeded no-progress timeout
                    const timeSinceLastStateChange = Date.now() - currentServerInfo.lastStateChange;
                    if (timeSinceLastStateChange < MAX_NO_PROGRESS_TIME) {
                        serverInfo.verificationTimer = setTimeout(attemptVerification, NORMAL_POLL_INTERVAL);
                    } else {
                        currentServerInfo.runtimeState = 'failed';
                        currentServerInfo.lastStateChange = Date.now();
                        if (currentServerInfo.verificationTimer) {
                            clearTimeout(currentServerInfo.verificationTimer);
                            currentServerInfo.verificationTimer = undefined;
                        }
                    }
                }
            };

            serverInfo.verificationTimer = setTimeout(attemptVerification, INITIAL_VERIFICATION_DELAY);

            const url = `http://${config.host || 'localhost'}:${port}`;
            logInfo(`Docker mock server command executed in terminal for ${filePath} on ${url}`);

            // Return with a placeholder container ID (will be updated after container starts)
            // The actual container ID will be captured in the setTimeout callback above
            const placeholderContainerId = `pending-${Date.now()}`;
            return { containerId: placeholderContainerId, port, url };
        } catch (error: any) {
            logError(`Failed to start Docker mock server:`, error);
            throw new Error(`Failed to start Docker container: ${error.message || 'Unknown error'}`);
        }
    }

    /**
     * Start a mock server in a VS Code terminal (non-Docker - kept for backward compatibility)
     */
    public async startServer(
        command: string,
        config: MockServerConfig,
        filePath: string,
        workspaceRoot: string
    ): Promise<{ terminal: vscode.Terminal; port: number; url: string }> {
        const port = config.port;
        
        // Normalize file path for consistent tracking
        const normalizedPath = this.normalizeFilePath(filePath);
        
        // Check if there's already a server tracked for this file path
        let existingServer = this.runningServers.get(normalizedPath);
        
        // If not found, try to find by comparing normalized paths
        if (!existingServer) {
            for (const [key, value] of this.runningServers.entries()) {
                if (this.normalizeFilePath(key) === normalizedPath) {
                    existingServer = value;
                    break;
                }
            }
        }
        
        if (existingServer) {
            // Check if server is still active
            if (existingServer.useDocker && existingServer.containerId) {
                // Docker container - check if it's still running
                try {
                    const { stdout } = await exec(`docker ps --filter id=${existingServer.containerId} --format "{{.ID}}"`);
                    if (stdout.trim()) {
                        // Container is running - verify server is responding
                        const isResponding = await this.isServerResponding(port, existingServer.config.host || 'localhost');
                        if (isResponding) {
                            throw new Error(`A mock server is already running for this API spec on port ${port}. Please stop it first.`);
                        }
                    }
                } catch {
                    // Container not found or error - clean up stale entry
                    logInfo(`Cleaning up stale Docker container entry for ${normalizedPath}`);
                    this.runningServers.delete(normalizedPath);
                    this.portToFilePath.delete(port);
                }
            } else if (existingServer.terminal && existingServer.terminal.exitStatus === undefined) {
                // Terminal is open - verify server is responding
                const isResponding = await this.isServerResponding(port, existingServer.config.host || 'localhost');
                if (isResponding) {
                    throw new Error(`A mock server is already running for this API spec on port ${port}. Please stop it first.`);
                } else {
                    // Terminal is open but server is not responding - clean up stale entry
                    logInfo(`Cleaning up stale server entry for ${normalizedPath} - terminal open but server not responding`);
                    this.runningServers.delete(normalizedPath);
                    this.portToFilePath.delete(port);
                }
            } else {
                // Terminal was closed - clean up stale entry
                logInfo(`Cleaning up stale server entry for ${normalizedPath} - terminal was closed`);
                this.runningServers.delete(normalizedPath);
                this.portToFilePath.delete(port);
            }
        }
        
        // Check if port is actually available (not in use by any process)
        // This prevents starting a server on a port that's already in use
        const isAvailable = await this.isPortAvailable(port);
        if (!isAvailable) {
            // Port is in use - check if it's by another tracked server
            const existingFilePath = this.portToFilePath.get(port);
            if (existingFilePath && existingFilePath !== normalizedPath) {
                // Verify the other server is actually running
                const otherServerStatus = await this.checkServerStatusByFilePath(existingFilePath);
                if (otherServerStatus.isRunning) {
                    throw new Error(`Port ${port} is already in use by another API spec (${existingFilePath}). Please choose a different port.`);
                } else {
                    // Other server is tracked but not running - clean it up
                    logInfo(`Cleaning up stale port mapping for port ${port}`);
                    this.portToFilePath.delete(port);
                }
            } else {
                // Port is in use by an untracked process
                throw new Error(`Port ${port} is already in use by another process. Please choose a different port.`);
            }
        }

        // Create terminal with file path in name for clarity
        const fileName = path.basename(filePath);
        const terminalName = `Mock Server: ${fileName} (${config.tool}) - Port ${port}`;
        const terminal = vscode.window.createTerminal({
            name: terminalName,
            cwd: workspaceRoot
        });

        // Show terminal
        terminal.show();

        // Send command
        terminal.sendText(command);

        const startTime = Date.now();
        
        // Store server info by normalized filePath (normalizedPath already declared above)
        const serverInfo = {
            terminal,
            config,
            filePath: normalizedPath,
            startTime,
            verificationTimer: undefined as NodeJS.Timeout | undefined,
            isVerified: false, // Not verified yet - will be set to true after verification succeeds
            useDocker: false,
            runtimeState: 'starting' as MockServerRuntimeState,
            lastStateChange: startTime
        };
        
        this.runningServers.set(normalizedPath, serverInfo);
        
        // DON'T map port yet - wait until verification succeeds
        // This prevents false positives when port is already in use by another server

        // Verify server actually started after a delay with retries
        // This catches cases where the command fails (e.g., port in use, file not found)
        // Some servers (especially AI-generated or Prism with large specs) may take longer to start
        const INITIAL_VERIFICATION_DELAY = 3000; // 3 seconds initial delay
        const RETRY_INTERVAL = 2000; // 2 seconds between retries
        const MAX_RETRIES = 3; // Try up to 3 more times (total ~9 seconds)
        
        let retryCount = 0;
        
        const attemptVerification = async () => {
            const currentServerInfo = this.runningServers.get(normalizedPath);
            if (!currentServerInfo) {
                // Already cleaned up
                return;
            }

            // Check if server failed (Docker container stopped or terminal closed)
            if (currentServerInfo.useDocker && currentServerInfo.containerId) {
                // Check Docker container
                try {
                    const { stdout: psOutput } = await exec(`docker ps --filter id=${currentServerInfo.containerId} --format "{{.ID}}"`);
                    if (!psOutput.trim()) {
                        logInfo(`[MockServerManager] Docker container for ${normalizedPath} stopped immediately`);
                        if (currentServerInfo.verificationTimer) {
                            clearTimeout(currentServerInfo.verificationTimer);
                        }
                        this.runningServers.delete(normalizedPath);
                        this.portToFilePath.delete(port);
                        return;
                    }
                } catch {
                    logInfo(`[MockServerManager] Docker container for ${normalizedPath} not found`);
                    if (currentServerInfo.verificationTimer) {
                        clearTimeout(currentServerInfo.verificationTimer);
                    }
                    this.runningServers.delete(normalizedPath);
                    this.portToFilePath.delete(port);
                    return;
                }
            } else if (currentServerInfo.terminal && currentServerInfo.terminal.exitStatus !== undefined) {
                // Terminal was closed (server failed immediately)
                logInfo(`[MockServerManager] Server for ${normalizedPath} failed to start - terminal closed immediately`);
                // Clear the timer
                if (currentServerInfo.verificationTimer) {
                    clearTimeout(currentServerInfo.verificationTimer);
                }
                this.runningServers.delete(normalizedPath);
                this.portToFilePath.delete(port);
                return;
            }

            // Verify server is actually responding
            // Check if port is already mapped to another server (meaning our server failed to bind)
            const existingPortFilePath = this.portToFilePath.get(port);
            if (existingPortFilePath && existingPortFilePath !== normalizedPath) {
                // Port is already mapped to a different server - our server failed to start
                logInfo(`[MockServerManager] Server for ${normalizedPath} failed to start - port ${port} is already in use by ${existingPortFilePath}`);
                // Clear the timer
                if (currentServerInfo.verificationTimer) {
                    clearTimeout(currentServerInfo.verificationTimer);
                }
                this.runningServers.delete(normalizedPath);
                return;
            }
            
            // Verify server is responding on the port
            const isResponding = await this.isServerResponding(port, config.host || 'localhost');
            if (!isResponding) {
                if (retryCount < MAX_RETRIES) {
                    // Retry after a delay
                    retryCount++;
                    logInfo(`[MockServerManager] Server for ${normalizedPath} not responding yet (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), retrying in ${RETRY_INTERVAL}ms...`);
                    serverInfo.verificationTimer = setTimeout(attemptVerification, RETRY_INTERVAL);
                    return;
                } else {
                    // Max retries reached - server failed to start
                    logInfo(`[MockServerManager] Server for ${normalizedPath} failed to start - not responding after ${INITIAL_VERIFICATION_DELAY + (retryCount * RETRY_INTERVAL)}ms`);
                    // Server failed to start - clean up
                    // Clear the timer
                    if (currentServerInfo.verificationTimer) {
                        clearTimeout(currentServerInfo.verificationTimer);
                    }
                    this.runningServers.delete(normalizedPath);
                    // Port was never mapped, so no need to delete it
                    return;
                }
            } else {
                // Server is responding - verify port is not mapped to another server
                const finalPortFilePath = this.portToFilePath.get(port);
                if (finalPortFilePath && finalPortFilePath !== normalizedPath) {
                    // Port was mapped to another server while we were checking - our server didn't start
                    logInfo(`[MockServerManager] Server for ${normalizedPath} verification failed - port ${port} is used by ${finalPortFilePath}`);
                    if (currentServerInfo.verificationTimer) {
                        clearTimeout(currentServerInfo.verificationTimer);
                    }
                    this.runningServers.delete(normalizedPath);
                    return;
                }
                
                // Server is verified as running - NOW map the port to this file path
                this.portToFilePath.set(port, normalizedPath);
                logInfo(`[MockServerManager] Server for ${normalizedPath} verified as running on port ${port} (after ${retryCount + 1} attempt(s))`);
                // Mark as verified and clear the timer
                currentServerInfo.isVerified = true;
                if (currentServerInfo.verificationTimer) {
                    clearTimeout(currentServerInfo.verificationTimer);
                    currentServerInfo.verificationTimer = undefined;
                }
            }
        };
        
        serverInfo.verificationTimer = setTimeout(attemptVerification, INITIAL_VERIFICATION_DELAY);

        // Listen for terminal closure
        vscode.window.onDidCloseTerminal((closedTerminal) => {
            if (closedTerminal === terminal) {
                // Clean up verification timer
                const currentServerInfo = this.runningServers.get(normalizedPath);
                if (currentServerInfo?.verificationTimer) {
                    clearTimeout(currentServerInfo.verificationTimer);
                }
                
                this.runningServers.delete(normalizedPath);
                this.portToFilePath.delete(port);
                logInfo(`Mock server for ${normalizedPath} (port ${port}) terminal closed`);
            }
        });

        const url = `http://${config.host || 'localhost'}:${port}`;
        logInfo(`Mock server command sent for ${filePath} on ${url} (verifying with retries up to ${INITIAL_VERIFICATION_DELAY + (MAX_RETRIES * RETRY_INTERVAL)}ms...)`);

        return { terminal, port, url };
    }

    /**
     * Stop a mock server by file path
     */
    public async stopServerByFilePath(filePath: string): Promise<boolean> {
        const normalizedPath = this.normalizeFilePath(filePath);
        
        // Try exact match first
        let serverInfo = this.runningServers.get(normalizedPath);
        
        // If not found, try to find by comparing normalized paths
        if (!serverInfo) {
            for (const [key, value] of this.runningServers.entries()) {
                if (this.normalizeFilePath(key) === normalizedPath) {
                    serverInfo = value;
                    // Update the key to normalized path for consistency
                    this.runningServers.delete(key);
                    this.runningServers.set(normalizedPath, value);
                    break;
                }
            }
        }
        
        if (!serverInfo) {
            logInfo(`No tracked server found for ${filePath} (normalized: ${normalizedPath})`);
            return false;
        }

        const port = serverInfo.config.port;

        try {
            // Clear verification timer if it exists
            if (serverInfo.verificationTimer) {
                clearTimeout(serverInfo.verificationTimer);
            }
            
            // Stop Docker container if using Docker
            if (serverInfo.useDocker) {
                // Try to stop by container ID first
                if (serverInfo.containerId && serverInfo.containerId.length >= 12) {
                    const stopped = await stopDockerContainer(serverInfo.containerId);
                    if (!stopped) {
                        logError(`Failed to stop Docker container ${serverInfo.containerId}`);
                    }
                } else {
                    // Try to stop by container name pattern
                    try {
                        const { stdout } = await exec(`docker ps --filter "name=mock-server-${port}-" --format "{{.ID}}" --no-trunc`);
                        const containerId = stdout.trim().split('\n')[0];
                        if (containerId) {
                            await stopDockerContainer(containerId);
                        }
                    } catch (error) {
                        logDebug('Could not find container to stop by name pattern:', error);
                    }
                }
                
                // Close the terminal (user can see what happened)
                if (serverInfo.terminal) {
                    // Don't dispose immediately - let user see the output
                    // Terminal will be cleaned up when VS Code closes or user closes it manually
                }
            } else if (serverInfo.terminal) {
            // Close the terminal (this will stop the process for non-Docker servers)
            serverInfo.terminal.dispose();
            }

            this.runningServers.delete(normalizedPath);
            this.portToFilePath.delete(port);
            logInfo(`Mock server for ${normalizedPath} (port ${port}) stopped`);
            return true;
        } catch (error) {
            logError(`Failed to stop mock server for ${normalizedPath}:`, error);
            return false;
        }
    }

    /**
     * Stop a mock server by port
     * Uses filePath-based tracking only
     */
    public async stopServer(port: number): Promise<boolean> {
        const filePath = this.portToFilePath.get(port);
        
        if (filePath) {
            return this.stopServerByFilePath(filePath);
        }
        
        // Server not tracked - cannot stop
        logInfo(`Cannot stop server on port ${port} - not tracked by filePath`);
        return false;
    }

    /**
     * Get all running servers
     */
    public getRunningServers(): Array<{ filePath: string; port: number; config: MockServerConfig; startTime: number }> {
        return Array.from(this.runningServers.entries()).map(([filePath, info]) => ({
            filePath,
            port: info.config.port,
            config: info.config,
            startTime: info.startTime
        }));
    }

    /**
     * Get server info for a specific file path
     */
    public getServerInfo(filePath: string): { port: number; config: MockServerConfig; startTime: number } | null {
        const normalizedPath = this.normalizeFilePath(filePath);
        
        // Try exact match first
        let serverInfo = this.runningServers.get(normalizedPath);
        
        // If not found, try to find by comparing normalized paths
        if (!serverInfo) {
            for (const [key, value] of this.runningServers.entries()) {
                if (this.normalizeFilePath(key) === normalizedPath) {
                    serverInfo = value;
                    break;
                }
            }
        }
        
        if (!serverInfo) {
            return null;
        }
        return {
            port: serverInfo.config.port,
            config: serverInfo.config,
            startTime: serverInfo.startTime
        };
    }

    /**
     * Stop all running servers
     */
    public async stopAllServers(): Promise<void> {
        const filePaths = Array.from(this.runningServers.keys());
        for (const filePath of filePaths) {
            await this.stopServerByFilePath(filePath);
        }
    }
}

