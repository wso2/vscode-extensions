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

import { readFile } from 'fs/promises';
import * as vscode from 'vscode';
import {
    FetchRulesetsFromFolderRequest,
    FetchRulesetsFromFolderResponse,
    GetAllSpectralRulesetsRequest,
    GetAllSpectralRulesetsResponse,
    GetApplicableRulesetsRequest,
    GetApplicableRulesetsResponse,
    GetGovernanceRequest,
    GetGovernanceResponse,
    SpectralRuleset,
    ValidateAPISpecRequest,
    ValidateAPISpecResponse,
    getDefaultAiReadinessSpectralRuleset,
    getDefaultGovernanceSpectralRulesets,
    loadYaml
} from '@wso2/api-designer-core';
import { 
    validateAPISpec,
    validateWithSpectralRuleset
} from '../../../utils/validation-utils';
import { getAllSpectralRulesets as getAllSpectralRulesetsFromConfig } from '../../../spectral/rulesetAutomation';
import { BaseRpcManager } from './base-rpc-manager';

type ApiPlatformConfigLike = {
    spectralRulesets?: unknown[];
    api?: { wso2Artifact?: string };
};

/**
 * Manager for governance and validation operations
 * Handles API spec validation, governance checks, and Spectral ruleset management
 */
export class GovernanceManager extends BaseRpcManager {
    constructor() {
        super('GovernanceManager');
    }

    /**
     * Helper function to construct full ruleset path from sourceFolder and fileName
     */
    private constructRulesetPath(sourceFolder: string, fileName: string): string {
        if (!sourceFolder || !fileName) {
            throw new Error(`Invalid ruleset configuration: sourceFolder="${sourceFolder}", fileName="${fileName}"`);
        }
        
        // If it's a GitHub folder URL, convert to raw URL
        if (sourceFolder.includes('github.com')) {
            // Convert blob/tree URL to raw URL format
            let rawFolder = sourceFolder;
            
            if (rawFolder.includes('/blob/') || rawFolder.includes('/tree/')) {
                // Extract parts: https://github.com/owner/repo/blob/branch/path/to/folder
                const parsed = sourceFolder.match(/github\.com\/([^\/]+)\/([^\/]+)\/(blob|tree)\/([^\/]+)(?:\/(.+))?/);
                if (parsed) {
                    const [, owner, repo, , branch, path] = parsed;
                    const folderPath = path || '';
                    // Ensure we have proper URL structure
                    rawFolder = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}${folderPath ? '/' + folderPath : ''}`;
                } else {
                    // If parsing failed, check if it's already a raw URL
                    if (!rawFolder.includes('raw.githubusercontent.com')) {
                        this.logWarning(`Could not parse GitHub URL: ${sourceFolder}, using as-is`);
                    }
                }
            } else if (rawFolder.includes('raw.githubusercontent.com')) {
                // Already a raw URL, use as-is
                rawFolder = sourceFolder;
            }
            
            // Ensure we don't have double slashes (except after https://)
            const cleanFileName = fileName.startsWith('/') ? fileName.substring(1) : fileName;
            const separator = rawFolder.endsWith('/') ? '' : '/';
            const fullUrl = `${rawFolder}${separator}${cleanFileName}`;
            
            return fullUrl;
        }
        
        // For local paths, use path.join
        const path = require('path');
        return path.join(sourceFolder, fileName);
    }

    /**
     * Helper to find git root (used for resolving local ruleset paths)
     */
    private async findGitRoot(startPath: vscode.Uri): Promise<vscode.Uri | null> {
        const fileExists = async (uri: vscode.Uri): Promise<boolean> => {
            try {
                await vscode.workspace.fs.stat(uri);
                return true;
            } catch {
                return false;
            }
        };
        
        let currentPath = startPath;
        let depth = 0;
        const maxDepth = 20;
        
        while (depth < maxDepth) {
            const gitDir = vscode.Uri.joinPath(currentPath, '.git');
            if (await fileExists(gitDir)) {
                return currentPath;
            }
            
            const parentPath = vscode.Uri.joinPath(currentPath, '..');
            const resolvedParentPath = parentPath.fsPath;
            const resolvedCurrentPath = currentPath.fsPath;
            
            if (resolvedParentPath === resolvedCurrentPath) {
                break;
            }
            
            currentPath = parentPath;
            depth++;
        }
        
        return null;
    }

    async getGovernance(params: GetGovernanceRequest): Promise<GetGovernanceResponse> {
        try {
            const content = await readFile(params.filePath, 'utf8');
            
            // Require ruleset parameter
            if (!params.ruleset || !params.ruleset.sourceFolder || !params.ruleset.fileName) {
                throw new Error(`Ruleset parameter is required with sourceFolder and fileName`);
            }
            
            // Use the provided ruleset
            const resolvedPath = this.constructRulesetPath(params.ruleset.sourceFolder, params.ruleset.fileName);
            const rulesetConfig = {
                filePath: resolvedPath,
                rulesetContentPath: params.ruleset.rulesetContentPath || ''
            };
            
            // Get git root for resolving local ruleset file paths (if ruleset source is local)
            const fileUri = vscode.Uri.file(params.filePath);
            const gitRoot = await this.findGitRoot(fileUri);
            const gitRootPath = gitRoot?.fsPath;
            
            // GitHub authentication will be handled by fetchRulesetsFromFolders if needed
            // Try without auth first (works for public repos), only prompt if 401/403 error occurs
            let authToken: string | undefined = undefined;
            
            const result = await validateWithSpectralRuleset(
                content,
                params.name,
                rulesetConfig.filePath,
                rulesetConfig.rulesetContentPath,
                gitRootPath,
                authToken
            );
            return result as GetGovernanceResponse;
        } catch (error: unknown) {
            this.logError(`Error checking ${params.name}:`, error);
            throw new Error(`Failed to check ${params.name}: ${(error as { message?: string }).message || 'Unknown error'}`);
        }
    }

    async validateAPISpec(params: ValidateAPISpecRequest): Promise<ValidateAPISpecResponse> {
        try {
            // Read the API spec file content
            const content = await readFile(params.filePath, 'utf8');
            
            // Validate the spec
            const result = await validateAPISpec(content);
            return result;
        } catch (error: unknown) {
            this.logError('Error validating API spec:', error);
            throw new Error(`Failed to validate API spec: ${(error as { message?: string }).message || 'Unknown error'}`);
        }
    }

    /**
     * Normalize rulesets array, filtering out invalid entries
     */
    normalizeSpectralRulesets(rulesets: unknown[] | undefined, context: string): SpectralRuleset[] {
        if (!Array.isArray(rulesets) || rulesets.length === 0) {
            return [];
        }

        const normalizedRulesets: SpectralRuleset[] = [];

        for (const ruleset of rulesets) {
            if (!ruleset) {
                this.logWarning(`${context}: Encountered undefined ruleset entry`);
                continue;
            }

            const rulesetObj = ruleset as { name?: string; sourceFolder?: string; fileName?: string; rulesetContentPath?: string };
            if (!rulesetObj.sourceFolder || !rulesetObj.fileName) {
                this.logWarning(`${context}: Ruleset "${rulesetObj.name ?? '<unnamed>'}" is missing required fields (sourceFolder and fileName)`);
                continue;
            }

            normalizedRulesets.push({
                name: rulesetObj.name || '<unnamed>',
                sourceFolder: rulesetObj.sourceFolder,
                fileName: rulesetObj.fileName,
                rulesetContentPath: rulesetObj.rulesetContentPath || ''
            });
        }

        return normalizedRulesets;
    }

    async fetchRulesetsFromFolder(params: FetchRulesetsFromFolderRequest): Promise<FetchRulesetsFromFolderResponse> {
        try {
            const { fetchRulesetsFromFolders } = await import('../../../util/github-utils.js');
            const pathModule = await import('path');
            
            const trimmedFolderUrl = params.folderUrl.trim();
            let fetchFolderUrl = trimmedFolderUrl;
            const displayFolder = trimmedFolderUrl;
            
            if (!trimmedFolderUrl) {
                return {
                    success: false,
                    rulesets: [],
                    message: 'Folder path is required'
                };
            }
            
            if (
                !trimmedFolderUrl.includes('github.com') && 
                !trimmedFolderUrl.includes('raw.githubusercontent.com')
            ) {
                const isAbsolute = pathModule.isAbsolute(trimmedFolderUrl);
                if (!isAbsolute) {
                    let basePath: string | undefined;
                    
                    if (params.workspaceUri) {
                        try {
                            const workspaceUri = vscode.Uri.file(params.workspaceUri);
                            const gitRoot = await this.findGitRoot(workspaceUri);
                            basePath = gitRoot?.fsPath ?? workspaceUri.fsPath;
                        } catch (resolveError) {
                            this.logWarning('Failed to resolve workspace path for ruleset folder', resolveError);
                        }
                    }
                    
                    if (!basePath) {
                        basePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    }
                    
                    fetchFolderUrl = basePath 
                        ? pathModule.resolve(basePath, trimmedFolderUrl) 
                        : pathModule.resolve(trimmedFolderUrl);
                    
                    this.logDebug(`Resolved relative folder path "${trimmedFolderUrl}" to "${fetchFolderUrl}" using base "${basePath || '<process cwd>'}"`);
                }
            }
            
            // Fetch rulesets from the folder - will use existing auth session if available
            // Will prompt for auth if request fails with 401/403
            let rulesets: unknown[] = [];
            let authError = false;
            
            try {
                rulesets = await fetchRulesetsFromFolders([fetchFolderUrl], displayFolder, true);
            } catch (error: unknown) {
                // Check if it's an auth-related error
                const errorObj = error as { status?: number; message?: string };
                if (errorObj?.status === 401 || errorObj?.status === 403 || errorObj?.message?.includes('401') || errorObj?.message?.includes('403')) {
                    authError = true;
                    this.logError('Authentication error when fetching rulesets:', error);
                } else {
                    // Re-throw non-auth errors
                    throw error;
                }
            }
            
            if (rulesets.length === 0) {
                // Check if it might be a private repo that needs auth
                if (params.folderUrl.includes('github.com')) {
                    // Check if user has GitHub session
                    const { getGitHubAuth } = await import('../../../util/github-utils.js');
                    const hasAuth = await getGitHubAuth(false);
                    
                    if (authError || !hasAuth) {
                        return {
                            success: false,
                            rulesets: [],
                            message: 'No rulesets found. If this is a private repository, please ensure you are signed in to GitHub in VS Code and try again.',
                            requiresAuth: true
                        };
                    } else {
                        // User is signed in but still no rulesets - might be empty folder or wrong path
                        return {
                            success: false,
                            rulesets: [],
                            message: 'No ruleset YAML files found in this folder. Please check that the folder contains .yaml or .yml files.',
                            requiresAuth: false
                        };
                    }
                }
                
                // Return empty success if no rulesets found (local folder)
                return {
                    success: true,
                    rulesets: [],
                    message: 'No ruleset YAML files found in this folder.',
                    requiresAuth: false
                };
            }
            
            return {
                success: true,
                rulesets: rulesets
                    .map((r: unknown) => {
                        const ruleset = r as {
                            name?: string;
                            sourceFolder?: string;
                            fileName?: string;
                            rulesetContentPath?: string;
                            description?: string;
                            ruleCategory?: string;
                            ruleType?: string;
                            artifactType?: string;
                            documentationLink?: string;
                            provider?: string;
                        };
                        // Filter out rulesets without required fields
                        if (!ruleset.name || !ruleset.sourceFolder || !ruleset.fileName) {
                            return null;
                        }
                        return {
                            name: ruleset.name,
                            sourceFolder: ruleset.sourceFolder,
                            fileName: ruleset.fileName,
                            rulesetContentPath: ruleset.rulesetContentPath || '',
                            // Include additional metadata for display purposes only (not saved to config.yaml)
                            description: ruleset.description,
                            enabled: true,
                            ruleCategory: ruleset.ruleCategory,
                            ruleType: ruleset.ruleType,
                            artifactType: ruleset.artifactType,
                            documentationLink: ruleset.documentationLink,
                            provider: ruleset.provider
                        };
                    })
                    .filter((r): r is NonNullable<typeof r> => r !== null),
                requiresAuth: false
            };
        } catch (error: unknown) {
            this.logError('Error fetching rulesets from folder:', error);
            
            // Check if error is related to authentication
            const errorMessage = (error as { message?: string }).message || '';
            if (errorMessage.includes('403') || errorMessage.includes('401') || errorMessage.includes('authentication')) {
                return {
                    success: false,
                    rulesets: [],
                    message: 'Authentication required. Unable to access this repository.',
                    requiresAuth: true
                };
            }
            
            return {
                success: false,
                rulesets: [],
                message: `Failed to fetch rulesets: ${errorMessage}`
            };
        }
    }

    async getApplicableRulesets(params: GetApplicableRulesetsRequest): Promise<GetApplicableRulesetsResponse> {
        const DEFAULT_GOVERNANCE_RULESETS = getDefaultGovernanceSpectralRulesets();
        const DEFAULT_AI_READINESS_RULESET = getDefaultAiReadinessSpectralRuleset();

        const buildResponse = (governanceRulesets: SpectralRuleset[]): GetApplicableRulesetsResponse => ({
            governanceRulesets: governanceRulesets.map(ruleset => ({ ...ruleset })),
            aiReadinessRuleset: { ...DEFAULT_AI_READINESS_RULESET }
        });

        try {
            const fileUri = vscode.Uri.file(params.filePath);
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);

            if (!workspaceFolder) {
                this.logInfo('No workspace folder detected. Returning default governance rulesets');
                return buildResponse(DEFAULT_GOVERNANCE_RULESETS);
            }

            // Look for config.yaml in the same directory as the API file (not workspace root)
            const apiFileDir = vscode.Uri.joinPath(fileUri, '..');
            const configPath = vscode.Uri.joinPath(apiFileDir, '.api-platform', 'config.yaml');
            let config: ApiPlatformConfigLike | null = null;

            try {
                const configContent = await readFile(configPath.fsPath, 'utf-8');
                config = loadYaml(configContent) as ApiPlatformConfigLike;
                this.logInfo(`Loaded API Platform config from ${configPath.fsPath}`);
            } catch (error) {
                this.logInfo(`No API Platform config found at ${configPath.fsPath}. Using default governance rulesets`);
                return buildResponse(DEFAULT_GOVERNANCE_RULESETS);
            }

            if (!config) {
                this.logWarning('Config could not be parsed. Using default governance rulesets');
                return buildResponse(DEFAULT_GOVERNANCE_RULESETS);
            }

            const governanceRulesets = this.normalizeSpectralRulesets(config.spectralRulesets, 'getApplicableRulesets');

            const currentApi = config.api;
            const hasDeploymentArtifact = Boolean(currentApi?.wso2Artifact);

            if (governanceRulesets.length === 0) {
                this.logInfo('Config contains no governance rulesets. Falling back to defaults');
                return buildResponse(DEFAULT_GOVERNANCE_RULESETS);
            }

            const filteredGovernanceRulesets = governanceRulesets.filter(ruleset => {
                if (!ruleset?.name) {
                    return true;
                }

                const nameLower = ruleset.name.toLowerCase();
                if (nameLower.includes('api management') && !hasDeploymentArtifact) {
                    this.logInfo(`Skipping "${ruleset.name}" ruleset because current API has no deployment artifact`);
                    return false;
                }

                return true;
            });

            this.logInfo(`Using ${filteredGovernanceRulesets.length} governance rulesets from config`);
            return buildResponse(filteredGovernanceRulesets);

        } catch (error: unknown) {
            this.logError('Error getting applicable rulesets', error);
            return buildResponse(DEFAULT_GOVERNANCE_RULESETS);
        }
    }

    async getAllSpectralRulesets(params: GetAllSpectralRulesetsRequest): Promise<GetAllSpectralRulesetsResponse> {
        try {
            const allRulesets = getAllSpectralRulesetsFromConfig();
            
            // Convert StoredRuleset[] to SpectralRuleset[]
            const spectralRulesets: SpectralRuleset[] = allRulesets.map(ruleset => ({
                name: ruleset.name,
                sourceFolder: ruleset.sourceFolder,
                fileName: ruleset.fileName,
                rulesetContentPath: ruleset.rulesetContentPath || ''
            }));

            this.logDebug(`Returning ${spectralRulesets.length} rulesets from configuration`);
            return { rulesets: spectralRulesets };
        } catch (error: unknown) {
            this.logError('Error getting all Spectral rulesets', error);
            return { rulesets: [] };
        }
    }

    async calculateAIReadinessScore(filePath: string): Promise<number | null> {
        try {
            const rulesetResponse = await this.getApplicableRulesets({ filePath });
            const aiReadinessRuleset = rulesetResponse.aiReadinessRuleset;

            if (!aiReadinessRuleset) {
                this.logInfo('AI readiness ruleset not available');
                return null;
            }

            const governanceResult = await this.getGovernance({
                filePath,
                name: aiReadinessRuleset.name,
                ruleset: aiReadinessRuleset
            });

            const summaryScore = governanceResult.aiReadinessSummary?.score ?? null;
            const fallbackScore = typeof governanceResult?.score === 'number' ? governanceResult.score : null;
            const finalScore = summaryScore ?? fallbackScore;

            return finalScore;
        } catch (error: unknown) {
            this.logError('Failed to calculate AI readiness score', error);
            return null;
        }
    }
}

