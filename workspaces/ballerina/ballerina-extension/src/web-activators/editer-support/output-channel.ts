import { OUTPUT_CHANNEL_NAME } from "../constants/constants";
import * as vscode from "vscode";

export const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);

export function log(value: string): void {
    const output = withNewLine(value);
    console.log(output);
    outputChannel.append(output);
}

function withNewLine(value: string) {
    if (typeof value === "string" && !value.endsWith("\n")) {
        return (value += "\n");
    }
    return value;
}
