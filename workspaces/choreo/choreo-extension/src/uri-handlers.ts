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

import { CommandIds, type Organization, type Project } from "@wso2/choreo-core";
import { ProgressLocation, type ProviderResult, type QuickPickItem, type Uri, commands, window, workspace } from "vscode";
import { ResponseError } from "vscode-jsonrpc";
import { ErrorCode } from "./choreo-rpc/constants";
import { getUserInfoForCmd } from "./cmds/cmd-utils";
import { ext } from "./extensionVariables";
import { getLogger } from "./logger/logger";
import { authStore } from "./stores/auth-store";
import { contextStore, getContextKey, waitForContextStoreToLoad } from "./stores/context-store";
import { dataCacheStore } from "./stores/data-cache-store";
import { locationStore } from "./stores/location-store";
import { delay, openDirectory } from "./utils";

export function activateURIHandlers() {
	window.registerUriHandler({
		handleUri(uri: Uri): ProviderResult<void> {
			getLogger().debug(`Handling URI: ${uri.toString()}`);

			if (uri.path === "/signin") {
				getLogger().info("Choreo Login Callback hit");
				const urlParams = new URLSearchParams(uri.query);
				const authCode = urlParams.get("code");
				if (authCode) {
					getLogger().debug("Initiating Choreo sign in flow from auth code");
					// TODO: Check if status is equal to STATUS_LOGGING_IN, if not, show error message.
					// It means that the login was initiated from somewhere else or an old page was opened/refreshed in the browser
					window.withProgress(
						{
							title: "Verifying user details and logging into Choreo...",
							location: ProgressLocation.Notification,
						},
						async () => {
							try {
								const orgId = contextStore?.getState().state?.selected?.org?.id?.toString();
								const userInfo = await ext.clients.rpcClient.signInWithAuthCode(authCode, orgId);
								if (userInfo) {
									await delay(1000);
									authStore.getState().loginSuccess(userInfo);
								}
							} catch (error: any) {
								if (!(error instanceof ResponseError) || error.code !== ErrorCode.NoOrgsAvailable) {
									window.showErrorMessage("Sign in failed. Please check the logs for more details.");
								}
								getLogger().error(`Choreo sign in Failed: ${error.message}`);
							}
						},
					);
				} else {
					getLogger().error("Choreo Login Failed: Authorization code not found!");
					window.showErrorMessage("Choreo Login Failed: Authorization code not found!");
				}
			} else if (uri.path === "/ghapp") {
				getLogger().info("Choreo Githup auth Callback hit");
				const urlParams = new URLSearchParams(uri.query);
				const authCode = urlParams.get("code");
				// const installationId = urlParams.get("installationId");
				const orgId = urlParams.get("orgId");
				if (authCode && orgId) {
					ext.clients.rpcClient.obtainGithubToken({ code: authCode, orgId });
				}
			} else if (uri.path === "/open") {
				const urlParams = new URLSearchParams(uri.query);
				const orgHandle = urlParams.get("org");
				const projectHandle = urlParams.get("project");
				const componentName = urlParams.get("component");
				if (!orgHandle || !projectHandle) {
					return;
				}
				getUserInfoForCmd("open project").then(async (userInfo) => {
					const org = userInfo?.organizations.find((item) => item.handle === orgHandle);
					if (!org) {
						window.showErrorMessage(`Failed to find project organization for ${orgHandle}`);
						return;
					}
					const cacheProjects = dataCacheStore.getState().getProjects(orgHandle);
					let project = cacheProjects?.find((item) => item.handler === projectHandle);
					if (!project) {
						const projects = await window.withProgress(
							{ title: `Fetching projects of organization ${org.name}...`, location: ProgressLocation.Notification },
							() => ext.clients.rpcClient.getProjects(org.id.toString()),
						);
						project = projects?.find((item) => item.handler === projectHandle);
					}
					if (!project) {
						window.showErrorMessage(`Failed to find project for ${projectHandle}`);
						return;
					}

					await waitForContextStoreToLoad();

					const contextItems = contextStore.getState().getValidItems();
					const isWithinDir = contextItems.find((item) => item.orgHandle === orgHandle && item.projectHandle === projectHandle);
					if (isWithinDir) {
						const selectedContext = contextStore.getState().state.selected;
						if (selectedContext?.orgHandle !== orgHandle || selectedContext?.projectHandle !== projectHandle) {
							contextStore.getState().onSetNewContext(org, project, isWithinDir.contextDirs[0]);
						}
						window.showInformationMessage(`You are already within the Choreo ${componentName ? "component" : "project"} directory`);
						return;
					}

					const projectLocations = locationStore.getState().getLocations(projectHandle, orgHandle);

					if (componentName) {
						const filteredProjectLocations = projectLocations.filter((projectLocation) => {
							if (projectLocation.componentItems.some((item) => item.component?.metadata?.name === componentName)) {
								return true;
							}
						});
						if (filteredProjectLocations.length > 0) {
							const selectedPath = await getSelectedPath(filteredProjectLocations.map((item) => item.fsPath));
							if (selectedPath) {
								openProjectDirectory(selectedPath);
							}
						} else if (projectLocations.length > 0) {
							const selectedPath = await getSelectedPath(projectLocations.map((item) => item.fsPath));
							if (selectedPath) {
								openProjectDirectory(selectedPath);
							}
						} else {
							cloneOrOpenDirectory(org, project, componentName);
						}
					} else if (projectLocations.length > 0) {
						const selectedPath = await getSelectedPath(projectLocations.map((item) => item.fsPath));
						if (selectedPath) {
							openProjectDirectory(selectedPath);
						}
					} else {
						cloneOrOpenDirectory(org, project);
					}
				});
			}
		},
	});
}

const openProjectDirectory = async (openingPath: string, isComponent = false) => {
	openDirectory(openingPath, `Where do you want to open the Choreo ${isComponent ? "component" : "project"} directory ${openingPath} ?`);
};

const cloneOrOpenDirectory = (organization: Organization, project: Project, componentName = "") => {
	window
		.showInformationMessage(
			`Unable to find a local clone of the ${componentName ? "component" : "project"} directory.`,
			{ modal: true },
			"Clone Repository",
			"Open Directory",
		)
		.then((resp) => {
			if (resp === "Open Directory") {
				ext.context.globalState.update("open-local-repo", getContextKey(organization, project));
				commands.executeCommand("vscode.openFolder");
			} else if (resp === "Clone Repository") {
				commands.executeCommand(CommandIds.CloneProject, { organization, project, componentName });
			}
		});
};

const getSelectedPath = async (paths: string[]): Promise<string | undefined | null> => {
	if (paths.length === 0) {
		return null;
	}
	if (paths?.length === 1) {
		return paths[0];
	}
	const items: QuickPickItem[] = paths.map((item) => ({ label: item }));
	const directorySelection = await window.showQuickPick(items, { title: "Multiple directories detected", ignoreFocusOut: true });
	return directorySelection?.label;
};
