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
<<<<<<< HEAD
import * as path from 'path';
import * as fs from 'fs';
import { ChildProcess, spawn } from 'child_process';
import * as yaml from 'js-yaml';

let mcpServerProcess: ChildProcess | undefined;
let mcpOutputChannel: vscode.OutputChannel | undefined;

/** Callback invoked whenever the MCP server starts or stops. */
let onServerStateChangeCallback: (() => void) | undefined;

/**
 * Register a callback that fires whenever the MCP server starts or stops.
 * Used by the Run-workflow CodeLens provider to refresh its lenses.
 */
export function onMCPServerStateChange(cb: () => void): void {
    onServerStateChangeCallback = cb;
}

/** Fire the state-change callback (if registered). */
function notifyStateChange(): void {
    onServerStateChangeCallback?.();
}

/**
 * Returns true if the MCP server process is currently running.
 */
export function isMCPServerRunning(): boolean {
    return mcpServerProcess !== undefined && !mcpServerProcess.killed;
}

/**
 * Returns the platform-specific binary name for the Arazzo Designer CLI.
 */
function getCliBinaryName(): string {
    const platform = process.platform;
    const arch = process.arch;

    if (platform === 'win32') {
        return 'arazzo-designer-cli.exe';
=======
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { openMcpPlayground } from './mcpPlaygroundWebview';

/** Track the active MCP server terminal so we can reuse or dispose it. */
let mcpTerminal: vscode.Terminal | undefined;

/**
 * Returns the platform-specific binary name for the arazzo-mcp-gen CLI.
 * Mirrors the pattern used by `getLanguageServerBinaryName()` in extension.ts.
 */
function getMCPGenBinaryName(): string {
    const platform = process.platform; // 'win32', 'darwin', 'linux'
    const arch = process.arch;         // 'x64', 'arm64', etc.

    if (platform === 'win32') {
        return 'arazzo-mcp-gen.exe';
>>>>>>> a2466077832bb8cd45111e33b8fd24c63a6079e4
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

<<<<<<< HEAD
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

    existingConfig.servers['arazzo'] = {
        type: 'http',
        url: `http://localhost:${port}/mcp`
    };

    fs.writeFileSync(mcpConfigPath, JSON.stringify(existingConfig, null, 2), 'utf-8');
}

/**
 * Read the Arazzo file and return the first workflowId, or undefined if it
 * cannot be determined. Used to pre-fill the Copilot "Try Now" prompt.
 */
function getFirstWorkflowId(arazzoFilePath: string): string | undefined {
    try {
        const content = fs.readFileSync(arazzoFilePath, 'utf-8');
        const doc = yaml.load(content) as any;
        const workflows = doc?.workflows;
        if (Array.isArray(workflows) && workflows.length > 0) {
            return workflows[0]?.workflowId as string | undefined;
        }
    } catch {
        // Non-fatal — best effort
    }
    return undefined;
}

/**
 * Start the Arazzo MCP server for the given Arazzo file.
 * Spawns the Go binary, writes .vscode/mcp.json, and shows output.
 */
export async function startMCPServer(context: vscode.ExtensionContext, arazzoFilePath?: string): Promise<void> {
    const output = getOutputChannel();
    output.show(false); // Move focus to output panel so clicking back on the editor
                        // fires onDidChangeActiveTextEditor and restores toolbar buttons.

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
=======
    return `arazzo-mcp-gen-${osPart}-${archPart}`;
}

/**
 * Resolves the full path to the arazzo-mcp-gen binary inside the extension's cli/ folder.
 * Throws if the binary does not exist.
 */
function getMCPGenBinaryPath(extensionPath: string): string {
    const binaryName = getMCPGenBinaryName();
    const binaryPath = path.join(extensionPath, 'cli', binaryName);

    if (!fs.existsSync(binaryPath)) {
        throw new Error(`MCP CLI binary not found at: ${binaryPath}`);
    }

    return binaryPath;
}

/**
 * Sanitizes the Arazzo spec title into a Docker image name.
 * Uses the same logic as the Go CLI: lowercase, non-alnum → hyphens, append '-mcp-server'.
 */
function sanitizeImageName(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        + '-mcp-server';
}

/**
 * Reads the Arazzo YAML/JSON file and extracts `info.title` for Docker image naming.
 */
function getArazzoTitle(filePath: string): string {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const doc = yaml.load(content) as Record<string, any>;
        if (doc && doc.info && typeof doc.info.title === 'string') {
            return doc.info.title;
        }
    } catch {
        // Fall through to default
    }
    return 'arazzo-workflow';
}

/**
 * Main function: generates an MCP server Docker image from the active Arazzo file
 * and starts the container in a VS Code terminal with live logs.
 */
export async function runMCPServer(context: vscode.ExtensionContext): Promise<void> {
    // 1. Validate active editor has an Arazzo file
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No Arazzo file is currently open.');
        return;
    }

    const document = editor.document;
    const firstLines = document.getText(new vscode.Range(0, 0, 10, 0));
    if (!/\barazzo\s*:\s*\d+\.\d+\.\d+/i.test(firstLines)) {
        vscode.window.showErrorMessage('The active file is not a valid Arazzo specification.');
        return;
    }

    // 2. Resolve the CLI binary
    let cliPath: string;
    try {
        cliPath = getMCPGenBinaryPath(context.extensionPath);
    } catch (e: any) {
        vscode.window.showWarningMessage(
            `MCP Server CLI not available for your platform (${process.platform}/${process.arch}). ` +
            'Please install arazzo-mcp-gen separately.'
>>>>>>> a2466077832bb8cd45111e33b8fd24c63a6079e4
        );
        return;
    }

<<<<<<< HEAD
    // Choose a port
    const port = 18080 + Math.floor(Math.random() * 1000);

    // Always write mcp.json so VS Code Copilot connects automatically
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let mcpConfigPath: string | undefined;
    if (workspaceFolders && workspaceFolders.length > 0) {
        mcpConfigPath = path.join(workspaceFolders[0].uri.fsPath, '.vscode', 'mcp.json');
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

    // Keep a local reference so async callbacks can check whether they belong
    // to the current process or a stale one that was already replaced.
    const thisProcess = mcpServerProcess;

    mcpServerProcess.stdout?.on('data', (data: Buffer) => {
        output.append(data.toString());
    });

    mcpServerProcess.stderr?.on('data', (data: Buffer) => {
        output.append(data.toString());
    });

    mcpServerProcess.on('error', (err: Error) => {
        output.appendLine(`\nMCP server error: ${err.message}`);
        vscode.window.showErrorMessage(`Failed to start MCP server: ${err.message}`);
        // Only clear if this is still the active process
        if (mcpServerProcess === thisProcess) {
            mcpServerProcess = undefined;
            notifyStateChange();
        }
    });

    mcpServerProcess.on('exit', (code: number | null) => {
        output.appendLine(`\nMCP server exited with code: ${code}`);
        // Only clear if this is still the active process — a newer spawn
        // may have already replaced mcpServerProcess.
        if (mcpServerProcess === thisProcess) {
            mcpServerProcess = undefined;
            notifyStateChange();
        }
    });

    // Give the server a moment to start, then notify the user
    setTimeout(async () => {
        if (!mcpServerProcess || mcpServerProcess.killed) {
            return;
        }

        // Notify listeners (e.g. CodeLens provider) that the server is now running
        notifyStateChange();

        const serverUrl = `http://localhost:${port}/mcp`;
        const configNote = mcpConfigPath ? ` Config added to mcp.json.` : '';

        // Primary status message
        vscode.window.showInformationMessage(
            `Arazzo MCP server started. Running on ${serverUrl}.${configNote}`
        );

        // Get first workflow name for the "Try Now" prompt
        const firstWorkflow = getFirstWorkflowId(arazzoFilePath!);
        const copilotPrompt = firstWorkflow
            ? `execute the workflow ${firstWorkflow}`
            : `list all workflows`;

        // "Try with Copilot" follow-up message
        const action = await vscode.window.showInformationMessage(
            `Try your Arazzo workflows with GitHub Copilot.`,
            'Try Now'
        );
        if (action === 'Try Now') {
            try {
                await vscode.commands.executeCommand('workbench.action.chat.open', {
                    query: copilotPrompt,
                    isPartialQuery: true
                });
            } catch {
                // Copilot not available — non-fatal
            }
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
        notifyStateChange();
    }
}

/**
 * Clean up resources on deactivation.
 */
export function disposeMCPServer(): void {
    stopMCPServer();
    mcpOutputChannel?.dispose();
=======
    // 3. Determine the Arazzo file path (CLI expects -f <file>)
    const filePath = document.uri.fsPath;
    const folderPath = path.dirname(filePath);
    const fileName = path.basename(filePath);

    // 4. Prompt user for port
    const portInput = await vscode.window.showInputBox({
        prompt: 'Enter port for the MCP server',
        value: '5000',
        validateInput: (value) => {
            const port = parseInt(value, 10);
            if (isNaN(port) || port < 1 || port > 65535) {
                return 'Please enter a valid port number (1-65535)';
            }
            return undefined;
        }
    });

    if (portInput === undefined) {
        return; // User cancelled
    }

    const port = parseInt(portInput, 10);

    // 5. Derive Docker image name from Arazzo spec title
    const title = getArazzoTitle(filePath);
    const imageName = sanitizeImageName(title);

    // 6. Dispose previous MCP terminal if it exists
    if (mcpTerminal) {
        mcpTerminal.dispose();
        mcpTerminal = undefined;
    }

    // 7. Create a new terminal
    mcpTerminal = vscode.window.createTerminal({
        name: `Arazzo MCP Server (:${port})`,
        cwd: folderPath
    });
    mcpTerminal.show();

    // Quote the CLI path to handle spaces in paths
    const quotedCli = `"${cliPath}"`;

    // 8. Run generate + build, then docker run
    //    We send two commands: first generate/build, then run the container.
    //    The second command uses && (Unix) or chained via ; if ($LASTEXITCODE -eq 0) (PowerShell)
    //    to only run if the build succeeded.
    if (process.platform === 'win32') {
        // PowerShell: use & call operator for quoted paths, chain with conditional
        mcpTerminal.sendText(
            `& ${quotedCli} mcp-server generate -f "${fileName}" -p ${port}; ` +
            `if ($LASTEXITCODE -eq 0) { docker run --rm -p ${port}:${port} ${imageName} }`
        );
    } else {
        // Unix shells: chain with &&
        mcpTerminal.sendText(
            `${quotedCli} mcp-server generate -f "${fileName}" -p ${port} && ` +
            `docker run --rm -p ${port}:${port} ${imageName}`
        );
    }

    // 9. Show info notification with endpoint and image name
    vscode.window.showInformationMessage(
        `MCP Server starting on http://localhost:${port}/mcp — Docker image: ${imageName}`
    );

    // 10. Open the MCP Playground webview beside the editor
    openMcpPlayground(port);

    // 11. Clean up terminal reference when it's closed
    const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === mcpTerminal) {
            mcpTerminal = undefined;
            disposable.dispose();
        }
    });
    context.subscriptions.push(disposable);
>>>>>>> a2466077832bb8cd45111e33b8fd24c63a6079e4
}
