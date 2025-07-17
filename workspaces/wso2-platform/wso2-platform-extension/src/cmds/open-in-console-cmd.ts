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

import {
	CommandIds,
	type ComponentKind,
	type ICreateComponentCmdParams,
	type IOpenInConsoleCmdParams,
	type Organization,
	type Project,
} from "@wso2/wso2-platform-core";
import { type ExtensionContext, ProgressLocation, type QuickPickItem, QuickPickItemKind, Uri, commands, env, window } from "vscode";
import { choreoEnvConfig } from "../config";
import { ext } from "../extensionVariables";
import { contextStore } from "../stores/context-store";
import { dataCacheStore } from "../stores/data-cache-store";
import { webviewStateStore } from "../stores/webview-state-store";
import { isSamePath } from "../utils";
import { getUserInfoForCmd, isRpcActive, quickPickWithLoader, selectOrg, selectProject, setExtensionName } from "./cmd-utils";

export function openInConsoleCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.OpenInConsole, async (params: IOpenInConsoleCmdParams) => {
			setExtensionName(params?.extName);
			const extensionName = webviewStateStore.getState().state.extensionName;
			try {
				isRpcActive(ext);
				const userInfo = await getUserInfoForCmd(`open a ${extensionName === "Devant" ? "integration" : "component"} in ${extensionName} console`);
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

					let projectBaseUrl = `${choreoEnvConfig.getConsoleUrl()}/organizations/${selectedOrg?.handle}/projects/${selectedProject.handler}`;
					if (extensionName === "Devant") {
						projectBaseUrl = `${choreoEnvConfig.getDevantUrl()}/organizations/${selectedOrg?.handle}/projects/${selectedProject.id}`;
					}

					if (params?.component) {
						env.openExternal(Uri.parse(`${projectBaseUrl}/components/${params?.component.metadata.handler}/overview`));
					} else if (params?.componentFsPath) {
						const matchingComponent = contextStore
							.getState()
							.state?.components?.filter((item) => isSamePath(item.componentFsPath, params?.componentFsPath));
						if (matchingComponent?.length === 0) {
							// create a new component
							window
								.showInformationMessage(
									`No ${extensionName} ${extensionName === "Devant" ? "integration" : "component"} found in this directory. Do you want to create one?`,
									{ modal: true },
									"Proceed",
								)
								.then((res) => {
									if (res === "Proceed") {
										commands.executeCommand(CommandIds.CreateNewComponent, {
											...(params?.newComponentParams || {}),
											componentDir: params?.componentFsPath || params?.newComponentParams?.componentDir,
										} as ICreateComponentCmdParams);
									}
								});
						} else if (matchingComponent?.length === 1) {
							env.openExternal(Uri.parse(`${projectBaseUrl}/components/${matchingComponent[0]?.component?.metadata?.handler}/overview`));
						} else if (matchingComponent && matchingComponent?.length > 1) {
							// prompt to select a component
							const componentItems: (QuickPickItem & { item?: ComponentKind })[] = matchingComponent.map((item) => ({
								label: item.component?.metadata?.displayName!,
								item: item?.component,
							}));
							const selectedComp = await window.showQuickPick(componentItems, {
								title: `Multiple ${extensionName === "Devant" ? "integrations" : "components"} detected. Please select ${extensionName === "Devant" ? "an integration" : "a component"} to open`,
							});
							if (selectedComp?.item) {
								env.openExternal(Uri.parse(`${projectBaseUrl}/components/${selectedComp?.item?.metadata?.handler}/overview`));
							}
						}
					} else {
						let cacheComponentPick: (QuickPickItem & { item?: any })[] = [];

						if (selected) {
							cacheComponentPick = dataCacheStore
								.getState()
								.getComponents(selectedOrg.handle, selectedProject.handler)
								.map((item) => ({
									label: item.metadata.displayName,
									item: { data: item, type: "component" },
								}));
						} else {
							const components = await window.withProgress(
								{
									title: `Fetching ${extensionName === "Devant" ? "integrations" : "components"} of project ${selectedProject.name}...`,
									location: ProgressLocation.Notification,
								},
								() =>
									ext.clients.rpcClient.getComponentList({
										orgId: selectedOrg?.id?.toString()!,
										orgHandle: selectedOrg?.handle!,
										projectId: selectedProject?.id!,
										projectHandle: selectedProject?.handler!,
									}),
							);
							dataCacheStore.getState().setComponents(selectedOrg.handle, selectedProject.handler, components);
							cacheComponentPick = components.map((item) => ({
								label: item.metadata.displayName,
								item: { data: item, type: "component" },
							}));
						}

						const cacheQuickPicks: (QuickPickItem & { item?: any })[] = [
							{
								label: selectedProject.name,
								detail: `Open project in ${extensionName} console`,
								item: { data: selectedProject, type: "project" },
							},
						];

						if (cacheComponentPick.length > 0) {
							cacheQuickPicks.push({ kind: QuickPickItemKind.Separator, label: "Components" }, ...cacheComponentPick);
						}

						const selectedOption = await quickPickWithLoader({
							cacheQuickPicks,
							loadQuickPicks: async () => {
								const components = await ext.clients.rpcClient.getComponentList({
									orgId: selectedOrg.id.toString(),
									orgHandle: selectedOrg.handle,
									projectId: selectedProject.id,
									projectHandle: selectedProject.handler,
								});
								dataCacheStore.getState().setComponents(selectedOrg.handle, selectedProject.handler, components);

								const componentPick: (QuickPickItem & { item?: any; type?: string })[] = components.map((item) => ({
									label: item.metadata.displayName,
									item: { data: item, type: "component" },
								}));

								const cacheQuickPicks: (QuickPickItem & { item?: any; type?: string })[] = [
									{
										label: selectedProject.name,
										detail: `Open project in ${extensionName} console`,
										item: { data: selectedProject, type: "project" },
										type: "project",
									},
								];

								if (componentPick.length > 0) {
									cacheQuickPicks.push({ kind: QuickPickItemKind.Separator, label: "Components" }, ...componentPick);
								}

								return cacheQuickPicks;
							},
							loadingTitle: `Loading ${extensionName === "Devant" ? "integrations" : "components"} of project ${selectedProject.name}`,
							selectTitle: `Select an option to open in ${extensionName} Console`,
						});

						if (selectedOption?.type === "project") {
							env.openExternal(Uri.parse(`${projectBaseUrl}/home`));
						} else if (selectedOption?.type === "component") {
							env.openExternal(Uri.parse(`${projectBaseUrl}/components/${params?.component.metadata.handler}/overview`));
						}
					}
				}
			} catch (err: any) {
				console.error(`Failed to open ${extensionName === "Devant" ? "integration" : "component"}`, err);
				window.showErrorMessage(err?.message || `Failed to open ${extensionName === "Devant" ? "integration" : "component"}`);
			}
		}),
	);
}
