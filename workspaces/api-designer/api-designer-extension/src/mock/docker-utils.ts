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

import * as child_process from 'child_process';
import { promisify } from 'util';
import { logInfo, logError, logDebug } from '../util/logger';

const exec = promisify(child_process.exec);

/**
 * Check if Docker is installed and available
 */
export async function isDockerAvailable(): Promise<boolean> {
    try {
        const { stdout } = await exec('docker --version');
        logDebug(`Docker is available: ${stdout.trim()}`);
        return true;
    } catch (error) {
        logDebug('Docker is not available:', error);
        return false;
    }
}

/**
 * Check if Docker daemon is running
 * Uses multiple methods for reliability
 * Returns true optimistically if checks are inconclusive
 */
export async function isDockerDaemonRunning(): Promise<boolean> {
    // Method 1: Try docker ps (simpler, faster)
    try {
        const result = await exec('docker ps --format "{{.ID}}"', { timeout: 3000 });
        logDebug('Docker daemon is running (verified with docker ps)');
        return true;
    } catch (error: any) {
        const errorMsg = String(error.message || error.stderr || error.stdout || '');
        // Only return false if we get a clear "daemon not running" message
        if (errorMsg.includes('Cannot connect') || 
            errorMsg.includes('Is the docker daemon running') ||
            errorMsg.includes('ECONNREFUSED') ||
            errorMsg.includes('connection refused')) {
            logDebug('Docker daemon check: clear connection error detected');
            // Continue to try other methods
        } else {
            logDebug('docker ps had an error (may still be running):', errorMsg.substring(0, 100));
        }
    }
    
    // Method 2: Try docker version (lightweight, checks both client and server)
    try {
        const { stdout } = await exec('docker version --format "{{.Server.Version}}"', { timeout: 3000 });
        if (stdout && stdout.trim().length > 0) {
            logDebug('Docker daemon is running (verified with docker version)');
            return true;
        }
    } catch (error: any) {
        const errorMsg = String(error.message || error.stderr || '');
        if (errorMsg.includes('Cannot connect') || 
            errorMsg.includes('Is the docker daemon running') ||
            errorMsg.includes('ECONNREFUSED')) {
            logDebug('Docker daemon check: connection error in docker version');
            // Continue to try docker info
        } else {
            logDebug('docker version had an error (may still be running):', errorMsg.substring(0, 100));
        }
    }
    
    // Method 3: Try docker info (more comprehensive)
    try {
        const { stdout } = await exec('docker info', { timeout: 5000 });
        // Check for indicators that Docker is running
        if (stdout && (stdout.includes('Server Version') || stdout.includes('Server:') || stdout.includes('Containers:'))) {
            logDebug('Docker daemon is running (verified with docker info)');
            return true;
        }
    } catch (error: any) {
        const errorMsg = String(error.message || error.stderr || '');
        // Only return false if we get a clear connection error
        if (errorMsg.includes('Cannot connect') || 
            errorMsg.includes('Is the docker daemon running') ||
            errorMsg.includes('ECONNREFUSED') ||
            errorMsg.includes('connection refused')) {
            logDebug('Docker daemon is not running (all checks failed with connection errors)');
            return false;
        }
        logDebug('docker info had an error (but may still be running):', errorMsg.substring(0, 100));
    }
    
    // If we get here, checks were inconclusive - be optimistic and return true
    // The actual Docker command will fail with a clear error if daemon is not running
    logDebug('Docker daemon check inconclusive - assuming running (will verify when executing command)');
    return true;
}

/**
 * Get Docker version
 */
export async function getDockerVersion(): Promise<string | null> {
    try {
        const { stdout } = await exec('docker --version');
        return stdout.trim();
    } catch {
        return null;
    }
}

/**
 * Build Docker command for AI-generated mock server
 */
export function buildAIGeneratedDockerCommand(
    mockServerPath: string,
    workspaceDir: string,
    port: number,
    host: string,
    packageJsonContent?: string
): string {
    // Normalize paths for Docker (handle Windows paths)
    let normalizedWorkspaceDir = workspaceDir.replace(/\\/g, '/');
    let normalizedMockServerPath = mockServerPath.replace(/\\/g, '/');
    
    // Handle Windows drive letters (C: -> /c) for Docker Desktop on Windows
    if (normalizedWorkspaceDir.match(/^[A-Z]:/)) {
        normalizedWorkspaceDir = '/' + normalizedWorkspaceDir[0].toLowerCase() + normalizedWorkspaceDir.substring(2);
    }
    if (normalizedMockServerPath.match(/^[A-Z]:/)) {
        normalizedMockServerPath = '/' + normalizedMockServerPath[0].toLowerCase() + normalizedMockServerPath.substring(2);
    }
    
    // Get relative path from workspace to mock server file
    const relativePath = normalizedMockServerPath.replace(normalizedWorkspaceDir, '').replace(/^\//, '');
    const fileName = relativePath.split('/').pop() || 'mock-server.js';
    
    // Build Docker command
    // Mount workspace as /app, set working directory, install deps, and run server
    // Use a consistent naming pattern for easier container management
    // IMPORTANT: Set HOST to 0.0.0.0 so the server binds to all interfaces inside the container
    // This allows external connections through Docker port mapping
    // IMPORTANT: Create package.json inside container (not in workspace) to avoid workspace pollution
    const timestamp = Date.now();
    const containerName = `mock-server-${port}-${timestamp}`;
    
    // Escape package.json content for shell command (handle quotes, newlines, etc.)
    // Create package.json in a temp directory inside container to avoid workspace pollution
    // Then install dependencies there and copy node_modules to /app
    // Use base64 encoding to safely pass JSON through shell command
    let packageJsonSetup = '';
    if (packageJsonContent) {
        // Base64 encode the JSON content to avoid all escaping issues
        // This is the most reliable way to pass arbitrary data through shell commands
        const base64Content = Buffer.from(packageJsonContent, 'utf8').toString('base64');
        
        // Create package.json in temp directory, install deps there, and set NODE_PATH
        // This avoids creating node_modules, package.json or package-lock.json in the workspace
        // Decode base64 and write to file inside container
        packageJsonSetup = `mkdir -p /tmp/mock-server && ` +
            `echo '${base64Content}' | base64 -d > /tmp/mock-server/package.json && ` +
            `cd /tmp/mock-server && ` +
            `npm install --production --no-package-lock 2>/dev/null || true && ` +
            `export NODE_PATH=/tmp/mock-server/node_modules && ` +
            `cd /app && `;
    }
    
    const dockerCommand = `docker run --rm -d ` +
        `--name ${containerName} ` +
        `-p ${port}:${port} ` +
        `-v "${normalizedWorkspaceDir}:/app" ` +
        `-w /app ` +
        `-e PORT=${port} ` +
        `-e HOST=0.0.0.0 ` +
        `node:18-alpine ` +
        `sh -c "${packageJsonSetup}node ${fileName}"`;
    
    return dockerCommand;
}

/**
 * Build Docker command for Prism mock server
 */
export function buildPrismDockerCommand(
    specPath: string,
    workspaceDir: string,
    port: number,
    host: string,
    features: {
        dynamicExamples?: boolean;
        cors?: boolean;
    }
): string {
    // Normalize paths for Docker (handle Windows paths)
    let normalizedWorkspaceDir = workspaceDir.replace(/\\/g, '/');
    let normalizedSpecPath = specPath.replace(/\\/g, '/');
    
    // Handle Windows drive letters (C: -> /c)
    if (normalizedWorkspaceDir.match(/^[A-Z]:/)) {
        normalizedWorkspaceDir = '/' + normalizedWorkspaceDir[0].toLowerCase() + normalizedWorkspaceDir.substring(2);
    }
    if (normalizedSpecPath.match(/^[A-Z]:/)) {
        normalizedSpecPath = '/' + normalizedSpecPath[0].toLowerCase() + normalizedSpecPath.substring(2);
    }
    
    // Get relative path from workspace to spec file
    const relativePath = normalizedSpecPath.replace(normalizedWorkspaceDir, '').replace(/^\//, '');
    
    // Build Prism Docker command
    // Prism needs to bind to 0.0.0.0 inside the container to accept external connections
    const containerName = `prism-mock-${port}-${Date.now()}`;
    let command = `docker run --rm -d ` +
        `--name ${containerName} ` +
        `-p ${port}:${port} ` +
        `-v "${normalizedWorkspaceDir}:/spec" ` +
        `stoplight/prism:latest ` +
        `mock "/spec/${relativePath}" -p ${port} -h 0.0.0.0`;
    
    if (features.dynamicExamples !== false) {
        command += ' --dynamic';
    }
    
    if (features.cors !== false) {
        command += ' --cors';
    }
    
    return command;
}

/**
 * Build Docker command for Mokapi mock server (for AsyncAPI)
 * Mokapi is a simple standalone mock server with visual dashboard
 */
export function buildMokapiDockerCommand(
    specPath: string,
    workspaceDir: string,
    port: number,
    host: string
): string {
    // Normalize paths for Docker (handle Windows paths)
    let normalizedWorkspaceDir = workspaceDir.replace(/\\/g, '/');
    let normalizedSpecPath = specPath.replace(/\\/g, '/');
    
    // Handle Windows drive letters (C: -> /c)
    if (normalizedWorkspaceDir.match(/^[A-Z]:/)) {
        normalizedWorkspaceDir = '/' + normalizedWorkspaceDir[0].toLowerCase() + normalizedWorkspaceDir.substring(2);
    }
    if (normalizedSpecPath.match(/^[A-Z]:/)) {
        normalizedSpecPath = '/' + normalizedSpecPath[0].toLowerCase() + normalizedSpecPath.substring(2);
    }
    
    // Get relative path from workspace to spec file
    const relativePath = normalizedSpecPath.replace(normalizedWorkspaceDir, '').replace(/^\//, '');
    
    // Mokapi runs on a single port and loads the spec file from the mounted directory
    const containerName = `mokapi-${port}-${Date.now()}`;
    // Path to spec file inside the container
    const specPathInContainer = `/specs/${relativePath}`;
    
    // Mokapi Docker command:
    // - Runs Mokapi service using the official Docker Hub image
    // - Mounts workspace to /specs (read-only)
    // - Exposes port (default 8080, but we map to user's chosen port)
    // - Passes the spec file path as a command argument
    // Mokapi should auto-detect specs in /specs, but we can also pass the file explicitly
    // The command format: mokapi <spec-file-path>
    const command = `docker run --rm -d ` +
        `--name ${containerName} ` +
        `-p ${port}:8080 ` +
        `-v "${normalizedWorkspaceDir}:/specs:ro" ` +
        `mokapi/mokapi:latest ${specPathInContainer}`;
    
    return command;
}

/**
 * Stop Docker container by container ID
 */
export async function stopDockerContainer(containerId: string): Promise<boolean> {
    try {
        await exec(`docker stop ${containerId}`);
        logInfo(`Stopped Docker container: ${containerId}`);
        return true;
    } catch (error) {
        logError(`Failed to stop Docker container ${containerId}:`, error);
        return false;
    }
}

/**
 * Get Docker container ID from process output
 * Docker run with -d returns container ID
 */
export function extractContainerId(output: string): string | null {
    // Docker returns container ID (64 hex chars) on stdout
    const match = output.match(/^([a-f0-9]{64})$/);
    if (match) {
        return match[1];
    }
    
    // Sometimes it's just the short ID (12 chars)
    const shortMatch = output.match(/^([a-f0-9]{12})$/);
    if (shortMatch) {
        return shortMatch[1];
    }
    
    // Try to extract from any line
    const lines = output.trim().split('\n');
    for (const line of lines) {
        const idMatch = line.match(/([a-f0-9]{12,64})/);
        if (idMatch) {
            return idMatch[1];
        }
    }
    
    return null;
}

