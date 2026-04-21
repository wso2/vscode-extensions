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

import React, { useState } from 'react';
import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { Button, Codicon, Typography } from '@wso2/ui-toolkit';
import { postMessage as postVSCodeMessage } from '../../utils/vscode-api';
import { useAIAvailability } from '../../hooks/useAIAvailability';
import { AIButton } from '../ai/AIButton';
import { ApiSpecType, buildFixValidationIssuesPrompt } from '@wso2/api-designer-core';

export interface ValidationIssue {
    path: string[];
    message: string;
}

export interface ValidationData {
    errorCount?: number;
    warningCount?: number;
    errors?: ValidationIssue[];
    warnings?: ValidationIssue[];
}

interface ValidationIssuesModalProps {
    isOpen: boolean;
    onClose: () => void;
    validationData: ValidationData | null;
    activeTab?: 'error' | 'warning';
    onTabChange?: (tab: 'error' | 'warning') => void;
    fileUri?: string;
    specType?: 'openapi' | 'asyncapi';
}

const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: 70vh;
    overflow-y: auto;
`;

const IssuesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const IssueCard = styled.div<{ severity: 'error' | 'warning' }>`
    padding: 12px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-left: 2px solid ${(props: { severity: 'error' | 'warning' }) => props.severity === 'error' ? '#ef4444' : '#f59e0b'};
    border-radius: 4px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
`;

const IssueContent = styled.div`
    flex: 1;
    min-width: 0;
`;

const IssueMessage = styled.div`
    color: var(--vscode-foreground);
    margin-bottom: 4px;
    font-size: 12px;
    line-height: 1.5;
`;

const IssuePath = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    font-family: var(--vscode-editor-font-family);
    word-break: break-all;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
`;

const SectionTitle = styled.div<{ color?: string }>`
    font-size: 13px;
    font-weight: 600;
    color: ${(props: { color?: string }) => props.color || 'var(--vscode-foreground)'};
`;

const EmptyState = styled.div`
    padding: 32px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
`;

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

const slideUp = keyframes`
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
`;

const ModalOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 20px;
    animation: ${fadeIn} 0.15s ease;
`;

const ModalPanel = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    max-width: 90vw;
    max-height: 85vh;
    height: 85vh;
    width: 1000px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    animation: ${slideUp} 0.2s ease;
`;

const ModalHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-sideBar-background);
    flex-shrink: 0;
`;

const ModalTitle = styled.h3`
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: var(--vscode-foreground);
    display: flex;
    align-items: center;
    gap: 8px;
`;

const TabBar = styled.div`
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-left: 16px;
    flex-shrink: 0;
    background: var(--vscode-editor-background);
`;

const TabButton = styled.button<{ $active: boolean }>`
    background: none;
    border: none;
    padding: 12px 16px;
    cursor: pointer;
    font-size: 13px;
    color: ${({ $active }: { $active: boolean }) =>
        $active ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)'};
    border-bottom: ${({ $active }: { $active: boolean }) =>
        $active ? '2px solid var(--vscode-focusBorder)' : '2px solid transparent'};
    transition: all 0.2s ease;
    font-weight: ${({ $active }: { $active: boolean }) => ($active ? 600 : 400)};
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
`;

const TabCount = styled.span`
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    min-width: 18px;
    text-align: center;
`;

const ModalBody = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    min-height: 0;
`;

const IssuesToolbarWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const FixAllToolbar = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const NoWrapAIButton = styled(AIButton)`
    white-space: nowrap;
`;

const NoWrapShrinkAIButton = styled(AIButton)`
    white-space: nowrap;
    flex-shrink: 0;
`;

export const ValidationIssuesModal: React.FC<ValidationIssuesModalProps> = ({
    isOpen,
    onClose,
    validationData,
    activeTab: propActiveTab,
    onTabChange: propOnTabChange,
    fileUri,
    specType = 'openapi'
}) => {
    const isAIAvailable = useAIAvailability();
    const [activeTab, setActiveTab] = useState<'error' | 'warning'>(propActiveTab || 'error');
    const errors = validationData?.errors || [];
    const warnings = validationData?.warnings || [];
    const errorCount = validationData?.errorCount || 0;
    const warningCount = validationData?.warningCount || 0;

    const handleTabChange = (tab: 'error' | 'warning') => {
        setActiveTab(tab);
        if (propOnTabChange) {
            propOnTabChange(tab);
        }
    };

    const currentIssues = activeTab === 'error' ? errors : warnings;
    const currentCount = activeTab === 'error' ? errorCount : warningCount;

    const handleFixAll = () => {
        if (currentIssues.length > 0 && fileUri) {
            const specTypeName = specType === 'asyncapi' ? 'AsyncAPI' : 'OpenAPI';
            
            const detectedSpecType = specType === 'asyncapi' ? ApiSpecType.ASYNCAPI : ApiSpecType.OPENAPI;
            
            // Convert ValidationIssue format
            const issues = currentIssues.map(issue => ({
                message: issue.message,
                path: issue.path
            }));
            
            // Build prompt using centralized prompt builder
            let prompt = buildFixValidationIssuesPrompt({
                specType: detectedSpecType,
                issueType: activeTab,
                count: currentCount,
                issues: issues
            });
            
            // Add MCP tool instructions
            prompt += `\n\nIMPORTANT: You must use the #validateAPISpec MCP tool to discover and fix issues. Follow these steps:

1. Call the validateAPISpec tool with fileUri parameter pointing to the ${specTypeName} file to discover all validation ${activeTab}s
2. After fixing the issue, call validateAPISpec again to verify the fix and discover remaining ${activeTab}s
3. Continue this process until validateAPISpec reports no issues

Note: The validation tool works for both OpenAPI and AsyncAPI specifications automatically.`;
            
            postVSCodeMessage({
                command: 'openAIChat',
                data: {
                    context: JSON.stringify({
                        fileUri: fileUri,
                        specType: specType,
                        fixMode: 'iterative',
                        issueType: activeTab
                    }),
                    prompt: prompt
                }
            });
        }
    };

    const handleFixIndividual = (issue: ValidationIssue) => {
        const specTypeName = specType === 'asyncapi' ? 'AsyncAPI' : 'OpenAPI';
        const pathStr = Array.isArray(issue.path) && issue.path.length > 0 
            ? ` at /${issue.path.join('/')}` 
            : '';
        const issueMessage = `${issue.message}${pathStr}`;
        
        postVSCodeMessage({
            command: 'openCopilotChat',
            data: {
                context: JSON.stringify({
                    validationIssues: [issue],
                    specType: specType,
                    fileUri: fileUri
                }),
                prompt: `Fix this ${activeTab} in the ${specTypeName} specification:\n\n${issueMessage}`
            }
        });
    };

    if (!isOpen) {
        return null;
    }

    return (
        <>
            <ModalOverlay onClick={onClose}>
                <ModalPanel onClick={(e) => e.stopPropagation()}>
                    <ModalHeader>
                        <ModalTitle>
                            <Codicon name="list-unordered" sx={{ fontSize: '16px' }} />
                            Validation Issues
                        </ModalTitle>
                        <Button appearance="icon" onClick={onClose}>
                            <Codicon name="close" sx={{ fontSize: '16px' }} />
                        </Button>
                    </ModalHeader>

                    <TabBar>
                        {[
                            { key: 'error' as const, label: 'Errors', count: errorCount, icon: 'error', color: '#ef4444' },
                            { key: 'warning' as const, label: 'Warnings', count: warningCount, icon: 'warning', color: '#f59e0b' }
                        ].map((tab) => {
                            const isActive = activeTab === tab.key;
                            return (
                                <TabButton
                                    key={tab.key}
                                    type="button"
                                    $active={isActive}
                                    onClick={() => handleTabChange(tab.key)}
                                >
                                    <Codicon name={tab.icon} sx={{ fontSize: '14px', color: tab.color }} />
                                    {tab.label}
                                    <TabCount>{tab.count}</TabCount>
                                </TabButton>
                            );
                        })}
                    </TabBar>

                    <ModalBody>
                        {currentIssues.length > 0 ? (
                            <IssuesToolbarWrap>
                                <FixAllToolbar>
                                    <NoWrapAIButton
                                        onClick={() => {
                                            handleFixAll();
                                        }}
                                        title="Fix All with AI"
                                        label="Fix All with AI"
                                    />
                                </FixAllToolbar>
                                <IssuesList>
                                    {currentIssues.map((issue, idx) => {
                                        const pathStr =
                                            Array.isArray(issue.path) && issue.path.length > 0
                                                ? `/${issue.path.join('/')}`
                                                : '';
                                        return (
                                            <IssueCard key={idx} severity={activeTab}>
                                                <IssueContent>
                                                    <IssueMessage>{issue.message}</IssueMessage>
                                                    {pathStr && <IssuePath>{pathStr}</IssuePath>}
                                                </IssueContent>
                                                <NoWrapShrinkAIButton
                                                    onClick={() => {
                                                        handleFixIndividual(issue);
                                                    }}
                                                    title="Fix with AI"
                                                    label="Fix with AI"
                                                />
                                            </IssueCard>
                                        );
                                    })}
                                </IssuesList>
                            </IssuesToolbarWrap>
                        ) : (
                            <EmptyState>
                                No {activeTab === 'error' ? 'errors' : 'warnings'} found.
                            </EmptyState>
                        )}
                    </ModalBody>
                </ModalPanel>
            </ModalOverlay>
        </>
    );
};

