import React from 'react';
import styled from '@emotion/styled';
import { Codicon, LinkButton } from '@wso2/ui-toolkit';
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
    gap: 8px;
`;

const DimCard = styled.div`
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 70%, transparent);
    background: color-mix(in srgb, var(--vscode-editorWidget-background) 88%, var(--vscode-editor-background));
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.16);
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

const DimScore = styled.div<{ $color: string; $score: number }>`
    width: 44px;
    height: 44px;
    border-radius: 50%;
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
    line-height: 1;
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
    flex-shrink: 0;
    color: ${({ $color }: { $color: string }) => `color-mix(in srgb, ${$color} 86%, var(--vscode-foreground))`};
    background: conic-gradient(
        ${({ $color }: { $color: string; $score: number }) => `color-mix(in srgb, ${$color} 88%, transparent)`}
            ${({ $score }: { $color: string; $score: number }) => Math.max(0, Math.min(100, $score))}%,
        color-mix(in srgb, var(--vscode-panel-border) 65%, transparent) 0
    );

    &::after {
        content: '';
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        background: color-mix(in srgb, var(--vscode-editorWidget-background) 98%, transparent);
    }

    > span {
        position: relative;
        z-index: 1;
    }
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
    gap: 8px;
    flex-shrink: 0;
`;

const DimIssueCount = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
`;

const DimErrorCount = styled.span`
    color: var(--vscode-errorForeground);
`;

const DimWarningCount = styled.span`
    color: var(--vscode-editorWarning-foreground);
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
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SubCard = styled.div`
    background: var(--vscode-editorGroupHeader-tabsBackground);
    border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 82%, transparent);
    border-radius: 6px;
    padding: 9px 11px;
`;

const SubTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
`;

const SubMain = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const SubScorePill = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    height: 18px;
    border-radius: 999px;
    padding: 0 7px;
    font-size: 10px;
    font-weight: 700;
    color: ${({ $color }: { $color: string }) => `color-mix(in srgb, ${$color} 82%, var(--vscode-foreground))`};
    background: color-mix(in srgb, ${({ $color }: { $color: string }) => $color} 12%, transparent);
    border: 1px solid color-mix(in srgb, ${({ $color }: { $color: string }) => $color} 24%, var(--vscode-panel-border));
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
    flex-shrink: 0;
`;

const SubName = styled.div`
    font-size: 11px;
    font-weight: 700;
    color: var(--vscode-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const SubStatus = styled.div<{ $passing: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    color: ${({ $passing }: { $passing: boolean }) =>
        $passing ? 'var(--vscode-testing-iconPassed, #10B981)' : 'var(--vscode-editorWarning-foreground)'};
`;

const ErrorCount = styled.span`
    color: var(--vscode-errorForeground);
`;

const WarningCount = styled.span`
    color: var(--vscode-editorWarning-foreground);
`;

const SubDesc = styled.div`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.5;
    flex: 1;
    min-width: 0;
`;

const SubBottomRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 3px;
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
            const subBucketKeySet = new Set(dimension.subBuckets.map((subBucket) => subBucket.key));
            const { errorCount, warningCount } = violations.reduce((acc, violation) => {
                const subBucketKey = getAiReadinessRuleSubBucket(violation.rule);
                if (!subBucketKey || !subBucketKeySet.has(subBucketKey)) {
                    return acc;
                }
                const severity = (violation.severity || '').toLowerCase();
                if (severity === 'error') {
                    acc.errorCount += 1;
                } else if (severity === 'warn' || severity === 'warning') {
                    acc.warningCount += 1;
                }
                return acc;
            }, { errorCount: 0, warningCount: 0 });
            const hasFindings = errorCount > 0 || warningCount > 0;

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
                        <DimScore $color={pctColor} $score={roundedScore}>
                            <span>{roundedScore}%</span>
                        </DimScore>
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
                            <DimIssueCount>
                                {!hasFindings ? (
                                    'All passing'
                                ) : (
                                    <>
                                        {errorCount > 0 && <DimErrorCount>{errorCount} error{errorCount !== 1 ? 's' : ''}</DimErrorCount>}
                                        {warningCount > 0 && <DimWarningCount>{warningCount} warning{warningCount !== 1 ? 's' : ''}</DimWarningCount>}
                                    </>
                                )}
                            </DimIssueCount>
                            <DimChevron $open={isOpen}>
                                <Codicon name="chevron-right" sx={{ fontSize: '11px' }} />
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
    const { errorCount, warningCount } = React.useMemo(
        () => violations.reduce((acc, violation) => {
            if (getAiReadinessRuleSubBucket(violation.rule) !== sub.key) {
                return acc;
            }
            const severity = (violation.severity || '').toLowerCase();
            if (severity === 'error') {
                acc.errorCount += 1;
            } else if (severity === 'warn' || severity === 'warning') {
                acc.warningCount += 1;
            }
            return acc;
        }, { errorCount: 0, warningCount: 0 }),
        [violations, sub.key]
    );
    const passing = errorCount === 0 && warningCount === 0;
    return (
        <SubCard>
            <SubTop>
                <SubMain>
                    <SubScorePill $color={subColor}>{subPct}%</SubScorePill>
                    <SubName>{sub.label}</SubName>
                </SubMain>
                <SubStatus $passing={passing}>
                    {passing ? (
                        '✓ passing'
                    ) : (
                        <>
                            {errorCount > 0 && (
                                <ErrorCount>{errorCount} error{errorCount !== 1 ? 's' : ''}</ErrorCount>
                            )}
                            {warningCount > 0 && (
                                <WarningCount>{warningCount} warning{warningCount !== 1 ? 's' : ''}</WarningCount>
                            )}
                        </>
                    )}
                </SubStatus>
            </SubTop>
            <SubBottomRow>
                <SubDesc>{sub.description || ''}</SubDesc>
                <ViewBtn onClick={() => onViewIssues(sub.key)}>View issues</ViewBtn>
            </SubBottomRow>
        </SubCard>
    );
};
