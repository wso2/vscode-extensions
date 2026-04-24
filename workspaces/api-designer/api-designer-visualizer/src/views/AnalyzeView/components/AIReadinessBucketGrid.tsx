import React from 'react';
import styled from '@emotion/styled';
import { Codicon } from '@wso2/ui-toolkit';
import { AI_READINESS_TOP_BUCKETS, AI_READINESS_SUB_BUCKET_WEIGHTS, AITopBucket } from './AnalyzeSingleReportHelpers';
import { AIReadinessBucketDetail } from './AIReadinessBucketDetail';
import { scoreColor } from '../hooks/useReport';

interface AiBucketSummaryItem {
    key: string;
    label: string;
    filled: number;
    total: number;
    percentage: number;
    rules?: Array<{ key: string; label: string; filled: number; total: number; percentage: number }>;
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
    subBuckets: AiBucketSummaryItem[];
    expandedKeys: Set<string>;
    onToggle: (key: string) => void;
    violations: ViolationRow[];
    onViewIssues: () => void;
}

interface TopBucketData extends AITopBucket {
    score: number;
    activeSubBuckets: AiBucketSummaryItem[];
}

function computeTopBuckets(subBuckets: AiBucketSummaryItem[]): TopBucketData[] {
    const subMap = new Map(subBuckets.map((b) => [b.key, b]));
    return AI_READINESS_TOP_BUCKETS.map((topBucket) => {
        const active = topBucket.subBuckets
            .map((key) => subMap.get(key))
            .filter((b): b is AiBucketSummaryItem => !!b && b.total > 0);
        const { weightedSum, totalWeight } = active.reduce(
            (acc, b) => {
                const weight = AI_READINESS_SUB_BUCKET_WEIGHTS[b.key] ?? 1;
                return {
                    weightedSum: acc.weightedSum + (b.percentage * weight),
                    totalWeight: acc.totalWeight + weight,
                };
            },
            { weightedSum: 0, totalWeight: 0 }
        );
        const score = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
        return { ...topBucket, score, activeSubBuckets: active };
    });
}

const Grid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px;
`;

const CardWrapper = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    overflow: hidden;
`;

const Card = styled.div<{ $selected: boolean }>`
    background: var(--vscode-editorWidget-background);
    border-bottom: ${({ $selected }: { $selected: boolean }) => $selected ? '1px solid var(--vscode-panel-border)' : 'none'};
    padding: 14px;
    cursor: pointer;
    transition: background 120ms ease;

    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const CardMain = styled.div`
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 12px;
`;

const CardPercentCol = styled.div`
    flex-shrink: 0;
    min-width: 3.25em;
    padding-top: 1px;
`;

const CardPercent = styled.div<{ $color: string }>`
    font-size: 22px;
    font-weight: 700;
    line-height: 1.1;
    color: ${({ $color }: { $color: string }) => $color};
    font-variant-numeric: tabular-nums;
`;

const CardBody = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const CardTitleGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
`;

const CardIcon = styled.div`
    color: var(--vscode-descriptionForeground);
    display: flex;
    align-items: center;
    font-size: 14px;
    flex-shrink: 0;
`;

const CardTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const CardDescription = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
`;

const ChipRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
`;

const Chip = styled.div`
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    border-radius: 4px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

export const AIReadinessBucketGrid: React.FC<Props> = ({
    subBuckets,
    expandedKeys,
    onToggle,
    violations,
    onViewIssues,
}) => {
    const topBuckets = React.useMemo(() => computeTopBuckets(subBuckets), [subBuckets]);

    return (
        <Grid>
            {topBuckets.map((bucket) => {
                const isSelected = expandedKeys.has(bucket.key);
                const roundedScore = Math.round(bucket.score);
                const pctColor = scoreColor(bucket.score);

                return (
                    <CardWrapper key={bucket.key}>
                        <Card
                            $selected={isSelected}
                            onClick={() => onToggle(bucket.key)}
                            role="button"
                            aria-expanded={isSelected}
                        >
                            <CardMain>
                                <CardPercentCol>
                                    <CardPercent $color={pctColor} aria-label={`${roundedScore} percent`}>
                                        {roundedScore}%
                                    </CardPercent>
                                </CardPercentCol>
                                <CardBody>
                                    <CardTitleGroup>
                                        <CardIcon>
                                            <Codicon name={bucket.icon as any} sx={{ fontSize: '14px' }} />
                                        </CardIcon>
                                        <CardTitle>{bucket.label}</CardTitle>
                                    </CardTitleGroup>
                                    <CardDescription>{bucket.description}</CardDescription>
                                    <ChipRow>
                                        {bucket.activeSubBuckets.map((sub) => (
                                            <Chip key={sub.key}>{sub.label}</Chip>
                                        ))}
                                    </ChipRow>
                                </CardBody>
                            </CardMain>
                        </Card>

                        {isSelected && (
                            <AIReadinessBucketDetail
                                bucket={bucket}
                                subBuckets={bucket.activeSubBuckets}
                                violations={violations}
                                onViewIssues={onViewIssues}
                            />
                        )}
                    </CardWrapper>
                );
            })}
        </Grid>
    );
};
