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
import * as path from 'path';
import { Uri, ViewColumn, WebviewPanel } from 'vscode';
import { extension } from '../APIDesignerExtensionContext';
import { logDebug, logError, logInfo, logWarning } from '../utils/logger';
import { GovernanceManager } from '../rpc-managers/api-designer-visualizer/managers/governance-manager';
import { RPCLayer } from '../RPCLayer';
import { ApiSpecType, SpecificationService } from '@wso2/api-designer-core';
import { AIProviderFactory } from '../ai/ai-provider-factory';
import { WebviewHtmlBuilder } from './webview-html-builder';
import { RangeNavigator } from './range-navigator';
import { SpecSerializer } from './spec-serializer';

/**
 * Tracks which files have had their designer panel manually closed
 */
const closedPanelFiles = new Set<string>();

export class ApiDesignerPanel {
    public static currentPanel: ApiDesignerPanel | undefined;
    public static readonly viewType = 'api-designer.panel';

    public static getCurrentPanel(): ApiDesignerPanel | undefined {
        return ApiDesignerPanel.currentPanel;
    }
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];
    private _currentFilePath: string | undefined;
    private _isProgrammaticDisposal: boolean = false;
    private _isDisposed: boolean = false;
    private readonly governanceManager = new GovernanceManager();
    private _viewType: string;
    private _analyzeSection: 'all' | 'ai-readiness' | 'owasp' | 'rest-api-readiness' = 'all';
    private readonly _rangeNavigator = new RangeNavigator();
    private _specSerializer!: SpecSerializer;

    constructor(filePath: string | undefined, existingPanel?: WebviewPanel, viewType?: string) {
        this._currentFilePath = filePath;
        this._viewType = viewType || 'preview';

        this._specSerializer = new SpecSerializer(
            async () => {
                if (!this._isDisposed && this._panel) {
                    await this.sendValidationData();
                }
            },
            (spec, specType) => {
                this.postWebviewMessage({ command: 'updateSpec', data: spec, specType });
            }
        );

        // Detect specification type from file (async, but don't await - happens in background)
        if (filePath) {
            void this._specSerializer.detectSpecificationType(filePath);
        }

        this._panel = existingPanel ?? ApiDesignerPanel.createWebview();
        if (existingPanel) {
            this._panel.title = "API Designer";
            // @ts-expect-error VS Code runtime supports ThemeIcon for panel icon in newer API versions.
            this._panel.iconPath = new vscode.ThemeIcon('preview');
            this._panel.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    extension.context.extensionUri
                ]
            };
            // Don't reset HTML if reusing an existing panel - it will cause React to remount
            // The webview content is already set up and we just need to switch the view type
        } else {
            // Only set HTML for new panels
            this._panel.webview.html = WebviewHtmlBuilder.build(
                this._panel.webview,
                this._viewType,
                this._currentFilePath ?? ''
            );
        }
        
        RPCLayer.create(this._panel);
        
        // Detect when user closes the panel (clicks X button)
        this._panel.onDidDispose(() => {
            // Mark as disposed immediately - this MUST be first
            this._isDisposed = true;
            
            // Clean up the current panel reference immediately
            if (ApiDesignerPanel.currentPanel === this) {
                ApiDesignerPanel.currentPanel = undefined;
            }
            
            // Only mark as user-closed if this wasn't a programmatic disposal
            if (!this._isProgrammaticDisposal && this._currentFilePath) {
                logDebug(`ApiDesignerPanel: User manually closed preview for ${this._currentFilePath}`);
                closedPanelFiles.add(this._currentFilePath);
            } else if (this._isProgrammaticDisposal) {
                logDebug(`ApiDesignerPanel: Programmatic disposal for ${this._currentFilePath}`);
            }
        }, null, this._disposables);
        
        const sendInitialState = () => {
            this.sendViewStateToWebview(this._viewType);
        };
        
        // Send immediately - views need state as soon as possible
        sendInitialState();
        
        // Retry once after a short delay to handle webview startup races.
        setTimeout(sendInitialState, 100);
        
        // Restore state when panel becomes visible (e.g., when switching back to tab)
        this._panel.onDidChangeViewState((e) => {
            if (e.webviewPanel.visible && !this._isDisposed) {
                setTimeout(() => this.scheduleSyncActivityBarTree(), 150);
                this.sendViewStateToWebview(this._viewType);
            }
        }, null, this._disposables);

        // Handle webview messages
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'openAIChat':
                        this.openAIChat(message.data?.context, message.data?.prompt);
                        break;
                    case 'updatePreview':
                        this.updatePreview(message.data);
                        break;
                    case 'saveSpec':
                        if (this._currentFilePath) {
                            await this._specSerializer.saveSpec(this._currentFilePath, message.data);
                        }
                        break;
                    case 'navigateTo':
                        void this._rangeNavigator.navigateTo(this._currentFilePath, message.data?.focusPath);
                        break;
                    case 'requestValidation':
                        await this.sendValidationData();
                        break;
                    case 'switchView':
                        // Handle view switching from webview
                        if (message.viewType) {
                            const incoming = String(message.viewType);
                            if (incoming === 'analyze') {
                                const section = message.analyzeSection;
                                if (section === 'ai-readiness' || section === 'owasp' || section === 'rest-api-readiness' || section === 'all') {
                                    this._analyzeSection = section;
                                } else {
                                    this._analyzeSection = 'all';
                                }
                            } else {
                                this._analyzeSection = 'all';
                            }
                            // updateViewType no-ops when unchanged and skips tree sync — still align the tree
                            if (this._viewType === incoming) {
                                this.sendViewStateToWebview(incoming);
                                this.scheduleSyncActivityBarTree();
                            } else {
                                this.updateViewType(incoming);
                            }
                        }
                        break;
                    case 'trackPreviewEvent':
                        logDebug(`ApiDesignerPanel: Preview interaction`, message.data);
                        break;
                    case 'webviewLog':
                        // Forward webview console logs to Extension Host
                        const level = message.level || 'info';
                        const logMessage = `[Webview] ${message.data}`;
                        if (level === 'error') {
                            logError(logMessage);
                        } else if (level === 'warn') {
                            logWarning(logMessage);
                        } else {
                            logDebug(logMessage);
                        }
                        break;
                    case 'requestFileUri':
                        // Handle request for fileUri from webview
                        if (this._currentFilePath) {
                            logDebug(`ApiDesignerPanel: Sending fileUri in response to requestFileUri: ${this._currentFilePath}`);
                            this.sendViewStateToWebview(this._viewType);
                        }
                        break;
                    case 'reevaluateLlmValidation':
                        if (this._currentFilePath) {
                            await this.governanceManager.ensureLlmValidationForFile(this._currentFilePath, { force: true });
                        }
                        break;
                }
            },
            undefined,
            this._disposables
        );

        setTimeout(() => this.scheduleSyncActivityBarTree(), 250);
    }

    /** Keep APIs tree selection aligned with the active Design / Analyze / … view */
    private scheduleSyncActivityBarTree(): void {
        // Activity bar tree sync removed; no longer needed
    }

    private postWebviewMessage(message: Record<string, unknown>): boolean {
        if (!this._panel || this._isDisposed) {
            return false;
        }
        try {
            this._panel.webview.postMessage(message);
            return true;
        } catch (error) {
            logDebug('ApiDesignerPanel: Failed to post webview message', error);
            return false;
        }
    }

    private sendViewStateToWebview(viewType: string): void {
        if (!this._currentFilePath) {
            return;
        }
        this.postWebviewMessage({
            command: 'setFileUri',
            data: this._currentFilePath
        });
        this.postWebviewMessage({
            command: 'switchView',
            viewType,
            fileUri: this._currentFilePath,
            analyzeSection: viewType === 'analyze' ? this._analyzeSection : undefined
        });
        if (viewType === 'preview' || viewType === 'design') {
            this.postWebviewMessage({
                command: 'switchToEditor',
                filePath: this._currentFilePath
            });
        }
    }

    /**
     * Get the current specification type
     */
    public getSpecType(): ApiSpecType | null {
        return this._specSerializer.getSpecType();
    }

    /**
     * Get the specification service
     */
    public getSpecService(): SpecificationService | null {
        return this._specSerializer.getSpecService();
    }

    public getCurrentFilePath(): string | undefined {
        return this._currentFilePath;
    }

    public async resolveAIFinding(data: { rule: string; pathSegments?: string[]; message?: string }): Promise<void> {
        if (!this._currentFilePath || !data?.rule) {
            return;
        }
        await this.governanceManager.resolveAIFindingForFile(this._currentFilePath, {
            rule: String(data.rule),
            pathSegments: Array.isArray(data.pathSegments) ? data.pathSegments.map((segment) => String(segment)) : [],
            message: typeof data.message === 'string' ? data.message : undefined,
        });
    }

    public async handleSaveSpecNotification(data: unknown): Promise<void> {
        if (this._currentFilePath) {
            await this._specSerializer.saveSpec(this._currentFilePath, data);
        }
    }

    public isSavingFromWebview(): boolean {
        return this._specSerializer.isSavingFromWebview();
    }

    private static createWebview(): vscode.WebviewPanel {
        const panel = vscode.window.createWebviewPanel(
            ApiDesignerPanel.viewType,
            "API Designer",
            ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    extension.context.extensionUri
                ]
            }
        );
        // @ts-expect-error VS Code runtime supports ThemeIcon for panel icon in newer API versions.
        panel.iconPath = new vscode.ThemeIcon('preview');
        return panel;
    }

    public getWebview(): vscode.WebviewPanel | undefined {
        return this._panel;
    }

    public isDisposed(): boolean {
        return this._isDisposed;
    }

    public getViewType(): string {
        return this._viewType;
    }

    public updateViewType(newViewType: string) {
        if (this._isDisposed || !this._panel || this._viewType === newViewType) {
            return;
        }

        this._viewType = newViewType;

        if (!this._currentFilePath) {
            logDebug(`ApiDesignerPanel: Cannot switch to ${newViewType} - no file path available`);
            return;
        }

        this.sendViewStateToWebview(newViewType);

        if (newViewType === 'preview' || newViewType === 'design') {
            const lastSpec = this._specSerializer.getLastSpec();
            if (lastSpec) {
                this.postWebviewMessage({
                    command: 'updateSpec',
                    data: lastSpec,
                    specType: this._specSerializer.getSpecType()
                });
            } else if (this._currentFilePath) {
                void this._specSerializer.loadAndSend(this._currentFilePath);
            }
        }
        this.scheduleSyncActivityBarTree();
    }

    public updatePreview(data: unknown) {
        if (this._isDisposed || !this._panel) {
            return;
        }

        if (data && typeof data === 'object' && data !== null) {
            this._specSerializer.updateSpecTypeFromData(data as Record<string, unknown>);
        }
        this._specSerializer.setLastSpec(data);

        this.postWebviewMessage({
            command: 'updateSpec',
            data: data,
            specType: this._specSerializer.getSpecType()
        });

        setTimeout(() => {
            if (!this._isDisposed && this._panel) {
                void this.sendValidationData();
            }
        }, 300);
    }

    public notifySpecParseError(message: string) {
        if (this._isDisposed || !this._panel) {
            return;
        }

        this.postWebviewMessage({
            command: 'specParseError',
            data: {
                message
            }
        });
    }

    public async handleNavigateToNotification(rawFocusPath?: Array<string | number>): Promise<void> {
        await this._rangeNavigator.navigateTo(this._currentFilePath, rawFocusPath);
    }

    private async openAIChat(context: string, prompt: string): Promise<boolean> {
        try {
            const provider = await AIProviderFactory.getAvailableProvider();
            if (!provider) {
                vscode.window.showErrorMessage(
                    'Configured AI provider is not available. Please install and enable an AI provider (GitHub Copilot, etc.).'
                );
                return false;
            }

            // Build file reference using #filename syntax for providers that support it
            let fileRef = '';
                if (this._currentFilePath) {
                try {
                    const fileUri = vscode.Uri.file(this._currentFilePath);
                    const wsFolder = vscode.workspace.getWorkspaceFolder(fileUri);
                    if (wsFolder) {
                        const relPath = path.relative(wsFolder.uri.fsPath, this._currentFilePath);
                        const normalizedPath = relPath.split(path.sep).join('/');
                        fileRef = `#${normalizedPath}`;
                    } else {
                        const fileName = path.basename(this._currentFilePath);
                        fileRef = `#${fileName}`;
                }
            } catch {
                // Ignore workspace resolution errors
                }
            }

            // Use provider's generate method (which opens chat for Copilot)
            const chatContext = fileRef ? `${fileRef}\n\n${context || ''}` : context || '';
            const response = await provider.generate({ context: chatContext, prompt });
            
            if (response.success) {
                logInfo(`ApiDesignerPanel: Opened ${provider.provider} chat with file reference: ${fileRef || 'none'}`);
                return true;
            }
            vscode.window.showErrorMessage(response.error || 'Failed to open AI chat');
            return false;
        } catch (error) {
            logError('ApiDesignerPanel: Failed to open AI chat', error);
            vscode.window.showErrorMessage('Failed to open AI chat. Please ensure an AI provider is installed and enabled.');
            return false;
        }
    }

    public dispose(isProgrammatic: boolean = true) {
        if (this._isDisposed) {
            return;
        }

        this._specSerializer.dispose();
        this._isDisposed = true;
        
        // Mark this as a programmatic disposal (default) unless specified otherwise
        this._isProgrammaticDisposal = isProgrammatic;
        
        // Dispose the panel first
        if (this._panel) {
            try {
                this._panel.dispose();
            } catch (e) {
                // Ignore if already disposed
            }
        }

        // Only clear currentPanel if it's us
        if (ApiDesignerPanel.currentPanel === this) {
            ApiDesignerPanel.currentPanel = undefined;
        }

        // Dispose all subscriptions
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }

        this._panel = undefined;
    }

    public static isPreviewClosed(filePath: string): boolean {
        return closedPanelFiles.has(filePath);
    }

    public static resetClosedStatus(filePath: string): void {
        closedPanelFiles.delete(filePath);
    }

    public static clearAllClosedStatus(): void {
        closedPanelFiles.clear();
    }

    /**
     * Send validation data to the webview
     */
    public async sendValidationData(): Promise<void> {
        if (!this._currentFilePath || this._isDisposed || !this._panel) {
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(this._currentFilePath);
            const content = document.getText();
            
            // Uses governance manager validation pipeline.
            const validationResult = await this.governanceManager.validateApiSpec({
                filePath: this._currentFilePath
            });
            
            // Keep paths as arrays (Spectral returns arrays); include range for snippet preview in the webview
            const errors = (validationResult.errors || []).map((err: any) => ({
                path: Array.isArray(err.path) ? err.path : (err.path ? [err.path] : []),
                message: err.message || 'Unknown error',
                ...(err.range
                    ? {
                        range: {
                            start: { line: err.range.start.line, character: err.range.start.character },
                            end: { line: err.range.end.line, character: err.range.end.character }
                        }
                    }
                    : {})
            }));
            const warnings = (validationResult.warnings || []).map((warn: any) => ({
                path: Array.isArray(warn.path) ? warn.path : (warn.path ? [warn.path] : []),
                message: warn.message || 'Unknown warning',
                ...(warn.range
                    ? {
                        range: {
                            start: { line: warn.range.start.line, character: warn.range.start.character },
                            end: { line: warn.range.end.line, character: warn.range.end.character }
                        }
                    }
                    : {})
            }));

            // Send validation data to webview (spec text matches what Spectral validated — line numbers align)
            this._panel.webview.postMessage({
                command: 'updateValidation',
                data: {
                    errorCount: validationResult.errorCount || 0,
                    warningCount: validationResult.warningCount || 0,
                    isValid: validationResult.isValid || false,
                    errors,
                    warnings,
                    specContent: content
                }
            });
        } catch (error) {
            logError('Error sending validation data:', error);
            // Send default data on error
            this._panel?.webview.postMessage({
                command: 'updateValidation',
                data: {
                    errorCount: 0,
                    warningCount: 0,
                    isValid: true,
                    errors: [],
                    warnings: []
                }
            });
        }
    }

}
