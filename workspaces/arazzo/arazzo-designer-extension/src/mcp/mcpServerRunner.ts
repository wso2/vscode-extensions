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
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn } from 'child_process';

let mcpServerProcess: ChildProcess | undefined;
let mcpOutputChannel: vscode.OutputChannel | undefined;

/**
 * Returns the platform-specific binary name for the Arazzo Designer CLI.
 */
function getCliBinaryName(): string {
    const platform = process.platform;
    const arch = process.arch;

    if (platform === 'win32') {
        return 'arazzo-designer-cli.exe';
    }

    const platformMap: Record<string, string> = {
        'darwin': 'darwin',
        'linux': 'linux'
    };
    const archMap: Record<string, string> = {
        'x64': 'amd64',
        'arm64': 'arm64'
    };

    const osPart = platformMap[platform];
    const archPart = archMap[arch];

    if (!osPart || !archPart) {
        throw new Error(`Unsupported platform: ${platform}/${arch}`);
    }

    return `arazzo-designer-cli-${osPart}-${archPart}`;
}

/**
 * Get or create the output channel for MCP server logs.
 */
function getOutputChannel(): vscode.OutputChannel {
    if (!mcpOutputChannel) {
        mcpOutputChannel = vscode.window.createOutputChannel('Arazzo MCP Server');
    }
    return mcpOutputChannel;
}

/**
 * Write the .vscode/mcp.json configuration for VS Code Copilot to connect
 * to the Arazzo MCP server via streamable HTTP.
 */
async function writeMcpConfig(workspaceFolder: string, port: number): Promise<void> {
    const vscodeDir = path.join(workspaceFolder, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
    }

    const mcpConfigPath = path.join(vscodeDir, 'mcp.json');

    // Read existing config if present
    let existingConfig: any = {};
    if (fs.existsSync(mcpConfigPath)) {
        try {
            const content = fs.readFileSync(mcpConfigPath, 'utf-8');
            existingConfig = JSON.parse(content);
        } catch {
            // Invalid JSON, we'll overwrite it
        }
    }

    // Merge our server into the existing config
    if (!existingConfig.servers) {
        existingConfig.servers = {};
    }

    existingConfig.servers['arazzo-workflow-runner'] = {
        type: 'http',
        url: `http://localhost:${port}/mcp`
    };

    fs.writeFileSync(mcpConfigPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
}

/**
 * Start the Arazzo MCP server for the given Arazzo file.
 * Spawns the Go binary, writes .vscode/mcp.json, and shows output.
 */
export async function startMCPServer(context: vscode.ExtensionContext, arazzoFilePath?: string): Promise<void> {
    const output = getOutputChannel();
    output.show(true);

    // Stop any existing server
    if (mcpServerProcess) {
        output.appendLine('Stopping previous MCP server...');
        mcpServerProcess.kill();
        mcpServerProcess = undefined;
    }

    // Determine the Arazzo file to use
    if (!arazzoFilePath) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            arazzoFilePath = editor.document.uri.fsPath;
        }
    }

    if (!arazzoFilePath) {
        vscode.window.showErrorMessage('No Arazzo file specified. Open an Arazzo file and try again.');
        return;
    }

    // Verify it's an Arazzo file
    if (!arazzoFilePath.includes('.arazzo.') && !arazzoFilePath.includes('-arazzo.')) {
        // Check file content for arazzo field
        try {
            const content = fs.readFileSync(arazzoFilePath, 'utf-8');
            const firstLines = content.split('\n').slice(0, 10).join('\n');
            if (!/\barazzo\s*:\s*\d+\.\d+\.\d+/i.test(firstLines)) {
                vscode.window.showErrorMessage('The active file does not appear to be an Arazzo file.');
                return;
            }
        } catch {
            vscode.window.showErrorMessage('Could not read the file.');
            return;
        }
    }

    // Find the binary
    let binaryName: string;
    try {
        binaryName = getCliBinaryName();
    } catch (e: any) {
        vscode.window.showErrorMessage(e.message);
        return;
    }

    const binaryPath = path.join(context.extensionPath, 'cli', binaryName);
    if (!fs.existsSync(binaryPath)) {
        vscode.window.showErrorMessage(
            `Arazzo Designer CLI binary not found at: ${binaryPath}. ` +
            `Make sure the binary is built and placed in the "cli" folder.`
        );
        return;
    }

    // Choose a port
    const port = 18080 + Math.floor(Math.random() * 1000);

    // Write .vscode/mcp.json
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        try {
            await writeMcpConfig(workspaceFolders[0].uri.fsPath, port);
            output.appendLine(`Wrote .vscode/mcp.json with MCP server URL: http://localhost:${port}/mcp`);
        } catch (e: any) {
            output.appendLine(`Warning: Could not write .vscode/mcp.json: ${e.message}`);
        }
    }

    // Start the server
    output.appendLine(`Starting Arazzo MCP server...`);
    output.appendLine(`  Binary: ${binaryPath}`);
    output.appendLine(`  File: ${arazzoFilePath}`);
    output.appendLine(`  Port: ${port}`);
    output.appendLine('');

    const args = ['serve', '-f', arazzoFilePath, '-p', port.toString()];

    mcpServerProcess = spawn(binaryPath, args, {
        cwd: path.dirname(arazzoFilePath)
    });

    mcpServerProcess.stdout?.on('data', (data: Buffer) => {
        output.append(data.toString());
    });

    mcpServerProcess.stderr?.on('data', (data: Buffer) => {
        output.append(data.toString());
    });

    mcpServerProcess.on('error', (err: Error) => {
        output.appendLine(`\nMCP server error: ${err.message}`);
        vscode.window.showErrorMessage(`Failed to start MCP server: ${err.message}`);
        mcpServerProcess = undefined;
    });

    mcpServerProcess.on('exit', (code: number | null) => {
        output.appendLine(`\nMCP server exited with code: ${code}`);
        mcpServerProcess = undefined;
    });

    // Give the server a moment to start, then notify the user
    setTimeout(() => {
        if (mcpServerProcess && !mcpServerProcess.killed) {
            vscode.window.showInformationMessage(
                `Arazzo MCP server running on port ${port}. ` +
                `Use GitHub Copilot to interact with your workflows.`
            );
        }
    }, 1500);
}

/**
 * Stop the running MCP server if any.
 */
export function stopMCPServer(): void {
    if (mcpServerProcess) {
        mcpServerProcess.kill();
        mcpServerProcess = undefined;
        const output = getOutputChannel();
        output.appendLine('MCP server stopped.');
    }
}

/**
 * Clean up resources on deactivation.
 */
export function disposeMCPServer(): void {
    stopMCPServer();
    mcpOutputChannel?.dispose();
}
