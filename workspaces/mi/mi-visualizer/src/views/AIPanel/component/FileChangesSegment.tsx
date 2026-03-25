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

interface FileChangesSegmentProps {
    summaryText: string;
}

/**
 * File changes card with accept/discard pattern.
 *
 * - Review state (undoable): "Changes ready to review" + file list + Discard / Keep
 * - Accepted state (after Keep or already non-undoable): collapsible "Changes accepted"
 */
const FileChangesSegment: React.FC<FileChangesSegmentProps> = ({ summaryText }) => {
    const { rpcClient, setMessages } = useMICopilotContext();
    const [isUndoing, setIsUndoing] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    const [isDiscarded, setIsDiscarded] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);
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

    const canReview = summary.undoable && !isAccepted && !isDiscarded;

    const handleDiscard = async () => {
        if (isUndoing || !summary.undoable) return;

        setIsUndoing(true);
        setError("");
        try {
            let response = await rpcClient.getMiAgentPanelRpcClient().undoLastCheckpoint({
                force: false,
                checkpointId: summary.checkpointId,
            } as any);

            if (response.requiresConfirmation) {
                const conflicts = response.conflicts || [];
                const shouldForce = window.confirm(
                    `These files changed after the checkpoint and will be overwritten:\n\n${conflicts.join('\n')}\n\nContinue with discard?`
                );
                if (!shouldForce) {
                    setIsUndoing(false);
                    return;
                }
                response = await rpcClient.getMiAgentPanelRpcClient().undoLastCheckpoint({
                    force: true,
                    checkpointId: summary.checkpointId,
                } as any);
            }

            if (!response.success) {
                throw new Error(response.error || "Discard failed");
            }

            // Update all filechanges tags to reflect new undoable state
            setMessages((prevMessages) => {
                const updateUndoable = (json: string): string => {
                    try {
                        const parsed = JSON.parse(json) as UndoCheckpointSummary;
                        if (!parsed || typeof parsed !== "object") return json;
                        const latestId = (response as any).latestUndoCheckpoint?.checkpointId as string | undefined;
                        const isLatest = latestId !== undefined && parsed.checkpointId === latestId;
                        return JSON.stringify({ ...parsed, undoable: isLatest });
                    } catch {
                        return json;
                    }
                };
                return prevMessages.map((msg) => ({
                    ...msg,
                    content: (msg.content || "").replace(
                        /<filechanges>([\s\S]*?)<\/filechanges>/g,
                        (_full, json) => `<filechanges>${updateUndoable(json)}</filechanges>`
                    ),
                }));
            });

            setIsDiscarded(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Discard failed");
        } finally {
            setIsUndoing(false);
        }
    };

    const handleKeep = () => {
        setIsAccepted(true);
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

    // --- Accepted / non-undoable state: collapsible ---
    if (isAccepted || !canReview) {
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
                    <span className="font-medium">Changes accepted</span>
                </button>
                {!isCollapsed && (
                    <div style={{ borderTop: "1px solid var(--vscode-panel-border)" }}>
                        <FileList files={summary.files} />
                    </div>
                )}
            </div>
        );
    }

    // --- Review state: Discard / Keep ---
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
                    onClick={handleDiscard}
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
                    {isUndoing ? "Discarding..." : "Discard"}
                </button>
                <button
                    onClick={handleKeep}
                    className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors"
                    style={{
                        border: "none",
                        backgroundColor: "var(--vscode-button-background)",
                        color: "var(--vscode-button-foreground)",
                        cursor: "pointer",
                    }}
                >
                    Keep
                </button>
            </div>

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
