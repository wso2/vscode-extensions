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
    ScanResponse,
    ScannerContentChangedEvent
} from "./interfaces";
import { NotificationType, RequestType } from "vscode-messenger-common";

const _preFix = "scanner";
export const revealSecurityIssue: RequestType<RevealSecurityIssueRequest, void> = { method: `${_preFix}/revealSecurityIssue` };
export const excludeIssue: RequestType<ExcludeIssueRequest, void> = { method: `${_preFix}/excludeIssue` };
export const disableRule: RequestType<DisableRuleRequest, void> = { method: `${_preFix}/disableRule` };
export const includeIssue: RequestType<IncludeIssueRequest, void> = { method: `${_preFix}/includeIssue` };
export const enableRule: RequestType<EnableRuleRequest, void> = { method: `${_preFix}/enableRule` };
export const fixIssueWithCopilot: RequestType<FixIssueRequest, void> = { method: `${_preFix}/fixIssueWithCopilot` };
export const scanProject: RequestType<ScanRequest, ScanResponse> = { method: `${_preFix}/scanProject` };
export const scannerContentChanged: NotificationType<ScannerContentChangedEvent> = { method: `${_preFix}/contentChanged` };
