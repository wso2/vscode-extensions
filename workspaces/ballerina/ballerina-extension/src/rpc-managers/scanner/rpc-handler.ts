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
    DisableRuleRequest,
    ExcludeIssueRequest,
    RevealSecurityIssueRequest,
    FixIssueRequest,
    ScanRequest,
    IncludeIssueRequest,
    EnableRuleRequest,
    disableRule,
    excludeIssue,
    revealSecurityIssue,
    fixIssueWithCopilot,
    scanProject,
    includeIssue,
    enableRule,
    pullScannerTool,
} from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { ScannerRpcManager } from "./rpc-manager";

export function registerScannerRpcHandlers(messenger: Messenger) {
    const rpcManager = new ScannerRpcManager();
    messenger.onRequest(revealSecurityIssue, (args: RevealSecurityIssueRequest) => rpcManager.revealSecurityIssue(args));
    messenger.onRequest(excludeIssue, (args: ExcludeIssueRequest) => rpcManager.excludeIssue(args));
    messenger.onRequest(disableRule, (args: DisableRuleRequest) => rpcManager.disableRule(args));
    messenger.onRequest(includeIssue, (args: IncludeIssueRequest) => rpcManager.includeIssue(args));
    messenger.onRequest(enableRule, (args: EnableRuleRequest) => rpcManager.enableRule(args));
    messenger.onRequest(fixIssueWithCopilot, (args: FixIssueRequest) => rpcManager.fixIssueWithCopilot(args));
    messenger.onRequest(scanProject, (args: ScanRequest) => rpcManager.scanProject(args));
    messenger.onRequest(pullScannerTool, () => rpcManager.pullScannerTool());
}
