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
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { ApiCollection, ApiFolder, ApiRequestItem, ApiRequest, ApiResponse, FormDataParameter, FormUrlEncodedParameter } from '@wso2/api-tryit-core';

export class ApiExplorerProvider implements vscode.TreeDataProvider<ApiTreeItem> {
	private collections: ApiCollection[] = [];
	private searchFilter: string = '';
	private _onDidChangeTreeData: vscode.EventEmitter<ApiTreeItem | undefined | null | void> = new vscode.EventEmitter<ApiTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ApiTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
	private loadingPromise: Promise<void> | null = null;
	private treeView?: vscode.TreeView<ApiTreeItem>;
	private collectionPathMap: Map<string, string> = new Map();

	constructor(private workspacePath?: string) {
		this.loadingPromise = this.loadCollections();
	}

	setTreeView(treeView: vscode.TreeView<ApiTreeItem>): void {
		this.treeView = treeView;
	}

	clearSelection(): void {
		if (this.treeView) {
			// Force a refresh which will rebuild the tree
			// This is the only reliable way to clear selection since treeView.selection is readonly
			this._onDidChangeTreeData.fire();
		}
	}

	/**
	 * Derives a display name from a directory name by converting kebab-case/snake_case to Title Case
	 */
	private deriveDisplayName(directoryName: string): string {
		return directoryName
			.replace(/[-_]/g, ' ')
			.replace(/\b\w/g, l => l.toUpperCase());
	}

	/**
	 * Loads a single request file and validates it
	 */
	private async loadRequestFile(filePath: string): Promise<ApiRequestItem | null> {
		try {
			const requestContent = await fs.readFile(filePath, 'utf-8');
			const loaded = yaml.load(requestContent) as unknown;

			if (loaded && typeof loaded === 'object') {
				const persisted = loaded as Record<string, unknown>;
				const id = typeof persisted.id === 'string' ? persisted.id : undefined;
				const name = typeof persisted.name === 'string' ? persisted.name : undefined;
				const requestObj = persisted.request && typeof persisted.request === 'object'
					? (persisted.request as Record<string, unknown>)
					: undefined;

				if (id && name && requestObj) {
					const qp = Array.isArray(requestObj.queryParameters)
						? (requestObj.queryParameters as unknown[]).map(q => {
							const qq = q as Record<string, unknown>;
							return {
								id: typeof qq.id === 'string' ? qq.id : `${Date.now()}`,
								key: typeof qq.key === 'string' ? qq.key : '',
								value: typeof qq.value === 'string' ? qq.value : ''
							};
						})
						: [];

					const headers = Array.isArray(requestObj.headers)
						? (requestObj.headers as unknown[]).map(h => {
							const hh = h as Record<string, unknown>;
							return {
								id: typeof hh.id === 'string' ? hh.id : `${Date.now()}`,
								key: typeof hh.key === 'string' ? hh.key : '',
								value: typeof hh.value === 'string' ? hh.value : ''
							};
						})
						: [];

					const formDataParams: FormDataParameter[] | undefined = Array.isArray(requestObj.bodyFormData)
						? (requestObj.bodyFormData as unknown[]).map((param, index) => {
							const fd = param as Record<string, unknown>;
							const normalized: FormDataParameter = {
								id: typeof fd.id === 'string' ? fd.id : `${Date.now()}-form-data-${index}`,
								key: typeof fd.key === 'string' ? fd.key : '',
								contentType: typeof fd.contentType === 'string' ? fd.contentType : ''
							};

							if (typeof fd.filePath === 'string' && fd.filePath.length > 0) {
								normalized.filePath = fd.filePath;
							}

							if (typeof fd.value === 'string') {
								normalized.value = fd.value;
							}

							return normalized;
						})
						: undefined;

					const formUrlEncodedParams: FormUrlEncodedParameter[] | undefined = Array.isArray(requestObj.bodyFormUrlEncoded)
						? (requestObj.bodyFormUrlEncoded as unknown[]).map((param, index) => {
							const fe = param as Record<string, unknown>;
							return {
								id: typeof fe.id === 'string' ? fe.id : `${Date.now()}-form-urlencoded-${index}`,
								key: typeof fe.key === 'string' ? fe.key : '',
								value: typeof fe.value === 'string' ? fe.value : ''
							};
						})
						: undefined;

					const binaryFiles = Array.isArray(requestObj.bodyBinaryFiles)
						? (requestObj.bodyBinaryFiles as unknown[]).map((file, index) => {
							const bf = file as Record<string, unknown>;
							return {
								id: typeof bf.id === 'string' ? bf.id : `${Date.now()}-binary-${index}`,
								filePath: typeof bf.filePath === 'string' ? bf.filePath : '',
								contentType: typeof bf.contentType === 'string' ? bf.contentType : 'application/octet-stream',
								enabled: typeof bf.enabled === 'boolean' ? bf.enabled : true
							};
						})
						: undefined;

					const topLevelAssertions = Array.isArray(persisted.assertions)
						? (persisted.assertions as unknown[]).filter((a): a is string => typeof a === 'string')
						: undefined;

						const requestAssertions = Array.isArray(requestObj.assertions)
							? (requestObj.assertions as unknown[]).filter((a): a is string => typeof a === 'string')
							: undefined;

						const assertions = topLevelAssertions ?? requestAssertions;

					const requestWithId: ApiRequest = {
						id: typeof requestObj.id === 'string' ? requestObj.id : id,
						name: typeof requestObj.name === 'string' ? requestObj.name : name,
						method: (typeof requestObj.method === 'string' ? requestObj.method : 'GET') as ApiRequest['method'],
						url: typeof requestObj.url === 'string' ? requestObj.url : '',
						queryParameters: qp,
						headers: headers
					};

					if (typeof requestObj.body === 'string') {
						requestWithId.body = requestObj.body;
					}

					if (formDataParams) {
						requestWithId.bodyFormData = formDataParams;
					}

					if (formUrlEncodedParams) {
						requestWithId.bodyFormUrlEncoded = formUrlEncodedParams;
					}

					if (binaryFiles) {
						requestWithId.bodyBinaryFiles = binaryFiles;
					}

					if (assertions && assertions.length > 0) {
						requestWithId.assertions = assertions;
					}

					const item: ApiRequestItem = {
						id,
						name,
						request: requestWithId,
						response: typeof persisted.response === 'object' ? (persisted.response as unknown as ApiResponse) : undefined,
						filePath,
						assertions
					};

					return item;
				}
			}
		} catch {
			// Skip files that can't be parsed or don't have required structure
		}
		return null;
	}

	/**
	 * Loads all request files from a directory
	 */
	private async loadRequestsFromDirectory(dirPath: string): Promise<ApiRequestItem[]> {
		const items: ApiRequestItem[] = [];
		try {
			const entries = await fs.readdir(dirPath, { withFileTypes: true });
			for (const entry of entries) {
				if (
					entry.isFile() &&
					(
						entry.name.endsWith('.yaml') || entry.name.endsWith('.yml') || entry.name.endsWith('.json')
					)
				) {
					const requestPath = path.join(dirPath, entry.name);
					const requestItem = await this.loadRequestFile(requestPath);
					if (requestItem) {
						items.push(requestItem);
					}
				}
			}
		} catch {
			// Silently skip directories that can't be read
		}
		return items;
	}

	private async loadFolder(folderPath: string, folderId: string, collectionId: string): Promise<ApiFolder | null> {
		try {
			const folderName = this.deriveDisplayName(folderId);
			const items = await this.loadRequestsFromDirectory(folderPath);

			return {
				id: folderId,
				name: folderName,
				items,
				filePath: folderPath
			};
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to load folder ${folderId} in collection ${collectionId}, ${error as string}.`);
			return null;
		}
	}

	private async loadCollections(): Promise<void> {
		try {
			const isDirectory = async (targetPath: string): Promise<boolean> => {
				try {
					const stats = await fs.stat(targetPath);
					return stats.isDirectory();
				} catch {
					return false;
				}
			};

			// Check for configured collections path first
			const config = vscode.workspace.getConfiguration('api-tryit');
			const configuredPath = config.get<string>('collectionsPath')?.trim();

			let storagePath = '';
			if (configuredPath) {
				storagePath = configuredPath;
			} else {
				const workspaceRoot = this.workspacePath || (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
				if (workspaceRoot) {
					const workspaceApiTestPath = path.join(workspaceRoot, 'api-test');
					storagePath = await isDirectory(workspaceApiTestPath)
						? workspaceApiTestPath
						: workspaceRoot;
				}
			}

			if (!storagePath) {
				// Show error notification if no workspace is available
				vscode.window.showErrorMessage('No workspace path available. Please open a workspace or specify a path.');
				return;
			}

			// Keep track of in-memory collections (collections without filePath set during import)
			const inMemoryCollections = this.collections.filter(col => {
				// A collection is considered in-memory if none of its items have filePath set
				const hasFilePath = (col.rootItems || []).some(item => item.filePath) ||
					col.folders.some(folder => folder.items.some(item => item.filePath));
				return !hasFilePath;
			});

			// Clear and rebuild the collectionPathMap for disk collections
			const newPathMap = new Map<string, string>();

			// Discover collections by reading directories
			const entries = await fs.readdir(storagePath, { withFileTypes: true });
			const diskCollections: ApiCollection[] = [];

			for (const entry of entries) {
				// Skip hidden directories and files
				if (entry.isDirectory() && !entry.name.startsWith('.')) {
					try {
						const collectionPath = path.join(storagePath, entry.name);
						const collection = await this.loadCollection(collectionPath, entry.name);
						if (collection) {
							diskCollections.push(collection);
							// Store the actual directory path for this collection ID
							newPathMap.set(collection.id, collectionPath);
						}
					} catch (error) {
						vscode.window.showErrorMessage(`Error loading collection ${entry.name}, ${error as string}`);
					}
				}
			}

			// Update the collectionPathMap with new disk collections
			this.collectionPathMap = newPathMap;

			// Combine in-memory collections with disk collections
			// In-memory collections come first, then disk collections
			this.collections = [...inMemoryCollections, ...diskCollections];

			// Notify tree of changes
			this.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to load API collections, ${error as string}`);
		}
	}

	/**
	 * Public helper to reload collections from disk and update the tree.
	 */
	public async reloadCollections(): Promise<void> {
		await this.loadCollections();
	}

	/**
	 * Get the actual filesystem path for a collection by its ID.
	 * This resolves the ID to the real directory path, handling cases where
	 * the collection ID differs from the directory name (e.g., imported collections).
	 */
	public getCollectionPathById(collectionId: string): string | undefined {
		return this.collectionPathMap.get(collectionId);
	}

	/**
	 * Add a collection in-memory without saving to disk.
	 * Useful for temporary collections or programmatic imports.
	 */
	public addInMemoryCollection(collection: ApiCollection): void {
		// Check if collection with same ID already exists
		const existingIndex = this.collections.findIndex(c => c.id === collection.id);
		if (existingIndex >= 0) {
			// Replace existing collection
			this.collections[existingIndex] = collection;
		} else {
			// Add new collection
			this.collections.push(collection);
		}
		
		// Notify tree of changes
		this.refresh();
	}

	/**
	 * Update the filePath of a request in the in-memory collections
	 */
	public updateRequestFilePath(requestId: string, filePath: string): void {
		for (const collection of this.collections) {
			// Check root-level requests
			for (const requestItem of collection.rootItems || []) {
				if (requestItem.id === requestId) {
					requestItem.filePath = filePath;
					this.refresh();
					return;
				}
			}
			
			// Check folder requests
			for (const folder of collection.folders) {
				for (const requestItem of folder.items) {
					if (requestItem.id === requestId) {
						requestItem.filePath = filePath;
						this.refresh();
						return;
					}
				}
			}
		}
	}

	private async loadCollection(collectionPath: string, collectionId: string): Promise<ApiCollection | null> {
		try {
			// Resolve collection metadata path (support .yaml, .yml and fallback to .json)
			let metadataPath = path.join(collectionPath, 'collection.yaml');
			let metadataContent: string | null = null;
			try {
				metadataContent = await fs.readFile(metadataPath, 'utf-8');
			} catch {
				// try .yml
				try {
					metadataPath = path.join(collectionPath, 'collection.yml');
					metadataContent = await fs.readFile(metadataPath, 'utf-8');
				} catch {
					// try legacy json
					try {
						metadataPath = path.join(collectionPath, 'collection.json');
						metadataContent = await fs.readFile(metadataPath, 'utf-8');
					} catch {
						// No metadata found - skip this collection
						throw new Error('Missing collection metadata (collection.yaml|collection.yml|collection.json)');
					}
				}
			}

			// Parse metadata (prefer YAML parsing, fallback to JSON parse if needed)
			let metadata: unknown;
			try {
				const loaded = yaml.load(metadataContent as string);
				if (!loaded || typeof loaded === 'string') {
					metadata = JSON.parse(metadataContent as string);
				} else {
					metadata = loaded;
				}
			} catch {
				// Last resort: try JSON.parse
				metadata = JSON.parse(metadataContent as string);
			}

			// Extract only essential fields from collection metadata in a type-safe way
			const metaObj = metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
			const collectionMetadata = {
				id: typeof metaObj.id === 'string' ? metaObj.id : collectionId,
				name: typeof metaObj.name === 'string' ? metaObj.name : this.deriveDisplayName(collectionId)
			};

			// Discover folders by reading directories
			const entries = await fs.readdir(collectionPath, { withFileTypes: true });
			const folders: ApiFolder[] = [];
			const rootLevelRequests: ApiRequestItem[] = [];

			for (const entry of entries) {
				if (entry.isDirectory() && !entry.name.startsWith('.')) {
					try {
						const folderPath = path.join(collectionPath, entry.name);
						const folder = await this.loadFolder(folderPath, entry.name, collectionMetadata.id);
						if (folder) {
							folders.push(folder);
						}
					} catch (error) {
						vscode.window.showErrorMessage(`Error loading folder ${entry.name} in collection ${collectionId}, ${error as string}.`);
					}
				} else if (
					entry.isFile() &&
					(
						entry.name.endsWith('.yaml') || entry.name.endsWith('.yml') || entry.name.endsWith('.json')
					) &&
					entry.name.toLowerCase() !== 'collection.yaml' &&
					entry.name.toLowerCase() !== 'collection.yml' &&
					entry.name.toLowerCase() !== 'collection.json'
				) {
					// Load root-level request file (support .yaml, .yml, and legacy .json)
					const requestPath = path.join(collectionPath, entry.name);
					const requestItem = await this.loadRequestFile(requestPath);
					if (requestItem) {
						rootLevelRequests.push(requestItem);
					}
				}
			}

			return {
				id: collectionMetadata.id,
				name: collectionMetadata.name,
				folders,
				rootItems: rootLevelRequests
			};
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		} catch (error) {
			// If collection metadata is missing or invalid, skip this collection
			return null;
		}
	}



	/**
	 * Set workspace path for loading collections
	 * Used when workspace needs to be changed dynamically
	 */
	setWorkspacePath(workspacePath: string): void {
		this.workspacePath = workspacePath;
		this.loadCollections();
	}

	/**
	 * Set search filter term
	 */
	setSearchFilter(searchTerm: string): void {
		this.searchFilter = searchTerm;
		this.refresh();
	}

	/**
	 * Get search filter term
	 */
	getSearchFilter(): string {
		return this.searchFilter;
	}

	/**
	 * Find a request by its persisted file path and return identifiers needed for selection.
	 */
	public findRequestByFilePath(filePath: string): {
		collection: ApiCollection;
		folder?: ApiFolder;
		requestItem: ApiRequestItem;
		treeItemId: string;
		parentIds: string[];
	} | null {
		const normalizedTarget = path.normalize(filePath);

		for (const collection of this.collections) {
			// Root-level requests
			for (const requestItem of collection.rootItems || []) {
				if (requestItem.filePath && path.normalize(requestItem.filePath) === normalizedTarget) {
					const treeItemId = `${collection.id}-${requestItem.name}`;
					return {
						collection,
						requestItem,
						treeItemId,
						parentIds: [collection.id]
					};
				}
			}

			// Folder requests
			for (const folder of collection.folders || []) {
				for (const requestItem of folder.items) {
					if (requestItem.filePath && path.normalize(requestItem.filePath) === normalizedTarget) {
						const folderId = `${collection.id}-${folder.name}`;
						const treeItemId = `${folderId}-${requestItem.name}`;
						return {
							collection,
							folder,
							requestItem,
							treeItemId,
							parentIds: [collection.id, folderId]
						};
					}
				}
			}
		}

		return null;
	}

	/**
	 * Get collections as JSON-serializable format for webview
	 */
	async getCollections(): Promise<Array<{id: string; name: string; type: string; method?: string; request?: ApiRequest; children?: Array<{id: string; name: string; type: string; method?: string; request?: ApiRequest; children?: Array<{id: string; name: string; type: string; method?: string; request?: ApiRequest}>}>}>> {
		// Wait for loading to complete if it's still in progress
		if (this.loadingPromise) {
			await this.loadingPromise;
			this.loadingPromise = null; // Clear the promise once loaded
		}

		const filterCollections = (collections: ApiCollection[], searchTerm: string) => {
			if (!searchTerm) {
				return collections.map(col => ({
					id: col.id,
					name: col.name,
					type: 'collection',
					children: [
						// Add root-level requests first
						...(col.rootItems || []).map(item => ({
							id: `${col.id}-${item.name}`,
							name: item.name,
							type: 'request',
							method: item.request.method,
							request: item.request,
							filePath: item.filePath
						})),
						// Then add folders
						...col.folders.map(folder => ({
							id: `${col.id}-${folder.name}`,
							name: folder.name,
							type: 'folder',						filePath: folder.filePath,							children: folder.items.map(item => ({
								id: `${col.id}-${folder.name}-${item.name}`,
								name: item.name,
								type: 'request',
								method: item.request.method,
								request: item.request,
								filePath: item.filePath
							}))
						}))
					]
				}));
			}

			return collections
				.map(col => ({
					id: col.id,
					name: col.name,
					type: 'collection',
					children: [
						// Add root-level requests first (filtered)
						...(col.rootItems || [])
							.filter(item => 
								item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
								item.request.method.toLowerCase().includes(searchTerm.toLowerCase())
							)
							.map(item => ({
								id: `${col.id}-${item.name}`,
								name: item.name,
								type: 'request',
								method: item.request.method,
								request: item.request,
								filePath: item.filePath
							})),
						// Then add folders with filtered items
						...col.folders
							.map(folder => ({
								id: `${col.id}-${folder.name}`,
								name: folder.name,
								type: 'folder',
								filePath: folder.filePath,
								children: folder.items
									.filter(item => 
										item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
										item.request.method.toLowerCase().includes(searchTerm.toLowerCase())
									)
									.map(item => ({
										id: `${col.id}-${folder.name}-${item.name}`,
										name: item.name,
										type: 'request',
										method: item.request.method,
										request: item.request,
										filePath: item.filePath
									}))
							}))
							.filter(folder => folder.children && folder.children.length > 0)
					]
				}))
				.filter(col => col.children && col.children.length > 0);
		};

		return filterCollections(this.collections, this.searchFilter);
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ApiTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ApiTreeItem): Promise<ApiTreeItem[]> {
		if (!element) {
			// Root level - show collections
			return Promise.resolve(
				this.collections.map(collection =>
					new ApiTreeItem(
						collection.name,
						vscode.TreeItemCollapsibleState.Expanded,
						'collection',
						'$(package)',
						undefined,
						collection
					)
				)
			);
		} else if (element.type === 'collection' && element.collection) {
			// Collection level - show root-level requests first, then folders
			const children: ApiTreeItem[] = [];
			
			// Add root-level requests
			if (element.collection.rootItems && element.collection.rootItems.length > 0) {
				element.collection.rootItems.forEach((item: ApiRequestItem) => {
					children.push(
						new ApiTreeItem(
							item.name,
							vscode.TreeItemCollapsibleState.None,
							'request',
							'$(symbol-method)',
							item.request.method,
							undefined,
							undefined,
							item
						)
					);
				});
			}
			
			// Then add folders
			element.collection.folders.forEach((folder: ApiFolder) => {
				children.push(
					new ApiTreeItem(
						folder.name,
						vscode.TreeItemCollapsibleState.Collapsed,
						'folder',
						'$(folder)',
						undefined,
						undefined,
						folder
					)
				);
			});
			
			return Promise.resolve(children);
		} else if (element.type === 'folder' && element.folder) {
			// Folder level - show request items
			return Promise.resolve(
				element.folder.items.map((item: ApiRequestItem) =>
					new ApiTreeItem(
						item.name,
						vscode.TreeItemCollapsibleState.None,
						'request',
						'$(symbol-method)',
						item.request.method,
						undefined,
						undefined,
						item
					)
				)
			);
		}
		return Promise.resolve([]);
	}
}

export class ApiTreeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly type: string,
		iconPathString?: string,
		public readonly method?: string,
		public readonly collection?: ApiCollection,
		public readonly folder?: ApiFolder,
		public readonly requestItem?: ApiRequestItem
	) {
		super(label, collapsibleState);
		this.contextValue = type;
		
		// Set resourceUri for requests
		if (requestItem?.filePath) {
			this.resourceUri = vscode.Uri.file(requestItem.filePath);
		}
		
		// Set icon
		if (iconPathString) {
			this.iconPath = new vscode.ThemeIcon(iconPathString.replace('$(', '').replace(')', ''));
		}

		// Customize for requests with HTTP methods
		if (type === 'request' && method && requestItem) {
			this.tooltip = `${method} ${this.label}`;
			this.description = method;
			// Set different colors based on method
			const methodColors: { [key: string]: string } = {
				'GET': 'charts.blue',
				'POST': 'charts.green',
				'PUT': 'charts.yellow',
				'DELETE': 'charts.red',
				'PATCH': 'charts.orange'
			};
			this.iconPath = new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor(methodColors[method] || 'foreground'));
			
			// Make requests clickable - pass the full ApiRequestItem
			this.command = {
				command: 'api-tryit.openRequest',
				title: 'Open Request',
				arguments: [requestItem]
			};
		} else {
			this.tooltip = `${this.label}`;
		}
	}
}
