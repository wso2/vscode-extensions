/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */

import React from 'react';
import styled from '@emotion/styled';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { UnifiedBreakdownCategory } from '@wso2/api-designer-core';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { useAIAvailability } from '../../../hooks/useAIAvailability';
import {
    useReportData,
    useIssueFilters,
    buildIssueRows,
    buildLlmIssueRows,
    scoreColor,
    SeverityLevel,
    GroupBy,
    SortBy,
    SortDir,
    AnalyzeReportKey,
} from '../hooks/useReport';
import { AnalyzeSingleReportOverview } from './AnalyzeSingleReportOverview';
import { AnalyzeSingleReportBreakdown } from './AnalyzeSingleReportBreakdown';
import { ANALYZE_TYPE_SCALE, buildRulesetFileUrl } from './AnalyzeSingleReportHelpers';
import { AnalyzeSingleReportIssueExplorer } from './AnalyzeSingleReportIssueExplorer';

export type { AnalyzeReportKey };

interface AnalyzeSingleReportPageProps {
    fileUri: string;
    refreshToken: number;
    reportKey: AnalyzeReportKey;
}

const openAIChat = (context: string, prompt: string) =>
    postVSCodeMessage({ command: 'openAIChat', data: { context, prompt } });

const Root = styled.div`
    width: 100%;
    padding: 28px 32px 16px;
    box-sizing: border-box;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 28px;
`;


const MessageCard = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    background: var(--vscode-editor-background);
    padding: 20px 24px;
    color: var(--vscode-descriptionForeground);
    font-size: ${ANALYZE_TYPE_SCALE.base};
`;

const LlmAnalysisCard = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
    padding: 14px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
`;

const LlmAnalysisContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const LlmAnalysisTitle = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.lg};
    font-weight: 700;
    color: var(--vscode-foreground);
    letter-spacing: -0.01em;
`;

const LlmAnalysisDescription = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.md};
    color: var(--vscode-descriptionForeground);
    line-height: 1.35;
`;

const LlmStatusRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
`;

const LlmStatusBadge = styled.span<{ $status: 'pending' | 'ready' | 'failed' | 'stale' | 'idle' }>`
    font-size: ${ANALYZE_TYPE_SCALE.xs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--vscode-panel-border);
    color: ${({ $status }: { $status: 'pending' | 'ready' | 'failed' | 'stale' | 'idle' }) =>
        $status === 'ready'
            ? 'var(--vscode-testing-iconPassed, #22c55e)'
            : $status === 'failed'
                ? 'var(--vscode-errorForeground)'
                : $status === 'stale'
                    ? 'var(--vscode-editorWarning-foreground)'
                    : $status === 'pending'
                        ? 'var(--vscode-editorInfo-foreground, #38bdf8)'
                        : 'var(--vscode-descriptionForeground)'};
    background: ${({ $status }: { $status: 'pending' | 'ready' | 'failed' | 'stale' | 'idle' }) =>
        $status === 'ready'
            ? 'color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 12%, transparent)'
            : $status === 'failed'
                ? 'color-mix(in srgb, var(--vscode-errorForeground) 12%, transparent)'
                : $status === 'stale'
                    ? 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 12%, transparent)'
                    : $status === 'pending'
                        ? 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #38bdf8) 12%, transparent)'
                        : 'color-mix(in srgb, var(--vscode-descriptionForeground) 10%, transparent)'};
`;

const LlmStatusText = styled.span`
    font-size: ${ANALYZE_TYPE_SCALE.sm};
    color: var(--vscode-descriptionForeground);
`;

const LlmAnalysisButton = styled.button`
    border: 1px solid var(--vscode-button-border, transparent);
    border-radius: 6px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    padding: 8px 12px;
    font-size: ${ANALYZE_TYPE_SCALE.sm};
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: filter 0.12s ease;

    &:hover:enabled {
        filter: brightness(1.05);
    }

    &:disabled {
        opacity: 0.65;
        cursor: not-allowed;
    }
`;

export const AnalyzeSingleReportPage: React.FC<AnalyzeSingleReportPageProps> = ({
    fileUri,
    refreshToken,
    reportKey,
}) => {
    const { rpcClient } = useVisualizerContext();
    const [manualRefreshTick, setManualRefreshTick] = React.useState(0);
    const { loading, error, report, specContent } = useReportData(
        rpcClient,
        fileUri,
        refreshToken + manualRefreshTick,
        reportKey
    );
    const isAIAvailable = useAIAvailability();
    const effectiveReportId = report?.report.reportId;

    const [severityFilter, setSeverityFilter] = React.useState<'all' | SeverityLevel>('all');
    const [groupBy, setGroupBy] = React.useState<GroupBy>('none');
    const [sortBy, setSortBy] = React.useState<SortBy>('severity');
    const [sortDir, setSortDir] = React.useState<SortDir>('asc');
    const [search, setSearch] = React.useState('');
    const [selectedIssueId, setSelectedIssueId] = React.useState<string | null>(null);
    const [selectedAiBucketKey, setSelectedAiBucketKey] = React.useState<string | null>(null);
    const [selectedAiMainBucketKey, setSelectedAiMainBucketKey] = React.useState<string | null>(null);
    const [selectedBreakdownKey, setSelectedBreakdownKey] = React.useState<string | null>(null);
    const issueExplorerRef = React.useRef<HTMLDivElement | null>(null);

    const rows = React.useMemo(() => buildIssueRows(report?.violations || []), [report]);
    const llmRows = React.useMemo(() => buildLlmIssueRows(report?.llmValidation), [report?.llmValidation]);
    const aiBucketOptions = React.useMemo(() => {
        const categories: UnifiedBreakdownCategory[] =
            report?.report.reportId === 'ai-readiness' ? report.report.breakdown.categories : [];
        return categories.map((category) => ({
            key: category.id,
            label: category.label,
            subBuckets: (category.subBuckets || []).map((subBucket) => ({
                key: subBucket.id,
                label: subBucket.label
            }))
        }));
    }, [report]);
    const subBucketToMainBucketMap = React.useMemo(() => {
        const map = new Map<string, string>();
        aiBucketOptions.forEach((bucket: { key: string; subBuckets: Array<{ key: string }> }) => {
            bucket.subBuckets.forEach((subBucket: { key: string }) => {
                map.set(subBucket.key, bucket.key);
            });
        });
        return map;
    }, [aiBucketOptions]);
    const scopedRows = React.useMemo(() => {
        if (effectiveReportId === 'ai-readiness') {
            if (selectedBreakdownKey === 'llm-validation') {
                return llmRows;
            }
            return rows.filter((row) => {
                const keys = row.breakdownKeys || [];
                const subBucket = keys.find((key) => subBucketToMainBucketMap.has(key)) || null;
                const mainBucket = subBucket ? (subBucketToMainBucketMap.get(subBucket) || null) : null;
                if (selectedAiMainBucketKey && mainBucket !== selectedAiMainBucketKey) return false;
                if (selectedAiBucketKey && subBucket !== selectedAiBucketKey) return false;
                return keys.length > 0;
            });
        }

        if (!selectedBreakdownKey) return rows;

        if (effectiveReportId === 'owasp' || effectiveReportId === 'rest-api-readiness') {
            return rows.filter((row) => row.breakdownKeys?.includes(selectedBreakdownKey));
        }

        return rows;
    }, [
        rows,
        llmRows,
        effectiveReportId,
        selectedAiMainBucketKey,
        selectedAiBucketKey,
        subBucketToMainBucketMap,
        selectedBreakdownKey,
    ]);
    const { filteredRows, groupedRows } = useIssueFilters(scopedRows, { severityFilter, search, sortBy, sortDir, groupBy });

    React.useEffect(() => {
        if (!scopedRows.length) {
            setSelectedIssueId(null);
            return;
        }
        if (!selectedIssueId || !scopedRows.some((r) => r.id === selectedIssueId)) {
            setSelectedIssueId(scopedRows[0].id);
        }
    }, [scopedRows, selectedIssueId]);

    const selectedIssue = React.useMemo(
        () => filteredRows.find((r) => r.id === selectedIssueId) || filteredRows[0] || null,
        [filteredRows, selectedIssueId],
    );

    const stats = React.useMemo(() => {
        const errors = rows.filter((r) => r.severity === 'error').length;
        const warnings = rows.filter((r) => r.severity === 'warn').length;
        // Count distinct operations (path + HTTP method). Global/root issues are excluded.
        const endpointCount = new Set(
            rows
                .filter((r) => r.endpoint && r.endpoint !== 'global' && r.method && r.method !== 'GLOBAL')
                .map((r) => `${r.method}:${r.endpoint}`),
        ).size;
        const rulesCount = new Set(rows.map((r) => r.rule)).size;
        return { errors, warnings, endpointCount, rulesCount };
    }, [rows]);
    const issueStats = React.useMemo(() => {
        const errors = scopedRows.filter((r) => r.severity === 'error').length;
        const warnings = scopedRows.filter((r) => r.severity === 'warn').length;
        return { errors, warnings };
    }, [scopedRows]);

    const breakdownFilterOptions = React.useMemo<Array<{ key: string; label: string }>>(
        () => (effectiveReportId && effectiveReportId !== 'ai-readiness' ? report?.report.issueExplorer.breakdownFilterOptions || [] : []),
        [effectiveReportId, report]
    );

    const handleViewIssues = React.useCallback((targetKey?: string) => {
        const nextKey = targetKey || null;
        if (nextKey && nextKey.startsWith('__severity__:')) {
            const severityPayload = nextKey.replace('__severity__:', '');
            const separatorIndex = severityPayload.indexOf(':');
            const severity = separatorIndex >= 0 ? severityPayload.slice(0, separatorIndex) : severityPayload;
            const categoryKey = separatorIndex >= 0 ? severityPayload.slice(separatorIndex + 1) : '';
            const severityValue = severity === 'error' || severity === 'warn' || severity === 'info' || severity === 'hint'
                ? severity
                : 'all';
            if (effectiveReportId === 'ai-readiness') {
                setSelectedAiMainBucketKey(categoryKey || null);
                setSelectedAiBucketKey(null);
                setSelectedBreakdownKey(null);
            } else {
                setSelectedAiBucketKey(null);
                setSelectedAiMainBucketKey(null);
                setSelectedBreakdownKey(categoryKey || null);
            }
            setSeverityFilter(severityValue as 'all' | SeverityLevel);
            setGroupBy('none');
            setSortBy('severity');
            setSortDir('asc');
            setSearch('');
            setSelectedIssueId(null);
            window.requestAnimationFrame(() => {
                issueExplorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            return;
        }
        if (nextKey && nextKey.startsWith('__endpoints__:')) {
            const categoryKey = nextKey.replace('__endpoints__:', '') || null;
            setSelectedAiBucketKey(null);
            setSelectedAiMainBucketKey(null);
            setSelectedBreakdownKey(categoryKey);
            setSeverityFilter('all');
            setGroupBy('endpoint');
            setSortBy('severity');
            setSortDir('asc');
            setSearch('');
            setSelectedIssueId(null);
            window.requestAnimationFrame(() => {
                issueExplorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            return;
        }
        if (effectiveReportId === 'ai-readiness') {
            if (nextKey === 'llm-validation') {
                setSelectedAiBucketKey(null);
                setSelectedAiMainBucketKey(null);
                setSelectedBreakdownKey('llm-validation');
            } else {
                setSelectedAiBucketKey(nextKey);
                setSelectedAiMainBucketKey(nextKey ? (subBucketToMainBucketMap.get(nextKey) || null) : null);
                setSelectedBreakdownKey(null);
            }
        } else {
            setSelectedAiBucketKey(null);
            setSelectedAiMainBucketKey(null);
            setSelectedBreakdownKey(nextKey);
        }
        setSeverityFilter('all');
        setGroupBy('none');
        setSortBy('severity');
        setSortDir('asc');
        setSearch('');
        setSelectedIssueId(null);
        window.requestAnimationFrame(() => {
            issueExplorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, [effectiveReportId, subBucketToMainBucketMap]);
    const handleViewEndpointIssues = React.useCallback(() => {
        setSelectedAiBucketKey(null);
        setSelectedAiMainBucketKey(null);
        setSelectedBreakdownKey(null);
        setSeverityFilter('all');
        setGroupBy('endpoint');
        setSortBy('severity');
        setSortDir('asc');
        setSearch('');
        setSelectedIssueId(null);
        window.requestAnimationFrame(() => {
            issueExplorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, []);
    const handleViewErrorIssues = React.useCallback(() => {
        setSelectedAiBucketKey(null);
        setSelectedAiMainBucketKey(null);
        setSelectedBreakdownKey(null);
        setSeverityFilter('error');
        setGroupBy('none');
        setSortBy('severity');
        setSortDir('asc');
        setSearch('');
        setSelectedIssueId(null);
        window.requestAnimationFrame(() => {
            issueExplorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, []);
    const handleViewWarningIssues = React.useCallback(() => {
        setSelectedAiBucketKey(null);
        setSelectedAiMainBucketKey(null);
        setSelectedBreakdownKey(null);
        setSeverityFilter('warn');
        setGroupBy('none');
        setSortBy('severity');
        setSortDir('asc');
        setSearch('');
        setSelectedIssueId(null);
        window.requestAnimationFrame(() => {
            issueExplorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }, []);
    const handleRunLlmAnalysis = React.useCallback(() => {
        postVSCodeMessage({ command: 'reevaluateLlmValidation' });
        setManualRefreshTick((value) => value + 1);
    }, []);
    const score = Math.max(0, Math.min(100, Number(report?.score || 0)));
    const gradeColor = scoreColor(score);
    const errorCount = rows.filter((row) => row.severity === 'error').length;
    const warningCount = rows.filter((row) => row.severity === 'warn').length;
    const rulesetFileUrl = buildRulesetFileUrl(report?.ruleset);
    const aiEnabled = isAIAvailable && !!fileUri && !!rulesetFileUrl && !!report?.ruleset?.rulesetContentPath;

    if (loading) {
        return (
            <Root>
                <MessageCard>Loading…</MessageCard>
            </Root>
        );
    }

    if (error || !report) {
        return (
            <Root>
                <MessageCard>{error || 'No report data available.'}</MessageCard>
            </Root>
        );
    }

    const resolvedReportId = report.report.reportId;
    const issueExplorerReportKey: AnalyzeReportKey = resolvedReportId === 'rest-api-readiness' ? 'rest-api-readiness' : resolvedReportId;
    const reportUiMeta = report.report;
    const llmStatus = report.llmValidation?.status;
    const isLlmRunning = llmStatus === 'pending';
    const llmFindingsCount = report.llmValidation?.result?.findings?.length || 0;
    const llmStatusValue: 'pending' | 'ready' | 'failed' | 'stale' | 'idle' = llmStatus || 'idle';
    const llmStatusLabel = llmStatusValue === 'idle'
        ? 'No analysis yet'
        : llmStatusValue === 'pending'
            ? 'Running'
            : llmStatusValue === 'ready'
                ? 'Ready'
                : llmStatusValue === 'stale'
                    ? 'Stale'
                    : 'Failed';
    const llmStatusMessage = llmStatusValue === 'pending'
        ? 'Evaluating API with VS Code language model...'
        : llmStatusValue === 'ready'
            ? llmFindingsCount > 0
                ? `${llmFindingsCount} finding${llmFindingsCount !== 1 ? 's' : ''} available`
                : 'Analysis completed with no findings'
            : llmStatusValue === 'stale'
                ? 'Findings are outdated due to spec changes'
                : llmStatusValue === 'failed'
                    ? (report.llmValidation?.error || 'Previous evaluation failed')
                    : 'Run LLM analysis to generate deeper findings';
    const llmActionLabel = llmStatusValue === 'ready'
        ? 'View findings'
        : llmStatusValue === 'pending'
            ? 'Analysing…'
            : llmStatusValue === 'stale'
                ? 'Analyse again'
                : 'Analyse';
    const handleOpenLlmFindings = () => {
        setSelectedAiMainBucketKey(null);
        setSelectedAiBucketKey(null);
        setSelectedBreakdownKey('llm-validation');
        setSeverityFilter('all');
        setGroupBy('none');
        setSortBy('severity');
        setSortDir('asc');
        setSearch('');
        setSelectedIssueId(null);
        window.requestAnimationFrame(() => {
            issueExplorerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };
    const handleLlmCardAction = () => {
        if (llmStatusValue === 'ready') {
            handleOpenLlmFindings();
            return;
        }
        handleRunLlmAnalysis();
    };
    return (
        <Root>
            <AnalyzeSingleReportOverview
                score={score}
                gradeColor={gradeColor}
                title={report.report.title || report.rulesetName}
                subtitle={report.rulesetDescription}
                errorCount={errorCount}
                warningCount={warningCount}
                passedChecks={report.passedChecks}
                totalChecks={report.totalChecks}
                endpointsAffected={stats.endpointCount}
                onViewEndpointIssues={handleViewEndpointIssues}
                onViewErrorIssues={handleViewErrorIssues}
                onViewWarningIssues={handleViewWarningIssues}
            />

            {resolvedReportId === 'ai-readiness' && (
                <LlmAnalysisCard>
                    <LlmAnalysisContent>
                        <LlmAnalysisTitle>{reportUiMeta.llmReview?.title || 'LLM-based API Analysis'}</LlmAnalysisTitle>
                        <LlmAnalysisDescription>
                            {reportUiMeta.llmReview?.subtitle ||
                                'Run a deeper language-model evaluation for AI readiness findings and recommendations using the VS Code language model.'}
                        </LlmAnalysisDescription>
                        <LlmStatusRow>
                            <LlmStatusBadge $status={llmStatusValue}>{llmStatusLabel}</LlmStatusBadge>
                            <LlmStatusText>{llmStatusMessage}</LlmStatusText>
                        </LlmStatusRow>
                    </LlmAnalysisContent>
                    <LlmAnalysisButton onClick={handleLlmCardAction} disabled={isLlmRunning}>
                        {llmActionLabel}
                    </LlmAnalysisButton>
                </LlmAnalysisCard>
            )}

            <AnalyzeSingleReportBreakdown
                reportKey={resolvedReportId}
                title={report.report.breakdown.title}
                subtitle={reportUiMeta.breakdown.subtitle}
                onViewIssues={handleViewIssues}
                unifiedCategories={report.report.breakdown.categories}
            />

            <div ref={issueExplorerRef}>
                <AnalyzeSingleReportIssueExplorer
                    title={reportUiMeta.issueExplorer.title}
                    subtitle={reportUiMeta.issueExplorer.subtitle}
                    rows={scopedRows}
                    stats={issueStats}
                    filteredRows={filteredRows}
                    groupedRows={groupedRows}
                    selectedIssue={selectedIssue}
                    setSelectedIssueId={setSelectedIssueId}
                    severityFilter={severityFilter}
                    setSeverityFilter={setSeverityFilter}
                    groupBy={groupBy}
                    setGroupBy={setGroupBy}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    sortDir={sortDir}
                    setSortDir={setSortDir}
                    search={search}
                    setSearch={setSearch}
                    aiEnabled={aiEnabled}
                    reportKey={issueExplorerReportKey}
                    reportName={report.rulesetName}
                    fileUri={fileUri}
                    rulesetFileUrl={rulesetFileUrl}
                    rulesetContentPath={report.ruleset?.rulesetContentPath}
                    specContent={specContent}
                    onOpenAIChat={openAIChat}
                    aiBucketFilter={resolvedReportId === 'ai-readiness' ? {
                        mainBucketKey: selectedAiMainBucketKey,
                        subBucketKey: selectedAiBucketKey,
                        isLlmSelected: selectedBreakdownKey === 'llm-validation',
                        llmOptionLabel: report?.llmValidation?.status === 'stale' ? 'LLM Findings (Stale)' : 'LLM Findings',
                        summaryLabel: (() => {
                            if (selectedBreakdownKey === 'llm-validation') {
                                return report?.llmValidation?.status === 'stale'
                                    ? 'LLM Findings (Stale)'
                                    : 'LLM Findings';
                            }
                            if (!selectedAiMainBucketKey && !selectedAiBucketKey) return null;
                            const main = aiBucketOptions.find((o: { key: string }) => o.key === selectedAiMainBucketKey);
                            const sub = main?.subBuckets.find((s: { key: string }) => s.key === selectedAiBucketKey);
                            if (main && sub) return `${main.label} > ${sub.label}`;
                            if (main) return main.label;
                            return null;
                        })(),
                        options: aiBucketOptions,
                        onSelectLlm: () => {
                            setSelectedAiMainBucketKey(null);
                            setSelectedAiBucketKey(null);
                            setSelectedBreakdownKey('llm-validation');
                        },
                        onChangeMainBucket: (key: string | null) => {
                            if (selectedBreakdownKey === 'llm-validation') {
                                setSelectedBreakdownKey(null);
                            }
                            setSelectedAiMainBucketKey(key);
                            if (!key) {
                                setSelectedAiBucketKey(null);
                                return;
                            }
                            if (selectedAiBucketKey) {
                                const selectedMain = subBucketToMainBucketMap.get(selectedAiBucketKey);
                                if (selectedMain !== key) {
                                    setSelectedAiBucketKey(null);
                                }
                            }
                        },
                        onChangeSubBucket: (key: string | null) => {
                            if (selectedBreakdownKey === 'llm-validation') {
                                setSelectedBreakdownKey(null);
                            }
                            setSelectedAiBucketKey(key);
                            if (!key) return;
                            const main = subBucketToMainBucketMap.get(key) || null;
                            setSelectedAiMainBucketKey(main);
                        },
                        onClear: () => {
                            setSelectedBreakdownKey(null);
                            setSelectedAiMainBucketKey(null);
                            setSelectedAiBucketKey(null);
                        }
                    } : undefined}
                    breakdownFilter={resolvedReportId !== 'ai-readiness' ? {
                        selectedKey: selectedBreakdownKey,
                        summaryLabel: breakdownFilterOptions.find((option) => option.key === selectedBreakdownKey)?.label || null,
                        options: breakdownFilterOptions,
                        onChange: (key: string | null) => setSelectedBreakdownKey(key),
                    } : undefined}
                />
            </div>
        </Root>
    );
};
