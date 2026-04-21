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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    GetAPISpecContentRequest,
    GoToSourceRequest,
    OpenViewRequest,
    WriteAPISpecContentRequest,
    GetGovernanceRequest,
    GenerateDeploymentArtifactRequest,
    ValidateAPISpecRequest,
    InitAPIProjectRequest,
    GetApiPlatformConfigRequest,
    GetApiDefinitionRequest,
    UpdateApiPlatformConfigRequest,
    FetchRulesetsFromFolderRequest,
    GetApplicableRulesetsRequest,
    ReadDeploymentArtifactRequest,
    SaveProjectConfigRequest,
    GetProjectDetailsRequest,
    GetWorkspaceFileTreeRequest,
    ReadFileRequest,
    WriteFileRequest,
    DeleteFileRequest,
    CheckAIAvailabilityRequest,
    GetAllSpectralRulesetsRequest,
    getAPISpecContent,
    goToSource,
    importJSON,
    openView,
    writeAPISpecContent,
    getGovernance,
    generateDeploymentArtifact,
    validateAPISpec,
    initApiProject,
    getApiPlatformConfig,
    getApiDefinition,
    updateApiPlatformConfig,
    fetchRulesetsFromFolder,
    getApplicableRulesets,
    readDeploymentArtifact,
    saveProjectConfig,
    getProjectDetails,
    getWorkspaceFileTree,
    readFile,
    writeFile,
    deleteFile,
    checkAIAvailability,
    getAllSpectralRulesets,
    VisualizerLocation
} from "@wso2/api-designer-core";
import { Messenger } from "vscode-messenger";
import { openView as sendOpenView, StateMachine } from '../../stateMachine';
import { logError } from '../../util/logger';

const CONTEXT = 'RpcHandler';

// Import managers
import { SpecContentManager } from './managers/spec-content-manager';
import { GovernanceManager } from './managers/governance-manager';
import { ProjectManager } from './managers/project-manager';
import { FileManager } from './managers/file-manager';
import { AIRpcManager } from './managers/ai-manager';

export function registerApiDesignerVisualizerRpcHandlers(messenger: Messenger) {
    // Create managers (with dependencies)
    const specContentManager = new SpecContentManager();
    const projectManager = new ProjectManager(specContentManager);
    const governanceManager = new GovernanceManager();
    const fileManager = new FileManager();
    const aiManager = new AIRpcManager();
    
    // View navigation
    messenger.onNotification(openView, (args: OpenViewRequest) => {
        try {
            const location = (args.location || {}) as VisualizerLocation | undefined;
            sendOpenView(args.type, location);
        } catch (error) {
            logError(`${CONTEXT}: Error handling openView request`, error);
            throw error;
        }
    });
    
    messenger.onNotification(goToSource, (_args: GoToSourceRequest) => {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    });
    
    // API Spec content operations
    messenger.onRequest(getAPISpecContent, (args: GetAPISpecContentRequest) => 
        specContentManager.getAPISpecContent(args)
    );
    messenger.onRequest(writeAPISpecContent, (args: WriteAPISpecContentRequest) => 
        specContentManager.writeAPISpecContent(args)
    );
    messenger.onRequest(importJSON, () => 
        specContentManager.importJSON()
    );
    
    // Governance and validation
    messenger.onRequest(getGovernance, (args: GetGovernanceRequest) => 
        governanceManager.getGovernance(args)
    );
    messenger.onRequest(validateAPISpec, (args: ValidateAPISpecRequest) => 
        governanceManager.validateAPISpec(args)
    );
    
    // Deployment artifacts (moved from GovernanceManager to ProjectManager)
    messenger.onRequest(generateDeploymentArtifact, (args: GenerateDeploymentArtifactRequest) => 
        projectManager.generateDeploymentArtifact(args)
    );
    
    // API Project management
    messenger.onRequest(initApiProject, (args: InitAPIProjectRequest) => 
        projectManager.initApiProject(args)
    );
    messenger.onRequest(getApiPlatformConfig, (args: GetApiPlatformConfigRequest) => 
        projectManager.getApiPlatformConfig(args)
    );
    messenger.onRequest(getApiDefinition, (args: GetApiDefinitionRequest) => 
        projectManager.getApiDefinition(args)
    );
    messenger.onRequest(updateApiPlatformConfig, (args: UpdateApiPlatformConfigRequest) => 
        projectManager.updateApiPlatformConfig(args)
    );
    
    // Spectral rulesets (now part of GovernanceManager)
    messenger.onRequest(fetchRulesetsFromFolder, (args: FetchRulesetsFromFolderRequest) => 
        governanceManager.fetchRulesetsFromFolder(args)
    );
    messenger.onRequest(getApplicableRulesets, (args: GetApplicableRulesetsRequest) => 
        governanceManager.getApplicableRulesets(args)
    );
    messenger.onRequest(getAllSpectralRulesets, (args: GetAllSpectralRulesetsRequest) => 
        governanceManager.getAllSpectralRulesets(args)
    );
    
    // Deployment artifacts (consolidated in ProjectManager)
    messenger.onRequest(readDeploymentArtifact, (args: ReadDeploymentArtifactRequest) => 
        projectManager.readDeploymentArtifact(args)
    );
    
    // Project configuration (new unified methods)
    messenger.onRequest(saveProjectConfig, (args: SaveProjectConfigRequest) => 
        projectManager.saveProjectConfig(args)
    );
    messenger.onRequest(getProjectDetails, (args: GetProjectDetailsRequest) => 
        projectManager.getProjectDetails(args)
    );
    
    // File operations (getWorkspaceFileTree now supports filtering)
    messenger.onRequest(getWorkspaceFileTree, (args: GetWorkspaceFileTreeRequest) => 
        fileManager.getWorkspaceFileTree(args)
    );
    messenger.onRequest(readFile, (args: ReadFileRequest) => 
        fileManager.readFile(args)
    );
    messenger.onRequest(writeFile, (args: WriteFileRequest) => 
        fileManager.writeFile(args)
    );
    messenger.onRequest(deleteFile, (args: DeleteFileRequest) => 
        fileManager.deleteFile(args)
    );
    
    // AI availability
    messenger.onRequest(checkAIAvailability, (args: CheckAIAvailabilityRequest) => 
        aiManager.checkAIAvailability(args)
    );
}
