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
import { activateActivityPanel } from './activity-panel/activate';
import { TryItPanel } from './webview-panel/TryItPanel';
import { ActivityPanel } from './activity-panel/webview';
import { ApiExplorerProvider } from './tree-view/ApiExplorerProvider';
import { ApiTryItStateMachine, EVENT_TYPE } from './stateMachine';
import { ApiRequestItem } from '@wso2/api-tryit-core';
import * as path from 'path';

export async function activate(context: vscode.ExtensionContext) {
	// Initialize RPC handlers
	TryItPanel.init();

	// Register the API Explorer tree view
	const apiExplorerProvider = new ApiExplorerProvider();
	vscode.window.registerTreeDataProvider('api-tryit.explorer', apiExplorerProvider);
	// Register the explorer with the state machine so it can trigger direct reloads when needed
	ApiTryItStateMachine.registerExplorer(apiExplorerProvider);

	// Register the activity panel with the API explorer provider
	activateActivityPanel(context, apiExplorerProvider);

	// Register command to refresh tree view
	const refreshCommand = vscode.commands.registerCommand('api-tryit.refreshExplorer', async () => {
		try {
			// Reload collections from disk first, then update the tree
			await apiExplorerProvider.reloadCollections();
			vscode.window.setStatusBarMessage('✓ API Explorer refreshed', 2000);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to refresh explorer: ${msg}`);
		}
	});

	// Register command to open TryIt webview panel
	const openTryItCommand = vscode.commands.registerCommand('api-tryit.openTryIt', () => {
		TryItPanel.show(context);
	});

	// Register command to open request
	const openRequestCommand = vscode.commands.registerCommand('api-tryit.openRequest', (requestItem: ApiRequestItem) => {
		if (!requestItem || !requestItem.request) {
			vscode.window.showErrorMessage('Invalid request item');
			return;
		}

		// Open the TryIt panel
		TryItPanel.show(context);
		
		// Send the selected item through the state machine with file path
		ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, requestItem, requestItem.filePath);
		
		vscode.window.showInformationMessage(`Opening: ${requestItem.request.method} ${requestItem.name}`);
	});

	// Register command for new request
	const newRequestCommand = vscode.commands.registerCommand('api-tryit.newRequest', () => {
		// Create an empty request item
		const emptyRequestItem: ApiRequestItem = {
			id: `new-${Date.now()}`,
			name: 'New Request',
			request: {
				id: `new-${Date.now()}`,
				name: 'New Request',
				method: 'GET',
				url: '',
				queryParameters: [],
				headers: []
			}
		};

		// Open the TryIt panel
		TryItPanel.show(context);
		
		// Send the empty item through the state machine
		ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, emptyRequestItem);
		
		vscode.window.showInformationMessage('New request created');
	});

	// Register command for new collection — use state machine to navigate to collection form
	const newCollectionCommand = vscode.commands.registerCommand('api-tryit.newCollection', () => {
		// Ensure TryIt panel is visible
		TryItPanel.show(context);

		// Notify state machine and webviews to show the collection form
		ApiTryItStateMachine.sendEvent(EVENT_TYPE.SHOW_CREATE_COLLECTION_FORM);
		TryItPanel.postMessage('showCreateCollectionForm');
		ActivityPanel.postMessage('showCreateCollectionForm');

		// Provide quick feedback so the user knows the action was triggered
		vscode.window.setStatusBarMessage('✓ Sent showCreateCollectionForm message to webviews', 3000);
	});

	// Register command to import a collection file into collections path
	const importCollectionCommand = vscode.commands.registerCommand('api-tryit.importCollection', async () => {
		const fileUris = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			openLabel: 'Select collection file to import'
		});
		if (!fileUris || fileUris.length === 0) {
			return;
		}
		const fileUri = fileUris[0];
		const config = vscode.workspace.getConfiguration('api-tryit');
		const collectionsPath = config.get<string>('collectionsPath');
		if (!collectionsPath) {
			vscode.window.showWarningMessage('Collections path is not set. Please set it first.');
			return;
		}
		const destination = vscode.Uri.file(path.join(collectionsPath, fileUri.path.split('/').pop() || fileUri.path));
		await vscode.workspace.fs.copy(fileUri, destination, { overwrite: true });
		vscode.window.showInformationMessage('Collection imported');
		apiExplorerProvider.refresh();
	});

	// Register command to open a collection file
	const openCollectionCommand = vscode.commands.registerCommand('api-tryit.openCollection', async () => {
		const config = vscode.workspace.getConfiguration('api-tryit');
		const collectionsPath = config.get<string>('collectionsPath');
		const defaultUri = collectionsPath ? vscode.Uri.file(collectionsPath) : undefined;
		const fileUris = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			defaultUri,
			openLabel: 'Open collection file'
		});
		if (!fileUris || fileUris.length === 0) {
			return;
		}
		await vscode.window.showTextDocument(fileUris[0]);
	});

	// Plus-menu command for the view title (shows quick pick)
	const plusMenuCommand = vscode.commands.registerCommand('api-tryit.plusMenu', async () => {
		const pick = await vscode.window.showQuickPick([
			{ label: 'Create New Collection', command: 'api-tryit.newCollection' },
			{ label: 'Import Collection', command: 'api-tryit.importCollection' },
			{ label: 'Open Collection', command: 'api-tryit.openCollection' }
		], { placeHolder: 'Select action' });
		if (!pick) return;
		vscode.commands.executeCommand(pick.command);
	});

	// Register command for settings
	const settingsCommand = vscode.commands.registerCommand('api-tryit.settings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', 'api-tryit');
	});

	// Register command to set collections path (useful when requests live outside workspace)
	const setCollectionsPathCommand = vscode.commands.registerCommand('api-tryit.setCollectionsPath', async () => {
		const folderUris = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			canSelectFiles: false,
			canSelectMany: false,
			openLabel: 'Select Collections Folder'
		});
		if (!folderUris || folderUris.length === 0) {
			return;
		}
		const selected = folderUris[0];
		const config = vscode.workspace.getConfiguration('api-tryit');
		const target = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
		await config.update('collectionsPath', selected.fsPath, target);
		vscode.window.showInformationMessage(`API TryIt collections path set to: ${selected.fsPath}`);
		apiExplorerProvider.refresh();
	});

	context.subscriptions.push(setCollectionsPathCommand);

	// Register a simple hello command
	const helloCommand = vscode.commands.registerCommand('api-tryit.hello', () => {
		vscode.window.showInformationMessage('Hello from API TryIt!');
	});

	context.subscriptions.push(
		refreshCommand, 
		openTryItCommand, 
		openRequestCommand, 
		newRequestCommand,
		newCollectionCommand,
		importCollectionCommand,
		openCollectionCommand,
		plusMenuCommand,
		settingsCommand,
		helloCommand
	);
}

export function deactivate() {
	// Extension cleanup
}
