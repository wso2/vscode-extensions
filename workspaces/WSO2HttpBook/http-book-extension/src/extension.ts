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
import { activateHurlNotebook, HURL_NOTEBOOK_TYPE, hurlTextToNotebookData, notebookCellsToNotebookData, NotebookCellInput } from './notebook';
import { initializeHurlBinaryManager } from './hurl/hurl-binary-manager';
import { ReadonlyHurlFSProvider, READONLY_HURL_SCHEME } from './readonly-fs-provider';

export function activate(context: vscode.ExtensionContext): void {
    // Initialize the Hurl binary manager (singleton)
    initializeHurlBinaryManager(context);

    // Register VS Code Notebook API support for `.hurl` files
    activateHurlNotebook(context);

    // Register read-only virtual filesystem for non-savable notebooks (Resource Try It)
    const readonlyProvider = new ReadonlyHurlFSProvider();
    context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider(READONLY_HURL_SCHEME, readonlyProvider, {
            isCaseSensitive: true,
            isReadonly: false  // false so cells remain editable; writeFile is a silent no-op to avoid error notifications
        })
    );

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

    // Command: import a Hurl string (or pre-built cells) as a notebook
    // When called programmatically:
    //   importHurlString(hurlContent: string, options?)
    //   importHurlString(cells: NotebookCellInput[], options?)
    //   savable: true  → in-memory notebook, Ctrl+S opens Save As dialog (Service Try It)
    //   savable: false → read-only virtual FS, saves are blocked (Resource Try It)
    // When called from command palette (no args): prompts user to paste a hurl string
    const importHurlStringCommand = vscode.commands.registerCommand(
        'wso2-http-book.importHurlString',
        async (contentOrCells?: string | NotebookCellInput[], options?: { savable?: boolean }) => {
            let notebookData: vscode.NotebookData;

            if (Array.isArray(contentOrCells)) {
                notebookData = notebookCellsToNotebookData(contentOrCells);
            } else {
                let content = contentOrCells;
                if (!content) {
                    const input = await vscode.window.showInputBox({
                        prompt: 'Paste Hurl string (use \\n for new lines)',
                        placeHolder: 'GET http://example.com\\nAccept: application/json'
                    });
                    if (input === undefined) { return; }
                    content = input.replace(/\\n/g, '\n');
                }
                notebookData = hurlTextToNotebookData(content);
            }

            const savable = options?.savable ?? true;

            try {
                if (savable || Array.isArray(contentOrCells)) {
                    // In-memory notebook — Ctrl+S shows Save As dialog (savable) or is silently ignored (cells-based)
                    const doc = await vscode.workspace.openNotebookDocument(HURL_NOTEBOOK_TYPE, notebookData);
                    await vscode.window.showNotebookDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
                } else {
                    // Read-only virtual FS — writeFile is a silent no-op so saves are discarded without error
                    const rawContent = typeof contentOrCells === 'string' ? contentOrCells : '';
                    const uri = vscode.Uri.parse(`${READONLY_HURL_SCHEME}:///notebook-${Date.now()}.hurl`);
                    readonlyProvider.set(uri, new TextEncoder().encode(rawContent));
                    const doc = await vscode.workspace.openNotebookDocument(uri);
                    await vscode.window.showNotebookDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
                }
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`WSO2 HttpBook: Failed to create notebook — ${msg}`);
            }
        }
    );

    context.subscriptions.push(openHurlNotebookCommand, installHurlCommand, importHurlStringCommand);
}

export function deactivate(): void {
    // Nothing to clean up beyond subscriptions
}
