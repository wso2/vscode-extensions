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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { Typography } from '@wso2/ui-toolkit';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { SpectralRuleset, GovernanceViolation } from '@wso2/api-designer-core';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { normalizeGovernanceViolation } from '../../../types/violations';
import { RulesetCard } from './RulesetCard';
import { ViolationsModal } from './ViolationsModal';

interface GovernanceDashboardProps {
    fileUri: string;
    refreshToken?: number;
}

const getRulesetDisplay = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('owasp') || lowerName.includes('security')) {
        return { icon: '🔒', badgeLabel: 'SECURE' };
    } else if (lowerName.includes('design') && lowerName.includes('guideline')) {
        return { icon: '📐', badgeLabel: 'COMPLIANT' };
    } else if (lowerName.includes('management') || lowerName.includes('api management')) {
        return { icon: '⚙️', badgeLabel: 'COMPLIANT' };
    }
    return { icon: '📋', badgeLabel: 'COMPLIANT' };
};

const PageStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
    width: 100%;
    box-sizing: border-box;
`;

const ComplianceHeaderBar = styled.div`
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    width: 100%;
    box-sizing: border-box;
`;

const CenteredEmpty = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    text-align: center;
    gap: 16px;
`;

const EmptyEmoji = styled.div`
    font-size: 48px;
    opacity: 0.5;
`;

const EmptyMessage = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 14px;
    max-width: 500px;
`;

const ErrorBanner = styled.div`
    padding: 16px;
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    border-radius: 4px;
    color: var(--vscode-errorForeground);
`;

const RulesGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(90%, 460px), 1fr));
    gap: 24px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
`;

export const GovernanceDashboard: React.FC<GovernanceDashboardProps> = ({ fileUri, refreshToken }) => {
    const { rpcClient } = useVisualizerContext();
    const [dashboardData, setDashboardData] = useState<Map<string, any>>(new Map());
    const [specContent, setSpecContent] = useState<string>('');
    const governanceRulesetsRef = useRef<SpectralRuleset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [noConfig, setNoConfig] = useState(false);
    const [violationsModalOpen, setViolationsModalOpen] = useState(false);
    const [selectedRuleset, setSelectedRuleset] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'error' | 'warn' | 'info' | 'rules' | 'passed'>('error');
    const prevFileUriRef = useRef<string | null>(null);

    const loadGovernanceRuleset = useCallback(async (ruleset: SpectralRuleset) => {
        if (!rpcClient || !ruleset?.name || !fileUri) {
            return;
        }

        const name = ruleset.name;

        try {
            const display = getRulesetDisplay(name);

            const result = await rpcClient.getApiDesignerVisualizerRpcClient().getGovernance({
                filePath: fileUri,
                name,
                ruleset
            });

            const normalizedViolations = (result.violations || []).map(normalizeGovernanceViolation);

            setDashboardData(prev => {
                const next = new Map(prev);
                next.set(name, {
                    ...result,
                    violations: normalizedViolations,
                    icon: display.icon,
                    badgeLabel: display.badgeLabel
                });
                return next;
            });
        } catch (err: unknown) {
            // Error handled by catch block
        }
    }, [fileUri, rpcClient]);

    const fetchDashboardData = useCallback(async () => {
        if (!rpcClient) {
            setError('RPC client not available');
            setLoading(false);
            return;
        }

        if (!fileUri || fileUri === 'file:///placeholder') {
            setError('Invalid file path');
            setLoading(false);
            return;
        }
        
        try {
            const isNewFile = fileUri !== prevFileUriRef.current;
            prevFileUriRef.current = fileUri;

            setLoading(true);
            setError(null);
            setNoConfig(false);
            if (isNewFile) {
            setDashboardData(new Map());
            }
            const rulesetsResponse = await rpcClient.getApiDesignerVisualizerRpcClient().getApplicableRulesets({ 
                filePath: fileUri 
            });

            const { governanceRulesets } = rulesetsResponse;
            
            if (!governanceRulesets || governanceRulesets.length === 0) {
                setNoConfig(true);
                setLoading(false);
                return;
            }

            governanceRulesetsRef.current = governanceRulesets;

            await Promise.allSettled(
                governanceRulesets.map(async (ruleset: SpectralRuleset) => {
                    if (!ruleset || !ruleset.name) {
                        return;
                    }
                    await loadGovernanceRuleset(ruleset);
                })
            );
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load governance data';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [fileUri, rpcClient, loadGovernanceRuleset]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData, refreshToken]);

    useEffect(() => {
        const fetchSpecContent = async () => {
            if (!rpcClient || !fileUri || fileUri === 'file:///placeholder') {
                setSpecContent('');
                return;
            }

            try {
                const response = await rpcClient.getApiDesignerVisualizerRpcClient().getAPISpecContent({
                    filePath: fileUri
                });
                setSpecContent(response?.content || '');
            } catch {
                setSpecContent('');
            }
        };

        fetchSpecContent();
    }, [rpcClient, fileUri, refreshToken]);

    const openCopilotChat = (context: string, prompt: string) => {
        postVSCodeMessage({
            command: 'openCopilotChat',
            data: { context, prompt }
        });
    };

    if (!fileUri || fileUri === 'file:///placeholder') {
        return null;
    }

    const complianceHeader = (
        <ComplianceHeaderBar>
            <Typography variant="body1" sx={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--vscode-foreground)' }}>
                Compliance Analysis
            </Typography>
        </ComplianceHeaderBar>
    );

    if (loading && dashboardData.size === 0 && !noConfig && !error) {
        return (
            <PageStack>
                {complianceHeader}
                <LoadingOverlay message="Loading governance data..." />
            </PageStack>
        );
    }

    if (noConfig) {
        return (
            <PageStack>
                {complianceHeader}
                <CenteredEmpty>
                    <EmptyEmoji>⚙️</EmptyEmoji>
                    <EmptyMessage>
                        <strong>No API project initialized</strong>
                        <br />
                        Click "Initialize API Project" above to set up your project with governance rulesets.
                    </EmptyMessage>
                </CenteredEmpty>
            </PageStack>
        );
    }

    if (error) {
        return (
            <PageStack>
                {complianceHeader}
                <ErrorBanner>{error}</ErrorBanner>
            </PageStack>
        );
    }

    if (dashboardData.size === 0) {
        return (
            <PageStack>
                {complianceHeader}
                <CenteredEmpty>
                    <EmptyEmoji>📋</EmptyEmoji>
                    <EmptyMessage>
                        <strong>No rulesets configured</strong>
                        <br />
                        Click "Update API Project" above to add governance rulesets for your API.
                    </EmptyMessage>
                </CenteredEmpty>
            </PageStack>
        );
    }

    return (
        <PageStack>
            {complianceHeader}

            <RulesGrid>
                {Array.from(dashboardData.entries()).map(([name, data]) => {
                    const openModal = (tab: 'overview' | 'error' | 'warn' | 'info' | 'rules' | 'passed' = 'error') => {
                        setActiveTab(tab);
                        setSelectedRuleset(name);
                        setViolationsModalOpen(true);
                    };

                    return (
                        <RulesetCard
                            key={name}
                            name={name}
                            data={data}
                            onOpenModal={openModal}
                        />
                    );
                })}
            </RulesGrid>

            {violationsModalOpen && selectedRuleset && dashboardData.has(selectedRuleset) && (() => {
                const selectedRulesetData = governanceRulesetsRef.current.find(r => r.name === selectedRuleset);
                // Build fileUrl from sourceFolder and fileName, converting GitHub URLs to raw URLs
                const fileUrl = selectedRulesetData ? (() => {
                    const { sourceFolder, fileName } = selectedRulesetData;
                    if (!sourceFolder || !fileName) {
                        return undefined;
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
                })() : undefined;
                return (
                    <ViolationsModal
                        isOpen={violationsModalOpen}
                        rulesetName={selectedRuleset}
                        data={dashboardData.get(selectedRuleset)!}
                        specContent={specContent}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        onClose={() => {
                            setViolationsModalOpen(false);
                            setSelectedRuleset(null);
                        }}
                        fileUri={fileUri}
                        ruleset={selectedRulesetData ? {
                            fileUrl: fileUrl,
                            rulesetContentPath: selectedRulesetData.rulesetContentPath
                        } : undefined}
                    />
                );
            })()}
        </PageStack>
    );
};
