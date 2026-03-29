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

import React, { useMemo, useState } from "react";
import { Codicon } from "@wso2/ui-toolkit";
import { UndoCheckpointSummary } from "@wso2/mi-core";
import { useMICopilotContext } from "./MICopilotContext";
import { convertEventsToMessages } from "../utils/eventToMessageConverter";

interface FileChangesSegmentProps {
    summaryText: string;
    /** True if this is the latest (most recent) checkpoint in the message list */
    isLatest?: boolean;
}

/**
 * File changes card with discard-only pattern.
 *
 * - Latest checkpoint: full review card with Discard button + file list
 * - Older checkpoints: collapsed "Changes applied" (become latest again after discard of newer)
 * - Discarded: "Changes discarded" label
 */
const FileChangesSegment: React.FC<FileChangesSegmentProps> = ({ summaryText, isLatest = false }) => {
    const { rpcClient, setMessages, setCopilotChat } = useMICopilotContext();
    const [isUndoing, setIsUndoing] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string>("");

    const summary = useMemo<UndoCheckpointSummary | null>(() => {
        try {
            return JSON.parse(summaryText) as UndoCheckpointSummary;
        } catch {
            return null;
        }
    }, [summaryText]);

    if (!summary) {
        return null;
    }

    const isDiscarded = !summary.undoable;
    const canDiscard = summary.undoable && isLatest;

    const handleDiscardClick = () => {
        if (isUndoing || !summary.undoable || !isLatest) {
            return;
        }
        setError("");
        setIsConfirming(true);
    };

    const executeDiscard = async () => {
        if (isUndoing || !summary.undoable || !isLatest) return;
        if (!rpcClient) {
            setError("Agent connection is unavailable. Please reopen the panel and try again.");
            return;
        }

        setIsUndoing(true);
        setIsConfirming(false);
        setError("");
        try {
            const agentRpcClient = rpcClient.getMiAgentPanelRpcClient();
            let response = await agentRpcClient.undoLastCheckpoint({
                checkpointId: summary.checkpointId,
                behavior: 'soft',
            });
            // Backward compatibility with older backend confirmation handshake.
            if (!response.success && response.requiresConfirmation) {
                response = await agentRpcClient.undoLastCheckpoint({
                    checkpointId: summary.checkpointId,
                    force: true,
                    behavior: 'soft',
                });
            }

            if (!response.success) {
                throw new Error(response.error || "Discard failed");
            }

            const historyResponse = await agentRpcClient.loadChatHistory({});
            if (!historyResponse.success) {
                throw new Error(historyResponse.error || "Discard applied but failed to refresh history");
            }

            setMessages(convertEventsToMessages(historyResponse.events));
            setCopilotChat([]);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Discard failed");
        } finally {
            setIsUndoing(false);
        }
    };

    // --- Discarded state ---
    if (isDiscarded) {
        return (
            <div
                className="rounded-lg overflow-hidden mt-3"
                style={{ border: "1px solid var(--vscode-panel-border)" }}
            >
                <div
                    className="flex items-center gap-2 px-3 py-2.5"
                    style={{ color: "var(--vscode-descriptionForeground)", fontSize: "13px" }}
                >
                    <Codicon name="discard" />
                    <span className="font-medium">Changes discarded</span>
                </div>
            </div>
        );
    }

    // --- Collapsed state: older checkpoints or non-undoable ---
    if (!canDiscard) {
        return (
            <div
                className="rounded-lg overflow-hidden mt-3"
                style={{ border: "1px solid var(--vscode-panel-border)" }}
            >
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 transition-colors"
                    style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: "var(--vscode-foreground)",
                        fontSize: "13px",
                        textAlign: "left",
                    }}
                >
                    <Codicon name={isCollapsed ? "chevron-right" : "chevron-down"} />
                    <span className="font-medium">Changes applied</span>
                </button>
                {!isCollapsed && (
                    <div style={{ borderTop: "1px solid var(--vscode-panel-border)" }}>
                        <FileList files={summary.files} />
                    </div>
                )}
            </div>
        );
    }

    // --- Review state: latest checkpoint with Discard ---
    return (
        <div
            className="rounded-lg overflow-hidden mt-3"
            style={{
                border: "1px solid var(--vscode-panel-border)",
                background: "var(--vscode-editorHoverWidget-background)",
            }}
        >
            <div className="px-3 pt-3 pb-2 font-semibold" style={{ fontSize: "13px", color: "var(--vscode-foreground)" }}>
                Changes ready to review
            </div>

            <FileList files={summary.files} />

            <div className="flex justify-end gap-2 px-3 py-2.5" style={{ borderTop: "1px solid var(--vscode-panel-border)" }}>
                <button
                    onClick={handleDiscardClick}
                    disabled={isUndoing}
                    className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors"
                    style={{
                        border: "1px solid var(--vscode-panel-border)",
                        backgroundColor: "var(--vscode-button-secondaryBackground)",
                        color: "var(--vscode-button-secondaryForeground)",
                        cursor: isUndoing ? "not-allowed" : "pointer",
                        opacity: isUndoing ? 0.6 : 1,
                    }}
                >
                    {isUndoing ? "Discarding..." : isConfirming ? "Confirm Discard" : "Discard"}
                </button>
            </div>
            {isConfirming && !isUndoing && (
                <div className="px-3 py-2 text-xs flex items-center justify-between gap-2" style={{ borderTop: "1px solid var(--vscode-panel-border)" }}>
                    <span style={{ color: "var(--vscode-descriptionForeground)" }}>
                        Discard these changes? Conversation history stays; files and model context will be reverted.
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsConfirming(false)}
                            className="px-2 py-1 rounded"
                            style={{
                                border: "1px solid var(--vscode-panel-border)",
                                background: "var(--vscode-button-secondaryBackground)",
                                color: "var(--vscode-button-secondaryForeground)",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={executeDiscard}
                            className="px-2 py-1 rounded"
                            style={{
                                border: "1px solid var(--vscode-button-border)",
                                background: "var(--vscode-button-background)",
                                color: "var(--vscode-button-foreground)",
                            }}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="px-3 py-2 text-xs" style={{ color: "var(--vscode-errorForeground)", borderTop: "1px solid var(--vscode-panel-border)" }}>
                    {error}
                </div>
            )}
        </div>
    );
};

/** File list showing per-file path + added/deleted line counts */
function FileList({ files }: { files: { path: string; addedLines: number; deletedLines: number }[] }) {
    return (
        <div className="px-3 py-1">
            {files.map((file) => (
                <div
                    key={file.path}
                    className="flex justify-between items-center py-1.5"
                    style={{
                        fontFamily: "var(--vscode-editor-font-family)",
                        fontSize: "12px",
                    }}
                >
                    <span
                        className="truncate pr-2"
                        style={{ color: "var(--vscode-foreground)" }}
                        title={file.path}
                    >
                        {file.path}
                    </span>
                    <span className="shrink-0 text-[11px]">
                        <span style={{ color: "var(--vscode-testing-iconPassed)" }}>+{file.addedLines}</span>
                        {" "}
                        <span style={{ color: "var(--vscode-testing-iconFailed)" }}>-{file.deletedLines}</span>
                    </span>
                </div>
            ))}
        </div>
    );
}

export default FileChangesSegment;
