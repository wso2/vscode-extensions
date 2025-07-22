/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import * as vscode from "vscode";

export const outputChannel = vscode.window.createOutputChannel("WSO2 Integrator: SI");
const logLevelDebug: boolean = vscode.workspace.getConfiguration("siddhi").get("debugLog") === true;
export const ERROR_LOG = "ERROR";
export const INFO_LOG = "INFO";

function withNewLine(value: string) {
    if (typeof value === "string" && !value.endsWith("\n")) {
        return (value += "\n");
    }
    return value;
}

export function log(value: string): void {
    const output = withNewLine(value);
    outputChannel.append(output);
}

export function debug(value: string): void {
    const output = withNewLine(value);
    if (logLevelDebug) {
        outputChannel.append(output);
    }
}

export function showOutputChannel(): void {
    outputChannel.show();
}
