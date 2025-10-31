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
import { COMMANDS, CONTEXT_KEYS, VIEWS } from "@wso2/wi-core";
import { ext } from "./extensionVariables";
import { ExtensionAPIs } from "./extensionAPIs";
import { IntegratorTreeDataProvider } from "./treeDataProvider";
import { WebviewManager } from "./webviewManager";
import { registerMainRpcHandlers } from "./rpc-managers/main/rpc-handler";
import { Messenger } from "vscode-messenger";

/**
 * Activate the extension
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	ext.context = context;
	ext.log("Activating WSO2 Integrator Extension");

	try {
		// Initialize extension APIs
		const extensionAPIs = new ExtensionAPIs();
		// await extensionAPIs.initialize();

		// Set context keys for available extensions
		vscode.commands.executeCommand("setContext", CONTEXT_KEYS.BI_AVAILABLE, extensionAPIs.isBIAvailable());
		vscode.commands.executeCommand("setContext", CONTEXT_KEYS.MI_AVAILABLE, extensionAPIs.isMIAvailable());

		// Create tree data provider
		const treeDataProvider = new IntegratorTreeDataProvider(extensionAPIs);

		// Register tree view
		const treeView = vscode.window.createTreeView(VIEWS.INTEGRATOR_EXPLORER, {
			treeDataProvider,
			showCollapseAll: true,
		});
		context.subscriptions.push(treeView);

		// Create webview manager
		const webviewManager = new WebviewManager(extensionAPIs);
		context.subscriptions.push({
			dispose: () => webviewManager.dispose(),
		});

		// Register commands
		registerCommands(context, treeDataProvider, webviewManager, extensionAPIs);

		ext.log("WSO2 Integrator Extension activated successfully");
	} catch (error) {
		ext.logError("Failed to activate WSO2 Integrator Extension", error as Error);
		vscode.window.showErrorMessage(
			`Failed to activate WSO2 Integrator Extension: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Register extension commands
 */
function registerCommands(
	context: vscode.ExtensionContext,
	treeDataProvider: IntegratorTreeDataProvider,
	webviewManager: WebviewManager,
	extensionAPIs: ExtensionAPIs,
): void {
	// Open welcome page command
	context.subscriptions.push(
		vscode.commands.registerCommand(COMMANDS.OPEN_WELCOME, () => {
			try {
				webviewManager.showWelcome();
			} catch (error) {
				ext.logError("Failed to open welcome page", error as Error);
				vscode.window.showErrorMessage("Failed to open welcome page");
			}
		}),
	);

	// Refresh view command
	context.subscriptions.push(
		vscode.commands.registerCommand(COMMANDS.REFRESH_VIEW, () => {
			try {
				treeDataProvider.refresh();
				vscode.window.showInformationMessage("WSO2 Integrator view refreshed");
			} catch (error) {
				ext.logError("Failed to refresh view", error as Error);
				vscode.window.showErrorMessage("Failed to refresh view");
			}
		}),
	);

	// Open BI integration command
	context.subscriptions.push(
		vscode.commands.registerCommand(COMMANDS.OPEN_BI_INTEGRATION, () => {
			if (extensionAPIs.isBIAvailable()) {
				vscode.commands.executeCommand("workbench.view.extension.ballerina-integrator");
			} else {
				vscode.window.showInformationMessage(
					"BI Extension is not available. Please install the Ballerina Integrator extension.",
					"Install",
				).then((selection) => {
					if (selection === "Install") {
						vscode.commands.executeCommand("workbench.extensions.search", "@id:wso2.ballerina-integrator");
					}
				});
			}
		}),
	);

	// Open MI integration command
	context.subscriptions.push(
		vscode.commands.registerCommand(COMMANDS.OPEN_MI_INTEGRATION, () => {
			if (extensionAPIs.isMIAvailable()) {
				vscode.commands.executeCommand("workbench.view.extension.micro-integrator");
			} else {
				vscode.window.showInformationMessage(
					"MI Extension is not available. Please install the Micro Integrator extension.",
					"Install",
				).then((selection) => {
					if (selection === "Install") {
						vscode.commands.executeCommand("workbench.extensions.search", "@id:wso2.micro-integrator");
					}
				});
			}
		}),
	);
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
	ext.log("Deactivating WSO2 Integrator Extension");
}
