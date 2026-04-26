import React from 'react';
import styled from '@emotion/styled';
import type { AiReadinessDimensionSummary } from '@wso2/api-designer-core';
import { AnalyzeReportKey } from '../hooks/useReport';
import { BREAKDOWN_TITLES, BREAKDOWN_SUBTITLES } from './AnalyzeSingleReportHelpers';
import { AIReadinessBucketGrid } from './AIReadinessBucketGrid';
import { postMessage } from '../../../utils/vscode-api';

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

// ── Flat bucket grid (OWASP / REST) ──────────────────────────────────────

const BucketGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;

    @media (max-width: 900px) {
        grid-template-columns: repeat(2, 1fr);
    }
    @media (max-width: 600px) {
        grid-template-columns: 1fr;
    }
`;

const Bucket = styled.div<{ $borderColor: string }>`
    background: var(--vscode-editorWidget-background);
    border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 82%, transparent);
    border-left: 4px solid ${({ $borderColor }: { $borderColor: string }) => $borderColor};
    border-radius: 8px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--vscode-editorWidget-background) 72%, transparent), 0 3px 10px rgba(0, 0, 0, 0.12);
`;

const BucketId = styled.div`
    font-size: 10px;
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
    color: var(--vscode-descriptionForeground);
`;

const BucketTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: var(--vscode-foreground);
    line-height: 1.4;
`;

const BucketDesc = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.5;
    flex: 1;
`;

const BucketStatusRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px solid var(--vscode-panel-border);
`;

const BucketBadge = styled.span<{ $color: string; $bg: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 700;
    border-radius: 4px;
    padding: 2px 8px;
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

const BucketActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
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

const LinkBtn = styled.button`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: transparent;
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
    font-size: 11px;
    padding: 3px 9px;
    font-family: inherit;
    transition: background 0.12s, border-color 0.12s;

    &:hover {
        background: color-mix(in srgb, var(--vscode-textLink-foreground) 10%, transparent);
        border-color: var(--vscode-textLink-foreground);
    }
`;

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
    border-top: 3px solid ${({ $statusColor }: { $statusColor: string }) => $statusColor};
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

const LlmAiBadge = styled.div`
    position: absolute;
    top: -1px;
    right: 14px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: var(--vscode-button-background, #0078d4);
    color: var(--vscode-button-foreground, #fff);
    padding: 2px 8px;
    border-radius: 0 0 5px 5px;
`;

const LlmScoreBlock = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 58px;
`;

const LlmScoreValue = styled.div<{ $color: string }>`
    font-size: 20px;
    font-weight: 900;
    font-family: var(--vscode-editor-font-family, ui-monospace, monospace);
    line-height: 1;
    color: ${({ $color }: { $color: string }) => $color};
`;

const LlmScoreLabel = styled.div`
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--vscode-descriptionForeground);
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
    gap: 5px;
    min-width: 0;
`;

const LlmTitle = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const LlmDescription = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.45;
    opacity: 0.9;
`;

const LlmMeta = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
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
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
    align-items: flex-end;
`;

const ReevaluateButton = styled.button`
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid var(--vscode-button-border, var(--vscode-panel-border));
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    font-size: 11px;
    font-family: inherit;
    white-space: nowrap;
    &:hover {
        background: var(--vscode-button-secondaryHoverBackground);
    }
`;

const ViewIssuesBtn = styled.button`
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid var(--vscode-focusBorder);
    background: color-mix(in srgb, var(--vscode-focusBorder) 10%, transparent);
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
    font-size: 11px;
    font-family: inherit;
    white-space: nowrap;
    &:hover {
        background: color-mix(in srgb, var(--vscode-focusBorder) 20%, transparent);
    }
`;

// ── Helpers ───────────────────────────────────────────────────────────────

function getBucketColors(cat: { total: number; errors: number; warnings: number }) {
    if (cat.total === 0) {
        return {
            borderColor: 'var(--vscode-testing-iconPassed, #10B981)',
            badgeColor: 'var(--vscode-testing-iconPassed, #10B981)',
            badgeBg: 'color-mix(in srgb, var(--vscode-testing-iconPassed, #10B981) 15%, transparent)',
            badgeText: 'Clear',
        };
    }
    if (cat.errors > 0) {
        return {
            borderColor: 'var(--vscode-errorForeground)',
            badgeColor: 'var(--vscode-errorForeground)',
            badgeBg: 'color-mix(in srgb, var(--vscode-errorForeground) 15%, transparent)',
            badgeText: `${cat.errors} error${cat.errors !== 1 ? 's' : ''}`,
        };
    }
    if (cat.warnings > 0) {
        return {
            borderColor: 'var(--vscode-editorWarning-foreground)',
            badgeColor: 'var(--vscode-editorWarning-foreground)',
            badgeBg: 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 15%, transparent)',
            badgeText: `${cat.warnings} warning${cat.warnings !== 1 ? 's' : ''}`,
        };
    }
    return {
        borderColor: 'var(--vscode-editorInfo-foreground, #38BDF8)',
        badgeColor: 'var(--vscode-editorInfo-foreground, #38BDF8)',
        badgeBg: 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #38BDF8) 15%, transparent)',
        badgeText: `${cat.total} issue${cat.total !== 1 ? 's' : ''}`,
    };
}


// ── Main component ─────────────────────────────────────────────────────────

export const AnalyzeSingleReportBreakdown: React.FC<AnalyzeSingleReportBreakdownProps> = ({
    reportKey,
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
    const title = BREAKDOWN_TITLES[reportKey];
    const subtitle = BREAKDOWN_SUBTITLES[reportKey];

    const llmInfo = React.useMemo(() => {
        if (!llmValidation || llmValidation.status === 'pending') {
            return {
                statusLabel: 'Running',
                statusColor: 'var(--vscode-editorInfo-foreground, #38BDF8)',
                statusBg: 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #38BDF8) 14%, transparent)',
                meta: 'Agent validation is running in the background…',
                icon: '⏳',
                score: null,
            };
        }
        if (llmValidation.status === 'stale') {
            const staleCount = llmValidation.result?.findings?.length || 0;
            return {
                statusLabel: 'Stale',
                statusColor: 'var(--vscode-editorWarning-foreground)',
                statusBg: 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 14%, transparent)',
                meta: staleCount > 0
                    ? `Showing ${staleCount} cached finding${staleCount !== 1 ? 's' : ''} from the previous evaluation. Re-evaluate to refresh against current spec.`
                    : (llmValidation.error || 'OpenAPI spec changed — re-evaluate to refresh agent results.'),
                icon: '⚠',
                score: null,
            };
        }
        if (llmValidation.status === 'failed') {
            return {
                statusLabel: 'Failed',
                statusColor: 'var(--vscode-errorForeground)',
                statusBg: 'color-mix(in srgb, var(--vscode-errorForeground) 14%, transparent)',
                meta: llmValidation.error || 'Validation failed. Try re-evaluating.',
                icon: '✕',
                score: null,
            };
        }
        const count = llmValidation.result?.findings?.length || 0;
        const score = llmValidation.result?.score ?? 0;
        return {
            statusLabel: 'Ready',
            statusColor: 'var(--vscode-testing-iconPassed, #10B981)',
            statusBg: 'color-mix(in srgb, var(--vscode-testing-iconPassed, #10B981) 14%, transparent)',
            meta: count > 0 ? `${count} finding${count !== 1 ? 's' : ''} identified by the agent` : 'No issues found — your API looks ready!',
            icon: '✓',
            score,
        };
    }, [llmValidation]);

    const badge = reportKey === 'ai-readiness'
        ? `${aiReadinessDimensions.length} dimension${aiReadinessDimensions.length !== 1 ? 's' : ''}`
        : `${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`;
    const hasLlmFindings = (llmValidation?.result?.findings?.length || 0) > 0;

    return (
        <Section>
            <SectionHeader>
                <SectionHeading>
                    <SectionTitle>{title}</SectionTitle>
                    {subtitle && <SectionSubtitle>{subtitle}</SectionSubtitle>}
                </SectionHeading>
                <SectionBadge>{badge}</SectionBadge>
            </SectionHeader>

            {reportKey === 'ai-readiness' ? (
                <AiBreakdownStack>
                    <LlmTile $statusColor={llmInfo.statusColor}>
                        <LlmAiBadge>AI Powered</LlmAiBadge>
                        {llmInfo.score !== null ? (
                            <LlmScoreBlock>
                                <LlmScoreValue $color={llmInfo.statusColor}>{Math.round(llmInfo.score)}%</LlmScoreValue>
                                <LlmScoreLabel>LLM Score</LlmScoreLabel>
                            </LlmScoreBlock>
                        ) : (
                            <LlmStatusIcon $color={llmInfo.statusColor}>{llmInfo.icon}</LlmStatusIcon>
                        )}
                        <LlmInfo>
                            <LlmTitle>Agent-Based Semantic & Contextual AI Readiness Review</LlmTitle>
                            <LlmDescription>
                                This is evaluated by an agent for contextual AI-consumption quality signals, including whether API contact information is present and useful.
                            </LlmDescription>
                            <LlmStatusPill $color={llmInfo.statusColor} $bg={llmInfo.statusBg}>{llmInfo.statusLabel}</LlmStatusPill>
                            <LlmMeta>{llmInfo.meta}</LlmMeta>
                        </LlmInfo>
                        <LlmActions>
                            {(llmValidation?.status === 'ready' || (llmValidation?.status === 'stale' && hasLlmFindings)) && (
                                <ViewIssuesBtn onClick={() => onViewIssues('llm-validation')}>View findings</ViewIssuesBtn>
                            )}
                            {(llmValidation?.status === 'stale' || llmValidation?.status === 'failed' || !llmValidation || llmValidation.status === 'pending') && (
                                <ReevaluateButton onClick={onReevaluateLlm}>
                                    {llmValidation?.status === 'pending' ? 'Running…' : 'Re-evaluate'}
                                </ReevaluateButton>
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
            ) : (
                <BucketGrid>
                    {categories.map((cat) => {
                        const { borderColor, badgeColor, badgeBg, badgeText } = getBucketColors(cat);
                        return (
                            <Bucket key={cat.id} $borderColor={borderColor}>
                                <BucketId>{cat.id}</BucketId>
                                <BucketTitle>{cat.label}</BucketTitle>
                                {cat.description && <BucketDesc>{cat.description}</BucketDesc>}
                                <BucketStatusRow>
                                    <BucketBadge $color={badgeColor} $bg={badgeBg}>{badgeText}</BucketBadge>
                                    <BucketActions>
                                        {cat.docsUrl && (
                                            <DocsLink onClick={() => postMessage({ command: 'openExternal', url: cat.docsUrl })}>
                                                Docs<ExtLinkSvg />
                                            </DocsLink>
                                        )}
                                        {cat.total > 0 && (
                                            <LinkBtn onClick={() => onViewIssues(cat.viewIssuesFilter.key)}>
                                                View issues
                                            </LinkBtn>
                                        )}
                                    </BucketActions>
                                </BucketStatusRow>
                            </Bucket>
                        );
                    })}
                </BucketGrid>
            )}
        </Section>
    );
};
