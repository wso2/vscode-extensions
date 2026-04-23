/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useMemo, useCallback } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, TextField } from '@wso2/ui-toolkit';
import { NormalizedGovernanceViolation } from '../../../types/violations';
import { postMessage as postVSCodeMessage } from '../../../utils/vscode-api';
import { useAIAvailability } from '../../../hooks/useAIAvailability';
import { AIButton } from '../../../components/ai/AIButton';
import {
    shouldShowRuleFamilyChip,
    ViolationDetailFixCallout,
    ViolationDetailProseBlock,
    ViolationMarkdown,
} from './ViolationDetailRichText';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IssuesReportViewProps {
    rulesetName: string;
    violations: NormalizedGovernanceViolation[];
    passedChecks: number;
    score: number;
    specContent?: string;
    fileUri?: string;
    ruleset?: { fileUrl?: string; rulesetContentPath?: string };
    initialViewMode?: ReportViewMode;
    initialSeverityFilter?: SeverityFilter;
    showBackButton?: boolean;
    onBack: () => void;
}

type GroupMode = 'all' | 'rule' | 'endpoint';
type SeverityFilter = 'all' | 'error' | 'warn' | 'info';
type ReportViewMode = 'overview' | 'issues';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
    error: 'var(--vscode-errorForeground)',
    warn: 'var(--vscode-editorWarning-foreground)',
    warning: 'var(--vscode-editorWarning-foreground)',
    info: 'var(--vscode-focusBorder)',
    hint: 'var(--vscode-textLink-foreground)',
};

const SEVERITY_ORDER: Record<string, number> = { error: 3, warn: 2, warning: 2, info: 1, hint: 0 };

const extractRuleFamily = (rule?: string): string | null => {
    if (!rule) return null;
    const normalized = rule.replace(/^@/, '');
    const m = normalized.match(/^([a-z0-9]+)(?=[:\-_])/i);
    return m ? m[1].toLowerCase() : null;
};

const extractOwaspCategory = (rule?: string): string | null => {
    if (!rule) return null;
    const m = rule.match(/owasp[:\-_](api\d+)/i);
    return m ? m[1].toUpperCase() : null;
};

const getRuleReference = (rule?: string): { label: string; url: string } | null => {
    const owaspCategory = extractOwaspCategory(rule);
    if (owaspCategory) {
        return {
            label: `${owaspCategory} Reference`,
            url: 'https://owasp.org/API-Security/editions/2023/en/'
        };
    }
    return null;
};

const extractEndpoint = (v: NormalizedGovernanceViolation): string | null =>
    v.pathSegments?.[0] === 'paths' ? (v.pathSegments?.[1] ?? null) : null;

const getScoreColor = (score: number) => score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';
const getGrade = (score: number) => score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

function extractYamlLines(
    content: string,
    range: { start: { line: number }; end: { line: number } },
    ctx = 3
): Array<{ lineNumber: number; text: string; highlight: boolean }> {
    const lines = content.split('\n');
    const from = Math.max(0, range.start.line - ctx);
    const to = Math.min(lines.length - 1, range.end.line + ctx);
    return lines.slice(from, to + 1).map((text, i) => ({
        lineNumber: from + i + 1,
        text,
        highlight: from + i >= range.start.line && from + i <= range.end.line,
    }));
}

// ─── Styled components ────────────────────────────────────────────────────────

const Root = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    width: 100%;
    box-sizing: border-box;
    view-transition-name: issues-report-root;

    ::view-transition-group(*),
    ::view-transition-old(*),
    ::view-transition-new(*) {
        animation-duration: 0.25s;
        animation-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
    }
`;

/* Top bar */
const TopBar = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-sideBar-background);
    flex-shrink: 0;
    flex-wrap: wrap;
`;

const BackButton = styled(Button)`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 4px;
    border: 1px solid var(--vscode-panel-border);
    background: transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    &:hover { background: var(--vscode-list-hoverBackground); }
`;

const TopBarTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const GradeBadge = styled.div<{ $color: string }>`
    font-size: 18px;
    font-weight: 800;
    color: ${(p: { $color: string }) => p.$color};
    border: 2px solid ${(p: { $color: string }) => p.$color};
    border-radius: 6px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    flex-shrink: 0;
`;

const TopBarStat = styled.div<{ $color?: string }>`
    font-size: 12px;
    color: ${(p: { $color?: string }) => p.$color || 'var(--vscode-descriptionForeground)'};
    display: flex;
    align-items: center;
    gap: 4px;
`;

const ViewTabs = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 4px;
`;

const ViewTab = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid ${(p: { $active: boolean }) => p.$active ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'};
    background: ${(p: { $active: boolean }) => p.$active ? 'var(--vscode-button-secondaryBackground)' : 'transparent'};
    color: var(--vscode-foreground);
    font-size: 12px;
    font-weight: ${(p: { $active: boolean }) => p.$active ? 700 : 500};
    cursor: pointer;
    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

/* Control bar */
const ControlBar = styled.div`
    display: flex;
    gap: 10px;
    padding: 8px 20px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
    flex-shrink: 0;
    flex-wrap: wrap;
    align-items: center;
`;

const SearchInput = styled.input`
    flex: 1;
    min-width: 160px;
    max-width: 280px;
    padding: 5px 10px 5px 28px;
    font-size: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    outline: none;
    &:focus { border-color: var(--vscode-focusBorder); }
`;

const SearchField = styled(TextField)`
    min-width: 220px;
    max-width: 320px;
`;

const SearchWrapper = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`;

const SearchIconWrap = styled.div`
    position: absolute;
    left: 8px;
    pointer-events: none;
    display: flex;
    align-items: center;
`;

const FilterSelect = styled.select`
    padding: 5px 8px;
    font-size: 12px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    cursor: pointer;
    outline: none;
    &:focus { border-color: var(--vscode-focusBorder); }
`;

const GroupToggleRow = styled.div`
    display: flex;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: hidden;
`;

const GroupToggleBtn = styled(Button)<{ $active: boolean }>`
    padding: 4px 10px;
    font-size: 11px;
    font-weight: ${(p: { $active: boolean }) => p.$active ? 700 : 400};
    border: none;
    background: ${(p: { $active: boolean }) => p.$active ? 'var(--vscode-button-background)' : 'transparent'};
    color: ${(p: { $active: boolean }) => p.$active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)'};
    cursor: pointer;
    &:not(:last-child) { border-right: 1px solid var(--vscode-panel-border); }
`;

const CountChip = styled.span`
    margin-left: auto;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const OverviewBody = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 14px 20px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SummaryGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(160px, 1fr));
    gap: 10px;
`;

const SummaryCard = styled.div<{ $tone: string }>`
    border: 1px solid ${(p: { $tone: string }) => p.$tone}66;
    border-radius: 10px;
    background: ${(p: { $tone: string }) => p.$tone}1a;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const SummaryValue = styled.div<{ $tone: string }>`
    font-size: 28px;
    font-weight: 800;
    color: ${(p: { $tone: string }) => p.$tone};
    line-height: 1.1;
`;

const SummaryLabel = styled.div`
    font-size: 12px;
    color: var(--vscode-foreground);
    opacity: 0.9;
`;

const PanelsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(220px, 1fr));
    gap: 10px;
    min-height: 0;
`;

const Panel = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 10px;
    background: var(--vscode-editor-background);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 220px;
`;

const PanelTitle = styled.div`
    font-size: 12px;
    font-weight: 700;
    color: var(--vscode-foreground);
`;

const BarList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const BarRow = styled.div`
    display: grid;
    grid-template-columns: minmax(80px, 1fr) auto;
    gap: 8px;
    align-items: center;
`;

const BarLabel = styled.div`
    font-size: 11px;
    color: var(--vscode-foreground);
    font-family: var(--vscode-editor-font-family, monospace);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const BarCount = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

const FamilyCoverageItem = styled.div<{ $status: 'pass' | 'warn' | 'fail' }>`
    border-radius: 8px;
    border: 1px solid
        ${(p: { $status: 'pass' | 'warn' | 'fail' }) =>
        p.$status === 'pass' ? '#10b98166' : p.$status === 'warn' ? '#f59e0b66' : '#ef444466'};
    background:
        ${(p: { $status: 'pass' | 'warn' | 'fail' }) =>
        p.$status === 'pass' ? '#10b9811a' : p.$status === 'warn' ? '#f59e0b1a' : '#ef44441a'};
    padding: 8px 10px;
    font-size: 11px;
    color: var(--vscode-foreground);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
`;

const FamilyStatus = styled.span<{ $status: 'pass' | 'warn' | 'fail' }>`
    font-weight: 700;
    text-transform: uppercase;
    font-size: 10px;
    color:
        ${(p: { $status: 'pass' | 'warn' | 'fail' }) =>
        p.$status === 'pass' ? '#10b981' : p.$status === 'warn' ? '#f59e0b' : '#ef4444'};
`;

/* Split body */
const SplitBody = styled.div`
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
`;

/* Issues table panel */
const TablePanel = styled.div<{ $hasDetail: boolean }>`
    flex: ${(p: { $hasDetail: boolean }) => p.$hasDetail ? '0 0 42%' : '1'};
    min-width: 0;
    display: flex;
    flex-direction: column;
    border-right: ${(p: { $hasDetail: boolean }) => p.$hasDetail ? '1px solid var(--vscode-panel-border)' : 'none'};
    overflow: hidden;
`;

const TableScroll = styled.div`
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    &::-webkit-scrollbar { width: 8px; }
    &::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 4px; }
`;

/* Issue rows */
const IssueRow = styled.div<{ $selected: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--vscode-panel-border);
    cursor: pointer;
    background: ${(p: { $selected: boolean }) => p.$selected ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'};
    color: ${(p: { $selected: boolean }) => p.$selected ? 'var(--vscode-list-activeSelectionForeground)' : 'inherit'};
    &:hover { background: ${(p: { $selected: boolean }) => p.$selected ? 'var(--vscode-list-activeSelectionBackground)' : 'var(--vscode-list-hoverBackground)'}; }
`;

const SeverityDot = styled.div<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${(p: { $color: string }) => p.$color};
    flex-shrink: 0;
    margin-top: 4px;
`;

const IssueRowBody = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const IssueRowTop = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const RuleCode = styled.span`
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    color: var(--vscode-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
`;

const LineNum = styled.span`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    flex-shrink: 0;
`;

const RuleFamilyChip = styled.span`
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 8px;
    background: rgba(239,68,68,0.12);
    color: #ef4444;
    flex-shrink: 0;
    text-transform: uppercase;
`;

const IssueRowPath = styled.div`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

/* Group headers */
const GroupHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    background: var(--vscode-editorWidget-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    cursor: pointer;
    &:hover { background: var(--vscode-list-hoverBackground); }
`;

const GroupHeaderTitle = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground);
    font-family: var(--vscode-editor-font-family, monospace);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const GroupHeaderCount = styled.span`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
`;

/* Empty state */
const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 120px;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    gap: 8px;
`;

/* Detail panel */
const DetailPanel = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--vscode-editor-background);
`;

const DetailScroll = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    &::-webkit-scrollbar { width: 8px; }
    &::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 4px; }
`;

const DetailEmpty = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    padding: 40px;
    text-align: center;
`;

const DetailSectionLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 6px;
`;

const SeverityBadge = styled.span<{ $color: string }>`
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 8px;
    background: ${(p: { $color: string }) => p.$color}1a;
    color: ${(p: { $color: string }) => p.$color};
    text-transform: uppercase;
`;

const DetailRuleId = styled.span`
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
    font-family: var(--vscode-editor-font-family, monospace);
    color: var(--vscode-foreground);
    word-break: break-word;
`;

const DetailRuleTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px 10px;
    flex-wrap: wrap;
    margin-bottom: 4px;
`;

const DetailText = styled.div`
    font-size: 12px;
    color: var(--vscode-foreground);
    line-height: 1.5;
`;

const DetailMeta = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace);
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 8px 12px;
`;

/* YAML preview */
const YamlBlock = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    overflow: auto;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 11px;
    max-height: 200px;
`;

const YamlLine = styled.div<{ $highlight: boolean }>`
    display: flex;
    gap: 0;
    background: ${(p: { $highlight: boolean }) => p.$highlight ? 'rgba(239,68,68,0.12)' : 'transparent'};
    padding: 1px 0;
    &:hover { background: var(--vscode-list-hoverBackground); }
`;

const YamlLineNum = styled.span`
    flex: 0 0 36px;
    text-align: right;
    padding-right: 10px;
    color: var(--vscode-editorLineNumber-foreground);
    user-select: none;
    border-right: 1px solid var(--vscode-panel-border);
    margin-right: 10px;
`;

const YamlLineText = styled.span`
    white-space: pre;
    color: var(--vscode-editor-foreground);
`;

/* Action bar in detail panel */
const DetailActions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
`;

const CopyButton = styled(Button)`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
    border: 1px solid var(--vscode-panel-border);
    background: transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    &:hover { background: var(--vscode-list-hoverBackground); }
`;

const ReferenceLink = styled.a`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    font-size: 12px;
    color: var(--vscode-textLink-foreground);
    text-decoration: none;
    border: 1px solid var(--vscode-textLink-foreground);
    border-radius: 4px;
    background: var(--vscode-editor-background);
    &:hover { background: var(--vscode-list-hoverBackground); }
`;

const CopiedToast = styled.span`
    font-size: 11px;
    color: #10b981;
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const IssuesReportView: React.FC<IssuesReportViewProps> = ({
    rulesetName,
    violations,
    passedChecks,
    score,
    specContent,
    fileUri,
    ruleset,
    initialViewMode = 'overview',
    initialSeverityFilter = 'all',
    showBackButton = true,
    onBack,
}) => {
    const isAIAvailable = useAIAvailability();
    const [viewMode, setViewMode] = useState<ReportViewMode>(initialViewMode);
    const [search, setSearch] = useState('');
    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(initialSeverityFilter);
    const [groupMode, setGroupMode] = useState<GroupMode>('all');
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    React.useEffect(() => {
        setViewMode(initialViewMode);
    }, [initialViewMode]);

    React.useEffect(() => {
        setSeverityFilter(initialSeverityFilter);
    }, [initialSeverityFilter]);

    const grade = getGrade(score);
    const gradeColor = getScoreColor(score);

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warnCount = violations.filter(v => v.severity === 'warn').length;
    const endpointsAffected = useMemo(() => {
        const endpoints = new Set<string>();
        violations.forEach(v => {
            const endpoint = extractEndpoint(v);
            if (endpoint) {
                endpoints.add(endpoint);
            }
        });
        return endpoints.size;
    }, [violations]);
    const ruleFamiliesHit = useMemo(() => {
        const families = new Set<string>();
        violations.forEach(v => {
            const family = extractRuleFamily(v.rule);
            if (family) {
                families.add(family);
            }
        });
        return families.size;
    }, [violations]);

    const filteredViolations = useMemo(() => {
        let list = violations;
        if (severityFilter !== 'all') {
            list = list.filter(v => {
                if (severityFilter === 'info') return v.severity === 'info' || v.severity === 'hint';
                return v.severity === severityFilter;
            });
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(v =>
                (v.rule || '').toLowerCase().includes(q) ||
                (v.message || '').toLowerCase().includes(q) ||
                (v.displayPath || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [violations, severityFilter, search]);

    const selectedViolation = selectedIdx !== null ? filteredViolations[selectedIdx] : null;
    const selectedRuleFamily = selectedViolation ? extractRuleFamily(selectedViolation.rule) : null;
    const showRuleFamilyChip = Boolean(
        selectedRuleFamily && shouldShowRuleFamilyChip(selectedViolation?.rule, selectedRuleFamily)
    );
    const selectedRuleReference = selectedViolation ? getRuleReference(selectedViolation.rule) : null;

    const yamlLines = useMemo(() => {
        if (!specContent || !selectedViolation?.range) return null;
        return extractYamlLines(specContent, selectedViolation.range);
    }, [specContent, selectedViolation]);

    const handleCopyFix = useCallback(() => {
        if (!selectedViolation) return;
        const fix = `# Fix for: ${selectedViolation.rule}\n# At: ${selectedViolation.displayPath}\n# Issue: ${selectedViolation.message}\n`;
        navigator.clipboard.writeText(fix);
    }, [selectedViolation]);

    const handleFixWithAI = useCallback(() => {
        if (!selectedViolation) return;
        const pathStr = selectedViolation.pathSegments?.length
            ? ` at /${selectedViolation.pathSegments.join('/')}`
            : '';
        postVSCodeMessage({
            command: 'openCopilotChat',
            data: {
                context: JSON.stringify(selectedViolation),
                prompt: `Fix ${rulesetName} violation: ${selectedViolation.message}${pathStr}`,
            },
        });
    }, [selectedViolation, rulesetName]);

    const toggleGroup = (key: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    // Build grouped views
    const groupedByRule = useMemo(() => {
        const map = new Map<string, NormalizedGovernanceViolation[]>();
        filteredViolations.forEach(v => {
            const key = v.rule || 'unknown';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(v);
        });
        return Array.from(map.entries())
            .sort((a, b) => (SEVERITY_ORDER[b[1][0].severity] ?? 0) - (SEVERITY_ORDER[a[1][0].severity] ?? 0) || b[1].length - a[1].length);
    }, [filteredViolations]);

    const groupedByEndpoint = useMemo(() => {
        const map = new Map<string, NormalizedGovernanceViolation[]>();
        filteredViolations.forEach(v => {
            const ep = extractEndpoint(v) ?? '(other)';
            if (!map.has(ep)) map.set(ep, []);
            map.get(ep)!.push(v);
        });
        return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    }, [filteredViolations]);

    const issuesByRule = useMemo(() => {
        const map = new Map<string, number>();
        violations.forEach(v => {
            const key = v.rule || 'unknown';
            map.set(key, (map.get(key) ?? 0) + 1);
        });
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
    }, [violations]);

    const issuesByEndpoint = useMemo(() => {
        const map = new Map<string, number>();
        violations.forEach(v => {
            const endpoint = extractEndpoint(v) ?? '(other)';
            map.set(endpoint, (map.get(endpoint) ?? 0) + 1);
        });
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
    }, [violations]);

    const ruleFamilyCoverage = useMemo(() => {
        const groups = new Map<string, NormalizedGovernanceViolation[]>();
        violations.forEach(v => {
            const family = extractRuleFamily(v.rule) || 'other';
            if (!groups.has(family)) {
                groups.set(family, []);
            }
            groups.get(family)!.push(v);
        });

        return Array.from(groups.entries())
            .map(([family, familyViolations]) => {
                const hasError = familyViolations.some(v => v.severity === 'error');
                const hasWarn = familyViolations.some(v => v.severity === 'warn');
                const count = familyViolations.length;
                const label = family === 'other' ? 'Other Rules' : family.toUpperCase();
                const severityRank = hasError ? 2 : hasWarn ? 1 : 0;
                const status: 'pass' | 'warn' | 'fail' = hasError ? 'fail' : hasWarn ? 'warn' : 'pass';
                return { family, label, count, severityRank, status };
            })
            .sort((a, b) => b.severityRank - a.severityRank || b.count - a.count)
            .slice(0, 6)
            .map(({ family, label, status }) => ({ family, label, status }));
    }, [violations]);

    const renderFlatRows = () => {
        if (filteredViolations.length === 0) {
            return <EmptyState><Codicon name="search" sx={{ fontSize: '24px', opacity: 0.4 }} />No issues match your filters</EmptyState>;
        }
        return filteredViolations.map((v, idx) => {
            const color = SEVERITY_COLORS[v.severity] ?? '#3b82f6';
            const ruleFamily = extractRuleFamily(v.rule);
            const lineNum = v.range ? `L${v.range.start.line + 1}` : null;
            return (
                <IssueRow key={idx} $selected={selectedIdx === idx} onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}>
                    <SeverityDot $color={color} />
                    <IssueRowBody>
                        <IssueRowTop>
                            <RuleCode title={v.rule}>{v.rule || 'unknown'}</RuleCode>
                            {ruleFamily && <RuleFamilyChip>{ruleFamily.toUpperCase()}</RuleFamilyChip>}
                            {lineNum && <LineNum>{lineNum}</LineNum>}
                        </IssueRowTop>
                        <IssueRowPath title={v.displayPath}>{v.displayPath || '/'}</IssueRowPath>
                    </IssueRowBody>
                </IssueRow>
            );
        });
    };

    const renderGroupedRows = (groups: [string, NormalizedGovernanceViolation[]][]) => {
        const allFlat: NormalizedGovernanceViolation[] = [];
        groups.forEach(([, vs]) => allFlat.push(...vs));

        return groups.flatMap(([key, vs]) => {
            const isCollapsed = collapsedGroups.has(key);
            const topSeverity = vs.reduce((best, v) => (SEVERITY_ORDER[v.severity] ?? 0) > (SEVERITY_ORDER[best] ?? 0) ? v.severity : best, 'info');
            const color = SEVERITY_COLORS[topSeverity] ?? '#3b82f6';
            const rows: React.ReactNode[] = [
                <GroupHeader key={`grp-${key}`} onClick={() => toggleGroup(key)}>
                    <Codicon name={isCollapsed ? 'chevron-right' : 'chevron-down'} sx={{ fontSize: '12px', flexShrink: 0 }} />
                    <SeverityDot $color={color} />
                    <GroupHeaderTitle title={key}>{key}</GroupHeaderTitle>
                    <GroupHeaderCount>{vs.length} issue{vs.length !== 1 ? 's' : ''}</GroupHeaderCount>
                </GroupHeader>
            ];
            if (!isCollapsed) {
                vs.forEach(v => {
                    const globalIdx = filteredViolations.indexOf(v);
                    const lineNum = v.range ? `L${v.range.start.line + 1}` : null;
                    const ruleFamily = extractRuleFamily(v.rule);
                    rows.push(
                        <IssueRow key={`${key}-${globalIdx}`} $selected={selectedIdx === globalIdx}
                            onClick={() => setSelectedIdx(selectedIdx === globalIdx ? null : globalIdx)}
                            style={{ paddingLeft: 28 }}>
                            <SeverityDot $color={SEVERITY_COLORS[v.severity] ?? '#3b82f6'} />
                            <IssueRowBody>
                                <IssueRowTop>
                                    <RuleCode title={groupMode === 'rule' ? v.displayPath : v.rule}>
                                        {groupMode === 'rule' ? v.displayPath : (v.rule || 'unknown')}
                                    </RuleCode>
                                    {ruleFamily && groupMode !== 'rule' && <RuleFamilyChip>{ruleFamily.toUpperCase()}</RuleFamilyChip>}
                                    {lineNum && <LineNum>{lineNum}</LineNum>}
                                </IssueRowTop>
                                <IssueRowPath>{groupMode === 'rule' ? v.message : v.displayPath}</IssueRowPath>
                            </IssueRowBody>
                        </IssueRow>
                    );
                });
            }
            return rows;
        });
    };

    return (
        <Root>
            {/* Top bar */}
            <TopBar>
                {showBackButton && (
                    <BackButton onClick={onBack}>
                        <Codicon name="arrow-left" sx={{ fontSize: '12px' }} />
                        Back
                    </BackButton>
                )}
                <GradeBadge $color={gradeColor}>{grade}</GradeBadge>
                {showBackButton && <TopBarTitle title={rulesetName}>{rulesetName}</TopBarTitle>}
                <ViewTabs>
                    <ViewTab $active={viewMode === 'overview'} onClick={() => setViewMode('overview')}>
                        <Codicon name="dashboard" sx={{ fontSize: '12px' }} />
                        Overview
                    </ViewTab>
                    <ViewTab $active={viewMode === 'issues'} onClick={() => setViewMode('issues')}>
                        <Codicon name="list-unordered" sx={{ fontSize: '12px' }} />
                        Issues
                    </ViewTab>
                </ViewTabs>
                <TopBarStat $color="#ef4444">
                    <Codicon name="error" sx={{ fontSize: '12px' }} />
                    {errorCount}
                </TopBarStat>
                <TopBarStat $color="#f59e0b">
                    <Codicon name="warning" sx={{ fontSize: '12px' }} />
                    {warnCount}
                </TopBarStat>
                <TopBarStat $color="#10b981">
                    <Codicon name="check" sx={{ fontSize: '12px' }} />
                    {passedChecks} passed
                </TopBarStat>
            </TopBar>

            {viewMode === 'overview' ? (
                <OverviewBody>
                    <SummaryGrid>
                        <SummaryCard $tone="#ef4444">
                            <SummaryValue $tone="#ef4444">{errorCount}</SummaryValue>
                            <SummaryLabel>Errors (sev 0)</SummaryLabel>
                        </SummaryCard>
                        <SummaryCard $tone="#f59e0b">
                            <SummaryValue $tone="#f59e0b">{warnCount}</SummaryValue>
                            <SummaryLabel>Warnings (sev 1)</SummaryLabel>
                        </SummaryCard>
                        <SummaryCard $tone="#10b981">
                            <SummaryValue $tone="#10b981">{endpointsAffected}</SummaryValue>
                            <SummaryLabel>Endpoints Affected</SummaryLabel>
                        </SummaryCard>
                        <SummaryCard $tone="#8b5cf6">
                            <SummaryValue $tone="#8b5cf6">{ruleFamiliesHit}</SummaryValue>
                            <SummaryLabel>Rule Families Hit</SummaryLabel>
                        </SummaryCard>
                    </SummaryGrid>

                    <PanelsGrid>
                        <Panel>
                            <PanelTitle>Issues by Rule</PanelTitle>
                            <BarList>
                                {issuesByRule.map(([rule, count]) => {
                                    return (
                                        <BarRow key={rule}>
                                            <BarLabel title={rule}>{rule}</BarLabel>
                                            <BarCount>{count}</BarCount>
                                        </BarRow>
                                    );
                                })}
                            </BarList>
                        </Panel>

                        <Panel>
                            <PanelTitle>Issues by Endpoint</PanelTitle>
                            <BarList>
                                {issuesByEndpoint.map(([endpoint, count]) => {
                                    return (
                                        <BarRow key={endpoint}>
                                            <BarLabel title={endpoint}>{endpoint}</BarLabel>
                                            <BarCount>{count}</BarCount>
                                        </BarRow>
                                    );
                                })}
                            </BarList>
                        </Panel>

                        <Panel>
                            <PanelTitle>Rule Family Coverage</PanelTitle>
                            <BarList>
                                {ruleFamilyCoverage.map(({ family, label, status }) => (
                                    <FamilyCoverageItem key={family} $status={status}>
                                        <span>{label}</span>
                                        <FamilyStatus $status={status}>{status}</FamilyStatus>
                                    </FamilyCoverageItem>
                                ))}
                            </BarList>
                        </Panel>
                    </PanelsGrid>
                </OverviewBody>
            ) : (
                <>
            {/* Control bar */}
            <ControlBar>
                <SearchWrapper>
                    <SearchField
                        placeholder="Search rules, paths..."
                        value={search}
                        onTextChange={(value) => { setSearch(value); setSelectedIdx(null); }}
                    />
                </SearchWrapper>

                <FilterSelect
                    value={severityFilter}
                    onChange={e => { setSeverityFilter(e.target.value as SeverityFilter); setSelectedIdx(null); }}
                >
                    <option value="all">All severities</option>
                    <option value="error">Errors only</option>
                    <option value="warn">Warnings only</option>
                    <option value="info">Info only</option>
                </FilterSelect>

                <GroupToggleRow>
                    {(['all', 'rule', 'endpoint'] as GroupMode[]).map(m => (
                        <GroupToggleBtn key={m} $active={groupMode === m}
                            onClick={() => { setGroupMode(m); setSelectedIdx(null); }}>
                            {m === 'all' ? 'All' : m === 'rule' ? 'By Rule' : 'By Endpoint'}
                        </GroupToggleBtn>
                    ))}
                </GroupToggleRow>

                <CountChip>{filteredViolations.length} issue{filteredViolations.length !== 1 ? 's' : ''}</CountChip>
            </ControlBar>

            {/* Split body */}
            <SplitBody>
                {/* Issues table */}
                <TablePanel $hasDetail={selectedViolation !== null}>
                    <TableScroll>
                        {groupMode === 'all' && renderFlatRows()}
                        {groupMode === 'rule' && renderGroupedRows(groupedByRule)}
                        {groupMode === 'endpoint' && renderGroupedRows(groupedByEndpoint)}
                    </TableScroll>
                </TablePanel>

                {/* Detail panel */}
                {selectedViolation ? (
                    <DetailPanel>
                        <DetailScroll>
                            {/* Rule + severity */}
                            <div>
                                <DetailRuleTitle>
                                    <DetailRuleId>{selectedViolation.rule || 'unknown'}</DetailRuleId>
                                    <SeverityBadge $color={SEVERITY_COLORS[selectedViolation.severity] ?? '#3b82f6'}>
                                        {selectedViolation.severity}
                                    </SeverityBadge>
                                    {showRuleFamilyChip && (
                                        <RuleFamilyChip style={{ fontSize: '9px' }} title="Rule family / style">
                                            {selectedRuleFamily.toUpperCase()}
                                        </RuleFamilyChip>
                                    )}
                                </DetailRuleTitle>
                            </div>

                            {/* Message */}
                            <div>
                                <DetailSectionLabel>Message</DetailSectionLabel>
                                <ViolationDetailProseBlock>
                                    <ViolationMarkdown>{selectedViolation.message || '—'}</ViolationMarkdown>
                                </ViolationDetailProseBlock>
                            </div>

                            {/* Description */}
                            {selectedViolation.description && (
                                <div>
                                    <DetailSectionLabel>Description</DetailSectionLabel>
                                    <ViolationDetailProseBlock>
                                        <ViolationMarkdown>{selectedViolation.description}</ViolationMarkdown>
                                    </ViolationDetailProseBlock>
                                </div>
                            )}

                            {selectedViolation.fixSuggestion && (
                                <div>
                                    <DetailSectionLabel>Fix suggestion</DetailSectionLabel>
                                    <ViolationDetailFixCallout>
                                        <ViolationMarkdown>{selectedViolation.fixSuggestion}</ViolationMarkdown>
                                    </ViolationDetailFixCallout>
                                </div>
                            )}

                            {/* Location */}
                            <div>
                                <DetailSectionLabel>Location</DetailSectionLabel>
                                <DetailMeta>
                                    <div>Path: {selectedViolation.displayPath || '/'}</div>
                                    {selectedViolation.range && (
                                        <div style={{ marginTop: 4 }}>
                                            Lines: {selectedViolation.range.start.line + 1}
                                            {selectedViolation.range.end.line !== selectedViolation.range.start.line
                                                ? `–${selectedViolation.range.end.line + 1}` : ''}
                                            {' '}· Col {selectedViolation.range.start.character + 1}
                                        </div>
                                    )}
                                </DetailMeta>
                            </div>

                            {/* YAML snippet */}
                            {yamlLines && yamlLines.length > 0 && (
                                <div>
                                    <DetailSectionLabel>YAML Snippet</DetailSectionLabel>
                                    <YamlBlock>
                                        {yamlLines.map(({ lineNumber, text, highlight }) => (
                                            <YamlLine key={lineNumber} $highlight={highlight}>
                                                <YamlLineNum>{lineNumber}</YamlLineNum>
                                                <YamlLineText>{text}</YamlLineText>
                                            </YamlLine>
                                        ))}
                                    </YamlBlock>
                                </div>
                            )}

                            {/* Rule reference (if available) */}
                            {selectedRuleReference && (
                                <div>
                                    <DetailSectionLabel>Reference</DetailSectionLabel>
                                    <ReferenceLink
                                        href={selectedRuleReference.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Codicon name="link-external" sx={{ fontSize: '12px' }} />
                                        {selectedRuleReference.label}
                                    </ReferenceLink>
                                </div>
                            )}

                            {/* Actions */}
                            <div>
                                <DetailSectionLabel>Actions</DetailSectionLabel>
                                <DetailActions>
                                    <AIButton
                                        isAvailable={isAIAvailable}
                                        onClick={handleFixWithAI}
                                        title="Fix with AI"
                                        label="Fix with AI"
                                    />
                                    <CopyButton onClick={handleCopyFix}>
                                        <Codicon name="copy" sx={{ fontSize: '12px' }} />
                                        Copy Fix Hint
                                    </CopyButton>
                                </DetailActions>
                            </div>
                        </DetailScroll>
                    </DetailPanel>
                ) : (
                    <DetailEmpty>
                        <Codicon name="arrow-left" sx={{ fontSize: '20px', opacity: 0.3 }} />
                        Select an issue to see details
                    </DetailEmpty>
                )}
            </SplitBody>
                </>
            )}
        </Root>
    );
};
