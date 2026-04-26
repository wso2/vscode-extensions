/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */

import React from 'react';
import {
    SpectralRuleset,
    type GetGovernanceResponse,
    type UnifiedAnalyzeReport
} from '@wso2/api-designer-core';
import { NormalizedGovernanceViolation } from '../../../types/violations';

export type AnalyzeReportKey = 'ai-readiness' | 'owasp' | 'wso2-rest';

// ── Types ──────────────────────────────────────────────────────────────────

export type SeverityLevel = 'error' | 'warn' | 'info' | 'hint';
export type GroupBy = 'none' | 'rule' | 'endpoint';
export type SortBy = 'severity' | 'rule' | 'line';
export type SortDir = 'asc' | 'desc';

export interface IssueRow {
    id: string;
    violation: NormalizedGovernanceViolation;
    rule: string;
    message: string;
    path: string;
    endpoint: string;
    method: string;
    severity: SeverityLevel;
    line: number;
    breakdownKeys?: string[];
}

export interface ReportState {
    rulesetName: string;
    score: number;
    passedChecks: number;
    totalChecks: number;
    violations: NormalizedGovernanceViolation[];
    ruleset?: SpectralRuleset;
    report: UnifiedAnalyzeReport;
    llmValidation?: {
        status: 'pending' | 'ready' | 'failed' | 'stale';
        apiHash: string;
        updatedAt: number;
        result?: {
            score: number;
            summary: string;
            findings: Array<{
                id: string;
                rule: string;
                message: string;
                severity: 'error' | 'warn' | 'info' | 'hint';
                pathSegments: string[];
                displayPath: string;
                suggestion?: string;
            }>;
        };
        error?: string;
    };
}

// ── Utilities ──────────────────────────────────────────────────────────────

export const severityRank: Record<SeverityLevel, number> = { error: 3, warn: 2, info: 1, hint: 0 };

type ScoreBand = { min: number; grade: string; color: string };

const SCORE_BANDS: ScoreBand[] = [
    { min: 90, grade: 'A', color: 'var(--vscode-testing-iconPassed, #22c55e)' },
    { min: 75, grade: 'B', color: '#3b82f6' },
    { min: 60, grade: 'C', color: 'var(--vscode-editorWarning-foreground)' },
    { min: 40, grade: 'D', color: '#f97316' },
    { min: 0, grade: 'F', color: 'var(--vscode-errorForeground)' },
];

const getScoreBand = (score: number): ScoreBand => {
    const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0));
    return SCORE_BANDS.find((band) => normalizedScore >= band.min) || SCORE_BANDS[SCORE_BANDS.length - 1];
};

export const scoreGrade = (score: number): string => getScoreBand(score).grade;

export const scoreColor = (score: number): string => getScoreBand(score).color;

export const extractEndpoint = (segments: string[]): { endpoint: string; method: string } => {
    const pathsIndex = segments.indexOf('paths');
    if (pathsIndex >= 0) {
        const endpoint = segments[pathsIndex + 1] || 'global';
        const methodRaw = segments[pathsIndex + 2] || '';
        const method = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'].includes(methodRaw)
            ? methodRaw.toUpperCase()
            : 'GLOBAL';
        return { endpoint, method };
    }
    return { endpoint: 'global', method: 'GLOBAL' };
};

export const extractOwaspReference = (rule: string): string | null => {
    const match = rule.toUpperCase().match(/API\d+(?::\d{4})?/);
    return match ? match[0] : null;
};

export const getSpecSnippet = (specContent: string, range?: NormalizedGovernanceViolation['range']): string | null => {
    if (!specContent || !range) return null;
    const lines = specContent.split(/\r?\n/);
    const start = Math.max(0, range.start.line - 2);
    const end = Math.min(lines.length, range.end.line + 3);
    return lines
        .slice(start, end)
        .map((line, idx) => `${start + idx + 1}`.padStart(4, ' ') + ' | ' + line)
        .join('\n');
};

const toSeverity = (severity?: string): SeverityLevel => {
    if (severity === 'error' || severity === 'warn' || severity === 'info' || severity === 'hint') return severity;
    return 'info';
};

export const buildIssueRows = (violations: NormalizedGovernanceViolation[]): IssueRow[] =>
    violations.map((violation, index) => {
        const rule = violation.rule || violation.code || 'unknown-rule';
        const { endpoint, method } = extractEndpoint(violation.pathSegments || []);
        return {
            id: `${rule}:${index}`,
            violation,
            rule,
            message: violation.message || 'No message provided',
            path: violation.displayPath || 'Unknown path',
            endpoint,
            method,
            severity: toSeverity(violation.severity),
            line: (violation.range?.start.line ?? -1) + 1,
            breakdownKeys: (violation as NormalizedGovernanceViolation & { breakdownKeys?: string[] }).breakdownKeys,
        };
    });

export const buildLlmIssueRows = (llmValidation?: ReportState['llmValidation']): IssueRow[] => {
    const canShowCachedFindings =
        llmValidation?.status === 'ready' ||
        llmValidation?.status === 'stale';
    if (!canShowCachedFindings || !llmValidation.result?.findings) {
        return [];
    }
    return llmValidation.result.findings.map((finding, index: number) => {
        const { endpoint, method } = extractEndpoint(finding.pathSegments || []);
        return {
            id: `llm:${finding.id || index}`,
            violation: {
                pathSegments: finding.pathSegments || [],
                displayPath: finding.displayPath || 'General',
                message: finding.message,
                description: finding.suggestion,
                severity: finding.severity,
                rule: finding.rule,
                code: finding.rule,
            } as unknown as NormalizedGovernanceViolation,
            rule: finding.rule || 'llm.validation',
            message: finding.message || 'LLM validation finding',
            path: finding.displayPath || 'General',
            endpoint,
            method,
            severity: toSeverity(finding.severity),
            line: -1,
            breakdownKeys: ['llm-validation'],
        };
    });
};

const sortRows = (rows: IssueRow[], sortBy: SortBy, sortDir: SortDir): IssueRow[] => {
    const list = [...rows];
    list.sort((a, b) => {
        let result = 0;
        if (sortBy === 'severity') result = severityRank[b.severity] - severityRank[a.severity];
        else if (sortBy === 'line') result = a.line - b.line;
        else result = a.rule.localeCompare(b.rule);
        return sortDir === 'asc' ? result : -result;
    });
    return list;
};

export const groupRows = (rows: IssueRow[], groupBy: GroupBy): Array<{ key: string; rows: IssueRow[] }> => {
    if (groupBy === 'none') return [{ key: 'All issues', rows }];
    const map = new Map<string, IssueRow[]>();
    rows.forEach((row) => {
        const key = groupBy === 'rule' ? row.rule : `${row.method} ${row.endpoint}`;
        const bucket = map.get(key) || [];
        bucket.push(row);
        map.set(key, bucket);
    });
    return Array.from(map.entries())
        .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
        .map(([key, groupedRows]) => ({ key, rows: groupedRows }));
};

// ── Hooks ──────────────────────────────────────────────────────────────────

interface UseReportDataResult {
    loading: boolean;
    error: string | null;
    report: ReportState | null;
    specContent: string;
}

export const useReportData = (
    rpcClient: any,
    fileUri: string,
    refreshToken: number,
    reportKey: AnalyzeReportKey,
): UseReportDataResult => {
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [report, setReport] = React.useState<ReportState | null>(null);
    const [specContent, setSpecContent] = React.useState('');
    const [pollTick, setPollTick] = React.useState(0);

    React.useEffect(() => {
        let disposed = false;

        const load = async () => {
            if (!rpcClient || !fileUri) return;
            const isBackgroundLlmPoll =
                pollTick > 0 &&
                report?.llmValidation?.status === 'pending' &&
                !!report;
            // Keep already-rendered report mounted; only show full-screen loading for first load.
            if (!isBackgroundLlmPoll && !report) {
                setLoading(true);
            }
            setError(null);

            try {
                const client = rpcClient.getApiDesignerVisualizerRpcClient();
                const rulesetsResponse = await client.getApplicableRulesets({ filePath: fileUri });

                let selectedRuleset: SpectralRuleset | undefined;
                if (reportKey === 'ai-readiness') {
                    selectedRuleset = rulesetsResponse.aiReadinessRuleset;
                } else {
                    const governanceRulesets = rulesetsResponse.governanceRulesets || [];
                    selectedRuleset = governanceRulesets.find((ruleset: SpectralRuleset) => {
                        const name = (ruleset.name || '').toLowerCase();
                        if (reportKey === 'owasp') return name.includes('owasp') || name.includes('security');
                        return name.includes('design') || name.includes('rest');
                    });
                }

                if (!selectedRuleset) {
                    throw new Error(`No matching ruleset found for report: ${reportKey}`);
                }

                const [governance, contentResponse] = await Promise.all([
                    client.getGovernance({ filePath: fileUri, name: selectedRuleset.name, ruleset: selectedRuleset }),
                    client.getAPISpecContent({ filePath: fileUri }),
                ]) as [GetGovernanceResponse, { content?: string }];

                if (disposed) return;

                const unifiedReport = governance.report;
                if (!unifiedReport) {
                    throw new Error('Governance report payload is missing.');
                }

                const normalizedViolations = Object.values(
                    (unifiedReport.violationsById || {}) as Record<string, any>
                ).map((violation) => ({
                        pathSegments: violation.pathSegments,
                        displayPath: violation.displayPath,
                        message: violation.message,
                        description: violation.description,
                        fixSuggestion: violation.fixSuggestion,
                        severity: violation.severity,
                        rule: violation.rule,
                        code: violation.code,
                        range: violation.range,
                        breakdownKeys: violation.breakdownKeys,
                    } as NormalizedGovernanceViolation & { breakdownKeys?: string[] }));

                const passedChecks = unifiedReport.overview.passedChecks;
                const totalChecks = unifiedReport.overview.totalChecks;

                setReport((prev) => {
                    const incomingLlmValidation = (governance as GetGovernanceResponse & {
                        llmValidation?: ReportState['llmValidation'];
                    }).llmValidation;
                    // Some stale payloads may not include cached findings.
                    // Preserve the previous result so users can still inspect prior issues while stale.
                    const llmValidation =
                        incomingLlmValidation?.status === 'stale' &&
                        !incomingLlmValidation.result &&
                        prev?.llmValidation?.result
                            ? { ...incomingLlmValidation, result: prev.llmValidation.result }
                            : incomingLlmValidation;

                    return {
                        rulesetName: selectedRuleset.name,
                        score: unifiedReport.overview.score,
                        passedChecks,
                        totalChecks,
                        violations: normalizedViolations,
                        ruleset: selectedRuleset,
                        report: unifiedReport,
                        llmValidation,
                    };
                });
                setSpecContent(contentResponse?.content || '');
            } catch (e: any) {
                if (!disposed) {
                    setError(e?.message || 'Failed to load report.');
                    setReport(null);
                }
            } finally {
                if (!disposed) {
                    setLoading(false);
                }
            }
        };

        load();
        let pollTimer: ReturnType<typeof setTimeout> | undefined;
        if (report?.llmValidation?.status === 'pending') {
            pollTimer = setTimeout(() => setPollTick((tick) => tick + 1), 3000);
        }
        return () => {
            disposed = true;
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [rpcClient, fileUri, refreshToken, reportKey, pollTick, report?.llmValidation?.status]);

    return { loading, error, report, specContent };
};

interface UseIssueFiltersInput {
    severityFilter: 'all' | SeverityLevel;
    search: string;
    sortBy: SortBy;
    sortDir: SortDir;
    groupBy: GroupBy;
}

export const useIssueFilters = (rows: IssueRow[], filters: UseIssueFiltersInput) => {
    const { severityFilter, search, sortBy, sortDir, groupBy } = filters;

    const filteredRows = React.useMemo(() => {
        const query = search.trim().toLowerCase();
        const result = rows.filter((row) => {
            if (severityFilter !== 'all' && row.severity !== severityFilter) return false;
            if (!query) return true;
            return (
                row.rule.toLowerCase().includes(query) ||
                row.message.toLowerCase().includes(query) ||
                row.path.toLowerCase().includes(query) ||
                row.endpoint.toLowerCase().includes(query)
            );
        });
        return sortRows(result, sortBy, sortDir);
    }, [rows, severityFilter, search, sortBy, sortDir]);

    const groupedRows = React.useMemo(() => groupRows(filteredRows, groupBy), [filteredRows, groupBy]);

    return { filteredRows, groupedRows };
};
