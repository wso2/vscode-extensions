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

import React, { useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Button, Codicon, Typography } from '@wso2/ui-toolkit';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { buildAiReadinessSummary, AiReadinessSummary, AiReadinessViolation } from '@wso2/api-designer-core';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { useAIAvailability } from '../../../hooks/useAIAvailability';
import { AIButton } from '../../../components/ai/AIButton';

// Type aliases for backward compatibility
type ReadinessViolation = AiReadinessViolation;
const transformReadinessGovernanceResult = buildAiReadinessSummary;

interface AIReadinessDashboardProps {
    fileUri: string;
    refreshToken?: number;
}

type AIReadinessData = AiReadinessSummary;

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

const PageColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    box-sizing: border-box;
`;

const HeaderBar = styled.div`
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    width: 100%;
    box-sizing: border-box;
`;

const HeaderTitleStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ErrorBanner = styled.div`
    padding: 16px;
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 8px;
    color: var(--vscode-errorForeground);
    display: flex;
    align-items: center;
    gap: 12px;
`;

const DashboardCard = styled.div`
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
`;

const CardTopRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 4px;
`;

const CardTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ReadinessScorePill = styled.div<{ $color: string }>`
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    background: transparent;
    border: 1px solid ${(p: { $color: string }) => p.$color};
    color: ${(p: { $color: string }) => p.$color};
`;

const ScoreHero = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px 16px;
    background: var(--vscode-editorWidget-background);
    border-radius: 6px;
    border: 1px solid var(--vscode-panel-border);
    position: relative;
    flex-direction: column;
    margin-bottom: 8px;
`;

const ScoreNumberRow = styled.div<{ $color: string }>`
    font-size: 36px;
    font-weight: 700;
    color: ${(p: { $color: string }) => p.$color};
    display: flex;
    align-items: baseline;
`;

const ScorePercentSuffix = styled.span`
    font-size: 20px;
    font-weight: 600;
    margin-left: 2px;
`;

const ScoreCaption = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-top: 8px;
`;

const MetricsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
`;

const MetricTile = styled.div<{ $interactive: boolean }>`
    background: var(--vscode-editorWidget-background);
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--vscode-panel-border);
    display: flex;
    flex-direction: column;
    gap: 6px;
    cursor: ${(p: { $interactive: boolean }) => (p.$interactive ? 'pointer' : 'default')};
    transition: all 0.2s ease;

    ${(p: { $interactive: boolean }) =>
        p.$interactive &&
        `
        &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border-color: var(--vscode-focusBorder);
        }
    `}
`;

const MetricTileHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    width: 100%;
`;

const MetricTileTitleCluster = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const MetricFraction = styled.div`
    font-size: 18px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const MetricProgressRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const MetricProgressTrack = styled.div`
    flex: 1;
    height: 4px;
    background: var(--vscode-input-background);
    border-radius: 2px;
    overflow: hidden;
`;

const MetricProgressFill = styled.div<{ $pct: number; $fillColor: string }>`
    height: 100%;
    width: ${(p: { $pct: number; $fillColor: string }) => p.$pct}%;
    background: ${(p: { $pct: number; $fillColor: string }) => p.$fillColor};
    border-radius: 2px;
    transition: width 0.3s ease;
`;

const MetricPercentText = styled.div`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    font-weight: 600;
    min-width: 32px;
    text-align: right;
`;

const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
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
`;

const ModalHeaderBar = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-sideBar-background);
    flex-shrink: 0;
`;

const ModalTitleCluster = styled.div`
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    color: var(--vscode-foreground);
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ModalTabsRow = styled.div`
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--vscode-panel-border);
    padding-left: 16px;
    flex-shrink: 0;
    background: var(--vscode-editor-background);
`;

const ModalTabButton = styled.button<{ $active: boolean }>`
    background: none;
    border: none;
    padding: 12px 16px;
    cursor: pointer;
    font-size: 13px;
    color: ${(p: { $active: boolean }) =>
        p.$active ? 'var(--vscode-foreground)' : 'var(--vscode-descriptionForeground)'};
    border-bottom: ${(p: { $active: boolean }) =>
        p.$active ? '2px solid var(--vscode-focusBorder)' : '2px solid transparent'};
    transition: all 0.2s ease;
    font-weight: ${(p: { $active: boolean }) => (p.$active ? 600 : 400)};
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
`;

const TabCountPill = styled.span`
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    min-width: 18px;
    text-align: center;
`;

const ModalBodyScroll = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: var(--vscode-editor-background);
    min-height: 0;
`;

const ReadinessEmptyState = styled.div`
    text-align: center;
    padding: 60px 20px;
    color: var(--vscode-descriptionForeground);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
`;

const ReadinessEmptyEmoji = styled.div`
    font-size: 48px;
    opacity: 0.5;
`;

const ReadinessEmptyMessage = styled.div`
    font-size: 14px;
    font-weight: 500;
`;

const MissingListStack = styled.div`
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

const MissingItemCard = styled.div`
    padding: 12px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-left: 2px solid #f59e0b;
    border-radius: 4px;
    font-size: 12px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
`;

const MissingItemBody = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const MissingItemMessage = styled.div<{ $hasPath: boolean }>`
    color: var(--vscode-foreground);
    margin-bottom: ${(p: { $hasPath: boolean }) => (p.$hasPath ? 4 : 0)}px;
`;

const MissingItemPath = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    font-family: var(--vscode-editor-font-family);
`;

export const AIReadinessDashboard: React.FC<AIReadinessDashboardProps> = ({ fileUri, refreshToken }) => {
    const { rpcClient } = useVisualizerContext();
    const isAIAvailable = useAIAvailability();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [aiReadinessData, setAIReadinessData] = useState<AIReadinessData | null>(null);
    const [aiReadinessRuleset, setAIReadinessRuleset] = useState<any>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'summaries' | 'descriptions' | 'examples' | 'errors'>('summaries');

    const fetchAIReadinessData = useCallback(async () => {
        if (!rpcClient) {
            setError('RPC client not available');
            setLoading(false);
            setAIReadinessData({
                score: 0,
                summariesComplete: { filled: 0, total: 0, percentage: 0 },
                descriptionsComplete: { filled: 0, total: 0, percentage: 0 },
                schemasWithExamples: { filled: 0, total: 0, percentage: 0 },
                errorResponsesDefined: { filled: 0, total: 0, percentage: 0 }
            });
            return;
        }

        if (!fileUri || fileUri === 'file:///placeholder') {
            setError('Invalid file path');
            setLoading(false);
            setAIReadinessData({
                score: 0,
                summariesComplete: { filled: 0, total: 0, percentage: 0 },
                descriptionsComplete: { filled: 0, total: 0, percentage: 0 },
                schemasWithExamples: { filled: 0, total: 0, percentage: 0 },
                errorResponsesDefined: { filled: 0, total: 0, percentage: 0 }
            });
            return;
        }
        
        try {
            setLoading(true);
            setError(null);

            const rulesetsResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApplicableRulesets({ 
                filePath: fileUri 
            });

            const { aiReadinessRuleset: ruleset } = rulesetsResponse;
            
            // Store the ruleset for use in Fix All
            setAIReadinessRuleset(ruleset);
            
            if (!ruleset) {
                setAIReadinessData({
                    score: 0,
                    summariesComplete: { filled: 0, total: 0, percentage: 0 },
                    descriptionsComplete: { filled: 0, total: 0, percentage: 0 },
                    schemasWithExamples: { filled: 0, total: 0, percentage: 0 },
                    errorResponsesDefined: { filled: 0, total: 0, percentage: 0 }
                });
                setLoading(false);
                return;
            }

            const result = await rpcClient.getApiDesignerVisualizerRpcClient().getGovernance({ 
                filePath: fileUri, 
                name: ruleset.name,
                ruleset: ruleset
            });

            const aiReadinessData = result.aiReadinessSummary ?? transformReadinessGovernanceResult(result);
            setAIReadinessData(aiReadinessData);
            setError(null);

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err ? String(err.message) : 'Failed to analyze AI readiness');
            setError(errorMessage);
            
            // Set default data so UI can still render
            setAIReadinessData({
                score: 0,
                summariesComplete: { filled: 0, total: 0, percentage: 0 },
                descriptionsComplete: { filled: 0, total: 0, percentage: 0 },
                schemasWithExamples: { filled: 0, total: 0, percentage: 0 },
                errorResponsesDefined: { filled: 0, total: 0, percentage: 0 }
            });
        } finally {
            setLoading(false);
        }
    }, [rpcClient, fileUri]);

    useEffect(() => {
        fetchAIReadinessData();
    }, [fetchAIReadinessData, refreshToken]);

    const openCopilotChat = (context: string, prompt: string) => {
        postVSCodeMessage({
            command: 'openCopilotChat',
            data: { context, prompt }
        });
    };

    const triggerFix = useCallback((item: ReadinessViolation, label: string) => {
        if (!item?.pathSegments || item.pathSegments.length === 0) {
            return;
        }

        // Format path as /components/responses/UnauthorizedError
        const pathStr = item.pathSegments.length > 0 
            ? ` at /${item.pathSegments.join('/')}` 
            : '';

        openCopilotChat(
            JSON.stringify(item),
            `Improve ${label}: ${item.message || ''}${pathStr}`
        );
    }, []);

    if (!fileUri || fileUri === 'file:///placeholder') {
        return null;
    }

    if (loading && !aiReadinessData) {
        return (
            <PageColumn>
                <HeaderBar>
                    <HeaderTitleStack>
                        <Typography variant="body1" sx={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--vscode-foreground)' }}>
                            AI Readiness Analysis
                        </Typography>
                    </HeaderTitleStack>
                </HeaderBar>
                <LoadingOverlay message="Analyzing AI readiness..." />
            </PageColumn>
        );
    }

    // Always render dashboard header, show data if available
    if (!aiReadinessData) {
        return (
            <PageColumn>
                <HeaderBar>
                    <HeaderTitleStack>
                        <Typography variant="body1" sx={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--vscode-foreground)' }}>
                            AI Readiness Analysis
                        </Typography>
                    </HeaderTitleStack>
                </HeaderBar>
                {error && (
                    <ErrorBanner>
                        <Codicon name="warning" sx={{ fontSize: '20px' }} />
                        <Typography variant="body2">{error}</Typography>
                    </ErrorBanner>
                )}
            </PageColumn>
        );
    }

    const scoreColor = getScoreColor(aiReadinessData.score);

    return (
        <PageColumn>
            <HeaderBar>
                <HeaderTitleStack>
                    <Typography variant="body1" sx={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--vscode-foreground)' }}>
                        AI Readiness Analysis
                    </Typography>
                </HeaderTitleStack>
            </HeaderBar>

            <DashboardCard>
                <CardTopRow>
                    <CardTitleRow>
                        <Codicon name="circuit-board" sx={{ fontSize: '20px' }} />
                        <Typography variant="body1" sx={{ margin: 0, fontSize: 13, fontWeight: 500 }}>
                            AI Readiness
                        </Typography>
                    </CardTitleRow>
                    <ReadinessScorePill $color={scoreColor}>
                        {aiReadinessData.score}% AI Ready
                    </ReadinessScorePill>
                </CardTopRow>

                <ScoreHero>
                    <ScoreNumberRow $color={scoreColor}>
                        {aiReadinessData.score}
                        <ScorePercentSuffix>%</ScorePercentSuffix>
                    </ScoreNumberRow>
                    <ScoreCaption>
                        AI Readiness Score
                    </ScoreCaption>
                </ScoreHero>

                <MetricsGrid>
                    {([
                        {
                            key: 'summaries' as const,
                            icon: 'list-unordered',
                            label: 'Summaries',
                            data: aiReadinessData.summariesComplete,
                            missing: aiReadinessData.summariesComplete.missing
                        },
                        {
                            key: 'descriptions' as const,
                            icon: 'note',
                            label: 'Descriptions',
                            data: aiReadinessData.descriptionsComplete,
                            missing: aiReadinessData.descriptionsComplete.missing
                        },
                        {
                            key: 'examples' as const,
                            icon: 'symbol-field',
                            label: 'Examples',
                            data: aiReadinessData.schemasWithExamples,
                            missing: aiReadinessData.schemasWithExamples.missing
                        },
                        {
                            key: 'errors' as const,
                            icon: 'error',
                            label: 'Error Responses',
                            data: aiReadinessData.errorResponsesDefined,
                            missing: aiReadinessData.errorResponsesDefined.missing
                        }
                    ]).map((metric) => {
                        const progressColor = getScoreColor(metric.data.percentage);
                        const interactive = !!(metric.missing && metric.missing.length > 0);
                        return (
                            <MetricTile
                                key={metric.key}
                                $interactive={interactive}
                                onClick={() => {
                                    if (interactive) {
                                        setActiveTab(metric.key as 'summaries' | 'descriptions' | 'examples' | 'errors');
                                        setModalOpen(true);
                                    }
                                }}
                            >
                                <MetricTileHeader>
                                    <MetricTileTitleCluster>
                                        <Codicon name={metric.icon} sx={{ fontSize: '14px', color: '#f59e0b' }} />
                                        <Typography variant="caption" sx={{
                                            margin: 0,
                                            fontSize: 10,
                                            color: 'var(--vscode-descriptionForeground)',
                                            textTransform: 'uppercase',
                                            fontWeight: 600,
                                            letterSpacing: 0.5
                                        }}>
                                            {metric.label}
                                        </Typography>
                                    </MetricTileTitleCluster>
                                    {interactive && (
                                        <Codicon name="chevron-right" sx={{ fontSize: '14px', opacity: 0.6 }} />
                                    )}
                                </MetricTileHeader>
                                <MetricFraction>
                                    {metric.data.filled}/{metric.data.total}
                                </MetricFraction>
                                <MetricProgressRow>
                                    <MetricProgressTrack>
                                        <MetricProgressFill
                                            $pct={metric.data.percentage}
                                            $fillColor={progressColor}
                                        />
                                    </MetricProgressTrack>
                                    <MetricPercentText>
                                        {Math.round(metric.data.percentage)}%
                                    </MetricPercentText>
                                </MetricProgressRow>
                            </MetricTile>
                        );
                    })}
                </MetricsGrid>
            </DashboardCard>

            {/* Details Modal */}
            {modalOpen && aiReadinessData && (
                <ModalOverlay onClick={() => setModalOpen(false)}>
                    <ModalPanel onClick={(e) => e.stopPropagation()}>
                        <ModalHeaderBar>
                            <ModalTitleCluster>
                                <Codicon name="info" sx={{ fontSize: '16px' }} />
                                Missing Items Details
                            </ModalTitleCluster>
                            <Button
                                appearance="icon"
                                onClick={() => setModalOpen(false)}
                                sx={{ padding: 6 }}
                            >
                                <Codicon name="close" sx={{ fontSize: '16px' }} />
                            </Button>
                        </ModalHeaderBar>

                        <ModalTabsRow>
                            {([
                                { id: 'summaries' as const, icon: 'list-unordered', label: 'Summaries', color: '#f59e0b' },
                                { id: 'descriptions' as const, icon: 'note', label: 'Descriptions', color: '#f59e0b' },
                                { id: 'examples' as const, icon: 'symbol-field', label: 'Examples', color: '#f59e0b' },
                                { id: 'errors' as const, icon: 'error', label: 'Error Responses', color: '#f59e0b' }
                            ] as const).map((tab) => {
                                const count = tab.id === 'summaries' ? aiReadinessData.summariesComplete.missing?.length || 0 :
                                    tab.id === 'descriptions' ? aiReadinessData.descriptionsComplete.missing?.length || 0 :
                                    tab.id === 'examples' ? aiReadinessData.schemasWithExamples.missing?.length || 0 :
                                    aiReadinessData.errorResponsesDefined.missing?.length || 0;
                                const isActive = activeTab === tab.id;
                                return (
                                    <ModalTabButton
                                        key={tab.id}
                                        type="button"
                                        $active={isActive}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        <Codicon name={tab.icon} sx={{ fontSize: '14px', color: tab.color }} />
                                        {tab.label}
                                        {count > 0 && (
                                            <TabCountPill>
                                                {count}
                                            </TabCountPill>
                                        )}
                                    </ModalTabButton>
                                );
                            })}
                        </ModalTabsRow>

                        <ModalBodyScroll>
                            {(() => {
                                const missing = activeTab === 'summaries' ? aiReadinessData.summariesComplete.missing :
                                    activeTab === 'descriptions' ? aiReadinessData.descriptionsComplete.missing :
                                    activeTab === 'examples' ? aiReadinessData.schemasWithExamples.missing :
                                    aiReadinessData.errorResponsesDefined.missing;

                                if (!missing || missing.length === 0) {
                                    return (
                                        <ReadinessEmptyState>
                                            <ReadinessEmptyEmoji>✓</ReadinessEmptyEmoji>
                                            <ReadinessEmptyMessage>
                                                All {activeTab} are complete!
                                            </ReadinessEmptyMessage>
                                        </ReadinessEmptyState>
                                    );
                                }

                                const getLabel = (tab: string) => {
                                    switch (tab) {
                                        case 'summaries': return 'Summaries';
                                        case 'descriptions': return 'Descriptions';
                                        case 'examples': return 'Examples';
                                        case 'errors': return 'Error Responses';
                                        default: return tab;
                                    }
                                };

                                return (
                                    <MissingListStack>
                                        {/* Fix All button */}
                                        {missing.length > 0 && (
                                            <FixAllToolbar>
                                                <NoWrapAIButton
                                                    isAvailable={isAIAvailable && !!fileUri && !!aiReadinessRuleset}
                                                    onClick={() => {
                                                        // Build fileUrl from sourceFolder and fileName, converting GitHub URLs to raw URLs
                                                        const buildFileUrl = (sourceFolder: string, fileName: string): string => {
                                                            if (!sourceFolder || !fileName) {
                                                                return '';
                                                            }
                                                            
                                                            // If it's a GitHub URL, convert to raw URL
                                                            if (sourceFolder.includes('github.com')) {
                                                                // Check if it's already a raw URL
                                                                if (sourceFolder.includes('raw.githubusercontent.com')) {
                                                                    return `${sourceFolder}/${fileName}`.replace(/\/+/g, '/');
                                                                }
                                                                
                                                                // Convert GitHub web URL to raw URL
                                                                // Pattern: https://github.com/owner/repo/tree/branch/path
                                                                // To: https://raw.githubusercontent.com/owner/repo/branch/path
                                                                const match = sourceFolder.match(/github\.com\/([^\/]+)\/([^\/]+)\/(?:blob|tree)\/([^\/]+)(?:\/(.+))?/);
                                                                if (match) {
                                                                    const [, owner, repo, branch, folderPath] = match;
                                                                    const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;
                                                                    const fullPath = folderPath 
                                                                        ? `${rawBase}/${folderPath}/${fileName}`.replace(/\/+/g, '/')
                                                                        : `${rawBase}/${fileName}`;
                                                                    return fullPath;
                                                                }
                                                            }
                                                            
                                                            // For local paths or other URLs, just concatenate
                                                            return `${sourceFolder}/${fileName}`.replace(/\/+/g, '/');
                                                        };
                                                        
                                                        const fileUrl = buildFileUrl(aiReadinessRuleset.sourceFolder, aiReadinessRuleset.fileName);
                                                        
                                                        if (!fileUrl) {
                                                            return;
                                                        }
                                                        
                                                        const prompt = `Fix all missing ${getLabel(activeTab).toLowerCase()} in the OpenAPI specification.

IMPORTANT: You must use the #validateWithSpectralRuleset MCP tool to discover and fix issues. Follow these steps:

1. call the validateWithSpectralRuleset tool with fileUri parameter pointing to the OpenAPI file, rulesetName: "${aiReadinessRuleset.name}", fileUrl: "${fileUrl}", and rulesetContentPath: "${aiReadinessRuleset.rulesetContentPath}" to discover all AI readiness issues
2. After fixing the issues, call validateWithSpectralRuleset again to verify the fix and discover remaining issues
3. Continue this process until validateWithSpectralRuleset reports no issues
`;
                                                        
                                                        openCopilotChat(
                                                            JSON.stringify({
                                                                fileUri: fileUri,
                                                                rulesetName: aiReadinessRuleset.name,
                                                                fileUrl: fileUrl,
                                                                rulesetContentPath: aiReadinessRuleset.rulesetContentPath,
                                                                fixMode: 'iterative',
                                                                issueType: 'ai-readiness',
                                                                category: activeTab
                                                            }),
                                                            prompt
                                                        );
                                                    }}
                                                    title="Fix All with AI"
                                                    label="Fix All with AI"
                                                />
                                            </FixAllToolbar>
                                        )}
                                        {missing.map((item, index) => {
                                            const pathStr = item.pathSegments && item.pathSegments.length > 0 
                                                ? ` at /${item.pathSegments.join('/')}` 
                                                : '';
                                            return (
                                                <MissingItemCard key={index}>
                                                    <MissingItemBody>
                                                        <MissingItemMessage $hasPath={!!pathStr}>
                                                            {item.message}
                                                        </MissingItemMessage>
                                                        {pathStr && (
                                                            <MissingItemPath>
                                                                {pathStr}
                                                            </MissingItemPath>
                                                        )}
                                                    </MissingItemBody>
                                                    {item.pathSegments && item.pathSegments.length > 0 && (
                                                        <NoWrapShrinkAIButton
                                                            onClick={() => {
                                                                triggerFix(item, activeTab);
                                                            }}
                                                            title="Fix with AI"
                                                            label="Fix with AI"
                                                        />
                                                    )}
                                                </MissingItemCard>
                                            );
                                        })}
                                    </MissingListStack>
                                );
                            })()}
                        </ModalBodyScroll>
                    </ModalPanel>
                </ModalOverlay>
            )}
        </PageColumn>
    );
};
