import {
    AiReadinessMetrics,
    AiReadinessSummary,
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

const buildMissingList = (
    coverageEntry: { failedPaths?: (string | number)[][] } | undefined,
    fallbackList: AiReadinessViolation[],
    lookup: Map<string, AiReadinessViolation>
): AiReadinessViolation[] => {
    if (!coverageEntry?.failedPaths || coverageEntry.failedPaths.length === 0) {
        return fallbackList;
    }

    return coverageEntry.failedPaths
        .map((pathSegments) => {
            const normalized = pathSegments.map((segment) => String(segment));
            const key = normalized.join("|");
            if (lookup.has(key)) {
                return lookup.get(key)!;
            }
            return {
                pathSegments: normalized,
                displayPath: normalized.join(" > "),
                message: "Missing required content"
            };
        });
};

const computeCoverage = (
    coverageEntry: { total?: number; passed?: number; failed?: number } | undefined,
    fallbackTotal: number,
    missingCount: number
): AiReadinessCategorySummary => {
    if (coverageEntry) {
        const total = Math.max(
            coverageEntry.total ?? 0,
            (coverageEntry.passed ?? 0) + (coverageEntry.failed ?? 0)
        );
        const passed = Math.min(total, coverageEntry.passed ?? 0);
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

export const buildAiReadinessSummary = (governanceResult: GetGovernanceResponse): AiReadinessSummary => {
    const allViolations: AiReadinessViolation[] = [];

    const summaryViolations: AiReadinessViolation[] = [];
    const summarySeen = new Set<string>();
    const summaryLookup = new Map<string, AiReadinessViolation>();

    const descriptionViolations: AiReadinessViolation[] = [];
    const descriptionSeen = new Set<string>();
    const descriptionLookup = new Map<string, AiReadinessViolation>();

    const exampleViolations: AiReadinessViolation[] = [];
    const examplesSeen = new Set<string>();
    const examplesLookup = new Map<string, AiReadinessViolation>();

    const errorResponseViolations: AiReadinessViolation[] = [];
    const errorsSeen = new Set<string>();
    const errorsLookup = new Map<string, AiReadinessViolation>();

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
        const message = violation.message || 'Missing information';

        const code = violation.code || violation.rule || '';
        const normalizedMessage = violation.message?.toLowerCase() || '';
        const isSummaryViolation = code.includes('summary') || normalizedMessage.includes('summary');
        const isDescriptionViolation = code.includes('description') || normalizedMessage.includes('description');
        const isExamplesViolation = code.includes('example') || normalizedMessage.includes('example');
        const isErrorResponseViolation = code.includes('response') || normalizedMessage.includes('response');

        const key = rawSegments.join('|');
        const normalizedViolation: AiReadinessViolation = { pathSegments: rawSegments, displayPath, message };
        allViolations.push(normalizedViolation);

        if (isSummaryViolation && !summarySeen.has(key)) {
            summarySeen.add(key);
            summaryViolations.push(normalizedViolation);
            summaryLookup.set(key, normalizedViolation);
        }
        if (isDescriptionViolation && !descriptionSeen.has(key)) {
            descriptionSeen.add(key);
            descriptionViolations.push(normalizedViolation);
            descriptionLookup.set(key, normalizedViolation);
        }
        if (isExamplesViolation && !examplesSeen.has(key)) {
            examplesSeen.add(key);
            exampleViolations.push(normalizedViolation);
            examplesLookup.set(key, normalizedViolation);
        }
        if (isErrorResponseViolation && !errorsSeen.has(key)) {
            errorsSeen.add(key);
            errorResponseViolations.push(normalizedViolation);
            errorsLookup.set(key, normalizedViolation);
        }
    });

    const passedChecks = governanceResult.passedChecks || 0;
    const failedChecks = governanceResult.failedChecks || 0;
    const totalChecks = governanceResult.totalChecks || (passedChecks + failedChecks);

    const fallbackSummaryTotal = Math.ceil(totalChecks * 0.25);
    const fallbackDescriptionTotal = Math.ceil(totalChecks * 0.25);
    const fallbackExampleTotal = Math.ceil(totalChecks * 0.25);
    const fallbackErrorTotal = totalChecks - fallbackSummaryTotal - fallbackDescriptionTotal - fallbackExampleTotal;

    const coverageCategories = governanceResult.aiReadinessMetrics?.categories ?? {};

    const summaryCoverage = computeCoverage(
        coverageCategories.summaries,
        fallbackSummaryTotal,
        summaryViolations.length
    );
    const descriptionCoverage = computeCoverage(
        coverageCategories.descriptions,
        fallbackDescriptionTotal,
        descriptionViolations.length
    );
    const exampleCoverage = computeCoverage(
        coverageCategories.examples,
        fallbackExampleTotal,
        exampleViolations.length
    );
    const errorCoverage = computeCoverage(
        coverageCategories.errorResponses,
        fallbackErrorTotal,
        errorResponseViolations.length
    );

    const summaryMissing = buildMissingList(coverageCategories.summaries, summaryViolations, summaryLookup);
    const descriptionMissing = buildMissingList(coverageCategories.descriptions, descriptionViolations, descriptionLookup);
    const exampleMissing = buildMissingList(coverageCategories.examples, exampleViolations, examplesLookup);
    const errorMissing = buildMissingList(coverageCategories.errorResponses, errorResponseViolations, errorsLookup);

    const averageCoverage = (
        summaryCoverage.percentage
        + descriptionCoverage.percentage
        + exampleCoverage.percentage
        + errorCoverage.percentage
    ) / 4;

    const score = typeof governanceResult.score === 'number'
        ? Math.max(0, Math.min(100, Math.round(governanceResult.score)))
        : Math.round(Math.max(0, Math.min(100, averageCoverage)));

    return {
        score,
        summariesComplete: {
            ...summaryCoverage,
            missing: summaryMissing
        },
        descriptionsComplete: {
            ...descriptionCoverage,
            missing: descriptionMissing
        },
        schemasWithExamples: {
            ...exampleCoverage,
            missing: exampleMissing
        },
        errorResponsesDefined: {
            ...errorCoverage,
            missing: errorMissing
        },
        validation: allViolations.length > 0 ? { violations: allViolations } : undefined
    };
};
