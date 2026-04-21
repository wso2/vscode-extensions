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

import { readFile, writeFile } from 'fs/promises';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import {
    ApiDefinition,
    ApiPlatformConfig,
    GenerateDeploymentArtifactRequest,
    GenerateDeploymentArtifactResponse,
    GetApiDefinitionRequest,
    GetApiDefinitionResponse,
    GetApiPlatformConfigRequest,
    GetApiPlatformConfigResponse,
    GetProjectDetailsRequest,
    GetProjectDetailsResponse,
    InitAPIProjectRequest,
    InitAPIProjectResponse,
    ReadDeploymentArtifactRequest,
    ReadDeploymentArtifactResponse,
    SaveProjectConfigRequest,
    SaveProjectConfigResponse,
    SpecificationFactory,
    UpdateApiPlatformConfigRequest,
    UpdateApiPlatformConfigResponse,
    getDefaultProjectInitYamlFallbackRulesets,
    loadYaml
} from '@wso2/api-designer-core';
import { getEnabledSpectralRulesets } from '../../../spectral/rulesetAutomation';
import { ProjectConfigService } from '../../../services/project-config-service';
import { convertOpenAPIToWSO2YAML } from '../../../utils/validation-utils';
import { BaseRpcManager } from './base-rpc-manager';
import { SpecContentManager } from './spec-content-manager';

/**
 * Helper function to generate Getting Started content
 */
function generateGettingStartedContent(
    apiTitle: string, 
    apiVersion: string, 
    apiDescription?: string, 
    baseUrl?: string, 
    contactEmail?: string
): string {
    const effectiveBaseUrl = baseUrl || 'https://api.example.com';
    const descriptionSection = apiDescription 
        ? `\n${apiDescription}\n` 
        : `\nThe ${apiTitle} API provides a comprehensive set of endpoints for interacting with our services.\n`;
    const supportSection = contactEmail 
        ? `Need help? Contact support at ${contactEmail}` 
        : 'Need help? Contact your API administrator for support.';

    return `# Getting Started with ${apiTitle}

Welcome to the ${apiTitle} API! This guide will help you get up and running quickly.

## Overview

**API Version:** ${apiVersion}  
**Base URL:** \`${effectiveBaseUrl}\`
${descriptionSection}
## Prerequisites

Before you begin, make sure you have:

- An API key or authentication credentials
- Access to the API environment
- Basic understanding of REST APIs

## Authentication

Most API endpoints require authentication. Include your API key in the request header:

\`\`\`bash
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Quick Start

### 1. Get Your API Key

Contact your administrator to obtain your API key.

### 2. Make Your First Request

Here's a simple example to get you started:

\`\`\`bash
curl -X GET \\
     -H "Authorization: Bearer YOUR_API_KEY" \\
     ${effectiveBaseUrl}/health
\`\`\`

### 3. Explore the API

- Check out the API Reference for detailed endpoint documentation
- Review examples for code samples in different languages

## Rate Limits

Please be mindful of rate limits when making requests. Contact support if you need higher limits.

## Support

${supportSection}

## Next Steps

- Read the API Reference
- Try the Examples
- Set up Integration
`;
}

/**
 * Manager for API project operations
 * Handles project initialization, configuration, and deployment artifact operations
 */
export class ProjectManager extends BaseRpcManager {
    private specContentManager: SpecContentManager;

    constructor(specContentManager: SpecContentManager) {
        super('ProjectManager');
        this.specContentManager = specContentManager;
    }

    /**
     * Helper function to check if file/directory exists
     */
    private async fileExists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Helper function to find git root directory (used for resolving local ruleset paths)
     */
    private async findGitRoot(startPath: vscode.Uri): Promise<vscode.Uri | null> {
        let currentPath = startPath;
        let depth = 0;
        const maxDepth = 20; // Prevent infinite loops
        
        while (depth < maxDepth) {
            const gitDir = vscode.Uri.joinPath(currentPath, '.git');
            if (await this.fileExists(gitDir)) {
                return currentPath;
            }
            
            // Move up one directory
            const parentPath = vscode.Uri.joinPath(currentPath, '..');
            const resolvedParentPath = parentPath.fsPath;
            const resolvedCurrentPath = currentPath.fsPath;
            
            // Check if we've reached the root (path doesn't change anymore)
            if (resolvedParentPath === resolvedCurrentPath) {
                break;
            }
            
            currentPath = parentPath;
            depth++;
        }
        
        return null;
    }

    async initApiProject(params: InitAPIProjectRequest): Promise<InitAPIProjectResponse> {
        try {
            const workspaceUri = vscode.Uri.parse(params.workspaceUri);
            const createdFiles: string[] = [];
            const skippedFiles: string[] = [];
            
            // Get the directory of the API spec file (if provided in params)
            let apiPlatformBaseDir: vscode.Uri;
            
            if (params.apiSpecPath) {
                // Use the directory where the API spec file is located
                const fileUri = vscode.Uri.file(params.apiSpecPath);
                apiPlatformBaseDir = vscode.Uri.joinPath(fileUri, '..');
                this.logDebug(`Using API spec file directory for .api-platform: ${apiPlatformBaseDir.fsPath}`);
            } else {
                // Fallback to workspace root if no file path provided
                apiPlatformBaseDir = workspaceUri;
                this.logDebug(`Using workspace root for .api-platform: ${apiPlatformBaseDir.fsPath}`);
            }
            
            this.logDebug(`Initializing API project in: ${apiPlatformBaseDir.fsPath}`);
            
            // Create .api-platform directory in the same folder as the API spec file
            const apiPlatformDir = vscode.Uri.joinPath(apiPlatformBaseDir, '.api-platform');
            if (!(await this.fileExists(apiPlatformDir))) {
                await vscode.workspace.fs.createDirectory(apiPlatformDir);
                createdFiles.push('.api-platform/');
            } else {
                skippedFiles.push('.api-platform/');
            }
            
            // Create config.yaml with default configuration (only if it doesn't exist)
            const configPath = vscode.Uri.joinPath(apiPlatformDir, 'config.yaml');
            if (!(await this.fileExists(configPath))) {
                let enabledRulesets = getEnabledSpectralRulesets()
                    .map(ruleset => {
                        if (!ruleset.sourceFolder || !ruleset.fileName) {
                            return null;
                        }
                        return {
                            name: ruleset.name,
                            sourceFolder: ruleset.sourceFolder,
                            fileName: ruleset.fileName,
                            rulesetContentPath: ruleset.rulesetContentPath || ''
                        };
                    })
                    .filter((r): r is NonNullable<typeof r> => r !== null);

                // Prioritize rulesets from params (user selection in modal), then extension config, then defaults
                const spectralRulesets = params.spectralRulesets ||
                    ((enabledRulesets.length > 0 && enabledRulesets.every(r => r.sourceFolder && r.fileName))
                        ? enabledRulesets
                        : getDefaultProjectInitYamlFallbackRulesets());
                
                // Calculate relative path from .api-platform base dir for the current API spec file
                // Use spec service to get default filename if not provided
                let specRelativePath = '';
                let wso2ArtifactRelativePath = '';
                let detectedSpecType: 'openapi' | 'asyncapi' = 'openapi';
                
                if (params.apiSpecPath) {
                    // Get just the filename for the API spec file
                    const specFileName = params.apiSpecPath.split('/').pop() || '';
                    
                    // Detect spec type to get proper default filename
                    try {
                        const content = await readFile(params.apiSpecPath, 'utf8');
                        const specService = SpecificationFactory.getServiceFromContent(content);
                        
                        if (specService) {
                            // Use actual filename if provided, otherwise use default from spec service
                            specRelativePath = specFileName || specService.getDefaultFileName();
                            // Generate deployment artifact path by replacing extension
                            const extension = specService.getDefaultExtension();
                            wso2ArtifactRelativePath = specFileName.replace(new RegExp(`\\.(${extension.replace('.', '')}|yaml|yml)$`), '.api-platform.$1');
                            detectedSpecType = specService.getSpecType() === 'asyncapi' ? 'asyncapi' : 'openapi';
                        } else {
                            // Fallback to OpenAPI defaults
                            specRelativePath = specFileName || 'openapi.yaml';
                            wso2ArtifactRelativePath = specFileName.replace(/\.(yaml|yml)$/, '.api-platform.$1');
                        }
                    } catch {
                        // If we can't read the file, use the filename as-is
                        specRelativePath = specFileName || 'openapi.yaml';
                        wso2ArtifactRelativePath = specFileName.replace(/\.(yaml|yml)$/, '.api-platform.$1');
                    }
                } else {
                    // No spec file provided - use OpenAPI defaults (most common)
                    specRelativePath = 'openapi.yaml';
                }
                
                const includeApiDefinition = Boolean(params.apiSpecPath);

                // Use spec service to get default docs folder if available
                // Both OpenAPI and AsyncAPI use 'docs' as default, so we can use that directly
                // In the future, this could use specService.getDefaultDocsFolder() when types are updated
                let defaultDocsFolder = params.docsFolder || params.documentation || 'docs';
                const defaultTestsFolder = params.testsFolder || params.tests || 'tests';

                // Create API definition with user-provided paths or leave empty when no API supplied
                // Determine which field to use (openapi or asyncapi) based on spec type
                const api: ApiDefinition | undefined = includeApiDefinition ? {
                    ...(detectedSpecType === 'asyncapi' ? { asyncapi: specRelativePath } : { openapi: specRelativePath }),
                    wso2Artifact: wso2ArtifactRelativePath,
                    docsFolder: defaultDocsFolder,
                    testsFolder: defaultTestsFolder
                } : undefined;
                
                const configYaml: ApiPlatformConfig = {
                    version: '1.0',
                    spectralRulesets
                };
                
                if (api) {
                    configYaml.api = api;
                }
                
                const configContent = yaml.dump(configYaml, {
                    indent: 2,
                    lineWidth: -1,
                    noRefs: true
                });
                await vscode.workspace.fs.writeFile(configPath, Buffer.from(configContent, 'utf8'));
                createdFiles.push('.api-platform/config.yaml');
            } else {
                skippedFiles.push('.api-platform/config.yaml');
            }
            
            // Create docs directory in the same base folder (use configured folder name)
            const docsFolderName = params.docsFolder || 'docs';
            const docsDir = vscode.Uri.joinPath(apiPlatformBaseDir, docsFolderName);
            if (!(await this.fileExists(docsDir))) {
                await vscode.workspace.fs.createDirectory(docsDir);
                createdFiles.push(`${docsFolderName}/`);
            } else {
                skippedFiles.push(`${docsFolderName}/`);
            }

            // Create a Getting Started guide from the API spec
            const gettingStartedPath = vscode.Uri.joinPath(docsDir, 'getting-started.md');
            if (!(await this.fileExists(gettingStartedPath))) {
                // Try to read API info from the API spec
                let apiTitle = 'API';
                let apiVersion = '1.0.0';
                let apiDescription = '';
                let baseUrl = 'https://api.example.com';
                let contactEmail = '';
                
                if (params.apiSpecPath) {
                    try {
                        const specUri = vscode.Uri.file(params.apiSpecPath);
                        const specContent = await vscode.workspace.fs.readFile(specUri);
                        const specText = Buffer.from(specContent).toString('utf8');
                        const spec = loadYaml(specText) as { info?: { title?: string; version?: string; description?: string; contact?: { email?: string } }; servers?: Array<{ url?: string }> };
                        
                        if (spec?.info?.title) apiTitle = spec.info.title;
                        if (spec?.info?.version) apiVersion = spec.info.version;
                        if (spec?.info?.description) apiDescription = spec.info.description;
                        if (spec?.servers?.[0]?.url) baseUrl = spec.servers[0].url;
                        if (spec?.info?.contact?.email) contactEmail = spec.info.contact.email;
                    } catch (e) {
                        this.logWarning('Could not read API spec for documentation generation');
                    }
                }
                
                const gettingStartedContent = generateGettingStartedContent(apiTitle, apiVersion, apiDescription, baseUrl, contactEmail);
                await vscode.workspace.fs.writeFile(gettingStartedPath, Buffer.from(gettingStartedContent, 'utf8'));
                createdFiles.push('docs/getting-started.md');
            } else {
                skippedFiles.push('docs/getting-started.md');
            }
            
            // Create tests directory in the same base folder (use configured folder name)
            const testsFolderName = params.testsFolder || 'tests';
            const testsDir = vscode.Uri.joinPath(apiPlatformBaseDir, testsFolderName);
            if (!(await this.fileExists(testsDir))) {
                await vscode.workspace.fs.createDirectory(testsDir);
                createdFiles.push(`${testsFolderName}/`);
            } else {
                skippedFiles.push(`${testsFolderName}/`);
            }
            
            // Create a README.md in tests directory (only if it doesn't exist)
            const testsReadmePath = vscode.Uri.joinPath(testsDir, 'README.md');
            if (!(await this.fileExists(testsReadmePath))) {
                const testsReadmeContent = `# API Tests

This directory is for your API tests.

You can add:
- Integration tests
- Unit tests
- Contract tests
- Performance tests

Organize your tests as needed for your project.
`;
                await vscode.workspace.fs.writeFile(testsReadmePath, Buffer.from(testsReadmeContent, 'utf8'));
                createdFiles.push(`${testsFolderName}/README.md`);
            } else {
                skippedFiles.push(`${testsFolderName}/README.md`);
            }
            
            // Show success message
            let message = '';
            if (createdFiles.length > 0 && skippedFiles.length === 0) {
                message = `API project initialized successfully! Created ${createdFiles.length} files/directories in the API project directory.`;
            } else if (createdFiles.length > 0 && skippedFiles.length > 0) {
                message = `API project initialized! Created ${createdFiles.length} new files/directories. Skipped ${skippedFiles.length} existing files.`;
            } else {
                message = `All project files already exist in the API project directory. No new files created.`;
            }
            vscode.window.showInformationMessage(message);
            
            return {
                success: true,
                message: message,
                createdFiles
            };
        } catch (error: unknown) {
            this.logError('Error initializing API project:', error);
            const errorMessage = (error as { message?: string }).message || 'Unknown error';
            vscode.window.showErrorMessage(`Failed to initialize API project: ${errorMessage}`);
            return {
                success: false,
                message: `Failed to initialize API project: ${errorMessage}`,
                createdFiles: []
            };
        }
    }

    async getApiPlatformConfig(params: GetApiPlatformConfigRequest): Promise<GetApiPlatformConfigResponse> {
        try {
            // Use shared helper to get config base directory
            const configBaseDir = ProjectConfigService.getConfigBaseDir(params.workspaceUri, params.filePath);
            this.logDebug(`Looking for config in: ${configBaseDir.fsPath}`);
            
            // Use shared helper to read config
            const config = await ProjectConfigService.readConfig(configBaseDir);
            
            if (!config) {
                return {
                    success: false,
                    message: 'No .api-platform/config.yaml found. Please initialize the API project first.'
                };
            }
            
            this.logDebug(`Loaded API Platform config: ${JSON.stringify(config)}`);
            
            return {
                success: true,
                config: config
            };
        } catch (error: unknown) {
            this.logError('Error reading API Platform config:', error);
            return {
                success: false,
                message: `Failed to read API Platform config: ${(error as { message?: string }).message || 'Unknown error'}`
            };
        }
    }

    async getApiDefinition(params: GetApiDefinitionRequest): Promise<GetApiDefinitionResponse> {
        try {
            // Get the workspace URI from the file path
            const fileUri = vscode.Uri.file(params.filePath);
            const workspaceUri = vscode.Uri.joinPath(fileUri, '..');
            
            // Get the API Platform config
            const configResponse = await this.getApiPlatformConfig({ workspaceUri: workspaceUri.fsPath });
            
            if (!configResponse.success || !configResponse.config) {
                return {
                    success: false,
                    message: 'API Platform configuration not found'
                };
            }
            
            const config = configResponse.config;
            
            // Get relative path of the current file
            const relativePath = vscode.workspace.asRelativePath(fileUri, false);
            
            // Get the API definition (single API, not an array)
            const apiDef = config.api;
            
            if (!apiDef) {
                return {
                    success: false,
                    message: 'No API definition found in config.yaml'
                };
            }
            
            return {
                success: true,
                apiDefinition: apiDef
            };
        } catch (error: unknown) {
            this.logError('Error getting API definition:', error);
            return {
                success: false,
                message: `Failed to get API definition: ${(error as { message?: string }).message || 'Unknown error'}`
            };
        }
    }

    async updateApiPlatformConfig(params: UpdateApiPlatformConfigRequest): Promise<UpdateApiPlatformConfigResponse> {
        try {
            // Use shared helper to get config base directory
            const configBaseDir = ProjectConfigService.getConfigBaseDir(params.workspaceUri, params.filePath);
            this.logDebug(`Updating config in: ${configBaseDir.fsPath}`);
            
            // Use shared helper to read config first to check if it exists
            const existingConfig = await ProjectConfigService.readConfig(configBaseDir);
            
            if (!existingConfig) {
                return {
                    success: false,
                    message: 'No .api-platform/config.yaml found. Please initialize the API project first.'
                };
            }
            
            // Clean config to only include essential fields in spectralRulesets
            // Filter out invalid rulesets that don't have required fields
            const cleanRulesets = params.config.spectralRulesets
                .filter((r: unknown) => {
                    const ruleset = r as { name?: string; sourceFolder?: string; fileName?: string };
                    // Must have name, sourceFolder, and fileName
                    const isValid = ruleset.name && ruleset.sourceFolder && ruleset.fileName;
                    if (!isValid) {
                        this.logWarning(`Skipping invalid ruleset "${ruleset.name}": missing required fields (name, sourceFolder, fileName)`);
                    }
                    return isValid;
                })
                .map(r => {
                    const ruleset = r as { name?: string; sourceFolder?: string; fileName?: string; rulesetContentPath?: string };
                    return {
                        name: ruleset.name,
                        sourceFolder: ruleset.sourceFolder,
                        fileName: ruleset.fileName,
                        rulesetContentPath: ruleset.rulesetContentPath || ''
                    };
                });
            
            // Preserve all API definition properties - use docsFolder instead of documents array
            const cleanConfig: ApiPlatformConfig = {
                version: params.config.version,
                spectralRulesets: params.config.spectralRulesets || []
            };
            
            // Preserve API definition if it exists
            if (params.config.api) {
                const cleanedApi: ApiDefinition = {};
                const api = params.config.api;
                
                // Preserve spec path
                // Preserve spec type fields if they exist (for validation purposes)
                // These are read-only fields that identify the spec type
                if (api.openapi) cleanedApi.openapi = api.openapi;
                if (api.asyncapi) cleanedApi.asyncapi = api.asyncapi;
                
                // Preserve optional fields if they exist
                if (api.wso2Artifact) cleanedApi.wso2Artifact = api.wso2Artifact;
                if (api.docsFolder) cleanedApi.docsFolder = api.docsFolder;
                if (api.testsFolder) cleanedApi.testsFolder = api.testsFolder;
                if (api.mockServerPath) cleanedApi.mockServerPath = api.mockServerPath;
                
                // Documents are now discovered from the docsFolder
                cleanConfig.api = cleanedApi;
            }
            
            // Use shared helper to save config
            await ProjectConfigService.saveConfig(configBaseDir, cleanConfig);
            
            vscode.window.showInformationMessage('API Platform configuration updated successfully');
            
            return {
                success: true,
                message: 'Configuration updated successfully'
            };
        } catch (error: unknown) {
            this.logError('Error updating API Platform config:', error);
            const errorMessage = (error as { message?: string }).message || 'Unknown error';
            vscode.window.showErrorMessage(`Failed to update configuration: ${errorMessage}`);
            return {
                success: false,
                message: `Failed to update configuration: ${errorMessage}`
            };
        }
    }

    async generateDeploymentArtifact(params: GenerateDeploymentArtifactRequest): Promise<GenerateDeploymentArtifactResponse> {
        try {
            // Read the API spec file content
            const content = await readFile(params.filePath, 'utf8');
            
            // Create a new file with the generated YAML
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                // Get the directory of the source file
                const sourceFileUri = vscode.Uri.file(params.filePath);
                const sourceDir = vscode.Uri.joinPath(sourceFileUri, '..');
                
                // Determine output path: use existing path if provided, otherwise create default
                let outputPath: vscode.Uri;
                let artifactFileName: string;
                if (params.existingDeploymentArtifactPath) {
                    // The existing path is relative to where the API spec file is
                    // Join it with the directory containing the API spec file
                    outputPath = vscode.Uri.joinPath(sourceDir, params.existingDeploymentArtifactPath);
                    artifactFileName = outputPath.path.split('/').pop() || 'artifact.yaml';
                } else {
                    const sourceFileName = sourceFileUri.path.split('/').pop() || 'api.yaml';
                    const baseName = sourceFileName.replace(/\.(yaml|yml|json)$/i, '') || 'api';
                    artifactFileName = `${baseName}.api-platform.yaml`;
                    outputPath = vscode.Uri.joinPath(sourceDir, artifactFileName);
                }
                
                // Check if the file already exists
                let existingContent: unknown = null;
                try {
                    const existingFile = await vscode.workspace.fs.readFile(outputPath);
                    const existingYaml = Buffer.from(existingFile).toString('utf8');
                    existingContent = loadYaml(existingYaml);
                    this.logDebug('Found existing deployment artifact file, will merge updates');
                } catch {
                    // File doesn't exist, will create new one
                    this.logDebug('No existing deployment artifact file found, will create new one');
                }
                
                // Call the conversion function with existing content for merging and user-provided values
                const yamlOutput = convertOpenAPIToWSO2YAML(
                    content, 
                    existingContent,
                    params.artifactName,
                    params.artifactVersion,
                    params.artifactContext,
                    params.artifactDescription,
                    params.mainEndpoint,
                    params.sandboxEndpoint
                );
                
                // Ensure the directory exists before writing
                const outputDir = vscode.Uri.joinPath(outputPath, '..');
                try {
                    await vscode.workspace.fs.createDirectory(outputDir);
                } catch {
                    // Directory might already exist, ignore
                }
                
                // Write the YAML to the file
                await vscode.workspace.fs.writeFile(outputPath, Buffer.from(yamlOutput, 'utf8'));
                
                // Update config.yaml with the artifact path
                try {
                    const workspaceUriForConfig = sourceDir.fsPath;
                    const configResponse = await this.getApiPlatformConfig({ 
                        workspaceUri: workspaceUriForConfig,
                        filePath: params.filePath 
                    });
                    
                    if (configResponse.success && configResponse.config) {
                        const config = configResponse.config;
                        
                        // Get just the filenames (config is in the same directory)
                        const openapiFileName = params.filePath.split('/').pop() || 'openapi.yaml';
                        const artifactFileNameForConfig = outputPath.path.split('/').pop() || 'artifact.api-platform.yaml';
                        
                        // Set API definition (single API, not an array)
                        if (!config.api) {
                            config.api = {
                                openapi: openapiFileName
                            };
                        }
                        config.api.wso2Artifact = artifactFileNameForConfig;
                        
                        // Update the config file
                        await this.updateApiPlatformConfig({
                            workspaceUri: workspaceUriForConfig,
                            config: config,
                            filePath: params.filePath
                        });
                        
                        this.logDebug('Updated config.yaml with deployment artifact path');
                    }
                } catch (configError: unknown) {
                    this.logWarning(`Failed to update config.yaml with artifact path: ${(configError as { message?: string }).message || 'Unknown error'}`);
                    // Continue anyway - artifact generation succeeded even if config update failed
                }
                
                const action = existingContent ? 'updated' : 'generated';
                const outputFileName = outputPath.path.split('/').pop() || 'artifact.api-platform.yaml';
                vscode.window.showInformationMessage(`Deployment artifact ${action}: ${outputFileName}`);
            
                return {
                    yaml: yamlOutput,
                    success: true
                };
            } else {
                throw new Error('No workspace folder found');
            }
        } catch (error: unknown) {
            this.logError('Error generating deployment artifact:', error);
            const errorMessage = (error as { message?: string }).message || 'Unknown error';
            vscode.window.showErrorMessage(`Failed to generate deployment artifact: ${errorMessage}`);
            throw new Error(`Failed to generate deployment artifact: ${errorMessage}`);
        }
    }

    async readDeploymentArtifact(params: ReadDeploymentArtifactRequest): Promise<ReadDeploymentArtifactResponse> {
        try {
            this.logInfo(`Reading deployment artifact from ${params.filePath}`);

            // Read the artifact file
            const fileUri = vscode.Uri.file(params.filePath);
            const fileContent = await vscode.workspace.fs.readFile(fileUri);
            const yamlContent = Buffer.from(fileContent).toString('utf8');

            // Parse YAML
            const artifact: unknown = loadYaml(yamlContent);
            const artifactObj = artifact as { 
                apiVersion?: string;
                spec?: { 
                    name?: string; 
                    displayName?: string;
                    context?: string; 
                    description?: string; 
                    upstream?: {
                        main?: { url?: string };
                        sandbox?: { url?: string };
                    };
                    upstreams?: Array<{ url?: string }> 
                } 
            };

            if (!artifactObj) {
                return {
                    success: false,
                    message: 'Failed to parse deployment artifact YAML'
                };
            }

            // Extract artifact metadata
            const spec = artifactObj.spec || {};
            
            // Get version from API spec instead of artifact
            let apiVersion = '';
            try {
                const apiSpecResponse = await this.specContentManager.getAPISpecContent({ filePath: params.apiSpecFilePath });
                if (apiSpecResponse.content) {
                    const { loadYaml: coreLoadYaml } = await import('@wso2/api-designer-core');
                    let apiSpec: any;
                    try {
                        apiSpec = JSON.parse(apiSpecResponse.content);
                    } catch {
                        apiSpec = coreLoadYaml(apiSpecResponse.content);
                    }
                    apiVersion = apiSpec.info?.version || '';
                }
            } catch (error) {
                this.logInfo('Failed to parse API spec for version, using empty string');
            }
            
            // Extract endpoints from new upstream object or old upstreams array
            let mainEndpoint = '';
            let sandboxEndpoint = '';

            if (spec.upstream) {
                mainEndpoint = spec.upstream.main?.url || '';
                sandboxEndpoint = spec.upstream.sandbox?.url || '';
            } else if (spec.upstreams && Array.isArray(spec.upstreams)) {
                if (spec.upstreams.length > 0 && spec.upstreams[0].url) {
                    mainEndpoint = spec.upstreams[0].url;
                }
                if (spec.upstreams.length > 1 && spec.upstreams[1].url) {
                    sandboxEndpoint = spec.upstreams[1].url;
                }
            }
            
            return {
                success: true,
                name: spec.displayName || spec.name || '',
                version: apiVersion,
                context: spec.context || '',
                description: spec.description || '',
                mainEndpoint: mainEndpoint,
                sandboxEndpoint: sandboxEndpoint
            };

        } catch (error: unknown) {
            // Don't log as error if file simply doesn't exist
            const errorObj = error as { code?: string; message?: string };
            if (errorObj.code === 'ENOENT' || errorObj.message?.includes('ENOENT')) {
                this.logDebug('Deployment artifact file not found (will be created): ' + params.filePath);
                return {
                    success: false,
                    message: 'Deployment artifact file not found - will be created'
                };
            }
            this.logError('Error reading deployment artifact', error);
            return {
                success: false,
                message: errorObj.message || 'Failed to read deployment artifact'
            };
        }
    }

    async saveProjectConfig(params: SaveProjectConfigRequest): Promise<SaveProjectConfigResponse> {
        try {
            this.logInfo('Saving project configuration');
            
            const result = await ProjectConfigService.saveProjectConfig(params);
            
            if (result.success) {
                vscode.window.showInformationMessage('Project configuration saved successfully');
            }
            
            return result;
        } catch (error: unknown) {
            this.logError('Failed to save project configuration', error);
            const errorMessage = (error as { message?: string }).message || 'Unknown error';
            vscode.window.showErrorMessage(`Failed to save configuration: ${errorMessage}`);
            return {
                success: false,
                updatedConfig: { version: '1.0', spectralRulesets: [] },
                artifactPath: '',
                message: errorMessage
            };
        }
    }

    async getProjectDetails(params: GetProjectDetailsRequest): Promise<GetProjectDetailsResponse> {
        try {
            this.logInfo(`Getting project details for ${params.apiSpecPath}`);
            
            const result = await ProjectConfigService.getProjectDetails(params);
            
            return result;
        } catch (error: unknown) {
            this.logError('Failed to get project details', error);
            return {
                success: false,
                isInitialized: false,
                message: (error as { message?: string }).message || 'Unknown error'
            };
        }
    }
}

