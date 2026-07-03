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
 * Represents a single security issue context.
 */
export interface ScannerIssueContext {
    location?: {
        filePath: string;
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
        startOffset?: number;
        length?: number;
    };
    rule?: {
        id: string;
        numericId?: number;
        description?: string;
        ruleKind: "VULNERABILITY" | "CODE_SMELL" | string;
    };
    ruleId?: string;
    message: string;
    ruleKind?: "VULNERABILITY" | "CODE_SMELL" | string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | string;
    filePath?: string;
    startLine?: number;
    startColumn?: number;
    endLine?: number;
    endColumn?: number;
    symbol?: string;
    lineHash?: string;
}

/**
 * Represents a single security exclusion context.
 */
export interface ScannerExclusionContext {
    filePath: string;
    lineHash: string;
    ruleId: string;
    symbol: string;
    isGlobalExclusion?: boolean;
    IssueContext: ScannerIssueContext;
}

/**
 * Context for issues sent to AI Copilot.
 */
export interface CopilotIssueContext extends ScannerIssueContext {
    packageName?: string;
    hint?: string;
}



// ==== Requests ====

/**
 * Request to open a code block in visualizer.
 */
export interface RevealSecurityIssueRequest {
    filePath: string;
    issue: ScannerIssueContext;
}

/**
 * Request to ignore a specific instance of a vulnerability.
 */
export interface ExcludeIssueRequest {
    ruleId: string;
    filePath: string;
    issue: ScannerIssueContext;
}

/**
 * Request to exclude a rule globally for the project.
 */
export interface DisableRuleRequest {
    ruleId: string;
    filePath?: string;
}

/**
 * Request to remove a specific exclusion instance.
 */
export interface IncludeIssueRequest {
    ruleId: string;
    documentUri: string;
    symbol: string;
    lineHash: string;
}

/**
 * Request to remove a globally excluded rule.
 */
export interface EnableRuleRequest {
    ruleId: string;
    documentUri: string;
}

/**
 * Request to trigger the AI Copilot.
 */
export interface FixIssueRequest {
    issues: CopilotIssueContext[];
}

/**
 * Request to trigger a scan.
 */
export interface ScanRequest {
    projectPath: string;
}

// ==== Responses ====

/**
 * Base response for scanner LS extension indicating success or error.
 */
export interface BaseResponse {
    success?: boolean;
    errorMsg?: string;
    error?: string;
    stackTrace?: string;
}

/**
 * Response from scanner/getVulnerabilities backend endpoint.
 */
export interface ScanResponse extends BaseResponse {
    activeIssues?: any[];
    excludedIssues?: any[];
    dependentPackageIssuesFound?: boolean;
}

/**
 * Response for add exclusion.
 */
export interface AddExclusionResponse extends BaseResponse {
}

/**
 * Response for add global exclusion.
 */
export interface AddGlobalExclusionResponse extends BaseResponse {
}

/**
 * Response for remove exclusion.
 */
export interface includeIssueResponse extends BaseResponse {
}

/**
 * Response for remove global exclusion.
 */
export interface enableRuleResponse extends BaseResponse {
}

// ==== Events ====

/**
 * Notification payload sent when scanner-relevant project content changes.
 */
export interface ScannerContentChangedEvent {
    timestamp: number;
    reason?: string;
}
