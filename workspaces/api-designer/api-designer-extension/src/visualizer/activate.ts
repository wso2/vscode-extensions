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
import { openView } from '../stateMachine';
import {
    EVENT_TYPE,
    MACHINE_VIEW,
    detectSpecType,
    isApiSpecFile,
    loadYaml,
    onDocumentFileChanged
} from '@wso2/api-designer-core';
import { ApiDesignerPanel } from './api-designer-panel';
import { logDebug } from '../util/logger';
import { RPCLayer } from '../RPCLayer';

let debounceTimer: NodeJS.Timeout | undefined;

type DesignerLaunchOptions = {
    filePath: string;
    intent?: string;
    source?: string;
};

const isDesignerLaunchOptions = (value: unknown): value is DesignerLaunchOptions => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return 'filePath' in value && typeof (value as DesignerLaunchOptions).filePath === 'string';
};

export function activateVisualizer(context: vscode.ExtensionContext) {
    // Handle file save events to update preview
    // Only update if the save didn't come from the webview to prevent circular updates
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            const filePath = document.uri.fsPath;
            const isDocumentFile = /\.(md|txt)$/i.test(filePath);
            const isInDocsFolder = filePath.includes('/docs/') || filePath.includes('\\docs\\');
            
            // Handle document files (markdown, html, txt) in docs folder
            if (isDocumentFile && isInDocsFolder) {
                // Skip if this save came from the webview to prevent circular updates
                if (ApiDesignerPanel.currentPanel?.isSavingFromWebview()) {
                    logDebug('activateVisualizer: Skipping document notification - save came from webview');
                    return;
                }
                
                // Send notification to webview
                logDebug(`activateVisualizer: Document file saved externally: ${filePath}`);
                const panel = ApiDesignerPanel.currentPanel?.getWebview();
                if (panel) {
                    // Send via RPC messenger
                    RPCLayer._messenger.sendNotification(
                        onDocumentFileChanged,
                        { type: 'webview', webviewType: ApiDesignerPanel.viewType },
                        { filePath, changeType: 'modified', timestamp: Date.now() }
                    );
                    
                    // Also send direct postMessage as fallback
                    panel.webview.postMessage({
                        command: 'documentFileChanged',
                        data: { filePath, changeType: 'modified', timestamp: Date.now() }
                    });
                    logDebug('activateVisualizer: Notifications sent for document file');
                }
                return;
            }
            
            // Handle OpenAPI specification files
            if (isApiSpecificationFile(document) && ApiDesignerPanel.currentPanel && !ApiDesignerPanel.currentPanel.isDisposed()) {
                // Skip update if this save came from the webview (validation is already refreshed there)
                if (ApiDesignerPanel.currentPanel.isSavingFromWebview()) {
                    logDebug('activateVisualizer: Skipping panel update - save came from webview');
                    return;
                }
                // Update panel content and refresh validation for external saves
                updatePanelContent(document);
                // Also refresh validation after a delay to ensure file is fully saved
                setTimeout(async () => {
                    if (ApiDesignerPanel.currentPanel && !ApiDesignerPanel.currentPanel.isDisposed()) {
                        await ApiDesignerPanel.currentPanel.sendValidationData();
                    }
                }, 500);
            }
        })
    );

    // Handle file change events (external edits) to update preview
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const document = event.document;
            if (isApiSpecificationFile(document) && ApiDesignerPanel.currentPanel && !ApiDesignerPanel.currentPanel.isDisposed()) {
                // Only update if this is an external change (not from our save)
                if (!ApiDesignerPanel.currentPanel.isSavingFromWebview()) {
                    // Debounce external changes to avoid rapid updates
                    if (debounceTimer) {
                        clearTimeout(debounceTimer);
                    }
                    debounceTimer = setTimeout(() => {
                        updatePanelContent(document);
                        setTimeout(async () => {
                            if (ApiDesignerPanel.currentPanel && !ApiDesignerPanel.currentPanel.isDisposed()) {
                                await ApiDesignerPanel.currentPanel.sendValidationData();
                            }
                        }, 600);
                    }, 500);
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("APIDesigner.openWelcome", async (input?: vscode.Uri | string | DesignerLaunchOptions) => {
            // Open the API Designer view
            let file: string | undefined;
            let launchIntent: string | undefined;
            let launchSource: string | undefined;
            const activeDocument = vscode.window.activeTextEditor?.document;
            
            if (isDesignerLaunchOptions(input)) {
                file = input.filePath;
                launchIntent = input.intent;
                launchSource = input.source;
            } else if (typeof input === 'string') {
                file = input;
            } else if (input instanceof vscode.Uri) {
                file = input.fsPath;
            } else if (activeDocument) {
                file = activeDocument.fileName;
                // If the active document is not a yaml or json file, show an error message
                if (!file.endsWith('.yaml') && !file.endsWith('.yml') && !file.endsWith('.json')) {
                    vscode.window.showErrorMessage("No API definition found to visualize");
                    return;
                }
            } else {
                vscode.window.showErrorMessage("No file found to visualize");
                return;
            }
            
            if (!file) {
                vscode.window.showErrorMessage("No file path resolved to visualize");
                return;
            }
            
            const intentForLog = launchIntent || 'overview';
            logDebug(`activateVisualizer: Launching designer for ${file} with intent=${intentForLog} source=${launchSource || 'unspecified'}`);
            
            // Close panel if open and reset its closed status
            if (ApiDesignerPanel.currentPanel) {
                ApiDesignerPanel.currentPanel.dispose();
            }
            ApiDesignerPanel.resetClosedStatus(file);
            
            // Open the full API Designer view
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Welcome, documentUri: file, identifier: launchIntent });
        })
    );
}

/**
 * Check if a document is an OpenAPI specification file
 */
function isApiSpecificationFile(document: vscode.TextDocument): boolean {
    if (document.uri.scheme === 'webview') {
        return false;
    }

    // Check file extension
    if (!isApiSpecFile(document.fileName)) {
        return false;
    }

    try {
        const content = document.getText();
        if (!content || content.trim().length === 0) {
            return false;
        }

        // Detect spec type from content
        const detection = detectSpecType(content);
        return detection.type !== null && detection.confidence !== 'low';
    } catch (error) {
        logDebug(`isApiSpecificationFile: Error reading document: ${error}`);
        return false;
    }
}

export function updatePanelContent(document: vscode.TextDocument) {
    try {
        const content = document.getText();
        
        if (!content || content.trim().length === 0) {
            return;
        }
        
        let spec: unknown;

        // Parse YAML or JSON
        if (document.fileName.endsWith('.json')) {
            spec = JSON.parse(content) as unknown;
        } else {
            spec = loadYaml(content) as unknown;
        }

        // Detect spec type
        const detection = detectSpecType(content);
        
        if (spec && typeof spec === 'object' && spec !== null && detection.type) {
            // Give the webview a moment to load before sending data
            setTimeout(() => {
                if (ApiDesignerPanel.currentPanel && !ApiDesignerPanel.currentPanel.isDisposed()) {
                    ApiDesignerPanel.currentPanel.updatePreview(spec);
                }
            }, 250);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (ApiDesignerPanel.currentPanel && !ApiDesignerPanel.currentPanel.isDisposed()) {
            ApiDesignerPanel.currentPanel.notifySpecParseError(errorMessage);
        }
    }
}
