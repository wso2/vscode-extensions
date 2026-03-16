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
import { extension } from './biExtentionContext';
import { StateMachine } from './stateMachine';
import { activateProjectExplorer } from './project-explorer/activate';
import { fetchProjectInfo } from './utils';

export async function activate(context: vscode.ExtensionContext) {
	const ballerinaExt = vscode.extensions.getExtension('wso2.ballerina');
	if (!ballerinaExt) {
		vscode.window.showErrorMessage('Ballerina extension is required to operate WSO2 Integrator: BI extension effectively. Please install it from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wso2.ballerina).');
		return;
	}

	extension.context = context;

	const ballerinaExports = ballerinaExt.isActive ? ballerinaExt.exports : await ballerinaExt.activate();
	extension.langClient = ballerinaExports?.ballerinaExtInstance?.langClient;
	extension.biSupported = ballerinaExports?.ballerinaExtInstance?.biSupported;
	extension.isNPSupported = ballerinaExports?.ballerinaExtInstance?.isNPSupported;
	extension.isWorkspaceSupported = ballerinaExports?.ballerinaExtInstance?.isWorkspaceSupported;

	let reinitializeTimer: ReturnType<typeof setTimeout> | undefined;
	context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
		if (reinitializeTimer) {
			clearTimeout(reinitializeTimer);
		}

		reinitializeTimer = setTimeout(() => {
			reinitializeTimer = undefined;
			void refreshProjectExplorer();
		}, 250);
	}));
	context.subscriptions.push({
		dispose: () => {
			if (reinitializeTimer) {
				clearTimeout(reinitializeTimer);
			}
		}
	});

	StateMachine.initialize();
}

export function deactivate() { }

async function refreshProjectExplorer(): Promise<void> {
	const projectInfo = await fetchProjectInfo();
	activateProjectExplorer({
		context: extension.context,
		isBI: projectInfo.isBI,
		isBallerinaPackage: projectInfo.isBallerinaPackage,
		isBallerinaWorkspace: projectInfo.isBallerinaWorkspace,
		isEmptyWorkspace: projectInfo.isEmptyWorkspace,
		isInWI: vscode.extensions.getExtension('wso2.wi') ? true : false
	});
}
