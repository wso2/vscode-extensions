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
import { Codicon } from "@wso2/ui-toolkit";
import { useMICopilotContext } from "./MICopilotContext";
import { convertEventsToMessages } from "../utils/eventToMessageConverter";

interface CheckpointIndicatorProps {
    /** The checkpoint anchor ID for the user turn below this divider. */
    targetCheckpointId: string;
    /** Custom action label (defaults to "Restore Checkpoint") */
    label?: string;
}

/**
 * Divider-style checkpoint indicator with restore capability.
 *
 * When clicked, restores directly to this checkpoint and truncates
 * conversation history after the selected checkpoint anchor.
 *
 * Visible on hover over the conversation turn (parent must have `group/turn` class).
 */
const CheckpointIndicator: React.FC<CheckpointIndicatorProps> = ({ targetCheckpointId, label = "Restore Checkpoint" }) => {
    const { rpcClient, setMessages, setCopilotChat } = useMICopilotContext();
    const [isRestoring, setIsRestoring] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const executeRestore = async () => {
        if (isRestoring) {
            return;
        }
        if (!rpcClient) {
            setError("Agent connection is unavailable. Please reopen the panel and try again.");
            return;
        }
        setIsRestoring(true);
        setIsConfirming(false);
        setError(null);

        try {
            const agentRpcClient = rpcClient.getMiAgentPanelRpcClient();
            let restoreResult = await agentRpcClient.undoLastCheckpoint({
                checkpointId: targetCheckpointId,
                behavior: 'hard',
            });
            // Backward compatibility with older backend confirmation handshake.
            if (!restoreResult.success && restoreResult.requiresConfirmation) {
                restoreResult = await agentRpcClient.undoLastCheckpoint({
                    checkpointId: targetCheckpointId,
                    force: true,
                    behavior: 'hard',
                });
            }

            if (!restoreResult.success) {
                setError(restoreResult.error || "Failed to restore checkpoint");
                return;
            }

            const historyResponse = await agentRpcClient.loadChatHistory({});
            if (!historyResponse.success) {
                setError(historyResponse.error || "Checkpoint restored, but failed to refresh history");
                return;
            }

            setMessages(convertEventsToMessages(historyResponse.events));
            setCopilotChat([]);
        } catch (err) {
            setError("Failed to restore checkpoint");
        } finally {
            setIsRestoring(false);
        }
    };

    const handleRestoreClick = () => {
        if (isRestoring) {
            return;
        }
        setError(null);
        setIsConfirming(true);
    };

    return (
        <div className="flex flex-col mt-1 mb-2 px-1">
            <div
                className={`relative flex items-center justify-center transition-opacity duration-200 ${
                    isConfirming || isRestoring || error
                        ? "opacity-100"
                        : "opacity-0 group-hover/turn:opacity-100"
                }`}
            >
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full" style={{ borderTop: "1px solid var(--vscode-panel-border)" }} />
                </div>
                <button
                    onClick={handleRestoreClick}
                    disabled={isRestoring}
                    className="relative flex items-center gap-1.5 px-3 py-1 rounded transition-colors"
                    style={{
                        border: "none",
                        background: "var(--vscode-editor-background)",
                        color: "var(--vscode-descriptionForeground)",
                        cursor: isRestoring ? "not-allowed" : "pointer",
                        opacity: isRestoring ? 0.5 : 1,
                        fontSize: "12px",
                    }}
                >
                    <span>{isRestoring ? "Restoring..." : isConfirming ? "Confirm Restore" : label}</span>
                    <Codicon name="discard" />
                </button>
            </div>
            {isConfirming && !isRestoring && (
                <div
                    className="mt-1 px-2 py-1 rounded flex items-center justify-between gap-2"
                    style={{
                        border: "1px solid var(--vscode-panel-border)",
                        background: "var(--vscode-editorHoverWidget-background)",
                        fontSize: "11px",
                        color: "var(--vscode-descriptionForeground)",
                    }}
                >
                    <span>Restore to this checkpoint? Later messages and manual edits will be lost.</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setIsConfirming(false)}
                            className="px-1.5 py-0.5 rounded"
                            style={{
                                border: "1px solid var(--vscode-panel-border)",
                                background: "var(--vscode-button-secondaryBackground)",
                                color: "var(--vscode-button-secondaryForeground)",
                                fontSize: "11px",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={executeRestore}
                            className="px-1.5 py-0.5 rounded"
                            style={{
                                border: "1px solid var(--vscode-button-border)",
                                background: "var(--vscode-button-background)",
                                color: "var(--vscode-button-foreground)",
                                fontSize: "11px",
                            }}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            )}
            {error && (
                <p className="text-[11px] mt-1" style={{ color: "var(--vscode-errorForeground)" }}>
                    {error}
                </p>
            )}
        </div>
    );
};

export default CheckpointIndicator;
