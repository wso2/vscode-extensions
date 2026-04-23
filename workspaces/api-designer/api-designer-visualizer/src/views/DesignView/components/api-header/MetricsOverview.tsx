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

import React, { useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { SpectralRuleset } from '@wso2/api-designer-core';
import { Codicon } from '@wso2/ui-toolkit';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';

export interface ValidationIssuePathItem {
    path: string[];
    message: string;
    range?: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
}

export interface ValidationData {
    errorCount: number;
    warningCount: number;
    isValid: boolean;
    errors?: ValidationIssuePathItem[];
    warnings?: ValidationIssuePathItem[];
    /** Raw spec text from the last validation run (same string Spectral used — for line-accurate snippets). */
    specContent?: string;
}

export interface AIReadinessData {
    score: number | null;
    issues?: Array<{ category: string; message: string; severity: 'error' | 'warning' | 'info' }>;
}

interface MetricsOverviewProps {
    fileUri?: string;
    aiReadinessScore?: AIReadinessData | null;
}

interface MetricBadgeData {
    key: string;
    label: string;
    description: string;
    score: number | null;
    analyzeSection: 'ai-readiness' | 'owasp' | 'wso2-rest' | 'all';
}

const Container = styled.div`
    max-width: 1200px;
    margin: 0 auto 12px;
`;

const MetricsStrip = styled.div`
    display: flex;
    gap: 10px;
`;

const MetricBadge = styled.button<{ $borderColor: string; $bgColor: string }>`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    padding: 10px 12px;
    background: ${({ $bgColor }: { $bgColor: string }) => $bgColor};
    border: 1px solid ${({ $borderColor }: { $borderColor: string }) => $borderColor};
    border-radius: 8px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    transition: border-color 0.2s ease, transform 0.2s ease;

    &:hover {
        border-color: var(--vscode-focusBorder);
        transform: translateY(-1px);
    }
`;

const MetricCircle = styled.div<{ $color: string; $score: number | null }>`
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 46px;
    height: 46px;
    border-radius: 999px;
    background: ${({ $color, $score }: { $color: string; $score: number | null }) => {
        const normalizedScore = Math.max(0, Math.min(100, $score ?? 0));
        return `conic-gradient(${$color} ${normalizedScore}%, var(--vscode-panel-border) ${normalizedScore}% 100%)`;
    }};
    color: var(--vscode-foreground);
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    flex-shrink: 0;

    &::before {
        content: '';
        position: absolute;
        inset: 4px;
        border-radius: 999px;
        background: var(--vscode-editor-background);
    }
`;

const MetricCircleText = styled.span`
    position: relative;
    z-index: 1;
`;

const MetricContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
`;

const ReportLinkHint = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-textLink-foreground);
    margin-top: 4px;
`;

const MetricTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MetricDescription = styled.div`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.3;
`;

const scoreToAccentHex = (score: number): string => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
};

const hexToRgba = (hex: string, alpha: number): string => {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const resolveBadgeMeta = (
    rulesetName: string
): { label: string; description: string; analyzeSection: 'owasp' | 'wso2-rest' | 'all' } => {
    const normalized = rulesetName.toLowerCase();
    if (normalized.includes('security') || normalized.includes('owasp')) {
        return {
            label: 'Secure',
            description: 'Explains how much secure your API is based on OWASP guidelines',
            analyzeSection: 'owasp'
        };
    }
    if (normalized.includes('design') || normalized.includes('rest')) {
        return {
            label: 'Compliant',
            description: 'Explains how much compliant your API is with WSO2 REST API guidelines',
            analyzeSection: 'wso2-rest'
        };
    }
    return {
        label: rulesetName,
        description: 'Spectral governance score for this ruleset',
        analyzeSection: 'all'
    };
};

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ fileUri, aiReadinessScore }) => {
    const { rpcClient } = useVisualizerContext();
    const [governanceMetrics, setGovernanceMetrics] = useState<MetricBadgeData[]>([]);
    const readiness = aiReadinessScore?.score ?? null;
    const defaultAccent = '#3b82f6';

    useEffect(() => {
        const fetchGovernanceMetrics = async () => {
            if (!rpcClient || !fileUri || fileUri === 'file:///placeholder') {
                setGovernanceMetrics([]);
                return;
            }

            try {
                const rulesetsResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApplicableRulesets({
                    filePath: fileUri
                });
                const governanceRulesets = rulesetsResponse.governanceRulesets || [];
                const preferredRulesets: SpectralRuleset[] = [];
                const securityRuleset = governanceRulesets.find((ruleset) => {
                    const name = ruleset.name.toLowerCase();
                    return name.includes('security') || name.includes('owasp');
                });
                const complianceRuleset = governanceRulesets.find((ruleset) => {
                    const name = ruleset.name.toLowerCase();
                    return name.includes('design') || name.includes('rest');
                });

                if (securityRuleset) {
                    preferredRulesets.push(securityRuleset);
                }
                if (complianceRuleset && complianceRuleset.name !== securityRuleset?.name) {
                    preferredRulesets.push(complianceRuleset);
                }
                for (const ruleset of governanceRulesets) {
                    if (preferredRulesets.length >= 2) break;
                    if (!preferredRulesets.some((existing) => existing.name === ruleset.name)) {
                        preferredRulesets.push(ruleset);
                    }
                }

                const results = await Promise.allSettled(
                    preferredRulesets.slice(0, 2).map(async (ruleset) => {
                        const governance = await rpcClient.getApiDesignerVisualizerRpcClient().getGovernance({
                            filePath: fileUri,
                            name: ruleset.name,
                            ruleset
                        });
                        const meta = resolveBadgeMeta(ruleset.name);
                        return {
                            key: ruleset.name,
                            label: meta.label,
                            description: meta.description,
                            score: governance?.score ?? null,
                            analyzeSection: meta.analyzeSection
                        } as MetricBadgeData;
                    })
                );

                const metrics = results
                    .filter((result): result is PromiseFulfilledResult<MetricBadgeData> => result.status === 'fulfilled')
                    .map((result) => result.value);
                setGovernanceMetrics(metrics);
            } catch {
                setGovernanceMetrics([]);
            }
        };

        fetchGovernanceMetrics();
    }, [rpcClient, fileUri]);

    const metricBadges = useMemo<MetricBadgeData[]>(
        () => [
            {
                key: 'ai-ready',
                label: 'AI Ready',
                description: 'Explains how much ready your API is to be consumed by agents',
                score: readiness,
                analyzeSection: 'ai-readiness'
            },
            ...governanceMetrics
        ],
        [readiness, governanceMetrics]
    );

    if (!aiReadinessScore) {
        return null;
    }

    const navigateToAnalyze = (analyzeSection: MetricBadgeData['analyzeSection']) => {
        postVSCodeMessage({
            command: 'switchView',
            viewType: 'analyze',
            fileUri,
            analyzeSection
        });
    };

    return (
        <Container>
            <MetricsStrip>
                {metricBadges.map((badge) => {
                    const badgeAccent = badge.score !== null && badge.score !== undefined
                        ? scoreToAccentHex(badge.score)
                        : defaultAccent;
                    return (
                        <MetricBadge
                            key={badge.key}
                            onClick={() => navigateToAnalyze(badge.analyzeSection)}
                            title="Click to view detailed analysis"
                            $borderColor={hexToRgba(badgeAccent, 0.42)}
                            $bgColor={hexToRgba(badgeAccent, 0.1)}
                        >
                            <MetricCircle $color={badgeAccent} $score={badge.score}>
                                <MetricCircleText>
                                    {badge.score !== null && badge.score !== undefined ? `${badge.score}%` : '--'}
                                </MetricCircleText>
                            </MetricCircle>
                            <MetricContent>
                                <MetricTitle>{badge.label}</MetricTitle>
                                <MetricDescription>{badge.description}</MetricDescription>
                                <ReportLinkHint>
                                    See full report
                                    <Codicon name="arrow-right" sx={{ fontSize: '12px' }} />
                                </ReportLinkHint>
                            </MetricContent>
                        </MetricBadge>
                    );
                })}
            </MetricsStrip>
        </Container>
    );
};

