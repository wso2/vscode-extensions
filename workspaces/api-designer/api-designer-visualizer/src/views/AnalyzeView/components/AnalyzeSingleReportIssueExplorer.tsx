import React from 'react';
import styled from '@emotion/styled';
import { AIButton } from '../../../components/ai/AIButton';
import { AnalyzeReportKey, GroupBy, IssueRow, SeverityLevel, SortBy, SortDir } from '../hooks/useReport';
import { REPORT_TITLES, extractSnippetLines, getMethodStyle, getReferenceTag } from './AnalyzeSingleReportHelpers';

type ActiveTab = 'issues' | 'endpoints';

interface AnalyzeSingleReportIssueExplorerProps {
    activeTab: ActiveTab;
    setActiveTab: React.Dispatch<React.SetStateAction<ActiveTab>>;
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
    endpointSummary: Array<{
        count: number; errors: number; warnings: number; method: string; endpoint: string;
        topRules: string[]; dominantSeverity: 'error' | 'warn';
    }>;
    ruleFrequency: Array<{ rule: string; total: number; errors: number; warnings: number }>;
    onOpenCopilotChat: (context: string, prompt: string) => void;
}

const Row = styled.div`display: flex; align-items: center; gap: 8px;`;
const IssueExplorerBlock = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 10px;
    background: var(--vscode-editor-background);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: min(72vh, 760px);
    min-height: 520px;
`;
const SectionHeader = styled.div`
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 10px 12px; border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editorGroupHeader-tabsBackground);
`;
const SectionTitleText = styled.div`
    font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-foreground);
`;
const TabBar = styled.div`
    display: flex; gap: 4px; background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border); border-radius: 8px; padding: 4px; width: fit-content;
`;
const TabBtn = styled.button<{ $active: boolean }>`
    border: none; border-radius: 5px; height: 28px; padding: 0 14px; font-size: 12px; font-weight: 600; cursor: pointer;
    background: ${({ $active }: { $active: boolean }) => ($active ? 'var(--vscode-button-background)' : 'transparent')};
    color: ${({ $active }: { $active: boolean }) => ($active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)')};
    opacity: ${({ $active }: { $active: boolean }) => ($active ? 1 : 0.75)};
`;
const IssueExplorerBody = styled.div`flex: 1; min-height: 0; overflow: hidden;`;
const IssuesLayout = styled.div`display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 10px; height: 100%;`;
const Panel = styled.div`
    border: 1px solid var(--vscode-panel-border); border-radius: 0; background: var(--vscode-editor-background);
    overflow: hidden; display: flex; flex-direction: column; min-height: 0;
`;
const Toolbar = styled.div`
    border-bottom: 1px solid var(--vscode-panel-border); padding: 8px 12px;
    display: flex; flex-direction: column; gap: 6px; background: var(--vscode-editorGroupHeader-tabsBackground);
`;
const ToolbarRow = styled.div`display: flex; flex-wrap: wrap; align-items: center; gap: 6px;`;
const FilterChip = styled.button<{ $active: boolean }>`
    height: 26px; border-radius: 6px; font-size: 11px; font-weight: 600; padding: 0 10px; cursor: pointer;
    border: 1px solid ${({ $active }: { $active: boolean }) => ($active ? 'var(--vscode-button-background)' : 'var(--vscode-panel-border)')};
    background: ${({ $active }: { $active: boolean }) => ($active ? 'var(--vscode-button-background)' : 'var(--vscode-editor-background)')};
    color: ${({ $active }: { $active: boolean }) => ($active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)')};
`;
const SearchInput = styled.input`
    height: 26px; min-width: 220px; border: 1px solid var(--vscode-panel-border); border-radius: 6px;
    background: var(--vscode-input-background); color: var(--vscode-input-foreground); padding: 0 10px; font-size: 12px;
`;
const Spacer = styled.div`flex: 1;`;
const CtrlSelect = styled.select`
    height: 26px; border: 1px solid var(--vscode-panel-border); border-radius: 6px;
    background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); padding: 0 8px; font-size: 11px;
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
    flex-direction: column; gap: 4px; padding: 8px 10px; margin-bottom: 8px; cursor: pointer; color: var(--vscode-foreground);
    border-left: 3px solid ${({ $severity }: { $severity: SeverityLevel }) =>
        $severity === 'error' ? 'var(--vscode-errorForeground)' : $severity === 'warn' ? 'var(--vscode-editorWarning-foreground)' : 'var(--vscode-panel-border)'};
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
const DetailColumn = styled.div`height: 100%; min-height: 0;`;
const DetailCard = styled.div`
    border: 1px solid var(--vscode-panel-border); border-radius: 0; overflow: hidden;
    background: var(--vscode-editor-background); height: 100%; display: flex; flex-direction: column;
`;
const DetailHeader = styled.div`
    background: var(--vscode-editorGroupHeader-tabsBackground); border-bottom: 1px solid var(--vscode-panel-border);
    padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;
`;
const DetailHeaderTitle = styled.span`font-size: 12px; font-weight: 700; color: var(--vscode-foreground);`;
const DetailHeaderMeta = styled.span`font-size: 11px; color: var(--vscode-descriptionForeground);`;
const DetailBody = styled.div`padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; flex: 1; overflow-y: auto;`;
const DetailSection = styled.div`display: flex; flex-direction: column; gap: 4px;`;
const DetailLabel = styled.div`
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground);
`;
const DetailValue = styled.div`font-size: 12px; color: var(--vscode-foreground); word-break: break-word; line-height: 1.45;`;
const SeverityPill = styled.span<{ $severity: SeverityLevel }>`
    display: inline-flex; align-items: center; justify-content: center; min-width: 54px; height: 18px; border-radius: 4px;
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    color: ${({ $severity }: { $severity: SeverityLevel }) =>
        $severity === 'error' ? 'var(--vscode-errorForeground)' : $severity === 'warn' ? 'var(--vscode-editorWarning-foreground)' : 'var(--vscode-descriptionForeground)'};
`;
const MessageBox = styled.div`border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 8px 10px; font-size: 12px;`;
const SuggestionBox = styled.div`border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 8px 10px; font-size: 12px;`;
const ReferenceBox = styled.div`border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 8px 10px;`;
const YamlBlock = styled.div`
    background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 4px;
    overflow: auto; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; max-height: 220px;
`;
const YamlLine = styled.div<{ $highlight: boolean }>`
    display: flex; background: ${({ $highlight }: { $highlight: boolean }) => ($highlight ? 'rgba(239,68,68,0.12)' : 'transparent')}; padding: 1px 0;
`;
const YamlLineNum = styled.span`flex: 0 0 36px; text-align: right; padding-right: 10px; border-right: 1px solid var(--vscode-panel-border); margin-right: 10px;`;
const YamlLineText = styled.span`white-space: pre; color: var(--vscode-editor-foreground);`;
const EndpointTabLayout = styled.div`padding: 14px; display: flex; flex-direction: column; gap: 14px; height: 100%; min-height: 0; overflow: auto;`;
const EndpointGrid = styled.div`display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;`;
const EndpointCardV2 = styled.div<{ $severity: 'error' | 'warn' }>`
    border: 1px solid var(--vscode-panel-border); border-left: 3px solid ${({ $severity }: { $severity: 'error' | 'warn' }) =>
        $severity === 'error' ? 'var(--vscode-errorForeground)' : 'var(--vscode-editorWarning-foreground)'};
    border-radius: 8px; background: var(--vscode-editorWidget-background); padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
`;
const ProgressTrack = styled.div`height: 4px; border-radius: 2px; background: var(--vscode-panel-border); overflow: hidden;`;
const ProgressFill = styled.div<{ $width: number; $severity: 'error' | 'warn' }>`
    width: ${({ $width }: { $width: number }) => Math.min($width, 100)}%;
    height: 100%;
    background: ${({ $severity }: { $severity: 'error' | 'warn' }) =>
        $severity === 'error' ? 'var(--vscode-errorForeground)' : 'var(--vscode-editorWarning-foreground)'};
`;
const RuleChips = styled.div`display: flex; flex-wrap: wrap; gap: 4px;`;
const RuleChip = styled.span`border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 2px 6px; font-size: 10px;`;
const RuleFreqSection = styled.div`border: 1px solid var(--vscode-panel-border); border-radius: 8px; overflow: hidden;`;
const RuleFreqHead = styled.div`display: grid; grid-template-columns: 1fr 46px 60px 70px 100px; gap: 10px; padding: 8px 14px; border-bottom: 1px solid var(--vscode-panel-border);`;
const RuleFreqRow = styled.div`display: grid; grid-template-columns: 1fr 46px 60px 70px 100px; gap: 10px; padding: 7px 14px; border-bottom: 1px solid var(--vscode-panel-border);`;
const RuleFreqName = styled.span`font-size: 11px; font-family: var(--vscode-editor-font-family, monospace);`;
const RuleFreqNum = styled.span<{ $color?: string }>`font-size: 11px; font-weight: 700; color: ${({ $color }: { $color?: string }) => $color || 'var(--vscode-foreground)'}; text-align: center;`;
const RuleFreqBarTrack = styled.div`height: 6px; border-radius: 3px; background: var(--vscode-panel-border); overflow: hidden;`;
const RuleFreqBarFill = styled.div<{ $width: number; $hasErrors: boolean }>`
    width: ${({ $width }: { $width: number }) => Math.min($width, 100)}%;
    height: 100%;
    background: ${({ $hasErrors }: { $hasErrors: boolean }) => ($hasErrors ? 'var(--vscode-errorForeground)' : 'var(--vscode-editorWarning-foreground)')};
`;

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
        activeTab, setActiveTab, rows, stats, filteredRows, groupedRows, selectedIssue, setSelectedIssueId,
        severityFilter, setSeverityFilter, groupBy, setGroupBy, sortBy, setSortBy, sortDir, setSortDir, search, setSearch,
        aiEnabled, reportKey, reportName, fileUri, rulesetFileUrl, rulesetContentPath, specContent, endpointSummary, ruleFrequency, onOpenCopilotChat,
    } = props;

    return (
        <IssueExplorerBlock>
            <SectionHeader>
                <SectionTitleText>Issue Explorer</SectionTitleText>
                <TabBar>
                    <TabBtn $active={activeTab === 'issues'} onClick={() => setActiveTab('issues')}>Issues</TabBtn>
                    <TabBtn $active={activeTab === 'endpoints'} onClick={() => setActiveTab('endpoints')}>Endpoints</TabBtn>
                </TabBar>
            </SectionHeader>
            <IssueExplorerBody>
                {activeTab === 'issues' && (
                    <IssuesLayout>
                        <Panel>
                            <Toolbar>
                                <ToolbarRow>
                                    <FilterChip $active={severityFilter === 'all'} onClick={() => setSeverityFilter('all')}>All ({rows.length})</FilterChip>
                                    <FilterChip $active={severityFilter === 'error'} onClick={() => setSeverityFilter('error')}>Errors ({stats.errors})</FilterChip>
                                    <FilterChip $active={severityFilter === 'warn'} onClick={() => setSeverityFilter('warn')}>Warnings ({stats.warnings})</FilterChip>
                                    <Spacer />
                                    <SearchInput placeholder="Search rules, paths, messages…" value={search} onChange={(e) => setSearch(e.target.value)} />
                                </ToolbarRow>
                                <ToolbarRow>
                                    <CtrlSelect value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
                                        <option value="none">No grouping</option><option value="rule">Group by rule</option><option value="endpoint">Group by endpoint</option>
                                    </CtrlSelect>
                                    <CtrlSelect value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                                        <option value="severity">Sort by severity</option><option value="rule">Sort by rule</option><option value="line">Sort by line</option>
                                    </CtrlSelect>
                                    <CtrlSelect value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)}>
                                        <option value="asc">Ascending</option><option value="desc">Descending</option>
                                    </CtrlSelect>
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
                            </Toolbar>
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
                        </Panel>
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
                                        <DetailSection><DetailLabel>Rule</DetailLabel><DetailValue style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: 11 }}>{selectedIssue.rule}</DetailValue></DetailSection>
                                        <DetailSection><DetailLabel>Severity &amp; location</DetailLabel><Row><SeverityPill $severity={selectedIssue.severity}>{selectedIssue.severity}</SeverityPill><span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>{selectedIssue.line > 0 ? `Line ${selectedIssue.line}` : 'No line info'}</span></Row></DetailSection>
                                        <DetailSection><DetailLabel>Path</DetailLabel><Row><MethodBadge method={selectedIssue.method} /><DetailValue style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: 11 }}>{selectedIssue.endpoint}</DetailValue></Row></DetailSection>
                                        {selectedIssue.violation.description && <DetailSection><DetailLabel>Description</DetailLabel><DetailValue>{selectedIssue.violation.description}</DetailValue></DetailSection>}
                                        <DetailSection><DetailLabel>Message</DetailLabel><MessageBox>{selectedIssue.message}</MessageBox></DetailSection>
                                        {selectedIssue.violation.fixSuggestion && <DetailSection><DetailLabel>Fix suggestion</DetailLabel><SuggestionBox>{selectedIssue.violation.fixSuggestion}</SuggestionBox></DetailSection>}
                                        {getReferenceTag(selectedIssue.rule, reportKey) && (
                                            <DetailSection><DetailLabel>Reference</DetailLabel><ReferenceBox><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--vscode-textLink-foreground)' }}>{getReferenceTag(selectedIssue.rule, reportKey)}</div><div style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginTop: 2 }}>{reportKey === 'owasp' ? 'OWASP API Security Top 10' : REPORT_TITLES[reportKey]}</div></ReferenceBox></DetailSection>
                                        )}
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
                )}
                {activeTab === 'endpoints' && (
                    <Panel>
                        {endpointSummary.length === 0 ? <EmptyState>No endpoint issues detected.</EmptyState> : (
                            <EndpointTabLayout>
                                <EndpointGrid>
                                    {endpointSummary.map((item) => {
                                        const progressWidth = Math.max(4, (item.count / Math.max(1, rows.length)) * 100);
                                        const accentColor = item.errors > 0 ? 'var(--vscode-errorForeground)' : 'var(--vscode-editorWarning-foreground)';
                                        return (
                                            <EndpointCardV2 key={`${item.method}:${item.endpoint}`} $severity={item.dominantSeverity}>
                                                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ minWidth: 0, flex: 1 }}><MethodBadge method={item.method} /><div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.endpoint}>{item.endpoint}</div></div>
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: accentColor }}>{item.count}</div><div style={{ fontSize: 10, color: accentColor }}>issues</div></div>
                                                </Row>
                                                <ProgressTrack><ProgressFill $width={progressWidth} $severity={item.dominantSeverity} /></ProgressTrack>
                                                {item.topRules.length > 0 && <RuleChips>{item.topRules.map((rule) => <RuleChip key={rule}>{rule}</RuleChip>)}</RuleChips>}
                                            </EndpointCardV2>
                                        );
                                    })}
                                </EndpointGrid>
                                {ruleFrequency.length > 0 && (
                                    <RuleFreqSection>
                                        <RuleFreqHead><div>Rule</div><div style={{ textAlign: 'center' }}>Total</div><div style={{ textAlign: 'center' }}>Errors</div><div style={{ textAlign: 'center' }}>Warnings</div><div>Frequency</div></RuleFreqHead>
                                        {ruleFrequency.map(({ rule, total, errors, warnings }) => {
                                            const maxTotal = Math.max(1, ruleFrequency[0]?.total || 1);
                                            const width = (total / maxTotal) * 100;
                                            return (
                                                <RuleFreqRow key={rule}>
                                                    <RuleFreqName title={rule}>{rule}</RuleFreqName>
                                                    <RuleFreqNum>{total}</RuleFreqNum>
                                                    <RuleFreqNum $color={errors > 0 ? 'var(--vscode-errorForeground)' : 'var(--vscode-descriptionForeground)'}>{errors > 0 ? errors : '—'}</RuleFreqNum>
                                                    <RuleFreqNum $color={warnings > 0 ? 'var(--vscode-editorWarning-foreground)' : 'var(--vscode-descriptionForeground)'}>{warnings > 0 ? warnings : '—'}</RuleFreqNum>
                                                    <div><RuleFreqBarTrack><RuleFreqBarFill $width={width} $hasErrors={errors > 0} /></RuleFreqBarTrack></div>
                                                </RuleFreqRow>
                                            );
                                        })}
                                    </RuleFreqSection>
                                )}
                            </EndpointTabLayout>
                        )}
                    </Panel>
                )}
            </IssueExplorerBody>
        </IssueExplorerBlock>
    );
};
