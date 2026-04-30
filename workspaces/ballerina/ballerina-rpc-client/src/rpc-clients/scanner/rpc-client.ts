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
    ScannerAPI,
    RevealSecurityIssueRequest,
    ExcludeIssueRequest,
    DisableRuleRequest,
    IncludeIssueRequest,
    EnableRuleRequest,
    FixIssueRequest,
    ScanRequest,
    revealSecurityIssue,
    excludeIssue,
    disableRule,
    includeIssue,
    enableRule,
    fixIssueWithCopilot,
    scanProject,
    ScannerContentChangedEvent,
    scannerContentChanged,
    ScanResponse,
} from "@wso2/ballerina-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class ScannerRpcClient implements ScannerAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    revealSecurityIssue(params: RevealSecurityIssueRequest): Promise<void> {
        return this._messenger.sendRequest(revealSecurityIssue, HOST_EXTENSION, params);
    }

    excludeIssue(params: ExcludeIssueRequest): Promise<void> {
        return this._messenger.sendRequest(excludeIssue, HOST_EXTENSION, params);
    }

    disableRule(params: DisableRuleRequest): Promise<void> {
        return this._messenger.sendRequest(disableRule, HOST_EXTENSION, params);
    }

    includeIssue(params: IncludeIssueRequest): Promise<void> {
        return this._messenger.sendRequest(includeIssue, HOST_EXTENSION, params);
    }

    enableRule(params: EnableRuleRequest): Promise<void> {
        return this._messenger.sendRequest(enableRule, HOST_EXTENSION, params);
    }

    fixIssueWithCopilot(params: FixIssueRequest): Promise<void> {
        return this._messenger.sendRequest(fixIssueWithCopilot, HOST_EXTENSION, params);
    }

    scanProject(params: ScanRequest): Promise<ScanResponse> {
        return this._messenger.sendRequest(scanProject, HOST_EXTENSION, params);
    }

    onScannerContentChanged(callback: (event: ScannerContentChangedEvent) => void): void {
        this._messenger.onNotification(scannerContentChanged, callback);
    }
}
