/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { Uri, workspace } from 'vscode';
import { uriCache } from '../extension';
import { debug } from './logger';

/**
 * Get the local file path from a workspace URI
 * If the URI is remote, returns the cached local path
 * Otherwise returns the fsPath directly
 */
export function getLocalPathFromUri(uri: Uri): string {
    // If it's already a file:// scheme, just return fsPath
    if (uri.scheme === 'file') {
        return uri.fsPath;
    }

    // For remote schemes, get from cache
    if (uriCache) {
        const localPath = uriCache.getLocalPath(uri);
        debug(`[WorkspaceUtils] Translated URI: ${uri.toString()} -> ${localPath}`);
        return localPath;
    }

    // Fallback to fsPath (will be the path portion without scheme)
    return uri.fsPath;
}

/**
 * Get local paths for all workspace folders
 * Handles remote workspace folders by returning their cached local paths
 */
export function getLocalWorkspaceFolders(): string[] {
    const workspaceFolders = workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return [];
    }

    return workspaceFolders.map(folder => getLocalPathFromUri(folder.uri));
}

/**
 * Get the first workspace folder's local path
 */
export function getFirstWorkspaceFolderPath(): string | undefined {
    const folders = getLocalWorkspaceFolders();
    return folders.length > 0 ? folders[0] : undefined;
}

/**
 * Check if a URI is remote (not file:// scheme)
 */
export function isRemoteUri(uri: Uri): boolean {
    return uri.scheme !== 'file';
}
