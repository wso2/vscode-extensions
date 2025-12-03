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
import * as fs from 'fs';
import * as path from 'path';
import { extension } from "./biExtentionContext";
import { PackageTomlValues, WorkspaceTomlValues } from "@wso2/ballerina-core";
import { parse } from "@iarna/toml";

export interface ProjectInfo {
    isBI: boolean;
    isBallerinaPackage: boolean;
    isBallerinaWorkspace: boolean;
    isEmptyWorkspace?: boolean;
};

export function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
    if (process.env.WEB_VIEW_DEV_MODE === "true") {
        return new URL(pathList[pathList.length - 1], process.env.WEB_VIEW_DEV_HOST as string).href;
    }
    return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

/**
 * Fetches project information for the current workspace.
 * Analyzes the workspace to determine if it's a Ballerina Integrator (BI) project,
 * a Ballerina project, and whether it's a multi-root workspace.
 *
 * @returns A Promise that resolves to ProjectInfo containing:
 *          - isBI: true if the workspace is a Ballerina Integrator project
 *          - isBallerinaPackage: true if the workspace contains a valid Ballerina project/workspace
 *          - isBallerinaWorkspace: true if the workspace is a Ballerina workspace with multiple packages
 *
 * @remarks
 * - Returns all false values if no workspace folders exist or multiple workspace folders are present
 * - For Ballerina workspaces, filters package paths to ensure they exist within the workspace
 */
export async function fetchProjectInfo(): Promise<ProjectInfo> {
    const workspaceFolders = workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length > 1) {
        return { isBI: false, isBallerinaPackage: false, isBallerinaWorkspace: false };
    }

    const workspaceUri = workspaceFolders[0].uri;
    const isBallerinaWorkspace = await checkIsBallerinaWorkspace(workspaceUri);

    if (isBallerinaWorkspace) {
        const isBI = checkIsBI(workspaceUri);
        const workspaceTomlValues = await getWorkspaceTomlValues(workspaceUri.fsPath);
        const isEmptyWorkspace = workspaceTomlValues?.workspace?.packages?.length === 0;

        return {
            isBI: isBI,
            isBallerinaPackage: false,
            isBallerinaWorkspace: extension.isWorkspaceSupported,
            isEmptyWorkspace: isEmptyWorkspace
        };
    }

    return {
        isBI: checkIsBI(workspaceUri),
        isBallerinaPackage: await checkIsBallerinaPackage(workspaceUri),
        isBallerinaWorkspace: false
    };
}

export function checkIsBI(uri: Uri): boolean {
    const config = workspace.getConfiguration('ballerina', uri);
    const inspected = config.inspect<boolean>('isBI');
    const isBISupported = extension.biSupported;

    if (inspected && isBISupported) { // Added a check to see if the current version of ballerina supports bi
        const valuesToCheck = [
            inspected.workspaceFolderValue,
            inspected.workspaceValue,
            inspected.globalValue
        ];
        return valuesToCheck.find(value => value === true) !== undefined; // Return true if isBI is set to true
    }
    return false; // Return false if isBI is not set
}

/**
 * Checks if the given URI represents a Ballerina package directory.
 * A directory is considered a Ballerina package if it contains a Ballerina.toml file
 * with a [package] section.
 *
 * @param uri - The URI of the directory to check
 * @returns true if the directory is a valid Ballerina package, false otherwise
 */
export async function checkIsBallerinaPackage(uri: Uri): Promise<boolean> {
    const ballerinaTomlPath = path.join(uri.fsPath, 'Ballerina.toml');

    // First check if the file exists
    if (!fs.existsSync(ballerinaTomlPath)) {
        return false;
    }

    try {
        const tomlValues = await getProjectTomlValues(uri.fsPath);
        return tomlValues?.package !== undefined;
    } catch (error) {
        // If there's an error reading the file, it's not a valid Ballerina project
        console.error(`Error reading package Ballerina.toml: ${error}`);
        return false;
    }
}

/**
 * Checks if the given URI represents a Ballerina workspace directory.
 * A directory is considered a Ballerina workspace if it contains a Ballerina.toml file
 * with a [workspace] section.
 *
 * @param uri - The URI of the directory to check
 * @returns true if the directory is a valid Ballerina workspace, false otherwise
 */
export async function checkIsBallerinaWorkspace(uri: Uri): Promise<boolean> {
    const ballerinaTomlPath = path.join(uri.fsPath, 'Ballerina.toml');

    // First check if the file exists
    if (!fs.existsSync(ballerinaTomlPath)) {
        return false;
    }

    try {
        const tomlValues = await getWorkspaceTomlValues(uri.fsPath);
        return tomlValues?.workspace !== undefined && tomlValues.workspace?.packages !== undefined;
    } catch (error) {
        // If there's an error reading the file, it's not a valid Ballerina workspace
        console.error(`Error reading workspace Ballerina.toml: ${error}`);
        return false;
    }
}

/**
 * Reads and parses the Ballerina.toml file from the given project path.
 *
 * @param projectPath - The file system path to the project directory
 * @returns A Promise that resolves to the parsed TOML values if successful,
 *          or undefined if the file doesn't exist or parsing fails
 */
async function getProjectTomlValues(projectPath: string): Promise<Partial<PackageTomlValues> | undefined> {
    const ballerinaTomlPath = path.join(projectPath, 'Ballerina.toml');
    if (fs.existsSync(ballerinaTomlPath)) {
        const tomlContent = await fs.promises.readFile(ballerinaTomlPath, 'utf-8');
        try {
            return parse(tomlContent) as Partial<PackageTomlValues>;
        } catch (error) {
            console.error("Failed to load Ballerina.toml content for project at path: ", projectPath, error);
            return;
        }
    }
}

/**
 * Reads and parses the Ballerina.toml file from the given workspace path.
 *
 * @param workspacePath - The file system path to the workspace directory
 * @returns A Promise that resolves to the parsed TOML values if successful,
 *          or undefined if the file doesn't exist or parsing fails
 */
export async function getWorkspaceTomlValues(workspacePath: string): Promise<Partial<WorkspaceTomlValues> | undefined> {
    const ballerinaTomlPath = path.join(workspacePath, 'Ballerina.toml');
    if (fs.existsSync(ballerinaTomlPath)) {
        const tomlContent = await fs.promises.readFile(ballerinaTomlPath, 'utf-8');
        try {
            return parse(tomlContent) as Partial<WorkspaceTomlValues>;
        } catch (error) {
            console.error("Failed to load Ballerina.toml content for workspace at path: ", workspacePath, error);
            return;
        }
    }
}

/**
 * Filters package paths to only include valid Ballerina packages within the workspace.
 *
 * For each path, this function:
 * - Resolves the path (handling relative paths like `.` and `..`)
 * - Verifies the path exists on the filesystem
 * - Ensures the path is within the workspace boundaries (prevents path traversal)
 * - Validates it's a valid Ballerina package
 *
 * @param packagePaths Array of package paths (relative or absolute)
 * @param workspacePath Absolute path to the workspace root
 * @returns Filtered array of valid Ballerina package paths that exist within the workspace
 */
export async function filterPackagePaths(packagePaths: string[], workspacePath: string): Promise<string[]> {
    const results = await Promise.all(
        packagePaths.map(async pkgPath => {
            if (path.isAbsolute(pkgPath)) {
                const resolvedPath = path.resolve(pkgPath);
                const resolvedWorkspacePath = path.resolve(workspacePath);
                if (fs.existsSync(resolvedPath) && isPathInside(resolvedPath, resolvedWorkspacePath)) {
                    return await checkIsBallerinaPackage(Uri.file(resolvedPath));
                }
            }
            const resolvedPath = path.resolve(workspacePath, pkgPath);
            const resolvedWorkspacePath = path.resolve(workspacePath);
            if (fs.existsSync(resolvedPath) && isPathInside(resolvedPath, resolvedWorkspacePath)) {
                return await checkIsBallerinaPackage(Uri.file(resolvedPath));
            }
            return false;
        })
    );
    return packagePaths.filter((_, index) => results[index]);
}

function isPathInside(childPath: string, parentPath: string): boolean {
    const relative = path.relative(parentPath, childPath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
}
