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
import * as yaml from 'js-yaml';
import { TracerServer } from './tracing';
import { executeTraceServerTask, stopTraceServerTask } from './tracing/traceServerTask';
import {
    executeMCPServerTask,
    stopMCPServerTask,
    isMCPTaskRunning,
    registerMCPTaskEndListener
} from './mcpServerTask';

/** The absolute path of the Arazzo file the current MCP server is serving. */
let mcpActiveFilePath: string | undefined;

/** The port the current MCP server is listening on. */
let mcpServerPort: number | undefined;

/**
 * Returns the file path of the Arazzo file currently being served by the MCP
 * server, or undefined if the server is not running.
 */
export function getMCPActiveFilePath(): string | undefined {
    return isMCPServerRunning() ? mcpActiveFilePath : undefined;
}

/**
 * Returns the port the current MCP server is listening on,
 * or undefined if the server is not running.
 */
export function getMCPServerPort(): number | undefined {
    return isMCPServerRunning() ? mcpServerPort : undefined;
}

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
 * Returns true if the MCP server task is currently running.
 */
export function isMCPServerRunning(): boolean {
    return isMCPTaskRunning();
}

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
 * Start the arazzo server for the given Arazzo file.
 * Spawns the Go binary, writes .vscode/mcp.json, and shows output.
 *
 * @param suppressPrompt - When true, the "Try Now" follow-up notification is
 *   suppressed. Pass true when the caller (e.g. arazzo.tryAIWorkflow) will open
 *   Copilot itself, to avoid showing a duplicate/wrong-workflow prompt.
 */
export async function startMCPServer(context: vscode.ExtensionContext, arazzoFilePath?: string, suppressPrompt = false): Promise<void> {
    // (Any running task is terminated inside executeMCPServerTask before the new one starts)

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

    // VSIX / git may ship Mach-O/ELF as non-executable; fix before spawn (no-op on Windows).
    if (process.platform !== 'win32') {
        try {
            fs.chmodSync(binaryPath, 0o755);
        } catch {
            /* non-fatal — spawn will surface permission errors */
        }
    }

    // Choose a port
    const port = 18080 + Math.floor(Math.random() * 1000);

    // Always write mcp.json so VS Code Copilot connects automatically.
    // In a multi-root workspace, write to the folder that actually contains
    // the Arazzo file, falling back to the first workspace folder.
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let mcpConfigPath: string | undefined;
    const targetFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(arazzoFilePath))
        ?? workspaceFolders?.[0];
    if (targetFolder) {
        mcpConfigPath = path.join(targetFolder.uri.fsPath, '.vscode', 'mcp.json');
        try {
            await writeMcpConfig(targetFolder.uri.fsPath, port);
        } catch {
            // Non-fatal — Copilot will still work if the user connects manually
        }
    }

    // Start tracer server via VS Code Task so the Go runner can post span events
    let tracerPort: number | undefined;
    try {
        tracerPort = await executeTraceServerTask();
    } catch {
        // Non-fatal — tracing is optional
    }

    // Launch the MCP server binary as a VS Code Task (mirrors the trace server)
    const disableTls = vscode.workspace.getConfiguration('arazzo').get<boolean>('disableTLSCertificationValidation', false);
    await executeMCPServerTask({ binaryPath, arazzoFilePath, port, tracerPort, disableTls });

    // Record which file this server is serving and the port it is on
    mcpActiveFilePath = arazzoFilePath;
    mcpServerPort = port;

    // Give the server a moment to start, then notify the user
    setTimeout(async () => {
        if (!isMCPTaskRunning()) {
            return;
        }

        // Notify listeners (e.g. CodeLens provider) that the server is now running
        notifyStateChange();

        const serverUrl = `http://localhost:${port}/mcp`;
        const configNote = mcpConfigPath ? ` Config added to mcp.json.` : '';
        const tlsNote = disableTls ? ' TLS certificate validation disabled.' : '';

        // Get first workflow name for the "Try Now" prompt
        const firstWorkflow = getFirstWorkflowId(arazzoFilePath!);
        const copilotPrompt = firstWorkflow
            ? `execute the workflow ${firstWorkflow}`
            : `list all workflows`;

        // Combined status message: Server started + Try with AI invitation
        if (!suppressPrompt) {
            const action = await vscode.window.showInformationMessage(
                `Arazzo server started. Running on ${serverUrl}.${configNote}${tlsNote} Try your workflows with GitHub Copilot.`,
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
        } else {
            // If suppressPrompt is true, still show the base status message
            vscode.window.showInformationMessage(
                `Arazzo server started. Running on ${serverUrl}.${configNote}${tlsNote}`
            );
        }
    }, 1500);
}

/**
 * Stop the running MCP server if any.
 * mcpActiveFilePath and notifyStateChange() are handled by the onDidEndTask
 * listener registered in initializeMCPServerRunner().
 */
export function stopMCPServer(): void {
    // Terminate the MCP server VS Code task (closes its pseudoterminal).
    if (isMCPTaskRunning()) {
        stopMCPServerTask();
    }
    // Terminate the trace server VS Code task (its pseudoterminal's close()
    // method will also call TracerServer.stop() for us).
    stopTraceServerTask();
    // Safety net: stop the in-process HTTP server in case the tracer was
    // running without a task (e.g. already-running path in executeTraceServerTask).
    TracerServer.getInstance().stop();

    vscode.window.showInformationMessage('Arazzo server stopped.');
}

/**
 * Clean up resources on deactivation.
 */
export function disposeMCPServer(): void {
    stopMCPServer();
    TracerServer.getInstance().dispose();
}

/**
 * Register the VS Code task-end listener that clears state whenever the MCP
 * server task exits for any reason (normal, error, or terminate).
 * Must be called once during extension activation, before any server starts.
 */
export function initializeMCPServerRunner(context: vscode.ExtensionContext): void {
    registerMCPTaskEndListener(context, () => {
        mcpActiveFilePath = undefined;
        mcpServerPort = undefined;
        notifyStateChange();
    });
}
