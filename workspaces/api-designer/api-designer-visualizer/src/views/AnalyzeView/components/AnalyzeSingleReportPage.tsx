/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */

import React from 'react';
import styled from '@emotion/styled';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { getAiReadinessRuleSubBucket } from '@wso2/api-designer-core';
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
import { buildRulesetFileUrl } from './AnalyzeSingleReportHelpers';
import { AnalyzeSingleReportIssueExplorer } from './AnalyzeSingleReportIssueExplorer';

export type { AnalyzeReportKey };

interface AnalyzeSingleReportPageProps {
    fileUri: string;
    refreshToken: number;
    reportKey: AnalyzeReportKey;
}

const openCopilotChat = (context: string, prompt: string) =>
    postVSCodeMessage({ command: 'openCopilotChat', data: { context, prompt } });

const Root = styled.div`
    width: 100%;
    padding: 28px 32px 40px;
    box-sizing: border-box;
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
    font-size: 13px;
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
    const aiReadinessDimensions = React.useMemo(
        () => (effectiveReportId === 'ai-readiness' ? report?.report.aiReadinessSummary.dimensions || [] : []),
        [effectiveReportId, report]
    );

    const [expandedBucketKeys, setExpandedBucketKeys] = React.useState<Set<string>>(new Set());
    const toggleBucketKey = React.useCallback((key: string) => {
        setExpandedBucketKeys((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }, []);
    React.useEffect(() => {
        setExpandedBucketKeys(new Set());
    }, [fileUri, reportKey]);
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
        const dimensions = (
            report?.report.reportId === 'ai-readiness' ? report.report.aiReadinessSummary.dimensions : []
        ) as Array<{
            key: string;
            label: string;
            subBuckets: Array<{ key: string; label: string }>;
        }>;
        return dimensions.map((dimension: { key: string; label: string; subBuckets: Array<{ key: string; label: string }> }) => ({
            key: dimension.key,
            label: dimension.label,
            subBuckets: (dimension.subBuckets || []).map((subBucket: { key: string; label: string }) => ({
                key: subBucket.key,
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
                const subBucket = getAiReadinessRuleSubBucket(row.rule);
                if (!subBucket) return false;
                const mainBucket = subBucketToMainBucketMap.get(subBucket) || null;
                if (selectedAiMainBucketKey && mainBucket !== selectedAiMainBucketKey) return false;
                if (selectedAiBucketKey && subBucket !== selectedAiBucketKey) return false;
                return true;
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
    const handleReevaluateLlm = React.useCallback(() => {
        postVSCodeMessage({ command: 'reevaluateLlmValidation' });
        setManualRefreshTick((value) => value + 1);
    }, []);
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
    const issueExplorerReportKey: AnalyzeReportKey = resolvedReportId === 'rest-api-readiness' ? 'wso2-rest' : resolvedReportId;
    const reportUiMeta = report.report as typeof report.report & {
        breakdown: { subtitle?: string };
        issueExplorer: { title?: string; subtitle?: string };
        llmReview?: {
            title?: string;
            subtitle?: string;
            viewFindingsLabel?: string;
            reevaluateLabel?: string;
        };
    };
    return (
        <Root>
            <AnalyzeSingleReportOverview
                score={score}
                gradeColor={gradeColor}
                title={report.report.title || report.rulesetName}
                errorCount={errorCount}
                warningCount={warningCount}
                passedChecks={report.passedChecks}
                totalChecks={report.totalChecks}
                endpointsAffected={stats.endpointCount}
                onViewEndpointIssues={handleViewEndpointIssues}
                onViewErrorIssues={handleViewErrorIssues}
                onViewWarningIssues={handleViewWarningIssues}
            />

            <AnalyzeSingleReportBreakdown
                reportKey={reportKey}
                title={report.report.breakdown.title}
                subtitle={reportUiMeta.breakdown.subtitle}
                llmReview={resolvedReportId === 'ai-readiness' ? reportUiMeta.llmReview : undefined}
                aiReadinessDimensions={aiReadinessDimensions}
                totalRows={rows.length}
                violations={rows}
                expandedBucketKeys={expandedBucketKeys}
                onToggleBucket={toggleBucketKey}
                onViewIssues={handleViewIssues}
                onReevaluateLlm={handleReevaluateLlm}
                unifiedCategories={report.report.breakdown.categories}
                llmValidation={report.llmValidation}
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
                    onOpenCopilotChat={openCopilotChat}
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
