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
import { COMMANDS } from '../constants';
import { window } from 'vscode';
import path = require('path');

let extensionContext: vscode.ExtensionContext;
export class ProjectExplorerEntry extends vscode.TreeItem {
	children: ProjectExplorerEntry[] | undefined;

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		icon?: string,
		isCodicon: boolean = false
	) {
		super(label, collapsibleState);
		this.tooltip = `${this.label}`;
		if (icon && isCodicon) {
			this.iconPath = new vscode.ThemeIcon(icon);
		} else if (icon) {
			this.iconPath = {
				light: path.join(extensionContext.extensionPath, 'assets', `light-${icon}.svg`),
				dark: path.join(extensionContext.extensionPath, 'assets', `dark-${icon}.svg`)
			};
		}
	}
}

export class ProjectExplorerEntryProvider implements vscode.TreeDataProvider<ProjectExplorerEntry> {
	private _data: ProjectExplorerEntry[];
	private _onDidChangeTreeData: vscode.EventEmitter<ProjectExplorerEntry | undefined | null | void>
		= new vscode.EventEmitter<ProjectExplorerEntry | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ProjectExplorerEntry | undefined | null | void>
		= this._onDidChangeTreeData.event;

	refresh() {
		return window.withProgress({
			location: { viewId: COMMANDS.PROJECT_EXPLORER },
			title: 'Loading project structure'
		}, async () => {
			try {
				this._data = [];
				this._onDidChangeTreeData.fire();
			} catch (err) {
				console.error(err);
				this._data = [];
			}
		});
	}

	constructor(private context: vscode.ExtensionContext) {
		this._data = [];
		extensionContext = context;
	}

	getTreeItem(element: ProjectExplorerEntry): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: ProjectExplorerEntry | undefined): vscode.ProviderResult<ProjectExplorerEntry[]> {
		if (element === undefined) {
			return this._data;
		}
		return element.children;
	}

	getParent(element: ProjectExplorerEntry): vscode.ProviderResult<ProjectExplorerEntry> {
		return element;
	}

	recursiveSearchParent(element: ProjectExplorerEntry, path: string): ProjectExplorerEntry | undefined {
		return undefined;
	}
}