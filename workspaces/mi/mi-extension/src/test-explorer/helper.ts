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

import path = require("path");
import { RelativePattern, TestItem, Uri, commands, workspace } from "vscode";

export function getProjectRoot(uri: Uri): string | undefined {
    const ws = workspace.getWorkspaceFolder(uri);
    if (!ws) {
        return;
    }
    return ws.uri.fsPath;
}

export function getProjectName(uri: Uri): string | undefined {
    const ws = workspace.getWorkspaceFolder(uri);
    if (!ws) {
        return;
    }
    return path.basename(ws.uri.fsPath);
}

export function startWatchingWorkspace(matchPattern: string, refresh: () => void) {
    if (!workspace.workspaceFolders) {
        return [];
    }

    return workspace.workspaceFolders.map(workspaceFolder => {
        const pattern = new RelativePattern(workspaceFolder, matchPattern);
        const watcher = workspace.createFileSystemWatcher(pattern);

        watcher.onDidCreate(uri => refresh());
        watcher.onDidChange(async uri => refresh());
        watcher.onDidDelete(uri => refresh());

        return watcher;
    });
}
