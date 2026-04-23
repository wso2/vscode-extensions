/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 */

import React from 'react';
import styled from '@emotion/styled';
import { Button, Codicon } from '@wso2/ui-toolkit';
import { useVisualizerContext } from '@wso2/api-designer-rpc-client';
import { SpectralRuleset } from '@wso2/api-designer-core';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { useAIAvailability } from '../../../hooks/useAIAvailability';
import { AIButton } from '../../../components/ai/AIButton';
import { NormalizedGovernanceViolation } from '../../../types/violations';
import {
    useReportData,
    useIssueFilters,
    buildIssueRows,
    extractOwaspReference,
    scoreGrade,
    scoreColor,
    SeverityLevel,
    GroupBy,
    SortBy,
    SortDir,
    AnalyzeReportKey,
} from '../hooks/useReport';

// ── Re-export for consumers (AnalyzeView, AnalyzeReportReference, etc.) ───
export type { AnalyzeReportKey };

interface AnalyzeSingleReportPageProps {
    fileUri: string;
    refreshToken: number;
    reportKey: AnalyzeReportKey;
}

type ActiveTab = 'issues' | 'endpoints';

// ── Helpers ────────────────────────────────────────────────────────────────

const REPORT_TITLES: Record<AnalyzeReportKey, string> = {
    'ai-readiness': 'AI Readiness Report',
    'owasp': 'OWASP Security Report',
    'wso2-rest': 'WSO2 REST API Guidelines Report',
};

const BREAKDOWN_TITLES: Record<AnalyzeReportKey, string> = {
    'ai-readiness': 'AI Readiness Breakdown',
    'owasp': 'OWASP Breakdown',
    'wso2-rest': 'WSO2 REST Guidelines Breakdown',
};

const OWASP_CATEGORIES = [
    { id: 'API1:2023', key: 'API1', name: 'Broken Object Level Authorization',         docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/' },
    { id: 'API2:2023', key: 'API2', name: 'Broken Authentication',                     docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/' },
    { id: 'API3:2023', key: 'API3', name: 'Broken Object Property Level Authorization', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/' },
    { id: 'API4:2023', key: 'API4', name: 'Unrestricted Resource Consumption',         docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/' },
    { id: 'API5:2023', key: 'API5', name: 'Broken Function Level Authorization',       docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/' },
    { id: 'API6:2023', key: 'API6', name: 'Unrestricted Access to Sensitive Business Flows', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/' },
    { id: 'API7:2023', key: 'API7', name: 'Server Side Request Forgery',               docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa7-server-side-request-forgery/' },
    { id: 'API8:2023', key: 'API8', name: 'Security Misconfiguration',                 docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/' },
    { id: 'API9:2023', key: 'API9', name: 'Improper Inventory Management',             docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/' },
    { id: 'API10:2023', key: 'API10', name: 'Unsafe Consumption of APIs',              docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xaa-unsafe-consumption-of-apis/' },
];

const METHOD_COLORS: Record<string, { color: string; bg: string }> = {
    GET:    { color: 'var(--vscode-editorInfo-foreground, #3b82f6)',   bg: 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #3b82f6) 14%, transparent)' },
    POST:   { color: 'var(--vscode-testing-iconPassed, #22c55e)',      bg: 'color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 14%, transparent)' },
    PUT:    { color: 'var(--vscode-editorWarning-foreground)',         bg: 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 14%, transparent)' },
    PATCH:  { color: '#a78bfa',                                        bg: 'color-mix(in srgb, #a78bfa 14%, transparent)' },
    DELETE: { color: 'var(--vscode-errorForeground)',                  bg: 'color-mix(in srgb, var(--vscode-errorForeground) 14%, transparent)' },
};

const getMethodStyle = (method: string) =>
    METHOD_COLORS[method] ?? { color: 'var(--vscode-descriptionForeground)', bg: 'color-mix(in srgb, var(--vscode-descriptionForeground) 12%, transparent)' };

const getRuleBucket = (rule: string, reportKey: AnalyzeReportKey): { id: string; name: string } => {
    if (reportKey === 'owasp') {
        const ref = extractOwaspReference(rule);
        if (ref) return { id: ref, name: ref };
        return { id: 'General', name: 'General' };
    }
    if (reportKey === 'ai-readiness') {
        const normalized = rule.replace(/^ai-readiness-/, '');
        const bucket = normalized.split('-')[0] || 'general';
        return { id: bucket.toUpperCase(), name: bucket.replace(/_/g, ' ') };
    }
    const normalized = rule.replace(/^wso2[-_]?/i, '');
    const bucket = normalized.split('-')[0] || 'general';
    return { id: bucket.toUpperCase(), name: bucket.replace(/_/g, ' ') };
};

const getReferenceTag = (rule: string, reportKey: AnalyzeReportKey): string | null => {
    if (reportKey === 'owasp') return extractOwaspReference(rule);
    const bucket = getRuleBucket(rule, reportKey);
    return bucket.id || null;
};

const buildRulesetFileUrl = (ruleset?: SpectralRuleset): string | undefined => {
    if (!ruleset?.sourceFolder || !ruleset?.fileName) return undefined;
    const { sourceFolder, fileName } = ruleset;
    if (sourceFolder.includes('github.com') && !sourceFolder.includes('raw.githubusercontent.com')) {
        const match = sourceFolder.match(/github\.com\/([^/]+)\/([^/]+)\/(?:blob|tree)\/([^/]+)(?:\/(.+))?/);
        if (match) {
            const [, owner, repo, branch, folderPath] = match;
            const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;
            const fullPath = folderPath ? `${rawBase}/${folderPath}/${fileName}` : `${rawBase}/${fileName}`;
            return fullPath.replace(/\/+/g, '/').replace('https:/', 'https://');
        }
    }
    return `${sourceFolder}/${fileName}`.replace(/\/+/g, '/');
};

const openCopilotChat = (context: string, prompt: string) =>
    postVSCodeMessage({ command: 'openCopilotChat', data: { context, prompt } });

const extractSnippetLines = (content: string, range?: NormalizedGovernanceViolation['range']) => {
    if (!content || !range) return null;
    const lines = content.split('\n');
    const from = Math.max(0, range.start.line - 2);
    const to = Math.min(lines.length - 1, range.end.line + 2);
    return lines.slice(from, to + 1).map((text, i) => ({
        lineNumber: from + i + 1,
        text,
        highlight: from + i >= range.start.line && from + i <= range.end.line,
    }));
};

// ── Shared layout primitives ───────────────────────────────────────────────

const Root = styled.div`
    width: 100%;
    padding: 20px 24px 32px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

// ── Header ────────────────────────────────────────────────────────────────

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

const HeaderSubtitle = styled.div`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-top: 4px;
`;

const SectionBlock = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 10px;
    background: var(--vscode-editor-background);
    overflow: hidden;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editorGroupHeader-tabsBackground);
`;

const SectionTitleText = styled.div`
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--vscode-foreground);
`;

// ── Stats bar ─────────────────────────────────────────────────────────────

const StatsBar = styled.div`
    display: grid;
    grid-template-columns: minmax(100px, 0.75fr) repeat(5, minmax(0, 1fr));
    gap: 8px;
    padding: 10px;
`;

const ScoreCard = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 10px 12px;
    background: var(--vscode-editorWidget-background);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
`;

const StatCard = styled.div<{ $accent: string }>`
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid ${({ $accent }: { $accent: string }) => $accent};
    border-radius: 8px;
    padding: 10px 12px;
    background: var(--vscode-editorWidget-background);
    min-width: 0;
`;

const StatLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--vscode-descriptionForeground);
`;

const StatValue = styled.div`
    font-size: 22px;
    font-weight: 700;
    color: var(--vscode-foreground);
    line-height: 1.1;
    margin-top: 4px;
`;

const StatSub = styled.div`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    margin-top: 2px;
`;

// ── Tab bar ───────────────────────────────────────────────────────────────

const TabBar = styled.div`
    display: flex;
    gap: 4px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 4px;
    width: fit-content;
`;

const TabBtn = styled.button<{ $active: boolean }>`
    border: none;
    background: ${({ $active }: { $active: boolean }) => ($active ? 'var(--vscode-button-background)' : 'transparent')};
    color: ${({ $active }: { $active: boolean }) => ($active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)')};
    border-radius: 5px;
    height: 28px;
    padding: 0 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    opacity: ${({ $active }: { $active: boolean }) => ($active ? 1 : 0.75)};
    transition: background 0.1s, opacity 0.1s;

    &:hover {
        opacity: 1;
        background: ${({ $active }: { $active: boolean }) => ($active ? 'var(--vscode-button-background)' : 'var(--vscode-list-hoverBackground)')};
    }
`;

// ── Issues layout ─────────────────────────────────────────────────────────

const IssuesLayout = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    align-items: stretch;
    height: min(72vh, 760px);
`;

const Panel = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 0;
    background: var(--vscode-editor-background);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
`;

// ── Toolbar ───────────────────────────────────────────────────────────────

const Toolbar = styled.div`
    border-bottom: 1px solid var(--vscode-panel-border);
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--vscode-editorGroupHeader-tabsBackground);
`;

const ToolbarRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
`;

const FilterChip = styled.button<{ $active: boolean }>`
    height: 26px;
    border-radius: 6px;
    border: 1px solid ${({ $active }: { $active: boolean }) => ($active ? 'var(--vscode-button-background)' : 'var(--vscode-panel-border)')};
    background: ${({ $active }: { $active: boolean }) => ($active ? 'var(--vscode-button-background)' : 'var(--vscode-editor-background)')};
    color: ${({ $active }: { $active: boolean }) => ($active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)')};
    font-size: 11px;
    font-weight: 600;
    padding: 0 10px;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
`;

const SearchInput = styled.input`
    height: 26px;
    min-width: 220px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    padding: 0 10px;
    font-size: 12px;
    outline: none;

    &:focus {
        border-color: var(--vscode-focusBorder);
    }
`;

const Spacer = styled.div`
    flex: 1;
`;

const CtrlSelect = styled.select`
    height: 26px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background: var(--vscode-dropdown-background);
    color: var(--vscode-dropdown-foreground);
    padding: 0 8px;
    font-size: 11px;
    cursor: pointer;
`;

// ── Issues list (card style) ──────────────────────────────────────────────

const GroupHeader = styled.div`
    font-size: 11px;
    font-weight: 700;
    color: var(--vscode-descriptionForeground);
    padding: 6px 12px;
    background: color-mix(in srgb, var(--vscode-editorWidget-background) 80%, transparent);
    border-bottom: 1px solid var(--vscode-panel-border);
`;

const IssueCardsBody = styled.div`
    flex: 1;
    max-height: none;
    overflow-y: auto;
    padding: 8px;

    &::-webkit-scrollbar { width: 8px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 4px; }
    &::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }
`;

const IssueGroup = styled.div`
    margin-bottom: 10px;
`;

const IssueCard = styled.button<{ $selected: boolean; $severity: SeverityLevel }>`
    width: 100%;
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid ${({ $severity }: { $severity: SeverityLevel }) =>
        $severity === 'error'
            ? 'var(--vscode-errorForeground)'
            : $severity === 'warn'
                ? 'var(--vscode-editorWarning-foreground)'
                : 'var(--vscode-panel-border)'};
    border-radius: 8px;
    background: ${({ $selected }: { $selected: boolean }) =>
        $selected
            ? 'color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 80%, var(--vscode-editorWidget-background))'
            : 'var(--vscode-editorWidget-background)'};
    color: var(--vscode-foreground);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 10px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease;

    &:hover {
        background: ${({ $selected }: { $selected: boolean }) =>
            $selected
                ? 'color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 80%, var(--vscode-editorWidget-background))'
                : 'var(--vscode-list-hoverBackground)'};
    }
`;

const CardMetaRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const CardMessage = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-foreground);
    line-height: 1.35;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
`;

const CardPathText = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const TableFooter = styled.div`
    padding: 6px 12px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    border-top: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editorGroupHeader-tabsBackground);
`;

// ── Badges & pills ─────────────────────────────────────────────────────────

const SeverityPill = styled.span<{ $severity: SeverityLevel }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 54px;
    height: 18px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ $severity }: { $severity: SeverityLevel }) =>
        $severity === 'error'
            ? 'var(--vscode-errorForeground)'
            : $severity === 'warn'
                ? 'var(--vscode-editorWarning-foreground)'
                : 'var(--vscode-descriptionForeground)'};
    background: ${({ $severity }: { $severity: SeverityLevel }) =>
        $severity === 'error'
            ? 'color-mix(in srgb, var(--vscode-errorForeground) 14%, transparent)'
            : $severity === 'warn'
                ? 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 14%, transparent)'
                : 'color-mix(in srgb, var(--vscode-descriptionForeground) 12%, transparent)'};
    border: 1px solid ${({ $severity }: { $severity: SeverityLevel }) =>
        $severity === 'error'
            ? 'color-mix(in srgb, var(--vscode-errorForeground) 30%, transparent)'
            : $severity === 'warn'
                ? 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 30%, transparent)'
                : 'color-mix(in srgb, var(--vscode-descriptionForeground) 20%, transparent)'};
`;

// ── Method badge ───────────────────────────────────────────────────────────

const MethodBadge: React.FC<{ method: string; small?: boolean }> = ({ method, small }) => {
    const style = getMethodStyle(method);
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: small ? 16 : 18,
                borderRadius: 4,
                padding: small ? '0 5px' : '0 7px',
                fontSize: small ? 9 : 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: style.color,
                background: style.bg,
                border: `1px solid color-mix(in srgb, ${style.color} 30%, transparent)`,
                flexShrink: 0,
            }}
        >
            {method}
        </span>
    );
};

// ── Detail panel ───────────────────────────────────────────────────────────

const DetailCard = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 0;
    overflow: hidden;
    background: var(--vscode-editor-background);
    height: 100%;
    max-height: none;
    display: flex;
    flex-direction: column;
`;

const DetailColumn = styled.div`
    height: 100%;
    min-height: 0;
`;

const DetailHeader = styled.div`
    background: var(--vscode-editorGroupHeader-tabsBackground);
    border-bottom: 1px solid var(--vscode-panel-border);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const DetailHeaderTitle = styled.span`
    font-size: 12px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const DetailHeaderMeta = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const DetailBody = styled.div`
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    overflow-y: auto;

    &::-webkit-scrollbar { width: 8px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 4px; }
    &::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }
`;

const DetailSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const DetailLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--vscode-descriptionForeground);
`;

const DetailValue = styled.div`
    font-size: 12px;
    color: var(--vscode-foreground);
    word-break: break-word;
    line-height: 1.45;
`;

const MessageBox = styled.div`
    border: 1px solid color-mix(in srgb, var(--vscode-editorWarning-foreground) 35%, var(--vscode-panel-border));
    border-radius: 6px;
    background: color-mix(in srgb, var(--vscode-editorWarning-foreground) 8%, transparent);
    padding: 8px 10px;
    font-size: 12px;
    color: var(--vscode-foreground);
    line-height: 1.5;
`;

const SuggestionBox = styled.div`
    border: 1px solid color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 35%, var(--vscode-panel-border));
    border-radius: 6px;
    background: color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 8%, transparent);
    padding: 8px 10px;
    font-size: 12px;
    color: var(--vscode-foreground);
    line-height: 1.5;
`;

const ReferenceBox = styled.div`
    border: 1px solid color-mix(in srgb, var(--vscode-textLink-foreground) 35%, var(--vscode-panel-border));
    border-radius: 6px;
    background: color-mix(in srgb, var(--vscode-textLink-foreground) 8%, transparent);
    padding: 8px 10px;
`;

const YamlBlock = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: auto;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    max-height: 220px;

    &::-webkit-scrollbar { width: 8px; height: 8px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 4px; }
    &::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }
`;

const YamlLine = styled.div<{ $highlight: boolean }>`
    display: flex;
    background: ${({ $highlight }: { $highlight: boolean }) => ($highlight ? 'rgba(239,68,68,0.12)' : 'transparent')};
    padding: 1px 0;
`;

const YamlLineNum = styled.span`
    flex: 0 0 36px;
    text-align: right;
    padding-right: 10px;
    color: var(--vscode-editorLineNumber-foreground);
    border-right: 1px solid var(--vscode-panel-border);
    margin-right: 10px;
    user-select: none;
`;

const YamlLineText = styled.span`
    white-space: pre;
    color: var(--vscode-editor-foreground);
`;

// ── OWASP / Endpoints tabs ─────────────────────────────────────────────────

const OwaspGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 14px;
`;

const AiBreakdownGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
    padding: 14px;
`;

const AiBreakdownTile = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const AiTileHead = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
`;

const AiTileLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--vscode-descriptionForeground);
`;

const AiTileFraction = styled.div`
    font-size: 17px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const AiTilePercent = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    text-align: right;
`;

const OwaspIssueCard = styled.div<{ $dominantSeverity: 'error' | 'warn' }>`
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid ${({ $dominantSeverity }: { $dominantSeverity: 'error' | 'warn' }) =>
        $dominantSeverity === 'error' ? 'var(--vscode-errorForeground)' : 'var(--vscode-editorWarning-foreground)'};
    border-radius: 8px;
    background: var(--vscode-editorWidget-background);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const OwaspPassCard = styled.div`
    border: 1px solid color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 40%, var(--vscode-panel-border));
    border-radius: 8px;
    background: color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 8%, transparent);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
`;

const OwaspPassIcon = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--vscode-testing-iconPassed, #22c55e);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: white;
    font-size: 16px;
    font-weight: 700;
`;

const OwaspIssueHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
`;

const OwaspCategoryId = styled.div<{ $color: string }>`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ $color }: { $color: string }) => $color};
`;

const OwaspCategoryName = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: var(--vscode-foreground);
    line-height: 1.3;
    margin-top: 3px;
`;

const OwaspIssueCount = styled.div<{ $color: string }>`
    font-size: 28px;
    font-weight: 800;
    line-height: 1;
    color: ${({ $color }: { $color: string }) => $color};
    text-align: right;
`;

const OwaspIssueCountLabel = styled.div<{ $color: string }>`
    font-size: 11px;
    color: ${({ $color }: { $color: string }) => $color};
    text-align: right;
`;

const OwaspFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const OwaspPassCategoryId = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--vscode-testing-iconPassed, #22c55e);
`;

const OwaspPassCategoryName = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 70%, var(--vscode-foreground));
    margin-top: 2px;
`;

const OwaspPassSubtext = styled.div`
    font-size: 11px;
    color: color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 80%, var(--vscode-descriptionForeground));
    margin-top: 2px;
`;

const OwaspDocsLink = styled.a`
    font-size: 11px;
    color: var(--vscode-textLink-foreground);
    text-decoration: none;

    &:hover { text-decoration: underline; }
`;

const ProgressTrack = styled.div`
    margin-top: 8px;
    height: 4px;
    border-radius: 2px;
    background: var(--vscode-panel-border);
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $width: number; $severity: 'error' | 'warn' }>`
    width: ${({ $width }: { $width: number }) => Math.min($width, 100)}%;
    height: 100%;
    border-radius: 2px;
    background: ${({ $severity }: { $severity: 'error' | 'warn' }) =>
        $severity === 'error' ? 'var(--vscode-errorForeground)' : 'var(--vscode-editorWarning-foreground)'};
`;

const RuleChips = styled.div`
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
`;

const RuleChip = styled.span`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 10px;
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--vscode-descriptionForeground);
    background: var(--vscode-editor-background);
`;

// ── By Endpoint tab (v2) ──────────────────────────────────────────────────

const EndpointTabLayout = styled.div`
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const EndpointGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
`;

const EndpointCardV2 = styled.div<{ $severity: 'error' | 'warn' }>`
    border: 1px solid var(--vscode-panel-border);
    border-left: 3px solid ${({ $severity }: { $severity: 'error' | 'warn' }) =>
        $severity === 'error' ? 'var(--vscode-errorForeground)' : 'var(--vscode-editorWarning-foreground)'};
    border-radius: 8px;
    background: var(--vscode-editorWidget-background);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const EndpointCardTop = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
`;

const EndpointPathGroup = styled.div`
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const EndpointPathV2 = styled.div`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground);
    font-family: var(--vscode-editor-font-family, monospace);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const EndpointCountBlock = styled.div`
    text-align: right;
    flex-shrink: 0;
`;

const EndpointCountNum = styled.div<{ $color: string }>`
    font-size: 26px;
    font-weight: 800;
    line-height: 1;
    color: ${({ $color }: { $color: string }) => $color};
`;

const EndpointCountLabel = styled.div<{ $color: string }>`
    font-size: 10px;
    color: ${({ $color }: { $color: string }) => $color};
    margin-top: 1px;
`;

const SeverityBreakdown = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const SeverityItem = styled.span<{ $color: string }>`
    font-size: 11px;
    font-weight: 600;
    color: ${({ $color }: { $color: string }) => $color};
    display: flex;
    align-items: center;
    gap: 4px;
`;

const SeverityDot = styled.span<{ $color: string }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${({ $color }: { $color: string }) => $color};
    flex-shrink: 0;
`;

// Rule Frequency table
const FREQ_COLS = '1fr 46px 60px 70px 100px';

const RuleFreqSection = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    background: var(--vscode-editor-background);
    overflow: hidden;
`;

const RuleFreqHead = styled.div`
    display: grid;
    grid-template-columns: ${FREQ_COLS};
    gap: 10px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editorGroupHeader-tabsBackground);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--vscode-descriptionForeground);
    align-items: center;
`;

const RuleFreqRow = styled.div`
    display: grid;
    grid-template-columns: ${FREQ_COLS};
    gap: 10px;
    padding: 7px 14px;
    border-bottom: 1px solid var(--vscode-panel-border);
    align-items: center;

    &:last-child { border-bottom: none; }
`;

const RuleFreqName = styled.span`
    font-size: 11px;
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--vscode-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const RuleFreqNum = styled.span<{ $color?: string }>`
    font-size: 11px;
    font-weight: 700;
    color: ${({ $color }: { $color?: string }) => $color || 'var(--vscode-foreground)'};
    text-align: center;
`;

const RuleFreqBarTrack = styled.div`
    height: 6px;
    border-radius: 3px;
    background: var(--vscode-panel-border);
    overflow: hidden;
`;

const RuleFreqBarFill = styled.div<{ $width: number; $hasErrors: boolean }>`
    width: ${({ $width }: { $width: number }) => Math.min($width, 100)}%;
    height: 100%;
    border-radius: 3px;
    background: ${({ $hasErrors }: { $hasErrors: boolean }) =>
        $hasErrors ? 'var(--vscode-errorForeground)' : 'var(--vscode-editorWarning-foreground)'};
`;

// ── Misc ───────────────────────────────────────────────────────────────────

const EmptyState = styled.div`
    padding: 32px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
`;

const MessageCard = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    background: var(--vscode-editor-background);
    padding: 20px 24px;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
`;

// ── Main component ─────────────────────────────────────────────────────────

export const AnalyzeSingleReportPage: React.FC<AnalyzeSingleReportPageProps> = ({
    fileUri,
    refreshToken,
    reportKey,
}) => {
    const { rpcClient } = useVisualizerContext();
    const { loading, error, report, specContent } = useReportData(rpcClient, fileUri, refreshToken, reportKey);
    const isAIAvailable = useAIAvailability();

    const [activeTab, setActiveTab] = React.useState<ActiveTab>('issues');
    const [severityFilter, setSeverityFilter] = React.useState<'all' | SeverityLevel>('all');
    const [groupBy, setGroupBy] = React.useState<GroupBy>('none');
    const [sortBy, setSortBy] = React.useState<SortBy>('severity');
    const [sortDir, setSortDir] = React.useState<SortDir>('asc');
    const [search, setSearch] = React.useState('');
    const [selectedIssueId, setSelectedIssueId] = React.useState<string | null>(null);

    const rows = React.useMemo(() => buildIssueRows(report?.violations || []), [report]);

    const { filteredRows, groupedRows } = useIssueFilters(rows, {
        severityFilter,
        search,
        sortBy,
        sortDir,
        groupBy,
    });

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
        const endpointCount = new Set(rows.map((r) => `${r.method}:${r.endpoint}`)).size;
        const rulesCount = new Set(rows.map((r) => r.rule)).size;
        return { errors, warnings, endpointCount, rulesCount };
    }, [rows]);

    const breakdownSummary = React.useMemo<Array<{
        id: string;
        key: string;
        name: string;
        count: number;
        errors: number;
        warnings: number;
        docsUrl?: string;
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
                id: cat.id,
                key: cat.key,
                name: cat.name,
                docsUrl: cat.docsUrl,
                ...(map.get(cat.key) || { count: 0, errors: 0, warnings: 0 }),
            })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
        }

        const map = new Map<string, { id: string; key: string; name: string; count: number; errors: number; warnings: number }>();
        rows.forEach((row) => {
            const bucket = getRuleBucket(row.rule, reportKey);
            const cur = map.get(bucket.id) || {
                id: bucket.id,
                key: bucket.id,
                name: bucket.name,
                count: 0,
                errors: 0,
                warnings: 0,
            };
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
            }));
        }

        const derived = new Map<string, { filled: number; total: number }>();
        rows.forEach((row) => {
            const bucket = getRuleBucket(row.rule, 'ai-readiness').name;
            const current = derived.get(bucket) || { filled: 0, total: 0 };
            current.total += 1;
            if (row.severity !== 'error' && row.severity !== 'warn') current.filled += 1;
            derived.set(bucket, current);
        });
        return Array.from(derived.entries()).map(([label, value]) => ({
            key: label,
            label,
            filled: value.filled,
            total: value.total,
            percentage: value.total > 0 ? Math.round((value.filled / value.total) * 100) : 0,
        }));
    }, [reportKey, report, rows]);

    const endpointSummary = React.useMemo(() => {
        const map = new Map<string, {
            count: number; errors: number; warnings: number;
            method: string; endpoint: string; rules: Map<string, number>;
        }>();
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
                topRules: Array.from(item.rules.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([r]) => r),
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
        return Array.from(map.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .map(([rule, stats]) => ({ rule, ...stats }));
    }, [rows]);

    const goBackToDesign = () =>
        postVSCodeMessage({ command: 'switchView', viewType: 'preview', fileUri });

    const title = REPORT_TITLES[reportKey];
    const score = Math.max(0, Math.min(100, Number(report?.score || 0)));
    const rulesetFileUrl = buildRulesetFileUrl(report?.ruleset);
    const aiEnabled = isAIAvailable && !!fileUri && !!rulesetFileUrl && !!report?.ruleset?.rulesetContentPath;

    // ── Loading state ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <Root>
                <HeaderBar>
                    <div>
                        <HeaderTitle>{title}</HeaderTitle>
                        <HeaderSubtitle>Loading report…</HeaderSubtitle>
                    </div>
                    <Button appearance="secondary" onClick={goBackToDesign}>
                        <Codicon name="arrow-left" sx={{ fontSize: '13px' }} />
                        Back to Design
                    </Button>
                </HeaderBar>
            </Root>
        );
    }

    // ── Error state ──────────────────────────────────────────────────────────
    if (error || !report) {
        return (
            <Root>
                <HeaderBar>
                    <div>
                        <HeaderTitle>{title}</HeaderTitle>
                        <HeaderSubtitle>Unable to generate report</HeaderSubtitle>
                    </div>
                    <Button appearance="secondary" onClick={goBackToDesign}>
                        <Codicon name="arrow-left" sx={{ fontSize: '13px' }} />
                        Back to Design
                    </Button>
                </HeaderBar>
                <MessageCard>{error || 'No report data available.'}</MessageCard>
            </Root>
        );
    }

    const gradeColor = scoreColor(score);

    // ── Main view ────────────────────────────────────────────────────────────
    return (
        <Root>
            {/* Header */}
            <HeaderBar>
                <div>
                    <HeaderTitle>{title}</HeaderTitle>
                    <HeaderSubtitle>{report.rulesetName}</HeaderSubtitle>
                </div>
                <Button appearance="secondary" onClick={goBackToDesign}>
                    <Codicon name="arrow-left" sx={{ fontSize: '13px' }} />
                    Back to Design
                </Button>
            </HeaderBar>

            <SectionBlock>
                <SectionHeader>
                    <SectionTitleText>Overview</SectionTitleText>
                </SectionHeader>
                <StatsBar>
                    <ScoreCard>
                        <StatLabel>API Score</StatLabel>
                        <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, color: gradeColor, marginTop: 4 }}>
                            {scoreGrade(score)}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: gradeColor, marginTop: 2 }}>
                            {Math.round(score)}/100
                        </div>
                    </ScoreCard>
                    <StatCard $accent="var(--vscode-errorForeground)">
                        <StatValue>{stats.errors}</StatValue>
                        <StatLabel>Errors</StatLabel>
                        <StatSub>Severity 0 · Critical</StatSub>
                    </StatCard>
                    <StatCard $accent="var(--vscode-editorWarning-foreground)">
                        <StatValue>{stats.warnings}</StatValue>
                        <StatLabel>Warnings</StatLabel>
                        <StatSub>Severity 1 · Advisory</StatSub>
                    </StatCard>
                    <StatCard $accent="var(--vscode-focusBorder)">
                        <StatValue>{stats.endpointCount}</StatValue>
                        <StatLabel>Endpoints affected</StatLabel>
                        <StatSub>of all defined paths</StatSub>
                    </StatCard>
                    <StatCard $accent="var(--vscode-editorInfo-foreground, #06b6d4)">
                        <StatValue>{stats.rulesCount}</StatValue>
                        <StatLabel>Rules violated</StatLabel>
                        <StatSub>distinct rules</StatSub>
                    </StatCard>
                    <StatCard $accent="#8b5cf6">
                        <StatValue>{rows.length}</StatValue>
                        <StatLabel>Total issues</StatLabel>
                        <StatSub>{report.passedChecks}/{report.totalChecks} checks passed</StatSub>
                    </StatCard>
                </StatsBar>
            </SectionBlock>

            <SectionBlock>
                <SectionHeader>
                    <SectionTitleText>{BREAKDOWN_TITLES[reportKey]}</SectionTitleText>
                </SectionHeader>
                {reportKey === 'ai-readiness' ? (
                    <AiBreakdownGrid>
                        {aiBucketSummary.map((bucket) => {
                            const color = scoreColor(bucket.percentage);
                            return (
                                <AiBreakdownTile key={bucket.key}>
                                    <AiTileHead>
                                        <AiTileLabel>{bucket.label}</AiTileLabel>
                                        <AiTileFraction>{bucket.filled}/{bucket.total}</AiTileFraction>
                                    </AiTileHead>
                                    <ProgressTrack>
                                        <ProgressFill $width={bucket.percentage} $severity={bucket.percentage < 60 ? 'error' : 'warn'} />
                                    </ProgressTrack>
                                    <AiTilePercent style={{ color }}>{Math.round(bucket.percentage)}%</AiTilePercent>
                                </AiBreakdownTile>
                            );
                        })}
                    </AiBreakdownGrid>
                ) : (
                    <OwaspGrid>
                        {breakdownSummary.map((cat) => {
                            if (cat.count === 0) {
                                return (
                                    <OwaspPassCard key={cat.id}>
                                        <OwaspPassIcon>✓</OwaspPassIcon>
                                        <div>
                                            <OwaspPassCategoryId>{cat.id}</OwaspPassCategoryId>
                                            <OwaspPassCategoryName>{cat.name}</OwaspPassCategoryName>
                                            <OwaspPassSubtext>No issues found</OwaspPassSubtext>
                                        </div>
                                    </OwaspPassCard>
                                );
                            }
                            const dominantSeverity = cat.errors > 0 ? 'error' as const : 'warn' as const;
                            const accentColor = cat.errors > 0
                                ? 'var(--vscode-errorForeground)'
                                : 'var(--vscode-editorWarning-foreground)';
                            const percentage = rows.length > 0 ? Math.round((cat.count / rows.length) * 100) : 0;
                            return (
                                <OwaspIssueCard key={cat.id} $dominantSeverity={dominantSeverity}>
                                    <OwaspIssueHeader>
                                        <div>
                                            <OwaspCategoryId $color={accentColor}>{cat.id}</OwaspCategoryId>
                                            <OwaspCategoryName>{cat.name}</OwaspCategoryName>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <OwaspIssueCount $color={accentColor}>{cat.count}</OwaspIssueCount>
                                            <OwaspIssueCountLabel $color={accentColor}>issues</OwaspIssueCountLabel>
                                        </div>
                                    </OwaspIssueHeader>
                                    <ProgressTrack>
                                        <ProgressFill $width={percentage} $severity={dominantSeverity} />
                                    </ProgressTrack>
                                    <OwaspFooter>
                                        <span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
                                            {percentage}% of total issues
                                        </span>
                                        {cat.docsUrl && (
                                            <OwaspDocsLink href={cat.docsUrl} target="_blank" rel="noreferrer">
                                                Docs →
                                            </OwaspDocsLink>
                                        )}
                                    </OwaspFooter>
                                </OwaspIssueCard>
                            );
                        })}
                    </OwaspGrid>
                )}
            </SectionBlock>

            <SectionBlock>
                <SectionHeader>
                    <SectionTitleText>Issue Explorer</SectionTitleText>
                    <TabBar>
                        <TabBtn $active={activeTab === 'issues'} onClick={() => setActiveTab('issues')}>
                            Issues
                        </TabBtn>
                        <TabBtn $active={activeTab === 'endpoints'} onClick={() => setActiveTab('endpoints')}>
                            Endpoints
                        </TabBtn>
                    </TabBar>
                </SectionHeader>

            {/* Issues tab */}
            {activeTab === 'issues' && (
                <IssuesLayout>
                    <Panel>
                        <Toolbar>
                            <ToolbarRow>
                                <FilterChip $active={severityFilter === 'all'} onClick={() => setSeverityFilter('all')}>
                                    All ({rows.length})
                                </FilterChip>
                                <FilterChip $active={severityFilter === 'error'} onClick={() => setSeverityFilter('error')}>
                                    Errors ({stats.errors})
                                </FilterChip>
                                <FilterChip $active={severityFilter === 'warn'} onClick={() => setSeverityFilter('warn')}>
                                    Warnings ({stats.warnings})
                                </FilterChip>
                                <Spacer />
                                <SearchInput
                                    placeholder="Search rules, paths, messages…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </ToolbarRow>
                            <ToolbarRow>
                                <CtrlSelect value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
                                    <option value="none">No grouping</option>
                                    <option value="rule">Group by rule</option>
                                    <option value="endpoint">Group by endpoint</option>
                                </CtrlSelect>
                                <CtrlSelect value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                                    <option value="severity">Sort by severity</option>
                                    <option value="rule">Sort by rule</option>
                                    <option value="line">Sort by line</option>
                                </CtrlSelect>
                                <CtrlSelect value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)}>
                                    <option value="asc">Ascending</option>
                                    <option value="desc">Descending</option>
                                </CtrlSelect>
                                <Spacer />
                                <AIButton
                                    isAvailable={aiEnabled}
                                    title="Fix All with AI"
                                    label="Fix All with AI"
                                    onClick={() => {
                                        const sevLabel = severityFilter === 'error' ? 'error' : severityFilter === 'warn' ? 'warning' : 'all';
                                        const prompt = `Fix ${sevLabel === 'all' ? 'all' : `all ${sevLabel}`} violations in the ${report!.rulesetName} ruleset.\n\nIMPORTANT: Use the #validateWithSpectralRuleset MCP tool:\n1. Call validateWithSpectralRuleset with fileUri: "${fileUri}", rulesetName: "${report!.rulesetName}", fileUrl: "${rulesetFileUrl}", rulesetContentPath: "${report!.ruleset?.rulesetContentPath}" to find violations.\n2. Fix each violation, then call validateWithSpectralRuleset again to verify.\n3. Repeat until no ${sevLabel === 'all' ? '' : sevLabel + ' '}violations remain.`;
                                        openCopilotChat(JSON.stringify({ fileUri, rulesetName: report!.rulesetName, fileUrl: rulesetFileUrl, rulesetContentPath: report!.ruleset?.rulesetContentPath, severityFilter }), prompt);
                                    }}
                                />
                            </ToolbarRow>
                        </Toolbar>

                        <IssueCardsBody>
                            {filteredRows.length === 0 ? (
                                <EmptyState>No issues match your filters.</EmptyState>
                            ) : (
                                groupedRows.map((group) => (
                                    <IssueGroup key={group.key}>
                                        {groupBy !== 'none' && (
                                            <GroupHeader>{group.key} ({group.rows.length})</GroupHeader>
                                        )}
                                        {group.rows.map((row) => (
                                            <IssueCard
                                                key={row.id}
                                                $selected={selectedIssue?.id === row.id}
                                                $severity={row.severity}
                                                onClick={() => setSelectedIssueId(row.id)}
                                            >
                                                <CardMessage>{row.message}</CardMessage>
                                                <CardMetaRow>
                                                    <CardPathText>{row.path}</CardPathText>
                                                </CardMetaRow>
                                            </IssueCard>
                                        ))}
                                    </IssueGroup>
                                ))
                            )}
                        </IssueCardsBody>

                        <TableFooter>
                            Showing {filteredRows.length} of {rows.length} issues
                        </TableFooter>
                    </Panel>

                    {/* Detail panel */}
                    <DetailColumn>
                        {!selectedIssue ? (
                            <EmptyState>Select an issue to view details.</EmptyState>
                        ) : (
                            <DetailCard>
                                <DetailHeader>
                                    <DetailHeaderTitle>Issue Detail</DetailHeaderTitle>
                                    <Row style={{ gap: 10 }}>
                                        <AIButton
                                            isAvailable={aiEnabled}
                                            title="Fix with AI"
                                            label="Fix with AI"
                                            onClick={() => {
                                                const pathStr = selectedIssue.violation.pathSegments?.length
                                                    ? ` at /${selectedIssue.violation.pathSegments.join('/')}`
                                                    : '';
                                                const prompt = `Fix ${report!.rulesetName} violation: ${selectedIssue.message}${pathStr}`;
                                                openCopilotChat(JSON.stringify(selectedIssue.violation), prompt);
                                            }}
                                        />
                                        <DetailHeaderMeta>
                                            {filteredRows.findIndex((r) => r.id === selectedIssue.id) + 1} of {filteredRows.length}
                                        </DetailHeaderMeta>
                                    </Row>
                                </DetailHeader>
                                <DetailBody>
                                    <DetailSection>
                                        <DetailLabel>Rule</DetailLabel>
                                        <DetailValue style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: 11 }}>
                                            {selectedIssue.rule}
                                        </DetailValue>
                                    </DetailSection>

                                    <DetailSection>
                                        <DetailLabel>Severity &amp; location</DetailLabel>
                                        <Row>
                                            <SeverityPill $severity={selectedIssue.severity}>{selectedIssue.severity}</SeverityPill>
                                            <span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>
                                                {selectedIssue.line > 0 ? `Line ${selectedIssue.line}` : 'No line info'}
                                            </span>
                                        </Row>
                                    </DetailSection>

                                    <DetailSection>
                                        <DetailLabel>Path</DetailLabel>
                                        <Row>
                                            <MethodBadge method={selectedIssue.method} />
                                            <DetailValue style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: 11 }}>
                                                {selectedIssue.endpoint}
                                            </DetailValue>
                                        </Row>
                                    </DetailSection>

                                    {selectedIssue.violation.description && (
                                        <DetailSection>
                                            <DetailLabel>Description</DetailLabel>
                                            <DetailValue>{selectedIssue.violation.description}</DetailValue>
                                        </DetailSection>
                                    )}

                                    <DetailSection>
                                        <DetailLabel>Message</DetailLabel>
                                        <MessageBox>{selectedIssue.message}</MessageBox>
                                    </DetailSection>

                                    {selectedIssue.violation.fixSuggestion && (
                                        <DetailSection>
                                            <DetailLabel>Fix suggestion</DetailLabel>
                                            <SuggestionBox>{selectedIssue.violation.fixSuggestion}</SuggestionBox>
                                        </DetailSection>
                                    )}

                                    {getReferenceTag(selectedIssue.rule, reportKey) && (
                                        <DetailSection>
                                            <DetailLabel>Reference</DetailLabel>
                                            <ReferenceBox>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--vscode-textLink-foreground)' }}>
                                                    {getReferenceTag(selectedIssue.rule, reportKey)}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginTop: 2 }}>
                                                    {reportKey === 'owasp' ? 'OWASP API Security Top 10' : REPORT_TITLES[reportKey]}
                                                </div>
                                            </ReferenceBox>
                                        </DetailSection>
                                    )}

                                    {(() => {
                                        const snippetLines = extractSnippetLines(specContent, selectedIssue.violation.range);
                                        if (!snippetLines) return null;
                                        return (
                                            <DetailSection>
                                                <DetailLabel>Spec snippet</DetailLabel>
                                                <YamlBlock>
                                                    {snippetLines.map(({ lineNumber, text, highlight }) => (
                                                        <YamlLine key={lineNumber} $highlight={highlight}>
                                                            <YamlLineNum>{lineNumber}</YamlLineNum>
                                                            <YamlLineText>{text}</YamlLineText>
                                                        </YamlLine>
                                                    ))}
                                                </YamlBlock>
                                            </DetailSection>
                                        );
                                    })()}
                                </DetailBody>
                            </DetailCard>
                        )}
                    </DetailColumn>
                </IssuesLayout>
            )}

            {/* By endpoint tab */}
            {activeTab === 'endpoints' && (
                <Panel>
                    {endpointSummary.length === 0 ? (
                        <EmptyState>No endpoint issues detected.</EmptyState>
                    ) : (
                        <EndpointTabLayout>
                            <EndpointGrid>
                                {endpointSummary.map((item) => {
                                    const progressWidth = Math.max(4, (item.count / Math.max(1, rows.length)) * 100);
                                    const accentColor = item.errors > 0
                                        ? 'var(--vscode-errorForeground)'
                                        : 'var(--vscode-editorWarning-foreground)';
                                    return (
                                        <EndpointCardV2 key={`${item.method}:${item.endpoint}`} $severity={item.dominantSeverity}>
                                            <EndpointCardTop>
                                                <EndpointPathGroup>
                                                    <MethodBadge method={item.method} />
                                                    <EndpointPathV2 title={item.endpoint}>{item.endpoint}</EndpointPathV2>
                                                </EndpointPathGroup>
                                                <EndpointCountBlock>
                                                    <EndpointCountNum $color={accentColor}>{item.count}</EndpointCountNum>
                                                    <EndpointCountLabel $color={accentColor}>issues</EndpointCountLabel>
                                                </EndpointCountBlock>
                                            </EndpointCardTop>
                                            <SeverityBreakdown>
                                                {item.errors > 0 && (
                                                    <SeverityItem $color="var(--vscode-errorForeground)">
                                                        <SeverityDot $color="var(--vscode-errorForeground)" />
                                                        {item.errors} error{item.errors !== 1 ? 's' : ''}
                                                    </SeverityItem>
                                                )}
                                                {item.warnings > 0 && (
                                                    <SeverityItem $color="var(--vscode-editorWarning-foreground)">
                                                        <SeverityDot $color="var(--vscode-editorWarning-foreground)" />
                                                        {item.warnings} warning{item.warnings !== 1 ? 's' : ''}
                                                    </SeverityItem>
                                                )}
                                            </SeverityBreakdown>
                                            <ProgressTrack style={{ marginTop: 0 }}>
                                                <ProgressFill $width={progressWidth} $severity={item.dominantSeverity} />
                                            </ProgressTrack>
                                            {item.topRules.length > 0 && (
                                                <RuleChips style={{ marginTop: 0 }}>
                                                    {item.topRules.map((rule) => (
                                                        <RuleChip key={rule}>{rule}</RuleChip>
                                                    ))}
                                                </RuleChips>
                                            )}
                                        </EndpointCardV2>
                                    );
                                })}
                            </EndpointGrid>

                            {ruleFrequency.length > 0 && (
                                <RuleFreqSection>
                                    <RuleFreqHead>
                                        <div>Rule</div>
                                        <div style={{ textAlign: 'center' }}>Total</div>
                                        <div style={{ textAlign: 'center' }}>Errors</div>
                                        <div style={{ textAlign: 'center' }}>Warnings</div>
                                        <div>Frequency</div>
                                    </RuleFreqHead>
                                    {ruleFrequency.map(({ rule, total, errors, warnings }) => {
                                        const maxTotal = Math.max(1, ruleFrequency[0]?.total || 1);
                                        const width = (total / maxTotal) * 100;
                                        return (
                                            <RuleFreqRow key={rule}>
                                                <RuleFreqName title={rule}>{rule}</RuleFreqName>
                                                <RuleFreqNum>{total}</RuleFreqNum>
                                                <RuleFreqNum $color={errors > 0 ? 'var(--vscode-errorForeground)' : 'var(--vscode-descriptionForeground)'}>
                                                    {errors > 0 ? errors : '—'}
                                                </RuleFreqNum>
                                                <RuleFreqNum $color={warnings > 0 ? 'var(--vscode-editorWarning-foreground)' : 'var(--vscode-descriptionForeground)'}>
                                                    {warnings > 0 ? warnings : '—'}
                                                </RuleFreqNum>
                                                <div>
                                                    <RuleFreqBarTrack>
                                                        <RuleFreqBarFill $width={width} $hasErrors={errors > 0} />
                                                    </RuleFreqBarTrack>
                                                </div>
                                            </RuleFreqRow>
                                        );
                                    })}
                                </RuleFreqSection>
                            )}
                        </EndpointTabLayout>
                    )}
                </Panel>
            )}
            </SectionBlock>
        </Root>
    );
};
