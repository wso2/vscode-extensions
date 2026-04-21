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
import { Button, Codicon, Typography, TextField, AutoResizeTextArea } from '@wso2/ui-toolkit';
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

const InfoText = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
`;

export interface DeploymentArtifactSectionProps {
    artifactName: string;
    artifactVersion: string;
    artifactContext: string;
    artifactDescription: string;
    mainEndpoint: string;
    sandboxEndpoint: string;
    existingArtifactPath: string | null;
    artifactFileExists: boolean;
    isSaving: boolean;
    onNameChange: (name: string) => void;
    onVersionChange: (version: string) => void;
    onContextChange: (context: string) => void;
    onDescriptionChange: (description: string) => void;
    onMainEndpointChange: (endpoint: string) => void;
    onSandboxEndpointChange: (endpoint: string) => void;
    onRegenerate: () => void;
}

export const DeploymentArtifactSection: React.FC<DeploymentArtifactSectionProps> = ({
    artifactName,
    artifactVersion,
    artifactContext,
    artifactDescription,
    mainEndpoint,
    sandboxEndpoint,
    existingArtifactPath,
    artifactFileExists,
    isSaving,
    onNameChange,
    onVersionChange,
    onContextChange,
    onDescriptionChange,
    onMainEndpointChange,
    onSandboxEndpointChange,
    onRegenerate
}) => {
    return (
        <ContentSection variant="card">
            <SectionHeader>
                <SectionHeaderLeft>
                    <SectionIcon>
                        <Codicon name="package" sx={{ fontSize: '16px' }} />
                    </SectionIcon>
                    <Typography variant="body1" sx={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--vscode-foreground)' }}>
                        Deployment Artifact
                    </Typography>
                </SectionHeaderLeft>
                <SectionHeaderRight>
                    <Button
                        appearance="primary"
                        onClick={onRegenerate}
                        disabled={isSaving || !artifactName || !artifactVersion || !artifactContext || !mainEndpoint}
                        sx={{ minWidth: 100 }}
                    >
                        {isSaving ? (
                            <>Saving...</>
                        ) : artifactFileExists ? (
                            <>
                                <Codicon name="refresh" sx={{ fontSize: '14px', marginRight: 6 }} />
                                Update
                            </>
                        ) : (
                            <>
                                <Codicon name="add" sx={{ fontSize: '14px', marginRight: 6 }} />
                                Generate
                            </>
                        )}
                    </Button>
                </SectionHeaderRight>
            </SectionHeader>

            <SectionContent indent gap={20}>
                <FormGrid columns={2}>
                    <FormField label="Name">
                        <TextField
                            value={artifactName}
                            onTextChange={onNameChange}
                            placeholder="Enter artifact name"
                        />
                    </FormField>

                    <FormField label="Version">
                        <TextField
                            value={artifactVersion}
                            onTextChange={onVersionChange}
                            placeholder="e.g., 1.0.0"
                        />
                    </FormField>

                    <FormField label="Context" fullWidth>
                        <TextField
                            value={artifactContext}
                            onTextChange={onContextChange}
                            placeholder="e.g., /api/v1"
                        />
                        <InfoText>The base path where your API will be accessible</InfoText>
                    </FormField>

                    <FormField label="Main Endpoint *" fullWidth>
                        <TextField
                            value={mainEndpoint}
                            onTextChange={onMainEndpointChange}
                            placeholder="https://api.example.com"
                        />
                        <InfoText>Production endpoint URL (required)</InfoText>
                    </FormField>

                    <FormField label="Sandbox Endpoint" fullWidth>
                        <TextField
                            value={sandboxEndpoint}
                            onTextChange={onSandboxEndpointChange}
                            placeholder="https://sandbox.api.example.com"
                        />
                        <InfoText>Sandbox/testing endpoint URL (optional)</InfoText>
                    </FormField>

                    <FormField label="Description" fullWidth>
                        <AutoResizeTextArea
                            value={artifactDescription}
                            onTextChange={onDescriptionChange}
                            placeholder="Describe your API artifact"
                            growRange={{ start: 3, offset: 13 }}
                        />
                    </FormField>
                </FormGrid>

                {existingArtifactPath && (
                    <InfoText>
                        <Codicon name="info" sx={{ fontSize: '12px' }} />
                        Artifact location: {existingArtifactPath}
                    </InfoText>
                )}
            </SectionContent>
        </ContentSection>
    );
};

