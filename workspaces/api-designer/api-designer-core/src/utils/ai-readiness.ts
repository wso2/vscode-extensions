import {
    AiReadinessMetrics,
    AiReadinessSummary,
    AiReadinessBucketSummary,
    AiReadinessCategorySummary,
    AiReadinessViolation,
    AiReadinessRuleSummary,
    AiReadinessDimensionSummary,
    type UnifiedViolation,
} from "../rpc-types/api-designer-visualizer/types";

/**
 * Build {@link UnifiedViolation} map from raw Spectral lint results.
 * Use this before {@link buildAiReadinessSummary} so the summary only consumes unified `violationsById`.
 */
export function spectralViolationsToUnifiedById(
    violations: Array<{
        rule: string;
        code?: string;
        message: string;
        path?: string[] | string;
        description?: string;
        fixSuggestion?: string;
        severity: string;
        range?: {
            start: { line: number; character: number };
            end: { line: number; character: number };
        };
    }>,
): Record<string, UnifiedViolation> {
    const normalizePath = (path?: string[] | string): string[] => {
        if (Array.isArray(path)) {
            return path.map((segment) => String(segment));
        }
        if (typeof path === "string") {
            return path.split(">").map((s) => s.trim()).filter(Boolean);
        }
        return [];
    };

    const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

    const extractEndpoint = (pathSegments: string[]): { endpoint: string; method: string } => {
        const pathsIndex = pathSegments.indexOf("paths");
        if (pathsIndex >= 0) {
            const endpoint = pathSegments[pathsIndex + 1] || "global";
            const methodRaw = pathSegments[pathsIndex + 2] || "";
            const method = HTTP_METHODS.indexOf(methodRaw) >= 0 ? methodRaw.toUpperCase() : "GLOBAL";
            return { endpoint, method };
        }
        return { endpoint: "global", method: "GLOBAL" };
    };

    const out: Record<string, UnifiedViolation> = {};
    violations.forEach((v, index) => {
        const pathSegments = normalizePath(v.path);
        const displayPath = pathSegments.length > 0 ? pathSegments.join(" > ") : "Unknown path";
        const { endpoint, method } = extractEndpoint(pathSegments);
        const id = `${v.rule || v.code || "unknown"}:${index}`;
        const normalizedSeverity: UnifiedViolation["severity"] =
            v.severity === "error" || v.severity === "warn" || v.severity === "hint" || v.severity === "info"
                ? v.severity
                : "info";
        out[id] = {
            id,
            rule: v.rule || v.code || "unknown-rule",
            message: v.message || "No message provided",
            description: v.description,
            fixSuggestion: v.fixSuggestion,
            severity: normalizedSeverity,
            code: v.code,
            pathSegments,
            displayPath,
            endpoint,
            method,
            line: (v.range?.start.line ?? -1) + 1,
            range: v.range,
            breakdownKeys: [],
        };
    });
    return out;
}

export type BuildAiReadinessSummaryInput = {
    report: { violationsById: Record<string, UnifiedViolation> };
    aiReadinessMetrics?: AiReadinessMetrics | null;
};

export const computeReadinessScoreFromMetrics = (
    metrics?: AiReadinessMetrics | null
): number | null => {
    if (!metrics || !metrics.categories) {
        return null;
    }

    let totalPassed = 0;
    let totalChecks = 0;

    const categories = metrics.categories as Record<string, { total: number; passed?: number; failed?: number }>;
    for (const key in categories) {
        if (!Object.prototype.hasOwnProperty.call(categories, key)) {
            continue;
        }

        const entry = categories[key];
        if (!entry || typeof entry.total !== "number" || entry.total <= 0) {
            continue;
        }

        const passed = typeof entry.passed === "number"
            ? entry.passed
            : entry.total - (entry.failed ?? 0);

        totalPassed += Math.max(0, passed);
        totalChecks += entry.total;
    }

    if (totalChecks === 0) {
        return null;
    }

    const percentage = (totalPassed / totalChecks) * 100;
    return Math.round(Math.max(0, Math.min(100, percentage)));
};

// Explicit mapping from rule name to bucket key.
// Each rule maps to exactly one bucket; no string-matching heuristics.
const RULE_CATEGORY_MAP: Record<string, string> = {
    // Summaries
    'ai-readiness-operation-summary': 'summaries',
    'ai-readiness-callback-operation-summary': 'summaries',
    'ai-readiness-webhook-operation-summary': 'summaries',
    'ai-readiness-path-item-summary': 'summaries',

    // Descriptions
    'ai-readiness-api-description': 'descriptions',
    'ai-readiness-server-description': 'descriptions',
    'ai-readiness-path-item-description': 'descriptions',
    'ai-readiness-operation-description': 'descriptions',
    'ai-readiness-operation-id': 'operationIds',
    'ai-readiness-operation-id-casing': 'operationIds',
    'ai-readiness-operation-id-unique': 'operationIds',
    'ai-readiness-operation-tags': 'descriptions',
    'ai-readiness-parameter-description': 'descriptions',
    'ai-readiness-parameter-description-length': 'descriptions',
    'ai-readiness-request-body-description': 'descriptions',
    'ai-readiness-response-description': 'descriptions',
    'ai-readiness-error-response-description-length': 'descriptions',
    'ai-readiness-schema-description': 'descriptions',
    'ai-readiness-schema-description-length': 'descriptions',
    'ai-readiness-schema-title': 'descriptions',
    'ai-readiness-schema-property-description': 'descriptions',
    'ai-readiness-schema-enum-description': 'descriptions',
    'ai-readiness-tags-description': 'descriptions',
    'ai-readiness-tags-external-docs': 'descriptions',
    'ai-readiness-deprecation-notice': 'descriptions',

    // Examples
    'ai-readiness-parameter-example': 'examples',
    'ai-readiness-path-parameter-example': 'examples',
    'ai-readiness-parameter-content-example': 'examples',
    'ai-readiness-path-parameter-content-example': 'examples',
    'ai-readiness-request-body-example': 'examples',
    'ai-readiness-response-example': 'examples',
    'ai-readiness-response-header-example': 'examples',
    'ai-readiness-schema-example': 'examples',
    'ai-readiness-schema-property-example': 'examples',
    'ai-readiness-component-header-example': 'examples',

    // Error Responses
    'ai-readiness-success-response': 'errors',
    'ai-readiness-success-response-content': 'errors',
    'ai-readiness-success-response-json-schema': 'errors',
    'ai-readiness-error-responses-4xx': 'errors',
    'ai-readiness-error-responses-5xx': 'errors',
    'ai-readiness-error-response-content': 'errors',
    'ai-readiness-error-response-json-schema': 'errors',
    'ai-readiness-response-content-type': 'errors',
    'ai-readiness-error-response-schema': 'errors',

    // Typing
    'ai-readiness-request-body-schema-typed': 'typing',
    'ai-readiness-request-body-schema-required': 'typing',
    'ai-readiness-response-schema-typed': 'typing',
    'ai-readiness-schema-property-type': 'typing',
    'ai-readiness-parameter-schema-type': 'typing',
    'ai-readiness-schema-string-format': 'typing',
    'ai-readiness-schema-no-empty-object': 'typing',
    'ai-readiness-schema-property-no-empty-object': 'typing',
    'ai-readiness-array-items-defined': 'typing',
    'ai-readiness-array-property-items-defined': 'typing',
    'ai-readiness-schema-validation-constraints': 'typing',
    'ai-readiness-discriminator': 'typing',

    // Error Semantics
    'ai-readiness-error-schema-fields': 'errorSemantics',
    'ai-readiness-error-schema-rfc7807': 'errorSemantics',
    'ai-readiness-error-schema-details': 'errorSemantics',
    'ai-readiness-error-schema-actionable': 'errorSemantics',

    // Headers
    'ai-readiness-429-rate-limit-headers': 'headers',

    // Pagination
    'ai-readiness-list-pagination-params': 'pagination',
    'ai-readiness-pagination-response-meta': 'pagination',

    // Security
    'ai-readiness-api-contact': 'security',
    'ai-readiness-no-interactive-auth': 'security',
    'ai-readiness-security-defined': 'security',
    'ai-readiness-security-description': 'security',
    'ai-readiness-security-on-mutating-ops': 'security',

    // Idempotency
    'ai-readiness-idempotency-key': 'idempotency',
};

// Rule counts per bucket
const BUCKET_RULE_COUNTS: Record<string, number> = Object.keys(RULE_CATEGORY_MAP).reduce(
    (acc: Record<string, number>, rule: string) => {
        const bucketKey = RULE_CATEGORY_MAP[rule];
        acc[bucketKey] = (acc[bucketKey] ?? 0) + 1;
        return acc;
    },
    {}
);
type ViolationBucket = {
    violations: AiReadinessViolation[];
    seen: Set<string>;
};

type BucketDefinition = {
    key: string;
    label: string;
    description: string;
    icon: string;
    metricKey: string;
    weight: number;
};

const BUCKET_DEFINITIONS: BucketDefinition[] = [
    { key: "summaries",      label: "Summaries",           description: "Clear operation summaries help agents pick the right endpoint quickly.", icon: "list-unordered",   metricKey: "summaries",      weight: 1.2 },
    { key: "descriptions",   label: "Descriptions",        description: "Detailed descriptions reduce ambiguity in agent execution flows.", icon: "note",             metricKey: "descriptions",   weight: 1.0 },
    { key: "operationIds",   label: "Operation IDs",       description: "Stable operation IDs improve deterministic tool calling for agents.", icon: "symbol-method",    metricKey: "operationIds",   weight: 1.3 },
    { key: "examples",       label: "Examples",            description: "Request and response examples help agents construct valid payloads.", icon: "symbol-field",     metricKey: "examples",       weight: 1.0 },
    { key: "errors",         label: "Responses",           description: "Defined success and error responses help agents interpret outcomes correctly and avoid invalid request/response handling.", icon: "error",            metricKey: "errorResponses", weight: 1.25 },
    { key: "typing",         label: "Strict Typing",       description: "Strong typing keeps agent-generated requests aligned with schema constraints.", icon: "symbol-parameter", metricKey: "typing",         weight: 1.1 },
    { key: "errorSemantics", label: "Error Semantics",     description: "Consistent status semantics let agents reason about failures correctly.", icon: "feedback",         metricKey: "errorSemantics", weight: 1.35 },
    { key: "headers",        label: "Rate Limit Headers",  description: "Rate limit and retry headers prevent unsafe autonomous request bursts.", icon: "server-process",   metricKey: "headers",        weight: 1.15 },
    { key: "pagination",     label: "Pagination",          description: "Pagination metadata helps agents iterate large datasets safely.", icon: "list-flat",        metricKey: "pagination",     weight: 1.1 },
    { key: "security",       label: "Agent Auth",          description: "Explicit security requirements reduce risk in autonomous access.", icon: "shield",           metricKey: "security",       weight: 1.5 },
    { key: "idempotency",    label: "Idempotency",         description: "Idempotency protection avoids duplicate side effects on retries.", icon: "sync",             metricKey: "idempotency",    weight: 1.4 },
];

/** Weights for combining sub-bucket percentages inside one dimension (arithmetic mean). */
const SUB_BUCKET_WEIGHTS: Record<string, number> = BUCKET_DEFINITIONS.reduce(
    (acc: Record<string, number>, def) => {
        acc[def.key] = def.weight;
        return acc;
    },
    {}
);

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

const RULE_TO_SUBBUCKET: Record<string, string> = {};
for (const subKey of Object.keys(SUBBUCKET_RULE_MAP)) {
    const rules = SUBBUCKET_RULE_MAP[subKey];
    for (let i = 0; i < rules.length; i++) {
        RULE_TO_SUBBUCKET[rules[i]] = subKey;
    }
}

/** Maps a Spectral rule id to an AI-readiness sub-bucket key (for issue grouping in the UI). */
export const getAiReadinessRuleSubBucket = (rule: string): string | null => {
    const normalized = (rule || '').toLowerCase();
    return RULE_TO_SUBBUCKET[normalized] ?? null;
};

export const formatAiReadinessRuleLabel = (rule: string): string => {
    const stripped = rule.replace(/^ai-readiness-/i, '').replace(/-/g, ' ');
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
};

type DimensionDefinition = {
    key: string;
    label: string;
    description: string;
    whyItMatters: string;
    icon: string;
    subBucketKeys: string[];
    /** Weight in overall weighted harmonic mean (JAIRF-style); four dimensions sum to 1 */
    aggregationWeight: number;
};

const AI_READINESS_DIMENSIONS: DimensionDefinition[] = [
    {
        key: 'discovery',
        label: 'Semantic Discovery',
        description: 'Can AI agents find the right endpoint and understand its intent?',
        whyItMatters:
            'AI agents rely on summaries, descriptions, and stable operation identifiers to select the right tool for a task. Without them, agents must infer behavior through trial and error, leading to incorrect calls and hallucinated responses.',
        icon: 'search',
        subBucketKeys: ['summaries', 'descriptions', 'operationIds'],
        aggregationWeight: 0.26,
    },
    {
        key: 'contract',
        label: 'Contract Integrity',
        description: 'Can AI agents construct valid requests and interpret responses without guessing?',
        whyItMatters:
            'Agents generate payloads based on schemas and examples. Ambiguous types, missing required fields, or absent examples cause agents to produce invalid requests or misinterpret response data.',
        icon: 'symbol-interface',
        subBucketKeys: ['examples', 'typing', 'errors'],
        aggregationWeight: 0.26,
    },
    {
        key: 'resilience',
        label: 'Resilience & Recovery',
        description: 'Can AI agents handle failures, rate limits, and large datasets gracefully?',
        whyItMatters:
            'Autonomous agents operate without human supervision. Structured error schemas let agents self-correct, rate limit headers prevent hammering, and pagination metadata tells agents when to stop iterating.',
        icon: 'refresh',
        subBucketKeys: ['errorSemantics', 'headers', 'pagination'],
        aggregationWeight: 0.24,
    },
    {
        key: 'security',
        label: 'Security & Integrity',
        description: 'Is the API safe for autonomous agent access over the long term?',
        whyItMatters:
            'Agents cannot complete interactive browser-based OAuth flows. Undefined security requirements risk agents making unintended state changes. Idempotency support prevents duplicate side-effects when agents retry operations.',
        icon: 'shield',
        subBucketKeys: ['security', 'idempotency'],
        aggregationWeight: 0.24,
    },
];

const HARMONIC_EPS = 1e-6;

function weightedHarmonicMean(items: Array<{ value: number; weight: number }>): number {
    let sumW = 0;
    let denom = 0;
    for (const { value, weight } of items) {
        if (weight <= 0) continue;
        sumW += weight;
        denom += weight / Math.max(HARMONIC_EPS, value + HARMONIC_EPS);
    }
    if (sumW <= 0 || denom <= 0) return 0;
    return Math.min(100, Math.max(0, sumW / denom));
}

function dimensionScoreFromSubBuckets(subs: AiReadinessBucketSummary[]): number {
    const active = subs.filter((s) => s.total > 0);
    if (active.length === 0) {
        return 100;
    }
    let weightedSum = 0;
    let totalWeight = 0;
    for (const b of active) {
        const w = SUB_BUCKET_WEIGHTS[b.key] ?? 1;
        weightedSum += b.percentage * w;
        totalWeight += w;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

const makeBucket = (): ViolationBucket => ({
    violations: [],
    seen: new Set()
});

const addToBucket = (bucket: ViolationBucket, key: string, v: AiReadinessViolation): void => {
    if (!bucket.seen.has(key)) {
        bucket.seen.add(key);
        bucket.violations.push(v);
    }
};

export const buildAiReadinessSummary = (input: BuildAiReadinessSummaryInput): AiReadinessSummary => {
    const allViolations: AiReadinessViolation[] = [];

    const buckets: Record<string, ViolationBucket> = BUCKET_DEFINITIONS.reduce((acc, def) => {
        acc[def.key] = makeBucket();
        return acc;
    }, {} as Record<string, ViolationBucket>);

    const violationEntries = Object.keys(input.report.violationsById).map(
        (k) => input.report.violationsById[k],
    );
    violationEntries.forEach((violation: UnifiedViolation) => {
        const ruleCode = (violation.rule || violation.code || "").toLowerCase();
        const key = `${ruleCode}|${violation.pathSegments.join("|")}`;
        const v: AiReadinessViolation = {
            pathSegments: violation.pathSegments,
            displayPath: violation.displayPath,
            message: violation.message || "Missing information",
        };
        allViolations.push(v);

        const bucketKey = RULE_CATEGORY_MAP[ruleCode];
        if (bucketKey && buckets[bucketKey]) {
            addToBucket(buckets[bucketKey], key, v);
        }
    });

    const internalMetrics = input.aiReadinessMetrics;
    const rc = internalMetrics?.rules ?? {};

    // Per-rule violation counts (for coverage fallback)
    const ruleViolationCounts = new Map<string, number>();
    violationEntries.forEach((violation: UnifiedViolation) => {
        const rcKey = (violation.rule || violation.code || "").toLowerCase();
        ruleViolationCounts.set(rcKey, (ruleViolationCounts.get(rcKey) ?? 0) + 1);
    });

    const bucketSummaries: AiReadinessBucketSummary[] = BUCKET_DEFINITIONS.map((def) => {
        const rulesInBucket = Object.keys(RULE_CATEGORY_MAP).filter(r => RULE_CATEGORY_MAP[r] === def.key);

        const rules: AiReadinessRuleSummary[] = rulesInBucket
            .map((ruleKey) => {
                const ruleMetric = rc[ruleKey];
                const ruleViolationCount = ruleViolationCounts.get(ruleKey) ?? 0;
                const failedByMetric = (ruleMetric?.failed ?? 0) > 0;
                const failedByViolation = ruleViolationCount > 0;
                const failed = failedByMetric || failedByViolation;
                const ruleCoverage: AiReadinessCategorySummary = {
                    total: 1,
                    filled: failed ? 0 : 1,
                    percentage: failed ? 0 : 100,
                };

                const label = ruleKey
                    .replace(/^ai-readiness-/, '')
                    .replace(/-/g, ' ')
                    .replace(/^\w/, (c) => c.toUpperCase());
                return { key: ruleKey, label, ...ruleCoverage } as AiReadinessRuleSummary;
            })
            .filter((r): r is AiReadinessRuleSummary => r !== null);

        const total = rulesInBucket.length || (BUCKET_RULE_COUNTS[def.key] ?? 0);
        const filled = rules.reduce((sum, rule) => sum + (rule.filled > 0 ? 1 : 0), 0);
        const percentage = total > 0 ? Math.round((filled / total) * 100) : 100;

        return {
            key: def.key,
            label: def.label,
            description: def.description,
            icon: def.icon,
            total,
            filled,
            percentage: Math.max(0, Math.min(100, percentage)),
            missing: buckets[def.key].violations,
            rules,
        };
    });

    const bucketByKey = new Map(bucketSummaries.map((b) => [b.key, b]));

    const dimensions: AiReadinessDimensionSummary[] = AI_READINESS_DIMENSIONS.map((dim) => {
        const subBuckets = dim.subBucketKeys
            .map((k) => bucketByKey.get(k))
            .filter((b): b is AiReadinessBucketSummary => !!b);
        const rawScore = dimensionScoreFromSubBuckets(subBuckets);
        const score = Math.round(Math.max(0, Math.min(100, rawScore)));
        return {
            key: dim.key,
            label: dim.label,
            description: dim.description,
            whyItMatters: dim.whyItMatters,
            icon: dim.icon,
            score,
            aggregationWeight: dim.aggregationWeight,
            subBuckets,
        };
    });

    const harmonicInputs = dimensions.map((d) => ({ value: d.score, weight: d.aggregationWeight }));
    const score = Math.round(weightedHarmonicMean(harmonicInputs));

    return {
        score,
        aggregation: 'weighted_harmonic_mean' as const,
        dimensions,
        buckets: bucketSummaries,
        validation: allViolations.length > 0 ? { violations: allViolations } : undefined
    };
};
