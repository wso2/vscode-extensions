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
import { UndoCheckpointSummary } from "@wso2/mi-core";

interface CheckpointIndicatorProps {
    /** The checkpoint ID this divider corresponds to (from the previous assistant message). */
    targetCheckpointId: string;
}

/** Maximum cascade depth to prevent runaway loops. */
const MAX_CASCADE_DEPTH = 25;

/**
 * Divider-style checkpoint indicator with restore capability.
 *
 * When clicked, cascades undo from the latest checkpoint back to this
 * checkpoint's position (LIFO stack). Each undo in the cascade triggers
 * `saveUndoReminderMessage` on the backend so the model is informed.
 *
 * Visible on hover over the conversation turn (parent must have `group/turn` class).
 */
const CheckpointIndicator: React.FC<CheckpointIndicatorProps> = ({ targetCheckpointId }) => {
    const { rpcClient, setMessages } = useMICopilotContext();
    const [isRestoring, setIsRestoring] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRestore = async () => {
        if (!rpcClient || isRestoring) return;

        setIsRestoring(true);
        setError(null);

        try {
            let undoCount = 0;

            // Cascade: keep undoing until we've undone the target checkpoint
            // or until there are no more checkpoints.
            while (undoCount < MAX_CASCADE_DEPTH) {
                const result = await rpcClient.getMiAgentPanelRpcClient().undoLastCheckpoint({ force: false });

                if (!result.success) {
                    if (result.requiresConfirmation && result.conflicts && result.conflicts.length > 0) {
                        const shouldForce = window.confirm(
                            `These files changed after the checkpoint and will be overwritten:\n\n${result.conflicts.join('\n')}\n\nContinue with restore?`
                        );
                        if (!shouldForce) {
                            break;
                        }
                        const forceResult = await rpcClient.getMiAgentPanelRpcClient().undoLastCheckpoint({ force: true });
                        if (!forceResult.success) {
                            setError(forceResult.error || "Failed to restore checkpoint");
                            break;
                        }
                        undoCount++;
                        // Check if we just undid our target
                        if (forceResult.undoCheckpoint?.checkpointId === targetCheckpointId) {
                            break;
                        }
                        continue;
                    }
                    // No more checkpoints or other error
                    if (undoCount === 0) {
                        setError(result.error || "Failed to restore checkpoint");
                    }
                    break;
                }

                undoCount++;

                // Check if the checkpoint we just undid is our target
                if (result.undoCheckpoint?.checkpointId === targetCheckpointId) {
                    break;
                }

                // If there's no next checkpoint to undo, stop
                if (!result.latestUndoCheckpoint) {
                    break;
                }
            }

            if (undoCount > 0) {
                // Update all filechanges tags in UI to reflect new undoable state
                setMessages((prevMessages) =>
                    prevMessages.map((msg) => ({
                        ...msg,
                        content: (msg.content || "").replace(
                            /<filechanges>([\s\S]*?)<\/filechanges>/g,
                            (_full, json) => {
                                try {
                                    const parsed = JSON.parse(json) as UndoCheckpointSummary;
                                    return `<filechanges>${JSON.stringify({ ...parsed, undoable: false })}</filechanges>`;
                                } catch {
                                    return _full;
                                }
                            }
                        ),
                    }))
                );
            }
        } catch (err) {
            setError("Failed to restore checkpoint");
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="flex flex-col items-center mt-1 mb-3">
            <div
                className="checkpoint-hover flex items-center justify-center relative w-full transition-opacity duration-200"
                style={{ opacity: 0 }}
            >
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full" style={{ borderTop: "1px solid var(--vscode-panel-border)" }} />
                </div>
                <button
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="relative flex items-center gap-1.5 px-3 py-1 text-xs transition-colors"
                    style={{
                        backgroundColor: "var(--vscode-sideBar-background)",
                        color: "var(--vscode-descriptionForeground)",
                        border: "none",
                        cursor: isRestoring ? "not-allowed" : "pointer",
                        opacity: isRestoring ? 0.5 : 1,
                    }}
                >
                    <span>{isRestoring ? "Restoring..." : "Restore Checkpoint"}</span>
                    <Codicon name="discard" />
                </button>
            </div>
            {error && (
                <p className="text-[11px] mt-1" style={{ color: "var(--vscode-errorForeground)" }}>
                    {error}
                </p>
            )}
        </div>
    );
};

export default CheckpointIndicator;
