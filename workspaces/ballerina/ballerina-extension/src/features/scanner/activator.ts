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
import { BallerinaExtension } from 'src/core';
import { scannerContentChanged } from '@wso2/ballerina-core';
import { isScannerConfigEnabled, isScannerVersionSupported, setScannerVersionSupported, isScannerActive, getScannerOutputChannel, setScannerState, pullOrUpdateScannerTool } from './scan-utils';
import type { ScannerToolState } from './scan-utils';
import { ScannerWebview } from '../../views/scanner/webview';
import { ScannerRpcManager } from '../../rpc-managers/scanner/rpc-manager';
import { RPCLayer } from '../../RPCLayer';

/**
 * Checks if the scan tool version is greater than 0.11.0.
 */
function checkScanToolVersion(callback: (state: ScannerToolState) => void) {
    exec('bal tool list', (error, stdout) => {
        if (error) {
            callback('NOT_FOUND');
            return;
        }

        let foundScanner = false;

        // Parse the stdout to find the 'scan' tool version.
        const lines = stdout.split('\n');
        for (const line of lines) {
            if (line.includes('|scan')) {
                foundScanner = true;
                const parts = line.split('|').map(p => p.trim());
                if (parts.length >= 3) {
                    const versionStr = parts[2]; // The version is in the 3rd part
                    // Simplified version check for > 0.11.0
                    const match = versionStr.match(/^(\d+)\.(\d+)\.(\d+)/);
                    if (match) {
                        const major = parseInt(match[1], 10);
                        const minor = parseInt(match[2], 10);
                        const patch = parseInt(match[3], 10);

                        // We check if version > 0.11.0
                        if (major > 0 || (major === 0 && minor > 11) || (major === 0 && minor === 11 && patch > 0)) {
                            callback('SUPPORTED');
                            return;
                        }
                    }
                }
            }
        }

        callback(foundScanner ? 'INCOMPATIBLE' : 'NOT_FOUND');
    });
}

function getScannerToolInstallMessage(state: ScannerToolState): string {
    return state === 'NOT_FOUND'
        ? "The Ballerina Security Scanner tool is not installed. Pull it from Ballerina Central and restart VS Code to finish setup."
        : "The Ballerina Security Scanner tool version is incompatible. Pull the latest scanner tool from Ballerina Central and restart VS Code to finish setup.";
}

async function promptScannerToolInstall(state: ScannerToolState): Promise<void> {
    const action = await vscode.window.showInformationMessage(
        getScannerToolInstallMessage(state),
        'Pull Scanner Tool'
    );

    if (action === 'Pull Scanner Tool') {
        await vscode.commands.executeCommand('ballerina.scanner.pullTool');
    }
}



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

    const updateScannerEnabledContext = async () => {
        await vscode.commands.executeCommand('setContext', 'ballerinaScannerEnabled', isScannerConfigEnabled());

        if (!isScannerConfigEnabled()) {
            setScannerVersionSupported(false);
            setScannerState('NOT_FOUND');
            ScannerWebview.currentPanel?.update();
            return;
        }

        checkScanToolVersion((state) => {
            setScannerVersionSupported(state === 'SUPPORTED');
            setScannerState(state);
            ScannerWebview.currentPanel?.update();

            if (state !== 'SUPPORTED') {
                void promptScannerToolInstall(state);
            }
        });
    };

    void updateScannerEnabledContext();

    const scannerConfigWatcher = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('ballerina.scanner.enable')) {
            void updateScannerEnabledContext();
        }
    });

    const scannerContentWatcher = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId !== 'ballerina' || !isScannerActive()) {
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
        }, 1000);
    });

    const pullToolDisposable = vscode.commands.registerCommand('ballerina.scanner.pullTool', async () => {
        await pullOrUpdateScannerTool();
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

        if (!isScannerConfigEnabled()) {
            const selection = await vscode.window.showInformationMessage(
                "Ballerina Security Scanner is disabled for this workspace.",
                "Enable Scanner"
            );
            if (selection === "Enable Scanner") {
                const config = vscode.workspace.getConfiguration('ballerina');
                await config.update('scanner.enable', true, vscode.ConfigurationTarget.Workspace);
            }
            return;
        }

        if (!isScannerVersionSupported) {
            vscode.window.showErrorMessage("Ballerina Security Scanner requires the 'scan' tool version > 0.11.0. Please update your tool.");
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

    const showPanelDisposable = vscode.commands.registerCommand('ballerina.scanner.showPanel', (mode?: string) => {
        ScannerWebview.show(mode);
    });

    ballerinaExtInstance.context.subscriptions.push(getScannerOutputChannel());
    ballerinaExtInstance.context.subscriptions.push(scanDisposable);
    ballerinaExtInstance.context.subscriptions.push(pullToolDisposable);
    ballerinaExtInstance.context.subscriptions.push(showPanelDisposable);
    ballerinaExtInstance.context.subscriptions.push(scannerConfigWatcher);
    ballerinaExtInstance.context.subscriptions.push(scannerContentWatcher);
}
