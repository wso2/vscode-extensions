import React from 'react';
import styled from '@emotion/styled';
import { Codicon } from '@wso2/ui-toolkit';
import type { AiReadinessDimensionSummary } from '@wso2/api-designer-core';
import { getAiReadinessRuleSubBucket } from '@wso2/api-designer-core';
import { scoreColor } from '../hooks/useReport';
import { ViewIssuesLink } from './ViewIssuesLink';

interface AiBucketSummaryItem {
    key: string;
    label: string;
    description?: string;
    filled: number;
    total: number;
    percentage: number;
}

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
    dimension: AiReadinessDimensionSummary;
    violations: ViolationRow[];
    onViewIssues: (subBucketKey?: string) => void;
}

// ── Styles ────────────────────────────────────────────────────────────────

const Container = styled.div`
    border-top: 1px solid var(--vscode-panel-border);
    padding: 16px 14px 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const WhyBlock = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.55;
    padding: 10px 12px;
    border-radius: 6px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
`;

const SubBucketList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SubBucketRow = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background: var(--vscode-editorWidget-background);
`;

const SubBucketHeader = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 12px;
`;

const SubBucketBody = styled.div`
    padding: 0 12px 10px;
`;

const SubBucketPercentCol = styled.div`
    flex-shrink: 0;
    min-width: 2.8em;
    padding-top: 1px;
`;

const SubBucketText = styled.div`
    flex: 1;
    min-width: 0;
`;

const SubBucketLabel = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground);
`;

const SubBucketDescription = styled.div`
    margin-top: 3px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
`;

const SubBucketProgressTrack = styled.div`
    flex: 1;
    height: 4px;
    border-radius: 999px;
    background: var(--vscode-input-background);
    overflow: hidden;
`;

const SubBucketProgressFill = styled.div<{ $width: number; $color: string }>`
    width: ${({ $width }: { $width: number }) => Math.min(Math.max($width, 0), 100)}%;
    height: 100%;
    border-radius: 999px;
    background: ${({ $color }: { $color: string }) => $color};
`;

const SubBucketProgressRow = styled.div`
    margin-top: 7px;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
`;

const SubBucketMeta = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-shrink: 0;
    min-width: 120px;
`;

const IssueCount = styled.span<{ $hasIssues: boolean }>`
    font-size: 11px;
    color: ${({ $hasIssues }: { $hasIssues: boolean }) =>
        $hasIssues ? 'var(--vscode-editorWarning-foreground)' : 'var(--vscode-testing-iconPassed, #22c55e)'};
    font-weight: 600;
    text-align: right;
`;

const ScoreText = styled.span<{ $color: string }>`
    font-size: 15px;
    font-weight: 700;
    line-height: 1.1;
    color: ${({ $color }: { $color: string }) => $color};
    font-variant-numeric: tabular-nums;
`;

const DetailViewIssuesLink = styled(ViewIssuesLink)`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
`;

const SubBucketRowComponent: React.FC<{
    sub: AiBucketSummaryItem;
    violations: ViolationRow[];
    onViewIssues: (subBucketKey?: string) => void;
}> = ({ sub, violations, onViewIssues }) => {
    const description = sub.description || '';
    const percentageColor = scoreColor(sub.percentage);
    const issueCount = React.useMemo(
        () => violations.filter((v) => getAiReadinessRuleSubBucket(v.rule) === sub.key).length,
        [violations, sub.key]
    );
    const hasIssues = issueCount > 0;
    const passSummary = sub.total > 0
        ? `${sub.filled} of ${sub.total} checks passing`
        : hasIssues
            ? `${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`
            : 'No issues';

    return (
        <SubBucketRow>
            <SubBucketHeader>
                <SubBucketPercentCol>
                    <ScoreText $color={percentageColor}>{Math.round(sub.percentage)}%</ScoreText>
                </SubBucketPercentCol>
                <SubBucketText>
                    <SubBucketLabel>{sub.label}</SubBucketLabel>
                    {description && <SubBucketDescription>{description}</SubBucketDescription>}
                </SubBucketText>
                <SubBucketMeta>
                    {hasIssues ? (
                        <IssueCount $hasIssues>{issueCount} {issueCount === 1 ? 'issue' : 'issues'}</IssueCount>
                    ) : (
                        <IssueCount $hasIssues={false}>✓ passing</IssueCount>
                    )}
                </SubBucketMeta>
            </SubBucketHeader>
            <SubBucketBody>
                <SubBucketProgressRow>
                    <SubBucketProgressTrack>
                        <SubBucketProgressFill
                            $width={Math.round(sub.percentage)}
                            $color={percentageColor}
                        />
                    </SubBucketProgressTrack>
                    {hasIssues && (
                        <DetailViewIssuesLink onClick={() => onViewIssues(sub.key)}>
                            View issues
                            <Codicon name="arrow-right" sx={{ fontSize: '11px' }} />
                        </DetailViewIssuesLink>
                    )}
                </SubBucketProgressRow>
            </SubBucketBody>
        </SubBucketRow>
    );
};

// ── Main component ────────────────────────────────────────────────────────

export const AIReadinessBucketDetail: React.FC<Props> = ({ dimension, violations, onViewIssues }) => {
    return (
        <Container>
            <WhyBlock>{dimension.whyItMatters}</WhyBlock>

            <SubBucketList>
                {dimension.subBuckets.map((sub) => (
                    <SubBucketRowComponent
                        key={sub.key}
                        sub={sub}
                        violations={violations}
                        onViewIssues={onViewIssues}
                    />
                ))}
            </SubBucketList>
        </Container>
    );
};
