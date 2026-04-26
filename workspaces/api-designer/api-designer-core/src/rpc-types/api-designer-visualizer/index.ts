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

import {
    OpenViewRequest,
    GoToSourceRequest,
    GetAPISpecContentRequest,
    GetAPISpecContentResponse,
    WriteAPISpecContentResponse,
    WriteAPISpecContentRequest,
    Schema,
    GetGovernanceRequest,
    GetGovernanceResponse,
    FetchRulesetsFromFolderRequest,
    FetchRulesetsFromFolderResponse,
    GetApplicableRulesetsRequest,
    GetApplicableRulesetsResponse,
    GetAllSpectralRulesetsRequest,
    GetAllSpectralRulesetsResponse,
    ValidateAPISpecRequest,
    ValidateAPISpecResponse,
    ReadFileRequest,
    ReadFileResponse,
    WriteFileRequest,
    WriteFileResponse,
    DeleteFileRequest,
    DeleteFileResponse,
    GetWorkspaceFileTreeRequest,
    GetWorkspaceFileTreeResponse,
    WorkspaceFileNode,
    CheckAIAvailabilityRequest,
    CheckAIAvailabilityResponse,
} from "./types";

// Re-export validation types for direct use
export type {
    ValidationError,
    SpectralRuleset,
    FileTreeNode,
    RulesetMetadata,
    AiReadinessMetrics,
    AiReadinessCoverage,
    UnifiedAnalyzeReport,
    UnifiedBreakdownCategory,
    UnifiedOverviewMetric,
    UnifiedViolation,
    LlmValidationState,
    LlmValidationResult,
    LlmValidationFinding,
    LlmValidationStatus
} from "./types";

// Export GovernanceViolation type alias for convenience
export type GovernanceViolation = {
    rule: string;
    message: string;
    description?: string;
    /** Optional fix guidance from the ruleset YAML (e.g. OWASP rules) for dashboards and tooling */
    fixSuggestion?: string;
    severity: string;
    path?: string[] | string;
    code?: string;
    range?: {
        start: { line: number; character: number };
        end: { line: number; character: number };
    };
};

export interface APIDesignerVisualizerAPI {
    openView: (params: OpenViewRequest) => void;
    goToSource: (params: GoToSourceRequest) => void;
    getAPISpecContent: (params: GetAPISpecContentRequest) => Promise<GetAPISpecContentResponse>;
    writeAPISpecContent: (params: WriteAPISpecContentRequest) => Promise<WriteAPISpecContentResponse>;
    importJSON: () => Promise<Schema | undefined>;
    getGovernance: (params: GetGovernanceRequest) => Promise<GetGovernanceResponse>;
    validateApiSpec: (params: ValidateAPISpecRequest) => Promise<ValidateAPISpecResponse>;
    /** List YAML rulesets discovered under a folder URL or workspace path (GitHub or local). */
    fetchRulesetsFromFolder: (params: FetchRulesetsFromFolderRequest) => Promise<FetchRulesetsFromFolderResponse>;
    /**
     * Rulesets for Analyze / governance for this API: from `.api-platform/config.yaml` or built-in defaults.
     * Not the same as VS Code global `apiDesigner.spectral.selectedRulesets`.
     */
    getApplicableRulesets: (params: GetApplicableRulesetsRequest) => Promise<GetApplicableRulesetsResponse>;
    /**
     * All rulesets stored in VS Code settings (global), including disabled — used when seeding project config from user selection.
     */
    getAllSpectralRulesets: (params: GetAllSpectralRulesetsRequest) => Promise<GetAllSpectralRulesetsResponse>;
    readFile: (params: ReadFileRequest) => Promise<ReadFileResponse>;
    writeFile: (params: WriteFileRequest) => Promise<WriteFileResponse>;
    deleteFile: (params: DeleteFileRequest) => Promise<DeleteFileResponse>;
    getWorkspaceFileTree: (params: GetWorkspaceFileTreeRequest) => Promise<GetWorkspaceFileTreeResponse>;
    checkAIAvailability: (params: CheckAIAvailabilityRequest) => Promise<CheckAIAvailabilityResponse>;
}

export type {
    OpenViewRequest,
    GoToSourceRequest,
    GetAPISpecContentRequest,
    GetAPISpecContentResponse,
    WriteAPISpecContentRequest,
    WriteAPISpecContentResponse,
    Schema,
    GetGovernanceRequest,
    GetGovernanceResponse,
    ValidateAPISpecRequest,
    ValidateAPISpecResponse,
    FetchRulesetsFromFolderRequest,
    FetchRulesetsFromFolderResponse,
    GetApplicableRulesetsRequest,
    GetApplicableRulesetsResponse,
    ReadFileRequest,
    ReadFileResponse,
    WriteFileRequest,
    WriteFileResponse,
    DeleteFileRequest,
    DeleteFileResponse,
    GetWorkspaceFileTreeRequest,
    GetWorkspaceFileTreeResponse,
    WorkspaceFileNode,
    CheckAIAvailabilityRequest,
    CheckAIAvailabilityResponse,
    GetAllSpectralRulesetsRequest,
    GetAllSpectralRulesetsResponse,
};
