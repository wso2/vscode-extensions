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
import { ChildProcess, spawn } from 'child_process';

/** Parameters needed to start the MCP server binary. */
export interface MCPServerTaskParams {
    binaryPath: string;
    arazzoFilePath: string;
    port: number;
    tracerPort?: number;
    disableTls?: boolean;
}

/** The currently running task execution, if any. */
let currentExecution: vscode.TaskExecution | undefined;

/**
 * Returns true if the MCP server task is currently running.
 */
export function isMCPTaskRunning(): boolean {
    return currentExecution !== undefined;
}

/**
 * Creates a VS Code Task that starts the Arazzo MCP server binary.
 * Uses CustomExecution to run the binary inside a Pseudoterminal, mirroring
 * how the trace server task is implemented.
 */
export function createMCPServerTask(params: MCPServerTaskParams): vscode.Task {
    const taskDefinition: vscode.TaskDefinition = {
        type: 'custom',
        task: 'start-mcp-server'
    };

    const execution = new vscode.CustomExecution(async (): Promise<vscode.Pseudoterminal> => {
        return new MCPServerPseudoterminal(params);
    });

    const task = new vscode.Task(
        taskDefinition,
        vscode.TaskScope.Workspace,
        'Arazzo MCP Server',
        'arazzo',
        execution
    );

    task.presentationOptions = {
        reveal: vscode.TaskRevealKind.Silent,
        panel: vscode.TaskPanelKind.Shared,
        showReuseMessage: false,
        clear: true,
        echo: false,
        focus: false
    };

    task.isBackground = true;
    task.problemMatchers = [];

    return task;
}

/**
 * Pseudoterminal implementation for the MCP server task.
 * Spawns the Go binary and pipes its stdout/stderr into the terminal output.
 */
class MCPServerPseudoterminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();
    private serverProcess: ChildProcess | undefined;
    private isClosed = false;

    readonly onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    readonly onDidClose: vscode.Event<number> = this.closeEmitter.event;

    constructor(private readonly params: MCPServerTaskParams) {}

    open(_initialDimensions: vscode.TerminalDimensions | undefined): void {
        const { binaryPath, arazzoFilePath, port, tracerPort } = this.params;

        const args = ['serve', '-f', arazzoFilePath, '-p', port.toString()];
        if (tracerPort !== undefined) {
            args.push('-trace-endpoint', `http://127.0.0.1:${tracerPort}/span-events`);
        }
        if (this.params.disableTls) {
            args.push('--disable-tls');
        }

        this.writeLine('Starting Arazzo MCP Server...');
        this.writeLine(`  File:   ${arazzoFilePath}`);
        this.writeLine(`  Port:   ${port}`);
        if (tracerPort !== undefined) {
            this.writeLine(`  Tracer: http://127.0.0.1:${tracerPort}/span-events`);
        }
        if (this.params.disableTls) {
            this.writeLine('  TLS verification: disabled');
        }
        this.writeLine('');

        this.serverProcess = spawn(binaryPath, args, {
            cwd: path.dirname(arazzoFilePath)
        });

        this.serverProcess.stdout?.on('data', (data: Buffer) => {
            this.write(data.toString());
        });

        this.serverProcess.stderr?.on('data', (data: Buffer) => {
            this.write(data.toString());
        });

        this.serverProcess.on('error', (err: Error) => {
            this.writeLine(`Arazzo MCP Server error: ${err.message}`);
            vscode.window.showErrorMessage(`Failed to start Arazzo MCP Server: ${err.message}`);
            this.doClose(1);
        });

        this.serverProcess.on('exit', (code: number | null) => {
            this.writeLine(`\nArazzo MCP Server exited with code: ${code ?? 0}`);
            this.doClose(code ?? 0);
        });
    }

    close(): void {
        if (this.serverProcess && !this.serverProcess.killed) {
            this.writeLine('');
            this.writeLine('Stopping Arazzo MCP Server...');
            this.serverProcess.kill();
            this.serverProcess = undefined;
        }
        this.doClose(0);
    }

    handleInput(data: string): void {
        // Allow Ctrl+C to stop the server from the terminal
        if (data === '\x03') {
            this.close();
        }
    }

    /** Guards against firing closeEmitter more than once. */
    private doClose(exitCode: number): void {
        if (this.isClosed) {
            return;
        }
        this.isClosed = true;
        this.closeEmitter.fire(exitCode);
    }

    /** Write raw text, converting \n to \r\n for terminal emulation. */
    private write(text: string): void {
        this.writeEmitter.fire(text.replace(/\n/g, '\r\n'));
    }

    private writeLine(text: string): void {
        this.writeEmitter.fire(text + '\r\n');
    }
}

/**
 * Execute the MCP server as a VS Code Task.
 * Stores the execution handle so it can be terminated later.
 */
export async function executeMCPServerTask(params: MCPServerTaskParams): Promise<void> {
    // Terminate any previously running execution first
    if (currentExecution) {
        currentExecution.terminate();
        currentExecution = undefined;
    }

    const task = createMCPServerTask(params);
    currentExecution = await vscode.tasks.executeTask(task);
}

/**
 * Terminate the running MCP server task, if any.
 */
export function stopMCPServerTask(): void {
    if (currentExecution) {
        currentExecution.terminate();
        // currentExecution is cleared by the onDidEndTask listener
    }
}

/**
 * Hook up the VS Code task-end listener so that module state is cleared when
 * the MCP server task exits for any reason (normal exit, error, or terminate).
 * Call this once during extension activation.
 *
 * @param context  Extension context — the listener is added to its subscriptions.
 * @param onEnd    Callback invoked after the execution is cleared (e.g. to call
 *                 notifyStateChange and clear mcpActiveFilePath in the runner).
 */
export function registerMCPTaskEndListener(
    context: vscode.ExtensionContext,
    onEnd: () => void
): void {
    context.subscriptions.push(
        vscode.tasks.onDidEndTask((event) => {
            // Match on the execution object reference, not task definition type.
            // This prevents a stale "end" event for a terminated old execution from
            // incorrectly clearing (and stopping) a newly-launched replacement task.
            if (currentExecution && event.execution === currentExecution) {
                currentExecution = undefined;
                onEnd();
            }
        })
    );
}
