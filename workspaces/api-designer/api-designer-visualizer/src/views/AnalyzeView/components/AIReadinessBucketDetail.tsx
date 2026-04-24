import React from 'react';
import styled from '@emotion/styled';
import { Codicon } from '@wso2/ui-toolkit';
import type { AiReadinessDimensionSummary } from '@wso2/api-designer-core';
import { formatAiReadinessRuleLabel, getAiReadinessRuleSubBucket } from '@wso2/api-designer-core';

interface RuleStat {
    key: string;
    label: string;
    filled: number;
    total: number;
    percentage: number;
}

interface AiBucketSummaryItem {
    key: string;
    label: string;
    filled: number;
    total: number;
    percentage: number;
    rules?: RuleStat[];
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
    onViewIssues: () => void;
}

interface FailingPath {
    display: string;
    isEndpoint: boolean;
}

interface RuleSummary {
    rule: string;
    label: string;
    count: number;
    paths: FailingPath[];
    passed: boolean;
}

function extractFailingPath(v: ViolationRow): FailingPath {
    const display = v.path && v.path !== 'Unknown path' ? v.path : v.message;
    return { display, isEndpoint: false };
}

function buildRuleSummaries(
    violations: ViolationRow[],
    subBucketKey: string,
    rules?: RuleStat[]
): RuleSummary[] {
    const map = new Map<string, { count: number; paths: FailingPath[] }>();
    violations.forEach((v) => {
        if (getAiReadinessRuleSubBucket(v.rule) !== subBucketKey) return;
        const cur = map.get(v.rule) ?? { count: 0, paths: [] };
        cur.count++;
        // Deduplicate paths by display string
        const fp = extractFailingPath(v);
        if (!cur.paths.some((p) => p.display === fp.display)) {
            cur.paths.push(fp);
        }
        map.set(v.rule, cur);
    });
    const fromRules = (rules ?? []).map((ruleStat) => {
        const violationData = map.get(ruleStat.key) ?? { count: 0, paths: [] };
        return {
            rule: ruleStat.key,
            label: ruleStat.label || formatAiReadinessRuleLabel(ruleStat.key),
            count: violationData.count,
            paths: violationData.paths,
            passed: violationData.count === 0,
        };
    });

    // Fallback for any violations whose rules were not included in backend rule stats.
    const extras = Array.from(map.entries())
        .filter(([rule]) => !(rules ?? []).some((r) => r.key === rule))
        .map(([rule, { count, paths }]) => ({
            rule,
            label: formatAiReadinessRuleLabel(rule),
            count,
            paths,
            passed: count === 0,
        }));

    return [...fromRules, ...extras].sort((a, b) => {
        if (a.passed !== b.passed) return a.passed ? 1 : -1;
        return b.count - a.count || a.label.localeCompare(b.label);
    });
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
    gap: 4px;
`;

const SubBucketRow = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    overflow: hidden;
    background: var(--vscode-editorWidget-background);
`;

const SubBucketHeader = styled.button<{ $expandable: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    background: none;
    border: none;
    cursor: ${({ $expandable }: { $expandable: boolean }) => $expandable ? 'pointer' : 'default'};
    text-align: left;

    &:hover {
        background: ${({ $expandable }: { $expandable: boolean }) => $expandable ? 'var(--vscode-list-hoverBackground)' : 'none'};
    }
`;

const SubBucketLabel = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground);
    flex: 1;
`;

const SubBucketMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
`;

const IssueCount = styled.span<{ $hasIssues: boolean }>`
    font-size: 11px;
    color: ${({ $hasIssues }: { $hasIssues: boolean }) =>
        $hasIssues ? 'var(--vscode-editorWarning-foreground)' : 'var(--vscode-testing-iconPassed, #22c55e)'};
    font-weight: 600;
`;

const ScoreText = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const ExpandIcon = styled.div<{ $open: boolean }>`
    color: var(--vscode-descriptionForeground);
    transform: rotate(${({ $open }: { $open: boolean }) => $open ? '90deg' : '0deg'});
    transition: transform 150ms ease;
    display: flex;
    align-items: center;
`;

const RuleGroupList = styled.div`
    border-top: 1px solid var(--vscode-panel-border);
`;

const RuleGroup = styled.div`
    border-bottom: 1px solid color-mix(in srgb, var(--vscode-panel-border) 50%, transparent);

    &:last-child {
        border-bottom: none;
    }
`;

const RuleGroupHeader = styled.button<{ $expandable: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px 7px 20px;
    background: none;
    border: none;
    cursor: ${({ $expandable }: { $expandable: boolean }) => $expandable ? 'pointer' : 'default'};
    text-align: left;

    &:hover {
        background: ${({ $expandable }: { $expandable: boolean }) => $expandable ? 'var(--vscode-list-hoverBackground)' : 'none'};
    }
`;

const RuleGroupLabel = styled.span`
    font-size: 11px;
    color: var(--vscode-foreground);
    flex: 1;
`;

const RuleGroupCount = styled.span<{ $passed: boolean }>`
    font-size: 11px;
    color: ${({ $passed }: { $passed: boolean }) =>
        $passed ? 'var(--vscode-testing-iconPassed, #22c55e)' : 'var(--vscode-descriptionForeground)'};
    font-weight: ${({ $passed }: { $passed: boolean }) => $passed ? 600 : 400};
    flex-shrink: 0;
`;

const RuleGroupExpandIcon = styled.div<{ $open: boolean }>`
    color: var(--vscode-descriptionForeground);
    transform: rotate(${({ $open }: { $open: boolean }) => $open ? '90deg' : '0deg'});
    transition: transform 150ms ease;
    display: flex;
    align-items: center;
`;

const PathList = styled.div`
    padding: 4px 0 6px 32px;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const PathItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace);
    padding: 1px 0;
`;


const MorePaths = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    padding: 2px 0;
    font-style: italic;
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
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

// ── Sub-components ────────────────────────────────────────────────────────

const MAX_PATHS_SHOWN = 6;

const RuleGroupItem: React.FC<{ rs: RuleSummary }> = ({ rs }) => {
    const [open, setOpen] = React.useState(false);
    const coverageLabel = rs.passed ? 'Passed' : `${rs.count}`;
    const canExpand = rs.paths.length > 0;

    return (
        <RuleGroup>
            <RuleGroupHeader $expandable={canExpand} onClick={() => canExpand && setOpen((v) => !v)} aria-expanded={open}>
                <RuleGroupExpandIcon $open={open}>
                    {canExpand && <Codicon name="chevron-right" sx={{ fontSize: '11px' }} />}
                </RuleGroupExpandIcon>
                <RuleGroupLabel>{rs.label}</RuleGroupLabel>
                <RuleGroupCount $passed={rs.passed}>{coverageLabel}</RuleGroupCount>
            </RuleGroupHeader>
            {open && canExpand && (
                <PathList>
                    {rs.paths.slice(0, MAX_PATHS_SHOWN).map((p, i) => (
                        <PathItem key={i}>{p.display}</PathItem>
                    ))}
                    {rs.paths.length > MAX_PATHS_SHOWN && (
                        <MorePaths>+{rs.paths.length - MAX_PATHS_SHOWN} more</MorePaths>
                    )}
                </PathList>
            )}
        </RuleGroup>
    );
};

const SubBucketRowComponent: React.FC<{
    sub: AiBucketSummaryItem;
    violations: ViolationRow[];
}> = ({ sub, violations }) => {
    const [open, setOpen] = React.useState(false);
    const ruleSummaries = React.useMemo(() => buildRuleSummaries(violations, sub.key, sub.rules), [violations, sub.key, sub.rules]);

    const issueCount = ruleSummaries.reduce((s, r) => s + r.count, 0);
    const hasIssues = issueCount > 0;

    // Coverage label: show "X of Y passing" if we have backend totals
    const coverageMeta = React.useMemo(() => {
        if (sub.rules && sub.rules.length > 0 && sub.total > 0) {
            return `${sub.filled} of ${sub.total} passing`;
        }
        return null;
    }, [sub.rules, sub.filled, sub.total]);

    return (
        <SubBucketRow>
            <SubBucketHeader
                $expandable={hasIssues}
                onClick={() => hasIssues && setOpen((v) => !v)}
                aria-expanded={open}
            >
                <SubBucketLabel>{sub.label}</SubBucketLabel>
                <SubBucketMeta>
                    {coverageMeta
                        ? <IssueCount $hasIssues={hasIssues}>{coverageMeta}</IssueCount>
                        : hasIssues
                            ? <IssueCount $hasIssues>{issueCount} {issueCount === 1 ? 'issue' : 'issues'}</IssueCount>
                            : <IssueCount $hasIssues={false}>✓ passing</IssueCount>
                    }
                    <ScoreText>{Math.round(sub.percentage)}%</ScoreText>
                </SubBucketMeta>
                {hasIssues && (
                    <ExpandIcon $open={open}>
                        <Codicon name="chevron-right" sx={{ fontSize: '12px' }} />
                    </ExpandIcon>
                )}
            </SubBucketHeader>
            {open && hasIssues && (
                <RuleGroupList>
                    {ruleSummaries.map((rs) => (
                        <RuleGroupItem key={rs.rule} rs={rs} />
                    ))}
                </RuleGroupList>
            )}
        </SubBucketRow>
    );
};

// ── Main component ────────────────────────────────────────────────────────

export const AIReadinessBucketDetail: React.FC<Props> = ({ dimension, violations, onViewIssues }) => {
    const subKeys = new Set(dimension.subBuckets.map((s) => s.key));
    const totalViolations = violations.filter((v) => {
        const sk = getAiReadinessRuleSubBucket(v.rule);
        return sk != null && subKeys.has(sk);
    }).length;

    return (
        <Container>
            <WhyBlock>{dimension.whyItMatters}</WhyBlock>

            <SubBucketList>
                {dimension.subBuckets.map((sub) => (
                    <SubBucketRowComponent
                        key={sub.key}
                        sub={sub}
                        violations={violations}
                    />
                ))}
            </SubBucketList>

            {totalViolations > 0 && (
                <Footer>
                    <ViewIssuesLink onClick={onViewIssues}>
                        View {totalViolations} {totalViolations === 1 ? 'issue' : 'issues'} in Issues tab
                        <Codicon name="arrow-right" sx={{ fontSize: '11px' }} />
                    </ViewIssuesLink>
                </Footer>
            )}
        </Container>
    );
};
