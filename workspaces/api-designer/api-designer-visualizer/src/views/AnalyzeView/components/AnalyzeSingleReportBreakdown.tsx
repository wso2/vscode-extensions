import React from 'react';
import styled from '@emotion/styled';
import { AnalyzeReportKey, scoreColor } from '../hooks/useReport';
import { BREAKDOWN_TITLES } from './AnalyzeSingleReportHelpers';

interface BreakdownItem {
    id: string;
    key: string;
    name: string;
    count: number;
    errors: number;
    warnings: number;
    docsUrl?: string;
}

interface AiBucketSummaryItem {
    key: string;
    label: string;
    filled: number;
    total: number;
    percentage: number;
}

interface AnalyzeSingleReportBreakdownProps {
    reportKey: AnalyzeReportKey;
    aiBucketSummary: AiBucketSummaryItem[];
    breakdownSummary: BreakdownItem[];
    totalRows: number;
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

const AiBreakdownGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
    padding: 14px;
`;

const AiBreakdownTile = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const AiTileHead = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
`;

const AiTileLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--vscode-descriptionForeground);
`;

const AiTileFraction = styled.div`
    font-size: 17px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const AiTilePercent = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    text-align: right;
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

export const AnalyzeSingleReportBreakdown: React.FC<AnalyzeSingleReportBreakdownProps> = ({
    reportKey,
    aiBucketSummary,
    breakdownSummary,
    totalRows,
}) => (
    <SectionBlock>
        <SectionHeader>
            <SectionTitleText>{BREAKDOWN_TITLES[reportKey]}</SectionTitleText>
        </SectionHeader>
        {reportKey === 'ai-readiness' ? (
            <AiBreakdownGrid>
                {aiBucketSummary.map((bucket) => {
                    const color = scoreColor(bucket.percentage);
                    return (
                        <AiBreakdownTile key={bucket.key}>
                            <AiTileHead>
                                <AiTileLabel>{bucket.label}</AiTileLabel>
                                <AiTileFraction>{bucket.filled}/{bucket.total}</AiTileFraction>
                            </AiTileHead>
                            <ProgressTrack>
                                <ProgressFill $width={bucket.percentage} $severity={bucket.percentage < 60 ? 'error' : 'warn'} />
                            </ProgressTrack>
                            <AiTilePercent style={{ color }}>{Math.round(bucket.percentage)}%</AiTilePercent>
                        </AiBreakdownTile>
                    );
                })}
            </AiBreakdownGrid>
        ) : (
            <OwaspGrid>
                {breakdownSummary.map((cat) => {
                    if (cat.count === 0) {
                        return (
                            <OwaspPassCard key={cat.id}>
                                <OwaspPassIcon>✓</OwaspPassIcon>
                                <div>
                                    <OwaspPassCategoryId>{cat.id}</OwaspPassCategoryId>
                                    <OwaspPassCategoryName>{cat.name}</OwaspPassCategoryName>
                                    <OwaspPassSubtext>No issues found</OwaspPassSubtext>
                                </div>
                            </OwaspPassCard>
                        );
                    }
                    const dominantSeverity = cat.errors > 0 ? 'error' as const : 'warn' as const;
                    const accentColor = cat.errors > 0
                        ? 'var(--vscode-errorForeground)'
                        : 'var(--vscode-editorWarning-foreground)';
                    const percentage = totalRows > 0 ? Math.round((cat.count / totalRows) * 100) : 0;
                    return (
                        <OwaspIssueCard key={cat.id} $dominantSeverity={dominantSeverity}>
                            <OwaspIssueHeader>
                                <div>
                                    <OwaspCategoryId $color={accentColor}>{cat.id}</OwaspCategoryId>
                                    <OwaspCategoryName>{cat.name}</OwaspCategoryName>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <OwaspIssueCount $color={accentColor}>{cat.count}</OwaspIssueCount>
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
                                {cat.docsUrl && (
                                    <OwaspDocsLink href={cat.docsUrl} target="_blank" rel="noreferrer">
                                        Docs →
                                    </OwaspDocsLink>
                                )}
                            </OwaspFooter>
                        </OwaspIssueCard>
                    );
                })}
            </OwaspGrid>
        )}
    </SectionBlock>
);
