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

import React from "react";
import { Codicon } from "@wso2/ui-toolkit";
import { useMICopilotContext } from "./MICopilotContext";

// Map tool action text to distinct icons for visual scanning
function getToolIcon(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes("search") || lower.includes("grep") || lower.includes("glob") || lower.includes("looking for") || lower.includes("searching")) {
        return "search";
    }
    if (lower.includes("fetched") || lower.includes("connector") || lower.includes("package") || lower.includes("dependency") || lower.includes("library")) {
        return "package";
    }
    if (lower.includes("updated") || lower.includes("created") || lower.includes("wrote") || lower.includes("edited") || lower.includes("writing")) {
        return "edit";
    }
    if (lower.includes("no issues") || lower.includes("validated") || lower.includes("diagnostics") || lower.includes("validation")) {
        return "pass";
    }
    if (lower.includes("reading") || lower.includes("read ")) {
        return "file";
    }
    if (lower.includes("shell") || lower.includes("running") || lower.includes("command")) {
        return "terminal";
    }
    if (lower.includes("subagent") || lower.includes("exploring") || lower.includes("agent")) {
        return "hubot";
    }
    if (lower.includes("build") || lower.includes("deploy") || lower.includes("server")) {
        return "play";
    }
    return "tools";
}

const PATH_CANDIDATE_REGEX = /([A-Za-z]:\\[^\s]+|(?:\.{1,2}\/|\/)?[^\s]*[\\/][^\s]+|[^\s]+\.[A-Za-z0-9]+(?:[^\s]*)?)/g;

function cleanPathCandidate(raw: string): string {
    return raw.replace(/[),.;:!?]+$/, "").replace(/^["'`]/, "").replace(/["'`]$/, "");
}

function extractPathFromText(text: string): string | undefined {
    const matches = Array.from(text.matchAll(PATH_CANDIDATE_REGEX));
    if (matches.length === 0) return undefined;
    const last = matches[matches.length - 1];
    if (!last[1]) return undefined;
    return cleanPathCandidate(last[1]);
}

function basename(path: string): string {
    const parts = path.split(/[\\/]/);
    return parts[parts.length - 1] || path;
}

function removeTrailingEllipsis(text: string): string {
    return text.replace(/\.\.\.$/, "").trimEnd();
}

interface ToolCallSegmentProps {
    text: string;
    loading: boolean;
    failed?: boolean;
    filePath?: string;
}

const ToolCallSegment: React.FC<ToolCallSegmentProps> = ({ text, loading, failed, filePath }) => {
    const { rpcClient } = useMICopilotContext();

    const resolvedPath = filePath || extractPathFromText(text);
    let action = text;
    let target = "";
    if (resolvedPath) {
        target = resolvedPath;
        const index = text.lastIndexOf(resolvedPath);
        if (index >= 0) {
            action = text.slice(0, index).trim();
        } else {
            action = text.replace(/\s+$/, "");
        }
    }

    const actionText = loading ? removeTrailingEllipsis(action) : action;
    const iconName = loading ? "loading" : (failed ? "error" : getToolIcon(text));
    const isCompleted = !loading && !failed;

    const handleTargetClick = () => {
        if (!target || !rpcClient) return;
        rpcClient.getMiDiagramRpcClient().openFile({ path: target });
    };

    return (
        <div
            className="flex items-center gap-2 py-1"
            style={{
                fontSize: "12.5px",
                color: isCompleted ? "var(--vscode-descriptionForeground)" : "var(--vscode-foreground)",
                opacity: isCompleted ? 0.6 : 1,
            }}
        >
            <span
                className={`codicon codicon-${iconName}${loading ? " spin" : ""}`}
                style={{
                    fontSize: "13px",
                    width: "14px",
                    height: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: failed
                        ? "var(--vscode-errorForeground)"
                        : loading
                            ? "var(--vscode-progressBar-background)"
                            : "var(--vscode-descriptionForeground)",
                    animation: loading ? "spin 1s linear infinite" : "none",
                }}
            />
            {actionText && <span>{actionText}</span>}
            {target && (
                <span
                    className="cursor-pointer font-medium"
                    style={{ color: "var(--vscode-textLink-foreground)" }}
                    onClick={handleTargetClick}
                    title={target}
                >
                    {basename(target)}
                </span>
            )}
            {loading && (
                <span className="inline-flex gap-px ml-0.5" style={{ color: "var(--vscode-descriptionForeground)" }}>
                    <span className="animate-fade-dot">.</span>
                    <span className="animate-fade-dot" style={{ animationDelay: "0.15s" }}>.</span>
                    <span className="animate-fade-dot" style={{ animationDelay: "0.3s" }}>.</span>
                </span>
            )}
        </div>
    );
};

export default ToolCallSegment;
