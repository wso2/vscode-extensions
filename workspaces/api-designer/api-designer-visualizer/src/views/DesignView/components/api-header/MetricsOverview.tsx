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

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
    validationData?: ValidationData | null;
}

interface MetricBadgeData {
    key: string;
    label: string;
    description: string;
    score: number | null;
    analyzeSection: 'ai-readiness' | 'owasp' | 'rest-api-readiness';
    isLoading?: boolean;
}

type MetricSection = 'ai-readiness' | 'owasp' | 'rest-api-readiness';
type MetricStateMap = Record<MetricSection, { score: number | null; isLoading: boolean }>;

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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
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
    min-height: 14px;
`;

const ReportLinkText = styled.span`
    min-width: 74px;
`;

const IconSlot = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
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

const getRulesetForSection = (rulesets: SpectralRuleset[], section: MetricSection): SpectralRuleset | undefined => {
    if (section === 'ai-readiness') {
        return rulesets.find((ruleset) => {
            const name = (ruleset.name || '').toLowerCase();
            return name.includes('ai') && name.includes('readiness');
        });
    } else if (section === 'owasp') {
        return rulesets.find((ruleset) => {
            const name = (ruleset.name || '').toLowerCase();
            return name.includes('owasp') || name.includes('security');
        });
    } else if (section === 'rest-api-readiness') {
        return rulesets.find((ruleset) => {
            const name = (ruleset.name || '').toLowerCase();
            return name.includes('design') || name.includes('rest');
        });
    }
};

const getRulesetCandidatesForSection = (rulesets: SpectralRuleset[], section: MetricSection): SpectralRuleset[] => {
    const primary = getRulesetForSection(rulesets, section);
    const filtered = rulesets.filter((ruleset) => ruleset.name !== primary?.name);
    if (!primary) {
        return filtered;
    }
    return [primary, ...filtered];
};

const getReportIdForSection = (section: MetricSection): 'ai-readiness' | 'owasp' | 'rest-api-readiness' =>
    section === 'ai-readiness' ? 'ai-readiness' : section === 'owasp' ? 'owasp' : 'rest-api-readiness';

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ fileUri, validationData }) => {
    const { rpcClient } = useVisualizerContext();
    const requestSequenceRef = useRef(0);
    const validationSpecFingerprint = validationData?.specContent ?? '';
    const [metrics, setMetrics] = useState<MetricStateMap>({
        'ai-readiness': { score: null, isLoading: true },
        'owasp': { score: null, isLoading: true },
        'rest-api-readiness': { score: null, isLoading: true }
    });
    /** When score is not yet available, use the same “A” band as a neutral placeholder (matches previous blue default). */
    const placeholderScore = 75;
    const defaultTintHex = scoreAccentHex(placeholderScore);
    const defaultRingColor = scoreColor(placeholderScore);

    useEffect(() => {
        let isActive = true;
        requestSequenceRef.current += 1;
        const requestSequence = requestSequenceRef.current;

        const updateSection = (section: MetricSection, patch: Partial<{ score: number | null; isLoading: boolean }>) => {
            if (!isActive || requestSequenceRef.current !== requestSequence) {
                return;
            }
            setMetrics((prev) => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    ...patch
                }
            }));
        };

        const fetchSectionMetric = async (
            section: MetricSection,
            candidateRulesets: SpectralRuleset[]
        ): Promise<void> => {
            // Keep already loaded score visible during refresh to avoid UI flicker/glitch.
            setMetrics((prev) => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    isLoading: prev[section].score == null
                }
            }));
            const expectedReportId = getReportIdForSection(section);
            try {
                let resolvedScore: number | null = null;
                for (const ruleset of candidateRulesets) {
                    const governance = await rpcClient?.getApiDesignerVisualizerRpcClient().getGovernance({
                        filePath: fileUri!,
                        name: ruleset.name,
                        ruleset
                    });
                    const reportId = governance?.report?.reportId;
                    if (reportId !== expectedReportId) {
                        continue;
                    }
                    resolvedScore = governance?.report?.overview?.score ?? null;
                    break;
                }
                updateSection(section, { score: resolvedScore, isLoading: false });
            } catch {
                updateSection(section, { isLoading: false });
            }
        };

        const fetchGovernanceMetrics = async () => {
            if (!rpcClient || !fileUri || fileUri === 'file:///placeholder') {
                updateSection('ai-readiness', { isLoading: false });
                updateSection('owasp', { isLoading: false });
                updateSection('rest-api-readiness', { isLoading: false });
                return;
            }

            try {
                const rulesetsResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApplicableRulesets({
                    filePath: fileUri
                });
                const governanceRulesets = rulesetsResponse.governanceRulesets || [];
                const aiRulesetCandidates = getRulesetCandidatesForSection(governanceRulesets, 'ai-readiness');
                const owaspRulesetCandidates = getRulesetCandidatesForSection(governanceRulesets, 'owasp');
                const restRulesetCandidates = getRulesetCandidatesForSection(governanceRulesets, 'rest-api-readiness');

                void fetchSectionMetric('ai-readiness', aiRulesetCandidates);
                void fetchSectionMetric('owasp', owaspRulesetCandidates);
                void fetchSectionMetric('rest-api-readiness', restRulesetCandidates);
            } catch {
                updateSection('ai-readiness', { isLoading: false });
                updateSection('owasp', { isLoading: false });
                updateSection('rest-api-readiness', { isLoading: false });
            }
        };

        fetchGovernanceMetrics();
        return () => {
            isActive = false;
        };
    }, [rpcClient, fileUri, validationSpecFingerprint]);

    const metricBadges = useMemo<MetricBadgeData[]>(
        () => [
            {
                key: 'ai-ready',
                label: 'AI Readiness',
                description: 'Measures how ready this API is for AI agent consumption and tool use.',
                score: metrics['ai-readiness'].score,
                analyzeSection: 'ai-readiness',
                isLoading: metrics['ai-readiness'].isLoading
            },
            {
                key: 'owasp',
                label: 'Security (OWASP)',
                description: 'Measures alignment with OWASP API Security best practices.',
                score: metrics.owasp.score,
                analyzeSection: 'owasp',
                isLoading: metrics.owasp.isLoading
            },
            {
                key: 'rest-api-readiness',
                label: 'REST Compliance',
                description: 'Measures alignment with WSO2 REST API design guidelines.',
                score: metrics['rest-api-readiness'].score,
                analyzeSection: 'rest-api-readiness',
                isLoading: metrics['rest-api-readiness'].isLoading
            }
        ],
        [metrics]
    );

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
                                    {badge.isLoading
                                        ? '...'
                                        : badge.score !== null && badge.score !== undefined
                                            ? `${badge.score}%`
                                            : '--'}
                                </MetricCircleText>
                            </MetricCircle>
                            <MetricContent>
                                <MetricTitle>{badge.label}</MetricTitle>
                                <MetricDescription>{badge.description}</MetricDescription>
                                <ReportLinkHint>
                                    <ReportLinkText>{badge.isLoading ? 'Loading score...' : 'See full report'}</ReportLinkText>
                                    <IconSlot>
                                        {!badge.isLoading && <Codicon name="arrow-right" sx={{ fontSize: '12px' }} />}
                                    </IconSlot>
                                </ReportLinkHint>
                            </MetricContent>
                        </MetricBadge>
                    );
                })}
            </MetricsStrip>
        </Container>
    );
};

