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
        );
        return;
    }

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
}
