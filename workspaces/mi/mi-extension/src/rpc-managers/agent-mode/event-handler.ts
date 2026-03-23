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

export class AgentEventHandler {
    private currentStepBuffer: AgentEvent[] = [];
    /** Full-run event buffer for polling fallback (kept across steps, cleared per run) */
    private runBuffer: AgentEvent[] = [];
    private _isRunning = false;
    /** Monotonic sequence counter — increments across runs within a session */
    private _seqCounter = 0;

    constructor(private projectUri: string) {
        this.projectUri = projectUri;
    }

    beginRun(): void {
        this._isRunning = true;
        this.currentStepBuffer = [];
        this.runBuffer = [];
    }

    endRun(): void {
        this._isRunning = false;
        this.currentStepBuffer = [];
        // Keep runBuffer intact so the frontend can poll final events after the run ends
        // (e.g. the "stop" event that may have been missed). It gets cleared on next beginRun().
    }

    stepCompleted(): void {
        this.currentStepBuffer = [];
    }

    getRunStatus(sinceSeq?: number): { isRunning: boolean; events: AgentEvent[] } {
        let events: AgentEvent[];
        if (sinceSeq !== undefined && sinceSeq > 0) {
            // Polling mode: return only events the frontend hasn't seen yet
            events = this.runBuffer.filter(e => (e.seq ?? 0) > sinceSeq);
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
        // Assign monotonic sequence number
        event.seq = ++this._seqCounter;

        if (this._isRunning) {
            this.currentStepBuffer.push(event);
            this.runBuffer.push(event);
        }
        if (event.type === 'stop' && event.modelMessages) {
            logDebug(`[AgentEventHandler] Sending stop event with ${event.modelMessages.length} modelMessages`);
        }
        this.sendEventToVisualizer(event);
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
