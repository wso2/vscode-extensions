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

import { 
    RevealSecurityIssueRequest, 
    ExcludeIssueRequest, 
    DisableRuleRequest,
    IncludeIssueRequest,
    EnableRuleRequest,
    FixIssueRequest,
    ScanRequest,
    ScanResponse
} from "./interfaces";

export interface ScannerAPI {
    /**
     * Opens the Bi diagram for a specific code block.
     */
    revealSecurityIssue: (params: RevealSecurityIssueRequest) => Promise<void>;

    /**
     * Ignores a specific vulnerability instance.
     */
    excludeIssue: (params: ExcludeIssueRequest) => Promise<void>;

    /**
     * Globally excludes a rule ID.
     */
    disableRule: (params: DisableRuleRequest) => Promise<void>;

    /**
     * Removes a specific exclusion instance.
     */
    includeIssue: (params: IncludeIssueRequest) => Promise<void>;

    /**
     * Removes a globally excluded rule.
     */
    enableRule: (params: EnableRuleRequest) => Promise<void>;

    /**
     * Opens the AI Panel with a prompt to fix the specific issue.
     */
    fixIssueWithCopilot: (params: FixIssueRequest) => Promise<void>;

    /**
     * Triggers the scan and returns the list of issues.
     */
    scanProject: (params: ScanRequest) => Promise<ScanResponse>;
}
