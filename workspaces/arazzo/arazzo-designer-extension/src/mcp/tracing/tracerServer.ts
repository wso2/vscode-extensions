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

import * as http from 'http';
import * as vscode from 'vscode';
import { TraceEvent } from './traceEvents';
import { TRACE_SERVER_PORT } from './constants';

/**
 * Lightweight HTTP server that receives TraceEvent JSON posts from the Go
 * runner and stores them in memory. Follows the same singleton pattern used
 * by the Ballerina extension's trace-server.
 *
 * Endpoints:
 *  POST /span-events  — accept a single TraceEvent
 *  GET  /health       — readiness probe
 *  GET  /api/traces   — dump all stored events (useful for debugging)
 */
export class TracerServer {
    private static instance: TracerServer | undefined;

    private server: http.Server | undefined;
    private port: number;
    private events: TraceEvent[] = [];
    private outputChannel: vscode.OutputChannel;

    /** Event emitter so future Phase 2 webview can subscribe. */
    private _onEvent = new vscode.EventEmitter<TraceEvent>();
    public readonly onEvent: vscode.Event<TraceEvent> = this._onEvent.event;

    private constructor() {
        this.port = TRACE_SERVER_PORT;
        this.outputChannel = vscode.window.createOutputChannel('Arazzo Trace Server');
    }

    /** Singleton accessor. */
    static getInstance(): TracerServer {
        if (!TracerServer.instance) {
            TracerServer.instance = new TracerServer();
        }
        return TracerServer.instance;
    }

    /** Start the server. Resolves with the actual port once listening. */
    async start(): Promise<number> {
        if (this.server) {
            return this.port;
        }

        return new Promise<number>((resolve, reject) => {
            this.server = http.createServer((req, res) => this.handleRequest(req, res));

            this.server.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    // Try next port
                    this.port++;
                    this.server!.listen(this.port, '127.0.0.1');
                } else {
                    this.log(`Server error: ${err.message}`);
                    reject(err);
                }
            });

            this.server.on('listening', () => {
                this.log(`Trace server listening on http://127.0.0.1:${this.port}`);
                resolve(this.port);
            });

            this.server.listen(this.port, '127.0.0.1');
        });
    }

    /** Stop the server gracefully. */
    stop(): void {
        if (this.server) {
            this.server.close();
            this.server = undefined;
            this.log('Trace server stopped.');
        }
    }

    isRunning(): boolean {
        return this.server !== undefined;
    }

    getPort(): number {
        return this.port;
    }

    /** Return all collected events. */
    getEvents(): TraceEvent[] {
        return this.events;
    }

    /** Clear stored events. */
    clearEvents(): void {
        this.events = [];
    }

    /** Dispose output channel and event emitter. */
    dispose(): void {
        this.stop();
        this._onEvent.dispose();
        this.outputChannel.dispose();
        TracerServer.instance = undefined;
    }

    // ---- private ----

    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        // CORS headers for potential browser-based consumers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const url = req.url ?? '/';

        if (req.method === 'GET' && url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', events: this.events.length }));
            return;
        }

        if (req.method === 'GET' && url === '/api/traces') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(this.events));
            return;
        }

        if (req.method === 'POST' && url === '/span-events') {
            this.handleSpanEvent(req, res);
            return;
        }

        res.writeHead(404);
        res.end('Not Found');
    }

    private handleSpanEvent(req: http.IncomingMessage, res: http.ServerResponse): void {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
            try {
                const body = Buffer.concat(chunks).toString('utf-8');
                const event: TraceEvent = JSON.parse(body);

                // Store and emit
                this.events.push(event);
                this._onEvent.fire(event);

                // Log to output channel
                this.logEvent(event);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ accepted: true }));
            } catch (err: any) {
                this.log(`Failed to parse span event: ${err.message}`);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }

    private logEvent(event: TraceEvent): void {
        const dir = event.lifecycle === 'start' ? '▶' : '■';
        const dur = event.durationMs !== undefined ? ` (${event.durationMs}ms)` : '';
        const status = event.lifecycle === 'end' ? ` [${event.status}]` : '';
        this.log(`${dir} ${event.spanKind}:${event.spanName}${status}${dur}`);
    }

    private log(msg: string): void {
        const ts = new Date().toISOString().slice(11, 23);
        this.outputChannel.appendLine(`[${ts}] ${msg}`);
    }
}
