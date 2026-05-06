/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
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
import { TracerServer } from './tracerServer';

/**
 * Pending promise resolver used to communicate the actual port from the
 * Pseudoterminal back to the caller of executeTraceServerTask().
 */
let portResolve: ((port: number) => void) | undefined;
let portReject: ((err: Error) => void) | undefined;

/** The currently running trace task execution, if any. */
let currentTraceExecution: vscode.TaskExecution | undefined;

/**
 * Creates a VS Code Task that starts the trace server.
 * Uses CustomExecution to run the server inside the extension host.
 */
export function createTraceServerTask(): vscode.Task {
    const taskDefinition: vscode.TaskDefinition = {
        type: 'custom',
        task: 'start-trace-server'
    };

    const execution = new vscode.CustomExecution(async (): Promise<vscode.Pseudoterminal> => {
        return new TraceServerPseudoterminal();
    });

    const task = new vscode.Task(
        taskDefinition,
        vscode.TaskScope.Workspace,
        'Start Trace Server',
        'arazzo-tracing',
        execution
    );

    task.presentationOptions = {
        reveal: vscode.TaskRevealKind.Never,
        panel: vscode.TaskPanelKind.New,
        showReuseMessage: false,
        clear: false,
        echo: true,
        focus: false
    };

    task.isBackground = true;
    task.problemMatchers = [];

    return task;
}

/**
 * Pseudoterminal implementation for the trace server task.
 * This runs the HTTP server inside the extension host.
 */
class TraceServerPseudoterminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();
    private serverStarted = false;

    readonly onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    readonly onDidClose: vscode.Event<number> = this.closeEmitter.event;

    open(_initialDimensions: vscode.TerminalDimensions | undefined): void {
        this.writeLine('Starting Arazzo Trace Server...');
        this.writeLine('');

        const tracer = TracerServer.getInstance();
        tracer.start()
            .then((port) => {
                this.serverStarted = true;
                this.writeLine(`Trace server started successfully on port ${port}`);
                this.writeLine('Do not close this terminal window. It will be used to receive trace events.');
                portResolve?.(port);
                portResolve = undefined;
                portReject = undefined;
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                this.writeLine(`Failed to start trace server: ${message}`);

                if (message.includes('EADDRINUSE') || message.includes('address already in use')) {
                    this.writeLine('');
                    this.writeLine('Port is already in use.');
                    this.writeLine('The server may already be running.');
                    if (tracer.isRunning()) {
                        this.writeLine('Server is already running in this extension.');
                    }
                }

                this.writeLine('');
                portReject?.(error instanceof Error ? error : new Error(message));
                portResolve = undefined;
                portReject = undefined;

                setTimeout(() => {
                    this.closeEmitter.fire(1);
                }, 1000);
            });
    }

    close(): void {
        if (this.serverStarted) {
            this.writeLine('');
            this.writeLine('Shutting down trace server...');

            TracerServer.getInstance().stop();
            this.writeLine('Trace server stopped');
            this.closeEmitter.fire(0);
        } else {
            this.closeEmitter.fire(0);
        }
    }

    handleInput(data: string): void {
        if (data === '\x03') {
            this.close();
        }
    }

    private writeLine(text: string): void {
        this.writeEmitter.fire(text + '\r\n');
    }
}

/**
 * Executes the trace server task.
 * @returns Promise that resolves with the port the server is listening on.
 */
export async function executeTraceServerTask(): Promise<number> {
    // If the server is already running, return its current port
    const tracer = TracerServer.getInstance();
    if (tracer.isRunning()) {
        return tracer.getPort();
    }

    const portPromise = new Promise<number>((resolve, reject) => {
        portResolve = resolve;
        portReject = reject;
    });

    const task = createTraceServerTask();
    currentTraceExecution = await vscode.tasks.executeTask(task);

    return portPromise;
}

/**
 * Terminate the running trace server task, if any.
 * The Pseudoterminal's close() method will stop the TracerServer HTTP server.
 */
export function stopTraceServerTask(): void {
    if (currentTraceExecution) {
        currentTraceExecution.terminate();
        currentTraceExecution = undefined;
    }
}
