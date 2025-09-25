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

import { CodeGenerationEvent } from "@wso2/mi-core";
import { RPCLayer } from "../../RPCLayer";
import { AiPanelWebview } from '../../ai-panel/webview';
import { codeGenerationEvent } from "@wso2/mi-core";

export class CopilotEventHandler {

    constructor(private projectUri: string) {
        this.projectUri = projectUri;
    }

    handleEvent(event: CodeGenerationEvent): void {
        this.sendEventToVisualizer(event);
    }

    handleStart(): void {
        this.sendEventToVisualizer({ type: "start" });
    }

    handleContentBlock(content: string): void {
        this.sendEventToVisualizer({ type: "content_block", content });
    }

    handleContentReplace(content: string): void {
        this.sendEventToVisualizer({ type: "content_replace", content });
    }

    handleDiagnostics(diagnostics: any[]): void {
        this.sendEventToVisualizer({ type: "diagnostics", diagnostics });
    }

    handleMessages(messages: any[]): void {
        this.sendEventToVisualizer({ type: "messages", messages });
    }

    handleError(error: string): void {
        this.sendEventToVisualizer({ type: "error", error });
    }

    handleStop(command?: string): void {
        this.sendEventToVisualizer({ type: "stop", command });
    }

    private sendEventToVisualizer(event: CodeGenerationEvent): void {
        try {
            const messenger = (RPCLayer as any)._messengers.get(this.projectUri);
            if (messenger) {
                messenger.sendNotification(
                    codeGenerationEvent, 
                    { type: 'webview', webviewType: AiPanelWebview.viewType }, 
                    event
                );
            } else {
                console.warn("No messenger found for project:", this.projectUri);
            }
        } catch (error) {
            console.error("Error sending event to visualizer:", error);
        }
    }
}
