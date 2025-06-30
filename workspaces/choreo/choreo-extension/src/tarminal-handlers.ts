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

import { CommandIds, type ComponentKind } from "@wso2/choreo-core";
import type vscode from "vscode";
import { commands, window, workspace } from "vscode";
import { getChoreoExecPath } from "./choreo-rpc/cli-install";
import { authStore } from "./stores/auth-store";
import { contextStore } from "./stores/context-store";
import { dataCacheStore } from "./stores/data-cache-store";
import { delay, getSubPath } from "./utils";

export class ChoreoConfigurationProvider implements vscode.DebugConfigurationProvider {
	resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration): vscode.DebugConfiguration | undefined {
		if (config.request === "launch" && (config.choreo === true || typeof config.choreo === "object")) {
			config.console = "integratedTerminal";
			const choreoConfig: { project?: string; component?: string; env?: string; skipConnection?: string[] } | true = config.choreo;
			let connectCmd = "connect";
			if (choreoConfig === true) {
				if (contextStore.getState().state?.selected?.projectHandle) {
					connectCmd += ` --project \"${contextStore.getState().state?.selected?.projectHandle}\"`;
				}
			} else if (typeof choreoConfig === "object") {
				if (choreoConfig.project) {
					connectCmd += ` --project \"${choreoConfig.project}\"`;
				} else if (contextStore.getState().state?.selected?.projectHandle) {
					connectCmd += ` --project \"${contextStore.getState().state?.selected?.projectHandle}\"`;
				}
				if (choreoConfig.component) {
					connectCmd += ` --component \"${choreoConfig.component}\"`;
				}
				if (choreoConfig.env) {
					connectCmd += ` --env \"${choreoConfig.env}\"`;
				}
				if (choreoConfig.skipConnection && choreoConfig.skipConnection.length > 0) {
					connectCmd += choreoConfig.skipConnection.map((item) => ` --skip-connection \"${item}\"`).join("");
				}
			}

			config.name += `[choreo-shell]${connectCmd}`;
		}

		return config;
	}
}

export function addTerminalHandlers() {
	window.onDidOpenTerminal(async (e) => {
		if (e.name?.includes("[choreo-shell]")) {
			let cliCommand = e.name.split("[choreo-shell]").pop()?.replaceAll(")", "");
			const terminalPath = (e.creationOptions as any)?.cwd;
			const rpcPath = getChoreoExecPath();
			const userInfo = authStore.getState().state?.userInfo;
			if (terminalPath) {
				if (!e.name?.includes("--project")) {
					window
						.showErrorMessage(
							"Pease link your directory with Choreo project or add you Choreo project name as choreo.project to your launch configuration",
							"Manage Project",
						)
						.then((res) => {
							if (res === "Manage Project") {
								commands.executeCommand(CommandIds.ManageDirectoryContext);
							}
						});
					return;
				} else if (!userInfo) {
					window.showErrorMessage(`You must log in before connecting to the remote environment. Retry after logging in.`, "Login").then((res) => {
						if (res === "Login") {
							commands.executeCommand(CommandIds.SignIn);
						}
					});
					return;
				}
				if (!e.name?.includes("--component")) {
					let selectedComp: ComponentKind | undefined = undefined;
					const components = contextStore.getState().state?.components;
					if (components && components.length > 0) {
						if (components.length === 1) {
							selectedComp = components[0]?.component;
						} else {
							const selectedComps = components.filter((item) => getSubPath(item.componentFsPath, terminalPath));
							if (selectedComps.length === 1) {
								selectedComp = selectedComps[0].component;
							}
						}
					}
					if (selectedComp) {
						cliCommand += ` --component ${selectedComp.metadata?.handler}`;
					}
				}
				await commands.executeCommand("workbench.action.terminal.sendSequence", {
					text: `export CHOREO_ENV=${workspace.getConfiguration().get("Advanced.ChoreoEnvironment")} && "${rpcPath}" ${cliCommand}\r\n`,
				});
				await delay(2000);
				e.show();
			}
		}
	});
}
