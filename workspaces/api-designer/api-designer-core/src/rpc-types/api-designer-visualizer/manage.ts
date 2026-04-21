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

import { SpectralRuleset } from "./analyze";

/**
 * Document structure for API documentation
 */
export interface ApiDocument {
    id: string; // Unique identifier for the document
    name: string; // Display name
    path: string; // File path relative to workspace or absolute
    format: 'markdown' | 'text'; // Document format
    description?: string; // Optional description
    createdAt?: string; // ISO timestamp
    updatedAt?: string; // ISO timestamp
}

/**
 * API Platform configuration structure
 */
export interface ApiDefinition {
    // Spec file paths (one of these is required)
    openapi?: string; // Path to OpenAPI specification
    asyncapi?: string; // Path to AsyncAPI specification
    
    // Deployment artifact
    wso2Artifact?: string;
    
    // Documentation
    documentation?: string; // Deprecated: kept for backward compatibility (single doc file)
    documents?: ApiDocument[]; // Deprecated: kept for backward compatibility (document entries)
    docsFolder?: string; // Folder path where documentation files are stored
    
    // Testing
    tests?: string; // Deprecated: kept for backward compatibility (single tests file)
    testsFolder?: string; // Folder path where tests are stored
    
    // Mock Server
    mockServerPath?: string; // Path to AI-generated mock server file (for AI_GENERATED_JS tool)
}

export interface ApiPlatformConfig {
    version: string;
    api?: ApiDefinition; // Single API definition (not an array)
    spectralRulesets: SpectralRuleset[];
}

export interface GenerateDeploymentArtifactRequest {
    filePath: string;
    existingDeploymentArtifactPath?: string; // Optional path to existing deployment artifact
    artifactName?: string; // User-provided name
    artifactVersion?: string; // User-provided version
    artifactContext?: string; // User-provided context path
    artifactDescription?: string; // User-provided description
    mainEndpoint?: string; // Main/production endpoint URL
    sandboxEndpoint?: string; // Sandbox/testing endpoint URL
}

export interface GenerateDeploymentArtifactResponse {
    yaml: string;
    success: boolean;
}

export interface ReadDeploymentArtifactRequest {
    filePath: string; // Path to the deployment artifact YAML file
    apiSpecFilePath: string; // Path to the API spec file
}

export interface ReadDeploymentArtifactResponse {
    success: boolean;
    name?: string;
    version?: string;
    context?: string;
    description?: string;
    mainEndpoint?: string;
    sandboxEndpoint?: string;
    message?: string;
}

/**
 * Request to save complete project configuration
 */
export interface SaveProjectConfigRequest {
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
}

/**
 * Response from saving project configuration
 */
export interface SaveProjectConfigResponse {
    success: boolean;
    updatedConfig: ApiPlatformConfig;
    artifactPath: string;
    message?: string;
}

/**
 * Request to get complete project details
 */
export interface GetProjectDetailsRequest {
    apiSpecPath: string;
}

/**
 * Response with complete project details
 */
export interface GetProjectDetailsResponse {
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
}

/**
 * Request to initialize API project structure
 */
export interface InitAPIProjectRequest {
    workspaceUri: string;
    apiSpecPath?: string; // Path to API spec (OpenAPI or AsyncAPI)
    specType?: 'openapi' | 'asyncapi'; // Type of specification
    wso2ArtifactPath?: string;
    documentation?: string; // Deprecated: use docsFolder instead
    tests?: string; // Deprecated: use testsFolder instead
    docsFolder?: string;
    testsFolder?: string;
    spectralRulesets?: SpectralRuleset[];
}

/**
 * Response from API project initialization
 */
export interface InitAPIProjectResponse {
    success: boolean;
    message: string;
    createdFiles: string[];
}

/**
 * Request to get API Platform configuration
 */
export interface GetApiPlatformConfigRequest {
    workspaceUri: string;
    filePath?: string; // Optional path to the OpenAPI file
}

/**
 * Response with API Platform configuration
 */
export interface GetApiPlatformConfigResponse {
    success: boolean;
    config?: ApiPlatformConfig;
    message?: string;
}

/**
 * Request to get API definition for a specific file
 */
export interface GetApiDefinitionRequest {
    filePath: string;
}

/**
 * Response with API definition for a specific file
 */
export interface GetApiDefinitionResponse {
    success: boolean;
    apiDefinition?: ApiDefinition;
    message?: string;
}

/**
 * Request to update API Platform configuration
 */
export interface UpdateApiPlatformConfigRequest {
    workspaceUri: string;
    config: ApiPlatformConfig;
    filePath?: string; // Optional path to the OpenAPI file
}

/**
 * Response from updating API Platform configuration
 */
export interface UpdateApiPlatformConfigResponse {
    success: boolean;
    message?: string;
}
