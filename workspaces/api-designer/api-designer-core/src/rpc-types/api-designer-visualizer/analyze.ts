/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
 * Request to validate API specification (OpenAPI or AsyncAPI)
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

export interface AiReadinessCoverage {
    total: number;
    passed: number;
    failed: number;
    passedPaths: string[][];
    failedPaths: string[][];
}

export interface AiReadinessMetrics {
    categories: Record<string, AiReadinessCoverage>;
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

export interface AiReadinessBucketSummary extends AiReadinessCategorySummary {
    key: string;
    label: string;
    icon?: string;
}

export interface AiReadinessSummary {
    score: number;
    buckets: AiReadinessBucketSummary[];
    validation?: {
        violations: AiReadinessViolation[];
    };
}

/**
 * Response with governance/validation results
 */
export interface GetGovernanceResponse {
    score: number;
    passedChecks: number;
    failedChecks: number;
    totalChecks: number;
    violationSummary?: {
        totalViolations: number;
        errorRules: number;
        warningRules: number;
        infoRules: number;
        hintRules: number;
        errorViolations?: number;
        warningViolations?: number;
        infoViolations?: number;
        hintViolations?: number;
    };
    violations: Array<{
        rule: string;
        message: string;
        description?: string;
        severity: string;
        path?: string[] | string;
        code?: string;
        range?: {
            start: { line: number; character: number };
            end: { line: number; character: number };
        };
    }>;
    passed?: Array<{
        rule: string;
        message: string;
        description?: string;
        fixSuggestion?: string;
        severity: string;
    }>;
    aiReadinessMetrics?: AiReadinessMetrics;
    aiReadinessSummary?: AiReadinessSummary;
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
    aiReadinessRuleset: SpectralRuleset | null;
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
