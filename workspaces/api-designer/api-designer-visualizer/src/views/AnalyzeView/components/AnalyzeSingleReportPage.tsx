/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */

import React from 'react';
import styled from '@emotion/styled';
import { Codicon } from '@wso2/ui-toolkit';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { useAIAvailability } from '../../../hooks/useAIAvailability';
import {
    useReportData,
    useIssueFilters,
    buildIssueRows,
    scoreColor,
    SeverityLevel,
    GroupBy,
    SortBy,
    SortDir,
    AnalyzeReportKey,
} from '../hooks/useReport';
import { AnalyzeSingleReportOverview } from './AnalyzeSingleReportOverview';
import { AnalyzeSingleReportBreakdown } from './AnalyzeSingleReportBreakdown';
import {
    REPORT_TITLES,
    OWASP_CATEGORIES,
    buildRulesetFileUrl,
    getRuleBucket,
} from './AnalyzeSingleReportHelpers';
import { AnalyzeSingleReportIssueExplorer } from './AnalyzeSingleReportIssueExplorer';

export type { AnalyzeReportKey };

interface AnalyzeSingleReportPageProps {
    fileUri: string;
    refreshToken: number;
    reportKey: AnalyzeReportKey;
}

type ActiveTab = 'issues' | 'endpoints';

const openCopilotChat = (context: string, prompt: string) =>
    postVSCodeMessage({ command: 'openCopilotChat', data: { context, prompt } });

const Root = styled.div`
    width: 100%;
    padding: 20px 24px 32px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const HeaderBar = styled.div`
    border-bottom: 1px solid var(--vscode-panel-border);
    padding: 8px 2px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

const HeaderTitle = styled.h2`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const HeaderTitleGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const HeaderSubtitle = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-top: 0;
`;

const MessageCard = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    background: var(--vscode-editor-background);
    padding: 20px 24px;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
`;

const BackButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 10px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background: var(--vscode-editorWidget-background);
    color: var(--vscode-foreground);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: border-color 120ms ease, background 120ms ease, transform 120ms ease;

    &:hover {
        border-color: var(--vscode-focusBorder);
        background: var(--vscode-list-hoverBackground);
        transform: translateY(-1px);
    }
`;

export const AnalyzeSingleReportPage: React.FC<AnalyzeSingleReportPageProps> = ({
    fileUri,
    refreshToken,
    reportKey,
}) => {
    const { rpcClient } = useVisualizerContext();
    const { loading, error, report, specContent } = useReportData(rpcClient, fileUri, refreshToken, reportKey);
    const isAIAvailable = useAIAvailability();

    const [activeTab, setActiveTab] = React.useState<ActiveTab>('issues');
    const [expandedBucketKeys, setExpandedBucketKeys] = React.useState<Set<string>>(new Set());
    const toggleBucketKey = React.useCallback((key: string) => {
        setExpandedBucketKeys((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }, []);
    const [severityFilter, setSeverityFilter] = React.useState<'all' | SeverityLevel>('all');
    const [groupBy, setGroupBy] = React.useState<GroupBy>('none');
    const [sortBy, setSortBy] = React.useState<SortBy>('severity');
    const [sortDir, setSortDir] = React.useState<SortDir>('asc');
    const [search, setSearch] = React.useState('');
    const [selectedIssueId, setSelectedIssueId] = React.useState<string | null>(null);

    const rows = React.useMemo(() => buildIssueRows(report?.violations || []), [report]);
    const { filteredRows, groupedRows } = useIssueFilters(rows, { severityFilter, search, sortBy, sortDir, groupBy });

    React.useEffect(() => {
        if (!rows.length) {
            setSelectedIssueId(null);
            return;
        }
        if (!selectedIssueId || !rows.some((r) => r.id === selectedIssueId)) {
            setSelectedIssueId(rows[0].id);
        }
    }, [rows, selectedIssueId]);

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

    const breakdownSummary = React.useMemo<Array<{
        id: string; key: string; name: string; count: number; errors: number; warnings: number; docsUrl?: string;
    }>>(() => {
        if (reportKey === 'owasp') {
            const map = new Map<string, { count: number; errors: number; warnings: number }>();
            rows.forEach((row) => {
                const m = row.rule.toUpperCase().match(/API\d+/);
                const key = m?.[0] || null;
                if (!key) return;
                const cur = map.get(key) || { count: 0, errors: 0, warnings: 0 };
                cur.count++;
                if (row.severity === 'error') cur.errors++;
                if (row.severity === 'warn') cur.warnings++;
                map.set(key, cur);
            });
            return OWASP_CATEGORIES.map((cat) => ({
                id: cat.id, key: cat.key, name: cat.name, docsUrl: cat.docsUrl,
                ...(map.get(cat.key) || { count: 0, errors: 0, warnings: 0 }),
            })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
        }
        const map = new Map<string, { id: string; key: string; name: string; count: number; errors: number; warnings: number }>();
        rows.forEach((row) => {
            const bucket = getRuleBucket(row.rule, reportKey);
            const cur = map.get(bucket.id) || { id: bucket.id, key: bucket.id, name: bucket.name, count: 0, errors: 0, warnings: 0 };
            cur.count++;
            if (row.severity === 'error') cur.errors++;
            if (row.severity === 'warn') cur.warnings++;
            map.set(bucket.id, cur);
        });
        return Array.from(map.values()).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
    }, [rows, reportKey]);

    const aiBucketSummary = React.useMemo(() => {
        if (reportKey !== 'ai-readiness') return [];
        const buckets = report?.aiReadinessSummary?.buckets;
        if (Array.isArray(buckets) && buckets.length > 0) {
            return buckets.map((bucket) => ({
                key: bucket.key,
                label: bucket.label,
                filled: bucket.filled,
                total: bucket.total,
                percentage: bucket.percentage,
                rules: bucket.rules,
            }));
        }
        return [];
    }, [reportKey, report]);

    const endpointSummary = React.useMemo(() => {
        const map = new Map<string, { count: number; errors: number; warnings: number; method: string; endpoint: string; rules: Map<string, number> }>();
        rows.forEach((row) => {
            const key = `${row.method} ${row.endpoint}`;
            const cur = map.get(key) || { count: 0, errors: 0, warnings: 0, method: row.method, endpoint: row.endpoint, rules: new Map() };
            cur.count++;
            if (row.severity === 'error') cur.errors++;
            if (row.severity === 'warn') cur.warnings++;
            cur.rules.set(row.rule, (cur.rules.get(row.rule) || 0) + 1);
            map.set(key, cur);
        });
        return Array.from(map.values())
            .map((item) => ({
                ...item,
                topRules: Array.from(item.rules.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([r]) => r),
                dominantSeverity: item.errors > 0 ? 'error' as const : 'warn' as const,
            }))
            .sort((a, b) => b.count - a.count);
    }, [rows]);

    const ruleFrequency = React.useMemo(() => {
        const map = new Map<string, { total: number; errors: number; warnings: number }>();
        rows.forEach((row) => {
            const cur = map.get(row.rule) || { total: 0, errors: 0, warnings: 0 };
            cur.total++;
            if (row.severity === 'error') cur.errors++;
            if (row.severity === 'warn') cur.warnings++;
            map.set(row.rule, cur);
        });
        return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total).map(([rule, value]) => ({ rule, ...value }));
    }, [rows]);

    const goBackToDesign = () => postVSCodeMessage({ command: 'switchView', viewType: 'preview', fileUri });
    const title = REPORT_TITLES[reportKey];
    const score = Math.max(0, Math.min(100, Number(report?.score || 0)));
    const gradeColor = scoreColor(score);
    const rulesetFileUrl = buildRulesetFileUrl(report?.ruleset);
    const aiEnabled = isAIAvailable && !!fileUri && !!rulesetFileUrl && !!report?.ruleset?.rulesetContentPath;

    if (loading) {
        return (
            <Root>
                <HeaderBar>
                    <HeaderTitleGroup>
                        <HeaderTitle>{title}</HeaderTitle>
                        <HeaderSubtitle>Loading report…</HeaderSubtitle>
                    </HeaderTitleGroup>
                    <BackButton onClick={goBackToDesign}>
                        <Codicon name="arrow-left" sx={{ fontSize: '13px' }} />
                        Back to Design
                    </BackButton>
                </HeaderBar>
            </Root>
        );
    }

    if (error || !report) {
        return (
            <Root>
                <HeaderBar>
                    <HeaderTitleGroup>
                        <HeaderTitle>{title}</HeaderTitle>
                        <HeaderSubtitle>Unable to generate report</HeaderSubtitle>
                    </HeaderTitleGroup>
                    <BackButton onClick={goBackToDesign}>
                        <Codicon name="arrow-left" sx={{ fontSize: '13px' }} />
                        Back to Design
                    </BackButton>
                </HeaderBar>
                <MessageCard>{error || 'No report data available.'}</MessageCard>
            </Root>
        );
    }

    return (
        <Root>
            <HeaderBar>
                <HeaderTitleGroup>
                    <HeaderTitle>{title}</HeaderTitle>
                    <HeaderSubtitle>{report.rulesetName}</HeaderSubtitle>
                </HeaderTitleGroup>
                <BackButton onClick={goBackToDesign}>
                    <Codicon name="arrow-left" sx={{ fontSize: '13px' }} />
                    Back to Design
                </BackButton>
            </HeaderBar>

            <AnalyzeSingleReportOverview
                score={score}
                gradeColor={gradeColor}
                stats={stats}
                totalIssues={rows.length}
                passedChecks={report.passedChecks}
                totalChecks={report.totalChecks}
            />

            <AnalyzeSingleReportBreakdown
                reportKey={reportKey}
                aiBucketSummary={aiBucketSummary}
                breakdownSummary={breakdownSummary}
                totalRows={rows.length}
                violations={rows}
                expandedBucketKeys={expandedBucketKeys}
                onToggleBucket={toggleBucketKey}
                onViewIssues={() => setActiveTab('issues')}
            />

            <AnalyzeSingleReportIssueExplorer
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                rows={rows}
                stats={{ errors: stats.errors, warnings: stats.warnings }}
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
                reportKey={reportKey}
                reportName={report.rulesetName}
                fileUri={fileUri}
                rulesetFileUrl={rulesetFileUrl}
                rulesetContentPath={report.ruleset?.rulesetContentPath}
                specContent={specContent}
                endpointSummary={endpointSummary}
                ruleFrequency={ruleFrequency}
                onOpenCopilotChat={openCopilotChat}
            />
        </Root>
    );
};
