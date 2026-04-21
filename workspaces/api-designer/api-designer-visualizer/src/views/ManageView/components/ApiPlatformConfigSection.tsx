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

import React from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, Typography, Badge, TextField } from '@wso2/ui-toolkit';
import { Section, SectionContent } from '../../../components/layout';
import { FormField, FormGrid } from '../../../components/forms';

const ContentSection = styled(Section)`
    padding: 20px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    margin-bottom: 20px;
`;

const SectionHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
`;

const SectionHeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const SectionIcon = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(59, 130, 246, 0.12);
    color: var(--vscode-textLink-foreground);
    display: flex;
    align-items: center;
    justify-content: center;
`;

const InputWithButton = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
`;

const FilePickerButton = styled.button`
    position: absolute;
    right: 8px;
    background: transparent;
    border: none;
    color: var(--vscode-icon-foreground);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.15s ease;

    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
    }
`;

const InfoText = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
    margin-top: 4px;
`;

const InitializedText = styled.span`
    color: #10b981;
`;

export interface ApiPlatformConfigSectionProps {
    apiOpenApiPath: string;
    documentationFolder: string;
    testsFolder: string;
    existingArtifactPath: string | null;
    isSaving: boolean;
    onOpenApiPathChange: (path: string) => void;
    onDocumentationFolderChange: (path: string) => void;
    onTestsFolderChange: (path: string) => void;
    onArtifactPathChange: (path: string | null) => void;
    onBrowseFile: (type: 'openapi' | 'artifact' | 'documentation' | 'tests', setter: (path: string) => void) => void;
    onSave: () => void;
}

export const ApiPlatformConfigSection: React.FC<ApiPlatformConfigSectionProps> = ({
    apiOpenApiPath,
    documentationFolder,
    testsFolder,
    existingArtifactPath,
    isSaving,
    onOpenApiPathChange,
    onDocumentationFolderChange,
    onTestsFolderChange,
    onArtifactPathChange,
    onBrowseFile,
    onSave
}) => {
    return (
        <ContentSection variant="card">
            <SectionHeader>
                <SectionHeaderLeft>
                    <SectionIcon>
                        <Codicon name="settings-gear" sx={{ fontSize: '16px' }} />
                    </SectionIcon>
                    <Typography variant="body1" sx={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--vscode-foreground)' }}>
                        API Project Configuration
                    </Typography>
                    <Badge
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 12,
                            backgroundColor: 'rgba(16, 185, 129, 0.12) !important',
                            color: '#10b981 !important',
                            fontSize: 12,
                            fontWeight: 600,
                            '& *': {
                                color: '#10b981 !important'
                            }
                        }}
                    >
                        <Codicon name="check" sx={{ fontSize: '12px', color: '#10b981 !important' }} />
                        <InitializedText>Initialized</InitializedText>
                    </Badge>
                </SectionHeaderLeft>
                <SectionHeaderRight>
                    <Button
                        appearance="primary"
                        onClick={onSave}
                        disabled={isSaving}
                        sx={{ minWidth: 100 }}
                    >
                        {isSaving ? (
                            <>
                                <Codicon name="sync~spin" sx={{ fontSize: '14px', marginRight: 6 }} />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Codicon name="save" sx={{ fontSize: '14px', marginRight: 6 }} />
                                Save
                            </>
                        )}
                    </Button>
                </SectionHeaderRight>
            </SectionHeader>
            
            <SectionContent indent gap={20}>
                <FormField label="OpenAPI Specification Path">
                    <InputWithButton>
                        <TextField
                            value={apiOpenApiPath}
                            onTextChange={onOpenApiPathChange}
                            placeholder="Path to OpenAPI spec"
                            sx={{ width: '100%', paddingRight: '40px' }}
                        />
                        <FilePickerButton
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onBrowseFile('openapi', onOpenApiPathChange);
                            }}
                            title="Browse for OpenAPI file"
                        >
                            <Codicon name="folder" sx={{ fontSize: '16px' }} />
                        </FilePickerButton>
                    </InputWithButton>
                    <InfoText>The path to your OpenAPI specification file</InfoText>
                </FormField>

                <FormField label="Deployment Artifact Path">
                    <InputWithButton>
                        <TextField
                            value={existingArtifactPath || ''}
                            onTextChange={(value) => onArtifactPathChange(value || null)}
                            placeholder="Path to deployment artifact"
                            sx={{ width: '100%', paddingRight: '40px' }}
                        />
                        <FilePickerButton
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onBrowseFile('artifact', (path) => onArtifactPathChange(path || null));
                            }}
                            title="Browse for deployment artifact"
                        >
                            <Codicon name="folder" sx={{ fontSize: '16px' }} />
                        </FilePickerButton>
                    </InputWithButton>
                    <InfoText>Path to the WSO2 deployment artifact (auto-generated below)</InfoText>
                </FormField>

                <FormGrid columns={2}>
                    <FormField label="Documentation Folder">
                        <InputWithButton>
                            <TextField
                                value={documentationFolder}
                                onTextChange={onDocumentationFolderChange}
                                placeholder="e.g., docs"
                                sx={{ width: '100%', paddingRight: '40px' }}
                            />
                            <FilePickerButton
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onBrowseFile('documentation', onDocumentationFolderChange);
                                }}
                                title="Browse for documentation folder"
                            >
                                <Codicon name="folder" sx={{ fontSize: '16px' }} />
                            </FilePickerButton>
                        </InputWithButton>
                        <InfoText>Folder containing API documentation files</InfoText>
                    </FormField>

                    <FormField label="Tests Folder">
                        <InputWithButton>
                            <TextField
                                value={testsFolder}
                                onTextChange={onTestsFolderChange}
                                placeholder="e.g., tests"
                                sx={{ width: '100%', paddingRight: '40px' }}
                            />
                            <FilePickerButton
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onBrowseFile('tests', onTestsFolderChange);
                                }}
                                title="Browse for tests folder"
                            >
                                <Codicon name="folder" sx={{ fontSize: '16px' }} />
                            </FilePickerButton>
                        </InputWithButton>
                        <InfoText>Folder containing API tests</InfoText>
                    </FormField>
                </FormGrid>
            </SectionContent>
        </ContentSection>
    );
};

