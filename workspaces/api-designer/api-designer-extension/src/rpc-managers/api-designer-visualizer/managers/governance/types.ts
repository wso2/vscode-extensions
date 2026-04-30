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

import type { SpectralRuleset } from "@wso2/api-designer-core";

export type GovernanceReportId = "ai-readiness" | "owasp" | "rest-api-readiness";

export type SpectralGovernancePayload = {
    violations?: Array<{
        rule: string;
        code?: string;
        message: string;
        description?: string;
        fixSuggestion?: string;
        severity: string;
        path?: string[] | string;
        range?: {
            start: { line: number; character: number };
            end: { line: number; character: number };
        };
    }>;
    score?: number;
    passedChecks?: number;
    totalChecks?: number;
    passedRules?: Array<{ rule?: string }>;
    breakdown?: {
        score?: number;
        dimensions?: Array<{
            key: string;
            label: string;
            description?: string;
            score: number;
            subBuckets: Array<{
                key: string;
                label: string;
                description?: string;
                percentage: number;
                rules?: Array<{ key: string }>;
            }>;
        }>;
    };
};

export type GovernanceRulesetMetadata = {
    name: string;
    description?: string;
    ruleCategory?: string;
    ruleType?: string;
    artifactType?: string;
    documentationLink?: string;
    provider?: string;
};

export type UnifiedViolation = {
    id: string;
    rule: string;
    message: string;
    description?: string;
    fixSuggestion?: string;
    severity: "error" | "warn" | "info" | "hint";
    code?: string;
    pathSegments: string[];
    displayPath: string;
    endpoint: string;
    method: string;
    line: number;
    range?: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
    breakdownKeys: string[];
};

export type UnifiedBreakdownCategory = {
    id: string;
    label: string;
    description?: string;
    status: "passed" | "failed";
    total: number;
    errors: number;
    warnings: number;
    infos: number;
    percentage: number;
    affectedEndpoints: number;
    docsUrl?: string;
    viewIssuesFilter: {
        key: string;
        label: string;
    };
    subBuckets: Array<{
        id: string;
        label: string;
        description?: string;
        percentage: number;
        viewIssuesFilter: {
            key: string;
            label: string;
        };
    }>;
    topRules?: string[];
};

export type LlmValidationFinding = {
    id: string;
    rule: string;
    message: string;
    severity: "error" | "warn" | "info" | "hint";
    pathSegments: string[];
    displayPath: string;
    suggestion?: string;
};

export type LlmValidationResult = {
    score: number;
    summary: string;
    findings: LlmValidationFinding[];
};

export type LlmValidationState = {
    status: "pending" | "ready" | "failed" | "stale";
    apiHash: string;
    updatedAt: number;
    result?: LlmValidationResult;
    error?: string;
};

export type LlmExecutionResult = {
    result: LlmValidationResult;
    modelId: string;
};

export type ReportIssue = {
    id: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    rule: string;
    path: string;
    issue: string;
    description: string;
    fixSuggestion: string;
    autoFixable: boolean;
};

export type ResolveAIFindingRequest = {
    rule: string;
    pathSegments?: string[];
    message?: string;
};

export type BuiltUnifiedReport = {
    schemaVersion: "1";
    reportId: GovernanceReportId;
    title: string;
    violationsById: Record<string, UnifiedViolation>;
    overview: {
        score: number;
        passedChecks: number;
        totalChecks: number;
        metrics: Array<{ id: string; label: string; value: number | string; hint?: string; accent?: "success" | "error" | "warning" | "info" | "neutral" }>;
    };
    breakdown: {
        title: string;
        subtitle?: string;
        categories: UnifiedBreakdownCategory[];
    };
    issueExplorer: {
        title?: string;
        subtitle?: string;
        breakdownFilterOptions: Array<{ key: string; label: string }>;
    };
    llmReview?: {
        title?: string;
        subtitle?: string;
        viewFindingsLabel?: string;
        reevaluateLabel?: string;
    };
};

export type RulesetInsight = {
    metadata: GovernanceRulesetMetadata;
    owaspCategoryKeys?: string[];
};

export type GovernanceManagerDeps = {
    ruleset?: SpectralRuleset;
};
