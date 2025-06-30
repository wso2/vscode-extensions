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

import { basename } from "path";
import { CommandIds, type IDeleteComponentCmdParams } from "@wso2/wso2-platform-core";
import { type ExtensionContext, ProgressLocation, commands, window, workspace } from "vscode";
import { ext } from "../extensionVariables";
import { contextStore } from "../stores/context-store";
import { dataCacheStore } from "../stores/data-cache-store";
import { webviewStateStore } from "../stores/webview-state-store";
import { closeComponentDetailsView } from "../webviews/ComponentDetailsView";
import { getUserInfoForCmd, isRpcActive, selectComponent, selectOrg, selectProject, setExtensionName } from "./cmd-utils";

export function deleteComponentCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.DeleteComponent, async (params: IDeleteComponentCmdParams) => {
			setExtensionName(params?.extName);
			const extName = webviewStateStore.getState().state.extensionName;
			try {
				isRpcActive(ext);
				const extensionName = webviewStateStore.getState().state.extensionName;
				const userInfo = await getUserInfoForCmd(`delete ${extName === "Devant" ? "an integration" : "a component"}`);
				if (userInfo) {
					let selectedOrg = params?.organization;
					let selectedProject = params?.project;

					const selected = contextStore.getState().state.selected;

					if (!selectedOrg) {
						if (selected) {
							selectedOrg = selected.org!;
						} else {
							selectedOrg = await selectOrg(userInfo, "Select organization");
						}
					}
					if (!selectedProject) {
						if (selected) {
							selectedProject = selected.project!;
						} else {
							selectedProject = await selectProject(
								selectedOrg,
								`Loading projects from '${selectedOrg.name}'`,
								`Select project from '${selectedOrg.name}'`,
							);
						}
					}

					const selectedComponent =
						params?.component ??
						(await selectComponent(
							selectedOrg,
							selectedProject,
							`Loading ${extName === "Devant" ? "integrations" : "components"} from '${selectedProject.name}'`,
							`Select ${extName === "Devant" ? "integration" : "component"} from '${selectedProject.name}' to delete`,
						));

					const accepted = await window.showInformationMessage(
						`Are you sure you want to delete this ${extensionName} ${extName === "Devant" ? "integration" : "component"}? This action will not affect any local files and will only delete the ${extName === "Devant" ? "integration" : "component"} created in ${extensionName}. Please note that this action is not reversible.`,
						{ modal: true },
						"Delete",
					);
					if (accepted === "Delete") {
						await window.withProgress(
							{
								title: `Deleting ${extName === "Devant" ? "integration" : "component"} ${selectedComponent.metadata.displayName}...`,
								location: ProgressLocation.Notification,
							},
							async () => {
								await ext.clients.rpcClient.deleteComponent({
									orgId: selectedOrg.id.toString(),
									orgHandler: selectedOrg.handle,
									projectId: selectedProject.id,
									componentId: selectedComponent.metadata.id,
									componentName: selectedComponent.metadata.displayName,
								});

								closeComponentDetailsView(selectedOrg.handle, selectedProject.handler, selectedComponent.metadata.name);

								const compCache = dataCacheStore.getState().getComponents(selectedOrg.handle, selectedProject.handler);
								dataCacheStore.getState().setComponents(
									selectedOrg.handle,
									selectedProject.handler,
									compCache.filter((item) => item.metadata.id !== selectedComponent.metadata.id),
								);

								if (workspace.workspaceFile && basename(workspace.workspaceFile.path) === `${selectedProject?.handler}.code-workspace`) {
									const folderIndex = workspace.workspaceFolders?.findIndex((item) => item.name === selectedComponent.metadata.name) ?? -1;
									workspace.updateWorkspaceFolders(folderIndex, 1);
								}

								contextStore.getState().refreshState();

								window.showInformationMessage(
									`${extName === "Devant" ? "Integration" : "Component"} ${selectedComponent.metadata.displayName} has been successfully deleted`,
								);
							},
						);
					}
				}
			} catch (err: any) {
				console.error(`Failed to delete ${extName === "Devant" ? "integration" : "component"}`, err);
				window.showErrorMessage(err?.message || `Failed to delete ${extName === "Devant" ? "integration" : "component"}`);
			}
		}),
	);
}
