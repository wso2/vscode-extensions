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

import { existsSync, readFileSync } from "fs";
import * as os from "os";
import * as path from "path";
import {
	ChoreoBuildPackNames,
	ChoreoComponentType,
	CommandIds,
	DevantScopes,
	type ExtensionName,
	type ICreateComponentCmdParams,
	type SubmitComponentCreateReq,
	type WorkspaceConfig,
	getComponentKindRepoSource,
	getComponentTypeText,
	getIntegrationScopeText,
	getTypeOfIntegrationType,
	parseGitURL,
} from "@wso2/wso2-platform-core";
import { type ExtensionContext, ProgressLocation, type QuickPickItem, Uri, commands, window, workspace } from "vscode";
import { choreoEnvConfig } from "../config";
import { ext } from "../extensionVariables";
import { getGitRemotes, getGitRoot } from "../git/util";
import { authStore } from "../stores/auth-store";
import { contextStore } from "../stores/context-store";
import { dataCacheStore } from "../stores/data-cache-store";
import { webviewStateStore } from "../stores/webview-state-store";
import { convertFsPathToUriPath, isSamePath, isSubpath, openDirectory } from "../utils";
import { showComponentDetailsView } from "../webviews/ComponentDetailsView";
import { ComponentFormView, type IComponentCreateFormParams } from "../webviews/ComponentFormView";
import { getUserInfoForCmd, isRpcActive, selectOrg, selectProjectWithCreateNew, setExtensionName } from "./cmd-utils";
import { updateContextFile } from "./create-directory-context-cmd";

let componentWizard: ComponentFormView;

export function createNewComponentCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.CreateNewComponent, async (params: ICreateComponentCmdParams) => {
			setExtensionName(params?.extName);
			const extName = webviewStateStore.getState().state.extensionName;
			try {
				isRpcActive(ext);
				const userInfo = await getUserInfoForCmd(`create ${extName === "Devant" ? "an integration" : "a component"}`);
				if (userInfo) {
					const selected = contextStore.getState().state.selected;
					let selectedProject = selected?.project;
					let selectedOrg = selected?.org;

					if (!selectedProject || !selectedOrg) {
						selectedOrg = await selectOrg(userInfo, "Select organization");

						const createdProjectRes = await selectProjectWithCreateNew(
							selectedOrg,
							`Loading projects from '${selectedOrg.name}'`,
							`Select the project from '${selectedOrg.name}', to create the ${extName === "Devant" ? "integration" : "component"} in`,
						);
						selectedProject = createdProjectRes.selectedProject;
					}

					const componentTypes: string[] = [];

					let selectedType: string | undefined = undefined;
					let selectedSubType: string | undefined = undefined;

					if (extName === "Devant") {
						componentTypes.push(
							DevantScopes.AUTOMATION,
							DevantScopes.AI_AGENT,
							DevantScopes.INTEGRATION_AS_API,
							DevantScopes.EVENT_INTEGRATION,
							DevantScopes.FILE_INTEGRATION,
						);
						if (params?.integrationType && componentTypes.includes(params.integrationType)) {
							// map integrationType to type and subtype
							const intType = getTypeOfIntegrationType(params?.integrationType);
							selectedType = intType.type;
							selectedSubType = intType.subType;
						}
					} else {
						componentTypes.push(
							ChoreoComponentType.Service,
							ChoreoComponentType.WebApplication,
							ChoreoComponentType.ScheduledTask,
							ChoreoComponentType.ManualTrigger,
							ChoreoComponentType.ApiProxy,
						);
						if (params?.type && componentTypes.includes(params.type)) {
							selectedType = params?.type;
						}
					}

					if (!selectedType) {
						const typeQuickPicks: (QuickPickItem & { value: string })[] = componentTypes.map((item) => ({
							label: extName === "Devant" ? getIntegrationScopeText(item) : getComponentTypeText(item),
							value: item,
						}));

						const selectedTypePick = await window.showQuickPick(typeQuickPicks, {
							title: `Select ${extName === "Devant" ? "Integration" : "Component"} Type`,
						});
						if (selectedTypePick?.value) {
							if (extName === "Devant") {
								const intType = getTypeOfIntegrationType(selectedTypePick?.value);
								selectedType = intType.type;
								selectedSubType = intType.subType;
							} else {
								selectedType = selectedTypePick?.value;
							}
						}
					}

					if (!selectedType) {
						throw new Error(`${extName === "Devant" ? "Integration" : "Component"} type is required`);
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
							title: `Select ${extName === "Devant" ? "integration" : "component"} directory`,
							defaultUri: defaultUri,
						});
						if (!supPathUri || supPathUri.length === 0) {
							throw new Error(`${extName === "Devant" ? "Integration" : "Component"} directory selection is required`);
						}
						selectedUri = supPathUri[0];
					}
					const dirName = path.basename(selectedUri.fsPath);

					const components = await window.withProgress(
						{
							title: `Fetching ${extName === "Devant" ? "integrations" : "components"} of project ${selectedProject.name}...`,
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

					let gitRoot: string | undefined;
					try {
						gitRoot = await getGitRoot(context, selectedUri.fsPath);
					} catch (err) {
						// ignore error
					}

					// check if user already has a component in the same path
					let componentAlreadyExists = false;
					for (const componentItem of components) {
						if (gitRoot) {
							const remotes = await getGitRemotes(ext.context, gitRoot);
							const repoUrl = getComponentKindRepoSource(componentItem.spec.source).repo;
							const parsedRepoUrl = parseGitURL(repoUrl);
							if (parsedRepoUrl) {
								const [repoOrg, repoName, repoProvider] = parsedRepoUrl;
								const hasMatchingRemote = remotes.some((remoteItem) => {
									const parsedRemoteUrl = parseGitURL(remoteItem.fetchUrl);
									if (parsedRemoteUrl) {
										const [repoRemoteOrg, repoRemoteName, repoRemoteProvider] = parsedRemoteUrl;
										return repoOrg === repoRemoteOrg && repoName === repoRemoteName && repoRemoteProvider === repoProvider;
									}
								});

								if (hasMatchingRemote) {
									const subPathDir = path.join(gitRoot, getComponentKindRepoSource(componentItem.spec.source)?.path);
									if (isSamePath(subPathDir, selectedUri.fsPath)) {
										componentAlreadyExists = true;
										break;
									}
								}
							}
						}
					}

					if (componentAlreadyExists && gitRoot && selectedProject && selectedOrg) {
						const resp = await window.showInformationMessage(
							`${extName === "Devant" ? "An integration" : "A component"} for the selected directory already exists within you project(${selectedProject?.name}). Do you want to proceed and create another ${extName === "Devant" ? "integration" : "component"}?`,
							{ modal: true },
							"Proceed",
						);
						if (resp !== "Proceed") {
							const projectCache = dataCacheStore.getState().getProjects(selectedOrg?.handle);
							updateContextFile(gitRoot, authStore.getState().state.userInfo!, selectedProject, selectedOrg, projectCache);
							contextStore.getState().refreshState();
							return;
						}
					}

					const isWithinWorkspace = workspace.workspaceFolders?.some((item) => isSubpath(item.uri?.fsPath, selectedUri?.fsPath));

					const createCompParams: IComponentCreateFormParams = {
						directoryUriPath: selectedUri.path,
						directoryFsPath: selectedUri.fsPath,
						directoryName: dirName,
						organization: selectedOrg!,
						project: selectedProject!,
						extensionName: webviewStateStore.getState().state.extensionName,
						initialValues: {
							type: selectedType,
							subType: selectedSubType,
							buildPackLang: params?.buildPackLang,
							name: params?.name || dirName || "",
						},
					};

					if (isWithinWorkspace || workspace.workspaceFile) {
						componentWizard = new ComponentFormView(ext.context.extensionUri, createCompParams);
						componentWizard.getWebview()?.reveal();
					} else {
						// TODO: check this on windows
						openDirectory(gitRoot || selectedUri.path, "Where do you want to open the selected directory?", () => {
							ext.context.globalState.update("create-comp-params", JSON.stringify(createCompParams));
						});
					}
				}
			} catch (err: any) {
				console.error(`Failed to create ${extName === "Devant" ? "integration" : "component"}`, err);
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
		if (createCompParams?.extensionName) {
			webviewStateStore.getState().setExtensionName(createCompParams?.extensionName as ExtensionName);
		}
		componentWizard = new ComponentFormView(ext.context.extensionUri, createCompParams);
		componentWizard.getWebview()?.reveal();
	}
};

export const submitCreateComponentHandler = async ({ createParams, org, project }: SubmitComponentCreateReq) => {
	const extensionName = webviewStateStore.getState().state?.extensionName;
	const createdComponent = await window.withProgress(
		{
			title: `Creating new ${extensionName === "Devant" ? "integration" : "component"} ${createParams.displayName}...`,
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

		if (extensionName !== "Devant") {
			showComponentDetailsView(org, project, createdComponent, createParams?.componentDir);
		}

		window
			.showInformationMessage(
				`${extensionName === "Devant" ? "Integration" : "Component"} '${createdComponent.metadata.name}' was successfully created`,
				`Open in ${extensionName}`,
			)
			.then(async (resp) => {
				if (resp === `Open in ${extensionName}`) {
					commands.executeCommand(
						"vscode.open",
						`${extensionName === "Devant" ? choreoEnvConfig.getDevantUrl() : choreoEnvConfig.getConsoleUrl()}/organizations/${org.handle}/projects/${project.id}/components/${createdComponent.metadata.handler}/overview`,
					);
				}
			});

		const compCache = dataCacheStore.getState().getComponents(org.handle, project.handler);
		dataCacheStore.getState().setComponents(org.handle, project.handler, [createdComponent, ...compCache]);

		// update the context file if needed
		try {
			const gitRoot = await getGitRoot(ext.context, createParams.componentDir);
			const projectCache = dataCacheStore.getState().getProjects(org.handle);
			if (gitRoot) {
				updateContextFile(gitRoot, authStore.getState().state.userInfo!, project, org, projectCache);
				contextStore.getState().refreshState();
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
		} else {
			contextStore.getState().refreshState();
		}
	}

	return createdComponent;
};
