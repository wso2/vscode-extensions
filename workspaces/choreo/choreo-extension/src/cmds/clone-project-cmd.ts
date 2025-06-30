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

import * as os from "os";
import { join } from "path";
import {
	CommandIds,
	type ComponentKind,
	GitProvider,
	type Organization,
	type Project,
	getComponentKindRepoSource,
	parseGitURL,
} from "@wso2/choreo-core";
import { type ExtensionContext, ProgressLocation, type QuickPickItem, QuickPickItemKind, Uri, commands, window } from "vscode";
import { ext } from "../extensionVariables";
import { initGit } from "../git/main";
import { authStore } from "../stores/auth-store";
import { dataCacheStore } from "../stores/data-cache-store";
import { createDirectory, openDirectory } from "../utils";
import { getUserInfoForCmd, selectOrg, selectProject } from "./cmd-utils";
import { updateContextFile } from "./create-directory-context-cmd";
import { createWorkspaceFile } from "./create-project-workspace-cmd";

export function cloneRepoCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.CloneProject, async (params: { organization: Organization; project: Project; componentName: string }) => {
			try {
				const userInfo = await getUserInfoForCmd("clone project repository");
				if (userInfo) {
					const selectedOrg = params?.organization ?? (await selectOrg(userInfo, "Select organization"));

					const selectedProject =
						params?.project ??
						(await selectProject(
							selectedOrg,
							`Loading projects from '${selectedOrg.name}'`,
							`Select the project from '${selectedOrg.name}', that needs to be cloned`,
						));

					const cloneDir = await window.showOpenDialog({
						canSelectFolders: true,
						canSelectFiles: false,
						canSelectMany: false,
						title: "Select a folder to clone the project repository",
						defaultUri: Uri.file(os.homedir()),
					});

					if (cloneDir === undefined || cloneDir.length === 0) {
						throw new Error("Directory is required in order to clone the repository in");
					}

					const selectedCloneDir = cloneDir[0];
					const projectCache = dataCacheStore.getState().getProjects(selectedOrg.handle);

					const components = await window.withProgress(
						{
							title: `Fetching components of ${selectedProject.name}...`,
							location: ProgressLocation.Notification,
						},
						() =>
							ext.clients.rpcClient.getComponentList({
								orgId: selectedOrg.id.toString(),
								orgHandle: selectedOrg.handle,
								projectId: selectedProject.id,
								projectHandle: selectedProject.handler,
							}),
					);

					// clone single or multiple repos
					if (components.length === 0) {
						throw new Error(`No components found within ${selectedProject.name}.`);
					}

					const repoSet = new Set<string>();
					for (const component of components) {
						const repo = getComponentKindRepoSource(component.spec.source).repo;
						if (repo) {
							if (params?.componentName) {
								if (component.metadata.name === params?.componentName) {
									repoSet.add(repo);
								}
							} else {
								repoSet.add(repo);
							}
						}
					}

					if (repoSet.size === 0) {
						throw new Error(`No repos found to link within ${selectedProject.name}.`);
					}

					if (repoSet.size > 1) {
						const quickPickOptions: QuickPickItem[] = [
							{
								label: "Clone entire project",
								detail: "Clone all the repositories associated with the selected project",
								picked: true,
							},
							{ kind: QuickPickItemKind.Separator, label: "Clone a component of the project" },
							...components.map((item) => ({
								label: item.metadata.name,
								detail: `Repository: ${getComponentKindRepoSource(item.spec.source).repo}`,
								item,
							})),
						];
						const selection = await window.showQuickPick(quickPickOptions, {
							title: "Select an option",
						});

						if (selection?.label === "Clone entire project") {
							// do nothing
						} else if ((selection as any)?.item) {
							repoSet.clear();
							repoSet.add(getComponentKindRepoSource((selection as any)?.item.spec.source).repo);
						} else {
							throw new Error("Repository or component selection is required in order to clone the repository");
						}
					}

					let selectedRepoUrl = "";
					if (repoSet.size === 1) {
						[selectedRepoUrl] = repoSet;

						const parsedRepo = parseGitURL(selectedRepoUrl);

						if (!parsedRepo) {
							throw new Error("Failed to parse selected Git URL");
						}

						const matchingComp = components?.find((item) => selectedRepoUrl === getComponentKindRepoSource(item.spec.source).repo);

						const latestDeploymentTrack = matchingComp?.deploymentTracks?.find((item) => item.latest);

						const clonedResp = await cloneRepositoryWithProgress(selectedCloneDir.fsPath, [
							{ branch: latestDeploymentTrack?.branch, repoUrl: selectedRepoUrl },
						]);

						// set context.yaml
						updateContextFile(clonedResp[0].clonedPath, authStore.getState().state.userInfo!, selectedProject, selectedOrg, projectCache);

						const workspaceFilePath = createWorkspaceFile(
							clonedResp[0].clonedPath,
							selectedProject,
							components?.map((item) => ({
								component: item,
								fsPath: join(clonedResp[0].clonedPath, getComponentKindRepoSource(item.spec.source).path),
							})) ?? [],
						);

						await openClonedDirectory(workspaceFilePath);
					} else if (repoSet.size > 1) {
						const parsedRepos = Array.from(repoSet).map((item) => parseGitURL(item));
						if (parsedRepos.some((item) => !item)) {
							throw new Error("Failed to parse selected Git URL");
						}

						const { dirPath: projectDirPath } = createDirectory(selectedCloneDir.fsPath, selectedProject.name);

						const clonedResp = await cloneRepositoryWithProgress(
							projectDirPath,
							Array.from(repoSet).map((selectedRepoUrl) => {
								const parsedRepo = parseGitURL(selectedRepoUrl);

								if (!parsedRepo) {
									throw new Error("Failed to parse selected Git URL");
								}

								const matchingComp = components?.find((item) => selectedRepoUrl === getComponentKindRepoSource(item.spec.source).repo);

								const latestDeploymentTrack = matchingComp?.deploymentTracks?.find((item) => item.latest);

								return { branch: latestDeploymentTrack?.branch, repoUrl: selectedRepoUrl };
							}),
						);

						// set context.yaml
						const workspaceFolders: { component: ComponentKind; fsPath: string }[] = [];
						for (const clonedRespItem of clonedResp) {
							updateContextFile(clonedRespItem.clonedPath, authStore.getState().state.userInfo!, selectedProject, selectedOrg, projectCache);

							for (const item of components) {
								const componentRepo = parseGitURL(getComponentKindRepoSource(item.spec.source).repo);
								const dirRepo = parseGitURL(clonedRespItem.gitUrl);
								if (
									componentRepo &&
									dirRepo &&
									componentRepo[0] === dirRepo[0] &&
									componentRepo[1] === dirRepo[1] &&
									componentRepo[2] === dirRepo[2]
								) {
									workspaceFolders.push({
										component: item,
										fsPath: join(clonedRespItem.clonedPath, getComponentKindRepoSource(item.spec.source).path),
									});
								}
							}
						}

						const workspaceFilePath = createWorkspaceFile(projectDirPath, selectedProject, workspaceFolders);

						await openClonedDirectory(workspaceFilePath);
					}
				}
			} catch (err: any) {
				console.error("Failed to clone project", err);
				window.showErrorMessage(err?.message || "Failed to clone project");
			}
		}),
	);
}

const cloneRepositoryWithProgress = async (
	parentPath: string,
	repos: { branch?: string; repoUrl?: string }[],
): Promise<{ clonedPath: string; gitUrl: string }[]> => {
	return await window.withProgress(
		{
			title: `Cloning repository into ${parentPath}.`,
			location: ProgressLocation.Notification,
			cancellable: true,
		},
		async (progress, cancellationToken) => {
			const clonedRepos: { clonedPath: string; gitUrl: string }[] = [];
			for (const { branch, repoUrl } of repos) {
				const parsedRepo = parseGitURL(repoUrl);
				if (!parsedRepo) {
					throw new Error("Failed to parse selected Git URL");
				}

				const git = await initGit(ext.context);
				if (git) {
					const gitUrl = `${repoUrl}.git`;

					const clonedPath = await git.clone(
						gitUrl,
						{
							recursive: true,
							ref: branch,
							parentPath,
							progress: {
								report: ({ increment, ...rest }: { increment: number }) =>
									progress.report({
										increment: increment / repos.length,
										message: `Cloning ${parsedRepo[0]}/${parsedRepo[1]} repository into selected directory`,
										...rest,
									}),
							},
						},
						cancellationToken,
					);
					clonedRepos.push({ clonedPath, gitUrl });
				} else {
					throw new Error("Git was not initialized.");
				}
			}
			return clonedRepos;
		},
	);
};

async function openClonedDirectory(openingPath: string) {
	openDirectory(openingPath, "Where do you want to open the cloned repository workspace?");
}
