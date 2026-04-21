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

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { Uri, ViewColumn, WebviewPanel } from 'vscode';
import { parseDocument, LineCounter } from 'yaml';
import { parseTree, findNodeAtLocation, Node as JsonNode } from 'jsonc-parser';
import { extension } from '../APIDesignerExtensionContext';
import { getComposerJSFiles } from '../util';
import { logDebug, logError, logInfo, logWarning } from '../util/logger';
import { validateAPISpec } from '../utils/validation-utils';
import { SpecContentManager } from '../rpc-managers/api-designer-visualizer/managers/spec-content-manager';
import { GovernanceManager } from '../rpc-managers/api-designer-visualizer/managers/governance-manager';
import { ProjectManager } from '../rpc-managers/api-designer-visualizer/managers/project-manager';
import { RPCLayer } from '../RPCLayer';
import { 
    detectSpecType, 
    SpecificationFactory, 
    ApiSpecType,
    SpecificationService,
    loadYaml,
    buildGenerateAPISpecPrompt
} from '@wso2/api-designer-core';
import { AIProviderFactory } from '../ai/ai-provider-factory';
import { syncApiDesignerTreeSelection } from '../activity-bar/api-projects';

/**
 * Tracks which files have had their designer panel manually closed
 */
const closedPanelFiles = new Set<string>();

/**
 * Generate a nonce for Content Security Policy
 */
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

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
    private readonly specContentManager = new SpecContentManager();
    private readonly projectManager = new ProjectManager(this.specContentManager);
    private readonly governanceManager = new GovernanceManager();
    private _lastSavedContent: string | null = null;
    private _isSavingFromWebview: boolean = false;
    private _saveDebounceTimer: NodeJS.Timeout | undefined;
    /** Watches workspace until user saves an OpenAPI file after Create-with-AI, or timeout / dismiss. */
    private _copilotCreateWatchDisposable: vscode.Disposable | undefined;
    private _copilotCreateFallbackTimer: ReturnType<typeof setTimeout> | undefined;
    private _viewType: string;
    private _lastSpec: unknown = null;
    private _specType: ApiSpecType | null = null;
    private _specService: SpecificationService | null = null;

    constructor(filePath: string | undefined, existingPanel?: WebviewPanel, viewType?: string) {
        // For 'create' view, filePath can be undefined
        this._currentFilePath = filePath;
        this._viewType = viewType || (filePath ? 'preview' : 'create');
        
        // Detect specification type from file (async, but don't await - happens in background)
        // Only if we have a filePath
        if (filePath) {
            this.detectSpecificationType(filePath);
        }
        
        this._panel = existingPanel ?? ApiDesignerPanel.createWebview();
        if (existingPanel) {
            this._panel.title = "API Designer";
            this._panel.iconPath = {
                light: Uri.file(path.join(extension.context.extensionPath, 'assets', 'light-icon.svg')),
                dark: Uri.file(path.join(extension.context.extensionPath, 'assets', 'dark-icon.svg'))
            };
            this._panel.webview.options = {
                enableScripts: true,
                localResourceRoots: [
                    Uri.file(os.homedir())
                ]
            };
            // Don't reset HTML if reusing an existing panel - it will cause React to remount
            // The webview content is already set up and we just need to switch the view type
        } else {
            // Only set HTML for new panels
            this._panel.webview.html = this.getWebviewContent(this._panel.webview);
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
        
        // Send initial state to webview IMMEDIATELY (no delay) to ensure views have it when they mount
        const sendInitialState = () => {
            if (this._panel && !this._isDisposed) {
                // For 'create' view, no fileUri is needed - just send the viewType and default folder
                if (this._viewType === 'create') {
                    this._panel.webview.postMessage({
                        command: 'switchView',
                        viewType: 'create'
                    });
                    // Also send default folder for create view
                    this.postDefaultFolder();
                } else if (this._currentFilePath) {
                    // For other views, send fileUri first
                    this._panel.webview.postMessage({
                        command: 'setFileUri',
                        data: this._currentFilePath
                    });
                    // Then send the appropriate view command
                    if (!this._viewType || this._viewType === 'preview' || this._viewType === 'design') {
                        this._panel.webview.postMessage({
                            command: 'switchToEditor',
                            filePath: this._currentFilePath
                        });
                    } else {
                        // Send the correct viewType for other views
                        // Send fileUri separately first to ensure it's set before viewType
                        this._panel.webview.postMessage({
                            command: 'setFileUri',
                            data: this._currentFilePath
                        });
                        // Small delay to ensure fileUri message is processed first
                        setTimeout(() => {
                            if (this._panel && !this._isDisposed) {
                                this._panel.webview.postMessage({
                                    command: 'switchView',
                                    viewType: this._viewType,
                                    fileUri: this._currentFilePath
                                });
                            }
                        }, 10);
                    }
                }
            }
        };
        
        // Send immediately - views need state as soon as possible
        sendInitialState();
        
        // Also send again after a short delay to catch any race conditions
        setTimeout(sendInitialState, 100);
        
        // Restore state when panel becomes visible (e.g., when switching back to tab)
        this._panel.onDidChangeViewState((e) => {
            if (e.webviewPanel.visible && !this._isDisposed) {
                setTimeout(() => this.scheduleSyncActivityBarTree(), 150);
                // Panel became visible - restore fileUri and viewType
                setTimeout(() => {
                    if (this._currentFilePath && this._panel && !this._isDisposed) {
                        this._panel.webview.postMessage({
                            command: 'setFileUri',
                            data: this._currentFilePath
                        });
                        // Restore the current viewType (don't force preview mode)
                        if (this._viewType) {
                            this._panel.webview.postMessage({
                                command: 'switchView',
                                viewType: this._viewType,
                                fileUri: this._currentFilePath
                            });
                            // Only send switchToEditor for preview/design views
                            if (this._viewType === 'preview' || this._viewType === 'design') {
                                this._panel.webview.postMessage({
                                    command: 'switchToEditor',
                                    filePath: this._currentFilePath
                                });
                            }
                        } else {
                            // If no viewType is set, default to preview
                            this._panel.webview.postMessage({
                                command: 'switchToEditor',
                                filePath: this._currentFilePath
                            });
                        }
                    }
                }, 100);
            }
        }, null, this._disposables);

        // Handle webview messages
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'openAIChat':
                    case 'openCopilotChat': // Backward compatibility - will be removed
                        this.openAIChat(message.data?.context, message.data?.prompt);
                        break;
                    case 'updatePreview':
                        this.updatePreview(message.data);
                        break;
                    case 'saveSpec':
                        await this.saveSpecToFile(message.data);
                        break;
                    case 'navigateTo':
                        this.navigateToPath(message.data?.focusPath);
                        break;
                    case 'requestValidation':
                        await this.sendValidationData();
                        break;
                    case 'requestAIReadiness':
                        await this.sendAIReadinessData();
                        break;
                    case 'switchView':
                        // Handle view switching from webview
                        if (message.viewType) {
                            const incoming = String(message.viewType);
                            // updateViewType no-ops when unchanged and skips tree sync — still align the tree
                            if (this._viewType === incoming) {
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
                        if (this._currentFilePath && this._panel && !this._isDisposed) {
                            logDebug(`ApiDesignerPanel: Sending fileUri in response to requestFileUri: ${this._currentFilePath}`);
                            this._panel.webview.postMessage({
                                command: 'setFileUri',
                                data: this._currentFilePath
                            });
                            // Also send switchToEditor to ensure we're in preview mode
                            this._panel.webview.postMessage({
                                command: 'switchToEditor',
                                filePath: this._currentFilePath
                            });
                        }
                        break;
                    case 'getDefaultFolder':
                        // Send default folder (workspace root) to webview
                        this.postDefaultFolder();
                        break;
                    case 'selectFolder':
                        // Handle folder selection request
                        this.handleSelectFolder();
                        break;
                    case 'createFromTemplate':
                        // Handle creating API spec from template
                        await this.handleCreateFromTemplate(message.data);
                        break;
                    case 'createFromCopilot':
                        // Handle creating API spec with AI/Copilot
                        await this.handleCreateFromCopilot(message.data);
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
        if (this._viewType === 'create' || !this._currentFilePath) {
            return;
        }
        void syncApiDesignerTreeSelection(vscode.Uri.file(this._currentFilePath), this._viewType);
    }

    /**
     * Detect specification type from file content
     */
    private async detectSpecificationType(filePath: string): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const content = document.getText();
            
            if (content && content.trim().length > 0) {
                const detection = detectSpecType(content);
                
                if (detection.type) {
                    this._specType = detection.type;
                    this._specService = SpecificationFactory.getService(detection.type);
                    logDebug(`ApiDesignerPanel: Detected ${detection.type} specification (v${detection.version || 'unknown'}, confidence: ${detection.confidence})`);
                } else {
                    logWarning(`ApiDesignerPanel: Could not detect specification type for ${filePath}`);
                }
            }
        } catch (error) {
            logError(`ApiDesignerPanel: Error detecting spec type: ${error}`);
        }
    }

    /**
     * Get the current specification type
     */
    public getSpecType(): ApiSpecType | null {
        return this._specType;
    }

    /**
     * Get the specification service
     */
    public getSpecService(): SpecificationService | null {
        return this._specService;
    }

    public getCurrentFilePath(): string | undefined {
        return this._currentFilePath;
    }

    private async saveSpecToFile(data: any): Promise<void> {
        if (!this._currentFilePath) {
            return;
        }
        try {
            const fileUri = vscode.Uri.file(this._currentFilePath);
            const ext = path.extname(this._currentFilePath).toLowerCase();
            let content: string;
            if (ext === '.yaml' || ext === '.yml') {
                content = yaml.dump(data, { noRefs: true, lineWidth: 120 });
            } else {
                content = JSON.stringify(data, null, 2);
            }

            // Check if content actually changed to avoid unnecessary saves
            if (this._lastSavedContent === content) {
                return;
            }

            // Mark that we're saving from webview to prevent circular updates
            this._isSavingFromWebview = true;
            this._lastSavedContent = content;

            // Debounce saves to prevent rapid file writes
            if (this._saveDebounceTimer) {
                clearTimeout(this._saveDebounceTimer);
            }

            this._saveDebounceTimer = setTimeout(async () => {
                try {
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));

                    // Update preview without triggering file watcher
                    // Don't call updatePreview here as it will be handled by the file watcher
                    // but we mark it as our save so the watcher can skip it
                    
                    // Refresh validation and AI readiness after file is saved
                    // Use a delay to ensure file is fully written and flushed
                    setTimeout(async () => {
                        if (!this._isDisposed && this._panel) {
                            await this.sendValidationData();
                            await this.sendAIReadinessData();
                        }
                    }, 500);
                } catch (err) {
                    logError('ApiDesignerPanel: Failed to save spec', err);
                    vscode.window.showErrorMessage('Failed to save API specification.');
                } finally {
                    // Reset flag after a short delay to allow file watcher to see it
                    setTimeout(() => {
                        this._isSavingFromWebview = false;
                    }, 500);
                }
            }, 300);
        } catch (err) {
            logError('ApiDesignerPanel: Failed to save spec', err);
            vscode.window.showErrorMessage('Failed to save API specification.');
            this._isSavingFromWebview = false;
        }
    }

    public isSavingFromWebview(): boolean {
        return this._isSavingFromWebview;
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
                    vscode.Uri.file(os.homedir())
                ]
            }
        );
        panel.iconPath = {
            light: Uri.file(path.join(extension.context.extensionPath, 'assets', 'light-icon.svg')),
            dark: Uri.file(path.join(extension.context.extensionPath, 'assets', 'dark-icon.svg'))
        };
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
        
        // Store reference to avoid accessing disposed object
        const panel = this._panel;
        
        try {
            // Handle 'create' view - no fileUri needed
            if (newViewType === 'create') {
                panel.webview.postMessage({
                    command: 'switchView',
                    viewType: 'create'
                });
                this.scheduleSyncActivityBarTree();
                return;
            }
            
            // For other views, we need fileUri
            if (!this._currentFilePath) {
                logDebug(`ApiDesignerPanel: Cannot switch to ${newViewType} - no file path available`);
                return;
            }
            
            // CRITICAL: Send fileUri MULTIPLE TIMES to ensure views receive it
            // This handles race conditions where views mount before messages arrive
            // Send fileUri immediately (no delay) - FIRST
            panel.webview.postMessage({
                command: 'setFileUri',
                data: this._currentFilePath
            });
            
            // Send again after a tiny delay to catch any race conditions
            setTimeout(() => {
                if (this._panel && !this._isDisposed) {
                    this._panel.webview.postMessage({
                        command: 'setFileUri',
                        data: this._currentFilePath
                    });
                }
            }, 50);
            
            // Send fileUri again to ensure it's set, then send view type change
            // Use a small delay to ensure fileUri is processed before viewType
            setTimeout(() => {
                if (this._panel && !this._isDisposed) {
                    this._panel.webview.postMessage({
                        command: 'switchView',
                        viewType: newViewType,
                        fileUri: this._currentFilePath
                    });
                }
            }, 10);
            
            // Also send switchToEditor to ensure preview/design views load properly
            if (newViewType === 'preview' || newViewType === 'design') {
                panel.webview.postMessage({
                    command: 'switchToEditor',
                    filePath: this._currentFilePath
                });
                
                // If we have a cached spec, send it immediately (no delay)
                // This ensures the view has data right away
                if (this._lastSpec) {
                    panel.webview.postMessage({
                        command: 'updateSpec',
                        data: this._lastSpec,
                        specType: this._specType
                    });
                } else {
                    // If no cached spec, load it from file immediately
                    this.loadAndSendSpec(this._currentFilePath, panel);
                }
            }
            this.scheduleSyncActivityBarTree();
        } catch (error) {
            // Webview was disposed between our check and usage - this is OK, just ignore
            // Mark as disposed to prevent future attempts
            this._isDisposed = true;
        }
    }

    public updatePreview(data: unknown) {
        // Early exit if disposed
        if (this._isDisposed || !this._panel) {
            return;
        }
        
        // Re-detect spec type if needed (in case content changed)
        if (!this._specType && data && typeof data === 'object' && data !== null) {
            const dataObj = data as Record<string, unknown>;
            if ('openapi' in dataObj) {
                this._specType = ApiSpecType.OPENAPI;
                this._specService = SpecificationFactory.getService(ApiSpecType.OPENAPI);
                logDebug('ApiDesignerPanel: Detected OpenAPI from preview data');
            } else if ('asyncapi' in dataObj) {
                this._specType = ApiSpecType.ASYNCAPI;
                this._specService = SpecificationFactory.getService(ApiSpecType.ASYNCAPI);
                logDebug('ApiDesignerPanel: Detected AsyncAPI from preview data');
            }
        }
        
        // Store the last spec for later use when switching views
        this._lastSpec = data;
        
        // Store reference to avoid accessing disposed object
        const panel = this._panel;
        
        try {
            panel.webview.postMessage({
                command: 'updateSpec',
                data: data,
                specType: this._specType // Send spec type to frontend
            });
            
            // Also refresh validation data when spec is updated (e.g., when file is saved externally)
            // Use a small delay to ensure the file is fully saved before validating
            setTimeout(() => {
                if (!this._isDisposed && this._panel) {
                    this.sendValidationData();
                    this.sendAIReadinessData();
                }
            }, 300);
        } catch (error) {
            // Webview was disposed between our check and usage - this is OK, just ignore
            // Mark as disposed to prevent future attempts
            this._isDisposed = true;
        }
    }

    public notifySpecParseError(message: string) {
        if (this._isDisposed || !this._panel) {
            return;
        }

        try {
            this._panel.webview.postMessage({
                command: 'specParseError',
                data: {
                    message
                }
            });
        } catch {
            this._isDisposed = true;
        }
    }

    /**
     * Load spec from file and send it to webview immediately
     * Used when switching to preview/design view to ensure data is available
     */
    private async loadAndSendSpec(filePath: string, panel: vscode.WebviewPanel): Promise<void> {
        try {
            const response = await this.specContentManager.getAPISpecContent({ filePath });
            if (response.content) {
                let parsed: any;
                if (response.type === 'json') {
                    parsed = JSON.parse(response.content);
                } else {
                    parsed = loadYaml(response.content);
                }
                
                if (parsed) {
                    // Detect and store spec type
                    if (parsed.openapi) {
                        this._specType = ApiSpecType.OPENAPI;
                        this._specService = SpecificationFactory.getService(ApiSpecType.OPENAPI);
                    } else if (parsed.asyncapi) {
                        this._specType = ApiSpecType.ASYNCAPI;
                        this._specService = SpecificationFactory.getService(ApiSpecType.ASYNCAPI);
                    }
                    
                    // Store for future use
                    this._lastSpec = parsed;
                    
                    // Send immediately to webview
                    panel.webview.postMessage({
                        command: 'updateSpec',
                        data: parsed,
                        specType: this._specType
                    });
                }
            }
        } catch (error) {
            logError('ApiDesignerPanel: Failed to load and send spec', error);
        }
    }

    private async navigateToPath(rawFocusPath?: Array<string | number>) {
        if (!this._currentFilePath) {
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(this._currentFilePath);

            let editor = vscode.window.visibleTextEditors.find(
                (visibleEditor) => visibleEditor.document.uri.fsPath === document.uri.fsPath
            );

            if (!editor) {
                editor = await vscode.window.showTextDocument(document, { preview: false });
            } else {
                editor = await vscode.window.showTextDocument(
                    document,
                    {
                        viewColumn: editor.viewColumn,
                        preserveFocus: false,
                        preview: false
                    }
                );
            }

            const focusPath = Array.isArray(rawFocusPath) ? rawFocusPath : [];
            const keySegment = this.extractKeyFromPath(focusPath);
            let targetRange: vscode.Range | undefined;

            if (focusPath.length > 0) {
                const fileExtension = path.extname(this._currentFilePath).toLowerCase();
                if (fileExtension === '.json') {
                    targetRange = this.resolveJsonRange(document, focusPath);
                } else {
                    targetRange = this.resolveYamlRange(document, focusPath);
                }

                if (!targetRange) {
                    let fallbackKey: string | undefined;
                    for (let index = focusPath.length - 1; index >= 0; index--) {
                        const segment = focusPath[index];
                        if (typeof segment === 'string') {
                            fallbackKey = segment;
                            break;
                        }
                    }
                    if (fallbackKey) {
                        targetRange = this.findFirstOccurrence(document, fallbackKey);
                    }
                }
            }

            if (!targetRange) {
                targetRange = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
            }

            const keyPosition = keySegment
                ? this.tryResolveKeyPosition(document, keySegment, targetRange)
                : targetRange.start;

            editor.selection = new vscode.Selection(keyPosition, keyPosition);
            editor.revealRange(targetRange, vscode.TextEditorRevealType.InCenter);
        } catch (error) {
            logError('ApiDesignerPanel: Failed to navigate to path', error);
        }
    }

    private resolveYamlRange(document: vscode.TextDocument, focusPath: Array<string | number>): vscode.Range | undefined {
        try {
            const text = document.getText();
            const lineCounter = new LineCounter();
            const yamlDoc = parseDocument(text, { lineCounter });

            const pathStack = [...focusPath];
            let node: any = yamlDoc.getIn(pathStack, true);

            while (!node && pathStack.length > 0) {
                pathStack.pop();
                node = yamlDoc.getIn(pathStack, true);
            }

            if (!node) {
                return undefined;
            }

            let startOffset: number | undefined;
            let endOffset: number | undefined;

            if (node.range) {
                startOffset = node.range[0];
                endOffset = node.range[1] ?? node.range[0];
            }

            if ((!startOffset || !endOffset) && node.cstNode?.range) {
                startOffset = node.cstNode.range.start;
                endOffset = node.cstNode.range.end ?? node.cstNode.range.start;
            }

            if (startOffset === undefined || endOffset === undefined) {
                return undefined;
            }

            const startPosition = lineCounter.linePos(startOffset);
            const endPosition = lineCounter.linePos(endOffset);

            const start = new vscode.Position(Math.max(0, startPosition.line - 1), Math.max(0, startPosition.col - 1));
            const end = new vscode.Position(Math.max(0, endPosition.line - 1), Math.max(0, endPosition.col - 1));

            return new vscode.Range(start, end);
        } catch (error) {
            logError('ApiDesignerPanel: Failed to resolve YAML range', error);
            return undefined;
        }
    }

    private resolveJsonRange(document: vscode.TextDocument, focusPath: Array<string | number>): vscode.Range | undefined {
        try {
            const text = document.getText();
            const tree = parseTree(text);

            if (!tree) {
                return undefined;
            }

            const pathStack = [...focusPath];
            let node: JsonNode | undefined | null = findNodeAtLocation(tree, pathStack);

            while (!node && pathStack.length > 0) {
                pathStack.pop();
                node = findNodeAtLocation(tree, pathStack);
            }

            if (!node) {
                return undefined;
            }

            const start = document.positionAt(node.offset);
            const end = document.positionAt(node.offset + node.length);
            return new vscode.Range(start, end);
        } catch (error) {
            logError('ApiDesignerPanel: Failed to resolve JSON range', error);
            return undefined;
        }
    }

    private findFirstOccurrence(document: vscode.TextDocument, searchTerm: string): vscode.Range | undefined {
        for (let lineIndex = 0; lineIndex < document.lineCount; lineIndex++) {
            const lineText = document.lineAt(lineIndex).text;
            const matchIndex = lineText.indexOf(searchTerm);
            if (matchIndex >= 0) {
                const position = new vscode.Position(lineIndex, matchIndex);
                return new vscode.Range(position, position);
            }
        }
        return undefined;
    }

    private extractKeyFromPath(focusPath: Array<string | number>): string | undefined {
        for (let i = focusPath.length - 1; i >= 0; i--) {
            if (typeof focusPath[i] === 'string') {
                return focusPath[i] as string;
            }
        }
        return undefined;
    }

    private tryResolveKeyPosition(
        document: vscode.TextDocument,
        key: string,
        defaultRange: vscode.Range
    ): vscode.Position {
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const keyPattern = new RegExp(`^\\s*${escapedKey}\\s*:`);

        const searchWindow = 30;
        const startLine = defaultRange.start.line;

        for (let line = startLine; line >= Math.max(0, startLine - searchWindow); line--) {
            const lineText = document.lineAt(line).text;
            if (keyPattern.test(lineText)) {
                const column = lineText.indexOf(key);
                if (column >= 0) {
                    return new vscode.Position(line, column);
                }
            }
        }

        for (let line = startLine + 1; line <= Math.min(document.lineCount - 1, startLine + searchWindow); line++) {
            const lineText = document.lineAt(line).text;
            if (keyPattern.test(lineText)) {
                const column = lineText.indexOf(key);
                if (column >= 0) {
                    return new vscode.Position(line, column);
                }
            }
        }

        return defaultRange.start;
    }

    private getWebviewContent(webview: vscode.Webview) {
        const nonce = getNonce();
        const viewType = this._viewType || 'preview';
        const initialFileUri = this._currentFilePath ?? '';
        
        // Get script URIs and add nonce to them
        const scripts = getComposerJSFiles(extension.context, 'Visualizer', webview);
        logDebug(`ApiDesignerPanel: Loading ${scripts.length} script(s): ${JSON.stringify(scripts)}`);
        logDebug(`ApiDesignerPanel: Webview content with viewType: ${viewType}`);
        
        const scriptTags = scripts
            .filter(uri => uri) // Filter out empty strings
            .map(jsFile => `<script nonce="${nonce}" charset="UTF-8" src="${jsFile}"></script>`)
            .join('\n');

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource} data:; connect-src ${webview.cspSource} ws: wss: http: https:;">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <title>API</title>
         
          <style>
            body, html, #root {
                height: 100%;
                margin: 0;
                padding: 0px;
                overflow: hidden;
            }
          </style>
          <script nonce="${nonce}">
            // CRITICAL FIX: Make acquireVsCodeApi() safe to call multiple times
            // This prevents Visualizer.js from crashing when it tries to acquire the API
            (function() {
                // Store the original function
                const originalAcquire = window.acquireVsCodeApi;
                let apiInstance = null;
                
                // Replace with a wrapper that returns the same instance every time
                window.acquireVsCodeApi = function() {
                    if (!apiInstance && originalAcquire) {
                        apiInstance = originalAcquire();
                        console.log('VS Code API acquired (first call)');
                    } else if (apiInstance) {
                        console.log('VS Code API already acquired, returning existing instance');
                    }
                    return apiInstance;
                };
                
                // Also store it globally for easy access
                window.vscodeApi = window.acquireVsCodeApi();
            })();
          </script>
          ${scriptTags}
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root"></div>
            <script nonce="${nonce}">
            (function() {
                // Render React app
                function render() {
                    if (typeof visualizerWebview !== 'undefined') {
                        try {
                            const viewType = ${JSON.stringify(viewType)};
                            const initialFileUri = ${JSON.stringify(initialFileUri)};
                            console.log('[Webview] Rendering with viewType:', viewType);
                            visualizerWebview.renderWebview(
                                document.getElementById("root"), 
                                { viewType: viewType, initialFileUri: initialFileUri }
                            );
                        } catch (e) {
                            console.error('[Webview] Error rendering webview:', e);
                        }
                    } else {
                        setTimeout(render, 100);
                    }
                }
                render();
            })();
        </script>
        </body>
        </html>
      `;
    }

    private async openAIChat(context: string, prompt: string): Promise<boolean> {
        try {
            const provider = await AIProviderFactory.getAvailableProvider();
            if (!provider) {
                vscode.window.showErrorMessage(
                    'No AI provider is available. Please install and enable an AI provider (GitHub Copilot, Claude, etc.).'
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
        // Prevent multiple disposals
        if (this._isDisposed) {
            return;
        }
        
        // Clear debounce timer
        if (this._saveDebounceTimer) {
            clearTimeout(this._saveDebounceTimer);
            this._saveDebounceTimer = undefined;
        }
        this.clearCopilotCreateAwait();

        // Mark as disposed immediately to prevent any pending operations
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
            
            // Uses spec-agnostic validation - automatically detects OpenAPI or AsyncAPI
            // and applies the appropriate Spectral ruleset
            const validationResult = await validateAPISpec(content);
            
            // Keep paths as arrays (Spectral returns arrays)
            const errors = (validationResult.errors || []).map((err: any) => ({
                path: Array.isArray(err.path) ? err.path : (err.path ? [err.path] : []),
                message: err.message || 'Unknown error'
            }));
            const warnings = (validationResult.warnings || []).map((warn: any) => ({
                path: Array.isArray(warn.path) ? warn.path : (warn.path ? [warn.path] : []),
                message: warn.message || 'Unknown warning'
            }));
            
            // Send validation data to webview
            this._panel.webview.postMessage({
                command: 'updateValidation',
                data: {
                    errorCount: validationResult.errorCount || 0,
                    warningCount: validationResult.warningCount || 0,
                    isValid: validationResult.isValid || false,
                    errors,
                    warnings
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

    /**
     * Send AI readiness data to the webview
     */
    public async sendAIReadinessData(): Promise<void> {
        if (!this._currentFilePath || this._isDisposed || !this._panel) {
            return;
        }

        try {
            const score = await this.governanceManager.calculateAIReadinessScore(this._currentFilePath);
            this._panel.webview.postMessage({
                command: 'updateAIReadiness',
                data: {
                    score: typeof score === 'number' ? score : null
                }
            });
        } catch (error) {
            logError('Error sending AI readiness data:', error);
            // Send null score on error
            this._panel?.webview.postMessage({
                command: 'updateAIReadiness',
                data: { score: null }
            });
        }
    }

    /**
     * Send default folder (workspace root) to webview
     */
    private postDefaultFolder(): void {
        if (!this._panel || this._isDisposed) {
            return;
        }

        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            this._panel.webview.postMessage({
                command: 'defaultFolder',
                path: folders[0].uri.fsPath
            });
        }
    }

    /**
     * Handle folder selection request from webview
     */
    private async handleSelectFolder(): Promise<void> {
        if (!this._panel || this._isDisposed) {
            return;
        }

        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
            return;
        }

        const selectedFolder = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Folder',
            defaultUri: folders[0].uri,
            title: 'Choose where to save your API specification file'
        });

        if (selectedFolder && selectedFolder.length > 0) {
            this._panel.webview.postMessage({
                command: 'folderSelected',
                path: selectedFolder[0].fsPath
            });
        }
    }

    /**
     * Handle creating API spec from template
     */
    private async handleCreateFromTemplate(data: {
        name: string;
        version: string;
        context?: string;
        folderPath: string;
        apiType?: ApiSpecType;
    }): Promise<void> {
        if (!this._panel || this._isDisposed) {
            return;
        }

        // Show loading state
        this._panel.webview.postMessage({
            command: 'setLoading',
            loading: true,
            message: 'Creating API specification...'
        });

        try {
            // Validate inputs
            if (!data.name || !data.version) {
                vscode.window.showErrorMessage('Please fill in all required fields');
                this._panel.webview.postMessage({
                    command: 'setLoading',
                    loading: false
                });
                return;
            }

            // Determine folder (fallback to first workspace folder if not provided)
            let folderUri: vscode.Uri | undefined;
            if (data.folderPath) {
                folderUri = vscode.Uri.file(data.folderPath);
            } else {
                const folders = vscode.workspace.workspaceFolders;
                if (folders && folders.length > 0) {
                    folderUri = folders[0].uri;
                } else {
                    vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
                    this._panel.webview.postMessage({
                        command: 'setLoading',
                        loading: false
                    });
                    return;
                }
            }
            
            // Check if folder exists
            try {
                await vscode.workspace.fs.stat(folderUri);
            } catch {
                vscode.window.showErrorMessage('Selected folder does not exist');
                this._panel.webview.postMessage({
                    command: 'setLoading',
                    loading: false
                });
                return;
            }

            // Determine API type (default to OpenAPI)
            const apiType = data.apiType || ApiSpecType.OPENAPI;
            const isOpenAPI = apiType === ApiSpecType.OPENAPI;

            // Create API spec based on type
            let apiSpec: any;
            if (isOpenAPI) {
                apiSpec = {
                    openapi: '3.0.1',
                    info: {
                        title: data.name,
                        version: data.version,
                        ...(data.context ? { description: data.context } : {})
                    },
                    paths: {}
                };
            } else {
                // AsyncAPI
                apiSpec = {
                    asyncapi: '2.6.0',
                    info: {
                        title: data.name,
                        version: data.version,
                        ...(data.context ? { description: data.context } : {})
                    },
                    channels: {}
                };
            }

            // Generate filename
            const fileName = `${data.name.toLowerCase().replace(/\s+/g, '-')}.${isOpenAPI ? 'openapi' : 'asyncapi'}.yaml`;
            const fileUri = vscode.Uri.joinPath(folderUri, fileName);

            // Check if file exists
            try {
                await vscode.workspace.fs.stat(fileUri);
                const overwrite = await vscode.window.showWarningMessage(
                    `File "${fileName}" already exists. Overwrite?`,
                    { modal: true },
                    'Overwrite',
                    'Cancel'
                );
                if (overwrite !== 'Overwrite') {
                    this._panel.webview.postMessage({
                        command: 'setLoading',
                        loading: false
                    });
                    return;
                }
            } catch {
                // File doesn't exist, continue
            }

            // Write file
            const yamlContent = this.generateYAML(apiSpec);
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(yamlContent, 'utf8'));

            // Show success message
            vscode.window.showInformationMessage(`API specification created: ${fileName}`);
            
            // Switch to preview/editor view
            const reused = await this.switchToPreview(fileUri.fsPath);
            if (!reused) {
                await vscode.commands.executeCommand('api-designer.openApiPreview', fileUri);
                this.dispose();
            }

            // Refresh explorers
            vscode.commands.executeCommand('api-designer.refreshOpenApiExplorer');
            vscode.commands.executeCommand('api-designer.refreshApiProjects');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create API spec file: ${error}`);
            this._panel.webview.postMessage({
                command: 'setLoading',
                loading: false
            });
        }
    }

    private clearCopilotCreateAwait(): void {
        if (this._copilotCreateWatchDisposable) {
            this._copilotCreateWatchDisposable.dispose();
            this._copilotCreateWatchDisposable = undefined;
        }
        if (this._copilotCreateFallbackTimer !== undefined) {
            clearTimeout(this._copilotCreateFallbackTimer);
            this._copilotCreateFallbackTimer = undefined;
        }
    }

    private parseExternalReferenceUrls(raw: unknown): string[] {
        if (raw == null) {
            return [];
        }
        const list = Array.isArray(raw)
            ? raw
            : typeof raw === 'string'
              ? raw.split(/[\r\n]+/)
              : [];
        return list
            .map((u) => String(u).trim())
            .filter((u) => u.length > 0 && /^https:\/\//i.test(u));
    }

    private isPathUnderFolder(filePath: string, folderPath: string): boolean {
        const relative = path.relative(path.normalize(folderPath), path.normalize(filePath));
        return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
    }

    /**
     * After AI chat opens, wait until the user saves a matching spec file under the target folder.
     */
    private startCopilotCreateWatch(
        targetFolderPath: string,
        expectedSpecType: ApiSpecType,
        apiTypeName: string
    ): void {
        this.clearCopilotCreateAwait();

        const rootNormalized = path.normalize(targetFolderPath);
        let handling = false;

        const tryFinish = async (uri: vscode.Uri) => {
            if (handling) {
                return;
            }
            if (!this._panel || this._isDisposed) {
                return;
            }

            const fsPath = uri.fsPath;
            if (!this.isPathUnderFolder(fsPath, rootNormalized)) {
                return;
            }
            if (!/\.(yaml|yml|json)$/i.test(fsPath)) {
                return;
            }

            handling = true;
            try {
                const bytes = await vscode.workspace.fs.readFile(uri);
                const text = Buffer.from(bytes).toString('utf8');
                const det = detectSpecType(text);
                if (!det.type || det.type !== expectedSpecType) {
                    handling = false;
                    return;
                }

                this.clearCopilotCreateAwait();
                const reused = await this.switchToPreview(fsPath);
                if (!reused) {
                    await vscode.commands.executeCommand('api-designer.openApiPreview', uri);
                    this.dispose();
                }
                vscode.commands.executeCommand('api-designer.refreshOpenApiExplorer');
                vscode.commands.executeCommand('api-designer.refreshApiProjects');
            } catch {
                handling = false;
            }
        };

        const folderUri = vscode.Uri.file(rootNormalized);
        const pattern = new vscode.RelativePattern(folderUri, '**/*.{yaml,yml,json}');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);
        watcher.onDidCreate((uri) => {
            void tryFinish(uri);
        });
        watcher.onDidChange((uri) => {
            void tryFinish(uri);
        });

        const saveSub = vscode.workspace.onDidSaveTextDocument((doc) => {
            void tryFinish(doc.uri);
        });

        this._copilotCreateWatchDisposable = vscode.Disposable.from(watcher, saveSub);

        this._copilotCreateFallbackTimer = setTimeout(() => {
            this._copilotCreateFallbackTimer = undefined;
            if (this._isDisposed || !this._panel || !this._copilotCreateWatchDisposable) {
                return;
            }
            this.clearCopilotCreateAwait();
            this._panel.webview.postMessage({
                command: 'setLoading',
                loading: false
            });
            vscode.window.showInformationMessage(
                `No new ${apiTypeName} file was detected under ${path.basename(rootNormalized)}. Save your specification as .yaml, .yml, or .json in that folder, then open it from API Projects.`
            );
        }, 3 * 60 * 1000);
    }

    /**
     * Handle creating API spec with AI/Copilot
     */
    private async handleCreateFromCopilot(data: {
        description: string;
        folderPath?: string;
        apiType?: ApiSpecType;
        /** HTTPS URLs only; public resources the model should consider. */
        externalReferenceUrls?: string[];
        /** When false, skip auto-discovery of workspace OpenAPI specs for the prompt. Default true. */
        includeWorkspaceSpecs?: boolean;
    }): Promise<void> {
        if (!this._panel || this._isDisposed) {
            return;
        }

        this.clearCopilotCreateAwait();

        try {
            if (!data.description) {
                vscode.window.showErrorMessage('Please provide a description for your API');
                return;
            }

            // Resolve target folder (fallback to first workspace folder)
            let folderPath = data.folderPath;
            if (!folderPath) {
                const folders = vscode.workspace.workspaceFolders;
                if (folders && folders.length > 0) {
                    folderPath = folders[0].uri.fsPath;
                }
            }
            if (!folderPath) {
                vscode.window.showErrorMessage(
                    'Open a workspace folder first, or choose a folder for the new API specification.'
                );
                return;
            }

            // Determine API type (default to OpenAPI)
            const apiType = data.apiType || ApiSpecType.OPENAPI;
            const apiTypeName = apiType === ApiSpecType.OPENAPI ? 'OpenAPI' : 'AsyncAPI';

            this._panel.webview.postMessage({
                command: 'setLoading',
                loading: true,
                message: `Generating ${apiTypeName} specification with GitHub Copilot...`
            });

            const externalUrls = this.parseExternalReferenceUrls(data.externalReferenceUrls);
            const useWorkspaceSearchGuidance = data.includeWorkspaceSpecs !== false;

            const prompt = buildGenerateAPISpecPrompt(data.description, folderPath, apiType, {
                useWorkspaceSearchGuidance,
                externalReferenceUrls: externalUrls
            });
            const opened = await this.openAIChat('', prompt);
            if (!opened) {
                this._panel.webview.postMessage({
                    command: 'setLoading',
                    loading: false
                });
                return;
            }
            if (!this._panel || this._isDisposed) {
                return;
            }

            this.startCopilotCreateWatch(folderPath, apiType, apiTypeName);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open AI chat: ${error}`);
            this._panel?.webview.postMessage({
                command: 'setLoading',
                loading: false
            });
        } finally {
            vscode.commands.executeCommand('api-designer.refreshApiProjects');
        }
    }

    /**
     * Generate YAML content from API spec object
     */
    private generateYAML(spec: any): string {
        const isOpenAPI = spec.openapi !== undefined;
        const specVersion = isOpenAPI ? spec.openapi : spec.asyncapi;
        const info = spec.info || {};
        
        let yaml = `${isOpenAPI ? 'openapi' : 'asyncapi'}: ${specVersion}\n`;
        yaml += `info:\n`;
        yaml += `  title: ${info.title}\n`;
        yaml += `  version: ${info.version}\n`;
        if (info.description) {
            yaml += `  description: ${info.description}\n`;
        }
        if (isOpenAPI) {
            yaml += `paths: {}\n`;
        } else {
            yaml += `channels: {}\n`;
        }
        
        return yaml;
    }

    /**
     * Switch to preview view with the created file
     * Returns true if panel was reused, false if new panel was created
     */
    private async switchToPreview(filePath: string): Promise<boolean> {
        try {
            // Load the spec first
            let spec: any = null;
            try {
                const document = await vscode.workspace.openTextDocument(filePath);
                const content = document.getText();
                if (filePath.endsWith('.json')) {
                    spec = JSON.parse(content);
                } else {
                    spec = loadYaml(content);
                }
            } catch (parseError) {
                logDebug('Error parsing spec file:', parseError);
                // Continue without spec - the editor can still open
            }

            // Update current file path
            this._currentFilePath = filePath;

            // Single navigation message: avoids clearing loading before leave-create (create form flash)
            if (this._panel && !this._isDisposed) {
                const parsedSpec = spec && (spec.openapi || spec.asyncapi) ? spec : null;
                this._panel.webview.postMessage({
                    command: 'openDesigner',
                    filePath,
                    spec: parsedSpec
                });

                // Also send updateSpec as a backup in case the component is already mounted
                if (spec && (spec.openapi || spec.asyncapi)) {
                    setTimeout(() => {
                        if (this._panel && !this._isDisposed) {
                            this._panel.webview.postMessage({
                                command: 'updateSpec',
                                data: spec
                            });
                        }
                    }, 300);
                }

                // Update view type
                this._viewType = 'preview';
                return true; // Panel was reused
            }

            return false; // Panel was not reused
        } catch (error) {
            logError('Failed to switch to preview:', error);
            vscode.window.showErrorMessage(`Failed to open API editor: ${error instanceof Error ? error.message : String(error)}`);
            this._panel?.webview.postMessage({
                command: 'setLoading',
                loading: false
            });
            return false;
        }
    }
}
