import React from 'react';
import styled from '@emotion/styled';
import { Codicon } from '@wso2/ui-toolkit';
import type { AiReadinessDimensionSummary } from '@wso2/api-designer-core';
import { AIReadinessBucketDetail } from './AIReadinessBucketDetail';
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
    onViewIssues: () => void;
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
    dimensions,
    expandedKeys,
    onToggle,
    violations,
    onViewIssues,
}) => (
    <Grid>
        {dimensions.map((dimension) => {
            const isSelected = expandedKeys.has(dimension.key);
            const roundedScore = Math.round(dimension.score);
            const pctColor = scoreColor(dimension.score);
            const activeSubBuckets = dimension.subBuckets.filter((b) => b.total > 0);

            return (
                <CardWrapper key={dimension.key}>
                    <Card
                        $selected={isSelected}
                        onClick={() => onToggle(dimension.key)}
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
                                        <Codicon name={dimension.icon as any} sx={{ fontSize: '14px' }} />
                                    </CardIcon>
                                    <CardTitle>{dimension.label}</CardTitle>
                                </CardTitleGroup>
                                <CardDescription>{dimension.description}</CardDescription>
                                <ChipRow>
                                    {activeSubBuckets.map((sub) => (
                                        <Chip key={sub.key}>{sub.label}</Chip>
                                    ))}
                                </ChipRow>
                            </CardBody>
                        </CardMain>
                    </Card>

                    {isSelected && (
                        <AIReadinessBucketDetail
                            dimension={dimension}
                            violations={violations}
                            onViewIssues={onViewIssues}
                        />
                    )}
                </CardWrapper>
            );
        })}
    </Grid>
);
