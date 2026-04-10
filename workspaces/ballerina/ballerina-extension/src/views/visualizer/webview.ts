/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import * as vscode from "vscode";
import * as path from "path";
import { Uri, ViewColumn, Webview } from "vscode";
import { RPCLayer } from "../../RPCLayer";
import { debounce } from "lodash";
import { WebViewOptions, getComposerWebViewOptions, getLibraryWebViewContent } from "../../utils/webview-utils";
import { extension } from "../../BalExtensionContext";
import { StateMachine, undoRedoManager, updateView } from "../../stateMachine";
import { LANGUAGE } from "../../core";
import { MACHINE_VIEW } from "@wso2/ballerina-core";
import { refreshDataMapper } from "../../rpc-managers/data-mapper/utils";
import { AiPanelWebview } from "../ai-panel/webview";
import { approvalViewManager } from "../../features/ai/state/ApprovalViewManager";
import { StateMachinePopup } from "../../stateMachinePopup";
import { clearFormState } from "../../rpc-managers/bi-diagram/form-state";
import { isInWI } from "../../utils/config";

export class VisualizerWebview {
    public static currentPanel: VisualizerWebview | undefined;
    public static readonly viewType = "ballerina.visualizer";
    public static readonly ballerinaTitle = "Ballerina Visualizer";
    public static readonly biTitle = "WSO2 Integrator";
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];
    private _remoteSyncInProgress: Set<string> = new Set();

    constructor() {
        this._panel = VisualizerWebview.createWebview();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getWebviewContent(this._panel.webview);
        RPCLayer.create(this._panel);

        // Handle the text change and diagram update with rpc notification
        const sendUpdateNotificationToWebview = debounce(async (refreshTreeView?: boolean) => {
            if (this._panel) {
                updateView(refreshTreeView);
            }
        }, 100);

        const debouncedRefreshDataMapper = debounce(async () => {
            const stateMachineContext = StateMachine.context();
            // Use the cached file path for remote URIs
            const documentPath = stateMachineContext.documentUri;
            const { dataMapperMetadata: { codeData, name } } = stateMachineContext;
            await refreshDataMapper(documentPath, codeData, name);
        }, 500);

        vscode.workspace.onDidChangeTextDocument(async (document) => {
            const isRemoteDocument = document.document.uri.scheme !== 'file';

            const isOpened = vscode.window.visibleTextEditors.some(editor => editor.document.uri.toString() === document.document.uri.toString());
            if ((!isOpened || this._panel?.active) && !isRemoteDocument) {
                await document.document.save();
            }

            // Check the file is changed in the project.
            const projectPath = StateMachine.context().projectPath;
            const contextDocumentPath = StateMachine.context().documentUri;
            const documentUriString = document.document.uri.toString();
            const documentPath = document.document.uri.fsPath;
            const { uriCache } = await import('../../extension');

            const resolvedDocumentPath = isRemoteDocument
                ? (uriCache?.getLocalPath(document.document.uri) || documentPath)
                : documentPath;

            const isDocumentUnderProject = !!(resolvedDocumentPath && projectPath && resolvedDocumentPath.includes(projectPath));

            // Reset visualizer the undo-redo stack if user did changes in the editor
            if (isOpened && isDocumentUnderProject && !this._panel?.active && !undoRedoManager?.isBatchInProgress()) {
                undoRedoManager.reset();
            }

            const state = StateMachine.state();
            const machineReady = typeof state === 'object' && 'viewActive' in state && state.viewActive === "viewReady";
            if (!machineReady) { 
                return; 
            }
            
            // If contentChanges is empty but document was modified programmatically, we still want to update
            if (document?.contentChanges.length === 0) {
                console.log('[Webview] Empty contentChanges (likely programmatic edit), checking if update needed');
            }

            const balFileModified = document?.document.languageId === LANGUAGE.BALLERINA;
            const remoteBalFileModified = balFileModified && isDocumentUnderProject && isRemoteDocument;
            const configTomlModified = document.document.languageId === LANGUAGE.TOML &&
                document.document.fileName.endsWith("Config.toml") &&
                vscode.window.visibleTextEditors.some(editor =>
                    editor.document.fileName === document.document.fileName
                );
            // Check if the changed document matches the context document
            // Support both local paths and remote URIs with cached paths
            const isContextDocument = contextDocumentPath && (
                resolvedDocumentPath === contextDocumentPath ||
                documentUriString === contextDocumentPath ||
                (uriCache && uriCache.isSamePath(resolvedDocumentPath, contextDocumentPath)) ||
                (uriCache && uriCache.isSamePath(documentUriString, contextDocumentPath))
            );

            const dataMapperModified = balFileModified &&
                (
                    StateMachine.context().view === MACHINE_VIEW.InlineDataMapper ||
                    StateMachine.context().view === MACHINE_VIEW.DataMapper
                ) &&
                isContextDocument;
    
            if (dataMapperModified) {
                console.log('[Webview] Refreshing data mapper');
                debouncedRefreshDataMapper();
            } else if (balFileModified && isDocumentUnderProject && !isRemoteDocument) {
                // Remote (OCT) documents are handled by the extension.ts file watcher which
                // ensures cache is updated before triggering updateView. Triggering here would
                // cause a race condition where getFlowModel runs before the cache is refreshed.
                console.log('[Webview] Sending update notification to webview');
                sendUpdateNotificationToWebview();
            } else if (remoteBalFileModified && uriCache) {
                const remoteUriKey = document.document.uri.toString();
                if (this._remoteSyncInProgress.has(remoteUriKey)) {
                    // Skip re-entrant sync for the same remote document.
                    return;
                }

                this._remoteSyncInProgress.add(remoteUriKey);
                try {
                    await uriCache.storeContent(document.document.uri, document.document.getText());
                    const cachedPath = uriCache.getLocalPath(document.document.uri);
                    const langClient = extension.ballerinaExtInstance?.langClient;
                    if (langClient && cachedPath) {
                        langClient.didChange({
                            textDocument: { uri: Uri.file(cachedPath).toString(), version: document.document.version },
                            contentChanges: [{ text: document.document.getText() }]
                        });
                    }
                    // Only trigger a view refresh for peer-initiated changes. Local diagram edits
                    // (updateSourceCode) manage their own view update after the full operation
                    // completes. Calling updateView mid-operation reads stale project structure
                    // (pre-edit positions) which can cause a bad state-machine navigation and
                    // dispose the OCT presence listeners, stopping remote cursor syncing.
                    if (!undoRedoManager?.isBatchInProgress()) {
                        sendUpdateNotificationToWebview();
                    }
                } catch (error) {
                    console.error('[Webview] Failed to sync remote text change with LS:', error);
                } finally {
                    this._remoteSyncInProgress.delete(remoteUriKey);
                }
            } else if (configTomlModified) {
                sendUpdateNotificationToWebview(true);
            }
        }, extension.context);

        vscode.workspace.onDidSaveTextDocument(async (document) => {
            // Update cache for remote files when saved. This is a fallback for cases where
            // onDidChangeTextDocument was skipped (e.g. machineReady=false during a diagram edit).
            if (document.uri.scheme !== 'file') {
                const { uriCache } = await import('../../extension');
                if (uriCache) {
                    try {
                        await uriCache.storeContent(document.uri, document.getText());
                        const cachedPath = uriCache.getLocalPath(document.uri);
                        const langClient = extension.ballerinaExtInstance?.langClient;
                        if (langClient && cachedPath) {
                            langClient.didChange({
                                textDocument: { uri: Uri.file(cachedPath).toString(), version: document.version },
                                contentChanges: [{ text: document.getText() }]
                            });
                        }
                    } catch (error) {
                        console.error('[Webview] Failed to update cache for remote file:', error);
                    }
                }
            }
        }, extension.context);

        vscode.workspace.onDidDeleteFiles(() => {
            sendUpdateNotificationToWebview();
        });

        this._panel.onDidChangeViewState(() => {
            vscode.commands.executeCommand('setContext', 'isBalVisualizerActive', this._panel?.active);
            // Refresh the webview when becomes active
            const state = StateMachine.state();
            const popupState = StateMachinePopup.state();
            const machineReady = typeof state === 'object' && 'viewActive' in state && state.viewActive === "viewReady";
            const popupActive = typeof popupState === 'object' && 'open' in popupState && popupState.open === "active";
            if (this._panel?.active && machineReady && !popupActive) {
                sendUpdateNotificationToWebview(true);
            }
        });

        this._panel.onDidDispose(() => {
            vscode.commands.executeCommand('setContext', 'isBalVisualizerActive', false);
        });
    }

    public static get webviewTitle(): string {
        const biExtension = isInWI() || vscode.extensions.getExtension('wso2.ballerina-integrator');
        return biExtension ? VisualizerWebview.biTitle : VisualizerWebview.ballerinaTitle;
    }

    private static createWebview(): vscode.WebviewPanel {
        // If the AI panel is open, open the visualizer in column One so they don't stack in the same column.
        // ViewColumn.Active resolves to the AI panel's column when it is the active webview.
        const aiPanelOpen = AiPanelWebview.currentPanel !== undefined;
        const targetColumn = aiPanelOpen ? ViewColumn.One : ViewColumn.Active;
        const panel = vscode.window.createWebviewPanel(
            VisualizerWebview.viewType,
            VisualizerWebview.webviewTitle,
            { viewColumn: targetColumn, preserveFocus: true },
            {
                enableScripts: true,
                localResourceRoots: [Uri.file(path.join(extension.context.extensionPath, "resources"))],
                retainContextWhenHidden: true,
            }
        );
        const biExtension = isInWI() || vscode.extensions.getExtension('wso2.ballerina-integrator');
        panel.iconPath = {
            light: vscode.Uri.file(path.join(extension.context.extensionPath, 'resources', 'icons', biExtension ? 'wso2-dark.svg' : 'ballerina.svg')),
            dark: vscode.Uri.file(path.join(extension.context.extensionPath, 'resources', 'icons', biExtension ? 'wso2-light.svg' : 'ballerina-inverse.svg'))
        };
        return panel;
    }

    public getWebview(): vscode.WebviewPanel | undefined {
        return this._panel;
    }

    public static isVisualizerActive(): boolean {
        return VisualizerWebview.currentPanel?.getWebview()?.active ?? false;
    }

    private getWebviewContent(webView: Webview) {
        // Check if devant.editor extension is active
        const isDevantEditor = vscode.commands.executeCommand('getContext', 'devant.editor') !== undefined;
        
        const biExtension = isInWI() || vscode.extensions.getExtension('wso2.ballerina-integrator');
        const body = `<div class="container" id="webview-container">
                <div class="loader-wrapper">
                    <div class="welcome-content">
                        <div class="logo-container">
                            <div class="loader"></div>
                        </div>
                        <h1 class="welcome-title">${biExtension ? VisualizerWebview.biTitle : VisualizerWebview.ballerinaTitle}</h1>
                        <p class="welcome-subtitle">Setting up your workspace and tools</p>
                        <div class="loading-text">
                            <span class="loading-dots">Loading</span>
                        </div>
                    </div>
                </div>
            </div>`;
        const bodyCss = ``;
        const styles = `
            .container {
                background-color: var(--vscode-editor-background);
                height: 100vh;
                width: 100%;
                display: flex;
            }
            .loader-wrapper {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                width: 100%;
            }
            .loader {
                width: 28px;
                aspect-ratio: 1;
                border-radius: 50%;
                border: 5px solid var(--vscode-progressBar-background);
                animation:
                    l20-1 0.5s infinite linear alternate,
                    l20-2 1s infinite linear;
            }
            @keyframes l20-1{
                0%    {clip-path: polygon(50% 50%,0       0,  50%   0%,  50%    0%, 50%    0%, 50%    0%, 50%    0% )}
                12.5% {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100%   0%, 100%   0%, 100%   0% )}
                25%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 100% 100%, 100% 100% )}
                50%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
                62.5% {clip-path: polygon(50% 50%,100%    0, 100%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
                75%   {clip-path: polygon(50% 50%,100% 100%, 100% 100%,  100% 100%, 100% 100%, 50%  100%, 0%   100% )}
                100%  {clip-path: polygon(50% 50%,50%  100%,  50% 100%,   50% 100%,  50% 100%, 50%  100%, 0%   100% )}
            }
            @keyframes l20-2{ 
                0%    {transform:scaleY(1)  rotate(0deg)}
                49.99%{transform:scaleY(1)  rotate(135deg)}
                50%   {transform:scaleY(-1) rotate(0deg)}
                100%  {transform:scaleY(-1) rotate(-135deg)}
            }
            /* New welcome view styles */
            .welcome-content {
                text-align: center;
                max-width: 500px;
                padding: 2rem;
                animation: fadeIn 1s ease-in-out;
                font-family: var(--vscode-font-family);
            }
            .logo-container {
                display: flex;
                justify-content: center;
            }
            .welcome-title {
                color: var(--vscode-foreground);
                margin: 1.5rem 0 0.5rem 0;
                letter-spacing: -0.02em;
                font-size: 1.5em;
                font-weight: 400;
                line-height: normal;
            }
            .welcome-subtitle {
                color: var(--vscode-descriptionForeground);
                font-size: 13px;
                margin: 0 0 2rem 0;
                opacity: 0.8;
            }
            .loading-text {
                color: var(--vscode-button-background);
                font-size: 13px;
                font-weight: 500;
            }
            .loading-dots::after {
                content: '';
                animation: dots 1.5s infinite;
            }
            @keyframes fadeIn {
                0% { 
                    opacity: 0;
                }
                100% { 
                    opacity: 1;
                }
            }
            @keyframes dots {
                0%, 20% { content: ''; }
                40% { content: '.'; }
                60% { content: '..'; }
                80%, 100% { content: '...'; }
            }
        `;
        const scripts = `
            // Flag to check if devant.editor is active
            window.isDevantEditor = ${isDevantEditor};
            
            function loadedScript() {
                function renderDiagrams() {
                    visualizerWebview.renderWebview("visualizer", document.getElementById("webview-container"));
                }
                renderDiagrams();
            }
        `;

        const webViewOptions: WebViewOptions = {
            ...getComposerWebViewOptions("Visualizer", webView),
            body,
            scripts,
            styles,
            bodyCss,
        };

        return getLibraryWebViewContent(webViewOptions, webView);
    }

    public dispose() {
        approvalViewManager.onVisualizerClosed();
        clearFormState();

        VisualizerWebview.currentPanel = undefined;
        this._panel?.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }

        this._panel = undefined;
        StateMachine.resetToExtensionReady();
    }
}