import {
    AiReadinessMetrics,
    AiReadinessSummary,
    AiReadinessBucketSummary,
    AiReadinessCategorySummary,
    AiReadinessViolation,
    AiReadinessRuleSummary,
    GetGovernanceResponse
} from "../rpc-types/api-designer-visualizer/types";

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
    icon: string;
    metricKey: string;
    weight: number;
};

const BUCKET_DEFINITIONS: BucketDefinition[] = [
    { key: "summaries",      label: "Summaries",           icon: "list-unordered",   metricKey: "summaries",      weight: 1.2 },
    { key: "descriptions",   label: "Descriptions",        icon: "note",             metricKey: "descriptions",   weight: 1.0 },
    { key: "operationIds",   label: "Operation IDs",       icon: "symbol-method",    metricKey: "operationIds",   weight: 1.3 },
    { key: "examples",       label: "Examples",            icon: "symbol-field",     metricKey: "examples",       weight: 1.0 },
    { key: "errors",         label: "Responses",           icon: "error",            metricKey: "errorResponses", weight: 1.25 },
    { key: "typing",         label: "Strict Typing",       icon: "symbol-parameter", metricKey: "typing",         weight: 1.1 },
    { key: "errorSemantics", label: "Error Semantics",     icon: "feedback",         metricKey: "errorSemantics", weight: 1.35 },
    { key: "headers",        label: "Rate Limit Headers",  icon: "server-process",   metricKey: "headers",        weight: 1.15 },
    { key: "pagination",     label: "Pagination",          icon: "list-flat",        metricKey: "pagination",     weight: 1.1 },
    { key: "security",       label: "Agent Auth",          icon: "shield",           metricKey: "security",       weight: 1.5 },
    { key: "idempotency",    label: "Idempotency",         icon: "sync",             metricKey: "idempotency",    weight: 1.4 },
];

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

export const buildAiReadinessSummary = (governanceResult: GetGovernanceResponse): AiReadinessSummary => {
    const allViolations: AiReadinessViolation[] = [];

    const buckets: Record<string, ViolationBucket> = BUCKET_DEFINITIONS.reduce((acc, def) => {
        acc[def.key] = makeBucket();
        return acc;
    }, {} as Record<string, ViolationBucket>);

    const violationEntries = governanceResult.violations ?? [];
    violationEntries.forEach((violation) => {
        const rawSegments = Array.isArray(violation.path)
            ? violation.path.map((segment) => String(segment))
            : typeof violation.path === "string"
                ? violation.path.split('>').map((segment: string) => segment.trim()).filter(Boolean)
                : [];

        const displayPath = rawSegments.length > 0
            ? rawSegments.join(' > ')
            : (Array.isArray(violation.path) ? violation.path.join(' > ') : (violation.path || 'Unknown path'));

        const ruleCode = (violation.rule || violation.code || '').toLowerCase();
        const key = `${ruleCode}|${rawSegments.join('|')}`;
        const v: AiReadinessViolation = { pathSegments: rawSegments, displayPath, message: violation.message || 'Missing information' };
        allViolations.push(v);

        const bucketKey = RULE_CATEGORY_MAP[ruleCode];
        if (bucketKey && buckets[bucketKey]) {
            addToBucket(buckets[bucketKey], key, v);
        }
    });

    const rc = governanceResult.aiReadinessMetrics?.rules ?? {};

    // Per-rule violation counts (for coverage fallback)
    const ruleViolationCounts = new Map<string, number>();
    violationEntries.forEach((violation) => {
        const ruleCode = (violation.rule || violation.code || '').toLowerCase();
        ruleViolationCounts.set(ruleCode, (ruleViolationCounts.get(ruleCode) ?? 0) + 1);
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
            icon: def.icon,
            total,
            filled,
            percentage: Math.max(0, Math.min(100, percentage)),
            missing: buckets[def.key].violations,
            rules,
        };
    });

    const weighted = BUCKET_DEFINITIONS.reduce(
        (acc, def) => {
            const bucket = bucketSummaries.find((b) => b.key === def.key);
            if (!bucket || bucket.total <= 0) return acc;
            return {
                weightedSum: acc.weightedSum + (bucket.percentage * def.weight),
                totalWeight: acc.totalWeight + def.weight,
            };
        },
        { weightedSum: 0, totalWeight: 0 }
    );
    const score = weighted.totalWeight > 0
        ? Math.round(Math.max(0, Math.min(100, weighted.weightedSum / weighted.totalWeight)))
        : 0;

    return {
        score,
        buckets: bucketSummaries,
        validation: allViolations.length > 0 ? { violations: allViolations } : undefined
    };
};
