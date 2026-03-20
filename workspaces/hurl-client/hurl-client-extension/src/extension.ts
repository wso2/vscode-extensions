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
import * as fs from 'fs/promises';
import * as path from 'path';
import { activateHurlNotebook, hurlTextToNotebookData, notebookCellsToNotebookData, cellsToHurlText, enqueuePendingUntitledContent, NotebookCellInput } from './notebook';
import { initializeHurlBinaryManager } from './hurl/hurl-binary-manager';
import { ReadonlyHurlFSProvider, READONLY_HURL_SCHEME } from './readonly-fs-provider';

export function activate(context: vscode.ExtensionContext): void {
    // Initialize the Hurl binary manager (singleton)
    const binaryManager = initializeHurlBinaryManager(context);

    // Proactively install hurl in the background on activation so it is ready before the user
    // executes their first cell. Silent — no error shown if this fails (will retry on first run).
    // Only trigger if the user has not disabled auto-install via configuration.
    if (vscode.workspace.getConfiguration('http-client').get<boolean>('hurl.autoInstall', true)) {
        binaryManager.resolveCommandPath({ autoInstall: true }).catch(() => {});
    }

    // Register VS Code Notebook API support for `.hurl` files
    activateHurlNotebook(context);

    // Kernel affinity is set programmatically inside HurlNotebookController via
    // updateNotebookAffinity, so VS Code never shows the kernel picker for our
    // notebook type.  No additional listener is needed here.

    // Register read-only virtual filesystem for non-savable notebooks (Resource Try It)
    const readonlyProvider = new ReadonlyHurlFSProvider();
    context.subscriptions.push(
        vscode.workspace.registerFileSystemProvider(READONLY_HURL_SCHEME, readonlyProvider, {
            isCaseSensitive: true,
            isReadonly: false  // false so cells remain editable; writeFile throws NoPermissions to block saves
        })
    );

    // Command: open a .hurl file as a native notebook
    const openHurlNotebookCommand = vscode.commands.registerCommand(
        'HTTPClient.openHurlNotebook',
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
                vscode.window.showErrorMessage(`HTTP Client: Failed to open notebook — ${msg}`);
            }
        }
    );

    // Command: install hurl binary
    const installHurlCommand = vscode.commands.registerCommand(
        'HTTPClient.installHurl',
        async () => {
            const { getHurlBinaryManager } = await import('./hurl/hurl-binary-manager');
            try {
                const binaryPath = await getHurlBinaryManager().installManagedHurl({ interactive: true });
                vscode.window.showInformationMessage(`HTTP Client: Hurl installed at ${binaryPath}`);
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`HTTP Client: Failed to install Hurl — ${msg}`);
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
        'HTTPClient.importHurlString',
        async (contentOrCells?: string | NotebookCellInput[], options?: { savable?: boolean; savePath?: string; viewColumn?: 'beside' | 'active' }) => {
            let notebookData: vscode.NotebookData;
            let resolvedHurlText: string;

            if (Array.isArray(contentOrCells)) {
                resolvedHurlText = cellsToHurlText(contentOrCells);
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
                resolvedHurlText = content;
                notebookData = hurlTextToNotebookData(content);
            }

            const savable = options?.savable ?? true;
            const savePath = options?.savePath;
            const viewColumn = options?.viewColumn === 'active'
                ? vscode.ViewColumn.Active
                : vscode.ViewColumn.Beside;

            try {
                let doc: vscode.NotebookDocument;
                if (savePath) {
                    // Write content to the given path (e.g. <project>/target/TryIt.hurl) and open
                    // the real file as a notebook so Cmd+S saves in-place without a Save As dialog.
                    await fs.mkdir(path.dirname(savePath), { recursive: true });
                    await fs.writeFile(savePath, resolvedHurlText, 'utf8');
                    doc = await vscode.workspace.openNotebookDocument(vscode.Uri.file(savePath));
                } else if (savable) {
                    // Untitled notebook — a unique token is embedded in the URI filename so the
                    // serializer can look up the correct content even when multiple untitled notebooks
                    // are opened concurrently (avoids the FIFO-ordering race in a shared queue).
                    const token = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
                    enqueuePendingUntitledContent(token, resolvedHurlText);
                    const untitledUri = vscode.Uri.parse(`untitled:TryIt-${token}.hurl`);
                    doc = await vscode.workspace.openNotebookDocument(untitledUri);
                    // Mark the notebook dirty immediately so VS Code prompts to save on close even
                    // if the user makes no edits.  Notebook metadata is not written by serializeNotebook
                    // so this has no effect on the saved .hurl file content.
                    const dirtyEdit = new vscode.WorkspaceEdit();
                    dirtyEdit.set(doc.uri, [vscode.NotebookEdit.updateNotebookMetadata({ generated: true })]);
                    await vscode.workspace.applyEdit(dirtyEdit);
                } else {
                    // Virtual FS notebook — writeFile throws NoPermissions so Cmd+S is blocked.
                    // VS Code never marks the document dirty → no save prompt on close.
                    // Markdown cells are encoded as `# md:` comments so they survive the round-trip.
                    const uri = vscode.Uri.parse(`${READONLY_HURL_SCHEME}:///notebook-${Date.now()}.hurl`);
                    readonlyProvider.set(uri, new TextEncoder().encode(resolvedHurlText));
                    doc = await vscode.workspace.openNotebookDocument(uri);
                }
                await vscode.window.showNotebookDocument(doc, { viewColumn });
                // Kernel affinity is handled by HurlNotebookController.updateNotebookAffinity.
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`HTTP Client: Failed to create notebook — ${msg}`);
            }
        }
    );

    context.subscriptions.push(openHurlNotebookCommand, installHurlCommand, importHurlStringCommand);
}

export function deactivate(): void {
    // Nothing to clean up beyond subscriptions
}
