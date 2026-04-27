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
import { scoreAccentHex, scoreColor } from '../../../AnalyzeView/hooks/useReport';

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
    validationData?: ValidationData | null;
}

interface MetricBadgeData {
    key: string;
    label: string;
    description: string;
    score: number | null;
    analyzeSection: 'ai-readiness' | 'owasp' | 'wso2-rest' | 'all';
}

type GovernanceSection = 'owasp' | 'wso2-rest';

const Container = styled.div`
    width: 100%;
    margin: 0 0 10px;
`;

const MetricsStrip = styled.div`
    display: flex;
    gap: 8px;
`;

const MetricBadge = styled.button<{ $borderColor: string; $bgColor: string }>`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    padding: 9px 10px;
    background: ${({ $bgColor }: { $bgColor: string }) => $bgColor};
    border: 1px solid ${({ $borderColor }: { $borderColor: string }) => $borderColor};
    border-radius: 7px;
    font-family: var(--vscode-font-family);
    cursor: pointer;
    transition: border-color 0.16s ease, background-color 0.16s ease;

    &:hover {
        border-color: color-mix(in srgb, var(--vscode-focusBorder) 55%, var(--vscode-panel-border));
        background: color-mix(in srgb, ${({ $bgColor }: { $bgColor: string }) => $bgColor} 70%, var(--vscode-editorWidget-background));
    }
`;

const MetricCircle = styled.div<{ $color: string; $score: number | null }>`
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: ${({ $color, $score }: { $color: string; $score: number | null }) => {
        const normalizedScore = Math.max(0, Math.min(100, $score ?? 0));
        return `conic-gradient(${$color} ${normalizedScore}%, var(--vscode-panel-border) ${normalizedScore}% 100%)`;
    }};
    color: var(--vscode-foreground);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    flex-shrink: 0;

    &::before {
        content: '';
        position: absolute;
        inset: 3px;
        border-radius: 999px;
        background: var(--vscode-editorWidget-background);
    }
`;

const MetricCircleText = styled.span`
    position: relative;
    z-index: 1;
`;

const MetricContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
`;

const ReportLinkHint = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 500;
    color: var(--vscode-textLink-foreground);
    margin-top: 3px;
    opacity: 0.92;
`;

const MetricTitle = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MetricDescription = styled.div`
    font-size: 9px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.25;
`;

const hexToRgba = (hex: string, alpha: number): string => {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getRulesetForSection = (rulesets: SpectralRuleset[], section: GovernanceSection): SpectralRuleset | undefined => {
    if (section === 'owasp') {
        return rulesets.find((ruleset) => {
            const name = (ruleset.name || '').toLowerCase();
            return name.includes('owasp') || name.includes('security');
        });
    }
    return rulesets.find((ruleset) => {
        const name = (ruleset.name || '').toLowerCase();
        return name.includes('design') || name.includes('rest');
    });
};

const getRulesetCandidatesForSection = (rulesets: SpectralRuleset[], section: GovernanceSection): SpectralRuleset[] => {
    const primary = getRulesetForSection(rulesets, section);
    const match = (ruleset: SpectralRuleset) => {
        const name = (ruleset.name || '').toLowerCase();
        return section === 'owasp'
            ? name.includes('owasp') || name.includes('security')
            : name.includes('design') || name.includes('rest');
    };
    const filtered = rulesets.filter(match);
    if (!primary) {
        return filtered;
    }
    return [primary, ...filtered.filter((ruleset) => ruleset.name !== primary.name)];
};

const getSectionMeta = (section: GovernanceSection): { label: string; description: string } => {
    if (section === 'owasp') {
        return {
            label: 'Secure',
            description: 'Explains how much secure your API is based on OWASP guidelines',
        };
    }
    return {
        label: 'Compliant',
        description: 'Explains how much compliant your API is with WSO2 REST API guidelines',
    };
};

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ fileUri, aiReadinessScore, validationData }) => {
    const { rpcClient } = useVisualizerContext();
    const [governanceMetrics, setGovernanceMetrics] = useState<MetricBadgeData[]>([]);
    const readiness = aiReadinessScore?.score ?? null;
    /** When score is not yet available, use the same “A” band as a neutral placeholder (matches previous blue default). */
    const placeholderScore = 75;
    const defaultTintHex = scoreAccentHex(placeholderScore);
    const defaultRingColor = scoreColor(placeholderScore);

    useEffect(() => {
        let isActive = true;
        const fetchGovernanceMetrics = async () => {
            if (!rpcClient || !fileUri || fileUri === 'file:///placeholder') {
                if (isActive) {
                    setGovernanceMetrics([]);
                }
                return;
            }

            try {
                const rulesetsResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApplicableRulesets({
                    filePath: fileUri
                });
                const governanceRulesets = rulesetsResponse.governanceRulesets || [];
                const sectionTargets: GovernanceSection[] = ['owasp', 'wso2-rest'];

                const results = await Promise.allSettled(
                    sectionTargets.map(async (section) => {
                        const expectedReportId = section === 'owasp' ? 'owasp' : 'rest-api-readiness';
                        const candidates = getRulesetCandidatesForSection(governanceRulesets, section);
                        for (const ruleset of candidates) {
                            const governance = await rpcClient.getApiDesignerVisualizerRpcClient().getGovernance({
                                filePath: fileUri,
                                name: ruleset.name,
                                ruleset
                            });
                            const reportId = governance?.report?.reportId;
                            if (reportId !== expectedReportId) {
                                continue;
                            }
                            const meta = getSectionMeta(section);
                            return {
                                key: section,
                                label: meta.label,
                                description: meta.description,
                                score: governance?.report?.overview?.score ?? null,
                                analyzeSection: section
                            } as MetricBadgeData;
                        }
                        throw new Error(`No matching ${expectedReportId} ruleset found`);
                    })
                );

                const metrics = results
                    .filter((result): result is PromiseFulfilledResult<MetricBadgeData> => result.status === 'fulfilled')
                    .map((result) => result.value);
                if (isActive) {
                    setGovernanceMetrics(metrics);
                }
            } catch {
                if (isActive) {
                    setGovernanceMetrics([]);
                }
            }
        };

        fetchGovernanceMetrics();
        return () => {
            isActive = false;
        };
    }, [rpcClient, fileUri, validationData]);

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
                    const ringColor =
                        badge.score !== null && badge.score !== undefined ? scoreColor(badge.score) : defaultRingColor;
                    const tintHex =
                        badge.score !== null && badge.score !== undefined ? scoreAccentHex(badge.score) : defaultTintHex;
                    return (
                        <MetricBadge
                            key={badge.key}
                            onClick={() => navigateToAnalyze(badge.analyzeSection)}
                            title="Click to view detailed analysis"
                            $borderColor={hexToRgba(tintHex, 0.42)}
                            $bgColor={hexToRgba(tintHex, 0.06)}
                        >
                            <MetricCircle $color={ringColor} $score={badge.score}>
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

