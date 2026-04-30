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
import {
	disposeEmbeddingService,
	disposeAllEmbeddingServices,
	getEmbeddingService,
} from './ai-features/agent-mode/embedding-service/service/vscode-service';
import { isSemanticToolEnabledForUri } from './ai-features/agent-mode/settings';
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
import { COMMANDS, WI_EXTENSION_ID } from './constants';
import { enableLS } from './util/workspace';
import { disposeMIAgentPanelRpcManager } from './rpc-managers/agent-mode/rpc-handler';
import { isConsolidatedProject } from './util/onboardingUtils';
const os = require('os');
const fs = require('fs');

export async function activate(context: vscode.ExtensionContext) {
	extension.context = context;

	// TODO: Remove when VSCode fixes: https://github.com/microsoft/vscode/issues/188257
	const orphanedTabs = vscode.window.tabGroups.all
		.flatMap((tabGroup) => tabGroup.tabs)
		.filter((tab) => (tab.input as any)?.viewType?.includes("micro-integrator."));
	vscode.window.tabGroups.close(orphanedTabs);

	if (workspace.workspaceFolders) {
		for (const folder of workspace.workspaceFolders) {
			await replaceWithSubProjects(folder);
		}
	}

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
				if (isSemanticToolEnabledForUri(addedProject.uri)) {
					getEmbeddingService(addedProject.uri.fsPath).start().catch(err => {
						console.warn(`[EmbeddingService] Background start failed for ${addedProject.uri.fsPath}:`, err?.message);
					});
				}
			}
		}
		if (event.removed.length > 0) {
			for (const removedProject of event.removed) {
				disposeMIAgentPanelRpcManager(removedProject.uri.fsPath);
				// Stop and dispose embedding service for the removed project
				disposeEmbeddingService(removedProject.uri.fsPath).catch(err => {
					console.warn(`[EmbeddingService] Dispose failed for ${removedProject.uri.fsPath}:`, err);
				});
				const webview = webviews.get(removedProject.uri.fsPath);
				if (webview) {
					webview.dispose();
				}
			}
		}
		// refresh project explorer
		vscode.commands.executeCommand(COMMANDS.REFRESH_COMMAND);
	});

	context.subscriptions.push(
		workspace.onDidChangeConfiguration((event) => {
			for (const folder of (workspace.workspaceFolders ?? [])) {
				const semanticToggleChanged = event.affectsConfiguration('MI.IS_SEMANTIC_TOOL_ENABLED', folder.uri);
				if (!semanticToggleChanged) {
					continue;
				}

				if (isSemanticToolEnabledForUri(folder.uri)) {
					getEmbeddingService(folder.uri.fsPath).start().catch(err => {
						console.warn(`[EmbeddingService] Background start failed for ${folder.uri.fsPath}:`, err?.message);
					});
				} else {
					disposeEmbeddingService(folder.uri.fsPath).catch(err => {
						console.warn(`[EmbeddingService] Dispose failed for ${folder.uri.fsPath}:`, err?.message);
					});
				}
			}
		})
	);
	StateMachineAI.initialize();

	activateUriHandlers();
	activateHistory();

	activateDebugger(context);
	activateMigrationSupport(context);
	activateRuntimeService(context, firstProject);
	activateVisualizer(context, firstProject);
	activateAiPanel(context);

	// Start embedding services eagerly for all workspace folders so the
	// semantic search index is warm by the time the user opens MI Copilot.
	// Each service is a singleton — safe to call from here and again from
	// the OPEN_AI_PANEL command handler or executeAgent().
	for (const folder of (workspace.workspaceFolders ?? [])) {
		if (!isSemanticToolEnabledForUri(folder.uri)) {
			continue;
		}
		getEmbeddingService(folder.uri.fsPath).start().catch(err => {
			console.warn(`[EmbeddingService] Background start failed for ${folder.uri.fsPath}:`, err?.message);
		});
	}

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

	// Stop all background embedding services
	await disposeAllEmbeddingServices();
}

export function checkForWso2IntegratorExt() {
	const wso2PlatformExtension = extensions.getExtension(WI_EXTENSION_ID);
	if (!wso2PlatformExtension) {
		vscode.window.showErrorMessage('The WSO2 Integrator extension is not installed. Please install it to proceed.', "Install WSO2 Integrator").then(selection => {
			if (selection === "Install WSO2 Integrator") {
				vscode.commands.executeCommand(COMMANDS.INSTALL_EXTENSION_COMMAND, WI_EXTENSION_ID).then(() => {
					vscode.window.showInformationMessage('WSO2 Integrator extension installed. Please reload VSCode to complete the extension activation.', "Reload Window").then(reloadSelection => {
						if (reloadSelection === "Reload Window") {
							vscode.commands.executeCommand(COMMANDS.RELOAD_WINDOW);
						}
					});
				});
			}
		});
		return false;
	}
	return true;
}

async function replaceWithSubProjects(folder: vscode.WorkspaceFolder) {
	try {
		const folderPath = folder.uri.fsPath;
		if (!isConsolidatedProject(folderPath)) {
			return;
		}

		const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
		const subUris: vscode.Uri[] = [];

		for (const entry of entries) {
			const subPath = path.join(folderPath, entry.name);
			if (!entry.isDirectory() || entry.name.startsWith('.') || fs.existsSync(path.join(subPath, '.docker-build'))) {
				continue;
			}
			const pomPath = path.join(subPath, 'pom.xml');

			if (fs.existsSync(pomPath)) {
				subUris.push(vscode.Uri.file(subPath));
			}
		}

		if (subUris.length === 0) {
			return;
		}
		vscode.workspace.updateWorkspaceFolders(
			folder.index,   // start index
			1,              // remove the consolidated project folder
			...subUris.map(uri => ({ uri }))
		);

	} catch (err) {
		console.error('Error replacing consolidated project', err);
	}
}