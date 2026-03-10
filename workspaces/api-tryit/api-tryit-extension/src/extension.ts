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
import { activateActivityPanel } from './activity-panel/activate';
import { TryItPanel } from './webview-panel/TryItPanel';
import { ActivityPanel } from './activity-panel/webview';
import { ApiExplorerProvider } from './tree-view/ApiExplorerProvider';
import { ApiTryItStateMachine, EVENT_TYPE } from './stateMachine';
import { ApiRequestItem } from '@wso2/api-tryit-core';
import type { HurlCollectionPayload } from '@wso2/api-tryit-hurl-parser';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import RunHurlTest from './tools/run-hurl-test';
import { getHurlBinaryManager, initializeHurlBinaryManager } from './hurl/hurl-binary-manager';
import { setPendingBiSavePath, getActiveCollectionFilePath, setActiveCollectionFilePath } from './bi-save-context';

const PENDING_HURL_IMPORT_KEY = 'api-tryit.pendingHurlImportContext';

type PendingHurlImportContext = {
	targetToOpen: string;
	collectionPath: string;
	firstRequestPath?: string;
	timestamp: number;
};

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

function buildCollectionIdFromName(name: string): string {
	const normalized = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s_-]/g, '')
		.replace(/[\s_]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

	return normalized || `hurl-collection-${Date.now()}`;
}

function normalizeCollectionNameKey(name: string): string {
	return name.trim().toLowerCase();
}

function extractCollectionNameFromHurlText(content: string): string | undefined {
	const match = content.match(/^#\s*@collectionName\s+(.+)$/im);
	return match?.[1]?.trim();
}

async function resolveMatchingActiveCollectionFile(
	activeFilePath: string,
	expectedCollectionName: string
): Promise<string | undefined> {
	try {
		await fs.access(activeFilePath);
		const content = await fs.readFile(activeFilePath, 'utf-8');
		const activeCollectionName = extractCollectionNameFromHurlText(content) ||
			path.basename(activeFilePath, path.extname(activeFilePath));
		const matchesByName = normalizeCollectionNameKey(activeCollectionName) ===
			normalizeCollectionNameKey(expectedCollectionName);
		const matchesById = buildCollectionIdFromName(activeCollectionName) ===
			buildCollectionIdFromName(expectedCollectionName);

		return (matchesByName || matchesById) ? activeFilePath : undefined;
	} catch {
		return undefined;
	}
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
): Promise<{ collectionPath: string; firstRequestPath?: string }> {
	await fs.mkdir(apiTestPath, { recursive: true });

	const collectionDirName = sanitizePathSegment(collectionName, `collection-${Date.now()}`);
	const collectionPath = path.join(apiTestPath, collectionDirName);
	await fs.mkdir(collectionPath, { recursive: true });
	let firstRequestPath: string | undefined;

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
		const baseName = sanitizePathSegment(
			typeof persistedRequest.name === 'string' ? persistedRequest.name : `request-${index + 1}`,
			`request-${index + 1}`
		);
		let fileName = `${baseName}.yaml`;
		let requestPath = path.join(collectionPath, fileName);
		let suffix = 1;
		while (true) {
			try {
				await fs.access(requestPath);
				fileName = `${baseName}-${suffix}.yaml`;
				requestPath = path.join(collectionPath, fileName);
				suffix++;
			} catch {
				break; // filePath available
			}
		}

		await fs.writeFile(requestPath, yaml.dump(persistedRequest), 'utf-8');
		if (!firstRequestPath) {
			firstRequestPath = requestPath;
		}
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
			const baseName = sanitizePathSegment(
				typeof persistedRequest.name === 'string' ? persistedRequest.name : `request-${requestIndex + 1}`,
				`request-${requestIndex + 1}`
			);
			let fileName = `${baseName}.yaml`;
			let requestPath = path.join(folderPath, fileName);
			let suffix = 1;
			while (true) {
				try {
					await fs.access(requestPath);
					fileName = `${baseName}-${suffix}.yaml`;
					requestPath = path.join(folderPath, fileName);
					suffix++;
				} catch {
					break;
				}
			}

			await fs.writeFile(requestPath, yaml.dump(persistedRequest), 'utf-8');
			if (!firstRequestPath) {
				firstRequestPath = requestPath;
			}
		}
	}

	return { collectionPath, firstRequestPath };
}

async function createHurlCollectionFolderStructure(
	apiTestPath: string,
	collectionName: string,
	collectionData: Record<string, unknown> | HurlCollectionPayload,
	collectionFolderNameOverride?: string
): Promise<{ collectionPath: string; firstRequestPath?: string }> {
	await fs.mkdir(apiTestPath, { recursive: true });

	const collectionDirName = sanitizePathSegment(
		collectionFolderNameOverride && collectionFolderNameOverride.trim().length > 0
			? collectionFolderNameOverride
			: collectionName,
		`collection-${Date.now()}`
	);
	const collectionPath = path.join(apiTestPath, collectionDirName);
	await fs.mkdir(collectionPath, { recursive: true });
	const collectionFileName = `${sanitizePathSegment(collectionName, collectionDirName)}.hurl`;
	const collectionFilePath = path.join(collectionPath, collectionFileName);

	const normalizeEntryContent = (raw: Record<string, unknown>, fallbackName: string): string => {
		const name = typeof raw.name === 'string' ? raw.name : fallbackName;
		let content = typeof raw.content === 'string' ? raw.content : (typeof raw.hurl === 'string' ? raw.hurl : '');
		if (content.includes('\\n')) {
			content = content.replace(/\\n/g, '\n');
		}
		content = content.replace(/\r\n/g, '\n').trim();
		content = content.replace(/^#\s*@collectionName[^\n]*\n?/gim, '').trim();

		if (!/^#\s*@name\s+/m.test(content)) {
			content = `# @name ${name}\n${content}`;
		}

		return content.trim();
	};

	const rootItems = Array.isArray(collectionData.requests)
		? collectionData.requests
		: (Array.isArray(collectionData.rootItems) ? collectionData.rootItems : []);

	const blocks: string[] = rootItems.map((rawUnknown, index) =>
		normalizeEntryContent(rawUnknown as Record<string, unknown>, `Request ${index + 1}`)
	);

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
			const raw = folderItems[requestIndex] as Record<string, unknown>;
			blocks.push(normalizeEntryContent(raw, `Request ${requestIndex + 1}`));
		}
	}

	// Read existing file if present so we can merge instead of overwrite
	let existingContent = '';
	try {
		existingContent = await fs.readFile(collectionFilePath, 'utf-8');
	} catch {
		// File doesn't exist yet — will be created fresh
	}

	if (existingContent.trim()) {
		// Collect @name values already in the file
		const existingNames = new Set<string>();
		const nameRegex = /^#\s*@name\s+(.+)$/gm;
		let m: RegExpExecArray | null;
		while ((m = nameRegex.exec(existingContent)) !== null) {
			existingNames.add(m[1].trim());
		}

		// Only append blocks whose @name is not already present
		const newBlocks = blocks.filter(block => {
			const nameMatch = /^#\s*@name\s+(.+)$/m.exec(block);
			const blockName = nameMatch ? nameMatch[1].trim() : null;
			return !blockName || !existingNames.has(blockName);
		});

		if (newBlocks.length > 0) {
			await fs.appendFile(collectionFilePath, '\n\n' + newBlocks.join('\n\n') + '\n', 'utf-8');
		}
	} else {
		const collectionHeader = `# @collectionName ${collectionName.trim() || 'Hurl Collection'}`;
		const combinedContent = [collectionHeader, ...blocks.filter(Boolean)].join('\n\n').trimEnd() + '\n';
		await fs.writeFile(collectionFilePath, combinedContent, 'utf-8');
	}

	return { collectionPath, firstRequestPath: collectionFilePath };
}

export async function activate(context: vscode.ExtensionContext) {
	initializeHurlBinaryManager(context);

	// Register the API Explorer tree view provider
	const apiExplorerProvider = new ApiExplorerProvider();

	// Debounced workspace file-change sync for the visualizer.
	let workspaceRefreshTimer: NodeJS.Timeout | undefined;
	let isWorkspaceRefreshInProgress = false;
	let hasPendingWorkspaceRefresh = false;

	const syncVisualizerWithWorkspace = async () => {
		if (isWorkspaceRefreshInProgress) {
			hasPendingWorkspaceRefresh = true;
			return;
		}
		isWorkspaceRefreshInProgress = true;
		hasPendingWorkspaceRefresh = false;

			try {
				await apiExplorerProvider.reloadCollections();

				const stateContext = ApiTryItStateMachine.getContext();
				const selectedFilePath = stateContext.selectedFilePath || stateContext.selectedItem?.filePath;
				if (selectedFilePath) {
					const selectedItem = stateContext.selectedItem;
					const match = apiExplorerProvider.findRequestByFilePath(
						selectedFilePath,
						selectedItem?.id,
						selectedItem?.name || selectedItem?.request?.name,
						selectedItem?.request?.method,
						selectedItem?.request?.url
					);
					if (match?.requestItem) {
						await ApiTryItStateMachine.sendEvent(
							EVENT_TYPE.API_ITEM_SELECTED,
							match.requestItem,
						match.requestItem.filePath
					);
				}
			}
		} catch {
			// Keep watcher resilient; avoid noisy errors for transient filesystem changes.
		} finally {
			isWorkspaceRefreshInProgress = false;
			if (hasPendingWorkspaceRefresh) {
				void syncVisualizerWithWorkspace();
			}
		}
	};

	const scheduleWorkspaceSync = () => {
		if (workspaceRefreshTimer) {
			clearTimeout(workspaceRefreshTimer);
		}
		workspaceRefreshTimer = setTimeout(() => {
			void syncVisualizerWithWorkspace();
		}, 250);
	};

	const relevantWorkspaceFileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{hurl,yaml,yml}');
	relevantWorkspaceFileWatcher.onDidChange(() => scheduleWorkspaceSync());
	relevantWorkspaceFileWatcher.onDidCreate(() => scheduleWorkspaceSync());
	relevantWorkspaceFileWatcher.onDidDelete(() => scheduleWorkspaceSync());
	context.subscriptions.push(
		relevantWorkspaceFileWatcher,
		new vscode.Disposable(() => {
			if (workspaceRefreshTimer) {
				clearTimeout(workspaceRefreshTimer);
			}
		})
	);

	// Initialize RPC handlers
	TryItPanel.init(apiExplorerProvider);

	// Register the explorer with the state machine so it can trigger direct reloads when needed
	ApiTryItStateMachine.registerExplorer(apiExplorerProvider);

	// Register the activity panel with the API explorer provider
	const activityPanelProvider = activateActivityPanel(context, apiExplorerProvider);

	// If we just opened a folder/window from an import flow, restore focus and selection.
	const pendingImport = context.globalState.get<PendingHurlImportContext>(PENDING_HURL_IMPORT_KEY);
	if (pendingImport) {
		const workspaceRoots = (vscode.workspace.workspaceFolders || []).map(f => f.uri.fsPath);
		const matchesCurrentWorkspace = workspaceRoots.some(root =>
			pendingImport.targetToOpen === root || pendingImport.collectionPath.startsWith(root)
		);

		if (matchesCurrentWorkspace) {
			await context.globalState.update(PENDING_HURL_IMPORT_KEY, undefined);

			setTimeout(async () => {
				try {
					await apiExplorerProvider.reloadCollections();
					await vscode.commands.executeCommand('workbench.view.extension.api-tryit');
					await vscode.commands.executeCommand('api-tryit.activity.panel.focus');

					TryItPanel.show(context);

					if (pendingImport.firstRequestPath) {
						await vscode.commands.executeCommand('api-tryit.selectItemByPath', pendingImport.firstRequestPath);
						const match = apiExplorerProvider.findRequestByFilePath(pendingImport.firstRequestPath);
						if (match) {
							await vscode.commands.executeCommand('api-tryit.openRequest', match.requestItem);
						}
					}
				} catch {
					// ignore startup race issues
				}
			}, 800);
		}
	}

	// Auto-trigger API TryIt when workspace contains .hurl files with @collectionName or @name annotations
	const autoTriggerFromHurlWorkspace = async () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return;
		}
		try {
			const hurlFiles = await vscode.workspace.findFiles('**/*.hurl', '**/node_modules/**', 20);
			for (const fileUri of hurlFiles) {
				try {
					const bytes = await vscode.workspace.fs.readFile(fileUri);
					const text = Buffer.from(bytes).toString('utf8');
					if (/^#\s*@collectionName\s+/im.test(text) || /^#\s*@name\s+/im.test(text)) {
						await apiExplorerProvider.reloadCollections();
						try {
							await vscode.commands.executeCommand('workbench.view.extension.api-tryit');
							await vscode.commands.executeCommand('api-tryit.activity.panel.focus');
						} catch {
							// ignore if view is not available
						}
						return;
					}
				} catch {
					// ignore unreadable files
				}
			}
		} catch {
			// ignore workspace scan errors
		}
	};

	if (!pendingImport) {
		setTimeout(() => void autoTriggerFromHurlWorkspace(), 1000);
	}

	context.subscriptions.push(
		vscode.workspace.onDidChangeWorkspaceFolders(event => {
			if (event.added.length > 0) {
				void autoTriggerFromHurlWorkspace();
			}
		})
	);

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

	const runAllCollectionsCommand = vscode.commands.registerCommand('api-tryit.runAllCollections', async () => {
		await activityPanelProvider.runAllCollections();
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
	const selectItemByPathCommand = vscode.commands.registerCommand(
		'api-tryit.selectItemByPath',
		async (filePath: string, requestId?: string, requestName?: string, requestMethod?: string, requestUrl?: string) => {
		if (!filePath || typeof filePath !== 'string') {
			vscode.window.showWarningMessage('No file path provided to select');
			return;
		}

		// Try to locate the request using cached collections; reload once if not found
		let match = apiExplorerProvider.findRequestByFilePath(filePath, requestId, requestName, requestMethod, requestUrl);
		if (!match) {
			await apiExplorerProvider.reloadCollections();
			match = apiExplorerProvider.findRequestByFilePath(filePath, requestId, requestName, requestMethod, requestUrl);
		}

		if (!match) {
			vscode.window.showWarningMessage('Saved request not found in API Explorer');
			return;
		}

		const { collection, requestItem, treeItemId, parentIds } = match;

		// Inform the activity panel webview so it can highlight the saved request
		ActivityPanel.postMessage('selectItem', {
			id: treeItemId,
			parentIds,
			filePath: requestItem.filePath,
			name: requestItem.name,
			collectionId: collection.id,
			collectionName: collection.name,
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

	// Register command to open from Hurl (paste Hurl content or request)
	const openFromHurlCommand = vscode.commands.registerCommand('api-tryit.openFromHurl', async (hurlString?: string) => {
		try {
			// Prompt user if no value provided
			if (!hurlString || typeof hurlString !== 'string') {
				hurlString = await vscode.window.showInputBox({
					prompt: 'Paste your Hurl request or file contents',
					placeHolder: 'GET https://api.example.com/path\nHTTP 200\n[Asserts]\nstatus == 200',
					title: 'Import from Hurl'
				});

				if (!hurlString) {
					return; // User cancelled
				}
			}

			const { parseHurlCollection } = await import('@wso2/api-tryit-hurl-parser');

			let normalized = hurlString.trim();
			let sourceFilePath: string | undefined;

			// If user pasted escaped newlines (e.g. "\n"), convert them to real newlines
			if (normalized.includes('\\n')) {
				normalized = normalized.replace(/\\n/g, '\n');
			}

			// If user provided a path to a .hurl file, read its contents
			try {
				if (normalized.endsWith('.hurl') && await fs.access(normalized).then(() => true).catch(() => false)) {
					sourceFilePath = normalized;
					normalized = await fs.readFile(normalized, 'utf-8');
				}
			} catch {
				// ignore - we'll try to parse the original string below
			}

			let parsedCollection;
			try {
				parsedCollection = parseHurlCollection(normalized, {
					sourceFilePath
				});
			} catch (err: unknown) {
				// Provide a more actionable error message for common mistakes
				const msg = err instanceof Error ? err.message : 'Invalid Hurl content';
				vscode.window.showErrorMessage(`${msg}. Tip: paste full Hurl content (multiline) or select a .hurl file.`);
				return;
			}

			const requestItems = parsedCollection.rootItems || [];
			const firstRequestItem = requestItems[0];

			if (!firstRequestItem || !firstRequestItem.request.url) {
				vscode.window.showErrorMessage('Could not parse Hurl content. Please check the format and try again.');
				return;
			}

			if (requestItems.length > 1) {
				apiExplorerProvider.addInMemoryCollection(parsedCollection);
			}

			// Reveal panel and load the request
			try {
				await vscode.commands.executeCommand('workbench.view.extension.api-tryit');
				await vscode.commands.executeCommand('api-tryit.activity.panel.focus');
			} catch {
				// ignore
			}

			TryItPanel.show(context);
			ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, firstRequestItem, undefined);
			TryItPanel.postMessage('apiRequestItemSelected', firstRequestItem);

			const loadedMessage = requestItems.length > 1
				? `Loaded ${requestItems.length} requests from Hurl collection "${parsedCollection.name}"`
				: `Loaded: ${firstRequestItem.request.method} ${firstRequestItem.request.url}`;

			vscode.window.showInformationMessage(loadedMessage);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to import Hurl: ${msg}`);
		}
	});

	// Register command to import Hurl collection payload (JSON with multiple .hurl entries)
	const openFromHurlCollectionCommand = vscode.commands.registerCommand('api-tryit.openFromHurlCollection', async (payload?: string | Record<string, unknown>, folderNameArg?: string, baseDirArg?: string) => {
		try {
			// Try to obtain workspace root if available, but we will prompt for a directory when none is open
			const workspaceRoot = await getWorkspaceRoot();

			// If payload not provided, prompt the user to paste JSON
			if (!payload) {
				const input = await vscode.window.showInputBox({
					prompt: 'Paste your Hurl collection JSON payload',
					placeHolder: '{"name":"My Hurl Collection","requests":[{"name":"List","content":"GET https://...\\nHTTP 200"}], "folders": []}',
					title: 'Import Hurl Collection Payload'
				});

				if (!input) return; // user cancelled
				payload = input;
			}

			// Accept either JSON string or an object payload
			let parsed: unknown;
			if (typeof payload === 'string') {
				try {
					parsed = JSON.parse(payload as string);
				} catch (err) {
					vscode.window.showErrorMessage('Invalid JSON payload. Please provide a valid JSON object');
					return;
				}
			} else {
				parsed = payload;
			}

			// Determine optional target folder name (explicit arg overrides payload field)
			let providedFolderName: string | undefined = undefined;
			if (folderNameArg && typeof folderNameArg === 'string' && folderNameArg.trim()) {
				providedFolderName = folderNameArg.trim();
			} else if (parsed && typeof parsed === 'object') {
				const p = parsed as Record<string, unknown>;
				if (typeof p.folderName === 'string' && p.folderName.trim()) providedFolderName = p.folderName.trim();
				else if (typeof p.folder === 'string' && p.folder.trim()) providedFolderName = p.folder.trim();
			}

			// Normalize/validate using utility
			const { normalizeHurlCollectionPayload } = await import('./util');
			let normalized;
			try {
				normalized = normalizeHurlCollectionPayload(parsed);
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : 'Invalid payload';
				vscode.window.showErrorMessage(`Failed to parse Hurl collection payload: ${msg}`);
				return;
			}

			// Determine parent path where collection folder will be created
			let parentPath: string | undefined;
			// Remember the folder the user explicitly selected (used when no workspace is open)
			let selectedParentDir: string | undefined;
			if (workspaceRoot) {
				// When baseDirArg is provided (e.g. "bi-tryit-apis"), nest the collection under that subdirectory.
				parentPath = baseDirArg && typeof baseDirArg === 'string' && baseDirArg.trim()
					? path.join(workspaceRoot, baseDirArg.trim())
					: workspaceRoot;
			} else {
				// No workspace open — ask user to select a directory to create the collection in
				const folderUris = await vscode.window.showOpenDialog({
					canSelectFolders: true,
					canSelectFiles: false,
					canSelectMany: false,
					openLabel: 'Select folder to create collection in'
				});
				if (!folderUris || folderUris.length === 0) return; // user cancelled
				const parent = folderUris[0].fsPath;
				selectedParentDir = parent;
				parentPath = parent;
			}

			if (!parentPath) {
				vscode.window.showErrorMessage('Could not determine target directory for collection');
				return;
			}

			// IN-MEMORY MODE: when baseDirArg is provided (Ballerina Integrator "Try It"),
			// do NOT write to disk yet. Load the request in-memory and store the intended
			// save path so the Save dialog defaults to bi-tryit-apis/<name>/<name>.hurl.
			if (baseDirArg && workspaceRoot) {
				// Build a combined Hurl string and parse FIRST so the collection name
				// and save file name are both derived from the same parsed result.
				const { parseHurlCollection } = await import('@wso2/api-tryit-hurl-parser');
				const serviceName = normalized.name.trim() || 'API Collection';
				const payloadCollectionId = typeof normalized.id === 'string' && normalized.id.trim()
					? normalized.id.trim()
					: undefined;
				const collectionHeader = `# @collectionName ${serviceName}`;
				const rawRequests = Array.isArray(normalized.requests) ? normalized.requests : [];
				const blocks = rawRequests.map((rawUnknown, idx) => {
					const raw = rawUnknown as unknown as Record<string, unknown>;
					const name = typeof raw.name === 'string' ? raw.name : `Request ${idx + 1}`;
					let content = typeof raw.content === 'string' ? raw.content : (typeof raw.hurl === 'string' ? raw.hurl : '');
					if (content.includes('\\n')) { content = content.replace(/\\n/g, '\n'); }
					content = content.replace(/\r\n/g, '\n').trim();
					content = content.replace(/^#\s*@collectionName[^\n]*\n?/gim, '').trim();
					if (!/^#\s*@name\s+/m.test(content)) { content = `# @name ${name}\n${content}`; }
					return content.trim();
				}).filter(Boolean);

				const combinedHurl = [collectionHeader, ...blocks].join('\n\n');
				let parsedCollection;
				try {
					// Pass collectionName AND collectionId so the in-memory collection
					// ID is consistent with the disk collection ID that loadCollections()
					// derives via buildCollectionId(serviceName) — preventing duplicate
					// collection entries after the first save.
					parsedCollection = parseHurlCollection(combinedHurl, {
						collectionName: serviceName,
						collectionId: payloadCollectionId || buildCollectionIdFromName(serviceName),
					});
				} catch {
					// Fallback: open empty request
				}

				// Derive file name from the parsed collection name so they always match
				const collName = parsedCollection?.name || serviceName;
				const collFileName = `${sanitizePathSegment(collName, `collection-${Date.now()}`)}.hurl`;
				const pendingPath = path.join(workspaceRoot, 'api-tryit', collFileName);

				// Check for an existing collection: disk file first, then in-memory.
				// Resource TryIt must merge into an existing collection rather than
				// replacing it with a single-request one.
				let existingDiskPath: string | undefined;
				try {
					await fs.access(pendingPath);
					existingDiskPath = pendingPath;
				} catch {
					// pendingPath doesn't exist — check the active collection file from
					// the current session (handles name differences between ServiceDesigner
					// serviceIdentifier and DiagramWrapper serviceName).
					const activeFile = getActiveCollectionFilePath();
					if (activeFile) {
						existingDiskPath = await resolveMatchingActiveCollectionFile(activeFile, collName);
					}
				}

				// If no disk file, look for a matching in-memory collection (e.g. Service
				// TryIt was opened but nothing saved yet).
				// Match by ID first to avoid cross-service collisions when resource names
				// overlap; fall back to name for compatibility with older payloads.
				const existingInMemCollection = !existingDiskPath
					? ((parsedCollection ? apiExplorerProvider.findCollectionById(parsedCollection.id) : undefined) ||
					   apiExplorerProvider.findCollectionByName(collName))
					: undefined;

				try {
					await vscode.commands.executeCommand('workbench.view.extension.api-tryit');
					await vscode.commands.executeCommand('api-tryit.activity.panel.focus');
				} catch {
					// ignore if views not available
				}
				TryItPanel.show(context);

				if (existingDiskPath || existingInMemCollection) {
					// An existing collection was found. Instead of replacing it, check
					// whether the specific resource is already in it:
					//   - If YES  → open that existing request.
					//   - If NO   → add this resource as a new in-memory item alongside
					//               the existing ones, then select it.
					//
					// Exception: when the incoming payload contains multiple resources
					// (Service TryIt), replace the entire collection so all resources
					// are reflected (e.g. after a prior single-resource TryIt opened it).
					const resourceRequest = parsedCollection?.rootItems?.[0];
					const parsedCollectionId: string | undefined = parsedCollection?.id;
					const incomingItemCount = parsedCollection?.rootItems?.length ?? 0;

					if (parsedCollection && incomingItemCount > 1) {
						// Service TryIt with multiple resources — replace the whole collection.
						setTimeout(async () => {
							if (existingDiskPath && !apiExplorerProvider.findRequestByFilePath(existingDiskPath)) {
								await apiExplorerProvider.reloadCollections();
							}
							apiExplorerProvider.addInMemoryCollection(parsedCollection);
							await ActivityPanel.forceCollectionsRefresh();
							const firstItem = parsedCollection.rootItems?.[0] as ApiRequestItem | undefined;
							if (firstItem) {
								await ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, firstItem, undefined);
								ActivityPanel.postMessage('selectItem', {
									id: firstItem.id,
									parentIds: [parsedCollection.id]
								});
							}
						}, 200);
						return;
					}

					setTimeout(async () => {
						// Resolve current collection state (reload from disk if needed).
						if (existingDiskPath && !apiExplorerProvider.findRequestByFilePath(existingDiskPath)) {
							await apiExplorerProvider.reloadCollections();
						}
						// Match by ID first; fall back to name in case collection names
						// differ between Service TryIt and Resource TryIt invocations.
						const currentCollection =
							(parsedCollectionId ? apiExplorerProvider.findCollectionById(parsedCollectionId) : undefined) ||
							apiExplorerProvider.findCollectionByName(collName);
						if (!currentCollection) {
							ActivityPanel.forceCollectionsRefresh();
							return;
						}

						await ActivityPanel.forceCollectionsRefresh();

						// Look for the resource in the collection by @name and method.
						const existingItem = resourceRequest
							? (currentCollection.rootItems || []).find(item =>
								item.name === resourceRequest.name &&
								item.request.method.toUpperCase() === resourceRequest.request.method.toUpperCase()
							)
							: undefined;

						if (existingItem) {
							await ApiTryItStateMachine.sendEvent(
								EVENT_TYPE.API_ITEM_SELECTED,
								existingItem as ApiRequestItem,
								existingItem.filePath
							);
							ActivityPanel.postMessage('selectItem', {
								id: existingItem.id,
								parentIds: [currentCollection.id],
								filePath: existingItem.filePath,
								name: existingItem.name,
								collectionId: currentCollection.id,
								collectionName: currentCollection.name,
								method: existingItem.request.method,
								request: existingItem.request
							});
						} else if (resourceRequest) {
							// Resource not yet in collection — add it as a new in-memory item.
							const ts = Date.now();
							const newItem: ApiRequestItem = {
								id: `new-${ts}`,
								name: resourceRequest.name,
								request: { ...resourceRequest.request, id: `new-${ts}` }
								// filePath intentionally absent — stays in-memory until saved
							};

							apiExplorerProvider.addInMemoryCollection({
								...currentCollection,
								rootItems: [...(currentCollection.rootItems || []), newItem]
							});

							// If the collection already has a disk file, point the save
							// context at it so the new request appends there on save.
							if (existingDiskPath) {
								setActiveCollectionFilePath(existingDiskPath);
							}

							await ApiTryItStateMachine.sendEvent(
								EVENT_TYPE.API_ITEM_SELECTED,
								newItem,
								undefined
							);
							await ActivityPanel.forceCollectionsRefresh();
							ActivityPanel.postMessage('selectItem', {
								id: newItem.id,
								parentIds: [currentCollection.id]
							});
						}
					}, 200);
					return;
				}

				// No existing collection found by name or ID — but do a final check:
				// if parsedCollection.id already maps to a collection that was registered
				// in-memory (e.g. name lookup failed due to minor name differences), treat
				// it as existing rather than overwriting it with the single-request payload.
				if (parsedCollection) {
					const collById = apiExplorerProvider.findCollectionById(parsedCollection.id);
					if (collById) {
						// Redirect to the existing-collection path inline.
						const resourceRequest = parsedCollection.rootItems?.[0];
						// Service TryIt (multiple resources) — replace the whole collection.
						if ((parsedCollection.rootItems?.length ?? 0) > 1) {
							setTimeout(async () => {
								apiExplorerProvider.addInMemoryCollection(parsedCollection);
								await ActivityPanel.forceCollectionsRefresh();
								const firstItem = parsedCollection.rootItems?.[0] as ApiRequestItem | undefined;
								if (firstItem) {
									await ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, firstItem, undefined);
									ActivityPanel.postMessage('selectItem', {
										id: firstItem.id,
										parentIds: [parsedCollection.id]
									});
								}
							}, 200);
							return;
						}
						setTimeout(async () => {
							await ActivityPanel.forceCollectionsRefresh();
							const existingItem = resourceRequest
								? (collById.rootItems || []).find(item =>
									item.name === resourceRequest.name &&
									item.request.method.toUpperCase() === resourceRequest.request.method.toUpperCase()
								)
								: undefined;
							if (existingItem) {
								await ApiTryItStateMachine.sendEvent(
									EVENT_TYPE.API_ITEM_SELECTED,
									existingItem as ApiRequestItem,
									existingItem.filePath
								);
								ActivityPanel.postMessage('selectItem', {
									id: existingItem.id,
									parentIds: [collById.id],
									filePath: existingItem.filePath,
									name: existingItem.name,
									collectionId: collById.id,
									collectionName: collById.name,
									method: existingItem.request.method,
									request: existingItem.request
								});
							} else if (resourceRequest) {
								const ts = Date.now();
								const newItem: ApiRequestItem = {
									id: `new-${ts}`,
									name: resourceRequest.name,
									request: { ...resourceRequest.request, id: `new-${ts}` }
								};
								apiExplorerProvider.addInMemoryCollection({
									...collById,
									rootItems: [...(collById.rootItems || []), newItem]
								});
								await ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, newItem, undefined);
								await ActivityPanel.forceCollectionsRefresh();
								ActivityPanel.postMessage('selectItem', {
									id: newItem.id,
									parentIds: [collById.id]
								});
							}
						}, 200);
						return;
					}
				}

				// Truly no existing collection — first time opening this service in TryIt.
				// Register as in-memory and queue for save on first explicit save action.
				setPendingBiSavePath(pendingPath, collName, combinedHurl);

				const firstRequestItem = parsedCollection?.rootItems?.[0];

				if (firstRequestItem) {
					await ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, firstRequestItem as ApiRequestItem, undefined);
					TryItPanel.postMessage('apiRequestItemSelected', firstRequestItem);
				}

				// Register the parsed collection in-memory AFTER the views are ready so
				// the Explorer tree updates are not lost to a concurrent reloadCollections()
				// triggered by the project runner's file-system writes.
				if (parsedCollection) {
					apiExplorerProvider.addInMemoryCollection(parsedCollection);
					const firstItemId = (firstRequestItem as ApiRequestItem | undefined)?.id;
					const collectionId = parsedCollection.id;
					setTimeout(async () => {
						await ActivityPanel.forceCollectionsRefresh();
						if (firstItemId) {
							ActivityPanel.postMessage('selectItem', {
								id: firstItemId,
								parentIds: [collectionId]
							});
						}
					}, 200);
				}

				return;
			}

			// Ensure parent path exists
			await fs.mkdir(parentPath, { recursive: true });

			const { collectionPath, firstRequestPath } = await createHurlCollectionFolderStructure(
				parentPath,
				normalized.name,
				normalized,
				providedFolderName
			);

			// If collection created outside workspace, offer to open/add it. When no workspace is open,
			// prompt to open the new collection in a new window. Do NOT call reloadCollections when
			// there is no active workspace folder (it will surface an error).
			let isInWorkspace = vscode.workspace.workspaceFolders?.some(folder => collectionPath.startsWith(folder.uri.fsPath)) || false;

			if (!isInWorkspace) {
				if (workspaceRoot) {
					const pick = await vscode.window.showInformationMessage(
						`Collection "${normalized.name}" created at ${collectionPath}. Add to workspace or open it?`,
						'Open in New Window',
						'Add to Workspace',
						'Cancel'
					);

					if (pick === 'Open in New Window') {
						await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(collectionPath), true);
						return; // new window will load the collection
					} else if (pick === 'Add to Workspace') {
						vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, { uri: vscode.Uri.file(collectionPath), name: normalized.name });
						isInWorkspace = true; // now considered in workspace
					} else {
						vscode.window.showInformationMessage(`Hurl collection created at ${collectionPath}`);
						return;
					}
				} else {
				// No workspace open — ask to open the directory the user selected (not the newly-created collection folder)
				const pick = await vscode.window.showInformationMessage(
					`Collection created at ${collectionPath}. Open the selected folder now?`,
					'Open Folder',
					'Open in New Window',
					'Cancel'
				);
				if (pick === 'Open Folder' || pick === 'Open in New Window') {
					// Open the directory the user originally selected (fall back to collectionPath if missing)
					const targetToOpen = selectedParentDir ? selectedParentDir : collectionPath;
					await context.globalState.update(PENDING_HURL_IMPORT_KEY, {
						targetToOpen,
						collectionPath,
						firstRequestPath,
						timestamp: Date.now()
					} as PendingHurlImportContext);
					await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(targetToOpen), pick === 'Open in New Window');
					return;
				}
				vscode.window.showInformationMessage(`Hurl collection created at ${collectionPath}`);
				return;
			}
		}

		// At this point the collection is in-workspace (or was just added) — reload the explorer
			if (isInWorkspace) {
				await apiExplorerProvider.reloadCollections();

				// Reveal UI and open first request if exists
				try {
					await vscode.commands.executeCommand('workbench.view.extension.api-tryit');
					await vscode.commands.executeCommand('api-tryit.activity.panel.focus');
				} catch {
					// ignore
				}

				TryItPanel.show(context);

				if (firstRequestPath) {
					// Prefer the specific request from the payload (by @name) so we open exactly
					// what was clicked, even if the file already contained other requests.
					const firstReqRaw = Array.isArray(normalized.requests) && normalized.requests.length > 0
						? (normalized.requests[0] as unknown as Record<string, unknown>)
						: undefined;
					const firstReqName = typeof firstReqRaw?.name === 'string' ? firstReqRaw.name : undefined;
					await vscode.commands.executeCommand('api-tryit.selectItemByPath', firstRequestPath, undefined, firstReqName);
					const match = apiExplorerProvider.findRequestByFilePath(firstRequestPath, undefined, firstReqName);
					if (match) {
						await vscode.commands.executeCommand('api-tryit.openRequest', match.requestItem);
					}
				}
			}

			vscode.window.showInformationMessage(`Hurl collection "${normalized.name}" imported to ${collectionPath}`);
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			vscode.window.showErrorMessage(`Failed to import Hurl collection: ${msg}`);
		}
	});

	// Register command for new collection — use state machine to navigate to collection form
	const newCollectionCommand = vscode.commands.registerCommand('api-tryit.newCollection', () => {
		// Ensure TryIt panel is visible
		TryItPanel.show(context);

		// Notify state machine and webviews to show the collection form
		const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		ApiTryItStateMachine.sendEvent(EVENT_TYPE.SHOW_CREATE_COLLECTION_FORM);
		TryItPanel.postMessage('showCreateCollectionForm', { workspacePath });
		ActivityPanel.postMessage('showCreateCollectionForm', { workspacePath });

		// Provide quick feedback so the user knows the action was triggered
		vscode.window.setStatusBarMessage('✓ Sent showCreateCollectionForm message to webviews', 3000);
	});

	// Register command to import a collection file *or* collection folder (expects collection.yaml)
	const importCollectionCommand = vscode.commands.registerCommand('api-tryit.importCollection', async () => {
		const uris = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: true,
			canSelectMany: false,
			openLabel: 'Select collection file or folder to import'
		});
		if (!uris || uris.length === 0) return;
		const selected = uris[0];

		try {
			// If the user selected a folder -> validate collection.yaml/.yml and copy the whole folder
			const stats = await fs.stat(selected.fsPath);
			if (stats.isDirectory()) {
				const workspaceRoot = await getWorkspaceRoot();
				if (!workspaceRoot) return;

				// Require collection.yaml or collection.yml inside the selected folder
				const yamlCandidates = ['collection.yaml', 'collection.yml'];
				let metadataPath: string | null = null;
				for (const fname of yamlCandidates) {
					const p = path.join(selected.fsPath, fname);
					try {
						await fs.access(p);
						metadataPath = p;
						break;
					} catch {
						// continue
					}
				}
				if (!metadataPath) {
					vscode.window.showErrorMessage('Selected folder does not contain a valid collection.yaml');
					return;
				}

				// Read and parse YAML minimally (must parse and have a name)
				let metadataRaw: string;
				try {
					metadataRaw = await fs.readFile(metadataPath, 'utf-8');
				} catch (err) {
					vscode.window.showErrorMessage('Failed to read collection.yaml');
					return;
				}

				let metadataObj: any;
				try {
					const parsed = yaml.load(metadataRaw);
					metadataObj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
				} catch (err) {
					vscode.window.showErrorMessage('collection.yaml is not valid YAML');
					return;
				}

				if (!metadataObj || typeof metadataObj.name !== 'string' || metadataObj.name.trim().length === 0) {
					vscode.window.showErrorMessage('collection.yaml must contain a valid "name" property');
					return;
				}

				// Destination: workspaceRoot/api-test (create if missing)
				const apiTestPath = getApiTestPath(workspaceRoot);
				await fs.mkdir(apiTestPath, { recursive: true });

				// Destination folder name (preserve source folder basename)
				let destFolderName = path.basename(selected.fsPath);
				let destPath = path.join(apiTestPath, destFolderName);

				// Handle existing destination folder
				let destExists = false;
				try {
					await fs.access(destPath);
					destExists = true;
				} catch {
					destExists = false;
				}

				if (destExists) {
					const pick = await vscode.window.showQuickPick(['Overwrite', 'Rename', 'Cancel'], { placeHolder: `Folder "${destFolderName}" already exists in workspace` });
					if (!pick || pick === 'Cancel') return;
					if (pick === 'Overwrite') {
						await fs.rm(destPath, { recursive: true, force: true });
					} else if (pick === 'Rename') {
						// find a non-colliding name
						let suffix = 1;
						let candidate = `${destFolderName}-imported`;
						let candidatePath = path.join(apiTestPath, candidate);
						while (true) {
							try {
								await fs.access(candidatePath);
								suffix++;
								candidate = `${destFolderName}-imported-${suffix}`;
								candidatePath = path.join(apiTestPath, candidate);
							} catch {
								destFolderName = candidate;
								destPath = candidatePath;
								break;
							}
						}
					}
				}

				// Recursive copy helper
				async function copyDir(src: string, dst: string) {
					await fs.mkdir(dst, { recursive: true });
					const entries = await fs.readdir(src, { withFileTypes: true });
					for (const entry of entries) {
						const srcPath = path.join(src, entry.name);
						const dstPath = path.join(dst, entry.name);
						if (entry.isDirectory()) {
							await copyDir(srcPath, dstPath);
						} else if (entry.isFile()) {
							await fs.copyFile(srcPath, dstPath);
						}
					}
				}

				await copyDir(selected.fsPath, destPath);

				// Refresh explorer and open first request if available
				await apiExplorerProvider.reloadCollections();

				// Find first request file under destPath and open it
				async function findFirstRequestFile(dir: string): Promise<string | undefined> {
					const entries = await fs.readdir(dir, { withFileTypes: true });
					for (const entry of entries) {
						const p = path.join(dir, entry.name);
						if (entry.isFile()) {
							const lower = entry.name.toLowerCase();
							if (lower === 'collection.yaml' || lower === 'collection.yml' || lower === 'collection.json') continue;
							if (lower.endsWith('.yaml') || lower.endsWith('.yml') || lower.endsWith('.json')) return p;
						} else if (entry.isDirectory()) {
							const nested = await findFirstRequestFile(p);
							if (nested) return nested;
						}
					}
					return undefined;
				}

				const firstRequest = await findFirstRequestFile(destPath);
				if (firstRequest) {
					await vscode.commands.executeCommand('api-tryit.selectItemByPath', firstRequest);
					const match = apiExplorerProvider.findRequestByFilePath(firstRequest);
					if (match) {
						await vscode.commands.executeCommand('api-tryit.openRequest', match.requestItem);
					}
				}

				vscode.window.showInformationMessage(`Collection "${metadataObj.name}" imported to workspace`);
				return;
			}

			// If selected is a file, keep legacy behavior (copy into configured collectionsPath)
			const config = vscode.workspace.getConfiguration('api-tryit');
			const collectionsPath = config.get<string>('collectionsPath');
			if (!collectionsPath) {
				vscode.window.showWarningMessage('Collections path is not set. Please set it first.');
				return;
			}
			const destination = vscode.Uri.file(path.join(collectionsPath, selected.path.split('/').pop() || selected.path));
			await vscode.workspace.fs.copy(selected, destination, { overwrite: true });
			vscode.window.showInformationMessage('Collection imported');
			await apiExplorerProvider.reloadCollections();
		} catch (error: unknown) {
			const msg = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to import collection: ${msg}`);
		}
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
			const { firstRequestPath } = await createCollectionFolderStructure(
				apiTestPath,
				collectionData.name,
				collectionData as Record<string, unknown>
			);

			await apiExplorerProvider.reloadCollections();

			try {
				await vscode.commands.executeCommand('workbench.view.extension.api-tryit');
				await vscode.commands.executeCommand('api-tryit.activity.panel.focus');
			} catch {
				// Ignore reveal errors in test environments
			}

			TryItPanel.show(context);

			// If the imported collection has at least one request, auto-select and open the first one
			if (firstRequestPath) {
				await vscode.commands.executeCommand('api-tryit.selectItemByPath', firstRequestPath);

				const firstRequestMatch = apiExplorerProvider.findRequestByFilePath(firstRequestPath);
				if (firstRequestMatch) {
					await vscode.commands.executeCommand('api-tryit.openRequest', firstRequestMatch.requestItem);
				}
			}

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
	// Register run hurl test tool
	const hurlTool = vscode.lm.registerTool('run-hurl-test', new RunHurlTest());

	const installHurlCommand = vscode.commands.registerCommand('api-tryit.installHurl', async () => {
		try {
			const binaryPath = await getHurlBinaryManager().installManagedHurl({ interactive: true, force: true });
			vscode.window.showInformationMessage(`Hurl installed successfully: ${binaryPath}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to install Hurl.';
			vscode.window.showErrorMessage(message);
		}
	});

	context.subscriptions.push(setCollectionsPathCommand);

	context.subscriptions.push(
		refreshCommand,
		runAllCollectionsCommand,
		openTryItCommand,
		openRequestCommand,
		selectItemByPathCommand,
		newRequestCommand,
		openFromCurlCommand,
		openFromHurlCommand,
		openFromHurlCollectionCommand,
		newCollectionCommand,
		importCollectionCommand,
		importCollectionPayloadCommand,
		openCollectionCommand,
		plusMenuCommand,
		settingsCommand,
		clearSelectionCommand,
		installHurlCommand,
		hurlTool,
	);
}

export function deactivate() {
	// Extension cleanup
}
