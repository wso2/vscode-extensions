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

/**
 * Validation error/warning structure
 */
export interface ValidationError {
    path: string[]; // Array of path segments, e.g., ["paths", "/books", "get", "parameters"]
    message: string;
    severity: 'error' | 'warning' | 'info';
    code: string;
    range?: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
}

/**
 * Request to validate API specification (OpenAPI)
 */
export interface ValidateAPISpecRequest {
    filePath: string;
}

/**
 * Response from API specification validation
 */
export interface ValidateAPISpecResponse {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    errorCount: number;
    warningCount: number;
}

/**
 * Spectral ruleset configuration
 * Only these 4 fields are saved to config.yaml
 */
export interface SpectralRuleset {
    name: string;
    sourceFolder: string; // The folder URL/path (e.g., https://github.com/owner/repo/blob/main or /path/to/folder)
    fileName: string; // Just the filename (e.g., ai-readiness.yaml)
    rulesetContentPath: string; // Path within the YAML file to find the ruleset content (e.g., "rulesetContent")
}

/**
 * Request to get governance/validation results for a specific ruleset
 */
export interface GetGovernanceRequest {
    filePath: string;
    name: string; // Name of the governance ruleset
    ruleset?: SpectralRuleset; // Optional: If provided, use this ruleset directly instead of looking up in config
}

export type LlmValidationStatus = 'pending' | 'ready' | 'failed' | 'stale';

export interface LlmValidationFinding {
    id: string;
    rule: string;
    message: string;
    severity: 'error' | 'warn' | 'info' | 'hint';
    pathSegments: string[];
    displayPath: string;
    suggestion?: string;
}

export interface LlmValidationResult {
    score: number;
    summary: string;
    findings: LlmValidationFinding[];
}

export interface LlmValidationState {
    status: LlmValidationStatus;
    apiHash: string;
    updatedAt: number;
    result?: LlmValidationResult;
    error?: string;
}

export interface AiReadinessCoverage {
    total: number;
    passed: number;
    failed: number;
    passedPaths: string[][];
    failedPaths: string[][];
}

export interface AiReadinessMetrics {
    categories: Record<string, AiReadinessCoverage>;
    rules?: Record<string, AiReadinessCoverage>;
}

export interface AiReadinessViolation {
    pathSegments: string[];
    displayPath: string;
    message: string;
}

export interface AiReadinessCategorySummary {
    filled: number;
    total: number;
    percentage: number;
    missing?: AiReadinessViolation[];
}

export interface AiReadinessRuleSummary {
    key: string;
    label: string;
    filled: number;
    total: number;
    percentage: number;
}

export interface AiReadinessBucketSummary extends AiReadinessCategorySummary {
    key: string;
    label: string;
    description?: string;
    icon?: string;
    rules?: AiReadinessRuleSummary[];
}

/** One of four JAIRF-style pillars: pre-scored on the server. */
export interface AiReadinessDimensionSummary {
    key: string;
    label: string;
    description: string;
    icon: string;
    /** 0–100: weighted arithmetic mean of sub-bucket percentages in this dimension */
    score: number;
    /** Weight in the overall weighted harmonic mean (JAIRF-style); all four sum to 1 */
    aggregationWeight: number;
    subBuckets: AiReadinessBucketSummary[];
}

export type AiReadinessAggregation = 'weighted_harmonic_mean';

export interface AiReadinessSummary {
    /**
     * Overall AI readiness 0–100: weighted harmonic mean of {@link AiReadinessDimensionSummary.score},
     * using each dimension’s {@link AiReadinessDimensionSummary.aggregationWeight}.
     */
    score: number;
    aggregation: AiReadinessAggregation;
    dimensions: AiReadinessDimensionSummary[];
    /** Flat list of all sub-buckets (same items nested under dimensions) */
    buckets: AiReadinessBucketSummary[];
    validation?: {
        violations: AiReadinessViolation[];
    };
}

export type GovernanceReportId = 'ai-readiness' | 'owasp' | 'rest-api-readiness';

export interface UnifiedViolation {
    id: string;
    rule: string;
    message: string;
    description?: string;
    fixSuggestion?: string;
    severity: 'error' | 'warn' | 'info' | 'hint';
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
}

export interface UnifiedOverviewMetric {
    id: string;
    label: string;
    value: number | string;
    hint?: string;
    accent?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
}

export interface UnifiedBreakdownCategory {
    id: string;
    label: string;
    description?: string;
    status: 'passed' | 'failed';
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
}

export interface UnifiedAnalyzeReportBase {
    reportId: GovernanceReportId;
    title: string;
    violationsById: Record<string, UnifiedViolation>;
    overview: {
        score: number;
        passedChecks: number;
        totalChecks: number;
        metrics: UnifiedOverviewMetric[];
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
}
export type UnifiedAnalyzeReport = UnifiedAnalyzeReportBase;

export interface GovernanceRulesetMetadata {
    name: string;
    description?: string;
    ruleCategory?: string;
    ruleType?: string;
    artifactType?: string;
    documentationLink?: string;
    provider?: string;
}

export interface GetGovernanceResponse {
    reportId: GovernanceReportId;
    metadata?: GovernanceRulesetMetadata;
    report: UnifiedAnalyzeReport;
    llmValidation?: LlmValidationState;
}

/**
 * Metadata for a ruleset
 */
export interface RulesetMetadata {
    name: string;
    description?: string;
    sourceFolder: string; // The folder this ruleset was fetched from
    fileName: string; // Just the filename
    rulesetContentPath: string;
    enabled: boolean;
    ruleCategory?: string;
    ruleType?: string;
    artifactType?: string;
    documentationLink?: string;
    provider?: string;
}

/**
 * Request to fetch rulesets from a folder URL
 */
export interface FetchRulesetsFromFolderRequest {
    folderUrl: string;
    workspaceUri?: string;
}

/**
 * Response with fetched rulesets
 */
export interface FetchRulesetsFromFolderResponse {
    success: boolean;
    rulesets: RulesetMetadata[];
    message?: string;
    requiresAuth?: boolean;
}

/**
 * Request to get **project-scoped** rulesets for Analyze / governance: reads `.api-platform/config.yaml`
 * beside the API file, or returns built-in defaults. This is unrelated to VS Code global settings.
 */
export interface GetApplicableRulesetsRequest {
    filePath: string; // Path to the OpenAPI specification file
}

/**
 * Rulesets used by governance / AI readiness dashboards for the current API (project config + defaults).
 */
export interface GetApplicableRulesetsResponse {
    governanceRulesets: SpectralRuleset[];
}

/**
 * Request: list Spectral rulesets stored in **VS Code settings** (`apiDesigner.spectral.selectedRulesets`).
 */
export type GetAllSpectralRulesetsRequest = Record<string, never>;

/**
 * All rulesets the user has configured globally (Manage command / settings), including disabled entries.
 */
export interface GetAllSpectralRulesetsResponse {
    rulesets: SpectralRuleset[];
}
