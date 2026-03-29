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

import React, { useState, useRef, useEffect } from "react";
import { Codicon } from "@wso2/ui-toolkit";

interface BashOutputData {
    command: string;
    description?: string;
    output: string;
    exitCode: number;
    running?: boolean;
    loading?: boolean;
}

interface BashOutputSegmentProps {
    data: BashOutputData;
}

/** Get contextual icon name based on command content */
function getCommandIcon(command: string, description?: string): string {
    const text = `${command} ${description || ""}`.toLowerCase();
    if (text.includes("test")) return "beaker";
    if (text.includes("build") || text.includes("mvn") || text.includes("compile")) return "tools";
    return "play";
}

/** Get status text based on state */
function getStatusText(data: BashOutputData): string {
    if (data.loading || data.running) return "Running...";
    if (data.exitCode !== 0) return "Failed";
    return "Completed";
}

const BashOutputSegment: React.FC<BashOutputSegmentProps> = ({ data }) => {
    const [expanded, setExpanded] = useState(false);
    const prevLoadingRef = useRef(data.loading);

    const { command, description, output, loading, exitCode } = data;
    const isError = !loading && !data.running && exitCode !== 0;
    const iconName = getCommandIcon(command, description);
    const statusText = getStatusText(data);

    // Auto-expand on error
    useEffect(() => {
        if (prevLoadingRef.current && !loading && isError) {
            setExpanded(true);
        }
        prevLoadingRef.current = loading;
    }, [loading, isError]);

    const title = description || "Shell command";

    return (
        <div
            className="rounded-lg overflow-hidden my-2"
            style={{
                border: "1px solid var(--vscode-panel-border)",
                fontSize: "12.5px",
            }}
        >
            {/* Compact header */}
            <button
                onClick={() => !loading && setExpanded(!expanded)}
                disabled={loading}
                className="flex items-center gap-2 w-full px-3 py-2 transition-colors"
                style={{
                    border: "none",
                    background: "transparent",
                    cursor: loading ? "default" : "pointer",
                    color: "var(--vscode-foreground)",
                    textAlign: "left",
                }}
            >
                <Codicon name={iconName} />
                <span className="flex-1 text-left" style={{ color: "var(--vscode-foreground)", fontWeight: 500 }}>
                    {title}
                </span>
                <span className="text-[11px]" style={{ color: isError ? "var(--vscode-errorForeground)" : "var(--vscode-descriptionForeground)" }}>
                    {statusText}
                </span>
                {!loading && (
                    <span
                        className={`codicon codicon-chevron-${expanded ? "down" : "right"}`}
                        style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", transition: "transform 0.15s" }}
                    />
                )}
            </button>

            {/* Expandable details */}
            {expanded && (
                <div style={{ borderTop: "1px solid var(--vscode-panel-border)", backgroundColor: "var(--vscode-editor-background)" }}>
                    {/* Command */}
                    <div
                        className="flex items-center gap-2 px-3 py-1.5"
                        style={{
                            borderBottom: "1px solid var(--vscode-panel-border)",
                            fontFamily: "var(--vscode-editor-font-family)",
                            fontSize: "11px",
                        }}
                    >
                        <span style={{ color: "var(--vscode-terminal-ansiGreen)", userSelect: "none" }}>$</span>
                        <span style={{ color: "var(--vscode-foreground)" }}>{command}</span>
                    </div>
                    {/* Output */}
                    {(output || loading) && (
                        <div className="px-3 py-2 overflow-y-auto" style={{ maxHeight: "150px" }}>
                            {loading ? (
                                <span style={{ color: "var(--vscode-descriptionForeground)", fontStyle: "italic" }}>Running...</span>
                            ) : (
                                <pre
                                    style={{
                                        margin: 0,
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        fontFamily: "var(--vscode-editor-font-family)",
                                        fontSize: "11px",
                                        color: "var(--vscode-foreground)",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    {output}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BashOutputSegment;
