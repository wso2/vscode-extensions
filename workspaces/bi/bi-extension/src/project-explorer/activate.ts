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
import { SHARED_COMMANDS, BI_COMMANDS, MACHINE_VIEW, NodePosition } from '@wso2/ballerina-core';

import { ProjectExplorerEntry, ProjectExplorerEntryProvider } from './project-explorer-provider';
import { ExtensionContext, TreeView, commands, window, workspace } from 'vscode';
import { extension } from '../biExtentionContext';
import { BI_PROJECT_EXPLORER_VIEW_ID, WI_PROJECT_EXPLORER_VIEW_ID, WI_PROJECT_EXPLORER_VIEW_REFRESH_COMMAND } from '../constants';

interface ExplorerActivationConfig {
	context: ExtensionContext;
	isBI: boolean;
	isBallerinaPackage?: boolean;
	isBallerinaWorkspace?: boolean;
	isEmptyWorkspace?: boolean;
	isInWI: boolean;
}

export function activateProjectExplorer(config: ExplorerActivationConfig) {
	const { context, isBI, isBallerinaPackage, isBallerinaWorkspace, isEmptyWorkspace, isInWI } = config;

	if (extension.langClient && extension.biSupported) {
		setLoadingStatus();
	}

	const treeviewId = isInWI ? WI_PROJECT_EXPLORER_VIEW_ID : BI_PROJECT_EXPLORER_VIEW_ID;
	const projectExplorerDataProvider = new ProjectExplorerEntryProvider();
	const projectTree = createProjectTree(projectExplorerDataProvider, treeviewId);

	projectExplorerDataProvider.setTreeView(projectTree);

	// Always register core commands so they're available to the Ballerina extension
	registerCoreCommands(projectExplorerDataProvider, isInWI);

	if (isBallerinaPackage || isBallerinaWorkspace) {
		registerBallerinaCommands(projectExplorerDataProvider, isBI, isInWI, isBallerinaWorkspace, isEmptyWorkspace);
	}

	handleVisibilityChangeEvents(
		projectTree,
		projectExplorerDataProvider,
		isBallerinaPackage,
		isBallerinaWorkspace,
		isEmptyWorkspace
	);
	context.subscriptions.push(workspace.onDidDeleteFiles(() => projectExplorerDataProvider.refresh()));
}

function setLoadingStatus() {
	commands.executeCommand('setContext', 'BI.status', 'loading');
}

function createProjectTree(dataProvider: ProjectExplorerEntryProvider, treeviewId: string) {
	return window.createTreeView(treeviewId, { treeDataProvider: dataProvider });
}

function registerCoreCommands(dataProvider: ProjectExplorerEntryProvider, isInWI: boolean) {
	// Register the notify command that's called by the Ballerina extension
	commands.registerCommand(
		BI_COMMANDS.NOTIFY_PROJECT_EXPLORER,
		(event: {
			projectPath: string,
			documentUri: string,
			position: NodePosition,
			view: MACHINE_VIEW
		}) => {
			dataProvider.revealInTreeView(event.documentUri, event.projectPath, event.position, event.view);
		}
	);

	// Register the refresh command
	commands.registerCommand(
		BI_COMMANDS.REFRESH_COMMAND,
		() => {
			if (isInWI) {
				commands.executeCommand(WI_PROJECT_EXPLORER_VIEW_REFRESH_COMMAND);
				return;
			}
			dataProvider.refresh()
		}
	);
}

function registerBallerinaCommands(
	dataProvider: ProjectExplorerEntryProvider,
	isBI: boolean,
	isInWI: boolean,
	isBallerinaWorkspace?: boolean,
	isEmptyWorkspace?: boolean
) {
	commands.executeCommand('setContext', 'BI.isWorkspaceSupported', extension.isWorkspaceSupported ?? false);

	if (isBallerinaWorkspace) {
		commands.executeCommand('setContext', 'BI.isBallerinaWorkspace', true);
		if (isEmptyWorkspace) {
			commands.executeCommand('setContext', 'BI.status', 'emptyWorkspace');
		}
	}
	if (isBI) {
		registerBICommands(isInWI);
	}
}

function handleVisibilityChangeEvents(
	tree: TreeView<ProjectExplorerEntry>,
	dataProvider: ProjectExplorerEntryProvider,
	isBallerinaPackage?: boolean,
	isBallerinaWorkspace?: boolean,
	isEmptyWorkspace?: boolean
) {
	tree.onDidChangeVisibility(async res => await handleVisibilityChange(
		res, dataProvider, isBallerinaPackage, isBallerinaWorkspace, isEmptyWorkspace)
	);
}

async function handleVisibilityChange(
	res: { visible: boolean },
	dataProvider: ProjectExplorerEntryProvider,
	isBallerinaPackage?: boolean,
	isBallerinaWorkspace?: boolean,
	isEmptyWorkspace?: boolean
) {
	if (res.visible) {
		if ((isBallerinaPackage || isBallerinaWorkspace) && extension.biSupported) {
			if (isBallerinaPackage) {
				commands.executeCommand(SHARED_COMMANDS.SHOW_VISUALIZER);
			}
			if (!isEmptyWorkspace) {
				await commands.executeCommand(SHARED_COMMANDS.FORCE_UPDATE_PROJECT_ARTIFACTS);
				dataProvider.refresh();
				if (isBallerinaWorkspace) {
					commands.executeCommand(BI_COMMANDS.SHOW_OVERVIEW);
				}
			}
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
