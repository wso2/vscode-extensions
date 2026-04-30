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

import * as vscode from 'vscode';
import {
    ScannerIssueContext,
    ScannerExclusionContext,
    ScanResponse,
} from '@wso2/ballerina-core';

export const DEFAULT_SCAN_TIMEOUT_MS = 180000;

let outputChannel: vscode.OutputChannel | undefined;

export function getScannerOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Ballerina Security Scan');
    }
    return outputChannel;
}

/**
 * Checks if the Scanner is enabled in the current workspace settings.
 */
export function isScannerEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('ballerina');

    // Defaults to false if missing or misconfigured.
    return config.get<boolean>('scanner.enable', false) === true;
}

export function normalizeRuleKind(ruleKind: unknown): 'VULNERABILITY' | 'CODE_SMELL' {
    const normalized = String(ruleKind ?? '').trim().toUpperCase();
    return normalized === 'VULNERABILITY' ? 'VULNERABILITY' : 'CODE_SMELL';
}

export function mapIssue(raw: any): ScannerIssueContext {
    const startLine = raw?.startLine;
    const startColumn = raw?.startColumn;
    const endLine = raw?.endLine;
    const endColumn = raw?.endColumn;
    const resolvedRuleKind = normalizeRuleKind(raw?.ruleKind ?? raw?.rule?.ruleKind);

    return {
        ...raw,
        ruleId: raw?.rule?.id || raw?.ruleId || '',
        message: raw?.rule?.description || raw?.message || '',
        severity: raw?.severity || 'WARNING',
        ruleKind: resolvedRuleKind,
        filePath: raw?.location?.filePath || raw?.location?.path || raw?.filePath || raw?.path || '',
        startLine,
        startColumn,
        endLine,
        endColumn,
        symbol: raw?.symbol,
        lineHash: raw?.lineHash,
    };
}

export function mapExclusion(raw: any): ScannerExclusionContext {
    const issueContextRaw = raw?.IssueContext ?? raw?.issueContext ?? raw?.issue ?? raw?.context ?? raw;
    const issueContext = mapIssue(issueContextRaw);

    const symbol = String(raw?.symbol ?? issueContext.symbol ?? '');
    const lineHash = String(raw?.lineHash ?? issueContext.lineHash ?? '');
    const isGlobalExclusion = Boolean(raw?.isGlobalExclusion ?? (!symbol || !lineHash));

    return {
        filePath: String(raw?.filePath ?? issueContext.filePath ?? ''),
        ruleId: String(raw?.ruleId ?? issueContext.ruleId ?? ''),
        symbol,
        lineHash,
        isGlobalExclusion,
        IssueContext: {
            ...issueContext,
            symbol: issueContext.symbol ?? symbol,
            lineHash: issueContext.lineHash ?? lineHash,
        }
    };
}

export function mapRawScanResponse(response: ScanResponse | undefined): ScanResponse {
    if (!response) {
        return { success: false, activeIssues: [], excludedIssues: [], error: 'Invalid scan response' };
    }

    if (response.errorMsg) {
        return { success: false, activeIssues: [], excludedIssues: [], error: response.errorMsg };
    }

    const rawActiveIssues = response.activeIssues || [];
    const rawExcludedIssues = response.excludedIssues || [];

    return {
        success: true,
        activeIssues: rawActiveIssues.map(mapIssue),
        excludedIssues: rawExcludedIssues.map(mapExclusion)
    };
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
            })
        ]);
    } finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
}
