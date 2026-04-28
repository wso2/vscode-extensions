import React from 'react';
import styled from '@emotion/styled';
import type { AiReadinessDimensionSummary } from '@wso2/api-designer-core';
import { AnalyzeReportKey, scoreColor } from '../hooks/useReport';
import {
    AIReadinessBucketGrid,
    Accordion,
    DimCard,
    DimScore,
    DimMeta,
    DimTitle,
    DimDesc,
    DimRight,
    DimIssueCount,
    DimErrorCount,
    DimWarningCount,
    FlatBreakdownHeader,
} from './AIReadinessBucketGrid';
import { postMessage } from '../../../utils/vscode-api';
import { Button } from '@wso2/ui-toolkit';
import { ViewIssuesLink } from './ViewIssuesLink';

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
    title?: string;
    subtitle?: string;
    llmReview?: {
        title?: string;
        subtitle?: string;
        viewFindingsLabel?: string;
        reevaluateLabel?: string;
    };
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
        updatedAt?: number;
    };
}

// ── Section shell ─────────────────────────────────────────────────────────

const Section = styled.div`
    margin-bottom: 4px;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding-bottom: 14px;
    margin-bottom: 18px;
    border-bottom: 2px solid var(--vscode-panel-border);
`;

const SectionHeading = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const SectionTitle = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: var(--vscode-foreground);
    letter-spacing: -0.01em;
    line-height: 1.2;
`;

const SectionSubtitle = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.5;
`;

const SectionBadge = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
    flex-shrink: 0;
`;

const TagRow = styled.div`
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 6px;
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

const CardMetaActions = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
`;

const CardLinksRow = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
`;

const CategoryTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const BreakdownEmpty = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    padding: 12px 0;
    line-height: 1.5;
`;

const DocsLink = styled.button`
    font-size: 11px;
    font-weight: 500;
    color: var(--vscode-textLink-foreground);
    display: inline-flex;
    align-items: center;
    gap: 3px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 2px 8px;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.12s, border-color 0.12s;

    &:hover {
        background: color-mix(in srgb, var(--vscode-textLink-foreground) 10%, transparent);
        border-color: var(--vscode-textLink-foreground);
    }
`;

const ExtLinkSvg = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 3, opacity: 0.7 }}>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

// ── AI Readiness LLM tile ─────────────────────────────────────────────────

const AiBreakdownStack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

// LLM tile is visually distinct from the dimension accordion cards:
// - Accent color background tint instead of flat surface
// - Top border instead of left border
// - "AI" badge to signal it's AI-powered, not a rule-based dimension
const LlmTile = styled.div<{ $statusColor: string }>`
    border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 82%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, ${({ $statusColor }: { $statusColor: string }) => $statusColor} 5%, var(--vscode-editorWidget-background));
    padding: 16px 20px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 18px;
    align-items: center;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--vscode-editorWidget-background) 72%, transparent), 0 4px 12px rgba(0, 0, 0, 0.14);
    position: relative;
`;

const LlmStatusIcon = styled.div<{ $color: string }>`
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: color-mix(in srgb, ${({ $color }: { $color: string }) => $color} 14%, transparent);
    border: 1.5px solid color-mix(in srgb, ${({ $color }: { $color: string }) => $color} 35%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${({ $color }: { $color: string }) => $color};
    font-size: 20px;
    flex-shrink: 0;
`;

const LlmInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const LlmTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const LlmTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const LlmSummary = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
`;

const LlmDetailsTip = styled.span`
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid var(--vscode-panel-border);
    color: var(--vscode-descriptionForeground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    cursor: help;
    user-select: none;
`;

const LlmStatusPill = styled.span<{ $color: string; $bg: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-radius: 4px;
    padding: 2px 8px;
    width: fit-content;
    color: ${({ $color }: { $color: string; $bg: string }) => $color};
    background: ${({ $bg }: { $color: string; $bg: string }) => $bg};

    &::before {
        content: '';
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        flex-shrink: 0;
    }
`;

const LlmActions = styled.div`
    display: flex;
    flex-direction: row;
    gap: 6px;
    flex-shrink: 0;
    align-items: flex-end;
`;

// ── Helpers ───────────────────────────────────────────────────────────────

/** Heuristic 0–100 for ring color; matches “health” of the category from error/warning mix. */
function ringScoreForCategory(cat: { total: number; errors: number; warnings: number }): number {
    if (cat.total === 0) return 100;
    return Math.max(
        0,
        Math.min(100, Math.round(100 - (100 * (cat.errors * 0.5 + cat.warnings * 0.2)) / cat.total)),
    );
}

const formatEvaluationTimestamp = (timestamp?: number): string | null => {
    if (!timestamp || Number.isNaN(timestamp)) return null;
    return new Date(timestamp).toLocaleString();
};


// ── Main component ─────────────────────────────────────────────────────────

export const AnalyzeSingleReportBreakdown: React.FC<AnalyzeSingleReportBreakdownProps> = ({
    reportKey,
    title,
    subtitle,
    llmReview,
    aiReadinessDimensions,
    violations,
    expandedBucketKeys,
    onToggleBucket,
    onViewIssues,
    onReevaluateLlm,
    unifiedCategories,
    llmValidation,
}) => {
    const categories = unifiedCategories || [];
    const orderedCategories = React.useMemo(() => {
        const priority = (cat: { errors: number; warnings: number }) => {
            if (cat.errors > 0) return 0;
            if (cat.warnings > 0) return 1;
            return 2;
        };
        return [...categories].sort((a, b) =>
            priority(a) - priority(b) ||
            b.errors - a.errors ||
            b.warnings - a.warnings ||
            b.total - a.total ||
            a.label.localeCompare(b.label)
        );
    }, [categories]);
    const resolvedTitle = title || (reportKey === 'owasp'
        ? 'OWASP Breakdown'
        : reportKey === 'wso2-rest'
            ? 'WSO2 REST Guidelines Breakdown'
            : 'AI Readiness Breakdown');

    const llmInfo = React.useMemo(() => {
        if (!llmValidation || llmValidation.status === 'pending') {
            return {
                statusLabel: 'Running',
                statusColor: 'var(--vscode-editorInfo-foreground, #38BDF8)',
                statusBg: 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #38BDF8) 14%, transparent)',
                badgeColor: 'var(--vscode-editorInfo-foreground, #38BDF8)',
                badgeBg: 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #38BDF8) 14%, transparent)',
                meta: 'Agent validation is running in the background…',
                icon: '⏳',
            };
        }
        if (llmValidation.status === 'stale') {
            const staleCount = llmValidation.result?.findings?.length || 0;
            const lastEvaluated = formatEvaluationTimestamp(llmValidation.updatedAt);
            const lastEvaluatedLabel = lastEvaluated ? ` Last evaluated: ${lastEvaluated}.` : '';
            return {
                statusLabel: 'Stale',
                statusColor: 'var(--vscode-editorWarning-foreground)',
                statusBg: 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 14%, transparent)',
                badgeColor: 'var(--vscode-editorWarning-foreground)',
                badgeBg: 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 14%, transparent)',
                meta: staleCount > 0
                    ? `Showing ${staleCount} cached finding${staleCount !== 1 ? 's' : ''} from the previous evaluation.${lastEvaluatedLabel} Re-evaluate to refresh against current spec.`
                    : `${llmValidation.error || 'OpenAPI spec changed — re-evaluate to refresh agent results.'}${lastEvaluatedLabel}`,
                icon: '⚠',
            };
        }
        if (llmValidation.status === 'failed') {
            return {
                statusLabel: 'Failed',
                statusColor: 'var(--vscode-errorForeground)',
                statusBg: 'color-mix(in srgb, var(--vscode-errorForeground) 14%, transparent)',
                badgeColor: 'var(--vscode-errorForeground)',
                badgeBg: 'color-mix(in srgb, var(--vscode-errorForeground) 14%, transparent)',
                meta: llmValidation.error || 'Validation failed. Try re-evaluating.',
                icon: '✕',
            };
        }
        const count = llmValidation.result?.findings?.length || 0;
        return {
            statusLabel: 'Ready',
            statusColor: 'var(--vscode-testing-iconPassed, #10B981)',
            statusBg: 'color-mix(in srgb, var(--vscode-testing-iconPassed, #10B981) 14%, transparent)',
            badgeColor: 'var(--vscode-testing-iconPassed, #10B981)',
            badgeBg: 'color-mix(in srgb, var(--vscode-testing-iconPassed, #10B981) 14%, transparent)',
            meta: count > 0 ? `${count} finding${count !== 1 ? 's' : ''} identified by the agent` : 'No issues found — your API looks ready!',
            icon: '✓',
        };
    }, [llmValidation]);

    const badge =
        reportKey === 'ai-readiness'
            ? `${aiReadinessDimensions.length} dimension${aiReadinessDimensions.length !== 1 ? 's' : ''}`
            : orderedCategories.length === 0
                ? 'No findings'
                : `${orderedCategories.length} ${reportKey === 'owasp' ? 'areas' : 'themes'}`;
    const hasLlmFindings = (llmValidation?.result?.findings?.length || 0) > 0;

    return (
        <Section>
            <SectionHeader>
                <SectionHeading>
                    <SectionTitle>{resolvedTitle}</SectionTitle>
                    {subtitle && <SectionSubtitle>{subtitle}</SectionSubtitle>}
                </SectionHeading>
                <SectionBadge>{badge}</SectionBadge>
            </SectionHeader>

            {reportKey === 'ai-readiness' ? (
                <AiBreakdownStack>
                    <LlmTile $statusColor={llmInfo.statusColor}>
                        <LlmStatusIcon $color={llmInfo.statusColor}>{llmInfo.icon}</LlmStatusIcon>
                        <LlmInfo>
                            <LlmTitleRow>
                                <LlmTitle>{llmReview?.title || 'Llm-Based AI Readiness Review'}</LlmTitle>
                                <LlmStatusPill $color={llmInfo.badgeColor} $bg={llmInfo.badgeBg}>{llmInfo.statusLabel}</LlmStatusPill>
                                <LlmDetailsTip title={llmInfo.meta}>i</LlmDetailsTip>
                            </LlmTitleRow>
                            <LlmSummary>{llmReview?.subtitle || 'AI agent findings for readiness checks. Use "View findings" for full details.'}</LlmSummary>
                        </LlmInfo>
                        <LlmActions>
                            {(llmValidation?.status === 'ready' || (llmValidation?.status === 'stale' && hasLlmFindings)) && (
                                <Button onClick={() => onViewIssues('llm-validation')}>
                                    {llmReview?.viewFindingsLabel || 'View findings'}
                                </Button>
                            )}
                            {(llmValidation?.status === 'stale' || llmValidation?.status === 'failed' || !llmValidation || llmValidation.status === 'pending') && (
                                <Button onClick={onReevaluateLlm} disabled={llmValidation?.status === 'pending'}>
                                    {llmValidation?.status === 'pending'
                                        ? 'Running…'
                                        : (llmReview?.reevaluateLabel || 'Re-evaluate')}
                                </Button>
                            )}
                        </LlmActions>
                    </LlmTile>
                    <AIReadinessBucketGrid
                        dimensions={aiReadinessDimensions}
                        expandedKeys={expandedBucketKeys}
                        onToggle={onToggleBucket}
                        violations={violations}
                        onViewIssues={onViewIssues}
                    />
                </AiBreakdownStack>
            ) : orderedCategories.length === 0 ? (
                <BreakdownEmpty>No issues in this breakdown for the current analysis.</BreakdownEmpty>
            ) : (
                <Accordion>
                    {orderedCategories.map((cat) => {
                        const ring = ringScoreForCategory(cat);
                        const ringRounded = Math.round(ring);
                        const ringTint = scoreColor(ring);
                        const hasFindings = cat.errors > 0 || cat.warnings > 0;
                        const metaTags = [
                            cat.id,
                            ...(cat.affectedEndpoints > 0 ? [`${cat.affectedEndpoints} endpoint${cat.affectedEndpoints !== 1 ? 's' : ''}`] : []),
                            ...(cat.topRules || []).slice(0, 2),
                        ];
                        return (
                            <DimCard key={cat.id}>
                                <FlatBreakdownHeader>
                                    <DimScore $color={ringTint} $score={ringRounded}>
                                        <span>{ringRounded}%</span>
                                    </DimScore>
                                    <DimMeta>
                                        <CategoryTitleRow>
                                            <DimTitle>{cat.label}</DimTitle>
                                            {cat.docsUrl && (
                                                <DocsLink onClick={() => postMessage({ command: 'openExternal', url: cat.docsUrl })}>
                                                    Docs<ExtLinkSvg />
                                                </DocsLink>
                                            )}
                                        </CategoryTitleRow>
                                        {cat.description && <DimDesc>{cat.description}</DimDesc>}
                                        {metaTags.length > 0 && (
                                            <TagRow>
                                                {metaTags.map((tag) => (
                                                    <Tag key={`${cat.id}:${tag}`}>{tag}</Tag>
                                                ))}
                                            </TagRow>
                                        )}
                                    </DimMeta>
                                    <DimRight>
                                        <CardMetaActions>
                                            <DimIssueCount>
                                                {!hasFindings ? (
                                                    'All passing'
                                                ) : (
                                                    <>
                                                        {cat.errors > 0 && (
                                                            <DimErrorCount>
                                                                {cat.errors} error{cat.errors !== 1 ? 's' : ''}
                                                            </DimErrorCount>
                                                        )}
                                                        {cat.warnings > 0 && (
                                                            <DimWarningCount>
                                                                {cat.warnings} warning{cat.warnings !== 1 ? 's' : ''}
                                                            </DimWarningCount>
                                                        )}
                                                    </>
                                                )}
                                            </DimIssueCount>
                                            {(cat.docsUrl || cat.total > 0) && (
                                                <CardLinksRow>
                                                    {cat.total > 0 && (
                                                        <ViewIssuesLink onClick={() => onViewIssues(cat.viewIssuesFilter.key)}>
                                                            View issues
                                                        </ViewIssuesLink>
                                                    )}
                                                </CardLinksRow>
                                            )}
                                        </CardMetaActions>
                                    </DimRight>
                                </FlatBreakdownHeader>
                            </DimCard>
                        );
                    })}
                </Accordion>
            )}
        </Section>
    );
};
