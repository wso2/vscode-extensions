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

export class ApiExplorerProvider implements vscode.TreeDataProvider<ApiTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ApiTreeItem | undefined | null | void> = new vscode.EventEmitter<ApiTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ApiTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ApiTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ApiTreeItem): Thenable<ApiTreeItem[]> {
		if (!element) {
			// Root level - show collections directly
			return Promise.resolve([
				new ApiTreeItem('Petstore API Tests', vscode.TreeItemCollapsibleState.Expanded, 'collection', '$(package)'),
				new ApiTreeItem('User Service APIs', vscode.TreeItemCollapsibleState.Collapsed, 'collection', '$(package)'),
			]);
		} else {
			// Child items
			if (element.label === 'Petstore API Tests') {
				return Promise.resolve([
					new ApiTreeItem('Pet', vscode.TreeItemCollapsibleState.Collapsed, 'folder', '$(folder)'),
					new ApiTreeItem('Store', vscode.TreeItemCollapsibleState.Collapsed, 'folder', '$(folder)'),
					new ApiTreeItem('User', vscode.TreeItemCollapsibleState.Collapsed, 'folder', '$(folder)'),
				]);
			} else if (element.label === 'Pet') {
				return Promise.resolve([
					new ApiTreeItem('Add Pet', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'POST'),
					new ApiTreeItem('Get Pet by ID', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'GET'),
					new ApiTreeItem('Update Pet', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'PUT'),
					new ApiTreeItem('Delete Pet', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'DELETE'),
				]);
			} else if (element.label === 'Store') {
				return Promise.resolve([
					new ApiTreeItem('Get Inventory', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'GET'),
					new ApiTreeItem('Place Order', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'POST'),
				]);
			} else if (element.label === 'User') {
				return Promise.resolve([
					new ApiTreeItem('Create User', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'POST'),
					new ApiTreeItem('Login', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'POST'),
					new ApiTreeItem('Logout', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'POST'),
				]);
			} else if (element.label === 'User Service APIs') {
				return Promise.resolve([
					new ApiTreeItem('Users', vscode.TreeItemCollapsibleState.Collapsed, 'folder', '$(folder)'),
					new ApiTreeItem('Auth', vscode.TreeItemCollapsibleState.Collapsed, 'folder', '$(folder)'),
				]);
			} else if (element.label === 'Users') {
				return Promise.resolve([
					new ApiTreeItem('List Users', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'GET'),
					new ApiTreeItem('Create User', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'POST'),
				]);
			} else if (element.label === 'Auth') {
				return Promise.resolve([
					new ApiTreeItem('Login', vscode.TreeItemCollapsibleState.None, 'request', '$(symbol-method)', 'POST'),
				]);
			}
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
		public readonly method?: string
	) {
		super(label, collapsibleState);
		this.contextValue = type;
		
		// Set icon
		if (iconPathString) {
			this.iconPath = new vscode.ThemeIcon(iconPathString.replace('$(', '').replace(')', ''));
		}

		// Customize for requests with HTTP methods
		if (type === 'request' && method) {
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
			
			// Make requests clickable
			this.command = {
				command: 'api-tryit.openRequest',
				title: 'Open Request',
				arguments: [this]
			};
		} else {
			this.tooltip = `${this.label}`;
		}
	}
}
