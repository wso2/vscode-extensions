import React from 'react';
import styled from '@emotion/styled';
import { UnifiedBreakdownCategory } from '@wso2/api-designer-core';
import { AnalyzeReportKey, scoreColor } from '../hooks/useReport';
import {
    DimCard,
    DimMeta,
    DimTitle,
    DimDesc,
    DimIssueCount,
    DimErrorCount,
    DimWarningCount,
    FlatBreakdownHeader,
} from './AIReadinessBucketGrid';
import { postMessage } from '../../../utils/vscode-api';
import { ANALYZE_TYPE_SCALE } from './AnalyzeSingleReportHelpers';

interface AnalyzeSingleReportBreakdownProps {
    reportKey: AnalyzeReportKey;
    title?: string;
    subtitle?: string;
    onViewIssues: (subBucketKey?: string) => void;
    unifiedCategories?: UnifiedBreakdownCategory[];
}

// ── Section shell ─────────────────────────────────────────────────────────

const Section = styled.div`
    margin-bottom: 4px;
`;

const CardsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(320px, 1fr));
    gap: 10px;

    @media (max-width: 980px) {
        grid-template-columns: 1fr;
    }
`;

const BreakdownCard = styled(DimCard)`
    background: linear-gradient(180deg, rgba(122, 162, 255, 0.05) 0%, rgba(122, 162, 255, 0.02) 100%);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 12px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
    overflow: hidden;
`;

const BreakdownHeader = styled(FlatBreakdownHeader)`
    padding: 14px;
    background: transparent;
`;

const ScorePill = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: ${ANALYZE_TYPE_SCALE.sm};
    font-weight: 700;
    line-height: 1;
    color: ${({ $color }: { $color: string }) => `color-mix(in srgb, ${$color} 88%, var(--vscode-foreground))`};
    background: ${({ $color }: { $color: string }) => `color-mix(in srgb, ${$color} 14%, transparent)`};
    border: 1px solid ${({ $color }: { $color: string }) => `color-mix(in srgb, ${$color} 28%, var(--vscode-panel-border))`};
    font-family: var(--vscode-font-family, "Inter", "Segoe UI", Arial, sans-serif);
    flex-shrink: 0;
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
    font-size: ${ANALYZE_TYPE_SCALE.lg};
    font-weight: 700;
    color: var(--vscode-foreground);
    letter-spacing: -0.01em;
    line-height: 1.2;
`;

const SectionSubtitle = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.sm};
    color: var(--vscode-descriptionForeground);
    line-height: 1.5;
`;

const SectionBadge = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.md};
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

const Tag = styled.button`
    font-size: ${ANALYZE_TYPE_SCALE.sm};
    color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 2px 9px 2px 6px;
    background: var(--vscode-editor-background);
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;

    &:hover {
        background: color-mix(in srgb, var(--vscode-textLink-foreground) 10%, transparent);
        border-color: var(--vscode-textLink-foreground);
        color: var(--vscode-foreground);
    }
`;

const ClickableTag = styled.button`
    font-size: ${ANALYZE_TYPE_SCALE.sm};
    color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 2px 9px 2px 6px;
    background: var(--vscode-editor-background);
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;

    &:hover {
        background: color-mix(in srgb, var(--vscode-textLink-foreground) 10%, transparent);
        border-color: var(--vscode-textLink-foreground);
        color: var(--vscode-foreground);
    }
`;

const CardMetaActions = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
`;

const CardFooterRow = styled.div`
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-top: 8px;
`;

const CategoryTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const BreakdownEmpty = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.md};
    color: var(--vscode-descriptionForeground);
    padding: 12px 0;
    line-height: 1.5;
`;

const DocsLink = styled.button`
    font-size: ${ANALYZE_TYPE_SCALE.sm};
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

const CountAction = styled.button`
    border: none;
    background: transparent;
    color: inherit;
    padding: 0;
    margin: 0;
    cursor: pointer;
    font: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
`;

const DimInfoCount = styled.span`
    color: var(--vscode-editorInfo-foreground, #38bdf8);
`;

const ExtLinkSvg = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 3, opacity: 0.7 }}>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

// ── Main component ─────────────────────────────────────────────────────────

export const AnalyzeSingleReportBreakdown: React.FC<AnalyzeSingleReportBreakdownProps> = ({
    reportKey,
    title,
    subtitle,
    onViewIssues,
    unifiedCategories,
}) => {
    const categories = unifiedCategories || [];
    const orderedCategories = React.useMemo(() => {
        if (reportKey === 'ai-readiness') {
            // Preserve backend-defined AI readiness dimension order.
            return categories;
        }
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
    }, [categories, reportKey]);
    const resolvedTitle = title || (reportKey === 'owasp'
        ? 'Security (OWASP) Breakdown'
        : reportKey === 'rest-api-readiness'
            ? 'REST Compliance Breakdown'
            : 'AI Readiness Breakdown');

    const badge =
        orderedCategories.length === 0
            ? 'No findings'
            : `${orderedCategories.length} ${reportKey === 'owasp' ? 'areas' : reportKey === 'ai-readiness' ? 'dimensions' : 'themes'}`;
    return (
        <Section>
            <SectionHeader>
                <SectionHeading>
                    <SectionTitle>{resolvedTitle}</SectionTitle>
                    {subtitle && <SectionSubtitle>{subtitle}</SectionSubtitle>}
                </SectionHeading>
                <SectionBadge>{badge}</SectionBadge>
            </SectionHeader>

            {orderedCategories.length === 0 ? (
                <BreakdownEmpty>No issues in this breakdown for the current analysis.</BreakdownEmpty>
            ) : (
                <CardsGrid>
                    {orderedCategories.map((cat) => {
                        const ringRounded = Math.max(0, Math.min(100, Math.round(cat.percentage)));
                        const ringTint = scoreColor(ringRounded);
                        const hasFindings = cat.errors > 0 || cat.warnings > 0;
                        const metaTags = [
                            { id: `${cat.id}:group`, label: cat.id, key: cat.viewIssuesFilter.key, tooltip: cat.description || cat.label },
                            ...(cat.affectedEndpoints > 0
                                ? [{
                                    id: `${cat.id}:endpoints`,
                                    label: `${cat.affectedEndpoints} endpoint${cat.affectedEndpoints !== 1 ? 's' : ''}`,
                                    key: `__endpoints__:${cat.viewIssuesFilter.key}`,
                                    tooltip: cat.description || cat.label,
                                }]
                                : []),
                            ...(cat.topRules || []).slice(0, 2).map((rule) => ({
                                id: `${cat.id}:rule:${rule}`,
                                label: rule,
                                key: cat.viewIssuesFilter.key,
                                tooltip: cat.description || cat.label,
                            })),
                        ];
                        return (
                            <BreakdownCard key={cat.id}>
                                <BreakdownHeader>
                                    <DimMeta>
                                        <CategoryTitleRow>
                                            <ScorePill $color={ringTint}>{ringRounded}%</ScorePill>
                                            <DimTitle>{cat.label}</DimTitle>
                                            {cat.docsUrl && (
                                                <DocsLink onClick={() => postMessage({ command: 'openExternal', url: cat.docsUrl })}>
                                                    Docs<ExtLinkSvg />
                                                </DocsLink>
                                            )}
                                        </CategoryTitleRow>
                                        {cat.description && <DimDesc>{cat.description}</DimDesc>}
                                        <CardFooterRow>
                                            {reportKey === 'ai-readiness' ? (
                                                <TagRow>
                                                    {(cat.subBuckets || []).map((subBucket) => (
                                                        <ClickableTag
                                                            key={`${cat.id}:${subBucket.id}`}
                                                            onClick={() => onViewIssues(subBucket.viewIssuesFilter.key)}
                                                            title={(subBucket as { description?: string }).description || subBucket.label}
                                                        >
                                                            {subBucket.label} ({Math.round(subBucket.percentage)}%)
                                                        </ClickableTag>
                                                    ))}
                                                </TagRow>
                                            ) : metaTags.length > 0 ? (
                                                <TagRow>
                                                    {metaTags.map((tag) => (
                                                        <Tag key={tag.id} onClick={() => onViewIssues(tag.key)} title={tag.tooltip}>
                                                            {tag.label}
                                                        </Tag>
                                                    ))}
                                                </TagRow>
                                            ) : (
                                                <span />
                                            )}
                                            <CardMetaActions>
                                                <DimIssueCount>
                                                    {!hasFindings ? (
                                                        'All passing'
                                                    ) : (
                                                        <>
                                                            {cat.errors > 0 && (
                                                                <DimErrorCount as="span">
                                                                    <CountAction onClick={() => onViewIssues(`__severity__:error:${cat.viewIssuesFilter.key}`)}>
                                                                        {cat.errors} error{cat.errors !== 1 ? 's' : ''}
                                                                    </CountAction>
                                                                </DimErrorCount>
                                                            )}
                                                            {cat.warnings > 0 && (
                                                                <DimWarningCount as="span">
                                                                    <CountAction onClick={() => onViewIssues(`__severity__:warn:${cat.viewIssuesFilter.key}`)}>
                                                                        {cat.warnings} warning{cat.warnings !== 1 ? 's' : ''}
                                                                    </CountAction>
                                                                </DimWarningCount>
                                                            )}
                                                            {(cat.infos || 0) > 0 && (
                                                                <DimInfoCount>
                                                                    <CountAction onClick={() => onViewIssues(`__severity__:info:${cat.viewIssuesFilter.key}`)}>
                                                                        {cat.infos} info{cat.infos !== 1 ? 's' : ''}
                                                                    </CountAction>
                                                                </DimInfoCount>
                                                            )}
                                                        </>
                                                    )}
                                                </DimIssueCount>
                                            </CardMetaActions>
                                        </CardFooterRow>
                                    </DimMeta>
                                </BreakdownHeader>
                            </BreakdownCard>
                        );
                    })}
                </CardsGrid>
            )}
        </Section>
    );
};
