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

import { existsSync, readFileSync, writeFileSync } from "fs";
import * as os from "os";
import * as path from "path";
import { join } from "path";
import {
	ChoreoComponentType,
	CommandIds,
	type ICreateComponentParams,
	type SubmitComponentCreateReq,
	type WorkspaceConfig,
	getComponentTypeText,
} from "@wso2/choreo-core";
import { type ExtensionContext, ProgressLocation, type QuickPickItem, Uri, commands, window, workspace } from "vscode";
import { ext } from "../extensionVariables";
import { getGitRoot } from "../git/util";
import { authStore } from "../stores/auth-store";
import { contextStore } from "../stores/context-store";
import { dataCacheStore } from "../stores/data-cache-store";
import { convertFsPathToUriPath, delay, getSubPath, goTosource, isSubpath, openDirectory } from "../utils";
import { showComponentDetailsView } from "../webviews/ComponentDetailsView";
import { ComponentFormView, type IComponentCreateFormParams } from "../webviews/ComponentFormView";
import { getUserInfoForCmd, selectOrg, selectProjectWithCreateNew } from "./cmd-utils";
import { updateContextFile } from "./create-directory-context-cmd";

let componentWizard: ComponentFormView;

export function createNewComponentCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.CreateNewComponent, async (params: ICreateComponentParams) => {
			try {
				const userInfo = await getUserInfoForCmd("create a component");
				if (userInfo) {
					const selected = contextStore.getState().state.selected;
					let selectedProject = selected?.project;
					let selectedOrg = selected?.org;

					if (!selectedProject || !selectedOrg) {
						selectedOrg = await selectOrg(userInfo, "Select organization");

						const createdProjectRes = await selectProjectWithCreateNew(
							selectedOrg,
							`Loading projects from '${selectedOrg.name}'`,
							`Select the project from '${selectedOrg.name}', to create the component in`,
						);
						selectedProject = createdProjectRes.selectedProject;
					}

					let selectedType: string | undefined = params?.type;
					if (!selectedType) {
						const typeQuickPicks: (QuickPickItem & { value: string })[] = [
							{ label: getComponentTypeText(ChoreoComponentType.Service), value: ChoreoComponentType.Service },
							{ label: getComponentTypeText(ChoreoComponentType.WebApplication), value: ChoreoComponentType.WebApplication },
							{ label: getComponentTypeText(ChoreoComponentType.ScheduledTask), value: ChoreoComponentType.ScheduledTask },
							{ label: getComponentTypeText(ChoreoComponentType.ManualTrigger), value: ChoreoComponentType.ManualTrigger },
							{ label: getComponentTypeText(ChoreoComponentType.ApiProxy), value: ChoreoComponentType.ApiProxy },
						];
						const selectedTypePick = await window.showQuickPick(typeQuickPicks, { title: "Select Component Type" });
						if (selectedTypePick?.value) {
							selectedType = selectedTypePick?.value;
						}
					}

					if (!selectedType) {
						throw new Error("Component type is required");
					}

					let selectedUri: Uri;
					if (params?.componentDir && existsSync(params?.componentDir)) {
						selectedUri = Uri.parse(convertFsPathToUriPath(params?.componentDir));
					} else {
						let defaultUri: Uri;
						if (workspace.workspaceFile && workspace.workspaceFile.scheme !== "untitled") {
							defaultUri = workspace.workspaceFile;
						} else if (workspace.workspaceFolders && workspace.workspaceFolders?.length > 0) {
							defaultUri = workspace.workspaceFolders[0].uri;
						} else {
							defaultUri = Uri.file(os.homedir());
						}
						const supPathUri = await window.showOpenDialog({
							canSelectFolders: true,
							canSelectFiles: false,
							canSelectMany: false,
							title: "Select component directory",
							defaultUri: defaultUri,
						});
						if (!supPathUri || supPathUri.length === 0) {
							throw new Error("Component directory selection is required");
						}
						selectedUri = supPathUri[0];
					}
					const dirName = path.basename(selectedUri.fsPath);

					const isWithinWorkspace = workspace.workspaceFolders?.some((item) => isSubpath(item.uri?.fsPath, selectedUri?.fsPath));

					const createCompParams: IComponentCreateFormParams = {
						directoryUriPath: selectedUri.path,
						directoryFsPath: selectedUri.fsPath,
						directoryName: dirName,
						organization: selectedOrg!,
						project: selectedProject!,
						initialValues: {
							type: selectedType,
							buildPackLang: params?.buildPackLang,
							name: params?.name || dirName || "",
						},
					};

					if (isWithinWorkspace || workspace.workspaceFile) {
						componentWizard = new ComponentFormView(ext.context.extensionUri, createCompParams);
						componentWizard.getWebview()?.reveal();
					} else {
						let gitRoot: string | undefined;
						try {
							gitRoot = await getGitRoot(context, selectedUri.fsPath);
						} catch (err) {
							// ignore error
						}
						// TODO: check this on windows
						openDirectory(gitRoot || selectedUri.path, "Where do you want to open the selected directory?", () => {
							ext.context.globalState.update("create-comp-params", JSON.stringify(createCompParams));
						});
					}
				}
			} catch (err: any) {
				console.error("Failed to create component", err);
				window.showErrorMessage(err?.message || "Failed to create component");
			}
		}),
	);
}

/** Continue create component flow if user chooses a directory outside his/her workspace. */
export const continueCreateComponent = () => {
	const compParams: string | null | undefined = ext.context.globalState.get("create-comp-params");
	if (compParams) {
		ext.context.globalState.update("create-comp-params", null);
		const createCompParams: IComponentCreateFormParams = JSON.parse(compParams);
		componentWizard = new ComponentFormView(ext.context.extensionUri, createCompParams);
		componentWizard.getWebview()?.reveal();
		commands.executeCommand(CommandIds.FocusChoreoProjectActivity);
	}
};

export const submitCreateComponentHandler = async ({ createParams, org, project }: SubmitComponentCreateReq) => {
	const createdComponent = await window.withProgress(
		{
			title: `Creating new component ${createParams.displayName}...`,
			location: ProgressLocation.Notification,
		},
		() => ext.clients.rpcClient.createComponent(createParams),
	);

	if (createdComponent) {
		// TODO: enable autoBuildOnCommit once its stable
		/*
		if (type !== ChoreoComponentType.ApiProxy && autoBuildOnCommit) {
			const envs = dataCacheStore.getState().getEnvs(org.handle, project.handler);
			const matchingTrack = createdComponent?.deploymentTracks.find((item) => item.branch === createParams.branch);
			if (matchingTrack && envs.length > 0) {
				try {
					await window.withProgress(
						{ title: `Enabling auto build on commit for component ${createParams.displayName}...`, location: ProgressLocation.Notification },
						() =>
							ext.clients.rpcClient.enableAutoBuildOnCommit({
								componentId: createdComponent?.metadata?.id,
								orgId: org.id.toString(),
								versionId: matchingTrack.id,
								envId: envs[0]?.id,
							}),
					);
				} catch {
					console.log("Failed to enable auto build on commit");
				}
			}
		}
		*/

		showComponentDetailsView(org, project, createdComponent, createParams?.componentDir);

		const compCache = dataCacheStore.getState().getComponents(org.handle, project.handler);
		dataCacheStore.getState().setComponents(org.handle, project.handler, [createdComponent, ...compCache]);

		// update the context file if needed
		try {
			const gitRoot = await getGitRoot(ext.context, createParams.componentDir);
			const projectCache = dataCacheStore.getState().getProjects(org.handle);
			if (gitRoot) {
				updateContextFile(gitRoot, authStore.getState().state.userInfo!, project, org, projectCache);
			}
		} catch (err) {
			console.error("Failed to get git details of ", createParams.componentDir);
		}

		if (workspace.workspaceFile) {
			const workspaceContent: WorkspaceConfig = JSON.parse(readFileSync(workspace.workspaceFile.fsPath, "utf8"));
			workspaceContent.folders = [
				...workspaceContent.folders,
				{
					name: createdComponent.metadata.name, // name not needed?
					path: path.normalize(path.relative(path.dirname(workspace.workspaceFile.fsPath), createParams.componentDir)),
				},
			];

			// todo: check if any of the entries match with the directory
			// else add it without asking

			if (workspace.workspaceFile.scheme !== "untitled" && path.basename(workspace.workspaceFile.path) === `${project?.handler}.code-workspace`) {
				// Automatically update the workspace if user is within a project workspace
				writeFileSync(workspace.workspaceFile!.fsPath, JSON.stringify(workspaceContent, null, 4));
				await delay(1000);
				contextStore.getState().refreshState();
			} else {
				// Else manfully ask and update the workspace
				window
					.showInformationMessage(`Do you want update your workspace with the directory of ${createdComponent.metadata.name}`, "Continue")
					.then(async (resp) => {
						if (resp === "Continue") {
							writeFileSync(workspace.workspaceFile!.fsPath, JSON.stringify(workspaceContent, null, 4));
							await delay(1000);
							contextStore.getState().refreshState();
						}
					});
			}
		} else {
			contextStore.getState().refreshState();
		}
	}

	return createdComponent;
};
