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

	// Register the API Explorer tree view provider
	const apiExplorerProvider = new ApiExplorerProvider();

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
		
		// vscode.window.showInformationMessage(`Opening: ${requestItem.request.method} ${requestItem.name}`);
	});

	// Register command to select an item in the explorer by file path (used after save)
	const selectItemByPathCommand = vscode.commands.registerCommand('api-tryit.selectItemByPath', async (filePath: string) => {
		if (!filePath || typeof filePath !== 'string') {
			vscode.window.showWarningMessage('No file path provided to select');
			return;
		}

		// Try to locate the request using cached collections; reload once if not found
		let match = apiExplorerProvider.findRequestByFilePath(filePath);
		if (!match) {
			await apiExplorerProvider.reloadCollections();
			match = apiExplorerProvider.findRequestByFilePath(filePath);
		}

		if (!match) {
			vscode.window.showWarningMessage('Saved request not found in API Explorer');
			return;
		}

		const { collection, folder, requestItem, treeItemId, parentIds } = match;

		// Inform the activity panel webview so it can highlight the saved request
		ActivityPanel.postMessage('selectItem', {
			id: treeItemId,
			parentIds,
			filePath: requestItem.filePath,
			name: requestItem.name,
			collectionId: collection.id,
			collectionName: collection.name,
			folderId: folder?.id,
			folderName: folder?.name,
			method: requestItem.request.method,
			request: requestItem.request
		});
	});

	// Register command to clear selection (must be before newRequestCommand)
	const clearSelectionCommand = vscode.commands.registerCommand('api-tryit.clearSelection', async () => {
		// Clear selection in the activity panel webview
		ActivityPanel.postMessage('clearSelection');
		
		// Clear the collection context from state machine
		ApiTryItStateMachine.sendEvent(EVENT_TYPE.CLEAR_COLLECTION_CONTEXT);
	});

	// Register command for new request
	const newRequestCommand = vscode.commands.registerCommand('api-tryit.newRequest', async () => {
		// Clear any previous selection and collection context first
		await vscode.commands.executeCommand('api-tryit.clearSelection');

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
		
		// Send empty request through state machine to ensure context is properly set
		// This will set selectedItem but NOT currentCollectionPath
		ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, emptyRequestItem, undefined);
		
		// Also send to webview via postMessage for queueing
		TryItPanel.postMessage('apiRequestItemSelected', emptyRequestItem);
		
		vscode.window.showInformationMessage('New request created');
	});

	// Register command to open TryIt with a curl string
	const openFromCurlCommand = vscode.commands.registerCommand('api-tryit.openFromCurl', async (curlString?: string) => {
		try {
			// If no curl string provided, get it from user input
			if (!curlString || typeof curlString !== 'string') {
				curlString = await vscode.window.showInputBox({
					prompt: 'Paste your curl command',
					placeHolder: 'curl -X GET https://api.example.com/endpoint',
					title: 'Import from Curl'
				});

				if (!curlString) {
					return; // User cancelled
				}
			}

			// Import the utility function
			const { curlToApiRequestItem } = await import('./util');
			
			// Convert curl to ApiRequestItem
			const requestItem = curlToApiRequestItem(curlString);
			
			if (!requestItem || !requestItem.request.url) {
				vscode.window.showErrorMessage('Could not parse curl command. Please check the format and try again.');
				return;
			}

			// Open the TryIt panel
			TryItPanel.show(context);
			
			// Send the request item through state machine
			ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, requestItem, undefined);
			
			// Also send to webview for queueing
			TryItPanel.postMessage('apiRequestItemSelected', requestItem);
			
			vscode.window.showInformationMessage(`Loaded: ${requestItem.request.method} ${requestItem.request.url}`);
		} catch (error: unknown) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to import from curl: ${errorMsg}`);
		}
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

	context.subscriptions.push(
		refreshCommand, 
		openTryItCommand, 
		openRequestCommand, 
		selectItemByPathCommand,
		newRequestCommand,
		openFromCurlCommand,
		newCollectionCommand,
		importCollectionCommand,
		openCollectionCommand,
		plusMenuCommand,
		settingsCommand,
		clearSelectionCommand,
	);
}

export function deactivate() {
	// Extension cleanup
}
