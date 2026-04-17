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

import * as vscode from 'vscode';
import { ProjectInfo } from '@wso2/ballerina-core';
import { UriCache } from './uri-cache';
import { debug } from '../logger';

/**
 * Utility class to translate remote URIs in ProjectInfo to local cached paths
 */
export class ProjectInfoTranslator {
    private static remoteSchemes = ['ballerina-remote', 'oct']; 

    /**
     * Check if a given path uses a remote scheme
     * @param path The path to check
     * @param contextScheme Optional scheme from the context (e.g., 'oct', 'file')
     */
    private static isRemotePath(path: string, contextScheme?: string): boolean {
        if (!path) {
            return false;
        }
        
        // Check if path starts with any remote scheme
        const hasSchemePrefix = this.remoteSchemes.some(scheme => 
            path.startsWith(`${scheme}://`) || path.startsWith(`${scheme}:`)
        );
        
        if (hasSchemePrefix) {
            return true;
        }
        
        // If contextScheme is provided and is remote, and path doesn't start with '/'
        // or starts with '/' but doesn't look like an absolute local path (e.g., starts with /Users, /home, C:\)
        if (contextScheme && this.remoteSchemes.includes(contextScheme)) {
            // Check if path looks like a remote path (starts with / but not a typical local absolute path)
            if (path.startsWith('/') && !path.startsWith('/Users') && !path.startsWith('/home') && !path.startsWith('/var/folders') && !path.match(/^[A-Z]:\\/)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get the URI scheme from a path string
     */
    private static getScheme(path: string): string | undefined {
        const match = path.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
        return match ? match[1] : undefined;
    }

    /**
     * Convert a remote path to its local cached equivalent
     * @param remotePath The remote path to translate
     * @param uriCache The URI cache instance
     * @param contextScheme Optional scheme from the filesystem context
     */
    private static translatePathToLocal(remotePath: string, uriCache: UriCache, contextScheme?: string): string {
        if (!remotePath || !this.isRemotePath(remotePath, contextScheme)) {
            return remotePath;
        }

        try {
            // If path doesn't have a scheme, prepend the context scheme
            let uriString = remotePath;
            if (contextScheme && !remotePath.includes('://') && !remotePath.startsWith(`${contextScheme}:`)) {
                uriString = `${contextScheme}:${remotePath}`;
            }
            
            const remoteUri = vscode.Uri.parse(uriString);
            const localPath = uriCache.getLocalPath(remoteUri);
            
            debug(`[ProjectInfoTranslator] Translated: ${remotePath} => ${localPath}`);
            return localPath;
        } catch (error) {
            console.error(`[ProjectInfoTranslator] Error translating path: ${remotePath}`, error);
            return remotePath;
        }
    }

    /**
     * Recursively translate all remote paths in ProjectInfo to local cached paths
     * @param projectInfo The project info to translate
     * @param uriCache The URI cache instance
     * @param contextScheme Optional scheme from the filesystem context
     */
    public static translateToLocal(projectInfo: ProjectInfo | undefined, uriCache: UriCache, contextScheme?: string): ProjectInfo | undefined {
        if (!projectInfo) {
            return projectInfo;
        }

        // Create a shallow copy to avoid mutating the original
        const translated: ProjectInfo = { ...projectInfo };

        // Translate projectPath if it's a remote path
        if (translated.projectPath && this.isRemotePath(translated.projectPath, contextScheme)) {
            translated.projectPath = this.translatePathToLocal(translated.projectPath, uriCache, contextScheme);
        }

        // Recursively translate children
        if (translated.children && translated.children.length > 0) {
            translated.children = translated.children.map(child => 
                this.translateToLocal(child, uriCache, contextScheme)
            ).filter((child): child is ProjectInfo => child !== undefined);
        }

        return translated;
    }

    /**
     * Check if ProjectInfo contains any remote paths
     * @param projectInfo The project info to check
     * @param contextScheme Optional scheme from the filesystem context
     */
    public static hasRemotePaths(projectInfo: ProjectInfo | undefined, contextScheme?: string): boolean {
        if (!projectInfo) {
            return false;
        }

        // Check if projectPath is remote
        if (projectInfo.projectPath && this.isRemotePath(projectInfo.projectPath, contextScheme)) {
            return true;
        }

        // Check children recursively
        if (projectInfo.children && projectInfo.children.length > 0) {
            return projectInfo.children.some(child => this.hasRemotePaths(child, contextScheme));
        }

        return false;
    }

    /**
     * Add a custom remote scheme to the list of recognized remote schemes
     */
    public static registerRemoteScheme(scheme: string): void {
        if (!this.remoteSchemes.includes(scheme)) {
            this.remoteSchemes.push(scheme);
            debug(`[ProjectInfoTranslator] Registered remote scheme: ${scheme}`);
        }
    }

    /**
     * Get all registered remote schemes
     */
    public static getRemoteSchemes(): string[] {
        return [...this.remoteSchemes];
    }
}
