import {
    AiReadinessMetrics,
    AiReadinessSummary,
    AiReadinessBucketSummary,
    AiReadinessCategorySummary,
    AiReadinessViolation,
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

    // Descriptions
    'ai-readiness-api-description': 'descriptions',
    'ai-readiness-operation-description': 'descriptions',
    'ai-readiness-operation-id': 'descriptions',
    'ai-readiness-operation-id-casing': 'descriptions',
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
    'ai-readiness-request-body-example': 'examples',
    'ai-readiness-response-example': 'examples',
    'ai-readiness-schema-example': 'examples',
    'ai-readiness-schema-property-example': 'examples',

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

// Rule counts per bucket — used to proportionally distribute fallback totals
// when a bucket has no custom-function metrics but has a known rule set.
const BUCKET_RULE_COUNTS: Record<string, number> = Object.keys(RULE_CATEGORY_MAP).reduce(
    (acc: Record<string, number>, rule: string) => {
        const bucketKey = RULE_CATEGORY_MAP[rule];
        acc[bucketKey] = (acc[bucketKey] ?? 0) + 1;
        return acc;
    },
    {}
);
const TOTAL_MAPPED_RULES = Object.keys(BUCKET_RULE_COUNTS).reduce(
    (sum: number, k: string) => sum + BUCKET_RULE_COUNTS[k],
    0
);

const computeCoverage = (
    coverageEntry: { total?: number; passed?: number; failed?: number } | undefined,
    fallbackTotal: number,
    missingCount: number
): AiReadinessCategorySummary => {
    if (coverageEntry) {
        const passed = coverageEntry.passed ?? 0;
        // Use the larger of: metric-tracked failures vs actual bucket violations (includes standard-function rules)
        const failed = Math.max(coverageEntry.failed ?? 0, missingCount);
        const total = passed + failed;
        const percentage = total > 0 ? Math.round((passed / total) * 100) : 100;
        return {
            total,
            filled: passed,
            percentage: Math.max(0, Math.min(100, percentage))
        };
    }

    const total = Math.max(0, fallbackTotal);
    const filled = Math.max(0, total - missingCount);
    const percentage = total > 0 ? Math.round((filled / total) * 100) : 100;
    return {
        total,
        filled,
        percentage: Math.max(0, Math.min(100, percentage))
    };
};

type ViolationBucket = {
    violations: AiReadinessViolation[];
    seen: Set<string>;
};

type BucketDefinition = {
    key: string;
    label: string;
    icon: string;
    metricKey: string;
};

const BUCKET_DEFINITIONS: BucketDefinition[] = [
    { key: "summaries",     label: "Summaries",          icon: "list-unordered",  metricKey: "summaries" },
    { key: "descriptions",  label: "Descriptions",        icon: "note",            metricKey: "descriptions" },
    { key: "examples",      label: "Examples",            icon: "symbol-field",    metricKey: "examples" },
    { key: "errors",        label: "Error Responses",     icon: "error",           metricKey: "errorResponses" },
    { key: "typing",        label: "Strict Typing",       icon: "symbol-parameter",metricKey: "typing" },
    { key: "errorSemantics",label: "Error Semantics",     icon: "feedback",        metricKey: "errorSemantics" },
    { key: "headers",       label: "Rate Limit Headers",  icon: "server-process",  metricKey: "headers" },
    { key: "pagination",    label: "Pagination",          icon: "list-flat",       metricKey: "pagination" },
    { key: "security",      label: "Agent Auth",          icon: "shield",          metricKey: "security" },
    { key: "idempotency",   label: "Idempotency",         icon: "sync",            metricKey: "idempotency" },
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

    const totalChecks = governanceResult.totalChecks ||
        (governanceResult.passedChecks || 0) + (governanceResult.failedChecks || 0);

    const cc = governanceResult.aiReadinessMetrics?.categories ?? {};

    const bucketSummaries: AiReadinessBucketSummary[] = BUCKET_DEFINITIONS.map((def) => {
        // Fallback total is proportional to the number of rules in this bucket vs all mapped rules
        const fallbackTotal = TOTAL_MAPPED_RULES > 0
            ? Math.ceil(totalChecks * (BUCKET_RULE_COUNTS[def.key] ?? 0) / TOTAL_MAPPED_RULES)
            : 0;

        const coverage = computeCoverage(
            cc[def.metricKey],
            fallbackTotal,
            buckets[def.key].violations.length
        );
        return {
            key: def.key,
            label: def.label,
            icon: def.icon,
            ...coverage,
            missing: buckets[def.key].violations
        };
    });

    // Average only categories that have actual checks to avoid penalising APIs where a category doesn't apply
    const activeCoverages = bucketSummaries.filter((bucket) => bucket.total > 0);
    const averageCoverage = activeCoverages.length > 0
        ? activeCoverages.reduce((sum, c) => sum + c.percentage, 0) / activeCoverages.length
        : 0;

    const score = Math.round(Math.max(0, Math.min(100, averageCoverage)));

    return {
        score,
        buckets: bucketSummaries,
        validation: allViolations.length > 0 ? { violations: allViolations } : undefined
    };
};
