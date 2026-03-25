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
import axios from 'axios';
import { getComposerJSFiles } from '../util';
import { extension } from '../Context';

/** Singleton panel reference */
let panel: vscode.WebviewPanel | undefined;

/** MCP session ID returned by the server after initialize */
let sessionId: string | undefined;

/** JSON-RPC request counter */
let rpcId = 0;

/**
 * Opens (or reveals) the MCP Playground webview panel beside the active editor.
 * @param port The port the MCP server is running on (pre-fills the URL field).
 */
export function openMcpPlayground(port: number): void {
    const column = vscode.ViewColumn.Beside;

    if (panel) {
        panel.reveal(column);
        panel.webview.postMessage({ command: 'setUrl', url: `http://localhost:${port}/mcp` });
        return;
    }

    panel = vscode.window.createWebviewPanel(
        'arazzo-designer.mcpPlayground',
        'MCP Playground',
        column,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(require('os').homedir())],
        }
    );

    panel.webview.html = getWebviewContent(panel.webview, port);

    panel.webview.onDidReceiveMessage(async (msg) => {
        switch (msg.command) {
            case 'connect':
                await handleConnect(msg.url);
                break;
            case 'listTools':
                await handleListTools(msg.url);
                break;
            case 'callTool':
                await handleCallTool(msg.url, msg.toolName, msg.args);
                break;
        }
    });

    panel.onDidDispose(() => {
        panel = undefined;
        sessionId = undefined;
        rpcId = 0;
    });
}

// ─── MCP Protocol Helpers ───────────────────────────────────────────────────

async function mcpPost(url: string, method: string, params?: any, hasId = true): Promise<any> {
    const body: any = { jsonrpc: '2.0', method };
    if (params) { body.params = params; }
    if (hasId) { body.id = ++rpcId; }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
    };
    if (sessionId) { headers['Mcp-Session-Id'] = sessionId; }

    const resp = await axios.post(url, body, {
        headers,
        validateStatus: () => true,
        transformResponse: [(data: any) => data],
        timeout: 120_000,
    });

    // Capture session id from response headers
    const sid = resp.headers['mcp-session-id'];
    if (sid) { sessionId = sid; }

    // If the response is JSON-RPC, parse it
    if (typeof resp.data === 'string' && resp.data.trim().startsWith('{')) {
        return JSON.parse(resp.data);
    }

    // SSE response — extract the last JSON event
    if (typeof resp.data === 'string' && resp.data.includes('event:')) {
        const lines = (resp.data as string).split('\n');
        let lastData = '';
        for (const line of lines) {
            if (line.startsWith('data:')) {
                lastData = line.slice(5).trim();
            }
        }
        if (lastData) {
            return JSON.parse(lastData);
        }
    }

    return { status: resp.status, data: resp.data };
}

async function handleConnect(url: string): Promise<void> {
    try {
        sessionId = undefined;
        rpcId = 0;

        const initResult = await mcpPost(url, 'initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'arazzo-mcp-playground', version: '1.0.0' },
        });

        await mcpPost(url, 'notifications/initialized', undefined, false).catch(() => { /* ignore */ });

        panel?.webview.postMessage({
            command: 'connectResult',
            success: true,
            serverInfo: initResult?.result?.serverInfo,
        });
    } catch (err: any) {
        panel?.webview.postMessage({
            command: 'connectResult',
            success: false,
            error: err?.message || String(err),
        });
    }
}

async function handleListTools(url: string): Promise<void> {
    try {
        const result = await mcpPost(url, 'tools/list');
        panel?.webview.postMessage({
            command: 'listToolsResult',
            tools: result?.result?.tools || [],
        });
    } catch (err: any) {
        panel?.webview.postMessage({
            command: 'listToolsResult',
            tools: [],
            error: err?.message || String(err),
        });
    }
}

async function handleCallTool(url: string, toolName: string, args: Record<string, any>): Promise<void> {
    try {
        const result = await mcpPost(url, 'tools/call', { name: toolName, arguments: args });
        panel?.webview.postMessage({
            command: 'callToolResult',
            result: result?.result,
            toolName,
        });
    } catch (err: any) {
        panel?.webview.postMessage({
            command: 'callToolResult',
            result: null,
            error: err?.message || String(err),
            toolName,
        });
    }
}

// ─── Webview HTML (loads React bundle, same pattern as VisualizerWebview) ───

function getWebviewContent(webview: vscode.Webview, port: number): string {
    const scriptUri = getComposerJSFiles(extension.context, 'MCPPlayground', webview)
        .map(jsFile => '<script charset="UTF-8" src="' + jsFile + '"></script>')
        .join('\n');

    return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <title>MCP Playground</title>
          <style>
            body, html, #root {
                height: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
            }
            #loading-screen {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                display: flex; flex-direction: column;
                justify-content: center; align-items: center;
                background-color: var(--vscode-editor-background);
                z-index: 9999;
                transition: opacity 0.3s ease-out;
            }
            #loading-screen.hidden {
                opacity: 0;
                pointer-events: none;
            }
            .loading-spinner {
                width: 50px; height: 50px;
                border: 4px solid var(--vscode-editor-foreground);
                border-top-color: transparent;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            .loading-text {
                margin-top: 20px;
                color: var(--vscode-editor-foreground);
                font-family: var(--vscode-font-family);
                font-size: 14px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
          ${scriptUri}
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="loading-screen">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading MCP Playground...</div>
            </div>
            <div id="root"></div>
            <script>
            function render() {
                mcpPlayground.renderPlayground(
                    document.getElementById("root"), ${port}
                );
                setTimeout(function() {
                    var ls = document.getElementById("loading-screen");
                    if (ls) {
                        ls.classList.add("hidden");
                        setTimeout(function() { ls.remove(); }, 300);
                    }
                }, 500);
            }
            render();
            </script>
        </body>
        </html>
    `;
}
