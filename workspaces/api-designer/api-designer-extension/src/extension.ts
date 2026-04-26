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
import { StateMachine } from './stateMachine';
import { extension } from './APIDesignerExtensionContext';
import { activate as activateHistory } from './history';
import { activateVisualizer, updatePanelContent } from './visualizer/activate';
import { RPCLayer } from './RPCLayer';
import { initLogger, logInfo, disposeLogger } from './util/logger';
import { ApiDesignerPanel } from './visualizer/api-designer-panel';
import { initializeSpectralRulesetAutomation } from './spectral/rulesetAutomation';
import { registerMCPTools } from './tools/mcp-tools';
import { detectSpecType, ApiSpecType } from '@wso2/api-designer-core';

class ApiDesignerCodeLensProvider implements vscode.CodeLensProvider {
	provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		if (!isApiSpecificationFile(document)) {
			return [];
		}

		const topOfFile = new vscode.Range(0, 0, 0, 0);
		return [
			new vscode.CodeLens(topOfFile, {
				title: 'Open in API Designer',
				command: 'APIDesigner.openApiDesigner',
				arguments: [document.uri]
			})
		];
	}
}

function notifyOpenApiFile(document: vscode.TextDocument): void {
	if (!isApiSpecificationFile(document)) {
		return;
	}
	const config = vscode.workspace.getConfiguration('apiDesigner');
	if (!config.get<boolean>('notifyOnOpen', true)) {
		return;
	}

	vscode.window.showInformationMessage(
		'This file is an API specification. Open it in API Designer?',
		'Open in API Designer',
		"Don't show again"
	).then(selection => {
		if (selection === 'Open in API Designer') {
			vscode.commands.executeCommand('APIDesigner.openApiDesigner', document.uri);
		} else if (selection === "Don't show again") {
			config.update('notifyOnOpen', false, vscode.ConfigurationTarget.Global);
		}
	});
}

export async function activate(context: vscode.ExtensionContext) {
	// Initialize logger first
	initLogger();
	logInfo('API Designer extension activating...');

	extension.context = context;

	// Initial check for the active document
	checkDocumentForApiSpec(vscode.window.activeTextEditor?.document);
	if (vscode.window.activeTextEditor?.document) {
		notifyOpenApiFile(vscode.window.activeTextEditor.document);
	}

	// Add event listeners for document changes and focus
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => checkDocumentForApiSpec(event.document)),
		vscode.window.onDidChangeActiveTextEditor(editor => {
			checkDocumentForApiSpec(editor?.document);
			if (editor?.document) {
				notifyOpenApiFile(editor.document);
			}
		})
	);

	const codeLensSelector: vscode.DocumentSelector = [
		{ language: 'yaml', scheme: 'file' },
		{ language: 'json', scheme: 'file' }
	];
	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider(codeLensSelector, new ApiDesignerCodeLensProvider())
	);

	RPCLayer.init();
	activateHistory();
	activateVisualizer(context);
	StateMachine.initialize();
	initializeSpectralRulesetAutomation(context);
	
	// Register MCP tools for Language Model API
	registerMCPTools(context);
	
	// Register command to open the Create API panel - now uses unified panel
	let createOpenAPIPanelDisposable = vscode.commands.registerCommand('api-designer.createAPIFromPanel', () => {
		// Use the unified panel with 'create' viewType
		vscode.commands.executeCommand('APIDesigner.openApiDesigner', undefined, 'create');
	});
	context.subscriptions.push(createOpenAPIPanelDisposable);

	// Register the showCode command
	let showCodeDisposable = vscode.commands.registerCommand('APIDesigner.showCode', showCode);
	context.subscriptions.push(showCodeDisposable);

	// Register the openApiDesigner command with argument normalization
	// VS Code may pass arguments from TreeItem commands in unexpected formats
	let openApiDesignerDisposable = vscode.commands.registerCommand('APIDesigner.openApiDesigner', (...args: any[]) => {
		let uri: vscode.Uri | undefined;
		let viewType: string | undefined;
		
		if (args.length === 0) {
			return openApiDesigner(undefined, undefined);
		} else if (args.length === 1) {
			if (args[0] instanceof vscode.Uri) {
				uri = args[0];
			} else if (Array.isArray(args[0]) && args[0].length > 0) {
				uri = args[0][0] instanceof vscode.Uri ? args[0][0] : undefined;
				viewType = typeof args[0][1] === 'string' ? args[0][1] : undefined;
			}
		} else {
			uri = args[0] instanceof vscode.Uri ? args[0] : undefined;
			viewType = typeof args[1] === 'string' ? args[1] : undefined;
		}
		
		return openApiDesigner(uri, viewType);
	});
	context.subscriptions.push(openApiDesignerDisposable);

	// Register API Preview commands
	context.subscriptions.push(
		vscode.commands.registerCommand('api-designer.openApiPreview', async (uri: vscode.Uri) => {
			if (uri) {
				await vscode.commands.executeCommand('APIDesigner.openApiDesigner', uri);
			}
		})
	);

}

function checkDocumentForApiSpec(document?: vscode.TextDocument) {
	if (!document) {
		vscode.commands.executeCommand('setContext', 'isFileOpenAPI', undefined);
		return;
	}

	// Check if the document is a webview
	if (document.uri.scheme === 'webview') {
		vscode.commands.executeCommand('setContext', 'isFileOpenAPI', undefined);
		return;
	}

	// Check if it's an OpenAPI spec file by detecting spec type
	const content = document.getText();
	const detection = detectSpecType(content);
	const isApiSpec = detection.type === ApiSpecType.OPENAPI;
	vscode.commands.executeCommand('setContext', 'isFileOpenAPI', isApiSpec);
}

/**
 * Check if the current editor is an OpenAPI spec file
 */
function isApiSpecificationFile(document?: vscode.TextDocument): boolean {
	if (!document) {
		return false;
	}

	// Skip webview documents
	if (document.uri.scheme === 'webview') {
		return false;
	}

	// Use the core detection utility to check content
	const content = document.getText();
	const detection = detectSpecType(content);
	return detection.type === ApiSpecType.OPENAPI;
}

async function showCode() {
	const documentUri = StateMachine.context().documentUri;
	if (documentUri) {
		await vscode.workspace.openTextDocument(documentUri).then(doc => vscode.window.showTextDocument(doc));
	}
}

async function openApiDesigner(uri?: vscode.Uri, viewType?: string) {
	// Handle 'create' view - no file needed
	if (viewType === 'create') {
		const currentPanel = ApiDesignerPanel.currentPanel;
		
		// If there's already a panel, just switch to create view
		if (currentPanel && !currentPanel.isDisposed()) {
			const panel = currentPanel.getWebview();
			if (panel) {
				panel.reveal();
			}
			currentPanel.updateViewType('create');
			return;
		}
		
		// Create new panel for create view (no filePath needed)
		if (!ApiDesignerPanel.currentPanel) {
			ApiDesignerPanel.currentPanel = new ApiDesignerPanel(undefined, undefined, 'create');
		}
		return;
	}
	
	// For other views, we need a file
	let document: vscode.TextDocument;
	
	// If URI is provided, open that document
	if (uri) {
		try {
			document = await vscode.workspace.openTextDocument(uri);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open file: ${error}`);
			return;
		}
	} else {
		// Otherwise, use the active editor
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showWarningMessage('No active editor found');
			return;
		}
		document = activeEditor.document;
	}

	if (!isApiSpecificationFile(document)) {
		vscode.window.showWarningMessage('The current file is not an OpenAPI specification');
		return;
	}

	const filePath = document.fileName;
	
	// Reset the closed status so the preview will show even if user previously closed it
	ApiDesignerPanel.resetClosedStatus(filePath);
	
	const currentPanel = ApiDesignerPanel.currentPanel;
	const currentFilePath = currentPanel?.getCurrentFilePath();
	const isSameFile = currentPanel && !currentPanel.isDisposed() && currentFilePath === filePath;
	
	// If there's already a preview for this file, just update it
	if (isSameFile) {
		const panel = currentPanel.getWebview();
		if (panel) {
			panel.reveal();
		}
		updatePanelContent(document);
		
		// Update view type if it changed
		if (viewType && currentPanel.getViewType() !== viewType) {
			currentPanel.updateViewType(viewType);
		}

		return;
	}
	
	// If there's an existing preview for a different file (or create view), close it
	if (currentPanel && currentFilePath !== filePath) {
		currentPanel.dispose();
	}
	
	// Clean up disposed panel references
	if (currentPanel && currentPanel.isDisposed()) {
		ApiDesignerPanel.currentPanel = undefined;
	}
	
	// Create new panel - only pass viewType if it was explicitly provided
	if (!ApiDesignerPanel.currentPanel) {
		ApiDesignerPanel.currentPanel = viewType 
			? new ApiDesignerPanel(filePath, undefined, viewType)
			: new ApiDesignerPanel(filePath);
		updatePanelContent(document);
	}
}

export function deactivate() {
	logInfo('API Designer extension deactivating...');
	disposeLogger();
}
