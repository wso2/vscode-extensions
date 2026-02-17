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
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';

async function getWorkspaceRoot(): Promise<string | undefined> {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	if (!workspaceFolders || workspaceFolders.length === 0) {
		vscode.window.showWarningMessage('Please open a workspace folder to import collection payloads.');
		return undefined;
	}

	if (workspaceFolders.length === 1) {
		return workspaceFolders[0].uri.fsPath;
	}

	const selected = await vscode.window.showWorkspaceFolderPick({
		placeHolder: 'Select the workspace folder to import this collection into'
	});

	return selected?.uri.fsPath;
}

function getApiTestPath(workspaceRoot: string): string {
	return path.join(workspaceRoot, 'api-test');
}

function sanitizePathSegment(value: string, fallback: string): string {
	const sanitized = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9_\-\s]/g, '')
		.replace(/\s+/g, '-');

	return sanitized || fallback;
}

function normalizeRequestItem(rawItem: unknown, fallbackName: string): Record<string, unknown> {
	const nowId = `${Date.now()}`;
	const itemObj = rawItem && typeof rawItem === 'object' ? (rawItem as Record<string, unknown>) : {};
	const rawRequest = itemObj.request && typeof itemObj.request === 'object'
		? (itemObj.request as Record<string, unknown>)
		: itemObj;

	const name = typeof itemObj.name === 'string'
		? itemObj.name
		: (typeof rawRequest.name === 'string' ? rawRequest.name : fallbackName);

	const id = typeof itemObj.id === 'string'
		? itemObj.id
		: (typeof rawRequest.id === 'string' ? rawRequest.id : `${name}-${nowId}`);

	const method = typeof rawRequest.method === 'string' ? rawRequest.method : 'GET';
	const url = typeof rawRequest.url === 'string' ? rawRequest.url : '';

	const request: Record<string, unknown> = {
		...rawRequest,
		id,
		name,
		method,
		url,
		queryParameters: Array.isArray(rawRequest.queryParameters) ? rawRequest.queryParameters : [],
		headers: Array.isArray(rawRequest.headers) ? rawRequest.headers : []
	};

	const persisted: Record<string, unknown> = {
		id,
		name,
		request
	};

	if ('response' in itemObj) {
		persisted.response = itemObj.response;
	}

	return persisted;
}

async function createCollectionFolderStructure(
	apiTestPath: string,
	collectionName: string,
	collectionData: Record<string, unknown>
): Promise<string> {
	await fs.mkdir(apiTestPath, { recursive: true });

	const collectionDirName = sanitizePathSegment(collectionName, `collection-${Date.now()}`);
	const collectionPath = path.join(apiTestPath, collectionDirName);
	await fs.mkdir(collectionPath, { recursive: true });

	const collectionId = typeof collectionData.id === 'string'
		? collectionData.id
		: `${collectionDirName}-${Date.now()}`;

	const collectionMetadata = {
		id: collectionId,
		name: collectionName,
		description: typeof collectionData.description === 'string' ? collectionData.description : ''
	};

	await fs.writeFile(
		path.join(collectionPath, 'collection.yaml'),
		yaml.dump(collectionMetadata),
		'utf-8'
	);

	const rootItems = Array.isArray(collectionData.rootItems)
		? collectionData.rootItems
		: (Array.isArray(collectionData.requests) ? collectionData.requests : []);

	for (let index = 0; index < rootItems.length; index++) {
		const persistedRequest = normalizeRequestItem(rootItems[index], `Request ${index + 1}`);
		const fileName = `${String(index + 1).padStart(2, '0')}-${sanitizePathSegment(
			typeof persistedRequest.name === 'string' ? persistedRequest.name : `request-${index + 1}`,
			`request-${index + 1}`
		)}.yaml`;

		await fs.writeFile(path.join(collectionPath, fileName), yaml.dump(persistedRequest), 'utf-8');
	}

	const folders = Array.isArray(collectionData.folders) ? collectionData.folders : [];
	for (let folderIndex = 0; folderIndex < folders.length; folderIndex++) {
		const folderObj = folders[folderIndex] && typeof folders[folderIndex] === 'object'
			? (folders[folderIndex] as Record<string, unknown>)
			: {};

		const folderName = typeof folderObj.name === 'string' ? folderObj.name : `Folder ${folderIndex + 1}`;
		const folderDirName = sanitizePathSegment(folderName, `folder-${folderIndex + 1}`);
		const folderPath = path.join(collectionPath, folderDirName);
		await fs.mkdir(folderPath, { recursive: true });

		const folderItems = Array.isArray(folderObj.items)
			? folderObj.items
			: (Array.isArray(folderObj.requests) ? folderObj.requests : []);

		for (let requestIndex = 0; requestIndex < folderItems.length; requestIndex++) {
			const persistedRequest = normalizeRequestItem(folderItems[requestIndex], `Request ${requestIndex + 1}`);
			const fileName = `${String(requestIndex + 1).padStart(2, '0')}-${sanitizePathSegment(
				typeof persistedRequest.name === 'string' ? persistedRequest.name : `request-${requestIndex + 1}`,
				`request-${requestIndex + 1}`
			)}.yaml`;

			await fs.writeFile(path.join(folderPath, fileName), yaml.dump(persistedRequest), 'utf-8');
		}
	}

	return collectionPath;
}

export async function activate(context: vscode.ExtensionContext) {
	// Register the API Explorer tree view provider
	const apiExplorerProvider = new ApiExplorerProvider();

	// Initialize RPC handlers
	TryItPanel.init(apiExplorerProvider);

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

			// Reveal the API TryIt activity view to show the activity panel
			try {
				await vscode.commands.executeCommand('workbench.view.extension.api-tryit');
				await vscode.commands.executeCommand('api-tryit.activity.panel.focus');
			} catch {
				// Log but don't fail the import if reveal commands fail
				// (commands may not be registered in test environments)
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
		await apiExplorerProvider.reloadCollections();
	});

	// Register command to import collection payload (JSON structure)
	const importCollectionPayloadCommand = vscode.commands.registerCommand('api-tryit.importCollectionPayload', async (payload?: string) => {
		try {
			const workspaceRoot = await getWorkspaceRoot();
			if (!workspaceRoot) {
				return;
			}

			// If no payload provided, get it from user input
			if (!payload || typeof payload !== 'string') {
				payload = await vscode.window.showInputBox({
					prompt: 'Paste your collection JSON payload',
					placeHolder: '{"name": "My Collection", "folders": [...], "rootItems": [...]}',
					title: 'Import Collection Payload'
				});

				if (!payload) {
					return; // User cancelled
				}
			}

			// Parse and validate the JSON payload
			let collectionData;
			try {
				collectionData = JSON.parse(payload);
			} catch (parseError) {
				vscode.window.showErrorMessage('Invalid JSON payload. Please check the format and try again.');
				return;
			}

			// Basic validation - check for required fields
			if (!collectionData.name || typeof collectionData.name !== 'string') {
				vscode.window.showErrorMessage('Collection payload must have a valid "name" field.');
				return;
			}

			const apiTestPath = getApiTestPath(workspaceRoot);
			await createCollectionFolderStructure(apiTestPath, collectionData.name, collectionData as Record<string, unknown>);

			await apiExplorerProvider.reloadCollections();

			try {
				await vscode.commands.executeCommand('workbench.view.extension.api-tryit');
				await vscode.commands.executeCommand('api-tryit.activity.panel.focus');
			} catch {
				// Ignore reveal errors in test environments
			}

			TryItPanel.show(context);

			vscode.window.showInformationMessage(`Collection "${collectionData.name}" imported successfully to ${apiTestPath}`);
		} catch (error: unknown) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to import collection payload: ${errorMsg}`);
		}
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
		await apiExplorerProvider.reloadCollections();
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
		importCollectionPayloadCommand,
		openCollectionCommand,
		plusMenuCommand,
		settingsCommand,
		clearSelectionCommand,
	);
}

export function deactivate() {
	// Extension cleanup
}
