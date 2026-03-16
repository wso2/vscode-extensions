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
import { ExtensionContext, TreeView, Uri, commands, window, workspace, extensions } from 'vscode';
import { extension } from '../biExtentionContext';
import { BI_PROJECT_EXPLORER_VIEW_ID, WI_PROJECT_EXPLORER_VIEW_ID } from '../constants';

interface ExplorerActivationConfig {
	context: ExtensionContext;
	isBI: boolean;
	isBallerinaPackage?: boolean;
	isBallerinaWorkspace?: boolean;
	isEmptyWorkspace?: boolean;
	isInWI: boolean;
}

let projectExplorerDataProvider: ProjectExplorerEntryProvider | undefined;
let projectTree: TreeView<ProjectExplorerEntry> | undefined;
let coreCommandsRegistered = false;
let explorerSubscriptionsRegistered = false;
let currentVisibilityConfig: Pick<ExplorerActivationConfig, 'isBallerinaPackage' | 'isBallerinaWorkspace' | 'isEmptyWorkspace'> | undefined;
let refreshDebounceTimer: ReturnType<typeof setTimeout> | undefined;

const PROJECT_REFRESH_DEBOUNCE_MS = 25;

export function activateProjectExplorer(config: ExplorerActivationConfig) {
	const { context, isBI, isBallerinaPackage, isBallerinaWorkspace, isEmptyWorkspace, isInWI } = config;
	currentVisibilityConfig = getCurrentVisibilityConfig(config);

	if (extension.langClient && extension.biSupported) {
		setLoadingStatus();
	}

	const treeviewId = isInWI ? WI_PROJECT_EXPLORER_VIEW_ID : BI_PROJECT_EXPLORER_VIEW_ID;
	if (!projectExplorerDataProvider || !projectTree) {
		projectExplorerDataProvider = new ProjectExplorerEntryProvider();
		projectTree = createProjectTree(projectExplorerDataProvider, treeviewId);
		projectExplorerDataProvider.setTreeView(projectTree);
	}

	// Always register core commands so they're available to the Ballerina extension
	if (!coreCommandsRegistered) {
		registerCoreCommands(projectExplorerDataProvider, isInWI);
		coreCommandsRegistered = true;
	}

	if (isBallerinaPackage || isBallerinaWorkspace) {
		registerBallerinaCommands(projectExplorerDataProvider, isBI, isInWI, isBallerinaWorkspace, isEmptyWorkspace);
	}

	if (!explorerSubscriptionsRegistered) {
		handleVisibilityChangeEvents(
			projectTree,
			projectExplorerDataProvider,
			() => currentVisibilityConfig
		);
		registerAutoRefreshListeners(context);
		explorerSubscriptionsRegistered = true;
	}

	// onDidChangeVisibility only fires on subsequent visibility transitions.
	// If the view is already visible at activation, handle it immediately.
	if (projectTree.visible) {
		void handleVisibilityChange(
			{ visible: true },
			projectExplorerDataProvider,
			isBallerinaPackage,
			isBallerinaWorkspace,
			isEmptyWorkspace
		);
	}
}

function setLoadingStatus() {
	commands.executeCommand('setContext', 'BI.status', 'loading');
}

function scheduleExplorerRefresh(): void {
	if (refreshDebounceTimer) {
		clearTimeout(refreshDebounceTimer);
	}

	refreshDebounceTimer = setTimeout(() => {
		refreshDebounceTimer = undefined;
		void commands.executeCommand(BI_COMMANDS.REFRESH_COMMAND);
	}, PROJECT_REFRESH_DEBOUNCE_MS);
}

function shouldRefreshForUri(uri: Uri): boolean {
	const uriPath = uri.path.toLowerCase();
	return uriPath.endsWith('.bal') || uriPath.endsWith('.toml');
}

function registerAutoRefreshListeners(context: ExtensionContext): void {
	const triggerFromUris = (uris: readonly Uri[]) => {
		if (uris.some(shouldRefreshForUri)) {
			scheduleExplorerRefresh();
		}
	};

	context.subscriptions.push(workspace.onDidCreateFiles(event => {
		triggerFromUris(event.files);
	}));

	context.subscriptions.push(workspace.onDidDeleteFiles(event => {
		triggerFromUris(event.files);
	}));

	context.subscriptions.push(workspace.onDidRenameFiles(event => {
		const uris = event.files.flatMap(file => [file.oldUri, file.newUri]);
		triggerFromUris(uris);
	}));

	context.subscriptions.push(workspace.onDidSaveTextDocument(document => {
		if (shouldRefreshForUri(document.uri)) {
			scheduleExplorerRefresh();
		}
	}));

	context.subscriptions.push(workspace.onDidChangeTextDocument(event => {
		if (event.contentChanges.length > 0 && shouldRefreshForUri(event.document.uri)) {
			scheduleExplorerRefresh();
		}
	}));

	const fileWatcher = workspace.createFileSystemWatcher('**/*.{bal,toml}');
	fileWatcher.onDidChange(uri => {
		if (shouldRefreshForUri(uri)) {
			scheduleExplorerRefresh();
		}
	});
	fileWatcher.onDidCreate(uri => {
		if (shouldRefreshForUri(uri)) {
			scheduleExplorerRefresh();
		}
	});
	fileWatcher.onDidDelete(uri => {
		if (shouldRefreshForUri(uri)) {
			scheduleExplorerRefresh();
		}
	});

	context.subscriptions.push(fileWatcher);
	context.subscriptions.push({
		dispose: () => {
			if (refreshDebounceTimer) {
				clearTimeout(refreshDebounceTimer);
				refreshDebounceTimer = undefined;
			}
		}
	});
}

function clearLoadingStatus() {
	commands.executeCommand('setContext', 'BI.status', 'ready');
}

function getCurrentVisibilityConfig(config: ExplorerActivationConfig) {
	return {
		isBallerinaPackage: config.isBallerinaPackage,
		isBallerinaWorkspace: config.isBallerinaWorkspace,
		isEmptyWorkspace: config.isEmptyWorkspace
	};
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
			// Skip refresh if debug session is active
			const isDebugActive = isDebugSessionActive();
			if (!isDebugActive) {
				dataProvider.refresh();
			}
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
	getConfig?: () => {
		isBallerinaPackage?: boolean;
		isBallerinaWorkspace?: boolean;
		isEmptyWorkspace?: boolean;
	}
) {
	tree.onDidChangeVisibility(async res => await handleVisibilityChange(
		res,
		dataProvider,
		getConfig?.().isBallerinaPackage,
		getConfig?.().isBallerinaWorkspace,
		getConfig?.().isEmptyWorkspace)
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
			// Check if the Ballerina visualizer webview is already active
			const isVisualizerActive = isBalVisualizerWebviewActive();

			if (!isVisualizerActive) {
				if (isBallerinaPackage) {
					commands.executeCommand(SHARED_COMMANDS.SHOW_VISUALIZER);
				}
			}

			if (!isEmptyWorkspace) {
				const isDebugActive = isDebugSessionActive();
				if (!isDebugActive) {
					dataProvider.refresh();
					try {
						await commands.executeCommand(SHARED_COMMANDS.FORCE_UPDATE_PROJECT_ARTIFACTS);
						dataProvider.refresh();
					} catch (error) {
						console.error('[ProjectExplorer] FORCE_UPDATE_PROJECT_ARTIFACTS failed:', error);
					} finally {
						clearLoadingStatus();
					}
				} else {
					clearLoadingStatus();
				}
				if (isBallerinaWorkspace) {
					commands.executeCommand(BI_COMMANDS.SHOW_OVERVIEW);
				}
			} else {
				clearLoadingStatus();
			}
		} else {
			handleNonBallerinaVisibility();
		}
	}
}

function isBalVisualizerWebviewActive(): boolean {
	// Get the Ballerina extension and check if visualizer is active
	const ballerinaExt = extensions.getExtension('wso2.ballerina');
	if (ballerinaExt?.isActive && ballerinaExt.exports?.VisualizerWebview) {
		return ballerinaExt.exports.VisualizerWebview.isVisualizerActive();
	}
	return false;
}

function isDebugSessionActive(): boolean {
	// Get the Ballerina extension and check if debug session is active
	const ballerinaExt = extensions.getExtension('wso2.ballerina');
	if (ballerinaExt?.isActive && ballerinaExt.exports?.BallerinaExtensionState) {
		return ballerinaExt.exports.BallerinaExtensionState.isDebugSessionActive();
	}
	return false;
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
