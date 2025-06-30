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

import { Position, Range, Uri, WorkspaceEdit, commands, workspace, window } from "vscode";
import * as fs from "fs";
import { COMMANDS } from "../constants";
import path from "path";
import { MILanguageClient } from "../lang-client/activator";
import { extension } from "../MIExtensionContext";

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
