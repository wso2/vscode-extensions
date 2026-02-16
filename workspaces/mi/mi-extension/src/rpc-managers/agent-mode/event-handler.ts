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

    constructor(private projectUri: string) {
        this.projectUri = projectUri;
    }

    handleEvent(event: AgentEvent): void {
        if (event.type === 'stop' && event.modelMessages) {
            logDebug(`[AgentEventHandler] Sending stop event with ${event.modelMessages.length} modelMessages`);
        }
        this.sendEventToVisualizer(event);
    }

    handleStart(): void {
        this.sendEventToVisualizer({ type: "start" });
    }

    handleContentBlock(content: string): void {
        this.sendEventToVisualizer({ type: "content_block", content });
    }

    handleToolCall(toolName: string, toolInput?: unknown): void {
        this.sendEventToVisualizer({ type: "tool_call", toolName, toolInput });
    }

    handleToolResult(toolName: string, toolOutput?: unknown): void {
        this.sendEventToVisualizer({ type: "tool_result", toolName, toolOutput });
    }

    handleError(error: string): void {
        this.sendEventToVisualizer({ type: "error", error });
    }

    handleAbort(): void {
        this.sendEventToVisualizer({ type: "abort" });
    }

    handleStop(): void {
        this.sendEventToVisualizer({ type: "stop" });
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
