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
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { debug } from '../logger';

/**
 * Simple cache for non-file URI schemes
 * Stores files locally in temp directory without registering a file system provider
 */
export class UriCache {
    private static instance: UriCache;
    private readonly cacheDir: string;
    private readonly uriToLocalPath = new Map<string, string>();

    private constructor() {
        // Create cache directory in OS temp
        this.cacheDir = path.join(os.tmpdir(), 'ballerina-uri-cache');
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
            debug(`[UriCache] Created cache directory: ${this.cacheDir}`);
        }
    }

    public static getInstance(): UriCache {
        if (!UriCache.instance) {
            UriCache.instance = new UriCache();
        }
        return UriCache.instance;
    }

    /**
     * Get or create a local cache path for a non-file URI
     * @param uri The URI with a non-file scheme
     * @returns Local file path where content should be stored
     */
    public getLocalPath(uri: vscode.Uri): string {
        const uriString = uri.toString();
        
        // Return cached path if exists
        if (this.uriToLocalPath.has(uriString)) {
            return this.uriToLocalPath.get(uriString)!;
        }

        // Create new local path
        // Format: <scheme>/<authority>/<path>
        const localPath = path.join(
            this.cacheDir,
            uri.scheme,
            uri.authority || 'default',
            uri.path
        );

        // Ensure directory exists
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.uriToLocalPath.set(uriString, localPath);
        debug(`[UriCache] Mapped ${uriString} -> ${localPath}`);
        
        return localPath;
    }

    /**
     * Store content for a non-file URI
     * @param uri The URI with a non-file scheme
     * @param content The content to store
     */
    public async storeContent(uri: vscode.Uri, content: string | Uint8Array): Promise<string> {
        const localPath = this.getLocalPath(uri);
        
        if (typeof content === 'string') {
            await fs.promises.writeFile(localPath, content, 'utf8');
        } else {
            await fs.promises.writeFile(localPath, content);
        }
        
        debug(`[UriCache] Stored content for ${uri.toString()} at ${localPath}`);
        return localPath;
    }

    /**
     * Get content for a cached URI
     * @param uri The URI with a non-file scheme
     * @returns Content as string or undefined if not cached
     */
    public async getContent(uri: vscode.Uri): Promise<string | undefined> {
        const localPath = this.getLocalPath(uri);
        
        if (!fs.existsSync(localPath)) {
            return undefined;
        }
        
        return await fs.promises.readFile(localPath, 'utf8');
    }

    /**
     * Check if a URI is cached
     * @param uri The URI to check
     * @returns true if cached, false otherwise
     */
    public isCached(uri: vscode.Uri): boolean {
        const uriString = uri.toString();
        if (!this.uriToLocalPath.has(uriString)) {
            return false;
        }
        const localPath = this.uriToLocalPath.get(uriString)!;
        return fs.existsSync(localPath);
    }

    /**
     * Clear the entire cache
     */
    public clearCache(): void {
        if (fs.existsSync(this.cacheDir)) {
            fs.rmSync(this.cacheDir, { recursive: true, force: true });
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
        this.uriToLocalPath.clear();
        debug('[UriCache] Cache cleared');
    }

    /**
     * Get the cache directory path
     */
    public getCacheDir(): string {
        return this.cacheDir;
    }

    /**
     * Recursively fetch and cache a remote directory and all its contents
     * @param uri The remote directory URI
     * @param skipPatterns Optional array of glob patterns to skip
     * @returns The local cache path for the directory
     */
    public async cacheRemoteDirectory(uri: vscode.Uri, skipPatterns?: string[]): Promise<string> {
        const localPath = this.getLocalPath(uri);
        
        try {
            // Check if it's a directory
            const stat = await vscode.workspace.fs.stat(uri);
            
            if (stat.type === vscode.FileType.Directory) {
                // Ensure local directory exists
                if (!fs.existsSync(localPath)) {
                    fs.mkdirSync(localPath, { recursive: true });
                }
                
                // Read directory contents
                const entries = await vscode.workspace.fs.readDirectory(uri);
                
                // Recursively cache all entries with error handling
                const cachePromises = entries.map(async ([name, type]) => {
                    try {
                        const entryUri = vscode.Uri.joinPath(uri, name);
                        
                        // Skip certain directories/files that commonly cause issues
                        if (this.shouldSkip(name, entryUri.path, skipPatterns)) {
                            debug(`[UriCache] Skipping ${entryUri.toString()}`);
                            return;
                        }
                        
                        if (type === vscode.FileType.Directory) {
                            await this.cacheRemoteDirectory(entryUri, skipPatterns);
                        } else if (type === vscode.FileType.File) {
                            await this.cacheRemoteFile(entryUri);
                        }
                    } catch (error) {
                        // Log but don't fail - continue with other files
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        debug(`[UriCache] Skipping inaccessible entry ${name}: ${errorMessage}`);
                    }
                });
                
                // Wait for all caching operations to complete
                await Promise.all(cachePromises);
                
                debug(`[UriCache] Cached directory ${uri.toString()} -> ${localPath}`);
            } else {
                // It's a file, cache it
                await this.cacheRemoteFile(uri);
            }
            
            return localPath;
        } catch (error) {
            console.error(`[UriCache] Error caching remote directory ${uri.toString()}:`, error);
            // Create the local directory even if remote access fails
            if (!fs.existsSync(localPath)) {
                fs.mkdirSync(localPath, { recursive: true });
            }
            return localPath;
        }
    }

    /**
     * Fetch and cache a single remote file
     * @param uri The remote file URI
     * @returns The local cache path for the file
     */
    public async cacheRemoteFile(uri: vscode.Uri): Promise<string> {
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            return await this.storeContent(uri, content);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            debug(`[UriCache] Could not cache remote file ${uri.toString()}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get the remote URI for a cached local path
     * @param localPath The local cached path
     * @returns The remote URI if found, undefined otherwise
     */
    public getRemoteUri(localPath: string): vscode.Uri | undefined {
        // Find the URI that maps to this local path
        for (const [uriString, cachedPath] of this.uriToLocalPath.entries()) {
            if (cachedPath === localPath) {
                return vscode.Uri.parse(uriString);
            }
        }
        return undefined;
    }

    /**
     * Check if two paths refer to the same file (handles cached paths)
     * @param path1 First path (can be local or remote URI string)
     * @param path2 Second path (can be local or remote URI string)
     * @returns true if they refer to the same file
     */
    public isSamePath(path1: string | undefined, path2: string | undefined): boolean {
        if (!path1 || !path2) { return false; }
        if (path1 === path2) { return true; }
        
        // Check if one is a cached local path and the other is a remote URI
        const remoteUri1 = this.getRemoteUri(path1);
        if (remoteUri1 && remoteUri1.toString() === path2) { return true; }
        
        const remoteUri2 = this.getRemoteUri(path2);
        if (remoteUri2 && remoteUri2.toString() === path1) { return true; }
        
        return false;
    }

    /**
     * Check if a path should be skipped during caching
     * @param name File or directory name
     * @param fullPath Full path
     * @param skipPatterns Optional patterns to skip
     */
    private shouldSkip(name: string, fullPath: string, skipPatterns?: string[]): boolean {
        // Default patterns to skip
        const defaultSkip = [
            'target',
            '.git',
            'node_modules',
            '.ballerina',
            'build',
            'out'
        ];
        
        // Check default skip list
        if (defaultSkip.includes(name)) {
            return true;
        }
        
        // Check custom patterns if provided
        if (skipPatterns) {
            // Simple pattern matching - can be enhanced with glob matching
            return skipPatterns.some(pattern => {
                if (pattern.includes('**')) {
                    const simplifiedPattern = pattern.replace(/\*\*/g, '');
                    return fullPath.includes(simplifiedPattern.replace(/\*/g, ''));
                }
                return name === pattern || fullPath.includes(pattern);
            });
        }
        
        return false;
    }
}
