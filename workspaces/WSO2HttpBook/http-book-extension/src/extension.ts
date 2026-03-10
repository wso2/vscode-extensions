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
import { activateHurlNotebook } from './notebook';
import { initializeHurlBinaryManager } from './hurl/hurl-binary-manager';

export function activate(context: vscode.ExtensionContext): void {
    // Initialize the Hurl binary manager (singleton)
    initializeHurlBinaryManager(context);

    // Register VS Code Notebook API support for `.hurl` files
    activateHurlNotebook(context);

    // Command: open a .hurl file as a native notebook
    const openHurlNotebookCommand = vscode.commands.registerCommand(
        'wso2-http-book.openHurlNotebook',
        async (resourceUri?: vscode.Uri) => {
            let fileUri: vscode.Uri | undefined = resourceUri;

            if (!fileUri) {
                const picked = await vscode.window.showOpenDialog({
                    canSelectMany: false,
                    filters: { 'Hurl Files': ['hurl'], 'All Files': ['*'] },
                    title: 'Select a Hurl file to open as notebook'
                });
                if (!picked || picked.length === 0) {
                    return;
                }
                fileUri = picked[0];
            }

            try {
                const doc = await vscode.workspace.openNotebookDocument(fileUri);
                await vscode.window.showNotebookDocument(doc);
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`WSO2 HttpBook: Failed to open notebook — ${msg}`);
            }
        }
    );

    // Command: install hurl binary
    const installHurlCommand = vscode.commands.registerCommand(
        'wso2-http-book.installHurl',
        async () => {
            const { getHurlBinaryManager } = await import('./hurl/hurl-binary-manager');
            try {
                const binaryPath = await getHurlBinaryManager().installManagedHurl({ interactive: true });
                vscode.window.showInformationMessage(`WSO2 HttpBook: Hurl installed at ${binaryPath}`);
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`WSO2 HttpBook: Failed to install Hurl — ${msg}`);
            }
        }
    );

    context.subscriptions.push(openHurlNotebookCommand, installHurlCommand);
}

export function deactivate(): void {
    // Nothing to clean up beyond subscriptions
}
