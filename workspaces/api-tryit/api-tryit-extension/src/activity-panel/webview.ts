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
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import type { ApiRequestItem, ApiRequest, ApiResponse } from '@wso2/api-tryit-core';
import { getComposerJSFiles } from '../util';
import { ApiExplorerProvider } from '../tree-view/ApiExplorerProvider';
import { ApiTryItStateMachine, EVENT_TYPE } from '../stateMachine';
import { TryItPanel } from '../webview-panel/TryItPanel';
import type {
	HurlFileResult,
	HurlRunEvent,
	HurlRunResult,
	HurlRunViewContext
} from '@wso2/api-tryit-core';
import {
	createHurlRunner,
	HurlFileResult as RunnerHurlFileResult,
	HurlRunEvent as RunnerHurlRunEvent,
	HurlRunInput as RunnerHurlRunInput,
	HurlRunResult as RunnerHurlRunResult,
	HurlRunner as RunnerHurlRunner
} from '@wso2/api-tryit-hurl-runner';
import { parseHurlCollection } from '@wso2/api-tryit-hurl-parser';
import { getHurlBinaryManager } from '../hurl/hurl-binary-manager';
import {
	composeHurlDocument,
	parseHurlDocument,
	replaceRequestBlockName,
	upsertCollectionNameInHurl
} from '@wso2/api-tryit-hurl-parser';

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
	private _activeRunAbortController: AbortController | undefined;

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
				case 'addRequestToFolder':
					this._handleAddRequestToFolder(message.folderId as string, message.folderPath as string);
					break;
				case 'renameFolder':
					this._handleRenameFolder(message.folderId as string, message.folderPath as string, message.currentName as string);
					break;
				case 'runFolder':
					this._handleRunFolder(message.folderId as string, message.folderPath as string, message.folderName as string | undefined);
					break;
				case 'deleteFolder':
					this._handleDeleteFolder(message.folderId as string, message.folderPath as string, message.currentName as string);
					break;
				case 'runCollection':
					this._handleRunCollection(message.collectionId as string);
					break;
				case 'runAllCollections':
					this._handleRunAllCollections();
					break;
				case 'stopHurlRun':
					this._stopActiveRun();
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

	/**
	 * Force an immediate (skip-hash-check) collections push to the activity panel webview.
	 * Used when in-memory collections are added so the Explorer updates without waiting
	 * for the debounced `_onDidChangeTreeData` handler.
	 */
	public static forceCollectionsRefresh(): void {
		if (ActivityPanel.currentPanel) {
			ActivityPanel.currentPanel._sendCollections(true);
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
		try {
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
		} catch (error) {
			// Swallow errors so a failed refresh (e.g. from a debounce timer) never
			// bubbles up as an unhandled rejection.
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
					response: (requestItem.response as ApiResponse) || undefined,
					filePath: (requestItem.filePath as string) || ''
				};

				// Send event to state machine to load the request
				ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, apiRequestItem, apiRequestItem.filePath);
				
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

			// Fallback: derive from first request item under the collection
			if (!collectionPath) {
				const collectionRecord = collection as Record<string, unknown>;
				const children = collectionRecord.children;
				if (Array.isArray(children)) {
					const firstChildWithPath = children.find(child => {
						const typed = child as Record<string, unknown>;
						return typeof typed.filePath === 'string' && typed.filePath.length > 0;
					}) as Record<string, unknown> | undefined;
					collectionPath = typeof firstChildWithPath?.filePath === 'string'
						? firstChildWithPath.filePath
						: undefined;
				}
			}

			if (!collectionPath) {
				vscode.window.showErrorMessage('Unable to determine collection file path');
				return;
			}

			// Send event to state machine to create a new request in this collection
			ApiTryItStateMachine.sendEvent(EVENT_TYPE.ADD_REQUEST_TO_COLLECTION, undefined, collectionPath);

			// Note: NOT calling clearSelection here to preserve the collection context for save
			// The empty request will be created and selected below

			// Also create and select an empty request immediately so the TryIt panel shows it without waiting for the state machine debounce
			const newRequestId = `new-${Date.now()}`;
			const emptyRequestItem: ApiRequestItem = {
				id: newRequestId,
				name: 'New Request',
				request: {
					id: newRequestId,
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

			// Note: NOT calling clearSelection here to preserve the collection context for save
			// The empty request will be created and selected below

			// Also create and select an empty request immediately so the TryIt panel shows it without waiting for the state machine debounce
			const newRequestId = `new-${Date.now()}`;
			const emptyRequestItem: ApiRequestItem = {
				id: newRequestId,
				name: 'New Request',
				request: {
					id: newRequestId,
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

	private _mapRunFileResult(file: RunnerHurlFileResult): HurlFileResult {
		const assertions = file.assertions.map(assertion => ({ ...assertion }));
		const entries = file.entries.map(entry => ({
			...entry,
			assertions: (entry.assertions && entry.assertions.length > 0)
				? entry.assertions.map(assertion => ({ ...assertion }))
				: assertions.filter(assertion => assertion.entryName === entry.name)
		}));

		return {
			...file,
			entries,
			assertions
		};
	}

	private _mapRunResult(result: RunnerHurlRunResult): HurlRunResult {
		return {
			...result,
			files: result.files.map(file => this._mapRunFileResult(file))
		};
	}

	private _mapRunEvent(event: RunnerHurlRunEvent): HurlRunEvent {
		if (event.type === 'fileFinished') {
			return {
				...event,
				file: this._mapRunFileResult(event.file)
			};
		}

		if (event.type === 'runFinished') {
			return {
				...event,
				result: this._mapRunResult(event.result)
			};
		}

		return event;
	}

	private _resolveRequestBlockIndex(
		fileContent: string,
		requestNode: Record<string, unknown>
	): number {
		const requestPath = requestNode.filePath as string | undefined;
		if (!requestPath) {
			return -1;
		}

		const parsedDocument = parseHurlDocument(fileContent);
		if (parsedDocument.blocks.length === 0) {
			return -1;
		}

		let parsedCollection;
		try {
			parsedCollection = parseHurlCollection(fileContent, {
				sourceFilePath: requestPath
			});
		} catch {
			return -1;
		}

		const parsedItems = parsedCollection.rootItems || [];
		const request = requestNode.request && typeof requestNode.request === 'object'
			? (requestNode.request as Record<string, unknown>)
			: undefined;
		const requestTreeId = typeof requestNode.id === 'string' ? requestNode.id : undefined;
		const requestId = typeof request?.id === 'string' ? request.id : undefined;
		const requestName = typeof requestNode.name === 'string'
			? requestNode.name
			: (typeof request?.name === 'string' ? request.name : undefined);
		const requestMethod = typeof request?.method === 'string' ? request.method.toUpperCase() : undefined;
		const requestUrl = typeof request?.url === 'string' ? request.url : undefined;

		if (requestTreeId && requestTreeId.startsWith('request-')) {
			const match = requestTreeId.match(/-(\d+)$/);
			if (match) {
				const oneBased = Number.parseInt(match[1], 10);
				if (Number.isFinite(oneBased)) {
					const zeroBased = oneBased - 1;
					if (zeroBased >= 0 && zeroBased < parsedDocument.blocks.length) {
						return zeroBased;
					}
				}
			}
		}

		if (requestId) {
			const byIdIndex = parsedItems.findIndex(item => item.request.id === requestId || item.id === requestId);
			if (byIdIndex >= 0 && byIdIndex < parsedDocument.blocks.length) {
				return byIdIndex;
			}
		}

		if (requestName) {
			const byNameMethodUrl = parsedItems.findIndex(item =>
				item.name === requestName &&
				(!requestMethod || item.request.method.toUpperCase() === requestMethod) &&
				(!requestUrl || item.request.url === requestUrl)
			);
			if (byNameMethodUrl >= 0 && byNameMethodUrl < parsedDocument.blocks.length) {
				return byNameMethodUrl;
			}
		}

		if (requestMethod || requestUrl) {
			const byMethodAndUrl = parsedItems.findIndex(item =>
				(!requestMethod || item.request.method.toUpperCase() === requestMethod) &&
				(!requestUrl || item.request.url === requestUrl)
			);
			if (byMethodAndUrl >= 0 && byMethodAndUrl < parsedDocument.blocks.length) {
				return byMethodAndUrl;
			}
		}

		if (parsedItems.length === 1) {
			return 0;
		}

		return -1;
	}

	private _buildRunInputFromFilePaths(filePaths: string[]): RunnerHurlRunInput | undefined {
		const normalizedPaths = Array.from(
			new Set(
				filePaths
					.map(value => value.trim())
					.filter(value => value.length > 0)
			)
		);

		if (normalizedPaths.length === 0) {
			return undefined;
		}

		if (normalizedPaths.length === 1) {
			return { collectionPath: normalizedPaths[0] };
		}

		const commonRoot = this._findCommonRoot(normalizedPaths.map(filePath => path.dirname(filePath)));
		const includePatterns = Array.from(
			new Set(
				normalizedPaths.map(filePath => this._normalizePatternPath(path.relative(commonRoot, filePath)))
			)
		);

		return {
			collectionPath: commonRoot,
			includePatterns
		};
	}

	private async _getAllCollectionFilePaths(): Promise<string[]> {
		if (!this._apiExplorerProvider) {
			return [];
		}

		const collections = await this._apiExplorerProvider.getCollections();
		const allPaths: string[] = [];
		for (const collection of collections) {
			if (collection.type !== 'collection') {
				continue;
			}
			const paths = this._apiExplorerProvider.getCollectionFilePathsById(collection.id);
			allPaths.push(...paths);
		}

		return Array.from(new Set(allPaths));
	}

	private _normalizePatternPath(pathValue: string): string {
		return pathValue.replace(/\\/g, '/');
	}

	private _findCommonRoot(paths: string[]): string {
		if (paths.length === 0) {
			return '';
		}
		if (paths.length === 1) {
			return path.resolve(paths[0]);
		}

		const resolved = paths.map(value => path.resolve(value));
		const splitPaths = resolved.map(value => value.split(path.sep).filter(Boolean));
		let shared = splitPaths[0];

		for (const parts of splitPaths.slice(1)) {
			let index = 0;
			while (index < shared.length && index < parts.length && shared[index] === parts[index]) {
				index += 1;
			}
			shared = shared.slice(0, index);
			if (shared.length === 0) {
				break;
			}
		}

		const root = path.parse(resolved[0]).root || path.sep;
		return shared.length > 0 ? path.join(root, ...shared) : root;
	}

	private async _getCollectionRunTargets(): Promise<Array<{ id: string; name: string; filePaths: string[] }>> {
		if (!this._apiExplorerProvider) {
			return [];
		}

		const collections = await this._apiExplorerProvider.getCollections();
		const targets: Array<{ id: string; name: string; filePaths: string[] }> = [];

		for (const collection of collections) {
			if (collection.type !== 'collection') {
				continue;
			}

			const collectionFilePaths = this._apiExplorerProvider.getCollectionFilePathsById(collection.id);
			if (collectionFilePaths.length === 0) {
				continue;
			}

			targets.push({
				id: collection.id,
				name: collection.name,
				filePaths: collectionFilePaths
			});
		}

		return targets;
	}

	private async _startHurlRun(input: RunnerHurlRunInput, viewContext: HurlRunViewContext): Promise<void> {
		if (this._activeRunAbortController) {
			vscode.window.showWarningMessage('A Hurl run is already in progress.');
			return;
		}

		let runner: RunnerHurlRunner;
		try {
			const commandPath = await getHurlBinaryManager().resolveCommandPath({
				autoInstall: true,
				promptOnFailure: true
			});
			runner = createHurlRunner({ command: commandPath });
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to resolve hurl executable.';
			TryItPanel.postMessage('hurlRunError', { message, context: viewContext });
			vscode.window.showErrorMessage(message);
			return;
		}

		const environment = await runner.verifyEnvironment();
		if (!environment.available) {
			const message = environment.errorMessage || 'The hurl command is not available in PATH.';
			TryItPanel.postMessage('hurlRunError', { message, context: viewContext });
			vscode.window.showErrorMessage(message);
			return;
		}

		this._activeRunAbortController = new AbortController();
		TryItPanel.show(this._extensionContext);
		TryItPanel.postMessage('hurlRunViewOpened', viewContext);

		try {
			await runner.runStream(
				input,
				{
					parallelism: 1,
					signal: this._activeRunAbortController.signal
				},
				event => {
					const uiEvent = this._mapRunEvent(event);
					TryItPanel.postMessage('hurlRunEvent', uiEvent);
				}
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to execute Hurl run.';
			TryItPanel.postMessage('hurlRunError', { message, context: viewContext });
			vscode.window.showErrorMessage(message);
		} finally {
			this._activeRunAbortController = undefined;
		}
	}

	private _stopActiveRun(): void {
		if (this._activeRunAbortController) {
			this._activeRunAbortController.abort();
		}
	}

	private async _handleRunCollection(collectionId: string): Promise<void> {
		try {
			if (!this._apiExplorerProvider) {
				vscode.window.showErrorMessage('API Explorer provider not available');
				return;
			}

			const filePaths = this._apiExplorerProvider.getCollectionFilePathsById(collectionId);
			const runInput = this._buildRunInputFromFilePaths(filePaths);
			if (!runInput) {
				vscode.window.showErrorMessage('Unable to determine collection files for run.');
				return;
			}

			const allCollections = await this._apiExplorerProvider.getCollections();
			const collection = allCollections.find(item => item.id === collectionId);
			const label = collection?.name || 'Collection Run';
			const sourcePath = runInput.collectionPath;

			await this._startHurlRun(
				runInput,
				{
					scope: 'collection',
					label,
					sourcePath
				}
			);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to run collection: ${error}`);
		}
	}

	private async _handleRunFolder(folderId: string, folderPath: string, folderName?: string): Promise<void> {
		try {
			if (!folderPath) {
				vscode.window.showErrorMessage('Unable to determine folder path for run.');
				return;
			}

			const fs = await import('fs/promises');
			try {
				const stats = await fs.stat(folderPath);
				if (!stats.isDirectory()) {
					vscode.window.showErrorMessage('Selected folder path is not a directory.');
					return;
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Folder does not exist: ${error}`);
				return;
			}

			const label = folderName || path.basename(folderPath) || folderId || 'Folder Run';
			await this._startHurlRun(
				{ collectionPath: folderPath },
				{
					scope: 'collection',
					label,
					sourcePath: folderPath
				}
			);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to run folder: ${error}`);
		}
	}

	private async _handleRunAllCollections(): Promise<void> {
		try {
			const allFilePaths = await this._getAllCollectionFilePaths();
			if (allFilePaths.length === 0) {
				vscode.window.showWarningMessage('No collections available to run.');
				return;
			}

			const runInput = this._buildRunInputFromFilePaths(allFilePaths);
			if (!runInput) {
				vscode.window.showWarningMessage('No collections available to run.');
				return;
			}

			await this._startHurlRun(
				runInput,
				{
					scope: 'all',
					label: 'All Collections',
					sourcePath: runInput.collectionPath
				}
			);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to run all collections: ${error}`);
		}
	}

	public async runAllCollections(): Promise<void> {
		await this._handleRunAllCollections();
	}

	private async _handleDeleteFolder(folderId: string, folderPath: string, currentName: string): Promise<void> {
		try {
			if (!folderPath) {
				vscode.window.showErrorMessage('Unable to determine folder path');
				return;
			}

			const folderName = currentName || path.basename(folderPath) || folderId || 'Folder';
			const result = await vscode.window.showWarningMessage(
				`Are you sure you want to delete the folder "${folderName}"? This cannot be undone.`,
				{ modal: true },
				'Delete',
				'Cancel'
			);

			if (result !== 'Delete') {
				return;
			}

			const fs = await import('fs/promises');
			try {
				await fs.rm(folderPath, { recursive: true, force: true });
				vscode.window.showInformationMessage(`Folder "${folderName}" deleted successfully`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to delete folder: ${error}`);
				return;
			}

			await vscode.commands.executeCommand('api-tryit.clearSelection');
			try {
				ApiTryItStateMachine.sendEvent(EVENT_TYPE.CLEAR_COLLECTION_CONTEXT, undefined, folderPath);
			} catch {
				// non-fatal
			}

			if (this._apiExplorerProvider) {
				await this._apiExplorerProvider.reloadCollections();
			}

			this._sendCollections(true);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to delete folder: ${error}`);
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
		const visit = (nodes: unknown[]): Record<string, unknown> | undefined => {
			for (const nodeUnknown of nodes) {
				const node = nodeUnknown as Record<string, unknown>;
				if (node.id === requestId) {
					return node;
				}
				const children = node.children;
				if (Array.isArray(children)) {
					const found = visit(children);
					if (found) {
						return found;
					}
				}
			}
			return undefined;
		};

		return visit(collections);
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

			const collectionFilePaths = this._apiExplorerProvider.getCollectionFilePathsById(collectionId);
			if (collectionFilePaths.length === 0) {
				vscode.window.showErrorMessage('Unable to determine collection file path(s)');
				return;
			}

			try {
				await Promise.all(
					collectionFilePaths.map(async collectionFilePath => {
						await fs.rm(collectionFilePath, { recursive: false, force: true });
					})
				);
				vscode.window.showInformationMessage(`Collection "${collectionName}" deleted successfully`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to delete collection file(s): ${error}`);
				return;
			}

			await vscode.commands.executeCommand('api-tryit.clearSelection');
			try {
				ApiTryItStateMachine.sendEvent(EVENT_TYPE.CLEAR_COLLECTION_CONTEXT, undefined, path.dirname(collectionFilePaths[0]));
			} catch {
				// non-fatal
			}

			if (this._apiExplorerProvider) {
				this._apiExplorerProvider.removeCollectionById(collectionId);
			}

			if (this._apiExplorerProvider) {
				await this._apiExplorerProvider.reloadCollections();
			}

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

			let fileContent = '';
			try {
				fileContent = await fs.readFile(requestFilePath, 'utf-8');
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to read request file: ${error}`);
				return;
			}

			const blockIndex = this._resolveRequestBlockIndex(fileContent, requestItem);
			if (blockIndex < 0) {
				vscode.window.showErrorMessage('Failed to locate the request block in collection file.');
				return;
			}

			const parsed = parseHurlDocument(fileContent);
			const remainingBlocks = parsed.blocks
				.filter((_, index) => index !== blockIndex)
				.map(block => block.text);
			const updatedContent = composeHurlDocument(parsed.header, remainingBlocks);

			try {
				await fs.writeFile(requestFilePath, updatedContent, 'utf-8');
				vscode.window.showInformationMessage(`Request "${requestName}" deleted successfully`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to update request file: ${error}`);
				return;
			}

			await vscode.commands.executeCommand('api-tryit.clearSelection');

			if (this._apiExplorerProvider) {
				await this._apiExplorerProvider.reloadCollections();
			}

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

			const collectionFilePaths = this._apiExplorerProvider.getCollectionFilePathsById(collectionId);
			if (collectionFilePaths.length === 0) {
				vscode.window.showErrorMessage('Unable to determine collection file path(s)');
				return;
			}

			try {
				await Promise.all(
					collectionFilePaths.map(async collectionFilePath => {
						const content = await fs.readFile(collectionFilePath, 'utf-8');
						const updated = upsertCollectionNameInHurl(content, newName.trim());
						await fs.writeFile(collectionFilePath, updated, 'utf-8');
					})
				);
				vscode.window.showInformationMessage(`Collection renamed to "${newName}" successfully`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to rename collection: ${error}`);
				return;
			}

			if (this._apiExplorerProvider) {
				await this._apiExplorerProvider.reloadCollections();
			}

			this._sendCollections(true);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to rename collection: ${error}`);
		}
	}

	private async _handleRenameFolder(folderId: string, folderPath: string, currentName: string) {
		try {
			if (!folderPath) {
				vscode.window.showErrorMessage('Unable to determine folder path');
				return;
			}

			const newName = await vscode.window.showInputBox({
				prompt: 'Enter new folder name',
				value: currentName,
				validateInput: (value: string) => {
					if (!value.trim()) {
						return 'Folder name cannot be empty';
					}
					return undefined;
				}
			});

			if (!newName || newName === currentName) {
				return;
			}

			const fs = await import('fs/promises');
			const path = await import('path');

			const sanitized = sanitizeForFileSystem(newName);
			if (!sanitized) {
				vscode.window.showErrorMessage('Invalid folder name');
				return;
			}

			const parentDir = path.dirname(folderPath);
			const currentFolderName = path.basename(folderPath);
			const newPath = path.join(parentDir, sanitized);

			if (currentFolderName === sanitized) {
				return;
			}

			try {
				await fs.stat(newPath);
				vscode.window.showErrorMessage(`Folder "${newName}" already exists`);
				return;
			} catch {
				// Expected: destination does not exist
			}

			try {
				await fs.rename(folderPath, newPath);
				vscode.window.showInformationMessage(`Folder renamed to "${newName}" successfully`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to rename folder: ${error}`);
				return;
			}

			if (this._apiExplorerProvider) {
				await this._apiExplorerProvider.reloadCollections();
			}
			this._sendCollections(true);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to rename folder: ${error}`);
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

			try {
				const fileContent = await fs.readFile(requestFilePath, 'utf-8');
				const blockIndex = this._resolveRequestBlockIndex(fileContent, requestItem);
				if (blockIndex < 0) {
					vscode.window.showErrorMessage('Failed to locate the request block in collection file.');
					return;
				}

				const parsed = parseHurlDocument(fileContent);
				const updatedBlocks = parsed.blocks.map((block, index) =>
					index === blockIndex ? replaceRequestBlockName(block.text, newName.trim()) : block.text
				);
				const updatedContent = composeHurlDocument(parsed.header, updatedBlocks);
				await fs.writeFile(requestFilePath, updatedContent, 'utf-8');
				vscode.window.showInformationMessage(`Request renamed to "${newName}" successfully`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to update request file: ${error}`);
				return;
			}

			if (this._apiExplorerProvider) {
				await this._apiExplorerProvider.reloadCollections();
			}

			this._sendCollections(true);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to rename request: ${error}`);
		}
	}

    private _getWebviewContent(webview: vscode.Webview) {
        const scriptUris = getComposerJSFiles(this._extensionContext, 'ApiTryItVisualizer', webview);
        const nonce = crypto.randomBytes(16).toString('hex');
        const isDevMode = process.env.WEB_VIEW_WATCH_MODE === 'true';
        const devHost = process.env.TRY_VIEW_DEV_HOST || 'http://localhost:9092';
        // In dev mode, scripts and fonts may come from the webpack-dev-server (e.g. localhost:9092).
        // Those dynamic chunk URLs have no nonce and are not from ${webview.cspSource}, so we must
        // explicitly allow the dev host in the CSP. In production only local extension resources apply.
        const extraSrc = isDevMode ? ` ${devHost}` : '';

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <meta http-equiv="Content-Security-Policy"
                content="default-src 'none'; font-src ${webview.cspSource}${extraSrc} data:; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource}${extraSrc} 'unsafe-inline'; script-src ${webview.cspSource}${extraSrc} 'nonce-${nonce}';">

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
            ${scriptUris.map(jsFile => `<script nonce="${nonce}" charset="UTF-8" src="${jsFile}"></script>`).join('\n')}
            <script nonce="${nonce}">
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
