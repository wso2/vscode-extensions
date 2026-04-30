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

import * as vscode from 'vscode';
import { logDebug, logWarning, logError } from './logger';
import { loadYaml } from '@wso2/api-designer-core';

export interface GitHubFile {
    name: string;
    path: string;
    type: 'file' | 'dir';
    download_url: string | null;
    html_url: string;
}

export interface RulesetMetadata {
    name: string;
    description?: string;
    sourceFolder: string; // The folder this ruleset was fetched from
    fileName: string; // Just the filename
    rulesetContentPath: string;
    enabled: boolean;
    // Additional metadata from YAML
    ruleCategory?: string;
    ruleType?: string;
    artifactType?: string;
    documentationLink?: string;
    provider?: string;
}

export function resolveGitHubRawUrl(inputUrl: string, fileName?: string): string | null {
    const trimmed = String(inputUrl || "").trim();
    if (!trimmed) {
        return null;
    }

    const ensureFileName = (baseUrl: string): string => {
        if (!fileName) return baseUrl;
        const cleanName = fileName.startsWith("/") ? fileName.slice(1) : fileName;
        const separator = baseUrl.endsWith("/") ? "" : "/";
        return `${baseUrl}${separator}${cleanName}`;
    };

    if (trimmed.includes("raw.githubusercontent.com")) {
        return ensureFileName(trimmed);
    }

    const parsed = trimmed.match(/github\.com\/([^\/]+)\/([^\/]+)\/(blob|tree)\/([^\/]+)(?:\/(.+))?/);
    if (parsed) {
        const [, owner, repo, , branch, targetPath] = parsed;
        const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}${targetPath ? `/${targetPath}` : ""}`;
        return ensureFileName(rawBase);
    }

    return null;
}

/**
 * Get GitHub authentication session
 * @param promptIfNeeded - If true, will prompt user to sign in if no session exists. If false, only returns existing session.
 */
export async function getGitHubAuth(promptIfNeeded: boolean = false): Promise<string | undefined> {
    try {
        let session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: false });
        
        if (!session && promptIfNeeded) {
            logDebug('No GitHub session found, prompting user to sign in...');
            try {
                session = await vscode.authentication.getSession('github', ['repo'], { 
                    createIfNone: true,
                    forceNewSession: false
                });
            } catch (userCancelError) {
                logDebug('User cancelled GitHub authentication');
                return undefined;
            }
        }
        
        if (session) {
            return session.accessToken;
        }
    } catch (error) {
        logWarning('Failed to get GitHub authentication:', error);
    }
    return undefined;
}

/**
 * Parse GitHub URL to extract owner, repo, branch, and path
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string; branch: string; path: string } | null {
    // Remove leading @ symbol and trailing slashes
    url = url.trim().replace(/^@+/, '').replace(/\/+$/, '');
    
    // Handle tree URLs with path: https://github.com/owner/repo/tree/branch/path/to/folder
    const treeMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)(?:\/(.+))?/);
    if (treeMatch) {
        return {
            owner: treeMatch[1],
            repo: treeMatch[2],
            branch: treeMatch[3],
            path: treeMatch[4] || '' // Empty path means root directory
        };
    }
    
    // Handle blob URLs (treat as root directory): https://github.com/owner/repo/blob/branch
    const blobMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)(?:\/(.+))?/);
    if (blobMatch) {
        return {
            owner: blobMatch[1],
            repo: blobMatch[2],
            branch: blobMatch[3],
            path: blobMatch[4] || '' // Empty path means root directory
        };
    }
    
    // Handle raw URLs: https://raw.githubusercontent.com/owner/repo/branch/path/to/file
    const rawMatch = url.match(/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)(?:\/(.+))?/);
    if (rawMatch) {
        return {
            owner: rawMatch[1],
            repo: rawMatch[2],
            branch: rawMatch[3],
            path: rawMatch[4] || ''
        };
    }
    
    // Handle simple repo URLs with branch: https://github.com/owner/repo (defaults to main/master)
    const simpleMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)$/);
    if (simpleMatch) {
        return {
            owner: simpleMatch[1],
            repo: simpleMatch[2],
            branch: 'main', // Default to main branch, API will try master if main doesn't exist
            path: ''
        };
    }
    
    return null;
}

/**
 * List files in a GitHub directory
 */
export async function listGitHubDirectory(url: string, authToken?: string): Promise<GitHubFile[]> {
    logDebug('listGitHubDirectory: Parsing URL:', url);
    const parsed = parseGitHubUrl(url);
    
    if (!parsed) {
        logError('listGitHubDirectory: Failed to parse URL');
        throw new Error('Invalid GitHub URL format. Please use a valid GitHub URL (e.g., https://github.com/owner/repo/tree/branch/folder)');
    }
    
    logDebug('listGitHubDirectory: Parsed URL:', parsed);
    
    // Use GitHub API to list directory contents
    // Handle empty path (root directory) - don't add trailing slash
    const pathSegment = parsed.path ? `/${parsed.path}` : '';
    const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents${pathSegment}?ref=${parsed.branch}`;
    logDebug('listGitHubDirectory: API URL:', apiUrl);
    
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'VSCode-API-Designer'
    };
    
    if (authToken) {
        headers['Authorization'] = `token ${authToken}`;
        logDebug('listGitHubDirectory: Using authentication');
    } else {
        logDebug('listGitHubDirectory: No authentication token');
    }
    
    logDebug('listGitHubDirectory: Fetching from GitHub API...');
    const response = await fetch(apiUrl, { headers });
    logDebug('listGitHubDirectory: Response status:', response.status, response.statusText);
    
    if (!response.ok) {
        const errorText = await response.text();
        logError('listGitHubDirectory: Error response:', errorText);
        
        // For 404 errors, it could be:
        // 1. Private repo that needs auth
        // 2. Repo/branch doesn't exist
        // 3. Path doesn't exist
        // We'll let the caller handle retrying with auth if needed
        const error = new Error(`Failed to list directory (${response.status}): ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).responseText = errorText;
        throw error;
    }
    
    const files: GitHubFile[] = await response.json();
    logDebug('listGitHubDirectory: Found', files.length, 'items');
    return files;
}

/**
 * Download and parse a ruleset YAML file
 */
export async function downloadAndParseRuleset(url: string, htmlUrl: string, sourceFolder: string, authToken?: string, promptForAuth: boolean = false): Promise<RulesetMetadata | null> {
    try {
        let headers: Record<string, string> = {
            'User-Agent': 'VSCode-API-Designer'
        };
        
        if (authToken) {
            headers['Authorization'] = `token ${authToken}`;
        }
        
        let response = await fetch(url, { headers });
        
        // If request fails with 401/403 and we can prompt for auth, try with fresh auth
        if (!response.ok && (response.status === 401 || response.status === 403) && promptForAuth && !authToken) {
            logDebug('Download failed with auth error, attempting with authentication...');
            const freshAuthToken = await getGitHubAuth(true);
            if (freshAuthToken) {
                headers['Authorization'] = `token ${freshAuthToken}`;
                response = await fetch(url, { headers });
            }
        }
        
        if (!response.ok) {
            logWarning(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            return null;
        }
        
        const content = await response.text();
        const parsed = loadYaml(content) as any;
        
        // Extract filename from htmlUrl
        const fileName = htmlUrl.split('/').pop() || 'ruleset.yaml';
        
        // Extract metadata
        const name = parsed.name || extractNameFromFilename(fileName);
        const description = parsed.description || '';
        const rulesetContentPath = parsed.rulesetContent ? 'rulesetContent' : '';
        
        return {
            name,
            description,
            sourceFolder,
            fileName,
            rulesetContentPath,
            enabled: true,
            ruleCategory: parsed.ruleCategory,
            ruleType: parsed.ruleType,
            artifactType: parsed.artifactType,
            documentationLink: parsed.documentationLink,
            provider: parsed.provider
        };
    } catch (error) {
        logError(`Error parsing ruleset from ${url}:`, error);
        return null;
    }
}

/**
 * Extract a name from filename
 */
function extractNameFromFilename(url: string): string {
    const filename = url.split('/').pop() || 'Unknown';
    return filename
        .replace(/\.(yaml|yml)$/i, '')
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Fetch all rulesets from configured folders
 */
export async function fetchRulesetsFromFolders(folderUrls: string[], sourceFolder?: string, promptForAuth: boolean = false): Promise<RulesetMetadata[]> {
    const allRulesets: RulesetMetadata[] = [];
    // If promptForAuth is true, try to get existing session first (user might already be signed in)
    let authToken: string | undefined = promptForAuth ? await getGitHubAuth(false) : undefined;
    
    for (const folderUrl of folderUrls) {
        try {
            // Check if it's a GitHub URL
            if (folderUrl.includes('github.com')) {
                // Try with existing auth token if available, otherwise try without auth first
                let files;
                try {
                    files = await listGitHubDirectory(folderUrl, authToken);
                } catch (error: any) {
                    // If it fails with 401/403/404 and promptForAuth is true, try to get/refresh auth
                    // 404 can also mean private repo when accessed without auth
                    const status = error?.status;
                    if (promptForAuth && (status === 401 || status === 403 || status === 404 || error?.message?.includes('rate limit'))) {
                        logDebug(`GitHub request failed with status ${status}, attempting with authentication...`);
                        // If we already tried with auth and it failed, try refreshing the session
                        const newAuthToken = await getGitHubAuth(true);
                        if (newAuthToken && newAuthToken !== authToken) {
                            authToken = newAuthToken;
                            try {
                                files = await listGitHubDirectory(folderUrl, authToken);
                            } catch (retryError: any) {
                                // If retry with fresh auth also fails, it might be a real 404 (repo doesn't exist)
                                logError(`GitHub request failed even with authentication (${retryError?.status}):`, retryError);
                                throw retryError;
                            }
                        } else if (!newAuthToken) {
                            throw error; // Re-throw original error if auth was cancelled
                        } else {
                            // Same token, so the error is likely not auth-related
                            throw error;
                        }
                    } else {
                        throw error; // Re-throw if we shouldn't prompt or it's a different error
                    }
                }
                
                // Filter YAML files
                const yamlFiles = files.filter(f => 
                    f.type === 'file' && 
                    (f.name.endsWith('.yaml') || f.name.endsWith('.yml'))
                );
                
                // Parse each YAML file
                for (const file of yamlFiles) {
                    if (file.download_url) {
                        // Pass download_url, html_url, and sourceFolder
                        // Use the same authToken that was used to list the directory
                        // Also pass promptForAuth in case we need to retry with auth for private files
                        const metadata = await downloadAndParseRuleset(file.download_url, file.html_url, sourceFolder || folderUrl, authToken, promptForAuth);
                        if (metadata) {
                            allRulesets.push(metadata);
                        }
                    }
                }
            } else {
                // Handle local folder
                const localRulesets = await fetchRulesetsFromLocalFolder(folderUrl, sourceFolder || folderUrl);
                allRulesets.push(...localRulesets);
            }
        } catch (error) {
            logError(`Error fetching rulesets from ${folderUrl}:`, error);
            vscode.window.showWarningMessage(`Failed to fetch rulesets from ${folderUrl}`);
        }
    }
    
    return allRulesets;
}

/**
 * Fetch rulesets from a local folder
 */
async function fetchRulesetsFromLocalFolder(folderPath: string, sourceFolder: string): Promise<RulesetMetadata[]> {
    const rulesets: RulesetMetadata[] = [];
    
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        
        // Check if folder exists
        try {
            const stats = await fs.stat(folderPath);
            if (!stats.isDirectory()) {
                throw new Error('Path is not a directory');
            }
        } catch (error) {
            throw new Error(`Folder not found: ${folderPath}`);
        }
        
        // Read directory contents
        const files = await fs.readdir(folderPath);
        
        // Filter YAML files
        const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
        
        // Parse each YAML file
        for (const file of yamlFiles) {
            try {
                const filePath = path.join(folderPath, file);
                
                const content = await fs.readFile(filePath, 'utf8');
                const parsed = loadYaml(content) as any;
                
                const name = parsed.name || extractNameFromFilename(file);
                const description = parsed.description || '';
                const rulesetContentPath = parsed.rulesetContent ? 'rulesetContent' : '';
                
                rulesets.push({
                    name,
                    description,
                    sourceFolder,
                    fileName: file,
                    rulesetContentPath,
                    enabled: true,
                    ruleCategory: parsed.ruleCategory,
                    ruleType: parsed.ruleType,
                    artifactType: parsed.artifactType,
                    documentationLink: parsed.documentationLink,
                    provider: parsed.provider
                });
                
            } catch (error) {
                logError(`Error parsing ${file}:`, error);
            }
        }
    } catch (error) {
        logError('Error reading local folder:', error);
        throw error;
    }
    
    return rulesets;
}

