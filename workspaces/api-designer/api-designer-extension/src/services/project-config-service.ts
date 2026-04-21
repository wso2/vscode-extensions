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
import { 
    ApiPlatformConfig, 
    ApiDefinition, 
    loadYaml, 
    WorkspaceFileNode,
    detectSpecType,
    ApiSpecType,
    SpectralRuleset
} from '@wso2/api-designer-core';
import { convertOpenAPIToWSO2YAML } from '../utils/validation-utils';
import { logError, logInfo } from '../util/logger';
import * as yaml from 'js-yaml';
import * as path from 'path';

/**
 * Service for managing API project configuration
 * Centralizes all config-related operations
 */
export class ProjectConfigService {
    
    /**
     * Save complete project configuration atomically
     */
    static async saveProjectConfig(params: {
        workspaceUri: string;
        apiSpecPath: string;
        docsFolder: string;
        testsFolder: string;
        spectralRulesets?: SpectralRuleset[];
        artifactPath?: string;
        artifact: {
            name: string;
            version: string;
            context: string;
            description: string;
            mainEndpoint: string;
            sandboxEndpoint: string;
        };
    }): Promise<{
        success: boolean;
        updatedConfig: ApiPlatformConfig;
        artifactPath: string;
        message?: string;
    }> {
        try {
            logInfo('Saving project configuration');
            
            const workspaceUri = vscode.Uri.file(params.workspaceUri);
            const openApiUri = vscode.Uri.file(params.apiSpecPath);
            const openApiDir = vscode.Uri.joinPath(openApiUri, '..');
            
            // Normalize folder paths to relative
            const docsFolder = this.toRelativeFolder(params.docsFolder, params.workspaceUri);
            const testsFolder = this.toRelativeFolder(params.testsFolder, params.workspaceUri);
            
            // Get or create config using shared helper
            let config = await this.readConfig(openApiDir);
            if (!config) {
                // Config doesn't exist, create new one
                config = {
                    version: '1.0',
                    spectralRulesets: params.spectralRulesets || []
                };
            } else if (params.spectralRulesets) {
                // Update rulesets if provided
                config.spectralRulesets = params.spectralRulesets;
            }
            
            // Get API spec filename
            const openApiFileName = params.apiSpecPath.split('/').pop() || 'openapi.yaml';
            
            // Generate artifact filename if not provided
            let artifactFileName = params.artifactPath;
            if (!artifactFileName) {
                artifactFileName = openApiFileName.replace(/\.(yaml|yml|json)$/i, '.api-platform.yaml');
            }
            
            // Set API definition (single API, not an array)
            const apiDef: ApiDefinition = {
                openapi: openApiFileName,
                wso2Artifact: artifactFileName,
                docsFolder,
                testsFolder
            };
            
            config.api = apiDef;
            
            // Save config
            await this.saveConfig(openApiDir, config);
            
            // Generate artifact
            const artifactPath = await this.generateArtifact(
                params.apiSpecPath,
                openApiDir,
                artifactFileName,
                params.artifact
            );
            
            logInfo('Project configuration saved successfully');
            
            return {
                success: true,
                updatedConfig: config,
                artifactPath,
                message: 'Configuration saved successfully'
            };
            
        } catch (error: any) {
            logError('Failed to save project configuration:', error);
            throw error;
        }
    }
    
    /**
     * Get complete project details in one call
     */
    static async getProjectDetails(params: {
        apiSpecPath: string;
    }): Promise<{
        success: boolean;
        isInitialized: boolean;
        projectConfig?: ApiPlatformConfig;
        apiDefinition?: {
            apiSpecPath: string;
            docsFolder: string;
            testsFolder: string;
            artifactPath: string;
        };
        artifact?: {
            name: string;
            version: string;
            context: string;
            description: string;
            mainEndpoint: string;
            sandboxEndpoint: string;
            fileExists: boolean;
        };
        specInfo?: {
            title: string;
            version: string;
            description: string;
            mainEndpoint: string;
        };
        message?: string;
    }> {
        try {
            const openApiUri = vscode.Uri.file(params.apiSpecPath);
            const openApiDir = vscode.Uri.joinPath(openApiUri, '..');
            const workspaceUri = openApiDir.fsPath;
            
            // Load config using shared helper
            const config = await this.readConfig(openApiDir);
            const isInitialized = config !== null;
            
            // Parse OpenAPI spec
            const specContent = await vscode.workspace.fs.readFile(openApiUri);
            const specText = Buffer.from(specContent).toString('utf8');
            let spec: any;
            try {
                spec = JSON.parse(specText);
            } catch {
                spec = loadYaml(specText);
            }
            
            const specInfo = {
                title: spec?.info?.title || '',
                version: spec?.info?.version || '1.0.0',
                description: spec?.info?.description || '',
                mainEndpoint: spec?.servers?.[0]?.url || ''
            };
            
            if (!isInitialized) {
                return {
                    success: true,
                    isInitialized: false,
                    specInfo
                };
            }
            
            // Get API definition from config
            const apiDef = config!.api;
            
            if (!apiDef) {
                return {
                    success: true,
                    isInitialized: true,
                    projectConfig: config!,
                    specInfo
                };
            }
            
            // Load artifact if exists
            let artifact: any = undefined;
            
            if (apiDef.wso2Artifact) {
                const artifactPath = vscode.Uri.joinPath(openApiDir, apiDef.wso2Artifact);
                let artifactFileExists = false;
                
                try {
                    const artifactContent = await vscode.workspace.fs.readFile(artifactPath);
                    const artifactYaml = Buffer.from(artifactContent).toString('utf8');
                    const artifactData = loadYaml(artifactYaml) as any;
                    artifactFileExists = true;
                    
                    // Extract upstreams
                    let mainEndpoint = '';
                    let sandboxEndpoint = '';

                    mainEndpoint = artifactData.spec.upstream.main?.url || '';
                    sandboxEndpoint = artifactData.spec.upstream.sandbox?.url || '';
                    
                    artifact = {
                        name: artifactData?.spec?.displayName || artifactData?.spec?.name || '',
                        version: artifactData?.spec?.version || 'v1.0',
                        context: artifactData?.spec?.context || '',
                        description: artifactData?.spec?.description || '',
                        mainEndpoint,
                        sandboxEndpoint,
                        fileExists: true
                    };
                } catch {
                    // File configured but doesn't exist
                    artifact = {
                        name: specInfo.title,
                        version: specInfo.version,
                        context: `/${specInfo.title.toLowerCase().replace(/\s+/g, '-')}`,
                        description: specInfo.description,
                        mainEndpoint: specInfo.mainEndpoint,
                        sandboxEndpoint: '',
                        fileExists: false
                    };
                }
            }
            
            return {
                success: true,
                isInitialized: true,
                projectConfig: config!,
                apiDefinition: {
                    apiSpecPath: apiDef.openapi || apiDef.asyncapi || '',
                    docsFolder: apiDef.docsFolder || apiDef.documentation || 'docs',
                    testsFolder: apiDef.testsFolder || apiDef.tests || 'tests',
                    artifactPath: apiDef.wso2Artifact || ''
                },
                artifact,
                specInfo
            };
            
        } catch (error: any) {
            logError('Failed to get project details:', error);
            return {
                success: false,
                isInitialized: false,
                message: error.message
            };
        }
    }
    
    /**
     * Convert folder path to relative path
     */
    private static toRelativeFolder(folderPath: string, workspaceUri: string): string {
        if (!folderPath) return '';
        
        const normalized = folderPath.replace(/\\/g, '/');
        
        // Already relative
        if (normalized.startsWith('./')) {
            return normalized.substring(2);
        }
        
        // Remove workspace prefix if present
        const workspaceDir = workspaceUri.replace(/\\/g, '/');
        if (normalized.startsWith(workspaceDir)) {
            return normalized.substring(workspaceDir.length + 1);
        }
        
        return normalized;
    }
    
    /**
     * Save config.yaml file
     */
    /**
     * Read API Platform config from a directory
     * Shared utility used by both ProjectManager and ProjectConfigService
     */
    static async readConfig(baseDir: vscode.Uri): Promise<ApiPlatformConfig | null> {
        const configPath = vscode.Uri.joinPath(baseDir, '.api-platform', 'config.yaml');
        
        try {
            const configContent = await vscode.workspace.fs.readFile(configPath);
            const config = loadYaml(Buffer.from(configContent).toString('utf8')) as ApiPlatformConfig;
            return config;
        } catch {
            // Config doesn't exist
            return null;
        }
    }

    /**
     * Get config base directory from workspace URI and optional file path
     * Shared utility for determining where config.yaml should be located
     */
    static getConfigBaseDir(workspaceUri: string, filePath?: string): vscode.Uri {
        if (filePath) {
            // Use the directory where the API spec file is located
            const fileUri = vscode.Uri.file(filePath);
            return vscode.Uri.joinPath(fileUri, '..');
        } else {
            // Fallback to workspace root
            return vscode.Uri.file(workspaceUri);
        }
    }

    /**
     * Save API Platform config to a directory
     * Shared utility used by both ProjectManager and ProjectConfigService
     */
    static async saveConfig(baseDir: vscode.Uri, config: ApiPlatformConfig): Promise<void> {
        const configPath = vscode.Uri.joinPath(baseDir, '.api-platform', 'config.yaml');
        
        // Ensure directory exists
        const configDir = vscode.Uri.joinPath(configPath, '..');
        try {
            await vscode.workspace.fs.createDirectory(configDir);
        } catch {
            // Directory already exists
        }
        
        const configContent = yaml.dump(config, {
            indent: 2,
            lineWidth: -1,
            noRefs: true
        });
        
        await vscode.workspace.fs.writeFile(configPath, Buffer.from(configContent, 'utf8'));
    }
    
    /**
     * Generate deployment artifact
     */
    private static async generateArtifact(
        apiSpecPath: string,
        baseDir: vscode.Uri,
        artifactFileName: string,
        artifact: {
            name: string;
            version: string;
            context: string;
            description: string;
            mainEndpoint: string;
            sandboxEndpoint: string;
        }
    ): Promise<string> {
        // Read OpenAPI spec
        const openApiUri = vscode.Uri.file(apiSpecPath);
        const specContent = await vscode.workspace.fs.readFile(openApiUri);
        const specText = Buffer.from(specContent).toString('utf8');
        
        // Check for existing artifact
        const artifactPath = vscode.Uri.joinPath(baseDir, artifactFileName);
        let existingContent: any = null;
        
        try {
            const existingFile = await vscode.workspace.fs.readFile(artifactPath);
            const existingYaml = Buffer.from(existingFile).toString('utf8');
            existingContent = loadYaml(existingYaml);
        } catch {
            // No existing file
        }
        
        // Generate YAML
        const yamlOutput = convertOpenAPIToWSO2YAML(
            specText,
            existingContent,
            artifact.name,
            artifact.version,
            artifact.context,
            artifact.description,
            artifact.mainEndpoint,
            artifact.sandboxEndpoint
        );
        
        // Ensure directory exists
        const artifactDir = vscode.Uri.joinPath(artifactPath, '..');
        try {
            await vscode.workspace.fs.createDirectory(artifactDir);
        } catch {
            // Directory already exists
        }
        
        // Write file
        await vscode.workspace.fs.writeFile(artifactPath, Buffer.from(yamlOutput, 'utf8'));
        
        return artifactFileName;
    }
    
    /**
     * Get filtered file tree based on type
     */
    static async getFilteredFileTree(params: {
        workspaceUri: string;
        filterType: 'openapi' | 'asyncapi' | 'artifact' | 'documentation' | 'tests' | 'ruleset';
    }): Promise<WorkspaceFileNode[]> {
        try {
            const workspaceUri = vscode.Uri.file(params.workspaceUri);
            
            // Get full file tree
            const files = await vscode.workspace.fs.readDirectory(workspaceUri);
            const tree: WorkspaceFileNode[] = [];
            
            for (const [name, type] of files) {
                // Skip hidden files and node_modules
                if (name.startsWith('.') || name === 'node_modules') {
                    continue;
                }
                
                const filePath = path.join(params.workspaceUri, name);
                
                if (type === vscode.FileType.Directory) {
                    // Recursively get children
                    const children = await this.getFilteredFileTree({
                        workspaceUri: filePath,
                        filterType: params.filterType
                    });
                    
                    // Only include directory if it has matching children
                    if (children.length > 0) {
                        tree.push({
                            name,
                            path: filePath,
                            type: 'directory',
                            children
                        });
                    }
                } else if (type === vscode.FileType.File) {
                    // Check if file matches filter
                    if (await this.matchesFilter(filePath, params.filterType)) {
                        tree.push({
                            name,
                            path: filePath,
                            type: 'file'
                        });
                    }
                }
            }
            
            return tree;
        } catch (error: any) {
            logError('Failed to get filtered file tree:', error);
            return [];
        }
    }
    
    /**
     * Check if file matches the filter type
     */
    private static async matchesFilter(
        filePath: string,
        filterType: 'openapi' | 'asyncapi' | 'artifact' | 'documentation' | 'tests' | 'ruleset'
    ): Promise<boolean> {
        const fileName = path.basename(filePath).toLowerCase();
        
        // Quick extension checks
        const isYaml = fileName.endsWith('.yaml') || fileName.endsWith('.yml');
        const isJson = fileName.endsWith('.json');
        const isMd = fileName.endsWith('.md');
        
        switch (filterType) {
            case 'openapi':
                if (!isYaml && !isJson) return false;
                // Check if it's an API spec file
                return await this.isApiSpecFile(filePath, 'openapi');
                
            case 'asyncapi':
                if (!isYaml && !isJson) return false;
                // Check if it's an AsyncAPI file
                return await this.isApiSpecFile(filePath, 'asyncapi');
                
            case 'artifact':
                if (!isYaml) return false;
                // Check if it's a WSO2 artifact
                return await this.isArtifactFile(filePath);
                
            case 'documentation':
                return isMd || fileName.endsWith('.txt') || fileName.endsWith('.pdf');
                
            case 'tests':
                return (isYaml || isJson) && fileName.includes('test');
                
            case 'ruleset':
                return isYaml && fileName.includes('ruleset');
                
            default:
                return false;
        }
    }
    
    /**
     * Check if file is an API specification of the given type
     */
    private static async isApiSpecFile(filePath: string, specType: 'openapi' | 'asyncapi'): Promise<boolean> {
        try {
            const fileUri = vscode.Uri.file(filePath);
            const content = await vscode.workspace.fs.readFile(fileUri);
            const text = Buffer.from(content).toString('utf8');
            
            const detection = detectSpecType(text);
            
            if (specType === 'openapi') {
                return detection.type === ApiSpecType.OPENAPI;
            } else {
                return detection.type === ApiSpecType.ASYNCAPI;
            }
        } catch {
            return false;
        }
    }
    
    /**
     * Check if file is a WSO2 artifact
     */
    private static async isArtifactFile(filePath: string): Promise<boolean> {
        try {
            const fileUri = vscode.Uri.file(filePath);
            const content = await vscode.workspace.fs.readFile(fileUri);
            const text = Buffer.from(content).toString('utf8');
            const parsed = loadYaml(text) as any;
            
            return parsed?.apiVersion?.includes('api-platform') || 
                   parsed?.version?.includes('api-platform') || 
                   parsed?.kind === 'RestApi' ||
                   parsed?.kind === 'http/rest';
        } catch {
            return false;
        }
    }
}

