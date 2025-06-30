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

import * as path from "path";
import {
	CommandIds,
	ComponentViewDrawers,
	type ConnectionListItem,
	type ContextStoreComponentState,
	type IViewDependencyCmdParams,
	getComponentKey,
} from "@wso2/wso2-platform-core";
import { type ExtensionContext, ProgressLocation, ViewColumn, commands, window } from "vscode";
import { ext } from "../extensionVariables";
import { contextStore } from "../stores/context-store";
import { webviewStateStore } from "../stores/webview-state-store";
import { showComponentDetailsView } from "../webviews/ComponentDetailsView";
import { getUserInfoForCmd, isRpcActive, resolveQuickPick, setExtensionName } from "./cmd-utils";

export function viewComponentDependencyCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.ViewDependency, async (params: IViewDependencyCmdParams) => {
			setExtensionName(params?.extName);
			const extName = webviewStateStore.getState().state?.extensionName;
			try {
				isRpcActive(ext);
				const userInfo = await getUserInfoForCmd(`view ${extName === "Devant" ? "integration" : "component"} dependency`);
				if (userInfo) {
					const selected = contextStore.getState().state.selected;
					if (!selected?.org || !selected.project) {
						window
							.showInformationMessage(
								`This directory has not yet been linked to a ${webviewStateStore.getState().state.extensionName} project`,
								"Link Directory",
							)
							.then((res) => {
								if (res === "Link Directory") {
									commands.executeCommand(CommandIds.CreateDirectoryContext);
								}
							});
						return;
					}

					const components = contextStore.getState().state.components;

					if (components?.length === 0) {
						window
							.showInformationMessage(
								`No ${extName === "Devant" ?"integrations" :"components"} available within the project directory`,
								`Create ${extName === "Devant" ? "Integration" : "Component"}`,
							)
							.then((res) => {
								if (res === "Create Integration" || res === "Create Component") {
									commands.executeCommand(CommandIds.CreateNewComponent);
								}
							});
						return;
					}

					const component = await getComponentStateOfPath(params?.componentFsPath, components);

					if (!component?.component) {
						throw new Error(`Failed to select ${extName === "Devant" ? "integration" : "component"}`);
					}

					let connectionItem: ConnectionListItem | undefined;
					const connectionList = await window.withProgress(
						{ title: "Fetching connection list....", location: ProgressLocation.Notification },
						async () => {
							const [componentConnections, projectConnections] = await Promise.all([
								ext.clients.rpcClient.getConnections({
									orgId: selected?.org?.id?.toString()!,
									projectId: selected.project?.id!,
									componentId: component?.component?.metadata?.id!,
								}),
								ext.clients.rpcClient.getConnections({ orgId: selected?.org?.id?.toString()!, projectId: selected.project?.id!, componentId: "" }),
							]);
							return [...componentConnections, ...projectConnections];
						},
					);
					if (params?.connectionName) {
						connectionItem = connectionList.find((item) => item.name === params?.connectionName);
						if (!connectionItem) {
							throw new Error("Failed to find matching connection details");
						}
					} else {
						connectionItem = await resolveQuickPick(connectionList?.map((item) => ({ label: item.name, item })));
					}

					showComponentDetailsView(
						selected.org,
						selected.project,
						component.component,
						component.componentFsPath,
						params?.isCodeLens ? ViewColumn.Beside : undefined,
					);

					// todo: move this to component state instead of global state
					webviewStateStore
						.getState()
						.onOpenComponentDrawer(getComponentKey(selected.org, selected.project, component.component), ComponentViewDrawers.ConnectionGuide, {
							connection: connectionItem,
						});
				}
			} catch (err: any) {
				console.error(`Failed to view ${extName === "Devant" ? "integration" : "component"} dependency`, err);
				window.showErrorMessage(err?.message || `Failed to view ${extName === "Devant" ? "integration" : "component"} dependency`);
			}
		}),
	);
}

export const getComponentStateOfPath = async (componentFsPath = "", components: ContextStoreComponentState[] = []) => {
	const selected = contextStore.getState().state.selected;
	const extName = webviewStateStore.getState().state?.extensionName;
	let component: ContextStoreComponentState | undefined;
	if (!componentFsPath) {
		component = await resolveQuickPick(components?.map((item) => ({ label: item.component?.metadata?.displayName!, item })));
	} else {
		component = components?.find((item) => path.normalize(item.componentFsPath).toLowerCase() === path.normalize(componentFsPath).toLowerCase());
		if (!component?.component) {
			window
				.showInformationMessage(
					`Could not find any ${webviewStateStore.getState().state.extensionName} components that match this directory within the the linked project context. (${selected?.project?.name})`,
					`Create ${extName === "Devant" ? "Integration" : "Component"}`,
					"Manage Context",
				)
				.then((res) => {
					if (res === "Create Component" || res === "Create Integration") {
						commands.executeCommand(CommandIds.CreateNewComponent);
					}
					if (res === "Manage Context") {
						commands.executeCommand(CommandIds.ManageDirectoryContext);
					}
				});
		}
	}
	return component;
};
