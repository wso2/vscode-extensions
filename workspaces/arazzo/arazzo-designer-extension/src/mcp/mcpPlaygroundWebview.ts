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
        }
    );

    panel.webview.html = getHtml(port);

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

// ─── Inline HTML / CSS / JS ────────────────────────────────────────────────

function getHtml(port: number): string {
    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>MCP Playground</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    padding: 16px;
    line-height: 1.5;
}
.header {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 20px; padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
}
.header h1 { font-size: 18px; font-weight: 600; }
.header .icon { font-size: 22px; }
.section { margin-bottom: 20px; }
.section-title {
    font-size: 12px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.5px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;
}
.connect-row { display: flex; gap: 8px; align-items: center; }
.connect-row input {
    flex: 1; padding: 6px 10px;
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    border-radius: 4px; background: var(--vscode-input-background);
    color: var(--vscode-input-foreground); font-family: monospace; font-size: 13px; outline: none;
}
.connect-row input:focus { border-color: var(--vscode-focusBorder); }
.status { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-top: 8px; }
.status-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--vscode-errorForeground, #f44); flex-shrink: 0;
}
.status-dot.connected { background: var(--vscode-terminal-ansiGreen, #4caf50); }
button {
    padding: 6px 14px; border: none; border-radius: 4px;
    background: var(--vscode-button-background); color: var(--vscode-button-foreground);
    font-size: 13px; cursor: pointer; white-space: nowrap; transition: opacity 0.15s;
}
button:hover { opacity: 0.9; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button.secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
.tools-list { display: flex; flex-direction: column; gap: 10px; }
.tool-card {
    border: 1px solid var(--vscode-panel-border); border-radius: 6px;
    background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
    overflow: hidden; transition: border-color 0.15s;
}
.tool-card.selected { border-color: var(--vscode-focusBorder); }
.tool-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; cursor: pointer; user-select: none;
}
.tool-header:hover { background: var(--vscode-list-hoverBackground); }
.tool-name { font-weight: 600; font-family: monospace; font-size: 13px; color: var(--vscode-textLink-foreground); }
.tool-desc { font-size: 12px; color: var(--vscode-descriptionForeground); padding: 0 14px 10px; }
.tool-body { display: none; padding: 0 14px 14px; border-top: 1px solid var(--vscode-panel-border); }
.tool-card.selected .tool-body { display: block; padding-top: 14px; }
.chevron { transition: transform 0.2s; font-size: 16px; color: var(--vscode-descriptionForeground); }
.tool-card.selected .chevron { transform: rotate(90deg); }
.field { margin-bottom: 10px; }
.field label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.field label .field-type { font-weight: 400; color: var(--vscode-descriptionForeground); margin-left: 4px; }
.field label .field-required { color: var(--vscode-errorForeground); margin-left: 2px; }
.field input, .field textarea {
    width: 100%; padding: 6px 10px;
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    border-radius: 4px; background: var(--vscode-input-background);
    color: var(--vscode-input-foreground); font-family: monospace; font-size: 13px;
    outline: none; resize: vertical;
}
.field input:focus, .field textarea:focus { border-color: var(--vscode-focusBorder); }
.field .field-desc { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; }
.output-box {
    border: 1px solid var(--vscode-panel-border); border-radius: 6px;
    background: var(--vscode-editor-background); padding: 12px;
    font-family: monospace; font-size: 12px; white-space: pre-wrap; word-break: break-word;
    max-height: 400px; overflow-y: auto; min-height: 80px;
}
.output-box .timestamp { color: var(--vscode-descriptionForeground); font-size: 11px; }
.output-box .error-text { color: var(--vscode-errorForeground); }
.output-box .success-text { color: var(--vscode-terminal-ansiGreen, #4caf50); }
.json-block {
    background: var(--vscode-textCodeBlock-background, rgba(30,30,30,0.4));
    border: 1px solid var(--vscode-panel-border); border-radius: 4px;
    padding: 10px 12px; margin: 4px 0 2px; overflow-x: auto;
    font-family: var(--vscode-editor-font-family, 'Cascadia Code', 'Fira Code', Consolas, monospace);
    font-size: var(--vscode-editor-font-size, 12px); line-height: 1.5;
}
.json-key { color: var(--vscode-terminal-ansiCyan, #9cdcfe); }
.json-string { color: var(--vscode-terminal-ansiGreen, #ce9178); }
.json-number { color: var(--vscode-terminal-ansiYellow, #b5cea8); }
.json-bool { color: var(--vscode-terminal-ansiBlue, #569cd6); }
.json-null { color: var(--vscode-terminal-ansiMagenta, #c586c0); }
.json-bracket { color: var(--vscode-descriptionForeground); }
.spinner {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid var(--vscode-descriptionForeground); border-top-color: transparent;
    border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 6px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.hidden { display: none !important; }
.mt-8 { margin-top: 8px; }
.mt-12 { margin-top: 12px; }
.flex-row { display: flex; align-items: center; gap: 8px; }
.section-title-row {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
}
.btn-icon {
    background: none; border: none; padding: 4px 6px; cursor: pointer;
    color: var(--vscode-descriptionForeground); font-size: 15px; border-radius: 4px;
    display: flex; align-items: center; justify-content: center; transition: color 0.15s, background 0.15s;
}
.btn-icon:hover {
    color: var(--vscode-foreground); background: var(--vscode-toolbar-hoverBackground, rgba(90,93,94,0.31));
}
</style>
</head>
<body>
<div class="header">
    <span class="icon">&#9881;</span>
    <h1>MCP Playground</h1>
</div>

<div class="section">
    <div class="section-title">Connection</div>
    <div class="connect-row">
        <input id="url" type="text" value="http://localhost:${port}/mcp" spellcheck="false" />
        <button id="btnConnect">Connect</button>
    </div>
    <div class="status" id="statusBar">
        <span class="status-dot" id="statusDot"></span>
        <span id="statusText">Disconnected</span>
    </div>
</div>

<div class="section" id="toolsSection">
    <div class="section-title">Tools</div>
    <div class="flex-row mt-8">
        <button id="btnListTools" disabled>List Tools</button>
        <span id="toolsSpinner" class="spinner hidden"></span>
    </div>
    <div class="tools-list mt-12" id="toolsList"></div>
</div>

<div class="section" id="outputSection">
    <div class="section-title-row">
        <div class="section-title" style="margin-bottom:0">Output</div>
        <button class="btn-icon" id="btnClearOutput" title="Clear output"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10 12.6l.7.7 1.6-1.6 1.6 1.6.8-.7L13 11l1.7-1.6-.8-.8-1.6 1.7-1.6-1.7-.7.8 1.6 1.6-1.6 1.6zM1 4h14V3H1v1zm0 3h14V6H1v1zm8 2.5V9H1v1h8v-.5zM9 13v-1H1v1h8z"/></svg></button>
    </div>
    <div class="output-box" id="output"><span class="timestamp">Ready \\u2014 connect to an MCP server to begin.</span></div>
</div>

<script>
(function () {
    const vscode = acquireVsCodeApi();
    const urlInput = document.getElementById('url');
    const btnConnect = document.getElementById('btnConnect');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const btnListTools = document.getElementById('btnListTools');
    const toolsSpinner = document.getElementById('toolsSpinner');
    const toolsList = document.getElementById('toolsList');
    const output = document.getElementById('output');
    const outputSection = document.getElementById('outputSection');
    const btnClearOutput = document.getElementById('btnClearOutput');
    let connected = false;
    let tools = [];

    btnClearOutput.addEventListener('click', function () {
        output.innerHTML = '<span class="timestamp">Output cleared.</span>';
    });

    function now() { return new Date().toLocaleTimeString(); }
    function appendOutput(html) { output.innerHTML += '\\n' + html; output.scrollTop = output.scrollHeight; }
    function clearOutput() { output.innerHTML = ''; }

    btnConnect.addEventListener('click', function () {
        const url = urlInput.value.trim();
        if (!url) return;
        btnConnect.disabled = true;
        btnConnect.textContent = 'Connecting\\u2026';
        statusText.textContent = 'Connecting\\u2026';
        clearOutput();
        appendOutput('<span class="timestamp">[' + now() + ']</span> Connecting to ' + escapeHtml(url) + '\\u2026');
        vscode.postMessage({ command: 'connect', url: url });
    });

    btnListTools.addEventListener('click', function () {
        btnListTools.disabled = true;
        toolsSpinner.classList.remove('hidden');
        appendOutput('<span class="timestamp">[' + now() + ']</span> Listing tools\\u2026');
        vscode.postMessage({ command: 'listTools', url: urlInput.value.trim() });
    });

    window.addEventListener('message', function (event) {
        var msg = event.data;
        switch (msg.command) {
            case 'setUrl':
                urlInput.value = msg.url;
                break;
            case 'connectResult':
                btnConnect.disabled = false;
                btnConnect.textContent = 'Connect';
                if (msg.success) {
                    connected = true;
                    statusDot.classList.add('connected');
                    var serverName = (msg.serverInfo && msg.serverInfo.name) || 'MCP Server';
                    statusText.textContent = 'Connected to ' + serverName;
                    btnListTools.disabled = false;
                    appendOutput('<span class="success-text">[' + now() + '] Connected successfully to ' + escapeHtml(serverName) + '</span>');
                } else {
                    connected = false;
                    statusDot.classList.remove('connected');
                    statusText.textContent = 'Connection failed';
                    btnListTools.disabled = true;
                    appendOutput('<span class="error-text">[' + now() + '] Connection failed: ' + escapeHtml(msg.error) + '</span>');
                }
                break;
            case 'listToolsResult':
                btnListTools.disabled = false;
                toolsSpinner.classList.add('hidden');
                if (msg.error) {
                    appendOutput('<span class="error-text">[' + now() + '] Failed to list tools: ' + escapeHtml(msg.error) + '</span>');
                    break;
                }
                tools = msg.tools || [];
                appendOutput('<span class="success-text">[' + now() + '] Found ' + tools.length + ' tool(s)</span>');
                renderTools(tools);
                break;
            case 'callToolResult':
                document.querySelectorAll('.btn-execute').forEach(function (btn) { btn.disabled = false; });
                document.querySelectorAll('.exec-spinner').forEach(function (s) { s.classList.add('hidden'); });
                if (msg.error) {
                    appendOutput('<span class="error-text">[' + now() + '] Error calling ' + escapeHtml(msg.toolName) + ': ' + escapeHtml(msg.error) + '</span>');
                } else {
                    appendOutput('<span class="success-text">[' + now() + '] Result from ' + escapeHtml(msg.toolName) + ':</span>' + renderJsonBlock(msg.result));
                }
                break;
        }
    });

    function renderTools(toolsArr) {
        toolsList.innerHTML = '';
        if (toolsArr.length === 0) {
            toolsList.innerHTML = '<div style="color:var(--vscode-descriptionForeground)">No tools available.</div>';
            return;
        }
        toolsArr.forEach(function (tool, idx) {
            var card = document.createElement('div');
            card.className = 'tool-card';
            card.dataset.idx = idx;
            var schema = tool.inputSchema || {};
            var props = schema.properties || {};
            var required = schema.required || [];
            var fieldsHtml = '';
            var propKeys = Object.keys(props);
            for (var i = 0; i < propKeys.length; i++) {
                var key = propKeys[i];
                var prop = props[key];
                var isRequired = required.indexOf(key) >= 0;
                var desc = prop.description || '';
                var type = prop.type || 'string';
                fieldsHtml += '<div class="field">'
                    + '<label>' + escapeHtml(key)
                    + '<span class="field-type">(' + escapeHtml(type) + ')</span>'
                    + (isRequired ? '<span class="field-required">*</span>' : '')
                    + '</label>'
                    + (type === 'object' || type === 'array'
                        ? '<textarea data-param="' + escapeHtml(key) + '" data-type="' + escapeHtml(type) + '" rows="3" placeholder="JSON value\\u2026"></textarea>'
                        : '<input data-param="' + escapeHtml(key) + '" data-type="' + escapeHtml(type) + '" type="text" placeholder="' + escapeHtml(desc || key) + '" />')
                    + (desc ? '<div class="field-desc">' + escapeHtml(desc) + '</div>' : '')
                    + '</div>';
            }
            card.innerHTML =
                '<div class="tool-header">'
                    + '<span class="tool-name">' + escapeHtml(tool.name) + '</span>'
                    + '<span class="chevron">&#9656;</span>'
                + '</div>'
                + (tool.description ? '<div class="tool-desc">' + escapeHtml(tool.description) + '</div>' : '')
                + '<div class="tool-body">'
                    + fieldsHtml
                    + '<div class="flex-row mt-8">'
                        + '<button class="btn-execute">Execute</button>'
                        + '<span class="exec-spinner spinner hidden"></span>'
                    + '</div>'
                + '</div>';
            card.querySelector('.tool-header').addEventListener('click', function () {
                var wasSelected = card.classList.contains('selected');
                document.querySelectorAll('.tool-card').forEach(function (c) { c.classList.remove('selected'); });
                if (!wasSelected) card.classList.add('selected');
            });
            card.querySelector('.btn-execute').addEventListener('click', function () {
                var args = {};
                card.querySelectorAll('[data-param]').forEach(function (input) {
                    var paramKey = input.dataset.param;
                    var paramType = input.dataset.type || 'string';
                    var val = input.value.trim();
                    if (!val) return;
                    if (paramType === 'object' || paramType === 'array' || paramType === 'number' || paramType === 'integer' || paramType === 'boolean') {
                        try { val = JSON.parse(val); } catch (e) { /* keep as string */ }
                    }
                    args[paramKey] = val;
                });
                card.querySelector('.btn-execute').disabled = true;
                card.querySelector('.exec-spinner').classList.remove('hidden');
                appendOutput('<span class="timestamp">[' + now() + ']</span> Calling tool <b>' + escapeHtml(tool.name) + '</b> with args: ' + escapeHtml(JSON.stringify(args)));
                outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                vscode.postMessage({ command: 'callTool', url: urlInput.value.trim(), toolName: tool.name, args: args });
            });
            toolsList.appendChild(card);
        });
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') str = String(str);
        var p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }
    function formatJson(obj) {
        try { return JSON.stringify(obj, null, 2); }
        catch (e) { return String(obj); }
    }
    function renderJsonBlock(obj) {
        try {
            var json = JSON.stringify(obj, null, 2);
            var highlighted = json.replace(
                /("(?:\\\\.|[^"])*")\\s*:/g,
                '<span class="json-key">$1</span>:'
            ).replace(
                /:\\s*("(?:\\\\.|[^"])*")/g,
                ': <span class="json-string">$1</span>'
            ).replace(
                /:\\s*(-?\\d+\\.?\\d*(?:[eE][+-]?\\d+)?)/g,
                ': <span class="json-number">$1</span>'
            ).replace(
                /:\\s*(true|false)/g,
                ': <span class="json-bool">$1</span>'
            ).replace(
                /:\\s*(null)/g,
                ': <span class="json-null">$1</span>'
            ).replace(
                /([\\[\\]{}])/g,
                '<span class="json-bracket">$1</span>'
            );
            return '<div class="json-block">' + highlighted + '</div>';
        } catch (e) {
            return '<div class="json-block">' + escapeHtml(String(obj)) + '</div>';
        }
    }
})();
</script>
</body>
</html>`;
}
