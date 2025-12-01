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

import { Position, Range, Uri, WorkspaceEdit, commands, workspace, window, TabInputText } from "vscode";
import * as fs from "fs";
import { COMMANDS } from "../constants";
import path from "path";
import { MILanguageClient } from "../lang-client/activator";
import { webviews } from "../visualizer/webview";

export async function replaceFullContentToFile(documentUri: string, content: string) {
    // Create the file if not present
    let isNewFile = false;
    const edit = new WorkspaceEdit();
    if (!fs.existsSync(documentUri)) {
        // Create parent directories if they don't exist
        fs.mkdirSync(documentUri.substring(0, documentUri.lastIndexOf(path.sep)), { recursive: true });
        // Create the file
        edit.createFile(Uri.file(documentUri), { contents: new TextEncoder().encode(content) });
        isNewFile = true;
    } else {
        const fileContent = fs.readFileSync(documentUri, 'utf-8');
        const lineCount = fileContent.split('\n').length;
        const fullRange = new Range(new Position(0, 0), new Position(lineCount, 0));

        edit.replace(Uri.file(documentUri), fullRange, content);
    }
    await workspace.applyEdit(edit);
    if (isNewFile) {
        // Wait for the file to be fully created and accessible
        const maxRetries = 5;
        const retryDelay = 100;

        let retries = 0;
        while (retries < maxRetries) {
            try {
                await fs.promises.access(documentUri, fs.constants.F_OK | fs.constants.R_OK);
                break;
            } catch (error) {
                retries++;
                if (retries >= maxRetries) {
                    console.warn(`File ${documentUri} not accessible after ${maxRetries} attempts`);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        commands.executeCommand(COMMANDS.REFRESH_COMMAND);
    }
}

export async function askForProject(): Promise<string> {
    const projects: Map<string, string> = new Map();
    for (const wrkspace of workspace.workspaceFolders!) {
        const lsClient = await MILanguageClient.getInstance(wrkspace.uri.fsPath);
        if (lsClient) {
            const projectDetails = await lsClient.languageClient?.getProjectDetails();
            if (projectDetails?.primaryDetails?.projectName?.value) {
                if (projects.has(projectDetails.primaryDetails.projectName.value)) {
                    projects.set(wrkspace.uri.fsPath, wrkspace.uri.fsPath);
                } else {
                    projects.set(projectDetails.primaryDetails.projectName.value, wrkspace.uri.fsPath);
                }
            }
        }
    }
    const quickPick = await window.showQuickPick(
        Array.from(projects.keys()),
        {
            placeHolder: 'Please select a project'
        }
    );
    if (!quickPick) {
        return "";
    }
    return projects.get(quickPick)!;
}

export async function saveIdpSchemaToFile(folderPath: string, fileName: string, fileContent?: string, imageOrPdf?: string): Promise<boolean> {
    const documentUri = path.join(folderPath, fileName + ".json");
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
    if (fileContent) {
        fs.writeFileSync(documentUri, fileContent, 'utf-8');
    }
    if (imageOrPdf) {
        const extensionsToDelete = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const filesInFolder = await fs.promises.readdir(folderPath);
        for (const file of filesInFolder) {
            const ext = path.extname(file).toLowerCase();
            if (extensionsToDelete.includes(ext)) {
                await fs.promises.unlink(path.join(folderPath, file));
            }
        }
        const mimeTypeMatch = imageOrPdf.match(/^data:(.*?);base64,/);
        if (mimeTypeMatch) {
            const mimeType = mimeTypeMatch[1];
            let extension = "";
            if (mimeType === "application/pdf") {
                extension = ".pdf";
            } else if (mimeType.startsWith("image/")) {
                extension = mimeType.split("/")[1];
                extension = `.${extension}`;
            } else {
                console.error("Unsupported MIME type:", mimeType);
                return false;
            }
            const base64Data = imageOrPdf.replace(/^data:.*;base64,/, "");
            const binaryData = Buffer.from(base64Data, "base64");
            const filePath = path.join(folderPath, fileName + extension);
            fs.writeFileSync(filePath, binaryData);
        } else {
            console.error("Invalid base64 string format.");
            return false;
        }
    }
    commands.executeCommand(COMMANDS.REFRESH_COMMAND);
    return true;
}

export function enableLSForWorkspace(workspacePath: string): void {
    window.onDidChangeActiveTextEditor(async (event) => {
        const hasActiveWebview = webviews.has(workspacePath);

        if (hasActiveWebview) {
            return;
        }
        if (!event) { // No text editors
            await MILanguageClient.stopInstance(workspacePath);
            return;
        }
        const hasActiveDocument = hasActiveDocumentInWorkspace(workspacePath);

        if (hasActiveDocument) {
            await MILanguageClient.getInstance(workspacePath);
        } else {
            await MILanguageClient.stopInstance(workspacePath);
        }
    });
}

export function hasActiveDocumentInWorkspace(workspacePath: string): boolean {
    const artifactsPath = path.join(workspacePath, 'src', 'main', 'wso2mi', 'artifacts');
    for (const tabGroup of window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
            if (tab.input instanceof TabInputText && tab.input.uri.fsPath.startsWith(artifactsPath)) {
                return true;
            }
        }
    }
    return false;
}
