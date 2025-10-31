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
import { EXTENSION_DEPENDENCIES, IntegrationType } from "@wso2/wi-core";
import type { BIExtensionAPI, MIExtensionAPI, TreeItemData } from "@wso2/wi-core";
import { ext } from "./extensionVariables";

/**
 * Extension APIs manager
 */
export class ExtensionAPIs {
	private biExtension: vscode.Extension<BIExtensionAPI> | undefined;
	private miExtension: vscode.Extension<MIExtensionAPI> | undefined;

	/**
	 * Initialize extension APIs
	 */
	public async initialize(): Promise<void> {
		// Get BI extension
		this.biExtension = vscode.extensions.getExtension<BIExtensionAPI>(EXTENSION_DEPENDENCIES.BI);
		if (this.biExtension && !this.biExtension.isActive) {
			try {
				await this.biExtension.activate();
				ext.log("BI Extension activated");
			} catch (error) {
				ext.logError("Failed to activate BI extension", error as Error);
			}
		}

		// Get MI extension
		this.miExtension = vscode.extensions.getExtension<MIExtensionAPI>(EXTENSION_DEPENDENCIES.MI);
		if (this.miExtension && !this.miExtension.isActive) {
			try {
				await this.miExtension.activate();
				ext.log("MI Extension activated");
			} catch (error) {
				ext.logError("Failed to activate MI extension", error as Error);
			}
		}
	}

	/**
	 * Check if BI extension is available
	 */
	public isBIAvailable(): boolean {
		return this.biExtension !== undefined && this.biExtension.isActive;
	}

	/**
	 * Check if MI extension is available
	 */
	public isMIAvailable(): boolean {
		return this.miExtension !== undefined && this.miExtension.isActive;
	}

	/**
	 * Get BI project explorer items
	 */
	public async getBIItems(): Promise<TreeItemData[]> {
		if (!this.isBIAvailable() || !this.biExtension?.exports) {
			return [];
		}

		try {
			return await this.biExtension.exports.getProjectExplorerItems();
		} catch (error) {
			ext.logError("Failed to get BI items", error as Error);
			return [];
		}
	}

	/**
	 * Get MI project explorer items
	 */
	public async getMIItems(): Promise<TreeItemData[]> {
		if (!this.isMIAvailable() || !this.miExtension?.exports) {
			return [];
		}

		try {
			return await this.miExtension.exports.getProjectExplorerItems();
		} catch (error) {
			ext.logError("Failed to get MI items", error as Error);
			return [];
		}
	}

	/**
	 * Get BI status
	 */
	public getBIStatus(): string {
		if (!this.isBIAvailable() || !this.biExtension?.exports) {
			return "unavailable";
		}

		try {
			return this.biExtension.exports.getStatus();
		} catch (error) {
			ext.logError("Failed to get BI status", error as Error);
			return "error";
		}
	}

	/**
	 * Get MI status
	 */
	public getMIStatus(): string {
		if (!this.isMIAvailable() || !this.miExtension?.exports) {
			return "unavailable";
		}

		try {
			return this.miExtension.exports.getStatus();
		} catch (error) {
			ext.logError("Failed to get MI status", error as Error);
			return "error";
		}
	}
}
