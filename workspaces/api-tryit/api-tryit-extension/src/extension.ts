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
import { activateActivityPanel } from './activity-panel/activate';
import { TryItPanel } from './webview-panel/TryItPanel';
import { ApiExplorerProvider } from './tree-view/ApiExplorerProvider';
import { ApiTryItStateMachine, EVENT_TYPE } from './stateMachine';
import { ApiRequestItem } from '@wso2/api-tryit-core';

export async function activate(context: vscode.ExtensionContext) {
	// Initialize RPC handlers
	TryItPanel.init();

	// Register the API Explorer tree view
	const apiExplorerProvider = new ApiExplorerProvider();
	vscode.window.registerTreeDataProvider('api-tryit.explorer', apiExplorerProvider);

	// Register the activity panel with the API explorer provider
	activateActivityPanel(context, apiExplorerProvider);

	// Register command to refresh tree view
	const refreshCommand = vscode.commands.registerCommand('api-tryit.refreshExplorer', () => {
		apiExplorerProvider.refresh();
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
		
		vscode.window.showInformationMessage(`Opening: ${requestItem.request.method} ${requestItem.name}`);
	});

	// Register command for new request
	const newRequestCommand = vscode.commands.registerCommand('api-tryit.newRequest', () => {
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
		
		// Send the empty item through the state machine
		ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, emptyRequestItem);
		
		vscode.window.showInformationMessage('New request created');
	});

	// Register command for new collection
	const newCollectionCommand = vscode.commands.registerCommand('api-tryit.newCollection', () => {
		vscode.window.showInputBox({ prompt: 'Enter collection name' }).then(name => {
			if (name) {
				vscode.window.showInformationMessage(`Creating collection: ${name}`);
				apiExplorerProvider.refresh();
			}
		});
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
		apiExplorerProvider.refresh();
	});

	context.subscriptions.push(setCollectionsPathCommand);

	// Register a simple hello command
	const helloCommand = vscode.commands.registerCommand('api-tryit.hello', () => {
		vscode.window.showInformationMessage('Hello from API TryIt!');
	});

	context.subscriptions.push(
		refreshCommand, 
		openTryItCommand, 
		openRequestCommand, 
		newRequestCommand,
		newCollectionCommand,
		settingsCommand,
		helloCommand
	);
}

export function deactivate() {
	// Extension cleanup
}
