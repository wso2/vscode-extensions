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
import { ApiCollection, ApiFolder, ApiRequestItem, ApiRequest } from '@wso2/api-tryit-core';

export class ApiExplorerProvider implements vscode.TreeDataProvider<ApiTreeItem> {
	private collections: ApiCollection[] = [];
	private searchFilter: string = '';
	private _onDidChangeTreeData: vscode.EventEmitter<ApiTreeItem | undefined | null | void> = new vscode.EventEmitter<ApiTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ApiTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
	private loadingPromise: Promise<void> | null = null;

	constructor(private workspacePath?: string) {
		this.loadingPromise = this.loadCollections();
	}

	private async loadCollections(): Promise<void> {
		try {
			// Use provided workspace path or default to current workspace
			const storagePath = this.workspacePath || 
				(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');

			if (!storagePath) {
				// Show error notification if no workspace is available
				vscode.window.showErrorMessage('No workspace path available. Please open a workspace or specify a path.');
				return;
			}

			// Discover collections by reading directories
			const entries = await fs.readdir(storagePath, { withFileTypes: true });
			this.collections = [];

			for (const entry of entries) {
				// Skip hidden directories and files
				if (entry.isDirectory() && !entry.name.startsWith('.')) {
					try {
						const collectionPath = path.join(storagePath, entry.name);
						const collection = await this.loadCollection(collectionPath, entry.name);
						if (collection) {
							this.collections.push(collection);
						}
					} catch (error) {
						vscode.window.showErrorMessage(`Error loading collection ${entry.name}, ${error as string}`);
					}
				}
			}

			// Notify tree of changes
			this.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to load API collections, ${error as string}`);
		}
	}

	private async loadCollection(collectionPath: string, collectionId: string): Promise<ApiCollection | null> {
		try {
			// Read collection metadata
			const metadataPath = path.join(collectionPath, 'collection.json');
			const metadataContent = await fs.readFile(metadataPath, 'utf-8');
			const metadata = JSON.parse(metadataContent);

			// Discover folders by reading directories
			const entries = await fs.readdir(collectionPath, { withFileTypes: true });
			const folders: ApiFolder[] = [];

			for (const entry of entries) {
				if (entry.isDirectory() && !entry.name.startsWith('.')) {
					try {
						const folderPath = path.join(collectionPath, entry.name);
						const folder = await this.loadFolder(folderPath, entry.name, metadata.id);
						if (folder) {
							folders.push(folder);
						}
					} catch (error) {
						vscode.window.showErrorMessage(`Error loading folder ${entry.name} in collection ${collectionId}, ${error as string}.`);
					}
				}
			}

			return {
				id: metadata.id,
				name: metadata.name,
				description: metadata.description,
				folders
			};
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		} catch (error) {
			// If collection metadata is missing or invalid, skip this collection
			return null;
		}
	}

	private async loadFolder(folderPath: string, folderId: string, collectionId: string): Promise<ApiFolder | null> {
		try {
			// Read folder metadata
			const folderMetadataPath = path.join(folderPath, 'folder.json');
			const folderContent = await fs.readFile(folderMetadataPath, 'utf-8');
			const folderMetadata = JSON.parse(folderContent);

			// Read all requests in folder
			const items: ApiRequestItem[] = [];
			const files = await fs.readdir(folderPath);

			for (const file of files) {
				if (file !== 'folder.json' && file.endsWith('.json')) {
					try {
						const requestPath = path.join(folderPath, file);
						const requestContent = await fs.readFile(requestPath, 'utf-8');
						const persistedRequest = JSON.parse(requestContent);

						items.push({
							id: persistedRequest.id,
							name: persistedRequest.name,
							request: persistedRequest.request,
							response: persistedRequest.response,
							filePath: requestPath
						});
					} catch (error) {
						vscode.window.showErrorMessage(`Error loading request ${file} in folder ${folderId}, ${error as string}.`);
					}
				}
			}

			return {
				id: folderMetadata.id,
				name: folderMetadata.name,
				items
			};
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to load folder ${folderId} in collection ${collectionId}, ${error as string}.`);
			return null;
		}
	}

	private getSampleCollections(): ApiCollection[] {
		return [
			{
				id: 'petstore',
				name: 'Petstore API Tests',
				description: 'Sample Petstore API collection',
				folders: [
					{
						id: 'pet',
						name: 'Pet',
						items: [
							{
								id: 'add-pet',
								name: 'Add Pet',
								request: {
									id: 'add-pet-req',
									name: 'Add Pet',
									method: 'POST',
									url: 'https://petstore.swagger.io/v2/pet',
									queryParameters: [],
									headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
									body: '{\n  "name": "doggie",\n  "status": "available"\n}'
								}
							},
							{
								id: 'get-pet',
								name: 'Get Pet by ID',
								request: {
									id: 'get-pet-req',
									name: 'Get Pet by ID',
									method: 'GET',
									url: 'https://petstore.swagger.io/v2/pet/1',
									queryParameters: [],
									headers: []
								}
							},
							{
								id: 'update-pet',
								name: 'Update Pet',
								request: {
									id: 'update-pet-req',
									name: 'Update Pet',
									method: 'PUT',
									url: 'https://petstore.swagger.io/v2/pet',
									queryParameters: [],
									headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
									body: '{\n  "id": 1,\n  "name": "doggie",\n  "status": "sold"\n}'
								}
							},
							{
								id: 'delete-pet',
								name: 'Delete Pet',
								request: {
									id: 'delete-pet-req',
									name: 'Delete Pet',
									method: 'DELETE',
									url: 'https://petstore.swagger.io/v2/pet/1',
									queryParameters: [],
									headers: []
								}
							}
						]
					},
					{
						id: 'store',
						name: 'Store',
						items: [
							{
								id: 'get-inventory',
								name: 'Get Inventory',
								request: {
									id: 'get-inventory-req',
									name: 'Get Inventory',
									method: 'GET',
									url: 'https://petstore.swagger.io/v2/store/inventory',
									queryParameters: [],
									headers: []
								}
							},
							{
								id: 'place-order',
								name: 'Place Order',
								request: {
									id: 'place-order-req',
									name: 'Place Order',
									method: 'POST',
									url: 'https://petstore.swagger.io/v2/store/order',
									queryParameters: [],
									headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
									body: '{\n  "petId": 1,\n  "quantity": 1\n}'
								}
							}
						]
					},
					{
						id: 'user',
						name: 'User',
						items: [
							{
								id: 'create-user',
								name: 'Create User',
								request: {
									id: 'create-user-req',
									name: 'Create User',
									method: 'POST',
									url: 'https://petstore.swagger.io/v2/user',
									queryParameters: [],
									headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
									body: '{\n  "username": "john",\n  "email": "john@example.com"\n}'
								}
							},
							{
								id: 'login',
								name: 'Login',
								request: {
									id: 'login-req',
									name: 'Login',
									method: 'POST',
									url: 'https://petstore.swagger.io/v2/user/login',
									queryParameters: [
										{ id: '1', key: 'username', value: 'john', enabled: true },
										{ id: '2', key: 'password', value: 'password', enabled: true }
									],
									headers: []
								}
							},
							{
								id: 'logout',
								name: 'Logout',
								request: {
									id: 'logout-req',
									name: 'Logout',
									method: 'POST',
									url: 'https://petstore.swagger.io/v2/user/logout',
									queryParameters: [],
									headers: []
								}
							}
						]
					}
				]
			},
			{
				id: 'user-service',
				name: 'User Service APIs',
				folders: [
					{
						id: 'users',
						name: 'Users',
						items: [
							{
								id: 'list-users',
								name: 'List Users',
								request: {
									id: 'list-users-req',
									name: 'List Users',
									method: 'GET',
									url: 'http://localhost:8080/api/users',
									queryParameters: [],
									headers: []
								}
							},
							{
								id: 'create-user-service',
								name: 'Create User',
								request: {
									id: 'create-user-service-req',
									name: 'Create User',
									method: 'POST',
									url: 'http://localhost:8080/api/users',
									queryParameters: [],
									headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
									body: '{\n  "name": "Jane Doe",\n  "email": "jane@example.com"\n}'
								}
							}
						]
					},
					{
						id: 'auth',
						name: 'Auth',
						items: [
							{
								id: 'auth-login',
								name: 'Login',
								request: {
									id: 'auth-login-req',
									name: 'Login',
									method: 'POST',
									url: 'http://localhost:8080/api/auth/login',
									queryParameters: [],
									headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
									body: '{\n  "username": "admin",\n  "password": "secret"\n}'
								}
							}
						]
					}
				]
			}
		];
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
					children: col.folders.map(folder => ({
						id: `${col.id}-${folder.name}`,
						name: folder.name,
						type: 'folder',
						children: folder.items.map(item => ({
							id: `${col.id}-${folder.name}-${item.name}`,
							name: item.name,
							type: 'request',
							method: item.request.method,
							request: item.request
						}))
					}))
				}));
			}

			return collections
				.map(col => ({
					id: col.id,
					name: col.name,
					type: 'collection',
					children: col.folders
						.map(folder => ({
							id: `${col.id}-${folder.name}`,
							name: folder.name,
							type: 'folder',
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
									request: item.request
								}))
						}))
						.filter(folder => folder.children && folder.children.length > 0)
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
			// Collection level - show folders
			return Promise.resolve(
				element.collection.folders.map((folder: ApiFolder) =>
					new ApiTreeItem(
						folder.name,
						vscode.TreeItemCollapsibleState.Collapsed,
						'folder',
						'$(folder)',
						undefined,
						undefined,
						folder
					)
				)
			);
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
