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

const FileChangesSegment: React.FC<FileChangesSegmentProps> = ({ summaryText }) => {
    const { rpcClient, setMessages } = useMICopilotContext();
    const [isUndoing, setIsUndoing] = useState(false);
    const [isUndone, setIsUndone] = useState(false);
    const [error, setError] = useState<string>("");

    const summary = useMemo<UndoCheckpointSummary | null>(() => {
        try {
            return JSON.parse(summaryText) as UndoCheckpointSummary;
        } catch {
            return null;
        }
    }, [summaryText]);

    if (!summary) {
        return (
            <div style={{ color: "var(--vscode-errorForeground)", marginTop: "8px" }}>
                Unable to render changed files.
            </div>
        );
    }

    const handleUndo = async () => {
        if (isUndoing || isUndone || !summary.undoable) {
            return;
        }

        setIsUndoing(true);
        setError("");
        try {
            let response = await rpcClient.getMiAgentPanelRpcClient().undoLastCheckpoint({
                force: false,
                checkpointId: summary.checkpointId,
            } as any);
            if (response.requiresConfirmation) {
                const conflicts = response.conflicts || [];
                const shouldForceUndo = window.confirm(
                    `These files changed after the checkpoint and will be overwritten:\n\n${conflicts.join('\n')}\n\nContinue with undo?`
                );
                if (!shouldForceUndo) {
                    setIsUndoing(false);
                    return;
                }
                response = await rpcClient.getMiAgentPanelRpcClient().undoLastCheckpoint({
                    force: true,
                    checkpointId: summary.checkpointId,
                } as any);
            }

            if (!response.success) {
                throw new Error(response.error || "Undo failed");
            }

            setMessages((prevMessages) => {
                const markSummaryUndoable = (summaryJson: string): string => {
                    try {
                        const parsedSummary = JSON.parse(summaryJson) as UndoCheckpointSummary;
                        if (!parsedSummary || typeof parsedSummary !== "object") {
                            return summaryJson;
                        }

                        const latestCheckpointId = (response as any).latestUndoCheckpoint?.checkpointId as string | undefined;
                        const isLatest = latestCheckpointId !== undefined
                            && parsedSummary.checkpointId === latestCheckpointId;

                        return JSON.stringify({
                            ...parsedSummary,
                            undoable: isLatest,
                        });
                    } catch {
                        return summaryJson;
                    }
                };

                return prevMessages.map((message) => ({
                    ...message,
                    content: (message.content || "").replace(
                        /<filechanges>([\s\S]*?)<\/filechanges>/g,
                        (_fullMatch, summaryJson) => `<filechanges>${markSummaryUndoable(summaryJson)}</filechanges>`
                    ),
                }));
            });

            setIsUndone(true);
        } catch (undoError) {
            setError(undoError instanceof Error ? undoError.message : "Undo failed");
        } finally {
            setIsUndoing(false);
        }
    };

    const totalFiles = summary.files.length;
    const canUndo = summary.undoable && !isUndone;

    return (
        <div
            style={{
                marginTop: "10px",
                borderRadius: "12px",
                border: "1px solid var(--vscode-widget-border)",
                background: "var(--vscode-editorHoverWidget-background)",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    fontWeight: 500,
                }}
            >
                <div>
                    {totalFiles} {totalFiles === 1 ? "file" : "files"} changed{" "}
                    <span style={{ color: "var(--vscode-testing-iconPassed)" }}>+{summary.totalAdded}</span>{" "}
                    <span style={{ color: "var(--vscode-testing-iconFailed)" }}>-{summary.totalDeleted}</span>
                </div>
                <button
                    onClick={handleUndo}
                    disabled={!canUndo || isUndoing}
                    style={{
                        border: "none",
                        background: "transparent",
                        color: canUndo ? "var(--vscode-editor-foreground)" : "var(--vscode-descriptionForeground)",
                        cursor: canUndo ? "pointer" : "default",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "14px",
                    }}
                >
                    <span>{isUndone ? "Undone" : isUndoing ? "Undoing..." : "Undo"}</span>
                    <Codicon name="discard" />
                </button>
            </div>

            {summary.files.map((file) => (
                <div
                    key={file.path}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderTop: "1px solid var(--vscode-widget-border)",
                        fontFamily: "var(--vscode-editor-font-family)",
                        fontSize: "12px",
                    }}
                >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "8px" }}>
                        {file.path}
                    </span>
                    <span style={{ flexShrink: 0 }}>
                        <span style={{ color: "var(--vscode-testing-iconPassed)" }}>+{file.addedLines}</span>{" "}
                        <span style={{ color: "var(--vscode-testing-iconFailed)" }}>-{file.deletedLines}</span>
                    </span>
                </div>
            ))}

            {error && (
                <div
                    style={{
                        borderTop: "1px solid var(--vscode-widget-border)",
                        padding: "10px 14px",
                        color: "var(--vscode-errorForeground)",
                        fontSize: "12px",
                    }}
                >
                    {error}
                </div>
            )}
        </div>
    );
};

export default FileChangesSegment;
