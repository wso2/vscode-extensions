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
import { Typography, Codicon } from '@wso2/ui-toolkit';
import { GovernanceViolation } from '@wso2/api-designer-core';
import { normalizeGovernanceViolation } from '../../../types/violations';

const getScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
};

const Card = styled.div`
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
`;

const CardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
    gap: 12px;
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ScoreBadge = styled.div<{ $color: string }>`
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    background: transparent;
    border: 1px solid ${({ $color }: { $color: string }) => $color};
    color: ${({ $color }: { $color: string }) => $color};
`;

const BodyRow = styled.div`
    display: flex;
    gap: 16px;
    align-items: stretch;
    width: 100%;
    box-sizing: border-box;
`;

const ScorePanel = styled.div`
    flex: 0 0 30%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: var(--vscode-editorWidget-background);
    border-radius: 8px;
    padding: 24px;
    text-align: center;
    min-width: 0;
`;

const BigScore = styled.div<{ $color: string }>`
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    color: ${({ $color }: { $color: string }) => $color};
    display: flex;
    align-items: baseline;
`;

const PercentSuffix = styled.span`
    font-size: 24px;
    font-weight: 600;
    margin-left: 4px;
`;

const ScoreCaption = styled.div`
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    margin-top: 12px;
    font-weight: 500;
`;

const StatsColumn = styled.div`
    flex: 1;
    width: 60%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    overflow: visible;
`;

const StatRow = styled.div<{ $clickable: boolean }>`
    background: var(--vscode-editorWidget-background);
    padding: 16px;
    border-radius: 6px;
    border: 1px solid var(--vscode-panel-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
    cursor: ${({ $clickable }: { $clickable: boolean }) => ($clickable ? 'pointer' : 'default')};
    transition: all 0.2s ease;

    ${({ $clickable }: { $clickable: boolean }) =>
        $clickable &&
        `
        &:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-color: var(--vscode-focusBorder);
        }
    `}
`;

const StatLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
`;

const StatIconBox = styled.div<{ $bg: string; $fg: string }>`
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    background: ${({ $bg }: { $bg: string }) => $bg};
    color: ${({ $fg }: { $fg: string }) => $fg};
`;

const StatTextCol = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    justify-content: center;
    min-width: 0;
    flex: 1;
`;

const StatLabel = styled.div`
    font-size: 13px;
    color: var(--vscode-descriptionForeground);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const StatValue = styled.div<{ $color: string }>`
    font-size: 24px;
    font-weight: 700;
    color: ${({ $color }: { $color: string }) => $color};
`;

export interface RulesetCardData {
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
}

export interface RulesetCardProps {
    name: string;
    data: RulesetCardData;
    onOpenModal: (tab?: 'overview' | 'error' | 'warn' | 'info' | 'rules' | 'passed') => void;
}

export const RulesetCard: React.FC<RulesetCardProps> = ({ name, data, onOpenModal }) => {
    const scoreColor = getScoreColor(data.score);
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
    const normalizedViolations = (data.violations || []).map(normalizeGovernanceViolation);
    const endpointsAffectedCount = new Set(
        normalizedViolations
            .map((violation) =>
                violation?.pathSegments?.[0] === 'paths' ? violation.pathSegments?.[1] : undefined
            )
            .filter((endpoint): endpoint is string => Boolean(endpoint))
    ).size;
    const rulesViolatedCount = new Set(
        normalizedViolations
            .map((violation) => violation?.rule)
            .filter((rule): rule is string => Boolean(rule))
    ).size;

    return (
        <Card>
            <CardHeader>
                <Typography variant="body1" sx={{ margin: 0, fontSize: 13, fontWeight: 500 }}>
                    {data.icon} {name}
                </Typography>
                <HeaderActions>
                    <ScoreBadge $color={scoreColor}>
                        {data.score}% {data.badgeLabel || 'COMPLIANT'}
                    </ScoreBadge>
                </HeaderActions>
            </CardHeader>

            <BodyRow>
                <ScorePanel>
                    <BigScore $color={scoreColor}>
                        {data.score}
                        <PercentSuffix>%</PercentSuffix>
                    </BigScore>
                    <ScoreCaption>Compliance Score</ScoreCaption>
                </ScorePanel>

                <StatsColumn>
                    {[
                        { type: 'error' as const, label: 'Errors', count: errorViolationCount, icon: 'error' },
                        { type: 'warning' as const, label: 'Warnings', count: warningViolationCount, icon: 'warning' },
                        { type: 'info' as const, label: 'Endpoints Affected', count: endpointsAffectedCount, icon: 'globe', colors: { bg: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' } },
                        { type: 'rules' as const, label: 'Rules Violated', count: rulesViolatedCount, icon: 'list-unordered', colors: { bg: 'rgba(168, 85, 247, 0.14)', color: '#a855f7' } }
                    ].map((stat) => {
                        const statColors = {
                            error: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
                            warning: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' },
                            info: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
                            rules: { bg: 'rgba(168, 85, 247, 0.14)', color: '#a855f7' },
                            passed: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }
                        };
                        const colors = stat.colors || statColors[stat.type];
                        return (
                            <StatRow
                                key={stat.type}
                                $clickable={true}
                                onClick={() => {
                                    if (stat.type === 'error') {
                                        onOpenModal('error');
                                    } else if (stat.type === 'warning') {
                                        onOpenModal('warn');
                                    } else if (stat.type === 'info') {
                                        onOpenModal('info');
                                    } else if (stat.type === 'rules') {
                                        onOpenModal('rules');
                                    } else {
                                        onOpenModal('passed');
                                    }
                                }}
                            >
                                <StatLeft>
                                    <StatIconBox $bg={colors.bg} $fg={colors.color}>
                                        <Codicon name={stat.icon} sx={{ fontSize: '20px' }} />
                                    </StatIconBox>
                                    <StatTextCol>
                                        <StatLabel>{stat.label}</StatLabel>
                                        <StatValue $color={colors.color}>{stat.count}</StatValue>
                                    </StatTextCol>
                                </StatLeft>
                                <Codicon name="chevron-right" sx={{ fontSize: '14px' }} />
                            </StatRow>
                        );
                    })}
                </StatsColumn>
            </BodyRow>
        </Card>
    );
};
