import React from 'react';
import styled from '@emotion/styled';
import { Codicon } from '@wso2/ui-toolkit';
import type { AiReadinessDimensionSummary } from '@wso2/api-designer-core';
import { getAiReadinessRuleSubBucket } from '@wso2/api-designer-core';
import { scoreColor } from '../hooks/useReport';

interface ViolationRow {
    id: string;
    rule: string;
    message: string;
    severity: string;
    path: string;
    endpoint: string;
    method: string;
}

interface Props {
    dimensions: AiReadinessDimensionSummary[];
    expandedKeys: Set<string>;
    onToggle: (key: string) => void;
    violations: ViolationRow[];
    onViewIssues: (subBucketKey?: string) => void;
}

// ── Accordion ─────────────────────────────────────────────────────────────

const Accordion = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const DimCard = styled.div`
    border-radius: 6px;
    overflow: hidden;
    background: color-mix(in srgb, var(--vscode-editorWidget-background) 88%, var(--vscode-editor-background));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--vscode-panel-border) 70%, transparent), 0 4px 12px rgba(0, 0, 0, 0.16);
`;

const DimHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    user-select: none;
    background: color-mix(in srgb, var(--vscode-editorGroupHeader-tabsBackground) 90%, var(--vscode-editor-background));

    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const DimScore = styled.div<{ $color: string }>`
    font-size: 18px;
    font-weight: 900;
    min-width: 48px;
    line-height: 1;
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
    flex-shrink: 0;
    color: ${({ $color }: { $color: string }) => $color};
`;

const DimMeta = styled.div`
    flex: 1;
    min-width: 0;
`;

const DimTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: var(--vscode-foreground);
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 7px;
`;

const DimIcon = styled.span`
    display: flex;
    align-items: center;
    opacity: 0.75;
    flex-shrink: 0;
`;

const DimDesc = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 8px;
    line-height: 1.5;
`;

const TagRow = styled.div`
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
`;

const Tag = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 2px 9px 2px 6px;
    background: var(--vscode-editor-background);
    display: inline-flex;
    align-items: center;
    gap: 5px;
`;


const DimRight = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
`;

const DimIssueCount = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
`;

const DimChevron = styled.div<{ $open: boolean }>`
    display: flex;
    align-items: center;
    color: var(--vscode-descriptionForeground);
    transform: rotate(${({ $open }: { $open: boolean }) => ($open ? '90deg' : '0deg')});
    transition: transform 0.18s ease;
`;

const DimBody = styled.div`
    border-top: 1px solid var(--vscode-panel-border);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--vscode-editorWidget-background));
`;

// ── Why it matters ────────────────────────────────────────────────────────

const WhyLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--vscode-foreground);
    opacity: 0.86;
    margin-bottom: 0;
`;

const WhyBlock = styled.div`
    margin-top: 4px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.6;
    background: var(--vscode-editorGroupHeader-tabsBackground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 10px 12px;
`;

// ── Sub-bucket grid ───────────────────────────────────────────────────────

const SubGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: 1100px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    @media (max-width: 700px) {
        grid-template-columns: 1fr;
    }
`;

const SubCard = styled.div`
    background: var(--vscode-editorGroupHeader-tabsBackground);
    border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 82%, transparent);
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--vscode-editorWidget-background) 68%, transparent), 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const SubTop = styled.div`
    display: flex;
    align-items: baseline;
    margin-bottom: 2px;
`;

const SubScore = styled.div<{ $color: string }>`
    font-size: 15px;
    font-weight: 900;
    min-width: 46px;
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
    flex-shrink: 0;
    color: ${({ $color }: { $color: string }) => $color};
`;

const SubName = styled.div`
    font-size: 12px;
    font-weight: 700;
    color: var(--vscode-foreground);
    flex: 1;
`;

const SubStatus = styled.div<{ $passing: boolean }>`
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    color: ${({ $passing }: { $passing: boolean }) =>
        $passing ? 'var(--vscode-testing-iconPassed, #10B981)' : 'var(--vscode-editorWarning-foreground)'};
`;

const SubDesc = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin: 4px 0 10px 46px;
    line-height: 1.5;
`;

const BarRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const Bar = styled.div`
    flex: 1;
    height: 4px;
    background: var(--vscode-input-background);
    border-radius: 2px;
    overflow: hidden;
`;

const BarFill = styled.div<{ $width: number; $color: string }>`
    width: ${({ $width }: { $width: number }) => Math.max(0, Math.min(100, $width))}%;
    height: 100%;
    border-radius: 2px;
    background: ${({ $color }: { $color: string }) => $color};
`;

const ViewBtn = styled.button`
    font-size: 11px;
    color: var(--vscode-textLink-foreground);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: inherit;
    white-space: nowrap;
    &:hover { text-decoration: underline; }
`;

// ── Main export ───────────────────────────────────────────────────────────

export const AIReadinessBucketGrid: React.FC<Props> = ({
    dimensions,
    expandedKeys,
    onToggle,
    violations,
    onViewIssues,
}) => (
    <Accordion>
        {dimensions.map((dimension) => {
            const isOpen = expandedKeys.has(dimension.key);
            const roundedScore = Math.round(dimension.score);
            const pctColor = scoreColor(dimension.score);
            const totalIssues = dimension.subBuckets.reduce((sum, s) => sum + (s.total || 0), 0);
            const issueLabel = totalIssues > 0
                ? `${totalIssues} issue${totalIssues !== 1 ? 's' : ''}`
                : 'All passing';

            // Sort sub-buckets: failing first, then ascending score
            const sortedBuckets = dimension.subBuckets.slice().sort((a, b) => {
                const aFail = a.total > 0 ? 0 : 1;
                const bFail = b.total > 0 ? 0 : 1;
                if (aFail !== bFail) return aFail - bFail;
                return a.percentage - b.percentage;
            });

            return (
                <DimCard key={dimension.key}>
                    <DimHeader onClick={() => onToggle(dimension.key)} role="button" aria-expanded={isOpen}>
                        <DimScore $color={pctColor}>{roundedScore}%</DimScore>
                        <DimMeta>
                            <DimTitle>
                                <DimIcon>
                                    <Codicon name={dimension.icon as any} sx={{ fontSize: '15px' }} />
                                </DimIcon>
                                {dimension.label}
                            </DimTitle>
                            <DimDesc>{dimension.description}</DimDesc>
                            <TagRow>
                                {sortedBuckets.map((sub) => {
                                    return (
                                        <Tag key={sub.key}>
                                            {sub.label}
                                        </Tag>
                                    );
                                })}
                            </TagRow>
                        </DimMeta>
                        <DimRight>
                            <DimIssueCount>{issueLabel}</DimIssueCount>
                            <DimChevron $open={isOpen}>
                                <Codicon name="chevron-right" sx={{ fontSize: '13px' }} />
                            </DimChevron>
                        </DimRight>
                    </DimHeader>

                    {isOpen && (
                        <DimBody>
                            {dimension.whyItMatters && (
                                <>
                                    <WhyLabel>Why this matters</WhyLabel>
                                    <WhyBlock>{dimension.whyItMatters}</WhyBlock>
                                </>
                            )}
                            <SubGrid>
                                {sortedBuckets.map((sub) => (
                                    <SubBucketCard
                                        key={sub.key}
                                        sub={sub}
                                        violations={violations}
                                        onViewIssues={onViewIssues}
                                    />
                                ))}
                            </SubGrid>
                        </DimBody>
                    )}
                </DimCard>
            );
        })}
    </Accordion>
);

// ── Sub-bucket card ───────────────────────────────────────────────────────

interface SubBucketItem {
    key: string;
    label: string;
    description?: string;
    percentage: number;
    total: number;
    filled: number;
}

const SubBucketCard: React.FC<{
    sub: SubBucketItem;
    violations: ViolationRow[];
    onViewIssues: (key?: string) => void;
}> = ({ sub, violations, onViewIssues }) => {
    const subPct = Math.round(sub.percentage ?? (sub.total === 0 ? 100 : 0));
    const subColor = scoreColor(subPct);
    const issueCount = React.useMemo(
        () => violations.filter((v) => getAiReadinessRuleSubBucket(v.rule) === sub.key).length,
        [violations, sub.key]
    );
    const passing = issueCount === 0;

    return (
        <SubCard>
            <SubTop>
                <SubScore $color={subColor}>{subPct}%</SubScore>
                <SubName>{sub.label}</SubName>
                <SubStatus $passing={passing}>
                    {passing ? '✓ passing' : `${issueCount} issue${issueCount !== 1 ? 's' : ''}`}
                </SubStatus>
            </SubTop>
            {sub.description && <SubDesc>{sub.description}</SubDesc>}
            <BarRow>
                <Bar>
                    <BarFill $width={subPct} $color={subColor} />
                </Bar>
                {!passing && (
                    <ViewBtn onClick={() => onViewIssues(sub.key)}>View issues</ViewBtn>
                )}
            </BarRow>
        </SubCard>
    );
};
