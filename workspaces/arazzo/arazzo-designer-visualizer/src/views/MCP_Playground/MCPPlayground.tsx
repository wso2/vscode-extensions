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

import { useCallback, useEffect, useRef, useState } from "react";
import { css } from "@emotion/css";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: {
        properties?: Record<string, { type?: string; description?: string }>;
        required?: string[];
    };
}

interface OutputEntry {
    id: number;
    html: string;
}

interface MCPPlaygroundProps {
    port: number;
    vscodeApi: {
        postMessage: (msg: any) => void;
    };
}

// ─── Styles (Emotion CSS with VS Code theme variables) ──────────────────────

const styles = {
    container: css`
        padding: 30px 46px;
        box-sizing: border-box;
        height: 100vh;
        overflow-y: auto;
        font-family: var(--vscode-font-family);
        color: var(--vscode-editor-foreground);
        max-width: 980px;
        margin: 0 auto;
    `,
    header: css`
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--vscode-panel-border);
    `,
    headerIcon: css`
        font-size: 22px;
    `,
    headerTitle: css`
        font-size: 18px;
        font-weight: 600;
        margin: 0;
    `,
    section: css`
        margin-bottom: 20px;
    `,
    sectionTitle: css`
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 8px;
    `,
    connectRow: css`
        display: flex;
        gap: 8px;
        align-items: center;
    `,
    urlInput: css`
        flex: 1;
        padding: 6px 10px;
        border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
        border-radius: 4px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        font-family: monospace;
        font-size: 13px;
        outline: none;
        &:focus {
            border-color: var(--vscode-focusBorder);
        }
    `,
    button: css`
        padding: 6px 14px;
        border: none;
        border-radius: 4px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
        transition: opacity 0.15s;
        &:hover {
            opacity: 0.9;
        }
        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `,
    status: css`
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        margin-top: 8px;
    `,
    statusDot: css`
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    `,
    toolsList: css`
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 12px;
    `,
    toolCard: css`
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        background: var(--vscode-editorWidget-background, var(--vscode-sideBar-background));
        overflow: hidden;
        transition: border-color 0.15s;
    `,
    toolCardSelected: css`
        border-color: var(--vscode-focusBorder);
    `,
    toolHeader: css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        cursor: pointer;
        user-select: none;
        &:hover {
            background: var(--vscode-list-hoverBackground);
        }
    `,
    toolName: css`
        font-weight: 600;
        font-family: monospace;
        font-size: 13px;
        color: var(--vscode-textLink-foreground);
    `,
    toolDesc: css`
        font-size: 12px;
        color: var(--vscode-descriptionForeground);
        padding: 0 14px 10px;
    `,
    toolBody: css`
        padding: 14px;
        border-top: 1px solid var(--vscode-panel-border);
    `,
    chevron: css`
        transition: transform 0.2s;
        font-size: 16px;
        color: var(--vscode-descriptionForeground);
    `,
    chevronOpen: css`
        transform: rotate(90deg);
    `,
    field: css`
        margin-bottom: 10px;
    `,
    fieldLabel: css`
        display: block;
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 4px;
    `,
    fieldType: css`
        font-weight: 400;
        color: var(--vscode-descriptionForeground);
        margin-left: 4px;
    `,
    fieldRequired: css`
        color: var(--vscode-errorForeground);
        margin-left: 2px;
    `,
    fieldInput: css`
        width: 100%;
        padding: 6px 10px;
        border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
        border-radius: 4px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        font-family: monospace;
        font-size: 13px;
        outline: none;
        resize: vertical;
        &:focus {
            border-color: var(--vscode-focusBorder);
        }
    `,
    fieldDesc: css`
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        margin-top: 2px;
    `,
    flexRow: css`
        display: flex;
        align-items: center;
        gap: 8px;
    `,
    sectionTitleRow: css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    `,
    btnIcon: css`
        background: none;
        border: none;
        padding: 4px 6px;
        cursor: pointer;
        color: var(--vscode-descriptionForeground);
        font-size: 15px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s, background 0.15s;
        &:hover {
            color: var(--vscode-foreground);
            background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
        }
    `,
    outputBox: css`
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        background: var(--vscode-editor-background);
        padding: 12px;
        font-family: monospace;
        font-size: 12px;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 400px;
        overflow-y: auto;
        min-height: 80px;
    `,
    timestamp: css`
        color: var(--vscode-descriptionForeground);
        font-size: 11px;
    `,
    errorText: css`
        color: var(--vscode-errorForeground);
    `,
    successText: css`
        color: var(--vscode-terminal-ansiGreen, #4caf50);
    `,
    jsonBlock: css`
        background: var(--vscode-textCodeBlock-background, rgba(30, 30, 30, 0.4));
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        padding: 10px 12px;
        margin: 4px 0 2px;
        overflow-x: auto;
        font-family: var(--vscode-editor-font-family, "Cascadia Code", "Fira Code", Consolas, monospace);
        font-size: var(--vscode-editor-font-size, 12px);
        line-height: 1.5;
    `,
    spinner: css`
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid var(--vscode-descriptionForeground);
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        vertical-align: middle;
        margin-right: 6px;
        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }
    `,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function now(): string {
    return new Date().toLocaleTimeString();
}

function escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function highlightJson(obj: any): string {
    try {
        const json = JSON.stringify(obj, null, 2);
        return json
            .replace(
                /("(?:\\.|[^"])*")\s*:/g,
                '<span style="color:var(--vscode-terminal-ansiCyan,#9cdcfe)">$1</span>:'
            )
            .replace(
                /:\s*("(?:\\.|[^"])*")/g,
                ': <span style="color:var(--vscode-terminal-ansiGreen,#ce9178)">$1</span>'
            )
            .replace(
                /:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g,
                ': <span style="color:var(--vscode-terminal-ansiYellow,#b5cea8)">$1</span>'
            )
            .replace(
                /:\s*(true|false)/g,
                ': <span style="color:var(--vscode-terminal-ansiBlue,#569cd6)">$1</span>'
            )
            .replace(
                /:\s*(null)/g,
                ': <span style="color:var(--vscode-terminal-ansiMagenta,#c586c0)">$1</span>'
            )
            .replace(
                /([\[\]{}])/g,
                '<span style="color:var(--vscode-descriptionForeground)">$1</span>'
            );
    } catch {
        return escapeHtml(String(obj));
    }
}

// ─── Clear All SVG Icon (VS Code codicon: clear-all) ────────────────────────

const ClearAllIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M10 12.6l.7.7 1.6-1.6 1.6 1.6.8-.7L13 11l1.7-1.6-.8-.8-1.6 1.7-1.6-1.7-.7.8 1.6 1.6-1.6 1.6zM1 4h14V3H1v1zm0 3h14V6H1v1zm8 2.5V9H1v1h8v-.5zM9 13v-1H1v1h8z" />
    </svg>
);

// ─── Sub-Components ─────────────────────────────────────────────────────────

interface ToolCardProps {
    tool: MCPTool;
    isSelected: boolean;
    onToggle: () => void;
    onExecute: (toolName: string, args: Record<string, any>) => void;
}

function ToolCard({ tool, isSelected, onToggle, onExecute }: ToolCardProps) {
    const schema = tool.inputSchema || {};
    const props = schema.properties || {};
    const required = schema.required || [];
    const propKeys = Object.keys(props);
    const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement>>({});

    const handleExecute = () => {
        const args: Record<string, any> = {};
        for (const key of propKeys) {
            const el = inputRefs.current[key];
            if (!el) continue;
            const val = el.value.trim();
            if (!val) continue;
            const type = props[key].type || "string";
            if (["object", "array", "number", "integer", "boolean"].includes(type)) {
                try {
                    args[key] = JSON.parse(val);
                } catch {
                    args[key] = val;
                }
            } else {
                args[key] = val;
            }
        }
        onExecute(tool.name, args);
    };

    return (
        <div className={`${styles.toolCard} ${isSelected ? styles.toolCardSelected : ""}`}>
            <div className={styles.toolHeader} onClick={onToggle}>
                <span className={styles.toolName}>{tool.name}</span>
                <span className={`${styles.chevron} ${isSelected ? styles.chevronOpen : ""}`}>&#9656;</span>
            </div>
            {tool.description && <div className={styles.toolDesc}>{tool.description}</div>}
            {isSelected && (
                <div className={styles.toolBody}>
                    {propKeys.map((key) => {
                        const prop = props[key];
                        const isReq = required.includes(key);
                        const type = prop.type || "string";
                        const desc = prop.description || "";
                        return (
                            <div key={key} className={styles.field}>
                                <label className={styles.fieldLabel}>
                                    {key}
                                    <span className={styles.fieldType}>({type})</span>
                                    {isReq && <span className={styles.fieldRequired}>*</span>}
                                </label>
                                {type === "object" || type === "array" ? (
                                    <textarea
                                        ref={(el) => { if (el) inputRefs.current[key] = el; }}
                                        className={styles.fieldInput}
                                        rows={3}
                                        placeholder="JSON value\u2026"
                                    />
                                ) : (
                                    <input
                                        ref={(el) => { if (el) inputRefs.current[key] = el; }}
                                        className={styles.fieldInput}
                                        type="text"
                                        placeholder={desc || key}
                                    />
                                )}
                                {desc && <div className={styles.fieldDesc}>{desc}</div>}
                            </div>
                        );
                    })}
                    <div className={styles.flexRow} style={{ marginTop: 8 }}>
                        <button className={styles.button} onClick={handleExecute}>Execute</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

let outputIdCounter = 0;

export function MCPPlayground({ port, vscodeApi }: MCPPlaygroundProps) {
    const [url, setUrl] = useState(`http://localhost:${port}/mcp`);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [statusText, setStatusText] = useState("Disconnected");
    const [tools, setTools] = useState<MCPTool[]>([]);
    const [listingTools, setListingTools] = useState(false);
    const [selectedToolIdx, setSelectedToolIdx] = useState<number | null>(null);
    const [executingTools, setExecutingTools] = useState(false);
    const [outputs, setOutputs] = useState<OutputEntry[]>([
        { id: outputIdCounter++, html: `<span class="${styles.timestamp}">Ready \u2014 connect to an MCP server to begin.</span>` },
    ]);

    const outputRef = useRef<HTMLDivElement>(null);
    const outputSectionRef = useRef<HTMLDivElement>(null);

    // Auto-scroll output box when new entries are appended
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [outputs]);

    const appendOutput = useCallback((html: string) => {
        setOutputs((prev) => [...prev, { id: outputIdCounter++, html }]);
    }, []);

    // Listen for messages from the extension
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const msg = event.data;
            switch (msg.command) {
                case "setUrl":
                    setUrl(msg.url);
                    break;
                case "connectResult":
                    setConnecting(false);
                    if (msg.success) {
                        setConnected(true);
                        const serverName = msg.serverInfo?.name || "MCP Server";
                        setStatusText(`Connected to ${serverName}`);
                        appendOutput(
                            `<span class="${styles.successText}">[${now()}] Connected successfully to ${escapeHtml(serverName)}</span>`
                        );
                    } else {
                        setConnected(false);
                        setStatusText("Connection failed");
                        appendOutput(
                            `<span class="${styles.errorText}">[${now()}] Connection failed: ${escapeHtml(msg.error)}</span>`
                        );
                    }
                    break;
                case "listToolsResult":
                    setListingTools(false);
                    if (msg.error) {
                        appendOutput(
                            `<span class="${styles.errorText}">[${now()}] Failed to list tools: ${escapeHtml(msg.error)}</span>`
                        );
                    } else {
                        const toolsList: MCPTool[] = msg.tools || [];
                        setTools(toolsList);
                        appendOutput(
                            `<span class="${styles.successText}">[${now()}] Found ${toolsList.length} tool(s)</span>`
                        );
                    }
                    break;
                case "callToolResult":
                    setExecutingTools(false);
                    if (msg.error) {
                        appendOutput(
                            `<span class="${styles.errorText}">[${now()}] Error calling ${escapeHtml(msg.toolName)}: ${escapeHtml(msg.error)}</span>`
                        );
                    } else {
                        appendOutput(
                            `<span class="${styles.successText}">[${now()}] Result from ${escapeHtml(msg.toolName)}:</span>` +
                            `<div class="${styles.jsonBlock}">${highlightJson(msg.result)}</div>`
                        );
                    }
                    break;
            }
        };
        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
    }, [appendOutput]);

    const handleConnect = () => {
        if (!url.trim()) return;
        setConnecting(true);
        setStatusText("Connecting\u2026");
        setOutputs([]);
        appendOutput(
            `<span class="${styles.timestamp}">[${now()}]</span> Connecting to ${escapeHtml(url.trim())}\u2026`
        );
        vscodeApi.postMessage({ command: "connect", url: url.trim() });
    };

    const handleListTools = () => {
        setListingTools(true);
        appendOutput(
            `<span class="${styles.timestamp}">[${now()}]</span> Listing tools\u2026`
        );
        vscodeApi.postMessage({ command: "listTools", url: url.trim() });
    };

    const handleCallTool = (toolName: string, args: Record<string, any>) => {
        setExecutingTools(true);
        appendOutput(
            `<span class="${styles.timestamp}">[${now()}]</span> Calling tool <b>${escapeHtml(toolName)}</b> with args: ${escapeHtml(JSON.stringify(args))}`
        );
        // Scroll to output section
        outputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        vscodeApi.postMessage({ command: "callTool", url: url.trim(), toolName, args });
    };

    const handleClearOutput = () => {
        setOutputs([
            { id: outputIdCounter++, html: `<span class="${styles.timestamp}">Output cleared.</span>` },
        ]);
    };

    const statusDotColor = connected
        ? "var(--vscode-terminal-ansiGreen, #4caf50)"
        : "var(--vscode-errorForeground, #f44)";

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <span className={styles.headerIcon}>&#9881;</span>
                <h1 className={styles.headerTitle}>MCP Playground</h1>
            </div>

            {/* Connection Section */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>Connection</div>
                <div className={styles.connectRow}>
                    <input
                        className={styles.urlInput}
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        spellCheck={false}
                    />
                    <button
                        className={styles.button}
                        onClick={handleConnect}
                        disabled={connecting}
                    >
                        {connecting ? "Connecting\u2026" : "Connect"}
                    </button>
                </div>
                <div className={styles.status}>
                    <span
                        className={styles.statusDot}
                        style={{ background: statusDotColor }}
                    />
                    <span>{statusText}</span>
                </div>
            </div>

            {/* Tools Section */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>Tools</div>
                <div className={styles.flexRow} style={{ marginTop: 8 }}>
                    <button
                        className={styles.button}
                        onClick={handleListTools}
                        disabled={!connected || listingTools}
                    >
                        List Tools
                    </button>
                    {listingTools && <span className={styles.spinner} />}
                </div>
                <div className={styles.toolsList}>
                    {tools.length === 0 && connected && !listingTools && (
                        <div style={{ color: "var(--vscode-descriptionForeground)" }}>
                            No tools available.
                        </div>
                    )}
                    {tools.map((tool, idx) => (
                        <ToolCard
                            key={tool.name}
                            tool={tool}
                            isSelected={selectedToolIdx === idx}
                            onToggle={() =>
                                setSelectedToolIdx(selectedToolIdx === idx ? null : idx)
                            }
                            onExecute={handleCallTool}
                        />
                    ))}
                </div>
            </div>

            {/* Output Section */}
            <div className={styles.section} ref={outputSectionRef}>
                <div className={styles.sectionTitleRow}>
                    <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                        Output
                    </div>
                    <button
                        className={styles.btnIcon}
                        onClick={handleClearOutput}
                        title="Clear output"
                    >
                        <ClearAllIcon />
                    </button>
                </div>
                <div
                    className={styles.outputBox}
                    ref={outputRef}
                    dangerouslySetInnerHTML={{
                        __html: outputs.map((o) => o.html).join("\n"),
                    }}
                />
            </div>
        </div>
    );
}
