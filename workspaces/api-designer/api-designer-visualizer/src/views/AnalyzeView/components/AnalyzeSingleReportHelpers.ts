import { SpectralRuleset } from '@wso2/api-designer-core';
import { NormalizedGovernanceViolation } from '../../../types/violations';
import { AnalyzeReportKey, extractOwaspReference } from '../hooks/useReport';

export const REPORT_TITLES: Record<AnalyzeReportKey, string> = {
    'ai-readiness': 'AI Readiness Report',
    owasp: 'OWASP Security Report',
    'rest-api-readiness': 'WSO2 REST API Guidelines Report',
};

export const BREAKDOWN_TITLES: Record<AnalyzeReportKey, string> = {
    'ai-readiness': 'AI Readiness Breakdown',
    owasp: 'Security (OWASP) Breakdown',
    'rest-api-readiness': 'REST Compliance Breakdown',
};

export const BREAKDOWN_SUBTITLES: Record<AnalyzeReportKey, string> = {
    'ai-readiness': 'Evaluate how well your API is prepared for AI agent consumption',
    owasp: 'Coverage across the OWASP API Security Top 10 (2023)',
    'rest-api-readiness': 'Compliance with WSO2 REST API design guidelines',
};

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

export const OWASP_CATEGORIES = [
    { id: 'API1:2023', key: 'API1', name: 'Broken Object Level Authorization', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/' },
    { id: 'API2:2023', key: 'API2', name: 'Broken Authentication', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/' },
    { id: 'API3:2023', key: 'API3', name: 'Broken Object Property Level Authorization', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/' },
    { id: 'API4:2023', key: 'API4', name: 'Unrestricted Resource Consumption', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/' },
    { id: 'API5:2023', key: 'API5', name: 'Broken Function Level Authorization', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/' },
    { id: 'API6:2023', key: 'API6', name: 'Unrestricted Access to Sensitive Business Flows', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/' },
    { id: 'API7:2023', key: 'API7', name: 'Server Side Request Forgery', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa7-server-side-request-forgery/' },
    { id: 'API8:2023', key: 'API8', name: 'Security Misconfiguration', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/' },
    { id: 'API9:2023', key: 'API9', name: 'Improper Inventory Management', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/' },
    { id: 'API10:2023', key: 'API10', name: 'Unsafe Consumption of APIs', docsUrl: 'https://owasp.org/API-Security/editions/2023/en/0xaa-unsafe-consumption-of-apis/' },
];

export type Wso2ThemeDef = {
    id: string;
    title: string;
    description: string;
    keywords: string[];
};

export const WSO2_THEMES: Wso2ThemeDef[] = [
    {
        id: 'resource-design',
        title: 'Resource Design',
        description: 'How clear and predictable resource paths and REST nouns are.',
        keywords: ['resource', 'path', 'uri', 'url', 'noun', 'plural', 'hierarchy']
    },
    {
        id: 'operations-methods',
        title: 'Operations & Methods',
        description: 'Whether HTTP methods and operation shapes follow REST semantics.',
        keywords: ['method', 'http', 'operation', 'get', 'post', 'put', 'patch', 'delete', 'idempotent']
    },
    {
        id: 'contracts-responses',
        title: 'Contracts & Responses',
        description: 'Consistency of status codes, response models, and payload contracts.',
        keywords: ['response', 'status', 'schema', 'contract', 'payload', 'content-type', 'example']
    },
    {
        id: 'documentation',
        title: 'Documentation Quality',
        description: 'How usable the API is from summaries, descriptions, and examples.',
        keywords: ['summary', 'description', 'document', 'docs', 'example', 'title', 'operationid']
    },
    {
        id: 'security-governance',
        title: 'Security & Governance',
        description: 'Authentication, authorization, and governance controls for safe APIs.',
        keywords: ['security', 'auth', 'oauth', 'scope', 'token', 'header', 'https', 'tls']
    },
    {
        id: 'versioning-lifecycle',
        title: 'Versioning & Lifecycle',
        description: 'Version strategy and lifecycle clarity for consumers.',
        keywords: ['version', 'deprecated', 'sunset', 'lifecycle', 'compatibility']
    }
];

export const pickWso2Theme = (rule: string, message: string): Wso2ThemeDef => {
    const haystack = `${rule} ${message}`.toLowerCase();
    let bestTheme = WSO2_THEMES[0];
    let bestScore = 0;
    WSO2_THEMES.forEach((theme) => {
        const score = theme.keywords.reduce((sum, keyword) => sum + (haystack.includes(keyword) ? 1 : 0), 0);
        if (score > bestScore) {
            bestScore = score;
            bestTheme = theme;
        }
    });
    return bestScore > 0 ? bestTheme : WSO2_THEMES[0];
};

const METHOD_COLORS: Record<string, { color: string; bg: string }> = {
    GET: { color: 'var(--vscode-editorInfo-foreground, #3b82f6)', bg: 'color-mix(in srgb, var(--vscode-editorInfo-foreground, #3b82f6) 14%, transparent)' },
    POST: { color: 'var(--vscode-testing-iconPassed, #22c55e)', bg: 'color-mix(in srgb, var(--vscode-testing-iconPassed, #22c55e) 14%, transparent)' },
    PUT: { color: 'var(--vscode-editorWarning-foreground)', bg: 'color-mix(in srgb, var(--vscode-editorWarning-foreground) 14%, transparent)' },
    PATCH: { color: '#a78bfa', bg: 'color-mix(in srgb, #a78bfa 14%, transparent)' },
    DELETE: { color: 'var(--vscode-errorForeground)', bg: 'color-mix(in srgb, var(--vscode-errorForeground) 14%, transparent)' },
};

export const getMethodStyle = (method: string) =>
    METHOD_COLORS[method] ?? { color: 'var(--vscode-descriptionForeground)', bg: 'color-mix(in srgb, var(--vscode-descriptionForeground) 12%, transparent)' };

export const getRuleBucket = (rule: string, reportKey: AnalyzeReportKey): { id: string; name: string } => {
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

export const getReferenceTag = (rule: string, reportKey: AnalyzeReportKey): string | null => {
    if (reportKey === 'owasp') return extractOwaspReference(rule);
    const bucket = getRuleBucket(rule, reportKey);
    return bucket.id || null;
};

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
