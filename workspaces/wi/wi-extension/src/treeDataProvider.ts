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

import * as vscode from "vscode";
import { IntegrationType } from "@wso2/wi-core";
import type { IntegrationItem, TreeItemData } from "@wso2/wi-core";
import { ExtensionAPIs } from "./extensionAPIs";
import { ext } from "./extensionVariables";

/**
 * Tree item for the integrator explorer
 */
export class IntegratorTreeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly itemData?: TreeItemData,
		public readonly integrationType?: IntegrationType,
	) {
		super(label, collapsibleState);

		if (itemData) {
			this.description = itemData.description;
			this.tooltip = itemData.tooltip || label;
			this.contextValue = itemData.contextValue;

			if (itemData.command) {
				this.command = {
					command: itemData.command.command,
					title: itemData.command.title,
					arguments: itemData.command.arguments,
				};
			}

			if (itemData.iconPath) {
				this.iconPath = new vscode.ThemeIcon(itemData.iconPath);
			}
		}
	}
}

/**
 * Tree data provider for the integrator explorer
 */
export class IntegratorTreeDataProvider implements vscode.TreeDataProvider<IntegratorTreeItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<IntegratorTreeItem | undefined | null | void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(private extensionAPIs: ExtensionAPIs) {}

	/**
	 * Refresh the tree view
	 */
	public refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Get tree item
	 */
	getTreeItem(element: IntegratorTreeItem): vscode.TreeItem {
		return element;
	}

	/**
	 * Get children of a tree item
	 */
	async getChildren(element?: IntegratorTreeItem): Promise<IntegratorTreeItem[]> {
		if (!element) {
			// Root level - show integration types
			return this.getIntegrationTypes();
		}

		if (element.integrationType) {
			// Get items for specific integration type
			return this.getIntegrationItems(element.integrationType);
		}

		return [];
	}

	/**
	 * Get integration types (BI and MI)
	 */
	private async getIntegrationTypes(): Promise<IntegratorTreeItem[]> {
		const items: IntegratorTreeItem[] = [];

		// Add BI integration type if available
		if (this.extensionAPIs.isBIAvailable()) {
			items.push(
				new IntegratorTreeItem(
					"Ballerina Integrator (BI)",
					vscode.TreeItemCollapsibleState.Collapsed,
					undefined,
					IntegrationType.BI,
				),
			);
		}

		// Add MI integration type if available
		if (this.extensionAPIs.isMIAvailable()) {
			items.push(
				new IntegratorTreeItem(
					"Micro Integrator (MI)",
					vscode.TreeItemCollapsibleState.Collapsed,
					undefined,
					IntegrationType.MI,
				),
			);
		}

		// If no extensions available, show message
		if (items.length === 0) {
			const messageItem = new IntegratorTreeItem("No integrations available", vscode.TreeItemCollapsibleState.None);
			messageItem.tooltip = "Install BI or MI extension to get started";
			messageItem.iconPath = new vscode.ThemeIcon("info");
			items.push(messageItem);
		}

		return items;
	}

	/**
	 * Get items for a specific integration type
	 */
	private async getIntegrationItems(type: IntegrationType): Promise<IntegratorTreeItem[]> {
		try {
			let items: TreeItemData[] = [];

			if (type === IntegrationType.BI) {
				items = await this.extensionAPIs.getBIItems();
			} else if (type === IntegrationType.MI) {
				items = await this.extensionAPIs.getMIItems();
			}

			return items.map(
				(item) =>
					new IntegratorTreeItem(
						item.label,
						item.collapsibleState !== undefined
							? item.collapsibleState
							: vscode.TreeItemCollapsibleState.None,
						item,
						type,
					),
			);
		} catch (error) {
			ext.logError(`Failed to get items for ${type}`, error as Error);
			return [];
		}
	}
}
