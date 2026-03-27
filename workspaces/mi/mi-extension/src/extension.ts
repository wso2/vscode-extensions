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
import { extension } from './MIExtensionContext';
import { activate as activateHistory } from './history';
import { activateVisualizer } from './visualizer/activate';
import { activateAiPanel } from './ai-features/activate';

import { activateDebugger } from './debugger/activate';
import { activateMigrationSupport } from './migration';
import { activateRuntimeService } from './runtime-services-panel/activate';
import { MILanguageClient } from './lang-client/activator';
import { activateUriHandlers } from './uri-handler';
import { extensions, workspace } from 'vscode';
import { StateMachineAI } from './ai-features/aiMachine';
import { isOldProjectOrWorkspace, getStateMachine } from './stateMachine';
import { webviews } from './visualizer/webview';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { COMMANDS } from './constants';
import { enableLS } from './util/workspace';
import { disposeMIAgentPanelRpcManager } from './rpc-managers/agent-mode/rpc-handler';
const os = require('os');

export async function activate(context: vscode.ExtensionContext) {
	extension.context = context;

	// TODO: Remove when VSCode fixes: https://github.com/microsoft/vscode/issues/188257
	const orphanedTabs = vscode.window.tabGroups.all
		.flatMap((tabGroup) => tabGroup.tabs)
		.filter((tab) => (tab.input as any)?.viewType?.includes("micro-integrator."));
	vscode.window.tabGroups.close(orphanedTabs);

	const oldProjects = workspace.workspaceFolders
		? (await Promise.all(
			workspace.workspaceFolders.map(async folder => {
				const isOld = await isOldProjectOrWorkspace(folder.uri.fsPath);
				if (isOld) getStateMachine(folder.uri.fsPath);
				return isOld ? folder : null;
			})
		)).filter((folder): folder is vscode.WorkspaceFolder => folder !== null)
		: [];
	const newProjects = workspace.workspaceFolders
		? workspace.workspaceFolders.filter(folder => !oldProjects.includes(folder))
		: [];

	const firstProject = newProjects?.[0]?.uri?.fsPath || 
						 oldProjects?.[0]?.uri?.fsPath || 
						 path.join(os.tmpdir(), uuidv4());
	
	if (!oldProjects.length) {
		getStateMachine(firstProject);
	}
	workspace.onDidChangeWorkspaceFolders(async (event) => {
		if (event.added.length > 0) {
			for (const addedProject of event.added) {
				getStateMachine(addedProject.uri.fsPath);
			}
		}
		if (event.removed.length > 0) {
			for (const removedProject of event.removed) {
				disposeMIAgentPanelRpcManager(removedProject.uri.fsPath);
				const webview = webviews.get(removedProject.uri.fsPath);
				if (webview) {
					webview.dispose();
				}
			}
		}
		// refresh project explorer
		vscode.commands.executeCommand(COMMANDS.REFRESH_COMMAND);
	});
	StateMachineAI.initialize();

	activateUriHandlers();
	activateHistory();

	activateDebugger(context);
	activateMigrationSupport(context);
	activateRuntimeService(context, firstProject);
	activateVisualizer(context, firstProject);
	activateAiPanel(context);

	workspace.workspaceFolders?.forEach(folder => {
		context.subscriptions.push(...enableLS());
	});
}

export async function deactivate(): Promise<void> {
	const clients = await MILanguageClient.getAllInstances();
	clients.forEach(async client => {
		await client?.stop();
	});

	// close all webviews
	const allWebviews = Array.from(webviews.values());
	for (let i = 0; i < allWebviews.length; i++) {
		const webview = allWebviews[i];
		if (webview) {
			webview.dispose();
		}
	}
}

export function checkForDevantExt() {
	const wso2PlatformExtension = extensions.getExtension('wso2.wso2-platform');
	if (!wso2PlatformExtension) {
		vscode.window.showErrorMessage('The WSO2 Platform extension is not installed. Please install it to proceed.');
		return false;
	}
	return true;
}
