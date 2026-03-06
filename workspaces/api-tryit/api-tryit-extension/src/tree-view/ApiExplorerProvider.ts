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
import { ApiCollection, ApiRequest, ApiRequestItem } from '@wso2/api-tryit-core';
import { parseHurlCollection } from '@wso2/api-tryit-hurl-parser';
import {
	extractCollectionNameFromHurl,
	getCollectionNameFromPath,
	parseHurlDocument
} from '@wso2/api-tryit-hurl-parser';

const IGNORED_DIRECTORIES = new Set([
	'.git',
	'.github',
	'.vscode',
	'.idea',
	'node_modules',
	'dist',
	'build',
	'out',
	'target'
]);

interface CollectionGroup {
	id: string;
	name: string;
	files: string[];
	rootItems: ApiRequestItem[];
}

export class ApiExplorerProvider implements vscode.TreeDataProvider<ApiTreeItem> {
	private collections: ApiCollection[] = [];
	private searchFilter = '';
	private _onDidChangeTreeData = new vscode.EventEmitter<ApiTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
	private loadingPromise: Promise<void> | null = null;
	private treeView?: vscode.TreeView<ApiTreeItem>;
	private collectionPathMap = new Map<string, string>();
	private collectionFilesMap = new Map<string, string[]>();
	private inMemoryCollectionIds = new Set<string>();

	constructor(private workspacePath?: string) {
		this.loadingPromise = this.loadCollections();
	}

	setTreeView(treeView: vscode.TreeView<ApiTreeItem>): void {
		this.treeView = treeView;
	}

	clearSelection(): void {
		if (this.treeView) {
			this._onDidChangeTreeData.fire();
		}
	}

	private buildCollectionId(name: string): string {
		const normalized = name
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9\s_-]/g, '')
			.replace(/[\s_]+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');

		return normalized || `hurl-collection-${Date.now()}`;
	}

	private makeRequestTreeId(filePath: string, index: number): string {
		const normalizedPath = path
			.resolve(filePath)
			.replace(/[:\\/\s.]+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
		return `request-${normalizedPath}-${index + 1}`;
	}

	private async discoverHurlFiles(rootPath: string): Promise<string[]> {
		const files: string[] = [];
		const stack: string[] = [rootPath];

		while (stack.length > 0) {
			const current = stack.pop() as string;
			let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }> = [];
			try {
				entries = await fs.readdir(current, { withFileTypes: true });
			} catch {
				continue;
			}

			for (const entry of entries) {
				if (entry.name.startsWith('.')) {
					continue;
				}

				const fullPath = path.join(current, entry.name);
				if (entry.isDirectory()) {
					if (IGNORED_DIRECTORIES.has(entry.name)) {
						continue;
					}
					stack.push(fullPath);
					continue;
				}

				if (entry.isFile() && entry.name.toLowerCase().endsWith('.hurl')) {
					files.push(fullPath);
				}
			}
		}

		files.sort((left, right) => left.localeCompare(right));
		return files;
	}

	private mapParsedBlocks(filePath: string, blocks: string[]): ApiRequestItem[] {
		const mappedItems: ApiRequestItem[] = [];
		for (let index = 0; index < blocks.length; index++) {
			let parsedItem: ApiRequestItem | undefined;
			try {
				const parsed = parseHurlCollection(blocks[index], {
					sourceFilePath: filePath
				});
				parsedItem = parsed.rootItems?.[0];
			} catch {
				continue;
			}

			if (!parsedItem) {
				continue;
			}

			const item = parsedItem;
			const request = item.request || ({
				id: `request-${index + 1}`,
				name: item.name || `Request ${index + 1}`,
				method: 'GET',
				url: '',
				queryParameters: [],
				headers: []
			} as ApiRequest);

			const requestId = typeof request.id === 'string' && request.id.trim().length > 0
				? request.id
				: `request-${index + 1}`;
			const requestName = typeof request.name === 'string' && request.name.trim().length > 0
				? request.name
				: (item.name || `Request ${index + 1}`);

			const normalizedRequest: ApiRequest = {
				...request,
				id: requestId,
				name: requestName,
				queryParameters: Array.isArray(request.queryParameters) ? request.queryParameters : [],
				headers: Array.isArray(request.headers) ? request.headers : []
			};

			mappedItems.push({
				...item,
				id: this.makeRequestTreeId(filePath, index),
				name: requestName,
				request: normalizedRequest,
				filePath
			});
		}

		return mappedItems;
	}

	private resolveStoragePath(): string {
		const config = vscode.workspace.getConfiguration('api-tryit');
		const configuredPath = config.get<string>('collectionsPath')?.trim();
		if (configuredPath) {
			return configuredPath;
		}
		return this.workspacePath || (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
	}

	private async loadCollections(): Promise<void> {
		try {
			const storagePath = this.resolveStoragePath();
			if (!storagePath) {
				return;
			}

			const inMemoryCollections = this.collections.filter(col => this.inMemoryCollectionIds.has(col.id));
			const discoveredFiles = await this.discoverHurlFiles(storagePath);

			const groupByCollectionName = new Map<string, CollectionGroup>();
			for (const filePath of discoveredFiles) {
				let content = '';
				try {
					content = await fs.readFile(filePath, 'utf-8');
				} catch {
					continue;
				}

				const explicitCollectionName = extractCollectionNameFromHurl(content);
				const collectionName = explicitCollectionName || getCollectionNameFromPath(filePath);
				const parsedDocument = parseHurlDocument(content);
				const mappedItems = this.mapParsedBlocks(filePath, parsedDocument.blocks.map(block => block.text));

				// Skip files with no usable content unless they declare an explicit @collectionName
				if (mappedItems.length === 0 && !explicitCollectionName) {
					continue;
				}

				const key = collectionName.trim().toLowerCase();
				const existing = groupByCollectionName.get(key);
				if (!existing) {
					groupByCollectionName.set(key, {
						id: this.buildCollectionId(collectionName),
						name: collectionName,
						files: [filePath],
						rootItems: [...mappedItems]
					});
				} else {
					existing.files.push(filePath);
					existing.rootItems.push(...mappedItems);
				}
			}

			const diskCollections: ApiCollection[] = [];
			const newPrimaryFileMap = new Map<string, string>();
			const newCollectionFilesMap = new Map<string, string[]>();

			for (const group of groupByCollectionName.values()) {
				group.files.sort((left, right) => left.localeCompare(right));
				const rootItems = group.rootItems.sort((left, right) => {
					const leftPath = left.filePath || '';
					const rightPath = right.filePath || '';
					if (leftPath === rightPath) {
						return left.id.localeCompare(right.id);
					}
					return leftPath.localeCompare(rightPath);
				});

				diskCollections.push({
					id: group.id,
					name: group.name,
					folders: [],
					rootItems
				});
				newPrimaryFileMap.set(group.id, group.files[0]);
				newCollectionFilesMap.set(group.id, [...group.files]);
			}

			diskCollections.sort((left, right) => left.name.localeCompare(right.name));

			this.collectionPathMap = newPrimaryFileMap;
			this.collectionFilesMap = newCollectionFilesMap;

			for (const diskCollection of diskCollections) {
				if (this.inMemoryCollectionIds.has(diskCollection.id)) {
					this.inMemoryCollectionIds.delete(diskCollection.id);
					// Merge in-memory items that haven't been saved yet (no filePath) into
					// the disk collection so they remain visible until explicitly saved.
					// Skip items whose method+URL already appear on disk to avoid duplicates.
					const inMemColl = inMemoryCollections.find(col => col.id === diskCollection.id);
					if (inMemColl) {
						const diskItems = diskCollection.rootItems || [];
						const unsavedItems = (inMemColl.rootItems || []).filter(item =>
							!item.filePath &&
							!diskItems.some(d =>
								d.request?.method === item.request?.method &&
								d.request?.url === item.request?.url
							)
						);
						if (unsavedItems.length > 0) {
							diskCollection.rootItems = [...diskItems, ...unsavedItems];
							this.inMemoryCollectionIds.add(diskCollection.id);
						}
					}
				}
			}

			const actualInMemoryCollections = inMemoryCollections.filter(col =>
				!diskCollections.some(disk => disk.id === col.id)
			);

			this.collections = [...actualInMemoryCollections, ...diskCollections];
			this.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to load API collections: ${error as string}`);
		}
	}

	public async reloadCollections(): Promise<void> {
		await this.loadCollections();
	}

	/**
	 * Returns the primary collection file path (used for create/append operations).
	 */
	public getCollectionPathById(collectionId: string): string | undefined {
		return this.collectionPathMap.get(collectionId);
	}

	/**
	 * Returns all .hurl files that belong to a collection (used for run/delete operations).
	 */
	public getCollectionFilePathsById(collectionId: string): string[] {
		return [...(this.collectionFilesMap.get(collectionId) || [])];
	}

	public addInMemoryCollection(collection: ApiCollection): void {
		this.inMemoryCollectionIds.add(collection.id);
		const existingIndex = this.collections.findIndex(c => c.id === collection.id);
		if (existingIndex >= 0) {
			this.collections[existingIndex] = collection;
		} else {
			this.collections.push(collection);
		}
		this.refresh();
	}

	public removeCollectionById(collectionId: string): void {
		this.collections = this.collections.filter(c => c.id !== collectionId);
		this.collectionPathMap.delete(collectionId);
		this.collectionFilesMap.delete(collectionId);
		this.inMemoryCollectionIds.delete(collectionId);
		this.refresh();
	}

	public updateRequestFilePath(requestId: string, filePath: string): void {
		for (const collection of this.collections) {
			for (const requestItem of collection.rootItems || []) {
				if (requestItem.id === requestId || requestItem.request.id === requestId) {
					requestItem.filePath = filePath;
					this.refresh();
					return;
				}
			}
		}
	}

	setWorkspacePath(workspacePath: string): void {
		this.workspacePath = workspacePath;
		void this.loadCollections();
	}

	setSearchFilter(searchTerm: string): void {
		this.searchFilter = searchTerm;
		this.refresh();
	}

	getSearchFilter(): string {
		return this.searchFilter;
	}

	public findRequestByFilePath(filePath: string, requestId?: string, requestName?: string, requestMethod?: string, requestUrl?: string): {
		collection: ApiCollection;
		requestItem: ApiRequestItem;
		treeItemId: string;
		parentIds: string[];
	} | null {
		const normalizedTarget = path.normalize(filePath);

		for (const collection of this.collections) {
			const sameFileItems = (collection.rootItems || []).filter(requestItem =>
				requestItem.filePath && path.normalize(requestItem.filePath) === normalizedTarget
			);

			if (sameFileItems.length === 0) {
				continue;
			}

			if (requestId) {
				const byId = sameFileItems.find(requestItem =>
					requestItem.id === requestId || requestItem.request.id === requestId
				);
				if (byId) {
					return {
						collection,
						requestItem: byId,
						treeItemId: byId.id,
						parentIds: [collection.id]
					};
				}
			}

			if (requestName) {
				const normalizedMethod = requestMethod ? requestMethod.toUpperCase() : undefined;
				const byName = sameFileItems.find(requestItem =>
					requestItem.name === requestName &&
					(!normalizedMethod || requestItem.request.method.toUpperCase() === normalizedMethod) &&
					(!requestUrl || requestItem.request.url === requestUrl)
				);
				if (byName) {
					return {
						collection,
						requestItem: byName,
						treeItemId: byName.id,
						parentIds: [collection.id]
					};
				}
			}

			for (const requestItem of collection.rootItems || []) {
				if (!requestItem.filePath || path.normalize(requestItem.filePath) !== normalizedTarget) {
					continue;
				}

				return {
					collection,
					requestItem,
					treeItemId: requestItem.id,
					parentIds: [collection.id]
				};
			}
		}

		return null;
	}

	async getCollections(): Promise<Array<{id: string; name: string; type: string; method?: string; request?: ApiRequest; requestId?: string; response?: unknown; children?: Array<{id: string; name: string; type: string; method?: string; request?: ApiRequest; requestId?: string; response?: unknown; filePath?: string}>}>> {
		if (this.loadingPromise) {
			await this.loadingPromise;
			this.loadingPromise = null;
		}

		const searchTerm = this.searchFilter.trim().toLowerCase();
		const matchesSearch = (item: ApiRequestItem) => {
			if (!searchTerm) {
				return true;
			}
			const requestName = item.name.toLowerCase();
			const method = item.request.method.toLowerCase();
			const url = item.request.url.toLowerCase();
			return requestName.includes(searchTerm) || method.includes(searchTerm) || url.includes(searchTerm);
		};

		return this.collections
			.map(collection => {
				const children = (collection.rootItems || [])
					.filter(matchesSearch)
					.map(item => ({
						id: item.id,
						name: item.name,
						type: 'request',
						method: item.request.method,
						request: item.request,
						requestId: item.request.id,
						response: item.response,
						filePath: item.filePath
					}));

				return {
					id: collection.id,
					name: collection.name,
					type: 'collection',
					children
				};
			})
			.filter(collection => !searchTerm || (collection.children && collection.children.length > 0));
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ApiTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ApiTreeItem): Promise<ApiTreeItem[]> {
		if (!element) {
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
		}

		if (element.type === 'collection' && element.collection) {
			return Promise.resolve(
				(element.collection.rootItems || []).map(item =>
					new ApiTreeItem(
						item.name,
						vscode.TreeItemCollapsibleState.None,
						'request',
						'$(symbol-method)',
						item.request.method,
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
		public readonly requestItem?: ApiRequestItem
	) {
		super(label, collapsibleState);
		this.contextValue = type;

		if (requestItem?.filePath) {
			this.resourceUri = vscode.Uri.file(requestItem.filePath);
		}

		if (iconPathString) {
			this.iconPath = new vscode.ThemeIcon(iconPathString.replace('$(', '').replace(')', ''));
		}

		if (type === 'request' && method && requestItem) {
			this.tooltip = `${method} ${this.label}`;
			this.description = method;
			const methodColors: { [key: string]: string } = {
				GET: 'charts.blue',
				POST: 'charts.green',
				PUT: 'charts.yellow',
				DELETE: 'charts.red',
				PATCH: 'charts.orange'
			};
			this.iconPath = new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor(methodColors[method] || 'foreground'));
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
