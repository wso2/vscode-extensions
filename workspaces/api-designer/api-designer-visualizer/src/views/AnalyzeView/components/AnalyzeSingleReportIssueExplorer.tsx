import React from 'react';
import styled from '@emotion/styled';
import { AIButton } from '../../../components/ai/AIButton';
import { AnalyzeReportKey, GroupBy, IssueRow, SeverityLevel, SortBy, SortDir } from '../hooks/useReport';
import { extractSnippetLines, getMethodStyle } from './AnalyzeSingleReportHelpers';

interface AnalyzeSingleReportIssueExplorerProps {
    title?: string;
    subtitle?: string;
    rows: IssueRow[];
    stats: { errors: number; warnings: number };
    filteredRows: IssueRow[];
    groupedRows: Array<{ key: string; rows: IssueRow[] }>;
    selectedIssue: IssueRow | null;
    setSelectedIssueId: React.Dispatch<React.SetStateAction<string | null>>;
    severityFilter: 'all' | SeverityLevel;
    setSeverityFilter: React.Dispatch<React.SetStateAction<'all' | SeverityLevel>>;
    groupBy: GroupBy;
    setGroupBy: React.Dispatch<React.SetStateAction<GroupBy>>;
    sortBy: SortBy;
    setSortBy: React.Dispatch<React.SetStateAction<SortBy>>;
    sortDir: SortDir;
    setSortDir: React.Dispatch<React.SetStateAction<SortDir>>;
    search: string;
    setSearch: React.Dispatch<React.SetStateAction<string>>;
    aiEnabled: boolean;
    reportKey: AnalyzeReportKey;
    reportName: string;
    fileUri: string;
    rulesetFileUrl?: string;
    rulesetContentPath?: string;
    specContent: string;
    onOpenCopilotChat: (context: string, prompt: string) => void;
    aiBucketFilter?: {
        mainBucketKey: string | null;
        subBucketKey: string | null;
        isLlmSelected?: boolean;
        summaryLabel?: string | null;
        llmOptionLabel?: string;
        options: Array<{
            key: string;
            label: string;
            subBuckets: Array<{ key: string; label: string }>;
        }>;
        onChangeMainBucket: (key: string | null) => void;
        onChangeSubBucket: (key: string | null) => void;
        onSelectLlm?: () => void;
        onClear: () => void;
    };
    breakdownFilter?: {
        selectedKey: string | null;
        summaryLabel?: string | null;
        options: Array<{ key: string; label: string }>;
        onChange: (key: string | null) => void;
    };
}

const Row = styled.div`display: flex; align-items: center; gap: 8px;`;
const SectionShell = styled.div``;

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

const IssueExplorerBlock = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 10px;
    background: var(--vscode-editor-background);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: min(85vh, 1000px);
    min-height: 560px;
`;
const IssueExplorerBody = styled.div`flex: 1; min-height: 0; overflow: hidden;`;
const IssuesLayout = styled.div`display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); height: 100%; border-top: 1px solid var(--vscode-panel-border);`;
const IssueListPanel = styled.div`
    border-right: 1px solid var(--vscode-panel-border);
    overflow: hidden; display: flex; flex-direction: column; min-height: 0;
`;
const Toolbar = styled.div`
    border-bottom: 1px solid var(--vscode-panel-border); padding: 10px 16px;
    display: flex; flex-direction: column; gap: 8px; background: var(--vscode-editorWidget-background);
    flex-shrink: 0;
`;
const ToolbarRow = styled.div`display: flex; flex-wrap: wrap; align-items: center; gap: 6px;`;
const FilterChip = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: 7px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    user-select: none;
    letter-spacing: 0.01em;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
    border: 1px solid ${({ $active }: { $active: boolean }) =>
        $active
            ? 'color-mix(in srgb, var(--vscode-focusBorder) 70%, var(--vscode-panel-border))'
            : 'color-mix(in srgb, var(--vscode-panel-border) 88%, transparent)'};
    background: ${({ $active }: { $active: boolean }) =>
        $active
            ? 'color-mix(in srgb, var(--vscode-focusBorder) 12%, transparent)'
            : 'color-mix(in srgb, var(--vscode-editorWidget-background) 92%, transparent)'};
    color: ${({ $active }: { $active: boolean }) =>
        $active
            ? 'var(--vscode-foreground)'
            : 'color-mix(in srgb, var(--vscode-descriptionForeground) 90%, var(--vscode-foreground))'};

    &:hover {
        background: color-mix(in srgb, var(--vscode-list-hoverBackground) 85%, transparent);
        color: var(--vscode-foreground);
        border-color: color-mix(in srgb, var(--vscode-focusBorder) 45%, var(--vscode-panel-border));
    }
`;

const ChipDot = styled.span<{ $color: string }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${({ $color }: { $color: string }) => $color};
    opacity: 0.9;
`;

const ToolbarSep = styled.div`
    width: 1px;
    height: 20px;
    background: var(--vscode-panel-border);
    flex-shrink: 0;
`;

const SearchWrap = styled.div`
    position: relative;
    flex: 1;
    min-width: 160px;
`;

const SearchIcon = styled.span`
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--vscode-descriptionForeground);
    pointer-events: none;
    display: flex;
    align-items: center;
`;

const SearchInput = styled.input`
    width: 100%;
    height: 32px;
    padding: 0 10px 0 32px;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 12px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;

    &:focus { border-color: var(--vscode-focusBorder); }
    &::placeholder { color: var(--vscode-input-placeholderForeground); }
`;
const Spacer = styled.div`flex: 1;`;
const CtrlSelect = styled.select`
    height: 26px; border: 1px solid var(--vscode-panel-border); border-radius: 6px;
    background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); padding: 0 8px; font-size: 11px;
`;
const ActiveFilterPill = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    padding: 0 9px;
    border: 1px solid var(--vscode-focusBorder);
    border-radius: 999px;
    background: color-mix(in srgb, var(--vscode-focusBorder) 12%, transparent);
    color: var(--vscode-foreground);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
`;
const EmptyState = styled.div`padding: 32px; text-align: center; color: var(--vscode-descriptionForeground); font-size: 13px;`;
const IssueCardsBody = styled.div`flex: 1; overflow-y: auto; padding: 8px;`;
const IssueGroup = styled.div`margin-bottom: 10px;`;
const GroupHeader = styled.div`
    font-size: 11px; font-weight: 700; color: var(--vscode-descriptionForeground);
    padding: 6px 12px; border-bottom: 1px solid var(--vscode-panel-border);
`;
const IssueCard = styled.button<{ $selected: boolean; $severity: SeverityLevel }>`
    width: 100%; border: 1px solid var(--vscode-panel-border); border-radius: 8px; text-align: left; display: flex;
    flex-direction: column; padding: 8px 10px; margin-bottom: 6px; cursor: pointer; color: var(--vscode-foreground); border-radius: 4px;
    border-left: 1px solid ${({ $severity }: { $severity: SeverityLevel }) =>
        $severity === 'error'
            ? 'var(--vscode-errorForeground)'
            : $severity === 'warn'
                ? 'var(--vscode-editorWarning-foreground)'
                : 'var(--vscode-editorInfo-foreground, #3b82f6)'};
    background: ${({ $selected }: { $selected: boolean }) =>
        $selected ? 'color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 80%, var(--vscode-editorWidget-background))' : 'var(--vscode-editorWidget-background)'};
`;
const CardMessage = styled.div`font-size: 11px; font-weight: 600; line-height: 1.35;`;
const CardPathText = styled.div`
    font-size: 11px; color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`;
const TableFooter = styled.div`
    padding: 6px 12px; font-size: 11px; color: var(--vscode-descriptionForeground);
    border-top: 1px solid var(--vscode-panel-border); background: var(--vscode-editorGroupHeader-tabsBackground);
`;
const DetailColumn = styled.div`height: 100%; min-height: 0; overflow: hidden; display: flex; flex-direction: column;`;
const DetailCard = styled.div`
    overflow: hidden; flex: 1;
    background: var(--vscode-editor-background); display: flex; flex-direction: column;
`;
const DetailHeader = styled.div`
    background: var(--vscode-editorGroupHeader-tabsBackground); border-bottom: 1px solid var(--vscode-panel-border);
    padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;
`;
const DetailHeaderTitle = styled.span`font-size: 12px; font-weight: 700; color: var(--vscode-foreground);`;
const DetailHeaderMeta = styled.span`font-size: 11px; color: var(--vscode-descriptionForeground);`;
const DetailBody = styled.div`padding: 14px; display: flex; flex-direction: column; gap: 10px; flex: 1; overflow-y: auto;`;
const RuleTitle = styled.div`
    font-size: 14px;
    font-weight: 800;
    color: var(--vscode-foreground);
    letter-spacing: -0.02em;
    line-height: 1.15;
`;
const DetailSection = styled.div`display: flex; flex-direction: column; gap: 4px;`;
const DetailLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--vscode-descriptionForeground);
`;
const DetailValue = styled.div`
    font-size: 12px;
    color: var(--vscode-foreground);
    word-break: break-word;
    line-height: 1.45;
    border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 60%, transparent);
    border-radius: 8px;
    background: color-mix(in srgb, var(--vscode-editorWidget-background) 82%, transparent);
    padding: 8px 10px;
`;
const SeverityPill = styled.span<{ $severity: SeverityLevel }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${({ $severity }: { $severity: SeverityLevel }) =>
        $severity === 'error'
            ? 'var(--vscode-errorForeground)'
            : $severity === 'warn'
                ? 'var(--vscode-editorWarning-foreground)'
                : 'var(--vscode-editorInfo-foreground, #3b82f6)'};
    background: ${({ $severity }: { $severity: SeverityLevel }) =>
        $severity === 'error'
            ? 'color-mix(in srgb, var(--vscode-errorForeground) 18%, transparent)'
            : $severity === 'warn'
                ? 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 18%, transparent)'
                : 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #3b82f6) 18%, transparent)'};
    border: 1px solid ${({ $severity }: { $severity: SeverityLevel }) =>
        $severity === 'error'
            ? 'color-mix(in srgb, var(--vscode-errorForeground) 40%, var(--vscode-panel-border))'
            : $severity === 'warn'
                ? 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 40%, var(--vscode-panel-border))'
                : 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #3b82f6) 40%, var(--vscode-panel-border))'};

    &::before {
        content: '';
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: currentColor;
        flex-shrink: 0;
    }
`;
const MessageBox = styled.div`
    border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 60%, transparent);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 12px;
    background: color-mix(in srgb, var(--vscode-editorWidget-background) 82%, transparent);
`;
const SuggestionBox = styled.div`
    border: 1px solid color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 36%, var(--vscode-panel-border));
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    background: color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 12%, transparent);
    color: color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 76%, var(--vscode-foreground));
    line-height: 1.45;
`;
const YamlBlock = styled.div`
    background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px;
    overflow: auto; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; max-height: 220px;
`;
const YamlLine = styled.div<{ $highlight: boolean }>`
    display: flex; background: ${({ $highlight }: { $highlight: boolean }) => ($highlight ? 'rgba(239,68,68,0.12)' : 'transparent')}; padding: 1px 0;
`;
const YamlLineNum = styled.span`flex: 0 0 36px; text-align: right; padding-right: 10px; border-right: 1px solid var(--vscode-panel-border); margin-right: 10px;`;
const YamlLineText = styled.span`white-space: pre; color: var(--vscode-editor-foreground);`;
const EndPointValue = styled(DetailValue)`display: inline-flex; align-items: center; gap: 8px;`;

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
    const style = getMethodStyle(method);
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, borderRadius: 4, padding: '0 7px', fontSize: 10, fontWeight: 700, color: style.color, background: style.bg }}>
            {method}
        </span>
    );
};

export const AnalyzeSingleReportIssueExplorer: React.FC<AnalyzeSingleReportIssueExplorerProps> = (props) => {
    const {
        title,
        subtitle,
        rows, stats, filteredRows, groupedRows, selectedIssue, setSelectedIssueId,
        severityFilter, setSeverityFilter, groupBy, setGroupBy, sortBy, setSortBy, sortDir, setSortDir, search, setSearch,
        aiEnabled, reportKey, reportName, fileUri, rulesetFileUrl, rulesetContentPath, specContent, onOpenCopilotChat, aiBucketFilter, breakdownFilter,
    } = props;

    const LLM_FILTER_VALUE = '__llm_validation__';

    return (
        <SectionShell>
            <SectionHeader>
                <SectionHeading>
                    <SectionTitle>{title || 'Issue Explorer'}</SectionTitle>
                    <SectionSubtitle>{subtitle || 'Browse, filter and inspect all violations in detail'}</SectionSubtitle>
                </SectionHeading>
                <SectionBadge id="issueCountBadge">{rows.length} issue{rows.length !== 1 ? 's' : ''}</SectionBadge>
            </SectionHeader>
        <IssueExplorerBlock>
            <Toolbar>
                <ToolbarRow>
                    <FilterChip $active={severityFilter === 'all'} onClick={() => setSeverityFilter('all')}>All</FilterChip>
                    <FilterChip $active={severityFilter === 'error'} onClick={() => setSeverityFilter('error')}><ChipDot $color="var(--vscode-errorForeground)" />Errors</FilterChip>
                    <FilterChip $active={severityFilter === 'warn'} onClick={() => setSeverityFilter('warn')}><ChipDot $color="var(--vscode-editorWarning-foreground)" />Warnings</FilterChip>
                    <ToolbarSep />
                    <CtrlSelect value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
                        <option value="none">No grouping</option><option value="rule">Group by rule</option><option value="endpoint">Group by endpoint</option>
                    </CtrlSelect>
                    {reportKey === 'ai-readiness' && aiBucketFilter ? (
                        <CtrlSelect
                            value={
                                aiBucketFilter.isLlmSelected
                                    ? LLM_FILTER_VALUE
                                    : (aiBucketFilter.subBucketKey
                                        ? `${aiBucketFilter.mainBucketKey}:${aiBucketFilter.subBucketKey}`
                                        : aiBucketFilter.mainBucketKey || '')
                            }
                            onChange={(e) => {
                                const val = e.target.value;
                                if (!val) {
                                    aiBucketFilter.onClear();
                                } else if (val === LLM_FILTER_VALUE) {
                                    aiBucketFilter.onSelectLlm?.();
                                } else if (val.includes(':')) {
                                    const [main, sub] = val.split(':');
                                    aiBucketFilter.onChangeMainBucket(main);
                                    aiBucketFilter.onChangeSubBucket(sub);
                                } else {
                                    aiBucketFilter.onChangeMainBucket(val);
                                    aiBucketFilter.onChangeSubBucket(null);
                                }
                            }}
                        >
                            <option value="">All categories</option>
                            <option value={LLM_FILTER_VALUE}>{aiBucketFilter.llmOptionLabel || 'LLM Findings'}</option>
                            {aiBucketFilter.options.map((b) => (
                                <React.Fragment key={b.key}>
                                    <option value={b.key}>{b.label}</option>
                                    {b.subBuckets.map((s) => (
                                        <option key={s.key} value={`${b.key}:${s.key}`}>{b.label} › {s.label}</option>
                                    ))}
                                </React.Fragment>
                            ))}
                        </CtrlSelect>
                    ) : breakdownFilter ? (
                        <CtrlSelect value={breakdownFilter.selectedKey || ''} onChange={(e) => breakdownFilter.onChange(e.target.value || null)}>
                            <option value="">All categories</option>
                            {breakdownFilter.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                        </CtrlSelect>
                    ) : null}
                    <ToolbarSep />
                    <SearchWrap>
                        <SearchIcon>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </SearchIcon>
                        <SearchInput placeholder="Search rules, messages, paths…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </SearchWrap>
                    <Spacer />
                    <AIButton
                        isAvailable={aiEnabled}
                        title="Fix All with AI"
                        label="Fix All with AI"
                        onClick={() => {
                            const sevLabel = severityFilter === 'error' ? 'error' : severityFilter === 'warn' ? 'warning' : 'all';
                            const prompt = `Fix ${sevLabel === 'all' ? 'all' : `all ${sevLabel}`} violations in the ${reportName} ruleset.\n\nIMPORTANT: Use the #validateWithSpectralRuleset MCP tool:\n1. Call validateWithSpectralRuleset with fileUri: "${fileUri}", rulesetName: "${reportName}", fileUrl: "${rulesetFileUrl}", rulesetContentPath: "${rulesetContentPath}" to find violations.\n2. Fix each violation, then call validateWithSpectralRuleset again to verify.\n3. Repeat until no ${sevLabel === 'all' ? '' : sevLabel + ' '}violations remain.`;
                            onOpenCopilotChat(JSON.stringify({ fileUri, rulesetName: reportName, fileUrl: rulesetFileUrl, rulesetContentPath, severityFilter }), prompt);
                        }}
                    />
                </ToolbarRow>
                {((reportKey === 'ai-readiness' && aiBucketFilter?.summaryLabel) || (reportKey !== 'ai-readiness' && breakdownFilter?.summaryLabel)) && (
                    <ToolbarRow>
                        <ActiveFilterPill>
                            Filtered: {reportKey === 'ai-readiness' ? aiBucketFilter?.summaryLabel : breakdownFilter?.summaryLabel}
                        </ActiveFilterPill>
                    </ToolbarRow>
                )}
            </Toolbar>
            <IssueExplorerBody>
                <IssuesLayout>
                        <IssueListPanel>
                            <IssueCardsBody>
                                {filteredRows.length === 0 ? <EmptyState>No issues match your filters.</EmptyState> : groupedRows.map((group) => (
                                    <IssueGroup key={group.key}>
                                        {groupBy !== 'none' && <GroupHeader>{group.key} ({group.rows.length})</GroupHeader>}
                                        {group.rows.map((row) => (
                                            <IssueCard key={row.id} $selected={selectedIssue?.id === row.id} $severity={row.severity} onClick={() => setSelectedIssueId(row.id)}>
                                                <CardMessage>{row.message}</CardMessage>
                                                <CardPathText>{row.path}</CardPathText>
                                            </IssueCard>
                                        ))}
                                    </IssueGroup>
                                ))}
                            </IssueCardsBody>
                            <TableFooter>Showing {filteredRows.length} of {rows.length} issues</TableFooter>
                        </IssueListPanel>
                        <DetailColumn>
                            {!selectedIssue ? <EmptyState>Select an issue to view details.</EmptyState> : (
                                <DetailCard>
                                    <DetailHeader>
                                        <DetailHeaderTitle>Issue Detail</DetailHeaderTitle>
                                        <Row style={{ gap: 10 }}>
                                            <AIButton
                                                isAvailable={aiEnabled}
                                                title="Fix with AI"
                                                label="Fix with AI"
                                                onClick={() => {
                                                    const pathStr = selectedIssue.violation.pathSegments?.length ? ` at /${selectedIssue.violation.pathSegments.join('/')}` : '';
                                                    onOpenCopilotChat(JSON.stringify(selectedIssue.violation), `Fix ${reportName} violation: ${selectedIssue.message}${pathStr}`);
                                                }}
                                            />
                                            <DetailHeaderMeta>{filteredRows.findIndex((r) => r.id === selectedIssue.id) + 1} of {filteredRows.length}</DetailHeaderMeta>
                                        </Row>
                                    </DetailHeader>
                                    <DetailBody>
                                        <RuleTitle>{selectedIssue.rule}</RuleTitle>
                                        <Row><SeverityPill $severity={selectedIssue.severity}>{selectedIssue.severity}</SeverityPill></Row>
                                        <DetailSection><DetailLabel>Message</DetailLabel><MessageBox>{selectedIssue.message}</MessageBox></DetailSection>
                                        {selectedIssue.violation.description && <DetailSection><DetailLabel>Description</DetailLabel><DetailValue>{selectedIssue.violation.description}</DetailValue></DetailSection>}
                                        {selectedIssue.violation.fixSuggestion && <DetailSection><DetailLabel>fixSuggestion</DetailLabel><SuggestionBox>{selectedIssue.violation.fixSuggestion}</SuggestionBox></DetailSection>}
                                        <DetailSection>
                                            <DetailLabel>Endpoint</DetailLabel>
                                            <EndPointValue style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: 11 }}>
                                                <MethodBadge method={selectedIssue.method} />
                                                <span>{selectedIssue.endpoint}</span>
                                            </EndPointValue>
                                        </DetailSection>
                                        <DetailSection><DetailLabel>Path</DetailLabel><DetailValue style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: 11 }}>{selectedIssue.path}</DetailValue></DetailSection>
                                        <DetailSection>
                                            <DetailLabel>Location</DetailLabel>
                                            <DetailValue style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: 11 }}>
                                                {selectedIssue.line > 0
                                                    ? `Line ${selectedIssue.line}${selectedIssue.violation.range?.end?.line != null && selectedIssue.violation.range.end.line + 1 !== selectedIssue.line
                                                        ? `-${selectedIssue.violation.range.end.line + 1}`
                                                        : ''
                                                    }`
                                                    : 'No line info'}
                                            </DetailValue>
                                        </DetailSection>
                                        {(() => {
                                            const snippetLines = extractSnippetLines(specContent, selectedIssue.violation.range);
                                            if (!snippetLines) return null;
                                            return (
                                                <DetailSection>
                                                    <DetailLabel>Spec snippet</DetailLabel>
                                                    <YamlBlock>{snippetLines.map(({ lineNumber, text, highlight }) => <YamlLine key={lineNumber} $highlight={highlight}><YamlLineNum>{lineNumber}</YamlLineNum><YamlLineText>{text}</YamlLineText></YamlLine>)}</YamlBlock>
                                                </DetailSection>
                                            );
                                        })()}
                                    </DetailBody>
                                </DetailCard>
                            )}
                        </DetailColumn>
                </IssuesLayout>
            </IssueExplorerBody>
        </IssueExplorerBlock>
        </SectionShell>
    );
};
