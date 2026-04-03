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

import React, { useState } from "react";
import { useMICopilotContext } from "./MICopilotContext";
import { convertEventsToMessages } from "../utils/eventToMessageConverter";

const FileChangesSegment: React.FC = () => {
    const {
        pendingReview,
        setPendingReview,
        rpcClient,
        setMessages,
    } = useMICopilotContext();
    const [isRejecting, setIsRejecting] = useState(false);
    const [error, setError] = useState("");

    if (!pendingReview) {
        return null;
    }

    const handleAccept = () => {
        if (isRejecting) {
            return;
        }
        setError("");
        setPendingReview(null);
    };

    const handleReject = async () => {
        if (isRejecting) {
            return;
        }
        if (!rpcClient) {
            setError("Agent connection is unavailable. Please reopen the panel and try again.");
            return;
        }

        setIsRejecting(true);
        setError("");
        try {
            const agentRpcClient = rpcClient.getMiAgentPanelRpcClient();
            let response = await agentRpcClient.undoLastCheckpoint({
                checkpointId: pendingReview.checkpointId,
                behavior: "soft",
            });

            // Backward compatibility with older backend confirmation handshake.
            if (!response.success && response.requiresConfirmation) {
                response = await agentRpcClient.undoLastCheckpoint({
                    checkpointId: pendingReview.checkpointId,
                    force: true,
                    behavior: "soft",
                });
            }

            if (!response.success) {
                throw new Error(response.error || "Reject failed");
            }

            const historyResponse = await agentRpcClient.loadChatHistory({});
            if (!historyResponse.success) {
                throw new Error(historyResponse.error || "Reject applied but failed to refresh history");
            }

            setMessages(convertEventsToMessages(historyResponse.events));
            setPendingReview(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Reject failed");
        } finally {
            setIsRejecting(false);
        }
    };

    return (
        <div
            style={{
                margin: "0 16px 10px 16px",
                width: "calc(100% - 32px)",
                maxWidth: "calc(100% - 32px)",
                boxSizing: "border-box",
                borderRadius: "10px",
                overflow: "hidden",
                border: "1px solid var(--vscode-panel-border)",
                background: "var(--vscode-editorHoverWidget-background)",
            }}
        >
            <div className="px-3 pt-3 pb-1 font-semibold" style={{ fontSize: "13px", color: "var(--vscode-foreground)" }}>
                Changes ready to review
            </div>
            <div className="px-3 pb-2" style={{ fontSize: "11px", color: "var(--vscode-descriptionForeground)" }}>
                <span style={{ color: "var(--vscode-testing-iconPassed)" }}>+{pendingReview.totalAdded}</span>
                {" "}
                <span style={{ color: "var(--vscode-testing-iconFailed)" }}>-{pendingReview.totalDeleted}</span>
                {" "}
                across {pendingReview.files.length} file{pendingReview.files.length === 1 ? "" : "s"}
            </div>

            <div className="px-3 py-1" style={{ borderTop: "1px solid var(--vscode-panel-border)" }}>
                {pendingReview.files.map((file) => (
                    <div
                        key={file.path}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            padding: "6px 0",
                            fontFamily: "var(--vscode-editor-font-family)",
                            fontSize: "12px",
                            minWidth: 0,
                        }}
                    >
                        <span
                            style={{
                                color: "var(--vscode-foreground)",
                                minWidth: 0,
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                            title={file.path}
                        >
                            {file.path}
                        </span>
                        <span style={{ flexShrink: 0, fontSize: "11px" }}>
                            <span style={{ color: "var(--vscode-testing-iconPassed)" }}>+{file.addedLines}</span>
                            {" "}
                            <span style={{ color: "var(--vscode-testing-iconFailed)" }}>-{file.deletedLines}</span>
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 px-3 py-2.5" style={{ borderTop: "1px solid var(--vscode-panel-border)" }}>
                <button
                    onClick={handleReject}
                    disabled={isRejecting}
                    className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors"
                    style={{
                        border: "1px solid var(--vscode-panel-border)",
                        backgroundColor: "var(--vscode-button-secondaryBackground)",
                        color: "var(--vscode-button-secondaryForeground)",
                        cursor: isRejecting ? "not-allowed" : "pointer",
                        opacity: isRejecting ? 0.6 : 1,
                    }}
                >
                    {isRejecting ? "Rejecting..." : "Reject"}
                </button>
                <button
                    onClick={handleAccept}
                    disabled={isRejecting}
                    className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors"
                    style={{
                        border: "1px solid var(--vscode-button-border)",
                        backgroundColor: "var(--vscode-button-background)",
                        color: "var(--vscode-button-foreground)",
                        cursor: isRejecting ? "not-allowed" : "pointer",
                        opacity: isRejecting ? 0.6 : 1,
                    }}
                >
                    Accept
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

export default FileChangesSegment;
