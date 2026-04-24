import { SpectralRuleset } from '@wso2/api-designer-core';
import { NormalizedGovernanceViolation } from '../../../types/violations';
import { AnalyzeReportKey, extractOwaspReference } from '../hooks/useReport';

export const REPORT_TITLES: Record<AnalyzeReportKey, string> = {
    'ai-readiness': 'AI Readiness Report',
    owasp: 'OWASP Security Report',
    'wso2-rest': 'WSO2 REST API Guidelines Report',
};

export const BREAKDOWN_TITLES: Record<AnalyzeReportKey, string> = {
    'ai-readiness': 'AI Readiness Breakdown',
    owasp: 'OWASP Breakdown',
    'wso2-rest': 'WSO2 REST Guidelines Breakdown',
};

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

export interface AITopBucket {
    key: string;
    label: string;
    description: string;
    whyItMatters: string;
    icon: string;
    subBuckets: string[];
}

export const AI_READINESS_TOP_BUCKETS: AITopBucket[] = [
    {
        key: 'discovery',
        label: 'Semantic Discovery',
        description: 'Can AI agents find the right endpoint and understand its intent?',
        whyItMatters: 'AI agents rely on summaries, descriptions, and stable operation identifiers to select the right tool for a task. Without them, agents must infer behavior through trial and error, leading to incorrect calls and hallucinated responses.',
        icon: 'search',
        subBuckets: ['summaries', 'descriptions', 'operationIds'],
    },
    {
        key: 'contract',
        label: 'Contract Integrity',
        description: 'Can AI agents construct valid requests and interpret responses without guessing?',
        whyItMatters: 'Agents generate payloads based on schemas and examples. Ambiguous types, missing required fields, or absent examples cause agents to produce invalid requests or misinterpret response data.',
        icon: 'symbol-interface',
        subBuckets: ['examples', 'typing', 'errors'],
    },
    {
        key: 'resilience',
        label: 'Resilience & Recovery',
        description: 'Can AI agents handle failures, rate limits, and large datasets gracefully?',
        whyItMatters: 'Autonomous agents operate without human supervision. Structured error schemas let agents self-correct, rate limit headers prevent hammering, and pagination metadata tells agents when to stop iterating.',
        icon: 'refresh',
        subBuckets: ['errorSemantics', 'headers', 'pagination'],
    },
    {
        key: 'security',
        label: 'Security & Integrity',
        description: 'Is the API safe for autonomous agent access over the long term?',
        whyItMatters: 'Agents cannot complete interactive browser-based OAuth flows. Undefined security requirements risk agents making unintended state changes. Idempotency support prevents duplicate side-effects when agents retry operations.',
        icon: 'shield',
        subBuckets: ['security', 'idempotency'],
    },
];

export const AI_READINESS_SUB_BUCKET_WEIGHTS: Record<string, number> = {
    summaries: 1.2,
    descriptions: 1.0,
    operationIds: 1.3,
    examples: 1.0,
    typing: 1.1,
    errors: 1.25,
    errorSemantics: 1.35,
    headers: 1.15,
    pagination: 1.1,
    security: 1.5,
    idempotency: 1.4,
};

const SUBBUCKET_RULE_MAP: Record<string, string[]> = {
    summaries: [
        'ai-readiness-operation-summary',
        'ai-readiness-callback-operation-summary',
        'ai-readiness-webhook-operation-summary',
        'ai-readiness-path-item-summary',
    ],
    descriptions: [
        'ai-readiness-api-description',
        'ai-readiness-server-description',
        'ai-readiness-path-item-description',
        'ai-readiness-operation-description',
        'ai-readiness-operation-tags',
        'ai-readiness-parameter-description',
        'ai-readiness-parameter-description-length',
        'ai-readiness-request-body-description',
        'ai-readiness-response-description',
        'ai-readiness-error-response-description-length',
        'ai-readiness-schema-description',
        'ai-readiness-schema-description-length',
        'ai-readiness-schema-title',
        'ai-readiness-schema-property-description',
        'ai-readiness-schema-enum-description',
        'ai-readiness-tags-description',
        'ai-readiness-tags-external-docs',
        'ai-readiness-deprecation-notice',
    ],
    operationIds: [
        'ai-readiness-operation-id',
        'ai-readiness-operation-id-casing',
        'ai-readiness-operation-id-unique',
    ],
    examples: [
        'ai-readiness-parameter-example',
        'ai-readiness-path-parameter-example',
        'ai-readiness-parameter-content-example',
        'ai-readiness-path-parameter-content-example',
        'ai-readiness-request-body-example',
        'ai-readiness-response-example',
        'ai-readiness-response-header-example',
        'ai-readiness-schema-example',
        'ai-readiness-schema-property-example',
        'ai-readiness-component-header-example',
    ],
    typing: [
        'ai-readiness-request-body-schema-typed',
        'ai-readiness-request-body-schema-required',
        'ai-readiness-response-schema-typed',
        'ai-readiness-schema-property-type',
        'ai-readiness-parameter-schema-type',
        'ai-readiness-schema-string-format',
        'ai-readiness-schema-no-empty-object',
        'ai-readiness-schema-property-no-empty-object',
        'ai-readiness-array-items-defined',
        'ai-readiness-array-property-items-defined',
        'ai-readiness-schema-validation-constraints',
        'ai-readiness-discriminator',
    ],
    errors: [
        'ai-readiness-success-response',
        'ai-readiness-success-response-content',
        'ai-readiness-success-response-json-schema',
        'ai-readiness-error-responses-4xx',
        'ai-readiness-error-responses-5xx',
        'ai-readiness-error-response-content',
        'ai-readiness-error-response-json-schema',
        'ai-readiness-response-content-type',
        'ai-readiness-error-response-schema',
    ],
    errorSemantics: [
        'ai-readiness-error-schema-fields',
        'ai-readiness-error-schema-rfc7807',
        'ai-readiness-error-schema-details',
        'ai-readiness-error-schema-actionable',
    ],
    headers: ['ai-readiness-429-rate-limit-headers'],
    pagination: [
        'ai-readiness-list-pagination-params',
        'ai-readiness-pagination-response-meta',
    ],
    security: [
        'ai-readiness-api-contact',
        'ai-readiness-no-interactive-auth',
        'ai-readiness-security-defined',
        'ai-readiness-security-description',
        'ai-readiness-security-on-mutating-ops',
    ],
    idempotency: ['ai-readiness-idempotency-key'],
};

const RULE_TO_SUBBUCKET: Record<string, string> = Object.entries(SUBBUCKET_RULE_MAP).reduce<Record<string, string>>(
    (acc, [bucket, rules]) => {
        rules.forEach((rule) => { acc[rule] = bucket; });
        return acc;
    },
    {},
);

export const getRuleSubBucket = (rule: string): string | null => RULE_TO_SUBBUCKET[rule] ?? null;

export const formatRuleLabel = (rule: string): string => {
    const stripped = rule.replace(/^ai-readiness-/, '').replace(/-/g, ' ');
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
};
