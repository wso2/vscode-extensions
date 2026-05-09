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
import { exec } from 'child_process';
import {
    ScannerIssueContext,
    ScannerExclusionContext,
    ScanResponse,
} from '@wso2/ballerina-core';
import { getRuleSeverity } from './security-rules';

export type ScannerToolState = 'NOT_FOUND' | 'INCOMPATIBLE' | 'SUPPORTED';

/**
 * Tracks whether the scanner tool version is supported in the current workspace.
 */
let _isScannerVersionSupported = false;
export function isScannerVersionSupported(): boolean {
    return _isScannerVersionSupported;
}

export const DEFAULT_SCAN_TIMEOUT_MS = 120000;

let outputChannel: vscode.OutputChannel | undefined;

export function getScannerOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Ballerina Security Scan');
    }
    return outputChannel;
}

function runBalToolCommand(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
        exec(command, (error, _stdout, stderr) => {
            if (error) {
                const message = stderr?.trim() || error.message || 'Unknown error';
                reject(new Error(message));
                return;
            }
            if (stderr && stderr.trim()) {
                reject(new Error(stderr.trim()));
                return;
            }
            resolve();
        });
    });
}

export function setScannerVersionSupported(supported: boolean) {
    _isScannerVersionSupported = supported;
}

let _scannerState: ScannerToolState = 'NOT_FOUND';
export function scannerState(): ScannerToolState {
    return _scannerState;
}

export function setScannerState(state: ScannerToolState) {
    _scannerState = state;
}

export function isScannerConfigEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('ballerina');

    // Defaults to false if missing or misconfigured.
    return config.get<boolean>('scanner.enable', false) === true;
}

export function isScannerActive(): boolean {
    return isScannerConfigEnabled() && isScannerVersionSupported();
}

export async function pullOrUpdateScannerTool(): Promise<boolean> {
    const outputChannel = getScannerOutputChannel();
    const isNotInstalled = scannerState() === 'NOT_FOUND';
    const command = isNotInstalled ? 'bal tool pull scan' : 'bal tool update scan';
    const actionLabel = isNotInstalled ? 'Pulling' : 'Updating';
    const completionLabel = isNotInstalled ? 'pulled' : 'updated';

    outputChannel.appendLine(`[INFO] [SCAN] ${actionLabel} scanner tool with: ${command}`);

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `${actionLabel} scanner tool...`,
                cancellable: false,
            },
            async () => {
                await runBalToolCommand(command);
            }
        );

        vscode.window.showInformationMessage(
            `Scanner tool ${completionLabel}. Restart VS Code to complete the setup.`,
            'Restart VS Code'
        ).then((selection) => {
            if (selection === 'Restart VS Code') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        });

        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`[ERROR] [SCAN] Scanner tool ${actionLabel.toLowerCase()} failed: ${message}`);
        vscode.window.showErrorMessage(`Scanner tool ${actionLabel.toLowerCase()} failed: ${message}`);
        return false;
    }
}

export function normalizeRuleKind(ruleKind: unknown): 'VULNERABILITY' | 'CODE_SMELL' {
    const normalized = String(ruleKind ?? '').trim().toUpperCase();
    return normalized === 'VULNERABILITY' ? 'VULNERABILITY' : 'CODE_SMELL';
}

export function mapIssue(raw: ScannerIssueContext): ScannerIssueContext {
    const startLine = raw?.startLine;
    const startColumn = raw?.startColumn;
    const endLine = raw?.endLine;
    const endColumn = raw?.endColumn;
    const resolvedRuleKind = normalizeRuleKind(raw?.ruleKind ?? raw?.rule?.ruleKind);
    const ruleId = raw?.rule?.id || raw?.ruleId || '';
    const severity = getRuleSeverity(ruleId);

    return {
        ...raw,
        ruleId,
        message: raw?.rule?.description || raw?.message || '',
        severity: severity || 'LOW', // This need to come from the LS service
        ruleKind: resolvedRuleKind,
        filePath: raw?.location?.filePath || raw?.filePath || '',
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
    const rawActiveIssues = response.activeIssues || [];
    const rawExcludedIssues = response.excludedIssues || [];

    return {
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
