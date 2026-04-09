/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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

import { AgentEvent, agentEvent } from "@wso2/mi-core";
import { RPCLayer } from "../../RPCLayer";
import { AiPanelWebview } from '../../ai-features/webview';
import { logWarn, logError, logDebug } from "../../ai-features/copilot/logger";

// Run-status safeguards for reconnect + polling fallback recovery.
const ENABLE_AGENT_RUN_SAFEGUARDS = true;

export class AgentEventHandler {
    private currentStepBuffer: AgentEvent[] = [];
    /** Full-run buffer for polling fallback (cleared per run). */
    private runBuffer: AgentEvent[] = [];
    private _isRunning = false;
    /** Monotonic sequence counter — increments across runs within a session */
    private _seqCounter = 0;

    constructor(private projectUri: string) {
        this.projectUri = projectUri;
    }

    beginRun(): void {
        if (!ENABLE_AGENT_RUN_SAFEGUARDS) {
            return;
        }
        this._isRunning = true;
        this.currentStepBuffer = [];
        this.runBuffer = [];
    }

    endRun(): void {
        if (!ENABLE_AGENT_RUN_SAFEGUARDS) {
            return;
        }
        this._isRunning = false;
        // Keep runBuffer intact so the frontend can poll final events after the run ends
        // (e.g. missed stop/error/abort). It gets cleared on next beginRun().
        // Clear current step replay buffer to avoid stale reconnection replays after run completion.
        this.currentStepBuffer = [];
    }

    stepCompleted(): void {
        if (!ENABLE_AGENT_RUN_SAFEGUARDS) {
            return;
        }
        this.currentStepBuffer = [];
    }

    getRunStatus(sinceSeq?: number): { isRunning: boolean; events: AgentEvent[] } {
        if (!ENABLE_AGENT_RUN_SAFEGUARDS) {
            return { isRunning: false, events: [] };
        }

        let events: AgentEvent[];
        if (sinceSeq !== undefined && sinceSeq >= 0) {
            // Polling mode: return only events the frontend has not seen yet.
            // Use full-run buffer so events from completed steps are still recoverable.
            const firstIndex = this.findFirstEventIndexAfterSeq(sinceSeq);
            events = firstIndex >= 0 ? this.runBuffer.slice(firstIndex) : [];
        } else {
            // Initial reconnection: return all buffered events for the current step
            // (backward-compatible with the existing panel-reopen flow)
            events = [...this.currentStepBuffer];
        }
        return {
            isRunning: this._isRunning,
            events,
        };
    }

    handleEvent(event: AgentEvent): void {
        if (ENABLE_AGENT_RUN_SAFEGUARDS) {
            // Assign monotonic sequence number
            event.seq = ++this._seqCounter;

            if (this._isRunning) {
                this.currentStepBuffer.push(event);
                this.runBuffer.push(event);
            }
        }
        if (event.type === 'stop' && event.modelMessages) {
            logDebug(`[AgentEventHandler] Sending stop event with ${event.modelMessages.length} modelMessages`);
        }
        this.sendEventToVisualizer(event);
    }

    private findFirstEventIndexAfterSeq(sinceSeq: number): number {
        let low = 0;
        let high = this.runBuffer.length - 1;
        let result = -1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const seq = this.runBuffer[mid].seq ?? 0;
            if (seq > sinceSeq) {
                result = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }

        return result;
    }

    handleStart(): void {
        this.handleEvent({ type: "start" });
    }

    handleContentBlock(content: string): void {
        this.handleEvent({ type: "content_block", content });
    }

    handleToolCall(toolName: string, toolInput?: unknown): void {
        this.handleEvent({ type: "tool_call", toolName, toolInput });
    }

    handleToolResult(toolName: string, toolOutput?: unknown): void {
        this.handleEvent({ type: "tool_result", toolName, toolOutput });
    }

    handleError(error: string): void {
        this.handleEvent({ type: "error", error });
    }

    handleAbort(): void {
        this.handleEvent({ type: "abort" });
    }

    handleStop(): void {
        this.handleEvent({ type: "stop" });
    }

    private sendEventToVisualizer(event: AgentEvent): void {
        try {
            const messenger = RPCLayer.getMessenger(this.projectUri);
            if (messenger) {
                messenger.sendNotification(
                    agentEvent,
                    { type: 'webview', webviewType: AiPanelWebview.viewType },
                    event
                );
            } else {
                logWarn(`No messenger found for project: ${this.projectUri}`);
            }
        } catch (error) {
            logError("Error sending agent event to visualizer", error);
        }
    }
}
