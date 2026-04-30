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
import { BallerinaExtension } from 'src/core';
import { scannerContentChanged } from '@wso2/ballerina-core';
import { isScannerEnabled, getScannerOutputChannel } from './scan-utils';
import { ScannerWebview } from '../../views/scanner/webview';
import { ScannerRpcManager } from '../../rpc-managers/scanner/rpc-manager';
import { RPCLayer } from '../../RPCLayer';


/**
 * Resolves the project root URI from a given URI or the active editor.
 */
function resolveProjectRoot(uri?: vscode.Uri): vscode.Uri | undefined {
    if (uri) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) { return workspaceFolder.uri; }
        return vscode.Uri.joinPath(uri, '..');
    }
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'ballerina') {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        if (workspaceFolder) { return workspaceFolder.uri; }
    }
    return undefined;
}

/**
 * Activates the Ballerina Security Scanner feature.
 */
export function activate(ballerinaExtInstance: BallerinaExtension): void {
    let scannerContentChangedDebounce: NodeJS.Timeout | undefined;
    const scannerRpcManager = new ScannerRpcManager();

    const updateScannerEnabledContext = () => {
        vscode.commands.executeCommand('setContext', 'ballerinaScannerEnabled', isScannerEnabled());
    };

    updateScannerEnabledContext();

    const scannerConfigWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('ballerina.scanner.enable')) {
            updateScannerEnabledContext();
        }
    });

    const scannerContentWatcher = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId !== 'ballerina' || !isScannerEnabled()) {
            return;
        }

        if (scannerContentChangedDebounce) {
            clearTimeout(scannerContentChangedDebounce);
        }

        scannerContentChangedDebounce = setTimeout(() => {
            RPCLayer._messenger.sendNotification(
                scannerContentChanged,
                { type: 'webview', webviewType: ScannerWebview.viewType },
                { timestamp: Date.now(), reason: 'documentChanged' }
            );
        }, 5000);
    });

    const langClient = ballerinaExtInstance.langClient;
    if (!langClient) {
        vscode.window.showErrorMessage("Ballerina Language Server is not ready. Scanner disabled.");
        return;
    }

    // Register Scan Command — delegates to the RPC manager (no direct LS calls here)
    const scanDisposable = vscode.commands.registerCommand('ballerina.scan.project', async (uri?: vscode.Uri) => {
        const projectRootUri = resolveProjectRoot(uri);

        if (!projectRootUri) {
            vscode.window.showErrorMessage("Could not determine Project Root. Please open a Ballerina project.");
            return;
        }

        if (!isScannerEnabled()) {
            const selection = await vscode.window.showInformationMessage(
                "Ballerina Security Scanner is disabled for this workspace.",
                "Enable Scanner"
            );
            if (selection === "Enable Scanner") {
                const config = vscode.workspace.getConfiguration('ballerina');
                await config.update('scanner.enable', true, vscode.ConfigurationTarget.Workspace);
                const reloadSelection = await vscode.window.showInformationMessage(
                    "Scanner enabled. Please reload the window to activate features.",
                    "Reload Window"
                );
                if (reloadSelection === "Reload Window") {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            }
            return;
        }

        const outputChannel = getScannerOutputChannel();
        outputChannel.appendLine(`[INFO] [SCAN] Start: ${projectRootUri.fsPath}`);

        // Delegate to the RPC manager — the single source of truth for LS calls
        const result = await scannerRpcManager.scanProject({ projectPath: projectRootUri.fsPath });

        const scanError = result.errorMsg || result.error;
        if (scanError) {
            outputChannel.appendLine(`[ERROR] [SCAN] Failed: ${scanError}`);
            if (scanError === "Compilation Failed") {
                vscode.window.showErrorMessage("Security Scan Aborted: Please fix compilation errors first.");
            }
            return;
        }

        outputChannel.appendLine(`[INFO] [SCAN] Completed: active=${result.activeIssues?.length ?? 0}, excluded=${result.excludedIssues?.length ?? 0}`);
    });



    const showPanelDisposable = vscode.commands.registerCommand('ballerina.scanner.showPanel', () => {
        ScannerWebview.show();
    });

    ballerinaExtInstance.context.subscriptions.push(getScannerOutputChannel());
    ballerinaExtInstance.context.subscriptions.push(scanDisposable);
    ballerinaExtInstance.context.subscriptions.push(showPanelDisposable);
    ballerinaExtInstance.context.subscriptions.push(scannerConfigWatcher);
    ballerinaExtInstance.context.subscriptions.push(scannerContentWatcher);
}
