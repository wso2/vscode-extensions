import { SpectralRuleset } from '@wso2/api-designer-core';
import { NormalizedGovernanceViolation } from '../../../types/violations';
import { AnalyzeReportKey, extractOwaspReference } from '../hooks/useReport';

/** Shared Analyze report typography scale. */
export const ANALYZE_TYPE_SCALE = {
    xs: '10px',
    sm: '11px',
    md: '12px',
    base: '13px',
    lg: '15px',
    xl: '20px',
    metric: '18px',
    score: '36px'
} as const;

const METHOD_COLORS: Record<string, { color: string; bg: string }> = {
    GET: { color: 'var(--vscode-editorInfo-foreground, #3b82f6)', bg: 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #3b82f6) 14%, transparent)' },
    POST: { color: 'var(--vscode-testing-iconPassed, #22c55e)', bg: 'color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 14%, transparent)' },
    PUT: { color: 'var(--vscode-editorWarning-foreground)', bg: 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 14%, transparent)' },
    PATCH: { color: '#a78bfa', bg: 'color-mix(in srgb, #a78bfa 14%, transparent)' },
    DELETE: { color: 'var(--vscode-errorForeground)', bg: 'color-mix(in srgb, var(--vscode-errorForeground) 14%, transparent)' },
};

export const getMethodStyle = (method: string) =>
    METHOD_COLORS[method] ?? { color: 'var(--vscode-descriptionForeground)', bg: 'color-mix(in srgb, var(--vscode-descriptionForeground) 12%, transparent)' };

export const buildRulesetFileUrl = (ruleset?: SpectralRuleset): string | undefined => {
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

export const extractSnippetLines = (content: string, range?: NormalizedGovernanceViolation['range']) => {
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
