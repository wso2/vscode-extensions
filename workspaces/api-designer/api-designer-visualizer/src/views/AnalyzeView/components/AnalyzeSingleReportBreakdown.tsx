import React from 'react';
import styled from '@emotion/styled';
import { Codicon } from '@wso2/ui-toolkit';
import type { AiReadinessDimensionSummary } from '@wso2/api-designer-core';
import { AnalyzeReportKey } from '../hooks/useReport';
import { BREAKDOWN_TITLES } from './AnalyzeSingleReportHelpers';
import { AIReadinessBucketGrid } from './AIReadinessBucketGrid';

interface ViolationRow {
    id: string;
    rule: string;
    message: string;
    severity: string;
    path: string;
    endpoint: string;
    method: string;
}

interface AnalyzeSingleReportBreakdownProps {
    reportKey: AnalyzeReportKey;
    aiReadinessDimensions: AiReadinessDimensionSummary[];
    totalRows: number;
    violations: ViolationRow[];
    expandedBucketKeys: Set<string>;
    onToggleBucket: (key: string) => void;
    onViewIssues: (subBucketKey?: string) => void;
    onReevaluateLlm: () => void;
    unifiedCategories?: Array<{
        id: string;
        label: string;
        description?: string;
        total: number;
        errors: number;
        warnings: number;
        percentage: number;
        affectedEndpoints: number;
        docsUrl?: string;
        viewIssuesFilter: { key: string; label: string };
        topRules?: string[];
    }>;
    llmValidation?: {
        status: 'pending' | 'ready' | 'failed' | 'stale';
        result?: { score?: number; findings?: unknown[] };
        error?: string;
    };
}

const SectionBlock = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 10px;
    background: var(--vscode-editor-background);
    overflow: hidden;
`;

const SectionHeader = styled.div`
    padding: 10px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editorGroupHeader-tabsBackground);
`;

const SectionTitleText = styled.div`
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--vscode-foreground);
`;


const OwaspGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 14px;
`;

const ProgressTrack = styled.div`
    margin-top: 8px;
    height: 4px;
    border-radius: 2px;
    background: var(--vscode-panel-border);
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $width: number; $severity: 'error' | 'warn' }>`
    width: ${({ $width }: { $width: number }) => Math.min($width, 100)}%;
    height: 100%;
    border-radius: 2px;
    background: ${({ $severity }: { $severity: 'error' | 'warn' }) =>
        $severity === 'error' ? 'var(--vscode-errorForeground)' : 'var(--vscode-editorWarning-foreground)'};
`;

const OwaspIssueCard = styled.div<{ $dominantSeverity: 'error' | 'warn' }>`
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid ${({ $dominantSeverity }: { $dominantSeverity: 'error' | 'warn' }) =>
        $dominantSeverity === 'error' ? 'var(--vscode-errorForeground)' : 'var(--vscode-editorWarning-foreground)'};
    border-radius: 8px;
    background: var(--vscode-editorWidget-background);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const OwaspPassCard = styled.div`
    border: 1px solid color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 40%, var(--vscode-panel-border));
    border-radius: 8px;
    background: color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 8%, transparent);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
`;

const OwaspPassIcon = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--vscode-testing-iconPassed, #22c55e);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
    font-weight: 700;
`;

const OwaspPassCategoryId = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--vscode-testing-iconPassed, #22c55e);
`;

const OwaspPassCategoryName = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 70%, var(--vscode-foreground));
    margin-top: 2px;
`;

const OwaspPassSubtext = styled.div`
    font-size: 11px;
    color: color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 80%, var(--vscode-descriptionForeground));
    margin-top: 2px;
`;

const OwaspIssueHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
`;

const OwaspCategoryId = styled.div<{ $color: string }>`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ $color }: { $color: string }) => $color};
`;

const OwaspCategoryName = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: var(--vscode-foreground);
    line-height: 1.3;
    margin-top: 3px;
`;

const OwaspIssueCount = styled.div<{ $color: string }>`
    font-size: 28px;
    font-weight: 800;
    line-height: 1;
    color: ${({ $color }: { $color: string }) => $color};
    text-align: right;
`;

const OwaspIssueCountLabel = styled.div<{ $color: string }>`
    font-size: 11px;
    color: ${({ $color }: { $color: string }) => $color};
    text-align: right;
`;

const OwaspFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const OwaspDocsLink = styled.a`
    font-size: 11px;
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
    &:hover { text-decoration: underline; }
`;

const Wso2Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 14px;
`;

const Wso2CategoryName = styled.div`
    margin-top: 2px;
    font-size: 13px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const Wso2Meta = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const Wso2RuleList = styled.div`
    margin-top: 2px;
    font-size: 11px;
    color: var(--vscode-foreground);
`;

const Wso2PassRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Wso2PassIcon = styled.span`
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: white;
    background: var(--vscode-testing-iconPassed, #22c55e);
`;

const Wso2Details = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const Wso2DetailsText = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const AiBreakdownStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
`;

const LlmTile = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    background: var(--vscode-editorWidget-background);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const LlmTitle = styled.div`
    font-size: 12px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const LlmMeta = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const ReevaluateButton = styled.button`
    width: fit-content;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    font-size: 11px;
    &:hover {
        background: var(--vscode-button-secondaryHoverBackground);
    }
`;

const ViewIssuesLink = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: none;
    border: none;
    padding: 0;
    font-size: 12px;
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
    font-family: inherit;
    &:hover {
        text-decoration: underline;
    }
`;

export const AnalyzeSingleReportBreakdown: React.FC<AnalyzeSingleReportBreakdownProps> = ({
    reportKey,
    aiReadinessDimensions,
    totalRows,
    violations,
    expandedBucketKeys,
    onToggleBucket,
    onViewIssues,
    onReevaluateLlm,
    unifiedCategories,
    llmValidation,
}) => {
    const categoriesFromBackend = React.useMemo(() => unifiedCategories || [], [unifiedCategories]);
    const llmLabel = React.useMemo(() => {
        if (!llmValidation || llmValidation.status === 'pending') return 'Running in background...';
        if (llmValidation.status === 'stale') return llmValidation.error || 'OpenAPI spec changed. Re-evaluate to refresh.';
        if (llmValidation.status === 'failed') return llmValidation.error || 'Validation failed';
        const count = llmValidation.result?.findings?.length || 0;
        return `${count} findings`;
    }, [llmValidation]);

    return (
        <SectionBlock>
            <SectionHeader>
                <SectionTitleText>{BREAKDOWN_TITLES[reportKey]}</SectionTitleText>
            </SectionHeader>
            {reportKey === 'ai-readiness' ? (
                <AiBreakdownStack>
                    <LlmTile>
                        <LlmTitle>LLM AI Readiness Validation</LlmTitle>
                        <LlmMeta>
                            {llmValidation?.status === 'ready'
                                ? `Score ${llmValidation.result?.score ?? 0}/100 - ${llmLabel}`
                                : llmLabel}
                        </LlmMeta>
                        {llmValidation?.status === 'ready' && (
                            <ViewIssuesLink onClick={() => onViewIssues('llm-validation')}>
                                View issues
                                <Codicon name="arrow-right" sx={{ fontSize: '11px' }} />
                            </ViewIssuesLink>
                        )}
                        {(llmValidation?.status === 'stale' || llmValidation?.status === 'failed') && (
                            <ReevaluateButton onClick={onReevaluateLlm}>Re-evaluate</ReevaluateButton>
                        )}
                    </LlmTile>
                    <AIReadinessBucketGrid
                        dimensions={aiReadinessDimensions}
                        expandedKeys={expandedBucketKeys}
                        onToggle={onToggleBucket}
                        violations={violations}
                        onViewIssues={onViewIssues}
                    />
                </AiBreakdownStack>
            ) : reportKey === 'wso2-rest' ? (
                <Wso2Grid>
                    {categoriesFromBackend.map((cat) => {
                        if (cat.total === 0) {
                            return (
                                <OwaspPassCard key={cat.id}>
                                    <OwaspPassIcon>✓</OwaspPassIcon>
                                    <div>
                                        <OwaspPassCategoryId>{cat.label}</OwaspPassCategoryId>
                                        <OwaspPassCategoryName>{cat.description}</OwaspPassCategoryName>
                                        <OwaspPassSubtext>No issues found</OwaspPassSubtext>
                                    </div>
                                </OwaspPassCard>
                            );
                        }
                        const dominantSeverity = cat.errors > 0 ? 'error' as const : 'warn' as const;
                        const accentColor = cat.errors > 0
                            ? 'var(--vscode-errorForeground)'
                            : 'var(--vscode-editorWarning-foreground)';
                        const percentage = cat.percentage ?? (totalRows > 0 ? Math.round((cat.total / totalRows) * 100) : 0);
                        return (
                            <OwaspIssueCard key={cat.id} $dominantSeverity={dominantSeverity}>
                                <OwaspIssueHeader>
                                    <div>
                                        <OwaspCategoryId $color={accentColor}>{cat.label}</OwaspCategoryId>
                                        <OwaspCategoryName>{cat.description}</OwaspCategoryName>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <OwaspIssueCount $color={accentColor}>{cat.total}</OwaspIssueCount>
                                        <OwaspIssueCountLabel $color={accentColor}>issues</OwaspIssueCountLabel>
                                    </div>
                                </OwaspIssueHeader>
                                <ProgressTrack>
                                    <ProgressFill $width={percentage} $severity={dominantSeverity} />
                                </ProgressTrack>
                                <OwaspFooter>
                                    <Wso2Details>
                                        <Wso2DetailsText>{percentage}% of total issues</Wso2DetailsText>
                                        <Wso2DetailsText>{cat.affectedEndpoints} endpoints impacted</Wso2DetailsText>
                                    </Wso2Details>
                                    <ViewIssuesLink onClick={() => onViewIssues(cat.viewIssuesFilter.key)}>
                                        View issues
                                        <Codicon name="arrow-right" sx={{ fontSize: '11px' }} />
                                    </ViewIssuesLink>
                                </OwaspFooter>
                                <Wso2RuleList>
                                    Top failing rules: {cat.topRules && cat.topRules.length > 0 ? cat.topRules.join(', ') : 'No dominant rule'}
                                </Wso2RuleList>
                            </OwaspIssueCard>
                        );
                    })}
                </Wso2Grid>
            ) : (
                <OwaspGrid>
                    {categoriesFromBackend.map((cat) => {
                        const category = {
                            id: cat.id,
                            key: cat.viewIssuesFilter.key,
                            name: cat.label,
                            count: cat.total,
                            errors: cat.errors,
                            warnings: cat.warnings,
                            docsUrl: cat.docsUrl,
                            percentage: cat.percentage,
                        };
                        if (category.count === 0) {
                            return (
                                <OwaspPassCard key={category.id}>
                                    <OwaspPassIcon>✓</OwaspPassIcon>
                                    <div>
                                        <OwaspPassCategoryId>{category.id}</OwaspPassCategoryId>
                                        <OwaspPassCategoryName>{category.name}</OwaspPassCategoryName>
                                        <OwaspPassSubtext>No issues found</OwaspPassSubtext>
                                    </div>
                                </OwaspPassCard>
                            );
                        }
                        const dominantSeverity = category.errors > 0 ? 'error' as const : 'warn' as const;
                        const accentColor = category.errors > 0
                            ? 'var(--vscode-errorForeground)'
                            : 'var(--vscode-editorWarning-foreground)';
                        const percentage = category.percentage ?? (totalRows > 0 ? Math.round((category.count / totalRows) * 100) : 0);
                        return (
                            <OwaspIssueCard key={category.id} $dominantSeverity={dominantSeverity}>
                                <OwaspIssueHeader>
                                    <div>
                                        <OwaspCategoryId $color={accentColor}>{category.id}</OwaspCategoryId>
                                        <OwaspCategoryName>{category.name}</OwaspCategoryName>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <OwaspIssueCount $color={accentColor}>{category.count}</OwaspIssueCount>
                                        <OwaspIssueCountLabel $color={accentColor}>issues</OwaspIssueCountLabel>
                                    </div>
                                </OwaspIssueHeader>
                                <ProgressTrack>
                                    <ProgressFill $width={percentage} $severity={dominantSeverity} />
                                </ProgressTrack>
                                <OwaspFooter>
                                    <span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
                                        {percentage}% of total issues
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {category.docsUrl && (
                                            <OwaspDocsLink href={category.docsUrl} target="_blank" rel="noreferrer">
                                                Docs →
                                            </OwaspDocsLink>
                                        )}
                                        <ViewIssuesLink onClick={() => onViewIssues(category.key)}>
                                            View issues
                                            <Codicon name="arrow-right" sx={{ fontSize: '11px' }} />
                                        </ViewIssuesLink>
                                    </div>
                                </OwaspFooter>
                            </OwaspIssueCard>
                        );
                    })}
                </OwaspGrid>
            )}
        </SectionBlock>
    );
};
