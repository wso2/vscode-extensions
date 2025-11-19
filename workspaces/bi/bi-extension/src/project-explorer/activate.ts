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
import { SHARED_COMMANDS, BI_COMMANDS } from '@wso2/ballerina-core';

import { ProjectExplorerEntry, ProjectExplorerEntryProvider } from './project-explorer-provider';
import { ExtensionContext, TreeView, commands, window, workspace } from 'vscode';
import { extension } from '../biExtentionContext';
import { BI_PROJECT_EXPLORER_VIEW_ID, WI_PROJECT_EXPLORER_VIEW_ID } from '../constants';

interface ExplorerActivationConfig {
	context: ExtensionContext;
	isBI: boolean;
	isBallerina?: boolean;
	isBalWorkspace?: boolean;
	isInWI: boolean;
}

export function activateProjectExplorer(config: ExplorerActivationConfig) {
	const { context, isBI, isBallerina, isBalWorkspace, isInWI } = config;
	if (extension.langClient && extension.biSupported) {
		setLoadingStatus();
	}

	const treeviewId = isInWI ? WI_PROJECT_EXPLORER_VIEW_ID : BI_PROJECT_EXPLORER_VIEW_ID;
	const projectExplorerDataProvider = new ProjectExplorerEntryProvider();
	const projectTree = createProjectTree(projectExplorerDataProvider, treeviewId);

	if (isBallerina) {
		registerBallerinaCommands(projectExplorerDataProvider, isBI, isInWI, isBalWorkspace);
	}

	handleVisibilityChangeEvents(projectTree, projectExplorerDataProvider, isBallerina);
	context.subscriptions.push(workspace.onDidDeleteFiles(() => projectExplorerDataProvider.refresh()));
}

function setLoadingStatus() {
	commands.executeCommand('setContext', 'BI.status', 'loading');
}

function createProjectTree(dataProvider: ProjectExplorerEntryProvider, treeviewId: string) {
	return window.createTreeView(treeviewId, { treeDataProvider: dataProvider });
}

function registerBallerinaCommands(dataProvider: ProjectExplorerEntryProvider, isBI: boolean, isInWI: boolean, isBalWorkspace?: boolean) {
	commands.registerCommand(BI_COMMANDS.REFRESH_COMMAND, () => dataProvider.refresh());
	commands.executeCommand('setContext', 'BI.isWorkspaceSupported', extension.isWorkspaceSupported ?? false);

	if (extension.isWorkspaceSupported && isBalWorkspace) {
		commands.executeCommand('setContext', 'BI.isBalWorkspace', true);
	}
	if (isBI) {
		registerBICommands(isInWI);
	}
}

function handleVisibilityChangeEvents(tree: TreeView<ProjectExplorerEntry>, dataProvider: ProjectExplorerEntryProvider, isBallerina?: boolean) {
	tree.onDidChangeVisibility(async res => await handleVisibilityChange(res, dataProvider, isBallerina));
}

async function handleVisibilityChange(res: { visible: boolean }, dataProvider: ProjectExplorerEntryProvider, isBallerina?: boolean) {
	if (res.visible) {
		if (isBallerina && extension.biSupported) {
			commands.executeCommand(SHARED_COMMANDS.SHOW_VISUALIZER);
			await commands.executeCommand(SHARED_COMMANDS.FORCE_UPDATE_PROJECT_ARTIFACTS);
			dataProvider.refresh();
		} else {
			handleNonBallerinaVisibility();
		}
	}
}

function handleNonBallerinaVisibility() {
	if (extension.langClient) {
		if (!extension.biSupported) {
			commands.executeCommand('setContext', 'BI.status', 'updateNeed');
		} else {
			commands.executeCommand('setContext', 'BI.status', 'unknownProject');
		}
	} else {
		commands.executeCommand('setContext', 'BI.status', 'noLS');
	}
	commands.executeCommand(SHARED_COMMANDS.OPEN_BI_WELCOME);
}

function registerBICommands(isInWI) {
	const treeViewId = isInWI ? WI_PROJECT_EXPLORER_VIEW_ID : BI_PROJECT_EXPLORER_VIEW_ID;
	commands.executeCommand(`${treeViewId}.focus`);
	commands.executeCommand(SHARED_COMMANDS.SHOW_VISUALIZER);
	commands.executeCommand('setContext', 'BI.project', true);
}
