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
import type { ApiRequestItem, ApiRequest } from '@wso2/api-tryit-core';
import { getComposerJSFiles } from '../util';
import { ApiExplorerProvider } from '../tree-view/ApiExplorerProvider';
import { ApiTryItStateMachine, EVENT_TYPE } from '../stateMachine';
import { TryItPanel } from '../webview-panel/TryItPanel';

/**
 * Sanitize a name to be used as a folder name or ID
 * Converts to lowercase and replaces spaces and special characters with hyphens
 */
function sanitizeForFileSystem(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export class ActivityPanel implements vscode.WebviewViewProvider {
	public static readonly viewType = 'api-tryit.activity.panel';
	public static currentPanel: ActivityPanel | undefined;
	private _view?: vscode.WebviewView;
	private _sendCollectionsTimeoutId: ReturnType<typeof setTimeout> | undefined;
	private _lastSentCollectionsHash: string | undefined;
	private _listenersInitialized = false;
	private _webviewReady = false;
	private _pendingMessages: Array<{ type: string; data?: unknown }> = [];

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _apiExplorerProvider?: ApiExplorerProvider
	) { }

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext<unknown>,
		_token: vscode.CancellationToken
	): void | Promise<void> {
		this._view = webviewView;
		ActivityPanel.currentPanel = this;
		const isDevMode = process.env.WEB_VIEW_WATCH_MODE === 'true';
		const devHost = process.env.TRY_VIEW_DEV_HOST || 'http://localhost:9092';

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: isDevMode
				? [
					this._extensionContext.extensionUri,
					vscode.Uri.parse(devHost)
				]
				: [
					this._extensionContext.extensionUri
				]
		};

		webviewView.webview.html = this._getWebviewContent(webviewView.webview);

		// Handle messages from webview
		webviewView.webview.onDidReceiveMessage((message: Record<string, unknown>) => {
			switch (message.command) {
				case 'newRequest':
					vscode.commands.executeCommand('api-tryit.newRequest');
					break;
				case 'search':
					if (this._apiExplorerProvider) {
						this._apiExplorerProvider.setSearchFilter(message.value as string);
					}
					break;
				case 'clearSearch':
					if (this._apiExplorerProvider) {
						this._apiExplorerProvider.setSearchFilter('');
					}
					break;
				case 'openRequest':
					// Handle opening a request with state machine
					this._handleOpenRequest(message.request as Record<string, unknown>);
					break;
				case 'selectItem':
					// Selection from the webview is handled inside ExplorerView; nothing required here
					break;
				case 'getCollections':
					// Send collections to webview
					this._sendCollections(true);
					break;
				case 'webviewReady':
					// Webview is ready, send initial data
					this._webviewReady = true;
					this._sendCollections(true);
					// flush pending messages
					while (this._pendingMessages.length > 0 && this._view) {
						const msg = this._pendingMessages.shift();
						if (msg) {
							this._view.webview.postMessage({ type: msg.type, data: msg.data });
						}
					}
					break;
				case 'addRequestToCollection':
					// Handle adding a request to a collection
					this._handleAddRequestToCollection(message.collectionId as string);
					break;

				case 'addFolderToCollection':
					// Handle creating a new folder inside a collection
					this._handleAddFolderToCollection(message.collectionId as string);
					break;

				case 'addRequestToFolder':
					// Handle adding a request to a folder
					this._handleAddRequestToFolder(message.folderId as string, message.folderPath as string);
					break;				
				case 'deleteCollection':
					// Handle deleting a collection
					this._handleDeleteCollection(message.collectionId as string);
					break;
				case 'deleteRequest':
					// Handle deleting a request
					this._handleDeleteRequest(message.requestId as string);
					break;			
				case 'renameCollection':
					// Handle renaming a collection
					this._handleRenameCollection(message.collectionId as string, message.currentName as string);
					break;
				case 'renameRequest':
					// Handle renaming a request
					this._handleRenameRequest(message.requestId as string, message.currentName as string);
					break;			
			}
		});

		// Only register listeners once to prevent duplicates
		if (!this._listenersInitialized) {
			this._listenersInitialized = true;

			// Refresh webview when provider data changes
			if (this._apiExplorerProvider) {
				this._apiExplorerProvider.onDidChangeTreeData(() => {
					this._debouncedSendCollections();
				});
			}

			// Handle webview visibility changes
			webviewView.onDidChangeVisibility(() => {
				if (webviewView.visible) {
					// Refresh collections when webview becomes visible
					this._debouncedSendCollections();
				}
			});
		}

		// Send initial collections data immediately (no debounce)
		this._sendCollections(true);
	}

	public static postMessage(type: string, data?: unknown) {
		if (ActivityPanel.currentPanel && ActivityPanel.currentPanel._view && ActivityPanel.currentPanel._webviewReady) {
			ActivityPanel.currentPanel._view.webview.postMessage({ type, data });
		} else if (ActivityPanel.currentPanel) {
			ActivityPanel.currentPanel._pendingMessages.push({ type, data });
		}
	}

	private _debouncedSendCollections() {
		// Clear any pending timeout
		if (this._sendCollectionsTimeoutId) {
			clearTimeout(this._sendCollectionsTimeoutId);
		}

		// Set a new timeout to debounce rapid calls (300ms)
		this._sendCollectionsTimeoutId = setTimeout(() => {
			this._sendCollections(false);
		}, 300);
	}

	private async _sendCollections(skipHashCheck: boolean = false) {
		if (this._view && this._apiExplorerProvider) {
			const collections = await this._apiExplorerProvider.getCollections();
			
			// Create a hash of the collections to avoid sending identical data
			const collectionsHash = JSON.stringify(collections);
			
			// Only send if collections have changed (skip hash check for initial sends)
			if (skipHashCheck || collectionsHash !== this._lastSentCollectionsHash) {
				this._lastSentCollectionsHash = collectionsHash;
				this._view.webview.postMessage({
					command: 'updateCollections',
					collections
				});
			}
		}
	}

	private async _handleOpenRequest(requestData: Record<string, unknown>) {
		try {
			const requestId = requestData.id as string;

			if (!requestId) {
				vscode.window.showErrorMessage('Invalid request ID');
				return;
			}

			if (this._apiExplorerProvider) {
				const allCollections = await this._apiExplorerProvider.getCollections();
				const requestItem = this._findRequestItem(allCollections, requestId);

				if (!requestItem) {
					vscode.window.showErrorMessage('Request not found');
					return;
				}

				// Show the TryIt panel
				TryItPanel.show(this._extensionContext);

				// Safely extract properties from the requestItem
				const itemId = (requestItem.id as string) || '';
				const itemName = (requestItem.name as string) || '';
				const itemRequest = (requestItem.request as unknown) || null;

				// Build a proper ApiRequest object
				const apiRequest: ApiRequest = itemRequest && typeof itemRequest === 'object'
					? (itemRequest as ApiRequest)
					: {
						id: itemId,
						name: itemName,
						method: 'GET',
						url: '',
						queryParameters: [],
						headers: []
					};

				// Create a properly typed ApiRequestItem object
				const apiRequestItem: ApiRequestItem = {
					id: itemId,
					name: itemName,
					request: apiRequest,
					filePath: (requestItem.filePath as string) || ''
				};

				// Send event to state machine to load the request
				ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, apiRequestItem, '');
				
				// Also send the request directly to the TryIt webview
				TryItPanel.sendRequestToWebview(apiRequestItem);
				
				vscode.window.showInformationMessage(`Opening: ${apiRequestItem.request.method} ${apiRequestItem.name}`);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open request: ${error}`);
		}
	}

	private async _handleAddRequestToCollection(collectionId: string) {
		try {
			if (!this._apiExplorerProvider) {
				vscode.window.showErrorMessage('API Explorer provider not available');
				return;
			}

			// Get all collections to find the one with matching ID
			const allCollections = await this._apiExplorerProvider.getCollections();
			const collection = this._findCollectionById(allCollections, collectionId);

			if (!collection) {
				vscode.window.showErrorMessage('Collection not found');
				return;
			}

			// Show TryIt panel
			TryItPanel.show(this._extensionContext);

			// Wait a moment to ensure the panel is ready
			await new Promise(resolve => setTimeout(resolve, 300));

			// Resolve the collection path using the provider
			let collectionPath: string | undefined;
			if (this._apiExplorerProvider) {
				collectionPath = this._apiExplorerProvider.getCollectionPathById(collectionId);
			}

			// Fallback: construct path from configuration if not found in provider
			if (!collectionPath) {
				const config = vscode.workspace.getConfiguration('api-tryit');
				const configuredPath = config.get<string>('collectionsPath');
				const storagePath = configuredPath || 
					(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');

				if (!storagePath) {
					vscode.window.showErrorMessage('No workspace path available');
					return;
				}

				// Sanitize the collection ID to ensure it's filesystem-safe
				const sanitizedCollectionId = sanitizeForFileSystem(collectionId);
				collectionPath = path.join(storagePath, sanitizedCollectionId);
			}

			// Send event to state machine to create a new request in this collection
			ApiTryItStateMachine.sendEvent(EVENT_TYPE.ADD_REQUEST_TO_COLLECTION, undefined, collectionPath);

			// Deselect any currently-selected request so the UI behaves like the "New Request" button
			await vscode.commands.executeCommand('api-tryit.clearSelection');

			// Also create and select an empty request immediately so the TryIt panel shows it without waiting for the state machine debounce
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

			// Also set the selected item so other components see the change
			ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, emptyRequestItem, undefined);
			// Post the request to the TryIt webview (queued if webview not ready)
			TryItPanel.postMessage('apiRequestItemSelected', emptyRequestItem);

			const collectionName = typeof collection === 'object' && collection !== null && 'name' in collection 
				? (collection as Record<string, unknown>).name 
				: 'Unknown';
			vscode.window.showInformationMessage(`Add request to "${collectionName}" collection`);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to add request: ${error}`);
		}
	}

	private async _handleAddFolderToCollection(collectionId: string) {
		try {
			if (!this._apiExplorerProvider) {
				vscode.window.showErrorMessage('API Explorer provider not available');
				return;
			}

			// Find the collection
			const allCollections = await this._apiExplorerProvider.getCollections();
			const collection = this._findCollectionById(allCollections, collectionId);

			if (!collection) {
				vscode.window.showErrorMessage('Collection not found');
				return;
			}

			// Resolve collection path
			let collectionPath: string | undefined;
			if (this._apiExplorerProvider) {
				collectionPath = this._apiExplorerProvider.getCollectionPathById(collectionId);
			}

			// Fallback to configured storage path
			if (!collectionPath) {
				const config = vscode.workspace.getConfiguration('api-tryit');
				const configuredPath = config.get<string>('collectionsPath');
				const storagePath = configuredPath || (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');

				if (!storagePath) {
					vscode.window.showErrorMessage('No workspace path available');
					return;
				}

				const sanitizedCollectionId = sanitizeForFileSystem(collectionId);
				collectionPath = path.join(storagePath, sanitizedCollectionId);
			}

			// Ask user for folder name
			const folderName = await vscode.window.showInputBox({
				prompt: 'Enter folder name',
				value: 'New Folder',
				validateInput: (v: string) => v && v.trim() ? undefined : 'Folder name cannot be empty'
			});

			if (!folderName) {
				return;
			}

			const fs = await import('fs/promises');
			const sanitized = sanitizeForFileSystem(folderName);
			const newFolderPath = path.join(collectionPath, sanitized);

			try {
				// Fail if already exists
				await fs.stat(newFolderPath);
				vscode.window.showErrorMessage('Folder already exists');
				return;
			} catch (err) {
				// expected - folder does not exist
			}

			try {
				await fs.mkdir(newFolderPath);
				vscode.window.showInformationMessage(`Folder "${folderName}" created`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to create folder: ${error}`);
				return;
			}

			// Reload collections and refresh UI
			if (this._apiExplorerProvider) {
				await this._apiExplorerProvider.reloadCollections();
			}
			this._sendCollections(true);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to create folder: ${error}`);
		}
	}

	private async _handleAddRequestToFolder(folderId: string, folderPath: string) {
		try {
			if (!folderPath) {
				vscode.window.showErrorMessage('Unable to determine folder path');
				return;
			}

			// Verify the folder exists
			const fs = await import('fs/promises');
			const path = await import('path');
			try {
				const stats = await fs.stat(folderPath);
				if (!stats.isDirectory()) {
					vscode.window.showErrorMessage('Target is not a directory');
					return;
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Folder does not exist: ${error}`);
				return;
			}

			// Show TryIt panel
			TryItPanel.show(this._extensionContext);

			// Wait a moment to ensure the panel is ready
			await new Promise(resolve => setTimeout(resolve, 300));

			// Send event to state machine to create a new request in this folder
			ApiTryItStateMachine.sendEvent(EVENT_TYPE.ADD_REQUEST_TO_COLLECTION, undefined, folderPath);

			// Deselect any currently-selected request so the UI behaves like the "New Request" button
			await vscode.commands.executeCommand('api-tryit.clearSelection');

			// Also create and select an empty request immediately so the TryIt panel shows it without waiting for the state machine debounce
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

			// Also set the selected item so other components see the change
			ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, emptyRequestItem, undefined);
			// Post the request to the TryIt webview (queued if webview not ready)
			TryItPanel.postMessage('apiRequestItemSelected', emptyRequestItem);

			vscode.window.showInformationMessage(`Add request to "${folderId}" folder`);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to add request to folder: ${error}`);
		}
	}

	private _findCollectionById(items: unknown[], collectionId: string): unknown {
		for (const item of items) {
			const typedItem = item as Record<string, unknown>;
			if (typedItem.id === collectionId) {
				return typedItem;
			}
			if (Array.isArray(typedItem.children)) {
				const found = this._findCollectionById(typedItem.children as unknown[], collectionId);
				if (found) return found;
			}
		}
		return undefined;
	}

	private _findRequestItem(collections: unknown[], requestId: string): Record<string, unknown> | undefined {
		for (const collectionUnknown of collections) {
			const collection = collectionUnknown as Record<string, unknown>;
			if (collection.id === requestId) {
				return collection;
			}

			const children = collection.children as unknown[];
			if (children && Array.isArray(children)) {
				for (const folderUnknown of children) {
					const folder = folderUnknown as Record<string, unknown>;
					if (folder.id === requestId) {
						return folder;
					}

					const folderChildren = folder.children as unknown[];
					if (folderChildren && Array.isArray(folderChildren)) {
						for (const requestUnknown of folderChildren) {
							const request = requestUnknown as Record<string, unknown>;
							if (request.id === requestId) {
								return request;
							}
						}
					}
				}
			}
		}
		return undefined;
	}

	private async _handleDeleteCollection(collectionId: string) {
		try {
			if (!this._apiExplorerProvider) {
				vscode.window.showErrorMessage('API Explorer provider not available');
				return;
			}

			// Get all collections to find the one with matching ID
			const allCollections = await this._apiExplorerProvider.getCollections();
			const collection = this._findCollectionById(allCollections, collectionId);

			if (!collection) {
				vscode.window.showErrorMessage('Collection not found');
				return;
			}

			const collectionName = typeof collection === 'object' && collection !== null && 'name' in collection 
				? (collection as Record<string, unknown>).name 
				: 'Unknown';

			// Show confirmation dialog
			const result = await vscode.window.showWarningMessage(
				`Are you sure you want to delete the collection "${collectionName}"? This cannot be undone.`,
				{ modal: true },
				'Delete',
				'Cancel'
			);

			if (result !== 'Delete') {
				return;
			}

			// Get the collection path
			const collectionPath = this._apiExplorerProvider.getCollectionPathById(collectionId);

			if (!collectionPath) {
				vscode.window.showErrorMessage('Unable to determine collection path');
				return;
			}

			// Delete the collection folder
			const fs = await import('fs/promises');
			try {
				await fs.rm(collectionPath, { recursive: true, force: true });
				vscode.window.showInformationMessage(`Collection "${collectionName}" deleted successfully`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to delete collection folder: ${error}`);
				return;
			}

			// Clear selection if the deleted collection was selected (clear selection + inform state machine with path)
			await vscode.commands.executeCommand('api-tryit.clearSelection');
			try {
				// Pass the deleted collection path so the state machine can prune savedItems / selectedItem
				ApiTryItStateMachine.sendEvent(EVENT_TYPE.CLEAR_COLLECTION_CONTEXT, undefined, collectionPath);
			} catch {
				// non-fatal
			}

			// Reload collections from disk to ensure fresh data
			if (this._apiExplorerProvider) {
				await this._apiExplorerProvider.reloadCollections();
			}

			// Refresh the tree view immediately
			this._sendCollections(true);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to delete collection: ${error}`);
		}
	}

	private async _handleDeleteRequest(requestId: string) {
		try {
			if (!this._apiExplorerProvider) {
				vscode.window.showErrorMessage('API Explorer provider not available');
				return;
			}

			// Find the request in all collections
			const allCollections = await this._apiExplorerProvider.getCollections();
			const requestItem = this._findRequestItem(allCollections, requestId);

			if (!requestItem) {
				vscode.window.showErrorMessage('Request not found');
				return;
			}

			const requestName = typeof requestItem === 'object' && requestItem !== null && 'name' in requestItem 
				? (requestItem as Record<string, unknown>).name 
				: 'Unknown';

			// Show confirmation dialog
			const result = await vscode.window.showWarningMessage(
				`Are you sure you want to delete the request "${requestName}"? This cannot be undone.`,
				{ modal: true },
				'Delete',
				'Cancel'
			);

			if (result !== 'Delete') {
				return;
			}

			// Get the file path of the request
			const requestFilePath = typeof requestItem === 'object' && requestItem !== null && 'filePath' in requestItem
				? (requestItem as Record<string, unknown>).filePath as string
				: undefined;

			if (!requestFilePath) {
				vscode.window.showErrorMessage('Unable to determine request file path');
				return;
			}

			// Delete the request file
			const fs = await import('fs/promises');
			try {
				await fs.unlink(requestFilePath);
				vscode.window.showInformationMessage(`Request "${requestName}" deleted successfully`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to delete request file: ${error}`);
				return;
			}

			// Clear selection if the deleted request was selected
			await vscode.commands.executeCommand('api-tryit.clearSelection');

			// Reload collections from disk to ensure fresh data
			if (this._apiExplorerProvider) {
				await this._apiExplorerProvider.reloadCollections();
			}

			// Refresh the tree view immediately
			this._sendCollections(true);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to delete request: ${error}`);
		}
	}

	private async _handleRenameCollection(collectionId: string, currentName: string) {
		try {
			if (!this._apiExplorerProvider) {
				vscode.window.showErrorMessage('API Explorer provider not available');
				return;
			}

			// Get all collections to find the one with matching ID
			const allCollections = await this._apiExplorerProvider.getCollections();
			const collection = this._findCollectionById(allCollections, collectionId);

			if (!collection) {
				vscode.window.showErrorMessage('Collection not found');
				return;
			}

			// Show input dialog for new name
			const newName = await vscode.window.showInputBox({
				prompt: 'Enter new collection name',
				value: currentName,
				validateInput: (value: string) => {
					if (!value.trim()) {
						return 'Collection name cannot be empty';
					}
					return undefined;
				}
			});

			if (!newName || newName === currentName) {
				return;
			}

			// Get the collection path
			const collectionPath = this._apiExplorerProvider.getCollectionPathById(collectionId);

			if (!collectionPath) {
				vscode.window.showErrorMessage('Unable to determine collection path');
				return;
			}

			// Get parent directory and rename the collection folder
			const fs = await import('fs/promises');
			const path = await import('path');
			const yaml = await import('js-yaml');
			const parentDir = path.dirname(collectionPath);
			const newPath = path.join(parentDir, newName);

			try {
				await fs.rename(collectionPath, newPath);
				vscode.window.showInformationMessage(`Collection renamed to "${newName}" successfully`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to rename collection folder: ${error}`);
				return;
			}

			// Update the collection.yaml file with the new name
			const collectionYamlPath = path.join(newPath, 'collection.yaml');
			try {
				const fileContent = await fs.readFile(collectionYamlPath, 'utf-8');
				const collectionMetadata = yaml.load(fileContent) as Record<string, unknown>;
				collectionMetadata.name = newName;
				await fs.writeFile(collectionYamlPath, yaml.dump(collectionMetadata), 'utf-8');
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to update collection metadata: ${error}`);
				return;
			}

			// Reload collections from disk to ensure fresh data
			if (this._apiExplorerProvider) {
				await this._apiExplorerProvider.reloadCollections();
			}

			// Refresh the tree view immediately
			this._sendCollections(true);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to rename collection: ${error}`);
		}
	}

	private async _handleRenameRequest(requestId: string, currentName: string) {
		try {
			if (!this._apiExplorerProvider) {
				vscode.window.showErrorMessage('API Explorer provider not available');
				return;
			}

			// Find the request in all collections
			const allCollections = await this._apiExplorerProvider.getCollections();
			const requestItem = this._findRequestItem(allCollections, requestId);

			if (!requestItem) {
				vscode.window.showErrorMessage('Request not found');
				return;
			}

			// Show input dialog for new name
			const newName = await vscode.window.showInputBox({
				prompt: 'Enter new request name',
				value: currentName,
				validateInput: (value: string) => {
					if (!value.trim()) {
						return 'Request name cannot be empty';
					}
					return undefined;
				}
			});

			if (!newName || newName === currentName) {
				return;
			}

			// Get the file path of the request
			const requestFilePath = typeof requestItem === 'object' && requestItem !== null && 'filePath' in requestItem
				? (requestItem as Record<string, unknown>).filePath as string
				: undefined;

			if (!requestFilePath) {
				vscode.window.showErrorMessage('Unable to determine request file path');
				return;
			}

			// Read the current request data
			const fs = await import('fs/promises');
			const path = await import('path');
			const yaml = await import('js-yaml');

			let requestData: Record<string, unknown>;
			try {
				const fileContent = await fs.readFile(requestFilePath, 'utf-8');
				requestData = yaml.load(fileContent) as Record<string, unknown>;
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to read request file: ${error}`);
				return;
			}

			// Update the name in the request data
			requestData.name = newName;

			// Write the updated request data back to the file
			try {
				await fs.writeFile(requestFilePath, yaml.dump(requestData), 'utf-8');
				vscode.window.showInformationMessage(`Request renamed to "${newName}" successfully`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to update request file: ${error}`);
				return;
			}

			// Reload collections from disk to ensure fresh data
			if (this._apiExplorerProvider) {
				await this._apiExplorerProvider.reloadCollections();
			}

			// Refresh the tree view immediately
			this._sendCollections(true);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to rename request: ${error}`);
		}
	}

    private _getWebviewContent(webview: vscode.Webview) {
        const scriptUris = getComposerJSFiles(this._extensionContext, 'ApiTryItVisualizer', webview);

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <title>WSO2 API TryIt</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: var(--vscode-font-family);
              color: var(--vscode-foreground);
              background-color: var(--vscode-sideBar-background);
            }
            #root {
              display: flex;
              height: 100vh;
              width: 100%;
            }
          </style>
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root">
                Loading ....
            </div>
            ${scriptUris.map(jsFile => `<script charset="UTF-8" src="${jsFile}"></script>`).join('\n')}
            <script>
                // Function to initialize the React app
                function initializeApp() {
                    console.log('API TryIt: Initializing app...');
                    if (typeof apiTryItVisualizerWebview !== 'undefined' && apiTryItVisualizerWebview.renderActivityPanel) {
                        console.log('API TryIt: renderActivityPanel function found, rendering...');
                        const rootElement = document.getElementById("root");
                        if (rootElement) {
                            apiTryItVisualizerWebview.renderActivityPanel(rootElement);
                        }
                    } else {
                        console.error('API TryIt: renderActivityPanel function not found, retrying...');
                        setTimeout(initializeApp, 100);
                    }
                }

                window.addEventListener('DOMContentLoaded', function() {
                    console.log('API TryIt: DOMContentLoaded');
                    initializeApp();
                });

                // Also try to initialize on load in case DOMContentLoaded doesn't fire
                window.addEventListener('load', function() {
                    console.log('API TryIt: window load event');
                    setTimeout(() => {
                        const rootElement = document.getElementById("root");
                        if (rootElement && (rootElement.innerHTML === 'Loading ....' || rootElement.innerHTML === '')) {
                            console.log('API TryIt: Retrying initialization on load');
                            initializeApp();
                        }
                    }, 200);
                });

                // Listen for VS Code webview ready event
                window.addEventListener('message', function(event) {
                    if (event.data && event.data.type === 'vscode-webview-ready') {
                        console.log('API TryIt: VS Code webview ready');
                        initializeApp();
                    }
                });
            </script>
        </body>
        </html>
      `;
    }
}
