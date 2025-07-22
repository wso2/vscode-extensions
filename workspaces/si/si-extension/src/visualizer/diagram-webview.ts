/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import * as vscode from "vscode";
import { WEBVIEW_ID, WEBVIEW_TITLE, UI_COMMANDS } from "../constants";
import { WebviewBase } from "./webview-base";
import { extension } from "../SIExtensionContext";
import { decodeFromBase64, encodeToBase64, replaceContentOfStoredUri } from "../utils/utils";
import { StateMachine } from "../stateMachine";

export class DiagramVisualizerWebview extends WebviewBase {
    constructor() {
        super("index.html", WEBVIEW_ID, WEBVIEW_TITLE, vscode.ViewColumn.One);
    }

    public registerEventListeners() {
        this._panel!.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === UI_COMMANDS.SUBMIT_DESIGN) {
                    const content = await StateMachine.context().langClient?.getSourceCode(encodeToBase64(message.payload));
                    if (!content || !content.content) {
                        vscode.window.showErrorMessage("Failed to retrieve source code.");
                        return;
                    }
                    const decoded = decodeFromBase64(content.content);
                    replaceContentOfStoredUri(extension.fileUri, this.removeConsecutiveNewlines(decoded));
                }
            },
            undefined,
            extension.context.subscriptions
        );
    }

    public dispose() {
        vscode.commands.executeCommand("setContext", "SI.isVisualizerActive", "false");
        this._panel?.dispose();
    }

    private removeConsecutiveNewlines(text: string): string {
        const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        let maxNewlines = 2; // Maximum number of consecutive newlines allowed
        const pattern = new RegExp(`\\n{${maxNewlines + 1},}`, 'g');
        const replacement = '\n'.repeat(maxNewlines); 
        return normalized.replace(pattern, replacement);
    }

}
