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

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, Typography } from '@wso2/ui-toolkit';
import { APIHeader } from '../DesignView/components/api-header/APIHeader';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { SpectralRuleset } from '@wso2/api-designer-core';
import { logger } from '../../utils/logger';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { useFileUri, useLoadingState } from '../../hooks';
import { ViewContainer } from '../../components/common/ViewContainer';
import { WaitingForFileMessage, InitializingMessage } from '../../components/common/LoadingStates';
import { FeatureComingSoon } from '../../components/common/FeatureComingSoon';
import { ApiPlatformConfigSection } from './components/ApiPlatformConfigSection';
import { SpectralRulesetSection } from './components/SpectralRulesetSection';
import { DeploymentArtifactSection } from './components/DeploymentArtifactSection';
import { InitializeProjectWizard } from './components/InitializeProjectWizard';
import { useSpecInfo } from './hooks/useSpecInfo';
import { useProjectInitialization } from './hooks/useProjectInitialization';
import { useProjectConfig } from './hooks/useProjectConfig';
import { useDeploymentArtifact } from './hooks/useDeploymentArtifact';
import { useRulesetManagement } from './hooks/useRulesetManagement';
import { useFilePicker } from './hooks/useFilePicker';

const ManageContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: auto;
    background: var(--vscode-editor-background);
    
    &::-webkit-scrollbar {
        width: 10px;
    }
    
    &::-webkit-scrollbar-track {
        background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
        
        &:hover {
            background: var(--vscode-scrollbarSlider-hoverBackground);
        }
    }
`;

const ScrollContainer = styled.div`
    padding: 24px 32px 48px 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 1264px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
    min-height: min-content;
`;

const ContentSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
`;

const FilePickerModal = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const FilePickerContent = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`;

const FilePickerHeader = styled.div`
    padding: 16px 20px;
    border-bottom: 1px solid var(--vscode-panel-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const FilePickerBody = styled.div`
    padding: 16px 20px;
    overflow-y: auto;
    flex: 1;
`;

const FilePickerFooter = styled.div`
    padding: 16px 20px;
    border-top: 1px solid var(--vscode-panel-border);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
`;

const FileList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 400px;
    overflow-y: auto;
`;

const FileItem = styled.div<{ indent?: number; isSelected?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    padding-left: ${(props: { indent?: number }) => (props.indent || 0) * 20 + 12}px;
    background: ${(props: { isSelected?: boolean }) => props.isSelected ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'};
    color: ${(props: { isSelected?: boolean }) => props.isSelected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)'};
    cursor: pointer;
    font-size: 13px;
    border-radius: 4px;
    transition: background 0.15s ease;
    user-select: none;

    &:hover {
        background: ${(props: { isSelected?: boolean }) => props.isSelected ? 'var(--vscode-list-activeSelectionBackground)' : 'var(--vscode-list-hoverBackground)'};
    }
`;

const TreeIconSlot = styled.span`
    width: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const TreeSpacer = styled.span`
    width: 16px;
`;

const TreeNodeName = styled.span`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

interface ManageViewProps {
    fileUri?: string;
}

export const ManageView: React.FC<ManageViewProps> = ({ fileUri: propFileUri }) => {
    const { rpcClient } = useVisualizerContext();
    const fileUri = useFileUri(propFileUri);
    const workspaceRoot = useMemo(() => {
        if (!fileUri) {
            return '';
        }
        const lastSlash = fileUri.lastIndexOf('/');
        return lastSlash !== -1 ? fileUri.substring(0, lastSlash) : '';
    }, [fileUri]);

    // Hooks
    const { specInfo } = useSpecInfo(fileUri);
    const projectConfig = useProjectConfig(fileUri);
    const deploymentArtifact = useDeploymentArtifact(specInfo);
    const rulesetManagement = useRulesetManagement();
    const filePicker = useFilePicker(fileUri);

    // Project initialization
    const handleProjectInitialized = useCallback((response: any) => {
        if (response.projectConfig) {
            projectConfig.setProjectConfig(response.projectConfig);
            
            if (response.apiDefinition) {
                projectConfig.setApiOpenApiPath(response.apiDefinition.apiSpecPath);
                projectConfig.setDocumentationFolder(response.apiDefinition.docsFolder);
                projectConfig.setTestsFolder(response.apiDefinition.testsFolder);
                deploymentArtifact.setExistingArtifactPath(response.apiDefinition.artifactPath || null);
            }
            
            if (response.artifact) {
                deploymentArtifact.setArtifactName(response.artifact.name);
                deploymentArtifact.setArtifactVersion(response.artifact.version);
                deploymentArtifact.setArtifactContext(response.artifact.context);
                deploymentArtifact.setArtifactDescription(response.artifact.description);
                deploymentArtifact.setMainEndpoint(response.artifact.mainEndpoint);
                deploymentArtifact.setSandboxEndpoint(response.artifact.sandboxEndpoint);
                deploymentArtifact.setArtifactFileExists(response.artifact.fileExists);
            }
        } else {
            projectConfig.setProjectConfig(null);
            projectConfig.setApiOpenApiPath('');
            projectConfig.setDocumentationFolder('docs');
            projectConfig.setTestsFolder('tests');
            deploymentArtifact.setExistingArtifactPath(null);
            deploymentArtifact.setArtifactFileExists(false);
        }
    }, [projectConfig, deploymentArtifact]);

    const projectInit = useProjectInitialization(fileUri, handleProjectInitialized);
    const { shouldShowLoading, shouldShowWaiting, shouldShowInitializing } = useLoadingState(fileUri);

    // Initialize project handler
    const handleInitializeProject = useCallback(async (config: {
        docsFolder: string;
        testsFolder: string;
        rulesets: SpectralRuleset[];
        enabledRulesets: Set<string>;
        artifactName: string;
        artifactVersion: string;
        artifactContext: string;
        artifactDescription: string;
        mainEndpoint: string;
        sandboxEndpoint: string;
    }) => {
        if (!rpcClient || !fileUri) return;
        
        try {
            const workspaceUri = fileUri.substring(0, fileUri.lastIndexOf('/'));
            
            const response = await rpcClient.getApiDesignerVisualizerRpcClient().initApiProject({
                workspaceUri: workspaceUri,
                apiSpecPath: fileUri,
                spectralRulesets: config.rulesets,
                docsFolder: config.docsFolder || 'docs',
                testsFolder: config.testsFolder || 'tests'
            });

            if (response.success) {
                const generateResponse = await rpcClient.getApiDesignerVisualizerRpcClient().generateDeploymentArtifact({
                    filePath: fileUri,
                    artifactName: config.artifactName,
                    artifactVersion: config.artifactVersion,
                    artifactContext: config.artifactContext,
                    artifactDescription: config.artifactDescription,
                    mainEndpoint: config.mainEndpoint,
                    sandboxEndpoint: config.sandboxEndpoint
                });

                if (generateResponse.success) {
                    const updatedApiDefResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApiDefinition({
                        filePath: fileUri
                    });
                    
                    if (updatedApiDefResponse.success && updatedApiDefResponse.apiDefinition?.wso2Artifact) {
                        const artifactRelative = updatedApiDefResponse.apiDefinition.wso2Artifact.replace(/\\/g, '/');
                    
                        const configResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApiPlatformConfig({
                            workspaceUri: workspaceUri
                        });
                        
                        if (configResponse.success && configResponse.config) {
                            const updatedConfig = {
                                ...configResponse.config,
                                api: configResponse.config.api ? {
                                    ...configResponse.config.api,
                                    wso2Artifact: artifactRelative
                                } : undefined
                            };

                            await rpcClient.getApiDesignerVisualizerRpcClient().updateApiPlatformConfig({
                                workspaceUri: workspaceUri,
                                config: updatedConfig
                            });
                        }
                        
                        deploymentArtifact.setExistingArtifactPath(artifactRelative);
                    }
                    
                    deploymentArtifact.setArtifactName(config.artifactName);
                    deploymentArtifact.setArtifactVersion(config.artifactVersion);
                    deploymentArtifact.setArtifactContext(config.artifactContext);
                    deploymentArtifact.setArtifactDescription(config.artifactDescription);
                }

                await projectInit.checkProjectInitialization();
            }
        } catch (err: any) {
            logger.error('Error initializing project:', err);
        }
    }, [rpcClient, fileUri, deploymentArtifact, projectInit]);

    // File picker handlers
    const handleBrowseFile = useCallback(async (
        type: 'openapi' | 'artifact' | 'documentation' | 'tests',
        setter: (value: string) => void
    ) => {
        if (!workspaceRoot) return;
        await filePicker.openFilePicker(type, workspaceRoot);
    }, [workspaceRoot, filePicker]);

    const handleFileSelect = useCallback((path: string, isDirectory: boolean) => {
        const folderSelectable = filePicker.filePickerType === 'ruleset' || filePicker.filePickerType === 'documentation' || filePicker.filePickerType === 'tests';
        
        if (isDirectory) {
            if (folderSelectable) {
                filePicker.setSelectedFilePath(path);
            }
            filePicker.toggleFolder(path);
        } else if (!folderSelectable) {
            filePicker.setSelectedFilePath(path);
        }
    }, [filePicker]);

    const handleFilePickerConfirm = useCallback(() => {
        if (filePicker.selectedFilePath) {
            if (filePicker.filePickerType === 'openapi') {
                projectConfig.setApiOpenApiPath(filePicker.selectedFilePath);
            } else if (filePicker.filePickerType === 'artifact') {
                deploymentArtifact.setExistingArtifactPath(filePicker.selectedFilePath);
            } else if (filePicker.filePickerType === 'documentation') {
                projectConfig.setDocumentationFolder(filePicker.selectedFilePath);
            } else if (filePicker.filePickerType === 'tests') {
                projectConfig.setTestsFolder(filePicker.selectedFilePath);
            }
        }
        filePicker.closeFilePicker();
    }, [filePicker, projectConfig, deploymentArtifact]);

    const handleBrowseFolderForRuleset = useCallback(async () => {
        if (!workspaceRoot) return;
        await filePicker.openFilePicker('ruleset', workspaceRoot);
    }, [workspaceRoot, filePicker]);

    const handleFolderSelect = useCallback(() => {
        if (filePicker.selectedFilePath) {
            rulesetManagement.setNewRulesetFolderPath(filePicker.selectedFilePath);
            filePicker.closeFilePicker();
        }
    }, [filePicker, rulesetManagement]);

    // Save handler
    const handleSave = useCallback(async () => {
        await projectConfig.saveConfig({
            existingArtifactPath: deploymentArtifact.existingArtifactPath,
            artifactName: deploymentArtifact.artifactName,
            artifactVersion: deploymentArtifact.artifactVersion,
            artifactContext: deploymentArtifact.artifactContext,
            artifactDescription: deploymentArtifact.artifactDescription,
            mainEndpoint: deploymentArtifact.mainEndpoint,
            sandboxEndpoint: deploymentArtifact.sandboxEndpoint,
            onSuccess: (artifactPath) => {
                deploymentArtifact.setExistingArtifactPath(artifactPath);
                deploymentArtifact.setArtifactFileExists(true);
                projectInit.checkProjectInitialization();
            }
        });
    }, [projectConfig, deploymentArtifact, projectInit]);

    // Ruleset handlers
    const handleFetchRulesetsFromFolder = useCallback(() => {
        rulesetManagement.fetchRulesetsFromFolder(projectConfig.projectConfig, fileUri);
    }, [rulesetManagement, projectConfig.projectConfig, fileUri]);

    const handleAddFetchedRulesets = useCallback(async () => {
        const updatedConfig = rulesetManagement.addFetchedRulesets(projectConfig.projectConfig, projectConfig.setProjectConfig);
        if (updatedConfig && rpcClient) {
            try {
                const workspaceUri = fileUri.substring(0, fileUri.lastIndexOf('/'));
                await rpcClient.getApiDesignerVisualizerRpcClient().updateApiPlatformConfig({
                    workspaceUri,
                    config: updatedConfig
                });
            } catch (err) {
                logger.error('Failed to save rulesets:', err);
            }
        }
    }, [rulesetManagement, projectConfig, rpcClient, fileUri]);

    const handleRemoveRuleset = useCallback(async (index: number) => {
        const updatedConfig = rulesetManagement.removeRuleset(index, projectConfig.projectConfig, projectConfig.setProjectConfig);
        if (updatedConfig && rpcClient) {
            try {
                const workspaceUri = fileUri.substring(0, fileUri.lastIndexOf('/'));
                await rpcClient.getApiDesignerVisualizerRpcClient().updateApiPlatformConfig({
                    workspaceUri,
                    config: updatedConfig
                });
            } catch (err) {
                logger.error('Failed to save rulesets:', err);
            }
        }
    }, [rulesetManagement, projectConfig, rpcClient, fileUri]);

    const handleStartEditRuleset = useCallback((index: number) => {
        rulesetManagement.startEditRuleset(index, projectConfig.projectConfig);
    }, [rulesetManagement, projectConfig.projectConfig]);

    const handleSaveEditRuleset = useCallback(async () => {
        const updatedConfig = rulesetManagement.saveEditRuleset(projectConfig.projectConfig, projectConfig.setProjectConfig);
        if (updatedConfig && rpcClient) {
            try {
                const workspaceUri = fileUri.substring(0, fileUri.lastIndexOf('/'));
                await rpcClient.getApiDesignerVisualizerRpcClient().updateApiPlatformConfig({
                    workspaceUri,
                    config: updatedConfig
                });
            } catch (err) {
                logger.error('Failed to save rulesets:', err);
            }
        }
    }, [rulesetManagement, projectConfig, rpcClient, fileUri]);

    // File tree rendering
    const renderFileTreeNode = useCallback((node: any, indent: number): React.ReactNode => {
        const isDirectory = node.type === 'directory';
        const isExpanded = filePicker.expandedFolders.has(node.path);
        const isSelected = filePicker.selectedFilePath === node.path;

        return (
            <React.Fragment key={node.path}>
                <FileItem
                    indent={indent}
                    isSelected={isSelected}
                    onClick={() => handleFileSelect(node.path, isDirectory)}
                >
                    {isDirectory ? (
                        <>
                            <TreeIconSlot>
                                <Codicon name={isExpanded ? 'chevron-down' : 'chevron-right'} sx={{ fontSize: '12px' }} />
                            </TreeIconSlot>
                            <TreeIconSlot>
                                <Codicon name={isExpanded ? 'folder-opened' : 'folder'} sx={{ fontSize: '16px' }} />
                            </TreeIconSlot>
                        </>
                    ) : (
                        <>
                            <TreeSpacer />
                            <TreeIconSlot>
                                <Codicon name="file" sx={{ fontSize: '16px' }} />
                            </TreeIconSlot>
                        </>
                    )}
                    <TreeNodeName>{node.name}</TreeNodeName>
                </FileItem>
                {isDirectory && isExpanded && node.children && (
                    <>
                        {node.children.map((child: any) => renderFileTreeNode(child, indent + 1))}
                    </>
                )}
            </React.Fragment>
        );
    }, [filePicker.expandedFolders, filePicker.selectedFilePath, handleFileSelect]);

    // Loading states
    if (shouldShowWaiting) {
        return (
            <ViewContainer>
                <WaitingForFileMessage />
            </ViewContainer>
        );
    }
    
    // Only show initializing if we're actively checking the project status (and we have a fileUri)
    // Don't show it if we don't have fileUri - that's handled by shouldShowWaiting above
    if (projectInit.checkingProject && fileUri) {
        return (
            <ViewContainer>
                <InitializingMessage />
            </ViewContainer>
        );
    }

    if (specInfo?.specType === 'asyncapi') {
        return (
            <ManageContainer>
                <APIHeader
                    title={specInfo?.title}
                    description={specInfo?.description}
                    version={specInfo?.version}
                    openApiVersion={specInfo?.openApiVersion}
                    specType="asyncapi"
                    fileUri={fileUri}
                    readOnly={true}
                    showDescription={false}
                />
                <FeatureComingSoon 
                    featureName="Manage View" 
                    description="Management capabilities for AsyncAPI specifications are coming soon." 
                />
            </ManageContainer>
        );
    }

    if (!projectInit.isProjectInitialized) {
        return (
            <ManageContainer>
                <APIHeader
                    title={specInfo?.title}
                    version={specInfo?.version}
                    openApiVersion={specInfo?.openApiVersion}
                    specType={specInfo?.specType}
                    readOnly={true}
                    showDescription={false}
                />
                <ScrollContainer>
                    <InitializeProjectWizard
                        apiTitle={specInfo?.title}
                        apiVersion={specInfo?.version}
                        apiDescription={specInfo?.description}
                        apiMainEndpoint={specInfo?.mainEndpoint}
                        apiSandboxEndpoint=""
                        onInitialize={handleInitializeProject}
                        onCancel={() => {}}
                        isInitializing={projectInit.isInitializing}
                    />
                </ScrollContainer>
            </ManageContainer>
        );
    }

    return (
        <ManageContainer>
            <APIHeader
                title={specInfo?.title}
                version={specInfo?.version}
                openApiVersion={specInfo?.openApiVersion}
                specType={specInfo?.specType}
                readOnly={true}
                showDescription={false}
            />
            
            <ScrollContainer>
                <ApiPlatformConfigSection
                    apiOpenApiPath={projectConfig.apiOpenApiPath}
                    documentationFolder={projectConfig.documentationFolder}
                    testsFolder={projectConfig.testsFolder}
                    existingArtifactPath={deploymentArtifact.existingArtifactPath}
                    isSaving={projectConfig.isSaving}
                    onOpenApiPathChange={projectConfig.setApiOpenApiPath}
                    onDocumentationFolderChange={projectConfig.setDocumentationFolder}
                    onTestsFolderChange={projectConfig.setTestsFolder}
                    onArtifactPathChange={deploymentArtifact.setExistingArtifactPath}
                    onBrowseFile={handleBrowseFile}
                    onSave={handleSave}
                />

                {projectConfig.projectConfig && (
                    <ContentSection>
                        <SpectralRulesetSection
                            rulesets={projectConfig.projectConfig.spectralRulesets}
                            isExpanded={rulesetManagement.isRulesetsExpanded}
                            isAdding={rulesetManagement.isAddingRuleset}
                            editingIndex={rulesetManagement.editingRulesetIndex}
                            newRulesetFolderPath={rulesetManagement.newRulesetFolderPath}
                            fetchedRulesets={rulesetManagement.fetchedRulesets}
                            isLoadingRulesets={rulesetManagement.isLoadingRulesets}
                            rulesetError={rulesetManagement.rulesetError}
                            editRulesetName={rulesetManagement.editRulesetName}
                            editRulesetSourceFolder={rulesetManagement.editRulesetSourceFolder}
                            editRulesetFileName={rulesetManagement.editRulesetFileName}
                            editRulesetContentPath={rulesetManagement.editRulesetContentPath}
                            onToggleExpand={() => rulesetManagement.setIsRulesetsExpanded(!rulesetManagement.isRulesetsExpanded)}
                            onStartAdding={() => rulesetManagement.setIsAddingRuleset(true)}
                            onCancelAdding={() => {
                                rulesetManagement.setIsAddingRuleset(false);
                                rulesetManagement.setNewRulesetFolderPath('');
                                rulesetManagement.setFetchedRulesets([]);
                                rulesetManagement.setRulesetError(null);
                            }}
                            onFolderPathChange={rulesetManagement.setNewRulesetFolderPath}
                            onBrowseFolder={handleBrowseFolderForRuleset}
                            onFetchRulesets={handleFetchRulesetsFromFolder}
                            onAddFetchedRulesets={handleAddFetchedRulesets}
                            onStartEdit={handleStartEditRuleset}
                            onSaveEdit={handleSaveEditRuleset}
                            onCancelEdit={rulesetManagement.cancelEditRuleset}
                            onRemove={handleRemoveRuleset}
                            onEditNameChange={rulesetManagement.setEditRulesetName}
                            onEditSourceFolderChange={rulesetManagement.setEditRulesetSourceFolder}
                            onEditFileNameChange={rulesetManagement.setEditRulesetFileName}
                            onEditContentPathChange={rulesetManagement.setEditRulesetContentPath}
                        />
                    </ContentSection>
                )}

                <DeploymentArtifactSection
                    artifactName={deploymentArtifact.artifactName}
                    artifactVersion={deploymentArtifact.artifactVersion}
                    artifactContext={deploymentArtifact.artifactContext}
                    artifactDescription={deploymentArtifact.artifactDescription}
                    mainEndpoint={deploymentArtifact.mainEndpoint}
                    sandboxEndpoint={deploymentArtifact.sandboxEndpoint}
                    existingArtifactPath={deploymentArtifact.existingArtifactPath}
                    artifactFileExists={deploymentArtifact.artifactFileExists}
                    isSaving={projectConfig.isSaving}
                    onNameChange={deploymentArtifact.setArtifactName}
                    onVersionChange={deploymentArtifact.setArtifactVersion}
                    onContextChange={deploymentArtifact.setArtifactContext}
                    onDescriptionChange={deploymentArtifact.setArtifactDescription}
                    onMainEndpointChange={deploymentArtifact.setMainEndpoint}
                    onSandboxEndpointChange={deploymentArtifact.setSandboxEndpoint}
                    onRegenerate={handleSave}
                />
            </ScrollContainer>

            {filePicker.showFilePicker && (
                <FilePickerModal onClick={filePicker.closeFilePicker}>
                    <FilePickerContent onClick={(e) => e.stopPropagation()}>
                        <FilePickerHeader>
                            <Typography variant="body1" sx={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--vscode-foreground)' }}>
                                {filePicker.filePickerType === 'ruleset' ? 'Select Ruleset Folder or File' :
                                 filePicker.filePickerType === 'openapi' ? 'Select OpenAPI Specification' : 
                                 filePicker.filePickerType === 'artifact' ? 'Select Deployment Artifact' :
                                 filePicker.filePickerType === 'documentation' ? 'Select Documentation Folder' : 'Select Tests Folder'}
                            </Typography>
                            <Button
                                appearance="icon"
                                onClick={filePicker.closeFilePicker}
                            >
                                <Codicon name="close" sx={{ fontSize: '16px' }} />
                            </Button>
                        </FilePickerHeader>
                        <FilePickerBody>
                            {filePicker.isLoadingFileTree ? (
                                <LoadingOverlay message="Loading files..." />
                            ) : (
                                <FileList>
                                    {filePicker.fileTree.map((node) => renderFileTreeNode(node, 0))}
                                </FileList>
                            )}
                        </FilePickerBody>
                        <FilePickerFooter>
                            <Button appearance="secondary" onClick={filePicker.closeFilePicker}>
                                Cancel
                            </Button>
                            <Button 
                                appearance="primary"
                                onClick={filePicker.filePickerType === 'ruleset' ? handleFolderSelect : handleFilePickerConfirm}
                                disabled={!filePicker.selectedFilePath}
                            >
                                Select
                            </Button>
                        </FilePickerFooter>
                    </FilePickerContent>
                </FilePickerModal>
            )}
        </ManageContainer>
    );
};

