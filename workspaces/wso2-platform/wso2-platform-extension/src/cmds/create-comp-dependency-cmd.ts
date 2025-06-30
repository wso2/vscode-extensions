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

import { CommandIds, ComponentViewDrawers, type ICreateDependencyParams, getComponentKey } from "@wso2/wso2-platform-core";
import { type ExtensionContext, ViewColumn, commands, window } from "vscode";
import { ext } from "../extensionVariables";
import { contextStore } from "../stores/context-store";
import { webviewStateStore } from "../stores/webview-state-store";
import { showComponentDetailsView } from "../webviews/ComponentDetailsView";
import { getUserInfoForCmd, isRpcActive, setExtensionName } from "./cmd-utils";
import { getComponentStateOfPath } from "./view-comp-dependency-cmd";

export function createComponentDependencyCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.CreateComponentDependency, async (params: ICreateDependencyParams) => {
			setExtensionName(params?.extName);
			try {
				isRpcActive(ext);
				const extensionName = webviewStateStore.getState().state.extensionName;
				const userInfo = await getUserInfoForCmd(`create dependency`);
				if (userInfo) {
					const selected = contextStore.getState().state.selected;
					if (!selected?.org || !selected.project) {
						window.showInformationMessage(`This directory has not yet been linked to a ${extensionName} project`, "Link Directory").then((res) => {
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
								`No ${extensionName === "Devant" ? "integrations" : "components"} available within the project directory`,
								`Create ${extensionName === "Devant" ? "Integration" : "Component"}`,
							)
							.then((res) => {
								if (res === "Create Component" || res === "Create Integration") {
									commands.executeCommand(CommandIds.CreateNewComponent);
								}
							});
						return;
					}

					const component = await getComponentStateOfPath(params?.componentFsPath, components);

					if (!component?.component) {
						throw new Error(`Failed to select ${extensionName === "Devant" ? "integration" : "component"}`);
					}

					showComponentDetailsView(
						selected.org,
						selected.project,
						component.component,
						component.componentFsPath,
						params?.isCodeLens ? ViewColumn.Beside : undefined,
					);

					// TODO: passing this as a prop to component details view seems cleaner
					// remove this and try to pass opened drawer a a prop
					webviewStateStore
						.getState()
						.onOpenComponentDrawer(getComponentKey(selected.org, selected.project, component.component), ComponentViewDrawers.CreateConnection);
				}
			} catch (err: any) {
				console.error("Failed to create dependency", err);
				window.showErrorMessage(err?.message || "Failed to create dependency");
			}
		}),
	);
}
