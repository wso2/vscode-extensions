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

import { Uri, Webview, workspace } from "vscode";
import * as fs from "fs";
import * as path from "path";
import { extension } from "./biExtentionContext";
import * as vscode from "vscode";

export interface ProjectInfo {
    isBI: boolean;
    isBallerina: boolean;
    isMultiRoot: boolean;
}

export function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
    if (process.env.WEB_VIEW_DEV_MODE === "true") {
        return new URL(pathList[pathList.length - 1], process.env.WEB_VIEW_DEV_HOST as string).href;
    }
    return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

export async function fetchProjectInfo(): Promise<ProjectInfo> {
    const workspaceUris = workspace.workspaceFolders ? workspace.workspaceFolders.map((folder) => folder.uri) : [];
    let isBICount = 0; // Counter for workspaces with isBI set to true
    let isBalCount = 0; // Counter for workspaces with Ballerina project
    // Check each workspace folder's configuration for 'isBI'
    for (const uri of workspaceUris) {
        const isBallerina = await checkIsBallerina(uri);
        if (isBallerina) {
            isBalCount++;
            if (checkIsBI(uri)) {
                isBICount++;
            }
        }
    }

    return {
        isBI: isBICount > 0,
        isBallerina: isBalCount > 0,
        isMultiRoot: isBalCount > 1, // Set to true only if more than one workspace has a Ballerina project
    };
}

export function checkIsBI(uri: Uri): boolean {
    const config = workspace.getConfiguration("ballerina", uri);
    const inspected = config.inspect<boolean>("isBI");
    //manually true the biSupported value only for webmode
    if (extension.isWebMode) {
        extension.biSupported = true;
    }
    const isBISupported = extension.biSupported;

    if (inspected && isBISupported) {
        // Added a check to see if the current version of ballerina supports bi
        const valuesToCheck = [inspected.workspaceFolderValue, inspected.workspaceValue, inspected.globalValue];
        return valuesToCheck.find((value) => value === true) !== undefined; // Return true if isBI is set to true
    }
    return false; // Return false if isBI is not set
}

export async function checkIsBallerina(uri: Uri): Promise<boolean> {
    const ballerinaTomlPath = extension.isWebMode
        ? Uri.joinPath(uri, "Ballerina.toml")
        : path.join(uri.fsPath, "Ballerina.toml");
    if (extension.isWebMode) {
        return await listDirectoryContents(Uri.parse(uri.toString()), Uri.parse(ballerinaTomlPath.toString()));
    } else {
        return fs.existsSync(ballerinaTomlPath.toString());
    }
}

export function checkBallerinTomlPath(tomlUri: string): boolean {
    const workspaceUris = workspace.workspaceFolders ? workspace.workspaceFolders.map((folder) => folder.uri) : [];
    for (const uri of workspaceUris) {
        if (uri.toString() == tomlUri) {
            return true;
        }
    }
    return false;
}

export async function listDirectoryContents(Baseuri: vscode.Uri, targetUri: vscode.Uri): Promise<boolean> {
    try {
        // Read directory entries (files + folders)
        const entries = await vscode.workspace.fs.readDirectory(Baseuri);
        const targetUriString = Uri.parse(targetUri.toString());

        for (const [name, type] of entries) {
            const fullPath = vscode.Uri.joinPath(Baseuri, name).toString();
            if (targetUriString.toString() === fullPath) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error(`Error reading ${Baseuri.toString()}:`, error);
    }
}
