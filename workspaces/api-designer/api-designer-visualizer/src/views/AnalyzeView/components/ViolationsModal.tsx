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
import { keyframes } from '@emotion/react';
import styled from '@emotion/styled';
import { Button, Codicon } from '@wso2/ui-toolkit';
import { GovernanceViolation } from '@wso2/api-designer-core';
import { filterViolations, normalizeGovernanceViolation, NormalizedGovernanceViolation } from '../../../types/violations';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { useAIAvailability } from '../../../hooks/useAIAvailability';
import { AIButton } from '../../../components/ai/AIButton';

export interface ViolationsModalData {
    score: number;
    violations?: GovernanceViolation[];
    violationSummary?: {
        totalViolations: number;
        errorRules: number;
        warningRules: number;
        infoRules: number;
        hintRules: number;
        errorViolations: number;
        warningViolations: number;
        infoViolations: number;
        hintViolations: number;
    };
    passedChecks?: number;
    icon: string;
    badgeLabel: string;
    passed?: any;
}

export interface ViolationsModalProps {
    isOpen: boolean;
    rulesetName: string;
    data: ViolationsModalData;
    activeTab: 'error' | 'warn' | 'info' | 'passed';
    onTabChange: (tab: 'error' | 'warn' | 'info' | 'passed') => void;
    onClose: () => void;
    fileUri?: string;
    ruleset?: {
        fileUrl?: string;
        rulesetContentPath?: string;
    };
}

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

const IssuesStack = styled.div`
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

const ViolationCard = styled.div<{ $accent: string }>`
    padding: 12px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-left: 2px solid ${({ $accent }: { $accent: string }) => $accent};
    border-radius: 4px;
    font-size: 12px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
`;

const ViolationBody = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ViolationMessage = styled.div<{ $hasPath: boolean }>`
    color: var(--vscode-foreground);
    margin-bottom: ${({ $hasPath }: { $hasPath: boolean }) => ($hasPath ? 4 : 0)}px;
`;

const ViolationPath = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    font-family: var(--vscode-editor-font-family);
`;

const ViolationsEmpty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    gap: 12px;
`;

const ViolationsEmptyIcon = styled.div`
    font-size: 48px;
    opacity: 0.5;
`;

const ViolationsEmptyText = styled.div`
    font-size: 14px;
    line-height: 1.5;
`;

const openCopilotChat = (context: string, prompt: string) => {
    postVSCodeMessage({
        command: 'openCopilotChat',
        data: { context, prompt }
    });
};

export const ViolationsModal: React.FC<ViolationsModalProps> = ({
    isOpen,
    rulesetName,
    data,
    activeTab,
    onTabChange,
    onClose,
    fileUri,
    ruleset
}) => {
    const isAIAvailable = useAIAvailability();
    
    if (!isOpen) return null;

    const violationSummary = data.violationSummary || {
        totalViolations: data.violations?.length || 0,
        errorRules: 0,
        warningRules: 0,
        infoRules: 0,
        hintRules: 0,
        errorViolations: 0,
        warningViolations: 0,
        infoViolations: 0,
        hintViolations: 0
    };

    const computedViolationCounts = { error: 0, warn: 0, info: 0, hint: 0 };
    (data.violations || []).forEach((violation: GovernanceViolation) => {
        const severity = violation?.severity || 'info';
        if (severity === 'error') {
            computedViolationCounts.error += 1;
        } else if (severity === 'warn') {
            computedViolationCounts.warn += 1;
        } else if (severity === 'hint') {
            computedViolationCounts.hint += 1;
        } else {
            computedViolationCounts.info += 1;
        }
    });

    const errorViolationCount = violationSummary.errorViolations ?? computedViolationCounts.error;
    const warningViolationCount = violationSummary.warningViolations ?? computedViolationCounts.warn;
    const infoViolationCount = (violationSummary.infoViolations ?? computedViolationCounts.info)
        + (violationSummary.hintViolations ?? computedViolationCounts.hint);

    const normalizedViolations = (data.violations || []).map(normalizeGovernanceViolation);
    const filteredViolations = filterViolations(
        normalizedViolations,
        activeTab,
        data.passed ? (data.passed as GovernanceViolation[]).map(normalizeGovernanceViolation) : undefined
    ).sort((a: NormalizedGovernanceViolation, b: NormalizedGovernanceViolation) => (a.rule || '').localeCompare(b.rule || ''));

    return (
        <ModalOverlay onClick={onClose}>
            <ModalPanel onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>
                        <Codicon name="list-unordered" sx={{ fontSize: '16px' }} />
                        Violation Details - {data.icon} {rulesetName}
                    </ModalTitle>
                    <Button appearance="icon" onClick={onClose}>
                        <Codicon name="close" sx={{ fontSize: '16px' }} />
                    </Button>
                </ModalHeader>

                <TabBar>
                    {[
                        { key: 'error' as const, label: 'Errors', count: errorViolationCount, icon: 'error', color: '#ef4444' },
                        { key: 'warn' as const, label: 'Warnings', count: warningViolationCount, icon: 'warning', color: '#f59e0b' },
                        { key: 'info' as const, label: 'Info', count: infoViolationCount, icon: 'info', color: '#3b82f6' },
                        { key: 'passed' as const, label: 'Passed', count: data.passedChecks || 0, icon: 'check', color: '#10b981' }
                    ].map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <TabButton
                                key={tab.key}
                                type="button"
                                $active={isActive}
                                onClick={() => onTabChange(tab.key)}
                            >
                                <Codicon name={tab.icon} sx={{ fontSize: '14px', color: tab.color }} />
                                {tab.label}
                                <TabCount>{tab.count}</TabCount>
                            </TabButton>
                        );
                    })}
                </TabBar>

                <ModalBody>
                    {filteredViolations.length > 0 ? (
                        <IssuesStack>
                            {activeTab !== 'passed' && filteredViolations.length > 0 && (
                                <FixAllToolbar>
                                    <NoWrapAIButton
                                        isAvailable={isAIAvailable && !!fileUri && !!ruleset?.fileUrl && !!ruleset?.rulesetContentPath}
                                        onClick={() => {
                                            const severityType = activeTab === 'error' ? 'error' : activeTab === 'warn' ? 'warning' : 'info';
                                            const prompt = `Fix all ${severityType} violations in ${rulesetName} ruleset.

IMPORTANT: You must use the #validateWithSpectralRuleset MCP tool to discover and fix issues. Follow these steps:

1. call the validateWithSpectralRuleset tool with fileUri parameter pointing to the OpenAPI file, rulesetName: "${rulesetName}", fileUrl: "${ruleset.fileUrl}", and rulesetContentPath: "${ruleset.rulesetContentPath}" to discover all ${severityType} violations
2. After fixing the issue, call validateWithSpectralRuleset again to verify the fix and discover remaining violations
3. Continue this process until validateWithSpectralRuleset reports no ${severityType} violations
`;

                                            openCopilotChat(
                                                JSON.stringify({
                                                    fileUri: fileUri,
                                                    rulesetName: rulesetName,
                                                    fileUrl: ruleset.fileUrl,
                                                    rulesetContentPath: ruleset.rulesetContentPath,
                                                    fixMode: 'iterative',
                                                    issueType: severityType
                                                }),
                                                prompt
                                            );
                                        }}
                                        title="Fix All with AI"
                                        label="Fix All with AI"
                                    />
                                </FixAllToolbar>
                            )}
                            {filteredViolations.map((violation: NormalizedGovernanceViolation, idx: number) => {
                                const severityColors: Record<string, string> = {
                                    error: '#ef4444',
                                    warn: '#f59e0b',
                                    warning: '#f59e0b',
                                    info: '#3b82f6',
                                    hint: '#8b5cf6',
                                    passed: '#10b981'
                                };
                                const severity = violation.severity || (activeTab === 'passed' ? 'passed' : activeTab);
                                const borderColor = severityColors[severity] || severityColors[activeTab] || severityColors.info;

                                const pathStr =
                                    violation.pathSegments && violation.pathSegments.length > 0
                                        ? ` at /${violation.pathSegments.join('/')}`
                                        : '';
                                return (
                                    <ViolationCard key={idx} $accent={borderColor}>
                                        <ViolationBody>
                                            <ViolationMessage $hasPath={!!pathStr}>
                                                {violation.message || 'No message provided'}
                                            </ViolationMessage>
                                            {pathStr && <ViolationPath>{pathStr}</ViolationPath>}
                                        </ViolationBody>
                                        {violation.pathSegments && violation.pathSegments.length > 0 && (
                                            <NoWrapShrinkAIButton
                                                onClick={() => {
                                                    const p =
                                                        violation.pathSegments && violation.pathSegments.length > 0
                                                            ? ` at /${violation.pathSegments.join('/')}`
                                                            : '';
                                                    openCopilotChat(
                                                        JSON.stringify(violation),
                                                        `Fix ${rulesetName} violation: ${violation.message || ''}${p}`
                                                    );
                                                }}
                                                title="Fix with AI"
                                                label="Fix with AI"
                                            />
                                        )}
                                    </ViolationCard>
                                );
                            })}
                        </IssuesStack>
                    ) : (
                        <ViolationsEmpty>
                            <ViolationsEmptyIcon>
                                {activeTab === 'passed' ? '✓' : 'ℹ️'}
                            </ViolationsEmptyIcon>
                            <ViolationsEmptyText>
                                {activeTab === 'passed'
                                    ? 'No passed checks to display'
                                    : `No ${activeTab} violations found`}
                            </ViolationsEmptyText>
                        </ViolationsEmpty>
                    )}
                </ModalBody>
            </ModalPanel>
        </ModalOverlay>
    );
};

