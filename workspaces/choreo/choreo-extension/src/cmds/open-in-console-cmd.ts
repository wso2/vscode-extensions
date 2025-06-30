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

import { CommandIds, type ComponentKind, type Organization, type Project } from "@wso2/choreo-core";
import { type ExtensionContext, type QuickPickItem, QuickPickItemKind, Uri, commands, env, window } from "vscode";
import { choreoEnvConfig } from "../config";
import { ext } from "../extensionVariables";
import { contextStore } from "../stores/context-store";
import { dataCacheStore } from "../stores/data-cache-store";
import { getUserInfoForCmd, quickPickWithLoader, selectOrg, selectProject } from "./cmd-utils";

export function openInConsoleCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.OpenInConsole, async (params: { organization: Organization; project: Project; component: ComponentKind }) => {
			try {
				const userInfo = await getUserInfoForCmd("open a component in Choreo console");
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

					const projectBaseUrl = `${choreoEnvConfig.getConsoleUrl()}/organizations/${selectedOrg?.handle}/projects/${selectedProject.id}`;

					if (params?.component) {
						env.openExternal(Uri.parse(`${projectBaseUrl}/components/${params?.component.metadata.handler}/overview`));
					} else if (selected?.project) {
						env.openExternal(Uri.parse(`${projectBaseUrl}/home`));
					} else {
						const cacheComponentPick: (QuickPickItem & { item?: any })[] = dataCacheStore
							.getState()
							.getComponents(selectedOrg.handle, selectedProject.handler)
							.map((item) => ({
								label: item.metadata.displayName,
								item: { data: item, type: "component" },
							}));

						const cacheQuickPicks: (QuickPickItem & { item?: any })[] = [
							{
								label: selectedProject.name,
								detail: "Open project in Choreo console",
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
										detail: "Open project in Choreo console",
										item: { data: selectedProject, type: "project" },
										type: "project",
									},
								];

								if (componentPick.length > 0) {
									cacheQuickPicks.push({ kind: QuickPickItemKind.Separator, label: "Components" }, ...componentPick);
								}

								return cacheQuickPicks;
							},
							loadingTitle: `Loading components of project ${selectedProject.name}`,
							selectTitle: "Select an option to open in Choreo Console",
						});

						if (selectedOption?.type === "project") {
							env.openExternal(Uri.parse(`${projectBaseUrl}/home`));
						} else if (selectedOption?.type === "component") {
							env.openExternal(Uri.parse(`${projectBaseUrl}/components/${params?.component.metadata.handler}/overview`));
						}
					}
				}
			} catch (err: any) {
				console.error("Failed to create component", err);
				window.showErrorMessage(err?.message || "Failed to create component");
			}
		}),
	);
}
