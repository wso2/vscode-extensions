import React from 'react';
import styled from '@emotion/styled';
import { AIButton } from '../../../components/ai/AIButton';
import { postMessage } from '../../../utils/vscode-api';
import { AnalyzeReportKey, GroupBy, IssueRow, SeverityLevel, SortBy, SortDir } from '../hooks/useReport';
import { ANALYZE_TYPE_SCALE, extractSnippetLines, getMethodStyle } from './AnalyzeSingleReportHelpers';

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
    onOpenAIChat: (context: string, prompt: string) => void;
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

type FixStatus = 'fixing' | 'resolved' | 'stillPresent';

interface FixContext {
    issue: IssueRow;
    status: FixStatus;
    baselineRowsFingerprint: string;
}

const Row = styled.div`display: flex; align-items: center; gap: 8px;`;
const SectionShell = styled.div``;
const ExplorerSurface = styled.div`
    position: relative;
    overflow-x: hidden;
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

const IssueExplorerBlock = styled.div<{ $hasOverlay: boolean }>`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    background: var(--vscode-editor-background);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: min(76vh, 920px);
    min-height: 520px;
    margin-right: ${({ $hasOverlay }: { $hasOverlay: boolean }) => ($hasOverlay ? 'calc(min(42%, 560px) + 10px)' : '0')};
    transition: margin-right 180ms ease;

    @media (max-width: 1200px) {
        margin-right: ${({ $hasOverlay }: { $hasOverlay: boolean }) => ($hasOverlay ? 'calc(max(40%, 300px) + 10px)' : '0')};
        min-height: 420px;
    }
`;
const IssueExplorerBody = styled.div`
    flex: 1;
    min-height: 0;
    overflow: hidden;
`;
const IssuesLayout = styled.div`
    height: 100%;
    border-top: 1px solid var(--vscode-panel-border);
`;
const IssueListPanel = styled.div`
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
`;
const Toolbar = styled.div`
    border-bottom: 1px solid var(--vscode-panel-border); padding: 12px 14px;
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
    font-size: ${ANALYZE_TYPE_SCALE.sm};
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
    font-size: ${ANALYZE_TYPE_SCALE.md};
    font-family: inherit;
    outline: none;
    box-sizing: border-box;

    &:focus { border-color: var(--vscode-focusBorder); }
    &::placeholder { color: var(--vscode-input-placeholderForeground); }
`;
const Spacer = styled.div`flex: 1;`;
const CtrlSelect = styled.select`
    height: 26px; border: 1px solid var(--vscode-panel-border); border-radius: 6px;
    background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); padding: 0 8px; font-size: ${ANALYZE_TYPE_SCALE.sm};
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
    font-size: ${ANALYZE_TYPE_SCALE.xs};
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
`;
const EmptyState = styled.div`padding: 32px; text-align: center; color: var(--vscode-descriptionForeground); font-size: ${ANALYZE_TYPE_SCALE.base};`;
const IssueCardsBody = styled.div`flex: 1; overflow-y: auto; padding: 8px;`;
const IssueGroup = styled.div`margin-bottom: 10px;`;
const GroupHeader = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.sm}; font-weight: 700; color: var(--vscode-descriptionForeground);
    padding: 6px 12px; border-bottom: 1px solid var(--vscode-panel-border);
`;
const IssueCard = styled.button<{ $selected: boolean; $severity: SeverityLevel }>`
    width: 100%;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    text-align: left;
    display: flex;
    flex-direction: column;
    padding: 10px 12px;
    margin-bottom: 8px;
    cursor: pointer;
    color: var(--vscode-foreground);
    border-left: 1.5px solid ${({ $severity }: { $severity: SeverityLevel }) =>
        $severity === 'error'
            ? 'var(--vscode-errorForeground)'
            : $severity === 'warn'
                ? 'var(--vscode-editorWarning-foreground)'
                : 'var(--vscode-editorInfo-foreground, #3b82f6)'};
    background: ${({ $selected }: { $selected: boolean }) =>
        $selected
            ? 'color-mix(in srgb, var(--vscode-list-activeSelectionBackground) 65%, rgba(122, 162, 255, 0.08))'
            : 'var(--vscode-editorWidget-background)'};
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
    transition: border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;

    &:hover {
        border-color: color-mix(in srgb, var(--vscode-focusBorder) 45%, var(--vscode-panel-border));
    }
`;
const CardMessage = styled.div`font-size: ${ANALYZE_TYPE_SCALE.sm}; font-weight: 500; line-height: 1.35;`;
const CardPathText = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.sm}; color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
`;
const CardMetaRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;
const AiOriginBadge = styled.span`
    display: inline-flex;
    align-items: center;
    height: 16px;
    padding: 0 6px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--vscode-editorInfo-foreground, #38bdf8);
    background: color-mix(in srgb, var(--vscode-editorInfo-foreground, #38bdf8) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--vscode-editorInfo-foreground, #38bdf8) 30%, var(--vscode-panel-border));
    flex-shrink: 0;
`;
const TableFooter = styled.div`
    padding: 6px 12px; font-size: ${ANALYZE_TYPE_SCALE.sm}; color: var(--vscode-descriptionForeground);
    border-top: 1px solid var(--vscode-panel-border); background: var(--vscode-editorGroupHeader-tabsBackground);
`;
const DetailColumn = styled.div<{ $open: boolean }>`
    position: absolute;
    top: 0;
    right: 0;
    width: min(42%, 560px);
    min-width: 400px;
    height: min(76vh, 920px);
    min-height: 520px;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    box-shadow: -14px 0 28px rgba(0, 0, 0, 0.22), 0 6px 18px rgba(0, 0, 0, 0.2);
    transform: translateX(${({ $open }: { $open: boolean }) => ($open ? '0' : '102%')});
    opacity: ${({ $open }: { $open: boolean }) => ($open ? 1 : 0)};
    pointer-events: ${({ $open }: { $open: boolean }) => ($open ? 'auto' : 'none')};
    transition: transform 180ms ease, opacity 140ms ease;
    z-index: 5;

    @media (max-width: 1200px) {
        width: 40%;
        min-width: 300px;
        max-width: 460px;
        height: min(76vh, 920px);
        min-height: 420px;
        margin-top: 0;
        transform: translateX(${({ $open }: { $open: boolean }) => ($open ? '0' : '102%')});
        opacity: ${({ $open }: { $open: boolean }) => ($open ? 1 : 0)};
        pointer-events: ${({ $open }: { $open: boolean }) => ($open ? 'auto' : 'none')};
        transition: transform 180ms ease, opacity 140ms ease;
    }
`;
const DetailCard = styled.div`
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
`;
const DetailHeader = styled.div`
    background: color-mix(in srgb, var(--vscode-editorGroupHeader-tabsBackground) 90%, rgba(122, 162, 255, 0.02));
    border-bottom: 1px solid var(--vscode-panel-border);
    padding: 12px 12px 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;
const DetailHeaderTitle = styled.span`font-size: ${ANALYZE_TYPE_SCALE.md}; font-weight: 700; color: var(--vscode-foreground); letter-spacing: 0.01em;`;
const DetailHeaderMeta = styled.span`font-size: ${ANALYZE_TYPE_SCALE.sm}; color: var(--vscode-descriptionForeground);`;
const CloseDetailBtn = styled.button`
    height: 24px;
    min-width: 24px;
    border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 86%, transparent);
    border-radius: 4px;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    font-size: ${ANALYZE_TYPE_SCALE.base};
    line-height: 1;
    padding: 0;
    font-family: inherit;

    &:hover {
        color: var(--vscode-foreground);
        background: color-mix(in srgb, var(--vscode-list-hoverBackground) 82%, transparent);
    }
`;
const DetailBody = styled.div`
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 9px;
    flex: 1;
    overflow-y: auto;
`;
const RuleTitle = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.base};
    font-weight: 800;
    color: var(--vscode-foreground);
    letter-spacing: -0.02em;
    line-height: 1.15;
`;
const DetailSection = styled.div`display: flex; flex-direction: column; gap: 4px;`;
const DetailLabel = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.xs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--vscode-descriptionForeground);
`;
const DetailValue = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.sm};
    color: var(--vscode-foreground);
    word-break: break-word;
    line-height: 1.45;
    border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 74%, transparent);
    border-radius: 7px;
    background: color-mix(in srgb, var(--vscode-editorWidget-background) 90%, transparent);
    padding: 7px 9px;
`;
const SeverityPill = styled.span<{ $severity: SeverityLevel }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: ${ANALYZE_TYPE_SCALE.xs};
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
    border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 74%, transparent);
    border-radius: 7px;
    padding: 7px 9px;
    font-size: ${ANALYZE_TYPE_SCALE.sm};
    background: color-mix(in srgb, var(--vscode-editorWidget-background) 90%, transparent);
`;
const SuggestionBox = styled.div`
    border: 1px solid color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 28%, var(--vscode-panel-border));
    border-radius: 7px;
    padding: 8px 10px;
    font-size: ${ANALYZE_TYPE_SCALE.sm};
    background: color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 8%, transparent);
    color: color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 68%, var(--vscode-foreground));
    line-height: 1.45;
`;
const YamlBlock = styled.div`
    background: var(--vscode-editor-background); border: 1px solid color-mix(in srgb, var(--vscode-panel-border) 76%, transparent); border-radius: 7px;
    overflow: auto; font-family: var(--vscode-editor-font-family, monospace); font-size: ${ANALYZE_TYPE_SCALE.sm}; max-height: 220px;
`;
const YamlLine = styled.div<{ $highlight: boolean }>`
    display: flex; background: ${({ $highlight }: { $highlight: boolean }) => ($highlight ? 'rgba(239,68,68,0.12)' : 'transparent')}; padding: 1px 0;
`;
const YamlLineNum = styled.span`flex: 0 0 36px; text-align: right; padding-right: 10px; border-right: 1px solid var(--vscode-panel-border); margin-right: 10px;`;
const YamlLineText = styled.span`white-space: pre; color: var(--vscode-editor-foreground);`;
const EndPointValue = styled(DetailValue)`display: inline-flex; align-items: center; gap: 8px;`;
const FixStatusBox = styled.div<{ $status: FixStatus }>`
    border: 1px solid
        ${({ $status }: { $status: FixStatus }) =>
            $status === 'resolved'
                ? 'color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 35%, var(--vscode-panel-border))'
                : $status === 'stillPresent'
                    ? 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 35%, var(--vscode-panel-border))'
                    : 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #38BDF8) 35%, var(--vscode-panel-border))'};
    background:
        ${({ $status }: { $status: FixStatus }) =>
            $status === 'resolved'
                ? 'color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 9%, transparent)'
                : $status === 'stillPresent'
                    ? 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 9%, transparent)'
                    : 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #38BDF8) 9%, transparent)'};
    border-radius: 8px;
    padding: 10px 11px;
    display: flex;
    flex-direction: column;
    gap: 7px;
`;
const FixStatusTitle = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.sm};
    font-weight: 700;
    color: var(--vscode-foreground);
`;
const FixStatusText = styled.div`
    font-size: ${ANALYZE_TYPE_SCALE.sm};
    color: var(--vscode-descriptionForeground);
    line-height: 1.45;
`;
const FixStatusActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;
const FixStatusActionBtn = styled.button`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 5px;
    background: transparent;
    color: var(--vscode-textLink-foreground);
    cursor: pointer;
    font-size: ${ANALYZE_TYPE_SCALE.xs};
    padding: 4px 8px;
    font-family: inherit;
    &:hover { background: color-mix(in srgb, var(--vscode-textLink-foreground) 10%, transparent); }
`;

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
    const style = getMethodStyle(method);
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', height: 18, borderRadius: 4, padding: '0 7px', fontSize: ANALYZE_TYPE_SCALE.xs, fontWeight: 700, color: style.color, background: style.bg }}>
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
        aiEnabled, reportKey, reportName, fileUri, rulesetFileUrl, rulesetContentPath, specContent, onOpenAIChat, aiBucketFilter, breakdownFilter,
    } = props;

    const LLM_FILTER_VALUE = '__llm_validation__';
    const isLlmFinding = React.useCallback((issue: IssueRow): boolean => {
        return (issue.breakdownKeys || []).includes('llm-validation') ||
            /^rule\s+\d+(?:\.\d+)?$/i.test((issue.rule || '').trim()) ||
            (issue.rule || '').toLowerCase().startsWith('ai-readiness-llm-');
    }, []);
    const [isDetailOpen, setIsDetailOpen] = React.useState(false);
    const [fixContext, setFixContext] = React.useState<FixContext | null>(null);
    const getIssueSignature = React.useCallback(
        (issue: IssueRow) => `${issue.rule}::${issue.message}::${issue.path}::${issue.severity}::${issue.line}`,
        []
    );
    const detailIssue = fixContext?.issue || selectedIssue;
    const rowsFingerprint = React.useMemo(
        () => rows.map((row) => getIssueSignature(row)).join('|'),
        [getIssueSignature, rows]
    );
    const disableFixWithAi = fixContext?.status === 'fixing' || fixContext?.status === 'resolved';

    React.useEffect(() => {
        if (!detailIssue && isDetailOpen) {
            setIsDetailOpen(false);
        }
    }, [detailIssue, isDetailOpen]);

    React.useEffect(() => {
        if (!fixContext) {
            return;
        }
        // Do not decide result until we observe an actual report/list refresh.
        if (rowsFingerprint === fixContext.baselineRowsFingerprint) {
            return;
        }
        const targetSignature = getIssueSignature(fixContext.issue);
        const stillExists = rows.some((row) => getIssueSignature(row) === targetSignature);
        setFixContext((prev) => {
            if (!prev) {
                return prev;
            }
            return {
                ...prev,
                status: stillExists ? 'stillPresent' : 'resolved',
                // Keep tracking future refreshes so stillPresent can become resolved later.
                baselineRowsFingerprint: rowsFingerprint,
            };
        });
    }, [fixContext, getIssueSignature, rows, rowsFingerprint]);

    return (
        <SectionShell>
            <SectionHeader>
                <SectionHeading>
                    <SectionTitle>{title || 'Issue Explorer'}</SectionTitle>
                    <SectionSubtitle>{subtitle || 'Browse, filter and inspect all violations in detail'}</SectionSubtitle>
                </SectionHeading>
                <SectionBadge id="issueCountBadge">{rows.length} issue{rows.length !== 1 ? 's' : ''}</SectionBadge>
            </SectionHeader>
            <ExplorerSurface>
                <IssueExplorerBlock $hasOverlay={isDetailOpen && !!selectedIssue}>
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
                                    onOpenAIChat(JSON.stringify({ fileUri, rulesetName: reportName, fileUrl: rulesetFileUrl, rulesetContentPath, severityFilter }), prompt);
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
                                        {group.rows.map((row) => {
                                            const isAiFinding = isLlmFinding(row);
                                            return (
                                            <IssueCard
                                                key={row.id}
                                                $selected={isDetailOpen && detailIssue?.id === row.id}
                                                $severity={row.severity}
                                                onClick={() => {
                                                    setFixContext(null);
                                                    setSelectedIssueId(row.id);
                                                    setIsDetailOpen(true);
                                                }}
                                            >
                                                <CardMessage>{row.message}</CardMessage>
                                                <CardMetaRow>
                                                    <CardPathText>{row.path}</CardPathText>
                                                    {isAiFinding && <AiOriginBadge>AI</AiOriginBadge>}
                                                </CardMetaRow>
                                            </IssueCard>
                                            );
                                        })}
                                    </IssueGroup>
                                ))}
                            </IssueCardsBody>
                                <TableFooter>Showing {filteredRows.length} of {rows.length} issues</TableFooter>
                            </IssueListPanel>
                        </IssuesLayout>
                    </IssueExplorerBody>
                </IssueExplorerBlock>
                <DetailColumn $open={isDetailOpen && !!detailIssue}>
                    {!detailIssue ? <EmptyState>Select an issue to view details.</EmptyState> : (
                        <DetailCard>
                            <DetailHeader>
                                <DetailHeaderTitle>Issue Detail</DetailHeaderTitle>
                                <Row style={{ gap: 10 }}>
                                    <AIButton
                                        isAvailable={aiEnabled && !disableFixWithAi}
                                        title="Fix with AI"
                                        label={
                                            fixContext?.status === 'fixing'
                                                ? 'Fixing…'
                                                : fixContext?.status === 'resolved'
                                                    ? 'Resolved'
                                                    : 'Fix with AI'
                                        }
                                        onClick={() => {
                                            const pathStr = detailIssue.violation.pathSegments?.length ? ` at /${detailIssue.violation.pathSegments.join('/')}` : '';
                                            const llmReportUpdateInstruction = isLlmFinding(detailIssue)
                                                ? `\n\nThis is an LLM-based analysis finding. After fixing the spec, call the #resolveAIFinding tool to update the cached report immediately with:\n- rule: ${JSON.stringify(detailIssue.rule)}\n- pathSegments: ${JSON.stringify(detailIssue.violation.pathSegments || [])}\n- message: ${JSON.stringify(detailIssue.message)}`
                                                : '';
                                            setFixContext({
                                                issue: detailIssue,
                                                status: 'fixing',
                                                baselineRowsFingerprint: rowsFingerprint,
                                            });
                                            onOpenAIChat(
                                                JSON.stringify(detailIssue.violation),
                                                `Fix ${reportName} violation: ${detailIssue.message}${pathStr}${llmReportUpdateInstruction}`
                                            );
                                        }}
                                    />
                                    <DetailHeaderMeta>
                                        {fixContext
                                            ? (fixContext.status === 'resolved'
                                                ? 'Resolved'
                                                : fixContext.status === 'stillPresent'
                                                    ? 'Still present'
                                                    : 'Fixing...')
                                            : `${filteredRows.findIndex((r) => r.id === detailIssue.id) + 1} of ${filteredRows.length}`}
                                    </DetailHeaderMeta>
                                    <CloseDetailBtn onClick={() => { setIsDetailOpen(false); setFixContext(null); }} aria-label="Close issue details">×</CloseDetailBtn>
                                </Row>
                            </DetailHeader>
                            <DetailBody>
                                {fixContext && (
                                    <FixStatusBox $status={fixContext.status}>
                                        <FixStatusTitle>
                                            {fixContext.status === 'resolved'
                                                ? 'Issue resolved'
                                                : fixContext.status === 'stillPresent'
                                                    ? 'Issue still present'
                                                    : 'Applying AI fix'}
                                        </FixStatusTitle>
                                        <FixStatusText>
                                            {fixContext.status === 'resolved'
                                                ? 'This issue is not present in the latest analysis refresh.'
                                                : fixContext.status === 'stillPresent'
                                                    ? 'This issue still appears after refresh. You can try Fix with AI again or review manually.'
                                                    : 'Waiting for the refreshed analysis to confirm the fix status...'}
                                        </FixStatusText>
                                        {fixContext.status !== 'fixing' && (
                                            <FixStatusActions>
                                                <FixStatusActionBtn
                                                    onClick={() => {
                                                        setFixContext(null);
                                                        if (filteredRows.length > 0) {
                                                            setSelectedIssueId(filteredRows[0].id);
                                                        }
                                                    }}
                                                >
                                                    Go to next issue
                                                </FixStatusActionBtn>
                                                <FixStatusActionBtn
                                                    onClick={() => {
                                                        postMessage({
                                                            command: 'navigateTo',
                                                            data: { focusPath: fixContext.issue.violation.pathSegments || [] },
                                                        });
                                                    }}
                                                >
                                                    View fix
                                                </FixStatusActionBtn>
                                            </FixStatusActions>
                                        )}
                                    </FixStatusBox>
                                )}
                                <RuleTitle>{detailIssue.rule}</RuleTitle>
                                <Row><SeverityPill $severity={detailIssue.severity}>{detailIssue.severity}</SeverityPill></Row>
                                <DetailSection><DetailLabel>Message</DetailLabel><MessageBox>{detailIssue.message}</MessageBox></DetailSection>
                                {detailIssue.violation.description && <DetailSection><DetailLabel>Description</DetailLabel><DetailValue>{detailIssue.violation.description}</DetailValue></DetailSection>}
                                {detailIssue.violation.fixSuggestion && <DetailSection><DetailLabel>fixSuggestion</DetailLabel><SuggestionBox>{detailIssue.violation.fixSuggestion}</SuggestionBox></DetailSection>}
                                <DetailSection>
                                    <DetailLabel>Endpoint</DetailLabel>
                                    <EndPointValue style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: 11 }}>
                                        <MethodBadge method={detailIssue.method} />
                                        <span>{detailIssue.endpoint}</span>
                                    </EndPointValue>
                                </DetailSection>
                                <DetailSection><DetailLabel>Path</DetailLabel><DetailValue style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: 11 }}>{detailIssue.path}</DetailValue></DetailSection>
                                <DetailSection>
                                    <DetailLabel>Location</DetailLabel>
                                    <DetailValue style={{ fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: 11 }}>
                                        {detailIssue.line > 0
                                            ? `Line ${detailIssue.line}${detailIssue.violation.range?.end?.line != null && detailIssue.violation.range.end.line + 1 !== detailIssue.line
                                                ? `-${detailIssue.violation.range.end.line + 1}`
                                                : ''
                                            }`
                                            : 'No line info'}
                                    </DetailValue>
                                </DetailSection>
                                {(() => {
                                    const snippetLines = extractSnippetLines(specContent, detailIssue.violation.range);
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
            </ExplorerSurface>
        </SectionShell>
    );
};
