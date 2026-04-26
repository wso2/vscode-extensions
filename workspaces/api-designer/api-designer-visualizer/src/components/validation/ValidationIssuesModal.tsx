/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { Button, Codicon } from '@wso2/ui-toolkit';
import { postMessage as postVSCodeMessage } from '../../utils/vscode-api';
import { useAIAvailability } from '../../hooks/useAIAvailability';
import { AIButton } from '../ai/AIButton';
import { ApiSpecType, buildFixValidationIssuesPrompt } from '@wso2/api-designer-core';
import type { ValidationData, ValidationIssuePathItem } from '../../views/DesignView/components/api-header/MetricsOverview';

/** @deprecated Use ValidationIssuePathItem from MetricsOverview — kept for external imports */
export type ValidationIssue = ValidationIssuePathItem;
export type { ValidationData };

function extractSpecSnippetLines(
    content: string,
    range: { start: { line: number }; end: { line: number } },
    ctx = 3
): Array<{ lineNumber: number; text: string; highlight: boolean }> {
    const lines = content.split('\n');
    const from = Math.max(0, range.start.line - ctx);
    const to = Math.min(lines.length - 1, range.end.line + ctx);
    return lines.slice(from, to + 1).map((text, i) => ({
        lineNumber: from + i + 1,
        text,
        highlight: from + i >= range.start.line && from + i <= range.end.line,
    }));
}

interface ValidationIssuesModalProps {
    isOpen: boolean;
    onClose: () => void;
    validationData: ValidationData | null;
    activeTab?: 'error' | 'warning';
    onTabChange?: (tab: 'error' | 'warning') => void;
    fileUri?: string;
    specType?: 'openapi';
}

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
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
    flex-wrap: nowrap;
    gap: 0;
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-left: 16px;
    flex-shrink: 0;
    min-width: 0;
    background: var(--vscode-editor-background);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
        height: 6px;
    }
    &::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
        border-radius: 3px;
    }
`;

const TabButton = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
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
    display: flex;
    flex-direction: column;
    padding: 20px;
    min-height: 0;
    overflow: hidden;
`;

const SplitBody = styled.div`
    display: flex;
    flex: 1;
    min-height: 0;
    gap: 12px;
    overflow: hidden;
`;

const IssuesPane = styled.div`
    flex: 0 0 40%;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
`;

const IssuesStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    width: 100%;
`;

const FixAllToolbar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    min-width: 0;
`;

const IssuesListTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: var(--vscode-foreground);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const NoWrapAIButton = styled(AIButton)`
    white-space: nowrap;
`;

const NoWrapShrinkAIButton = styled(AIButton)`
    white-space: nowrap;
    flex-shrink: 0;
`;

const IssueCard = styled.div<{ $accent: string; $selected: boolean }>`
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 12px;
    background: ${({ $selected }: { $selected: boolean }) =>
        $selected ? 'var(--vscode-list-activeSelectionBackground)' : 'var(--vscode-editor-background)'};
    border: 1px solid var(--vscode-panel-border);
    border-left: 2px solid ${({ $accent }: { $accent: string }) => $accent};
    border-radius: 4px;
    font-size: 12px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;

    &:hover {
        border-color: var(--vscode-focusBorder);
    }
`;

const IssueBody = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const IssueMessage = styled.div`
    color: var(--vscode-foreground);
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
    line-height: 1.5;
`;

const IssuePath = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    font-family: var(--vscode-editor-font-family);
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
`;

const DetailPane = styled.div`
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    background: var(--vscode-editor-background);
    padding: 14px;
`;

const DetailPaneHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const DetailPaneTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const DetailSection = styled.div`
    margin-bottom: 14px;
`;

const DetailLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 6px;
`;

const DetailText = styled.div`
    font-size: 12px;
    color: var(--vscode-foreground);
    line-height: 1.5;
    overflow-wrap: anywhere;
    word-break: break-word;
`;

const DetailMeta = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family);
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 8px 10px;
    overflow-wrap: anywhere;
    word-break: break-word;
`;

const YamlBlock = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: auto;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    max-height: 220px;
`;

const YamlLine = styled.div<{ $highlight: boolean }>`
    display: flex;
    background: ${({ $highlight }: { $highlight: boolean }) =>
        $highlight ? 'rgba(239,68,68,0.12)' : 'transparent'};
    padding: 1px 0;
`;

const YamlLineNum = styled.span`
    flex: 0 0 36px;
    text-align: right;
    padding-right: 10px;
    color: var(--vscode-editorLineNumber-foreground);
    user-select: none;
    border-right: 1px solid var(--vscode-panel-border);
    margin-right: 10px;
`;

const YamlLineText = styled.span`
    white-space: pre;
    color: var(--vscode-editor-foreground);
`;

const DetailEmpty = styled.div`
    flex: 1;
    min-width: 0;
    min-height: 0;
    border: 1px dashed var(--vscode-panel-border);
    border-radius: 8px;
    background: var(--vscode-editor-background);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    text-align: center;
    padding: 16px;
`;

const EmptyState = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 14px;
    line-height: 1.5;
`;

const SEVERITY_COLOR: Record<'error' | 'warning', string> = {
    error: '#ef4444',
    warning: '#f59e0b',
};

export const ValidationIssuesModal: React.FC<ValidationIssuesModalProps> = ({
    isOpen,
    onClose,
    validationData,
    activeTab: propActiveTab,
    onTabChange: propOnTabChange,
    fileUri,
    specType = 'openapi',
}) => {
    const isAIAvailable = useAIAvailability();
    const [activeTab, setActiveTab] = useState<'error' | 'warning'>(propActiveTab || 'error');
    const [selectedIssueIndex, setSelectedIssueIndex] = useState<number | null>(null);

    const errors = validationData?.errors || [];
    const warnings = validationData?.warnings || [];
    const errorCount = validationData?.errorCount || 0;
    const warningCount = validationData?.warningCount || 0;

    useEffect(() => {
        if (propActiveTab) {
            setActiveTab(propActiveTab);
        }
    }, [propActiveTab]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedIssueIndex(null);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedIssueIndex(null);
    }, [activeTab]);

    const handleTabChange = (tab: 'error' | 'warning') => {
        setActiveTab(tab);
        propOnTabChange?.(tab);
    };

    const currentIssues = activeTab === 'error' ? errors : warnings;
    const currentCount = activeTab === 'error' ? errorCount : warningCount;
    const selectedIssue =
        selectedIssueIndex !== null && currentIssues[selectedIssueIndex] !== undefined
            ? currentIssues[selectedIssueIndex]
            : null;
    const accentColor = activeTab === 'error' ? SEVERITY_COLOR.error : SEVERITY_COLOR.warning;

    const snippetLines = useMemo(() => {
        const specText = validationData?.specContent;
        if (selectedIssueIndex === null || !validationData) {
            return null;
        }
        const list = activeTab === 'error' ? validationData.errors ?? [] : validationData.warnings ?? [];
        const issue = list[selectedIssueIndex];
        const range = issue?.range;
        if (!specText || !range) {
            return null;
        }
        return extractSpecSnippetLines(specText, range);
    }, [validationData, selectedIssueIndex, activeTab]);

    const handleFixAll = () => {
        if (currentIssues.length > 0 && fileUri) {
            const specTypeName = 'OpenAPI';
            const detectedSpecType = ApiSpecType.OPENAPI;
            const issues = currentIssues.map(issue => ({
                message: issue.message,
                path: issue.path,
            }));

            let prompt = buildFixValidationIssuesPrompt({
                specType: detectedSpecType,
                issueType: activeTab,
                count: currentCount,
                issues,
            });

            prompt += `\n\nIMPORTANT: You must use the #validateApiSpec MCP tool to discover and fix issues. Follow these steps:

1. Call the validateApiSpec tool with fileUri parameter pointing to the ${specTypeName} file to discover all validation ${activeTab}s
2. After fixing the issue, call validateApiSpec again to verify the fix and discover remaining ${activeTab}s
3. Continue this process until validateApiSpec reports no issues

Note: The validation tool validates OpenAPI specifications automatically.`;

            postVSCodeMessage({
                command: 'openAIChat',
                data: {
                    context: JSON.stringify({
                        fileUri,
                        specType,
                        fixMode: 'iterative',
                        issueType: activeTab,
                    }),
                    prompt,
                },
            });
        }
    };

    const handleFixIndividual = (issue: ValidationIssuePathItem) => {
        const specTypeName = 'OpenAPI';
        const pathStr =
            Array.isArray(issue.path) && issue.path.length > 0 ? ` at /${issue.path.join('/')}` : '';
        const issueMessage = `${issue.message}${pathStr}`;

        postVSCodeMessage({
            command: 'openCopilotChat',
            data: {
                context: JSON.stringify({
                    validationIssues: [issue],
                    specType,
                    fileUri,
                }),
                prompt: `Fix this ${activeTab} in the ${specTypeName} specification:\n\n${issueMessage}`,
            },
        });
    };

    if (!isOpen) {
        return null;
    }

    return (
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
                    {(
                        [
                            { key: 'error' as const, label: 'Errors', count: errorCount, icon: 'error', color: '#ef4444' },
                            {
                                key: 'warning' as const,
                                label: 'Warnings',
                                count: warningCount,
                                icon: 'warning',
                                color: '#f59e0b',
                            },
                        ] as const
                    ).map(tab => {
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
                        <SplitBody>
                            <IssuesPane>
                                <IssuesStack>
                                    <FixAllToolbar>
                                        <IssuesListTitle>Issues</IssuesListTitle>
                                        <NoWrapAIButton
                                            isAvailable={isAIAvailable && !!fileUri}
                                            onClick={() => {
                                                handleFixAll();
                                            }}
                                            title="Fix All with AI"
                                            label="Fix All with AI"
                                        />
                                    </FixAllToolbar>
                                    {currentIssues.map((issue, idx) => {
                                        const pathStr =
                                            Array.isArray(issue.path) && issue.path.length > 0
                                                ? `/${issue.path.join('/')}`
                                                : '';
                                        return (
                                            <IssueCard
                                                key={idx}
                                                $accent={accentColor}
                                                $selected={selectedIssueIndex === idx}
                                                onClick={() =>
                                                    setSelectedIssueIndex(
                                                        selectedIssueIndex === idx ? null : idx
                                                    )
                                                }
                                            >
                                                <IssueBody>
                                                    <IssueMessage>{issue.message}</IssueMessage>
                                                    {pathStr ? <IssuePath>{pathStr}</IssuePath> : null}
                                                </IssueBody>
                                            </IssueCard>
                                        );
                                    })}
                                </IssuesStack>
                            </IssuesPane>
                            {selectedIssue ? (
                                <DetailPane>
                                    <DetailPaneHeader>
                                        <DetailPaneTitle>Issue details</DetailPaneTitle>
                                        <NoWrapShrinkAIButton
                                            isAvailable={isAIAvailable && !!fileUri}
                                            onClick={() => {
                                                handleFixIndividual(selectedIssue);
                                            }}
                                            title="Fix with AI"
                                            label="Fix with AI"
                                        />
                                    </DetailPaneHeader>
                                    <DetailSection>
                                        <DetailLabel>Severity</DetailLabel>
                                        <DetailText style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                                            {activeTab}
                                        </DetailText>
                                    </DetailSection>
                                    <DetailSection>
                                        <DetailLabel>Message</DetailLabel>
                                        <DetailText>{selectedIssue.message}</DetailText>
                                    </DetailSection>
                                    <DetailSection>
                                        <DetailLabel>Location</DetailLabel>
                                        <DetailMeta>
                                            {Array.isArray(selectedIssue.path) && selectedIssue.path.length > 0
                                                ? `/${selectedIssue.path.join('/')}`
                                                : '/'}
                                        </DetailMeta>
                                    </DetailSection>
                                    {snippetLines && snippetLines.length > 0 && (
                                        <DetailSection>
                                            <DetailLabel>Spec snippet</DetailLabel>
                                            <YamlBlock>
                                                {snippetLines.map(({ lineNumber, text, highlight }) => (
                                                    <YamlLine key={lineNumber} $highlight={highlight}>
                                                        <YamlLineNum>{lineNumber}</YamlLineNum>
                                                        <YamlLineText>{text}</YamlLineText>
                                                    </YamlLine>
                                                ))}
                                            </YamlBlock>
                                        </DetailSection>
                                    )}
                                </DetailPane>
                            ) : (
                                <DetailEmpty>Select an issue to view details</DetailEmpty>
                            )}
                        </SplitBody>
                    ) : (
                        <EmptyState>No {activeTab === 'error' ? 'errors' : 'warnings'} found.</EmptyState>
                    )}
                </ModalBody>
            </ModalPanel>
        </ModalOverlay>
    );
};
