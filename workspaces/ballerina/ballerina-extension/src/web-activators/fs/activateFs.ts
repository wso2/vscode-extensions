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

import * as vscode from "vscode";
import { LANGUAGE, ballerinaExtInstance } from "../../core/extension";
import { BalFileSystemProvider } from "./BalFileSystemProvider";

export const WEB_IDE_SCHEME = "web-bala";
export const STD_LIB_SCHEME = "bala";
const fsProvider = new BalFileSystemProvider();

export function activateFileSystemProvider() {
    // Register fs provider
    ballerinaExtInstance.fsProvider = fsProvider;
    ballerinaExtInstance.context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider(WEB_IDE_SCHEME, fsProvider, { isReadonly: false }),
        vscode.workspace.registerFileSystemProvider(STD_LIB_SCHEME, fsProvider, { isReadonly: true })
    );

    // Register the command to open a github repository
    ballerinaExtInstance.context.subscriptions.push(
        vscode.commands.registerCommand("ballerina.openGithubRepository", async () => {
            const repoUrl = await vscode.window.showInputBox({ placeHolder: 'Enter repository URL' });
            if (!repoUrl) {
                return;
            }
            const repoInfo = extractGitHubRepoInfo(repoUrl);
            if (!repoInfo) {
                vscode.window.showErrorMessage("Invalid repository URL");
                return;
            }
            vscode.workspace.updateWorkspaceFolders(
                vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0,
                0,
                {
                    uri: vscode.Uri.parse(`${WEB_IDE_SCHEME}:/${repoInfo.username}/${repoInfo.repo}`),
                    name: `${repoInfo.username}/${repoInfo.repo}`,
                }
            );
            vscode.window.showInformationMessage("Cloning the repository...");
        })
    );

    // Delete folder in the fs while removing folder from the workspace
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        if (event.removed.length > 0) {
            for (const folder of event.removed) {
                if (folder.uri.scheme === WEB_IDE_SCHEME) {
                    fsProvider.delete(folder.uri);
                }
            }
        }
    });

    // Track active ballerina text file
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (!editor && vscode.window.visibleTextEditors.length === 0) {
            ballerinaExtInstance.activeBalFileUri = undefined;
        }
        if (editor && editor.document.languageId === LANGUAGE.BALLERINA) {
            ballerinaExtInstance.activeBalFileUri = editor.document.uri.toString();
        }
        if (editor && editor.document.languageId !== LANGUAGE.BALLERINA) {
            ballerinaExtInstance.activeBalFileUri = undefined;
        }
    });
}

function extractGitHubRepoInfo(url: string): { username: string; repo: string } | null {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?$/);
    return match ? { username: match[1], repo: match[2].replace(".git", "") } : null;
}
