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
        const workspaceTomlValues = await getWorkspaceTomlValues(workspaceUri);
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
    try {
        const tomlValues = await getProjectTomlValues(uri);
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
    try {
        const tomlValues = await getWorkspaceTomlValues(uri);
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
async function getProjectTomlValues(projectPath: string | Uri): Promise<Partial<PackageTomlValues> | undefined> {
    const projectUri = toUri(projectPath);
    const ballerinaTomlUri = Uri.joinPath(projectUri, 'Ballerina.toml');

    return readAndParseToml<PackageTomlValues>(
        ballerinaTomlUri,
        `project at URI: ${projectUri.toString()}`
    );
}

/**
 * Reads and parses the Ballerina.toml file from the given workspace path.
 *
 * @param workspacePath - The file system path to the workspace directory
 * @returns A Promise that resolves to the parsed TOML values if successful,
 *          or undefined if the file doesn't exist or parsing fails
 */
export async function getWorkspaceTomlValues(workspacePath: string | Uri): Promise<Partial<WorkspaceTomlValues> | undefined> {
    const workspaceUri = toUri(workspacePath);
    const ballerinaTomlUri = Uri.joinPath(workspaceUri, 'Ballerina.toml');

    return readAndParseToml<WorkspaceTomlValues>(
        ballerinaTomlUri,
        `workspace at URI: ${workspaceUri.toString()}`
    );
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
export async function filterPackagePaths(packagePaths: string[], workspacePath: string | Uri): Promise<string[]> {
    const workspaceUri = toUri(workspacePath);
    const resolvedWorkspacePath = workspaceUri.scheme === 'file' ? path.resolve(workspaceUri.fsPath) : undefined;

    const results = await Promise.all(
        packagePaths.map(async pkgPath => {
            const resolvedUri = resolvePackageUri(pkgPath, workspaceUri);
            if (!resolvedUri) {
                return false;
            }

            if (workspaceUri.scheme === 'file') {
                if (!resolvedWorkspacePath) {
                    return false;
                }

                const resolvedPath = path.resolve(resolvedUri.fsPath);
                if (!isPathInside(resolvedPath, resolvedWorkspacePath)) {
                    return false;
                }
            } else if (!isUriPathInside(resolvedUri, workspaceUri)) {
                return false;
            }

            if (await uriExists(resolvedUri)) {
                return await checkIsBallerinaPackage(resolvedUri);
            }

            return false;
        })
    );
    return packagePaths.filter((_, index) => results[index]);
}

function toUri(uriOrPath: string | Uri): Uri {
    return typeof uriOrPath === 'string' ? Uri.file(uriOrPath) : uriOrPath;
}

async function uriExists(uri: Uri): Promise<boolean> {
    try {
        await workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}

async function readAndParseToml<T>(tomlUri: Uri, contextLabel: string): Promise<Partial<T> | undefined> {
    if (!(await uriExists(tomlUri))) {
        return;
    }

    try {
        const tomlContent = Buffer.from(await workspace.fs.readFile(tomlUri)).toString('utf-8');
        return parse(tomlContent) as Partial<T>;
    } catch (error) {
        console.error(`Failed to load Ballerina.toml content for ${contextLabel}`, error);
        return;
    }
}

function resolvePackageUri(pkgPath: string, workspaceUri: Uri): Uri | undefined {
    if (workspaceUri.scheme === 'file') {
        const resolvedPath = path.isAbsolute(pkgPath)
            ? path.resolve(pkgPath)
            : path.resolve(workspaceUri.fsPath, pkgPath);
        return Uri.file(resolvedPath);
    }

    if (pkgPath.includes('://')) {
        try {
            return Uri.parse(pkgPath);
        } catch {
            return undefined;
        }
    }

    const normalizedPath = pkgPath.replace(/\\/g, '/');
    if (normalizedPath.startsWith('/')) {
        return workspaceUri.with({ path: path.posix.normalize(normalizedPath) });
    }

    return Uri.joinPath(workspaceUri, normalizedPath);
}

function isUriPathInside(childUri: Uri, parentUri: Uri): boolean {
    if (childUri.scheme !== parentUri.scheme || childUri.authority !== parentUri.authority) {
        return false;
    }

    const parentPath = path.posix.normalize(parentUri.path);
    const childPath = path.posix.normalize(childUri.path);
    const prefix = parentPath.endsWith('/') ? parentPath : `${parentPath}/`;

    return childPath === parentPath || childPath.startsWith(prefix);
}

function isPathInside(childPath: string, parentPath: string): boolean {
    const relative = path.relative(parentPath, childPath);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
}
