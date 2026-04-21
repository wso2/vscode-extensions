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

import React, { useState, useCallback, useEffect } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, Typography, TextField, TextArea, CheckBox } from '@wso2/ui-toolkit';
import { SpectralRuleset, getDefaultWizardSpectralRulesets } from '@wso2/api-designer-core';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';

const WizardContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 8px;
    max-width: 700px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
`;

const WizardCard = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 12px;
    padding: 24px;
    width: 100%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const WizardHeader = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    text-align: center;
`;

const WizardIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(59, 130, 246, 0.12);
    color: var(--vscode-textLink-foreground);
    display: flex;
    align-items: center;
    justify-content: center;
`;

const StepIndicator = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 12px;
`;

const StepDot = styled.div<{ active: boolean; completed: boolean }>`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s ease;
    
    ${(props: { active: boolean; completed: boolean }) => {
        if (props.completed) {
            return `
                background: var(--vscode-textLink-foreground);
                color: white;
            `;
        }
        if (props.active) {
            return `
                background: var(--vscode-textLink-foreground);
                color: white;
            `;
        }
        return `
            background: var(--vscode-widget-background);
            color: var(--vscode-descriptionForeground);
            border: 1px solid var(--vscode-panel-border);
        `;
    }}
`;

const StepConnector = styled.div<{ completed: boolean }>`
    width: 48px;
    height: 2px;
    background: ${(props: { completed: boolean }) => 
        props.completed ? 'var(--vscode-textLink-foreground)' : 'var(--vscode-panel-border)'};
    transition: background 0.2s ease;
`;

const StepLabel = styled.div`
    display: flex;
    justify-content: space-between;
    width: 100%;
    max-width: 250px;
    margin: 0 auto;
    padding: 0 8px;
`;

const StepLabelText = styled.span<{ active: boolean }>`
    font-size: 12px;
    color: ${(props: { active: boolean }) => 
        props.active ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)'};
    font-weight: ${(props: { active: boolean }) => props.active ? 600 : 400};
`;

const FormSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const FormGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    @media (max-width: 600px) {
        grid-template-columns: 1fr;
    }
`;

const Label = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const InfoText = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
`;

const RulesetList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
    max-height: 240px;
    overflow-y: auto;
    padding-right: 4px;

    /* Custom scrollbar for better appearance in VS Code */
    &::-webkit-scrollbar {
        width: 10px;
    }
    &::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
        border-radius: 5px;
    }
    &::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground);
    }
`;

const RulesetItem = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: var(--vscode-widget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
`;

const RulesetInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const RulesetName = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: var(--vscode-foreground);
`;

const RulesetSource = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const WizardFooter = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--vscode-panel-border);
`;

const FooterLeft = styled.div``;

const FooterRight = styled.div`
    display: flex;
    gap: 12px;
`;

const SummarySection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const SummaryCard = styled.div`
    background: var(--vscode-widget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 16px;
`;

const SummaryTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
    margin-bottom: 12px;
`;

const SummaryItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 8px 0;
    border-bottom: 1px solid var(--vscode-panel-border);
    
    &:last-child {
        border-bottom: none;
        padding-bottom: 0;
    }
`;

const SummaryLabel = styled.span`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
`;

const SummaryValue = styled.span`
    font-size: 12px;
    color: var(--vscode-foreground);
    text-align: right;
    max-width: 60%;
    word-break: break-word;
`;

const ClickableRulesetItem = styled(RulesetItem)`
    cursor: pointer;
`;

const StepContent = styled.div`
    margin-top: 12px;
`;

const DEFAULT_RULESETS: SpectralRuleset[] = getDefaultWizardSpectralRulesets();

interface InitializeProjectWizardProps {
    apiTitle?: string;
    apiVersion?: string;
    apiDescription?: string;
    apiMainEndpoint?: string;
    apiSandboxEndpoint?: string;
    onInitialize: (config: {
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
    }) => Promise<void>;
    onCancel: () => void;
    isInitializing: boolean;
}

export const InitializeProjectWizard: React.FC<InitializeProjectWizardProps> = ({
    apiTitle,
    apiVersion,
    apiDescription,
    apiMainEndpoint,
    apiSandboxEndpoint,
    onInitialize,
    onCancel,
    isInitializing
}) => {
    const { rpcClient } = useVisualizerContext();
    const [currentStep, setCurrentStep] = useState(1);
    const [availableRulesets, setAvailableRulesets] = useState<SpectralRuleset[]>(DEFAULT_RULESETS);
    const [isLoadingRulesets, setIsLoadingRulesets] = useState(true);

    const formatVersion = (version?: string): string => {
        if (!version) return 'v1.0';
        
        // Remove existing 'v' prefix if present
        let clean = version.toLowerCase().startsWith('v') ? version.substring(1) : version;
        
        // Split by dots and take first two parts
        const parts = clean.split('.');
        const major = parts[0] || '1';
        const minor = parts[1] || '0';
        
        return `v${major}.${minor}`;
    };
    
    // Step 1: Project Configuration
    const [docsFolder, setDocsFolder] = useState('docs');
    const [testsFolder, setTestsFolder] = useState('tests');
    const [enabledRulesets, setEnabledRulesets] = useState<Set<string>>(
        new Set(DEFAULT_RULESETS.map(r => r.fileName))
    );

    // Fetch all rulesets from configuration on mount
    useEffect(() => {
        const fetchRulesets = async () => {
            if (!rpcClient) return;
            
            try {
                setIsLoadingRulesets(true);
                const response = await rpcClient.getApiDesignerVisualizerRpcClient().getAllSpectralRulesets({});
                
                if (response.rulesets && response.rulesets.length > 0) {
                    setAvailableRulesets(response.rulesets);
                    // Initialize enabled rulesets - enable all by default
                    setEnabledRulesets(new Set(response.rulesets.map((r: SpectralRuleset) => r.fileName)));
                } else {
                    // Fallback to defaults if no rulesets found
                    setAvailableRulesets(DEFAULT_RULESETS);
                    setEnabledRulesets(new Set(DEFAULT_RULESETS.map(r => r.fileName)));
                }
            } catch (error) {
                console.error('Error fetching rulesets:', error);
                // Fallback to defaults on error
                setAvailableRulesets(DEFAULT_RULESETS);
                setEnabledRulesets(new Set(DEFAULT_RULESETS.map(r => r.fileName)));
            } finally {
                setIsLoadingRulesets(false);
            }
        };

        fetchRulesets();
    }, [rpcClient]);
    
    // Step 2: Deployment Artifact
    const [artifactName, setArtifactName] = useState(apiTitle || 'API');
    const [artifactVersion, setArtifactVersion] = useState(formatVersion(apiVersion));
    const [artifactContext, setArtifactContext] = useState(
        `/${(apiTitle || 'api').toLowerCase().replace(/\s+/g, '-')}`
    );
    const [artifactDescription, setArtifactDescription] = useState(apiDescription || '');
    const [mainEndpoint, setMainEndpoint] = useState(apiMainEndpoint || '');
    const [sandboxEndpoint, setSandboxEndpoint] = useState(apiSandboxEndpoint || '');

    // Update artifact defaults when API info changes
    React.useEffect(() => {
        if (apiTitle) {
            setArtifactName(apiTitle);
            setArtifactContext(`/${apiTitle.toLowerCase().replace(/\s+/g, '-')}`);
        }
        if (apiVersion) {
            setArtifactVersion(formatVersion(apiVersion));
        }
        if (apiDescription) {
            setArtifactDescription(apiDescription);
        }
        if (apiMainEndpoint) {
            setMainEndpoint(apiMainEndpoint);
        }
        if (apiSandboxEndpoint) {
            setSandboxEndpoint(apiSandboxEndpoint);
        }
    }, [apiTitle, apiVersion, apiDescription, apiMainEndpoint, apiSandboxEndpoint]);

    const handleRulesetToggle = useCallback((fileName: string) => {
        setEnabledRulesets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileName)) {
                newSet.delete(fileName);
            } else {
                newSet.add(fileName);
            }
            return newSet;
        });
    }, []);

    const handleNext = useCallback(() => {
        if (currentStep < 2) {
            setCurrentStep(currentStep + 1);
        }
    }, [currentStep]);

    const handleBack = useCallback(() => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    }, [currentStep]);

    const handleInitialize = useCallback(async () => {
        const selectedRulesets = availableRulesets.filter(r => enabledRulesets.has(r.fileName));
        
        await onInitialize({
            docsFolder,
            testsFolder,
            rulesets: selectedRulesets,
            enabledRulesets,
            artifactName,
            artifactVersion,
            artifactContext,
            artifactDescription,
            mainEndpoint,
            sandboxEndpoint
        });
    }, [
        docsFolder, testsFolder, enabledRulesets, availableRulesets,
        artifactName, artifactVersion, artifactContext, artifactDescription,
        mainEndpoint, sandboxEndpoint,
        onInitialize
    ]);

    const renderStep1 = () => (
        <FormSection>
            <FormGroup>
                <Label>Project Folders</Label>
                <InfoText>
                    Configure the folder structure for your API project. These folders will be created automatically.
                </InfoText>
            </FormGroup>

            <FormGrid>
                <FormGroup>
                    <Label>Documentation Folder</Label>
                    <TextField
                        value={docsFolder}
                        onChange={(e) => setDocsFolder(e.target.value)}
                        placeholder="docs"
                    />
                    <InfoText>Store API documentation and guides</InfoText>
                </FormGroup>

                <FormGroup>
                    <Label>Tests Folder</Label>
                    <TextField
                        value={testsFolder}
                        onChange={(e) => setTestsFolder(e.target.value)}
                        placeholder="tests"
                    />
                    <InfoText>Store API test files and configurations</InfoText>
                </FormGroup>
            </FormGrid>

            <FormGroup>
                <Label>Governance Rulesets</Label>
                <InfoText>
                    Select the Spectral rulesets to apply for API governance. You can add or modify these later.
                </InfoText>
                {isLoadingRulesets ? (
                    <InfoText>Loading rulesets...</InfoText>
                ) : (
                    <RulesetList>
                        {availableRulesets.length === 0 ? (
                            <InfoText>No rulesets found. Using default rulesets.</InfoText>
                        ) : (
                            availableRulesets.map((ruleset) => (
                                <ClickableRulesetItem 
                                    key={ruleset.fileName}
                                    onClick={() => handleRulesetToggle(ruleset.fileName)}
                                >
                                    <div onClick={(e) => e.stopPropagation()}>
                                    <CheckBox
                                        label=""
                                        checked={enabledRulesets.has(ruleset.fileName)}
                                        onChange={() => handleRulesetToggle(ruleset.fileName)}
                                    />
                                    </div>
                                    <RulesetInfo>
                                        <RulesetName>{ruleset.name}</RulesetName>
                                        <RulesetSource>{ruleset.fileName}</RulesetSource>
                                    </RulesetInfo>
                                </ClickableRulesetItem>
                            ))
                        )}
                    </RulesetList>
                )}
            </FormGroup>
        </FormSection>
    );

    const renderStep2 = () => (
        <FormSection>
            <FormGroup>
                <Label>Deployment Artifact Configuration</Label>
                <InfoText>
                    Configure the WSO2 deployment artifact for your API. This will be used when deploying to API Platform.
                </InfoText>
            </FormGroup>

            <FormGrid>
                <FormGroup>
                    <Label>API Name</Label>
                    <TextField
                        value={artifactName}
                        onChange={(e) => setArtifactName(e.target.value)}
                        placeholder="My API"
                    />
                </FormGroup>

                <FormGroup>
                    <Label>Version</Label>
                    <TextField
                        value={artifactVersion}
                        onChange={(e) => setArtifactVersion(e.target.value)}
                        placeholder="1.0.0"
                    />
                </FormGroup>
            </FormGrid>

            <FormGroup>
                <Label>Context Path</Label>
                <TextField
                    value={artifactContext}
                    onChange={(e) => setArtifactContext(e.target.value)}
                    placeholder="/my-api"
                />
                <InfoText>The base path for all API endpoints (e.g., /my-api)</InfoText>
            </FormGroup>

            <FormGroup>
                <Label>Main Endpoint *</Label>
                <TextField
                    value={mainEndpoint}
                    onChange={(e) => setMainEndpoint(e.target.value)}
                    placeholder="https://api.example.com"
                />
                <InfoText>Production endpoint URL (auto-populated from spec)</InfoText>
            </FormGroup>

            <FormGroup>
                <Label>Sandbox Endpoint</Label>
                <TextField
                    value={sandboxEndpoint}
                    onChange={(e) => setSandboxEndpoint(e.target.value)}
                    placeholder="https://sandbox.api.example.com (optional)"
                />
                <InfoText>Sandbox/testing endpoint URL</InfoText>
            </FormGroup>

            <FormGroup>
                <Label>Description</Label>
                <TextArea
                    value={artifactDescription}
                    onChange={(e) => setArtifactDescription(e.target.value)}
                    placeholder="Describe your API..."
                    rows={3}
                />
            </FormGroup>

            {/* Summary Preview */}
            <SummarySection>
                <SummaryCard>
                    <SummaryTitle>
                        <Codicon name="checklist" sx={{ fontSize: '16px' }} />
                        Configuration Summary
                    </SummaryTitle>
                    <SummaryItem>
                        <SummaryLabel>Documentation Folder</SummaryLabel>
                        <SummaryValue>{docsFolder || 'docs'}</SummaryValue>
                    </SummaryItem>
                    <SummaryItem>
                        <SummaryLabel>Tests Folder</SummaryLabel>
                        <SummaryValue>{testsFolder || 'tests'}</SummaryValue>
                    </SummaryItem>
                    <SummaryItem>
                        <SummaryLabel>Governance Rulesets</SummaryLabel>
                        <SummaryValue>{enabledRulesets.size} selected</SummaryValue>
                    </SummaryItem>
                    <SummaryItem>
                        <SummaryLabel>Deployment Context</SummaryLabel>
                        <SummaryValue>{artifactContext}</SummaryValue>
                    </SummaryItem>
                </SummaryCard>
            </SummarySection>
        </FormSection>
    );

    return (
        <WizardContainer>
            <WizardCard>
                <WizardHeader>
                    <WizardIcon>
                        <Codicon name="rocket" sx={{ fontSize: '20px' }} />
                    </WizardIcon>
                    <Typography variant="h2" sx={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--vscode-foreground)' }}>
                        Initialize API Project
                    </Typography>
                    <Typography variant="body2" sx={{ margin: 0, fontSize: 14, color: 'var(--vscode-descriptionForeground)', lineHeight: 1.6 }}>
                        {currentStep === 1 
                            ? 'Configure your project structure and governance settings'
                            : 'Set up your deployment artifact configuration'}
                    </Typography>
                </WizardHeader>

                <StepIndicator>
                    <StepDot active={currentStep === 1} completed={currentStep > 1}>
                        {currentStep > 1 ? <Codicon name="check" sx={{ fontSize: '14px' }} /> : '1'}
                    </StepDot>
                    <StepConnector completed={currentStep > 1} />
                    <StepDot active={currentStep === 2} completed={false}>
                        2
                    </StepDot>
                </StepIndicator>

                <StepLabel>
                    <StepLabelText active={currentStep === 1}>Project Config</StepLabelText>
                    <StepLabelText active={currentStep === 2}>Deployment</StepLabelText>
                </StepLabel>

                <StepContent>
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                </StepContent>

                <WizardFooter>
                    <FooterLeft>
                        {currentStep > 1 && (
                            <Button
                                appearance="secondary"
                                onClick={handleBack}
                                disabled={isInitializing}
                            >
                                <Codicon name="arrow-left" sx={{ fontSize: '14px', marginRight: 6 }} />
                                Back
                            </Button>
                        )}
                    </FooterLeft>
                    <FooterRight>
                        <Button
                            appearance="secondary"
                            onClick={onCancel}
                            disabled={isInitializing}
                        >
                            Cancel
                        </Button>
                        {currentStep < 2 ? (
                            <Button
                                appearance="primary"
                                onClick={handleNext}
                            >
                                Next
                                <Codicon name="arrow-right" sx={{ fontSize: '14px', marginLeft: 6 }} />
                            </Button>
                        ) : (
                            <Button
                                appearance="primary"
                                onClick={handleInitialize}
                                disabled={isInitializing || !artifactName || !artifactVersion || !mainEndpoint}
                            >
                                {isInitializing ? (
                                    <>
                                        <Codicon name="sync~spin" sx={{ fontSize: '14px', marginRight: 6 }} />
                                        Initializing...
                                    </>
                                ) : (
                                    <>
                                        <Codicon name="check" sx={{ fontSize: '14px', marginRight: 6 }} />
                                        Initialize Project
                                    </>
                                )}
                            </Button>
                        )}
                    </FooterRight>
                </WizardFooter>
            </WizardCard>
        </WizardContainer>
    );
};

