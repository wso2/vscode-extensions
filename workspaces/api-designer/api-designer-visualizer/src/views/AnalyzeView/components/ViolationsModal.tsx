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
    activeTab: 'overview' | 'error' | 'warn' | 'info' | 'passed';
    onTabChange: (tab: 'overview' | 'error' | 'warn' | 'info' | 'passed') => void;
    onClose: () => void;
    specContent?: string;
    fileUri?: string;
    ruleset?: {
        fileUrl?: string;
        rulesetContentPath?: string;
    };
}

function extractYamlLines(
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
        highlight: from + i >= range.start.line && from + i <= range.end.line
    }));
}

const extractRuleFamily = (rule?: string): string | null => {
    if (!rule) return null;
    const normalized = rule.replace(/^@/, '');
    const match = normalized.match(/^([a-z0-9]+)(?=[:\-_])/i);
    return match ? match[1].toLowerCase() : null;
};

const extractOwaspCategory = (rule?: string): string | null => {
    if (!rule) return null;
    const match = rule.match(/owasp[:\-_](api\d+)/i);
    return match ? match[1].toUpperCase() : null;
};

const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
};

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
    padding: 20px;
    min-height: 0;
    overflow: hidden;
`;

const OverviewLayout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    overflow-y: auto;
    padding-right: 4px;
`;

const ReportSection = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    background: var(--vscode-editor-background);
    padding: 12px;
`;

const SectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
`;

const SectionTitle = styled.div`
    font-size: 12px;
    font-weight: 700;
    color: var(--vscode-foreground);
    text-transform: uppercase;
    letter-spacing: 0.45px;
`;

const SectionSubtitle = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const HealthRow = styled.div`
    display: flex;
    gap: 16px;
    align-items: stretch;
`;

const ScoreBlock = styled.div`
    flex: 0 0 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 20px;
    gap: 4px;
`;

const BigScoreNum = styled.div<{ $color: string }>`
    font-size: 52px;
    font-weight: 800;
    line-height: 1;
    color: ${({ $color }: { $color: string }) => $color};
    display: flex;
    align-items: baseline;
`;

const ScoreSuffix = styled.span`
    font-size: 26px;
    font-weight: 600;
    margin-left: 2px;
`;

const ScoreCaptionLabel = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-weight: 500;
    margin-top: 4px;
`;

const ScorePassLine = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-top: 8px;
`;

const PassRatePill = styled.span<{ $good: boolean }>`
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    background: ${({ $good }: { $good: boolean }) => $good ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'};
    color: ${({ $good }: { $good: boolean }) => $good ? '#10b981' : '#f59e0b'};
    margin-top: 4px;
`;

const SeverityBlock = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 16px 20px;
`;

const SeverityBlockTitle = styled.div`
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.45px;
    color: var(--vscode-foreground);
`;

const SeverityStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const SeverityTrack = styled.div`
    display: flex;
    width: 100%;
    height: 10px;
    overflow: hidden;
    border-radius: 999px;
    border: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editorWidget-background);
`;

const SeveritySegment = styled.div<{ $width: number; $color: string }>`
    width: ${({ $width }: { $width: number }) => `${$width}%`};
    min-width: ${({ $width }: { $width: number }) => ($width > 0 ? '2px' : '0')};
    background: ${({ $color }: { $color: string }) => $color};
`;

const SeverityLegendStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const AllPassedText = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #10b981;
`;

const LegendItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--vscode-foreground);
`;

const LegendDot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 999px;
    flex-shrink: 0;
    background: ${({ $color }: { $color: string }) => $color};
`;

const HotspotGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(260px, 1fr));
    gap: 10px;
`;

const HotspotCard = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 10px;
    background: var(--vscode-editorWidget-background);
`;

const HotspotTitle = styled.div`
    font-size: 11px;
    font-weight: 700;
    color: var(--vscode-foreground);
    margin-bottom: 8px;
`;

const HotspotList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const HotspotItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const HotspotRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
`;

const HotspotName = styled.div`
    font-size: 11px;
    color: var(--vscode-foreground);
    font-family: var(--vscode-editor-font-family);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const HotspotCount = styled.div`
    font-size: 11px;
    font-weight: 700;
    color: var(--vscode-descriptionForeground);
`;

const MiniBarTrack = styled.div`
    width: 100%;
    height: 4px;
    border-radius: 999px;
    background: var(--vscode-input-background);
    overflow: hidden;
`;

const MiniBarFill = styled.div<{ $width: number; $color: string }>`
    height: 100%;
    width: ${({ $width }: { $width: number }) => `${$width}%`};
    background: ${({ $color }: { $color: string }) => $color};
`;

const InsightCallout = styled.div`
    border: 1px solid var(--vscode-focusBorder);
    border-radius: 8px;
    padding: 12px;
    background: color-mix(in srgb, var(--vscode-focusBorder) 10%, transparent);
`;

const InsightText = styled.div`
    font-size: 12px;
    color: var(--vscode-foreground);
    margin-bottom: 8px;
`;

const QuickActions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const NavButton = styled.button<{ $color: string }>`
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${({ $color }: { $color: string }) => `${$color}55`};
    border-radius: 6px;
    background: ${({ $color }: { $color: string }) => `${$color}14`};
    color: ${({ $color }: { $color: string }) => $color};
    font-size: 11px;
    font-weight: 600;
    padding: 5px 10px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
        background: ${({ $color }: { $color: string }) => `${$color}28`};
        border-color: ${({ $color }: { $color: string }) => $color};
    }
`;

const NavButtonCount = styled.span`
    font-size: 10px;
    font-weight: 700;
    opacity: 0.75;
`;

const SplitBody = styled.div`
    display: flex;
    height: 100%;
    min-height: 0;
    gap: 12px;
`;

const IssuesPane = styled.div`
    flex: 0 0 40%;
    min-width: 0;
    overflow-y: auto;
`;

const IssuesStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const DetailPane = styled.div`
    flex: 1;
    min-width: 0;
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

const DetailHeaderRow = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 14px;
`;

const DetailHeaderContent = styled.div`
    min-width: 0;
    flex: 1;
`;

const DetailEmpty = styled.div`
    flex: 1;
    min-width: 0;
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

const DetailRuleTitle = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: var(--vscode-foreground);
    font-family: var(--vscode-editor-font-family);
    word-break: break-word;
`;

const RuleFamilyChip = styled.span`
    font-size: 9px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
    text-transform: uppercase;
    margin-left: 8px;
`;

const DetailText = styled.div`
    font-size: 12px;
    color: var(--vscode-foreground);
    line-height: 1.5;
`;

const SeverityBadge = styled.span<{ $color: string }>`
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
    background: ${({ $color }: { $color: string }) => `${$color}1a`};
    color: ${({ $color }: { $color: string }) => $color};
    text-transform: uppercase;
`;

const DetailMeta = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family);
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 8px 10px;
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
    background: ${({ $highlight }: { $highlight: boolean }) => ($highlight ? 'rgba(239,68,68,0.12)' : 'transparent')};
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

const FixAllToolbar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const ViolationsListTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const NoWrapAIButton = styled(AIButton)`
    white-space: nowrap;
`;

const NoWrapShrinkAIButton = styled(AIButton)`
    white-space: nowrap;
    flex-shrink: 0;
`;

const ViolationCard = styled.div<{ $accent: string; $selected: boolean }>`
    padding: 12px;
    background: ${({ $selected }: { $selected: boolean }) =>
        $selected ? 'var(--vscode-list-activeSelectionBackground)' : 'var(--vscode-editor-background)'};
    border: 1px solid var(--vscode-panel-border);
    border-left: 2px solid ${({ $accent }: { $accent: string }) => $accent};
    border-radius: 4px;
    font-size: 12px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;

    &:hover {
        border-color: var(--vscode-focusBorder);
    }
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
    specContent,
    fileUri,
    ruleset
}) => {
    const isAIAvailable = useAIAvailability();
    const [selectedViolationIndex, setSelectedViolationIndex] = React.useState<number | null>(null);
    
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
    const rulesViolatedCount = new Set(
        normalizedViolations
            .map((violation) => violation?.rule)
            .filter((rule): rule is string => Boolean(rule))
    ).size;
    const filteredViolations = activeTab === 'overview'
        ? []
        : filterViolations(
            normalizedViolations,
            activeTab,
            data.passed ? (data.passed as GovernanceViolation[]).map(normalizeGovernanceViolation) : undefined
        ).sort((a: NormalizedGovernanceViolation, b: NormalizedGovernanceViolation) => (a.rule || '').localeCompare(b.rule || ''));
    const totalViolationCount = errorViolationCount + warningViolationCount + infoViolationCount;
    const severityDistribution = {
        error: totalViolationCount > 0 ? (errorViolationCount / totalViolationCount) * 100 : 0,
        warning: totalViolationCount > 0 ? (warningViolationCount / totalViolationCount) * 100 : 0,
        info: totalViolationCount > 0 ? (infoViolationCount / totalViolationCount) * 100 : 0
    };
    const endpointCounts = normalizedViolations.reduce((acc, violation) => {
        const endpoint = violation.pathSegments?.[0] === 'paths' ? violation.pathSegments?.[1] : undefined;
        if (endpoint) {
            acc.set(endpoint, (acc.get(endpoint) || 0) + 1);
        }
        return acc;
    }, new Map<string, number>());
    const topEndpoints = Array.from(endpointCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const maxEndpointCount = topEndpoints[0]?.[1] || 1;
    const ruleCounts = normalizedViolations.reduce((acc, violation) => {
        const rule = violation.rule || 'unknown-rule';
        acc.set(rule, (acc.get(rule) || 0) + 1);
        return acc;
    }, new Map<string, number>());
    const topRules = Array.from(ruleCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    const maxRuleCount = topRules[0]?.[1] || 1;
    const passedCheckCount = data.passedChecks || 0;
    const failedRuleCount = rulesViolatedCount;
    const totalRules = passedCheckCount + failedRuleCount;
    const passRate = totalRules > 0 ? Math.round((passedCheckCount / totalRules) * 100) : 0;

    React.useEffect(() => {
        if (activeTab === 'overview') {
            setSelectedViolationIndex(null);
            return;
        }

        if (filteredViolations.length > 0) {
            setSelectedViolationIndex(0);
            return;
        }

        setSelectedViolationIndex(null);
    }, [activeTab, rulesetName, filteredViolations.length]);

    const selectedViolation =
        selectedViolationIndex !== null ? filteredViolations[selectedViolationIndex] : null;
    const selectedRuleFamily = selectedViolation ? extractRuleFamily(selectedViolation.rule) : null;
    const yamlLines = React.useMemo(() => {
        if (!specContent || !selectedViolation?.range) return null;
        return extractYamlLines(specContent, selectedViolation.range);
    }, [specContent, selectedViolation]);

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
                        { key: 'overview' as const, label: 'Overview', count: violationSummary.totalViolations || 0, icon: 'dashboard', color: '#8b5cf6' },
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
                    {activeTab === 'overview' ? (
                        <OverviewLayout>
                            <HealthRow>
                                <ScoreBlock>
                                    <BigScoreNum $color={getScoreColor(data.score)}>
                                        {data.score}<ScoreSuffix>%</ScoreSuffix>
                                    </BigScoreNum>
                                    <ScoreCaptionLabel>Compliance Score</ScoreCaptionLabel>
                                    <ScorePassLine>{passedCheckCount} of {totalRules} rules passed</ScorePassLine>
                                    {totalRules > 0 && (
                                        <PassRatePill $good={passRate >= 75}>{passRate}% pass rate</PassRatePill>
                                    )}
                                </ScoreBlock>
                                {totalViolationCount > 0 ? (
                                    <SeverityBlock>
                                        <SeverityBlockTitle>Violation Breakdown</SeverityBlockTitle>
                                        <SeverityStack>
                                            <SeverityTrack>
                                                <SeveritySegment $width={severityDistribution.error} $color="#ef4444" />
                                                <SeveritySegment $width={severityDistribution.warning} $color="#f59e0b" />
                                                <SeveritySegment $width={severityDistribution.info} $color="#3b82f6" />
                                            </SeverityTrack>
                                            <SeverityLegendStack>
                                                {errorViolationCount > 0 && (
                                                    <LegendItem>
                                                        <LegendDot $color="#ef4444" />
                                                        Errors — {errorViolationCount} violations ({Math.round(severityDistribution.error)}%)
                                                    </LegendItem>
                                                )}
                                                {warningViolationCount > 0 && (
                                                    <LegendItem>
                                                        <LegendDot $color="#f59e0b" />
                                                        Warnings — {warningViolationCount} violations ({Math.round(severityDistribution.warning)}%)
                                                    </LegendItem>
                                                )}
                                                {infoViolationCount > 0 && (
                                                    <LegendItem>
                                                        <LegendDot $color="#3b82f6" />
                                                        Info — {infoViolationCount} violations ({Math.round(severityDistribution.info)}%)
                                                    </LegendItem>
                                                )}
                                            </SeverityLegendStack>
                                        </SeverityStack>
                                    </SeverityBlock>
                                ) : (
                                    <SeverityBlock>
                                        <SeverityBlockTitle>All Checks Passed</SeverityBlockTitle>
                                        <LegendItem>
                                            <LegendDot $color="#10b981" />
                                            <AllPassedText>No violations found in this ruleset</AllPassedText>
                                        </LegendItem>
                                    </SeverityBlock>
                                )}
                            </HealthRow>

                            {(topEndpoints.length > 0 || topRules.length > 0) && (
                                <ReportSection>
                                    <SectionHeader>
                                        <SectionTitle>Top Hotspots</SectionTitle>
                                        <SectionSubtitle>Where issues concentrate most</SectionSubtitle>
                                    </SectionHeader>
                                    <HotspotGrid>
                                        {topEndpoints.length > 0 && (
                                            <HotspotCard>
                                                <HotspotTitle>Top affected endpoints</HotspotTitle>
                                                <HotspotList>
                                                    {topEndpoints.map(([endpoint, count]) => (
                                                        <HotspotItem key={endpoint}>
                                                            <HotspotRow>
                                                                <HotspotName title={endpoint}>{endpoint}</HotspotName>
                                                                <HotspotCount>{count}</HotspotCount>
                                                            </HotspotRow>
                                                            <MiniBarTrack>
                                                                <MiniBarFill $width={(count / maxEndpointCount) * 100} $color="#0ea5e9" />
                                                            </MiniBarTrack>
                                                        </HotspotItem>
                                                    ))}
                                                </HotspotList>
                                            </HotspotCard>
                                        )}
                                        {topRules.length > 0 && (
                                            <HotspotCard>
                                                <HotspotTitle>Top violated rules</HotspotTitle>
                                                <HotspotList>
                                                    {topRules.map(([rule, count]) => (
                                                        <HotspotItem key={rule}>
                                                            <HotspotRow>
                                                                <HotspotName title={rule}>{rule}</HotspotName>
                                                                <HotspotCount>{count}</HotspotCount>
                                                            </HotspotRow>
                                                            <MiniBarTrack>
                                                                <MiniBarFill $width={(count / maxRuleCount) * 100} $color="#a855f7" />
                                                            </MiniBarTrack>
                                                        </HotspotItem>
                                                    ))}
                                                </HotspotList>
                                            </HotspotCard>
                                        )}
                                    </HotspotGrid>
                                </ReportSection>
                            )}

                            <InsightCallout>
                                <InsightText>
                                    {errorViolationCount > 0
                                        ? `Fix ${errorViolationCount} error${errorViolationCount !== 1 ? 's' : ''} first — these carry the highest compliance risk.`
                                        : warningViolationCount > 0
                                            ? `Address ${warningViolationCount} warning${warningViolationCount !== 1 ? 's' : ''} to meet governance baseline requirements.`
                                            : infoViolationCount > 0
                                                ? `Review ${infoViolationCount} informational finding${infoViolationCount !== 1 ? 's' : ''} for best practice improvements.`
                                                : 'All checks passed — your API is fully compliant with this ruleset.'
                                    }
                                </InsightText>
                                <QuickActions>
                                    {errorViolationCount > 0 && (
                                        <NavButton type="button" $color="#ef4444" onClick={() => onTabChange('error')}>
                                            Errors <NavButtonCount>{errorViolationCount}</NavButtonCount>
                                        </NavButton>
                                    )}
                                    {warningViolationCount > 0 && (
                                        <NavButton type="button" $color="#f59e0b" onClick={() => onTabChange('warn')}>
                                            Warnings <NavButtonCount>{warningViolationCount}</NavButtonCount>
                                        </NavButton>
                                    )}
                                    {infoViolationCount > 0 && (
                                        <NavButton type="button" $color="#3b82f6" onClick={() => onTabChange('info')}>
                                            Info <NavButtonCount>{infoViolationCount}</NavButtonCount>
                                        </NavButton>
                                    )}
                                    {passedCheckCount > 0 && (
                                        <NavButton type="button" $color="#10b981" onClick={() => onTabChange('passed')}>
                                            Passed <NavButtonCount>{passedCheckCount}</NavButtonCount>
                                        </NavButton>
                                    )}
                                </QuickActions>
                            </InsightCallout>
                        </OverviewLayout>
                    ) : filteredViolations.length > 0 ? (
                        <SplitBody>
                            <IssuesPane>
                                <IssuesStack>
                                    {filteredViolations.length > 0 && (
                                        <FixAllToolbar>
                                            <ViolationsListTitle>Violations</ViolationsListTitle>
                                            {activeTab !== 'passed' && (
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
                                            )}
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
                                            <ViolationCard
                                                key={idx}
                                                $accent={borderColor}
                                                $selected={selectedViolationIndex === idx}
                                                onClick={() =>
                                                    setSelectedViolationIndex(selectedViolationIndex === idx ? null : idx)
                                                }
                                            >
                                                <ViolationBody>
                                                    <ViolationMessage $hasPath={!!pathStr}>
                                                        {violation.message || 'No message provided'}
                                                    </ViolationMessage>
                                                    {pathStr && <ViolationPath>{pathStr}</ViolationPath>}
                                                </ViolationBody>
                                            </ViolationCard>
                                        );
                                    })}
                                </IssuesStack>
                            </IssuesPane>
                            {selectedViolation ? (
                                <DetailPane>
                                    <DetailPaneHeader>
                                        <DetailPaneTitle>
                                            {activeTab === 'passed' ? 'Passed Check Details' : 'Violation Details'}
                                        </DetailPaneTitle>
                                        {selectedViolation.pathSegments && selectedViolation.pathSegments.length > 0 && (
                                            <NoWrapShrinkAIButton
                                                onClick={() => {
                                                    const p = ` at /${selectedViolation.pathSegments?.join('/')}`;
                                                    openCopilotChat(
                                                        JSON.stringify(selectedViolation),
                                                        `Fix ${rulesetName} violation: ${selectedViolation.message || ''}${p}`
                                                    );
                                                }}
                                                title="Fix with AI"
                                                label="Fix with AI"
                                            />
                                        )}
                                    </DetailPaneHeader>
                                    <DetailHeaderRow>
                                        <DetailHeaderContent>
                                            <DetailLabel>Rule</DetailLabel>
                                            <DetailRuleTitle>
                                                {selectedViolation.rule || 'unknown-rule'}
                                                {selectedRuleFamily && <RuleFamilyChip>{selectedRuleFamily}</RuleFamilyChip>}
                                            </DetailRuleTitle>
                                        </DetailHeaderContent>
                                    </DetailHeaderRow>
                                    <DetailSection>
                                        <DetailLabel>Severity</DetailLabel>
                                        <SeverityBadge
                                            $color={selectedViolation.severity === 'error'
                                                ? '#ef4444'
                                                : selectedViolation.severity === 'warn'
                                                    ? '#f59e0b'
                                                    : selectedViolation.severity === 'hint'
                                                        ? '#8b5cf6'
                                                        : '#3b82f6'}
                                        >
                                            {selectedViolation.severity || activeTab}
                                        </SeverityBadge>
                                    </DetailSection>
                                    <DetailSection>
                                        <DetailLabel>Message</DetailLabel>
                                        <DetailText>{selectedViolation.message || 'No message provided'}</DetailText>
                                    </DetailSection>
                                    {selectedViolation.description && (
                                        <DetailSection>
                                            <DetailLabel>Description</DetailLabel>
                                            <DetailText>{selectedViolation.description}</DetailText>
                                        </DetailSection>
                                    )}
                                    <DetailSection>
                                        <DetailLabel>Location</DetailLabel>
                                        <DetailMeta>{selectedViolation.displayPath || '/'}</DetailMeta>
                                    </DetailSection>
                                    {selectedViolation.range && (
                                        <DetailSection>
                                            <DetailLabel>Lines</DetailLabel>
                                            <DetailMeta>
                                                {selectedViolation.range.start.line + 1}
                                                {selectedViolation.range.end.line !== selectedViolation.range.start.line
                                                    ? `-${selectedViolation.range.end.line + 1}`
                                                    : ''}
                                                {' '}| Col {selectedViolation.range.start.character + 1}
                                            </DetailMeta>
                                        </DetailSection>
                                    )}
                                    {yamlLines && yamlLines.length > 0 && (
                                        <DetailSection>
                                            <DetailLabel>Spec Snippet</DetailLabel>
                                            <YamlBlock>
                                                {yamlLines.map(({ lineNumber, text, highlight }) => (
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
                                <DetailEmpty>Select a violation to view details</DetailEmpty>
                            )}
                        </SplitBody>
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

