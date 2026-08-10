/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import type { BuiltUnifiedReport, GovernanceReportId, SpectralGovernancePayload, UnifiedBreakdownCategory, UnifiedViolation } from "./types";
import {
    AI_READINESS_BUCKET_DEFINITIONS,
    AI_READINESS_BUCKET_RULE_MAP,
    AI_READINESS_BUCKET_WEIGHTS,
    AI_READINESS_DIMENSIONS,
    AI_READINESS_RULE_CATEGORY_MAP,
    OWASP_DIMENSIONS,
    OWASP_DIMENSION_WEIGHTS,
    REPORT_BREAKDOWN_META,
    REPORT_TITLE_BY_ID,
    REST_API_READINESS_BUCKET_WEIGHTS,
    REST_API_READINESS_DIMENSIONS,
    REST_API_READINESS_RULE_CATEGORY_MAP,
} from "./rule-constants";

type ReportSubBucket = {
    key: string;
    label: string;
    description?: string;
    percentage?: number;
};

type ReportDimension = {
    key: string;
    label: string;
    description?: string;
    icon?: string;
    docsUrl?: string;
    aggregationWeight: number;
    subBucketKeys: readonly string[];
    score?: number;
    subBuckets?: ReportSubBucket[];
};

const inferReportKey = (name: string): GovernanceReportId => {
    const lower = (name || "").toLowerCase();
    if (lower.includes("ai") && lower.includes("readiness")) return "ai-readiness";
    if (lower.includes("owasp") || lower.includes("security")) return "owasp";
    return "rest-api-readiness";
};

const normalizePath = (path?: string[] | string): string[] => {
    if (Array.isArray(path)) return path.map((segment) => String(segment));
    if (typeof path === "string") return path.split(">").map((segment) => segment.trim()).filter(Boolean);
    return [];
};

const extractEndpoint = (pathSegments: string[]): { endpoint: string; method: string } => {
    const pathsIndex = pathSegments.indexOf("paths");
    if (pathsIndex >= 0) {
        const endpoint = pathSegments[pathsIndex + 1] || "global";
        const methodRaw = pathSegments[pathsIndex + 2] || "";
        const method = ["get", "post", "put", "patch", "delete", "head", "options", "trace"].includes(methodRaw)
            ? methodRaw.toUpperCase()
            : "GLOBAL";
        return { endpoint, method };
    }
    return { endpoint: "global", method: "GLOBAL" };
};

const normalizeRuleId = (rule: string): string => (rule || "").trim().toLowerCase();

const deriveOwaspCategoryKeyFromRule = (rule: string): string => {
    const raw = (rule || "").toUpperCase().match(/API\d+(?::\d{4})?/)?.[0] || "GENERAL";
    return raw.includes(":") ? raw : `${raw}:2023`;
};

const pickRestThemeKey = (rule: string): string => {
    const normalizedRule = normalizeRuleId(rule);
    return REST_API_READINESS_RULE_CATEGORY_MAP[normalizedRule] || "other";
};

const getBucketKeyForRule = (reportId: GovernanceReportId, rule: string): string => {
    if (reportId === "owasp") {
        return deriveOwaspCategoryKeyFromRule(rule);
    }
    if (reportId === "rest-api-readiness") {
        return pickRestThemeKey(rule);
    }
    return "";
};

const calculateCategoryScore = (counts: { total: number; errors: number; warnings: number; infos: number }): number => {
    if (counts.total <= 0) return 100;
    const weightedFailures = counts.errors * 1 + counts.warnings * 0.5 + counts.infos * 0.25;
    const score = 100 - (weightedFailures / counts.total) * 100;
    return Math.max(0, Math.min(100, Math.round(score)));
};

const AI_SEVERITY_PENALTY: Record<"error" | "warn" | "info" | "hint", number> = {
    error: 1,
    warn: 0.6,
    info: 0.3,
    hint: 0.15,
};

const computeAiBucketScore = (
    rulesInBucket: string[],
    rulePenaltyByRule: Map<string, number>
): number => {
    const totalRules = rulesInBucket.length;
    if (totalRules <= 0) return 100;
    const bucketPenalty = rulesInBucket.reduce((sum, ruleId) => {
        const normalized = normalizeRuleId(ruleId);
        return sum + (rulePenaltyByRule.get(normalized) || 0);
    }, 0);
    return Math.max(0, Math.min(100, ((totalRules - bucketPenalty) / totalRules) * 100));
};


export const computeWeightedScore = (
    reportId: GovernanceReportId,
    response: SpectralGovernancePayload
): number => {
    if (reportId === "ai-readiness") {
        const rulePenaltyByRule = new Map<string, number>();
        (response.violations || []).forEach((violation) => {
            const ruleId = normalizeRuleId(violation.rule || violation.code || "");
            if (!ruleId) return;
            const severity = (violation.severity === "error" || violation.severity === "warn" || violation.severity === "info" || violation.severity === "hint")
                ? violation.severity
                : "info";
            const penalty = AI_SEVERITY_PENALTY[severity];
            const currentPenalty = rulePenaltyByRule.get(ruleId) || 0;
            if (penalty > currentPenalty) {
                rulePenaltyByRule.set(ruleId, penalty);
            }
        });
        let weightedSum = 0;
        let totalWeight = 0;
        Object.entries(AI_READINESS_BUCKET_RULE_MAP).forEach(([bucketKey, rulesInBucket]) => {
            const bucketScore = computeAiBucketScore(rulesInBucket, rulePenaltyByRule);
            const weight = AI_READINESS_BUCKET_WEIGHTS[bucketKey] ?? 1;
            weightedSum += bucketScore * weight;
            totalWeight += weight;
        });
        if (totalWeight > 0) {
            return Math.max(0, Math.min(100, Math.round(weightedSum / totalWeight)));
        }
        const aiWeightedScore = response.breakdown?.score;
        if (typeof aiWeightedScore === "number" && Number.isFinite(aiWeightedScore)) {
            return Math.max(0, Math.min(100, Math.round(aiWeightedScore)));
        }
        return Math.max(0, Math.min(100, Math.round(response.score ?? 0)));
    }

    const allRules = new Set<string>();
    const rulePenaltyByRule = new Map<string, number>();
    (response.violations || []).forEach((violation) => {
        const ruleId = normalizeRuleId(violation.rule || violation.code || "");
        if (!ruleId) return;
        allRules.add(ruleId);
        const severity = (violation.severity === "error" || violation.severity === "warn" || violation.severity === "info" || violation.severity === "hint")
            ? violation.severity
            : "info";
        const penalty = AI_SEVERITY_PENALTY[severity];
        const currentPenalty = rulePenaltyByRule.get(ruleId) || 0;
        if (penalty > currentPenalty) {
            rulePenaltyByRule.set(ruleId, penalty);
        }
    });
    (response.passedRules || []).forEach((entry) => {
        const ruleId = normalizeRuleId(entry.rule || "");
        if (!ruleId) return;
        allRules.add(ruleId);
    });
    if (allRules.size === 0) {
        return Math.max(0, Math.min(100, Math.round(response.score ?? 0)));
    }

    const bucketStats = new Map<string, { total: number; penalty: number }>();
    const ensureBucket = (key: string): { total: number; penalty: number } => {
        let stats = bucketStats.get(key);
        if (!stats) {
            stats = { total: 0, penalty: 0 };
            bucketStats.set(key, stats);
        }
        return stats;
    };
    allRules.forEach((ruleId) => {
        const bucketKey = reportId === "owasp" ? deriveOwaspCategoryKeyFromRule(ruleId) : pickRestThemeKey(ruleId);
        const bucket = ensureBucket(bucketKey);
        bucket.total += 1;
        bucket.penalty += rulePenaltyByRule.get(ruleId) || 0;
    });

    let weightedSum = 0;
    let totalWeight = 0;
    bucketStats.forEach((stats, bucketKey) => {
        if (stats.total <= 0) return;
        const bucketScore = ((stats.total - stats.penalty) / stats.total) * 100;
        const weight = reportId === "owasp"
            ? (OWASP_DIMENSION_WEIGHTS[bucketKey.toLowerCase()] || 1)
            : (REST_API_READINESS_BUCKET_WEIGHTS[bucketKey] || 1);
        weightedSum += bucketScore * weight;
        totalWeight += weight;
    });
    if (totalWeight <= 0) {
        return Math.max(0, Math.min(100, Math.round(response.score ?? 0)));
    }
    return Math.max(0, Math.min(100, Math.round(weightedSum / totalWeight)));
};

export const buildUnifiedReport = (
    name: string,
    response: SpectralGovernancePayload
): BuiltUnifiedReport => {
    const reportId = inferReportKey(name);
    const aiBucketMetaByKey = new Map(
        AI_READINESS_BUCKET_DEFINITIONS.map((bucket) => [bucket.key, { label: bucket.label, description: bucket.description }])
    );
    const configuredDimensions: ReportDimension[] =
        reportId === "ai-readiness"
            ? ((response.breakdown?.dimensions && response.breakdown.dimensions.length > 0
                ? response.breakdown.dimensions
                : AI_READINESS_DIMENSIONS.map((dimension) => ({
                    key: dimension.key,
                    label: dimension.label,
                    description: dimension.description,
                    score: undefined,
                    subBuckets: (dimension.subBucketKeys || []).map((subBucketKey) => ({
                        key: subBucketKey,
                        label: aiBucketMetaByKey.get(subBucketKey)?.label || subBucketKey,
                        description: aiBucketMetaByKey.get(subBucketKey)?.description,
                        percentage: undefined,
                    })),
                })))
                .map((dimension) => ({
                    key: dimension.key,
                    label: dimension.label,
                    description: dimension.description,
                    icon: undefined,
                    docsUrl: undefined,
                    aggregationWeight: 1,
                    subBucketKeys: (dimension.subBuckets || []).map((subBucket) => subBucket.key),
                    score: dimension.score,
                    subBuckets: (dimension.subBuckets || []).map((subBucket) => ({
                        key: subBucket.key,
                        label: subBucket.label,
                        description: subBucket.description,
                        percentage: subBucket.percentage,
                    })),
                })))
            : (reportId === "owasp" ? OWASP_DIMENSIONS : REST_API_READINESS_DIMENSIONS).map((dimension) => ({
                key: dimension.key,
                label: dimension.label,
                description: dimension.description,
                icon: dimension.icon,
                docsUrl: "docsUrl" in dimension ? String((dimension as { docsUrl?: string }).docsUrl || "") || undefined : undefined,
                aggregationWeight: dimension.aggregationWeight,
                subBucketKeys: dimension.subBucketKeys,
            }));

    const subBucketToDimension = new Map<string, string>();
    const dimensionMetaByKey = new Map<string, { label: string; description?: string; docsUrl?: string }>();
    configuredDimensions.forEach((dimension) => {
        dimensionMetaByKey.set(dimension.key, {
            label: dimension.label,
            description: dimension.description,
            docsUrl: "docsUrl" in dimension ? String((dimension as { docsUrl?: string }).docsUrl || "") || undefined : undefined,
        });
        (dimension.subBucketKeys || []).forEach((subBucketKey) => subBucketToDimension.set(subBucketKey, dimension.key));
    });

    const computedScore = computeWeightedScore(reportId, response);
    const rawViolations = response.violations || [];
    const violationsById: Record<string, UnifiedViolation> = {};
    const aiRulePenaltyByRule = new Map<string, number>();
    const rulePenaltyByRule = new Map<string, number>();
    const failedRulesByBucket = new Map<string, Set<string>>();
    const allRulesByBucket = new Map<string, Set<string>>();
    const categoryBuckets = new Map<string, { label: string; description?: string; docsUrl?: string; violationIds: string[] }>();

    const ensureRuleBucket = (bucketKey: string): { failed: Set<string>; all: Set<string> } => {
        let failed = failedRulesByBucket.get(bucketKey);
        if (!failed) {
            failed = new Set<string>();
            failedRulesByBucket.set(bucketKey, failed);
        }
        let all = allRulesByBucket.get(bucketKey);
        if (!all) {
            all = new Set<string>();
            allRulesByBucket.set(bucketKey, all);
        }
        return { failed, all };
    };

    rawViolations.forEach((violation, index) => {
        const pathSegments = normalizePath(violation.path);
        const displayPath = pathSegments.length > 0 ? pathSegments.join(" > ") : "Unknown path";
        const { endpoint, method } = extractEndpoint(pathSegments);
        const id = `${violation.rule || violation.code || "unknown"}:${index}`;
        const normalizedSeverity = (violation.severity === "error" || violation.severity === "warn" || violation.severity === "hint" || violation.severity === "info")
            ? violation.severity
            : "info";

        const normalizedRule = normalizeRuleId(violation.rule || violation.code || "");
        const bucketKeyForRule = getBucketKeyForRule(reportId, normalizedRule);
        if (bucketKeyForRule && normalizedRule) {
            const bucket = ensureRuleBucket(bucketKeyForRule);
            bucket.failed.add(normalizedRule);
            bucket.all.add(normalizedRule);
        }
        if (reportId === "ai-readiness" && normalizedRule) {
            const penalty = AI_SEVERITY_PENALTY[normalizedSeverity];
            const currentPenalty = aiRulePenaltyByRule.get(normalizedRule) || 0;
            if (penalty > currentPenalty) {
                aiRulePenaltyByRule.set(normalizedRule, penalty);
            }
        }
        if (normalizedRule) {
            const penalty = AI_SEVERITY_PENALTY[normalizedSeverity];
            const currentPenalty = rulePenaltyByRule.get(normalizedRule) || 0;
            if (penalty > currentPenalty) {
                rulePenaltyByRule.set(normalizedRule, penalty);
            }
        }
        const normalizedOwaspKey = (() => {
            const raw = (violation.rule || violation.code || "").toLowerCase().match(/api\d+(?::\d{4})?/)?.[0];
            if (!raw) return "";
            return raw.includes(":") ? raw : `${raw}:2023`;
        })();
        const mappedSubBucketByRuleMap =
            reportId === "ai-readiness"
                ? AI_READINESS_RULE_CATEGORY_MAP[normalizedRule]
                : reportId === "owasp"
                    ? normalizedOwaspKey
                    : REST_API_READINESS_RULE_CATEGORY_MAP[normalizedRule];
        const subBucketKey = mappedSubBucketByRuleMap || undefined;
        const dimensionKey = subBucketKey ? subBucketToDimension.get(subBucketKey) : undefined;
        if (dimensionKey && !categoryBuckets.has(dimensionKey)) {
            const meta = dimensionMetaByKey.get(dimensionKey);
            categoryBuckets.set(dimensionKey, {
                label: meta?.label || dimensionKey,
                description: meta?.description,
                docsUrl: meta?.docsUrl,
                violationIds: [],
            });
        }
        if (dimensionKey) {
            categoryBuckets.get(dimensionKey)?.violationIds.push(id);
        }

        violationsById[id] = {
            id,
            rule: violation.rule || violation.code || "unknown-rule",
            message: violation.message || "No message provided",
            description: violation.description,
            fixSuggestion: violation.fixSuggestion,
            severity: normalizedSeverity,
            code: violation.code,
            pathSegments,
            displayPath,
            endpoint,
            method,
            line: ((violation.range?.start.line ?? -1) + 1),
            range: violation.range,
            breakdownKeys: [dimensionKey, subBucketKey].filter((key): key is string => !!key),
        };
    });
    (response.passedRules || []).forEach((passed) => {
        const normalizedRule = normalizeRuleId(passed.rule || "");
        if (!normalizedRule) return;
        const bucketKeyForRule = getBucketKeyForRule(reportId, normalizedRule);
        if (!bucketKeyForRule) return;
        const bucket = ensureRuleBucket(bucketKeyForRule);
        bucket.all.add(normalizedRule);
    });

    const countFromIds = (ids: string[]) => ({
        total: ids.length,
        errors: ids.filter((id) => violationsById[id]?.severity === "error").length,
        warnings: ids.filter((id) => violationsById[id]?.severity === "warn").length,
        infos: ids.filter((id) => {
            const severity = violationsById[id]?.severity;
            return severity === "info" || severity === "hint";
        }).length,
    });
    const affectedEndpoints = (ids: string[]) => new Set(
        ids
            .map((id) => violationsById[id])
            .filter((violation) => violation && violation.endpoint !== "global" && violation.method !== "GLOBAL")
            .map((violation) => `${violation.method} ${violation.endpoint}`)
    ).size;

    const categories = configuredDimensions
        .filter((dimension) => {
            if (reportId === "owasp") {
                const dimensionBucketKey = dimension.key.toUpperCase();
                return allRulesByBucket.has(dimensionBucketKey) || failedRulesByBucket.has(dimensionBucketKey);
            }
            if (reportId === "rest-api-readiness" && dimension.key === "other") {
                return allRulesByBucket.has("other") || failedRulesByBucket.has("other");
            }
            return true;
        })
        .map((dimension) => {
            const ids = categoryBuckets.get(dimension.key)?.violationIds || [];
            const counts = countFromIds(ids);
            const categoryPercentage = reportId === "ai-readiness"
                ? Math.max(0, Math.min(100, Math.round(
                    typeof dimension.score === "number"
                        ? dimension.score
                        : (() => {
                            const aiSubBuckets = (dimension.subBuckets || []).map((subBucket) => {
                                const rulesInBucket = AI_READINESS_BUCKET_RULE_MAP[subBucket.key] || [];
                                const percentage = computeAiBucketScore(rulesInBucket, aiRulePenaltyByRule);
                                return {
                                    key: subBucket.key,
                                    percentage,
                                    weight: AI_READINESS_BUCKET_WEIGHTS[subBucket.key] ?? 1,
                                };
                            });
                            const totalWeight = aiSubBuckets.reduce((sum, subBucket) => sum + subBucket.weight, 0);
                            if (totalWeight <= 0) return 100;
                            const weighted = aiSubBuckets.reduce((sum, subBucket) => sum + (subBucket.percentage * subBucket.weight), 0);
                            return weighted / totalWeight;
                        })()
                )))
                : (() => {
                    const normalizedBucketKey = reportId === "owasp" ? dimension.key.toUpperCase() : dimension.key;
                    const ruleSet = allRulesByBucket.get(normalizedBucketKey);
                    const totalRules = ruleSet?.size || 0;
                    if (totalRules > 0) {
                        const bucketPenalty = Array.from(ruleSet || []).reduce(
                            (sum, ruleId) => sum + (rulePenaltyByRule.get(ruleId) || 0),
                            0
                        );
                        return Math.max(0, Math.min(100, Math.round(((totalRules - bucketPenalty) / totalRules) * 100)));
                    }
                    return calculateCategoryScore(counts);
                })();
            const subBuckets =
                reportId === "ai-readiness"
                    ? (dimension.subBuckets || []).map((subBucket) => ({
                        ...(function () {
                            const rulesInBucket = AI_READINESS_BUCKET_RULE_MAP[subBucket.key] || [];
                            const fallbackPercentage = Math.round(computeAiBucketScore(rulesInBucket, aiRulePenaltyByRule));
                            return { fallbackPercentage };
                        })(),
                        id: subBucket.key,
                        label: subBucket.label,
                        description: subBucket.description,
                        percentage: Math.max(0, Math.min(100, Math.round(
                            typeof subBucket.percentage === "number"
                                ? subBucket.percentage
                                : (function () {
                                    const rulesInBucket = AI_READINESS_BUCKET_RULE_MAP[subBucket.key] || [];
                                    return computeAiBucketScore(rulesInBucket, aiRulePenaltyByRule);
                                })()
                        ))),
                        viewIssuesFilter: { key: subBucket.key, label: subBucket.label },
                    }))
                    : (dimension.subBucketKeys || []).map((subBucketKey) => ({
                        id: subBucketKey,
                        label: dimension.label,
                        description: dimension.description,
                        percentage: categoryPercentage,
                        viewIssuesFilter: { key: subBucketKey, label: dimension.label },
                    }));
            const ruleCounts = new Map<string, number>();
            ids.forEach((id) => {
                const rule = violationsById[id]?.rule || "";
                if (!rule) return;
                ruleCounts.set(rule, (ruleCounts.get(rule) || 0) + 1);
            });
            return {
                id: dimension.key,
                label: dimension.label,
                description: dimension.description,
                status: (counts.total > 0 ? "failed" : "passed"),
                total: counts.total,
                errors: counts.errors,
                warnings: counts.warnings,
                infos: counts.infos,
                percentage: categoryPercentage,
                affectedEndpoints: affectedEndpoints(ids),
                docsUrl: "docsUrl" in dimension ? String((dimension as { docsUrl?: string }).docsUrl || "") || undefined : undefined,
                viewIssuesFilter: { key: dimension.key, label: dimension.label },
                subBuckets,
                ...(reportId === "rest-api-readiness"
                    ? { topRules: Array.from(ruleCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([rule]) => rule) }
                    : {}),
            } as UnifiedBreakdownCategory;
        });
    const endpointCount = new Set(
        Object.values(violationsById)
            .filter((v) => v.endpoint !== "global" && v.method !== "GLOBAL")
            .map((v) => `${v.method}:${v.endpoint}`)
    ).size;
    const errors = Object.values(violationsById).filter((v) => v.severity === "error").length;
    const warnings = Object.values(violationsById).filter((v) => v.severity === "warn").length;
    const infos = Object.values(violationsById).filter((v) => v.severity === "info" || v.severity === "hint").length;

    return {
        schemaVersion: "1",
        reportId,
        title: REPORT_TITLE_BY_ID[reportId],
        violationsById,
        overview: {
            score: computedScore,
            passedChecks: response.passedChecks ?? 0,
            totalChecks: response.totalChecks ?? 0,
            metrics: [
                { id: "errors", label: "Errors", value: errors, accent: "error" },
                { id: "warnings", label: "Warnings", value: warnings, accent: "warning" },
                { id: "info", label: "Info", value: infos, accent: "info" },
                { id: "operations", label: "Operations affected", value: endpointCount, accent: "info" },
            ],
        },
        breakdown: {
            title: REPORT_BREAKDOWN_META[reportId].title,
            subtitle: REPORT_BREAKDOWN_META[reportId].subtitle,
            categories,
        },
        issueExplorer: {
            title: "Issue Explorer",
            subtitle: "Browse, filter and inspect all violations in detail",
            breakdownFilterOptions: categories.map((category) => ({
                key: category.viewIssuesFilter.key,
                label: category.viewIssuesFilter.label,
            })),
        },
        ...(reportId === "ai-readiness" ? {
            llmReview: {
                title: "AI Analysis",
                subtitle: "AI-powered evaluation to uncover agent-readiness gaps and recommend prioritized fixes.",
                viewFindingsLabel: "View AI findings",
                reevaluateLabel: "Re-run analysis",
            },
        } : {}),
    };
};
