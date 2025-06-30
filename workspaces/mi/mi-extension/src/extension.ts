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
import { activateAiPanel } from './ai-panel/activate';

import { activateDebugger } from './debugger/activate';
import { activateMigrationSupport } from './migration';
import { activateRuntimeService } from './runtime-services-panel/activate';
import { MILanguageClient } from './lang-client/activator';
import { activateUriHandlers } from './uri-handler';
import { extensions, workspace } from 'vscode';
import { StateMachineAI } from './ai-panel/aiMachine';
import { getStateMachine } from './stateMachine';
import { webviews } from './visualizer/webview';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
const os = require('os');

export async function activate(context: vscode.ExtensionContext) {
	extension.context = context;

	// TODO: Remove when VSCode fixes: https://github.com/microsoft/vscode/issues/188257
	const orphanedTabs = vscode.window.tabGroups.all
		.flatMap((tabGroup) => tabGroup.tabs)
		.filter((tab) => (tab.input as any)?.viewType?.includes("micro-integrator."));
	vscode.window.tabGroups.close(orphanedTabs);

	let firstProject = workspace.workspaceFolders?.[0]?.uri?.fsPath;
	if (firstProject) {
		getStateMachine(firstProject);
	} else {
		// new project
		// use a temporary directory to start the state machine
		const projectUuid = uuidv4();
		firstProject = path.join(os.tmpdir(), projectUuid);
		getStateMachine(firstProject);
	}
	workspace.onDidChangeWorkspaceFolders(async (event) => {
		if (event.added.length > 0) {
			const newProject = event.added[0];
			getStateMachine(newProject.uri.fsPath);
		}
		if (event.removed.length > 0) {
			const removedProject = event.removed[0];
			const webview = webviews.get(removedProject.uri.fsPath);

			if (webview) {
				webview.dispose();
			}
		}
	}
	);
	StateMachineAI.initialize();

	activateUriHandlers();
	activateHistory();

	activateDebugger(context);
	activateMigrationSupport(context);
	// activateActivityPanel(context);
	// activateAiPrompt(context);
	activateRuntimeService(context);
	activateVisualizer(context, firstProject);
	activateAiPanel(context);
}

export async function deactivate(): Promise<void> {
	const clients = await MILanguageClient.getAllInstances();
	clients.forEach(async client => {
		await client?.languageClient?.stop();
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
