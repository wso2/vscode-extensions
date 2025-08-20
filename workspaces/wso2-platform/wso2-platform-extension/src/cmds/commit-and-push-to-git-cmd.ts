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

import { CommandIds, type ICommitAndPuhCmdParams, parseGitURL } from "@wso2/wso2-platform-core";
import { type ExtensionContext, ProgressLocation, Uri, commands, window, workspace } from "vscode";
import { ext } from "../extensionVariables";
import { initGit } from "../git/main";
import { hasDirtyRepo } from "../git/util";
import { getLogger } from "../logger/logger";
import { contextStore } from "../stores/context-store";
import { delay } from "../utils";
import { getUserInfoForCmd, isRpcActive, setExtensionName } from "./cmd-utils";

export function commitAndPushToGitCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.CommitAndPushToGit, async (params: ICommitAndPuhCmdParams) => {
			let componentPath = params?.componentPath;
			if (!componentPath && workspace?.workspaceFolders?.[0]) {
				componentPath = Uri.from(workspace.workspaceFolders[0].uri).fsPath;
			}
			if (!componentPath) {
				throw new Error("component/integration(Git) path is required");
			}
			setExtensionName(params?.extName);
			try {
				isRpcActive(ext);
				const userInfo = await getUserInfoForCmd("commit and push changes to Git");
				if (userInfo) {
					const selected = contextStore.getState().state.selected;
					if (!selected) {
						throw new Error("project is not associated with a component directory");
					}

					const haveChanges = await hasDirtyRepo(componentPath, ext.context, ["context.yaml"]);
					if (!haveChanges) {
						window.showErrorMessage("There are no new changes to push to cloud");
						return;
					}

					const newGit = await initGit(ext.context);
					if (!newGit) {
						throw new Error("failed to initGit");
					}
					const dotGit = await newGit?.getRepositoryDotGit(componentPath);
					const repoRoot = await newGit?.getRepositoryRoot(componentPath);
					const repo = newGit.open(repoRoot, dotGit);

					const remotes = await window.withProgress({ title: "Fetching remotes of the repo...", location: ProgressLocation.Notification }, () =>
						repo.getRemotes(),
					);

					if (remotes.length === 0) {
						window.showErrorMessage("No remotes found within the directory");
						return;
					}

					let matchingRemote = remotes.find((item) => {
						if (item.pushUrl) {
							const urlObj = new URL(item.pushUrl);
							if (urlObj.password) {
								return true;
							}
						}
					});

					if (!matchingRemote && process.env.CLOUD_STS_TOKEN && remotes[0].fetchUrl) {
						const repoUrl = remotes[0].fetchUrl;
						const parsed = parseGitURL(repoUrl);
						if (parsed) {
							const [repoOrg, repoName] = parsed;
							const urlObj = new URL(repoUrl);
							getLogger().debug(`Fetching PAT for org ${repoOrg} and repo ${repoName}`);
							const gitPat = await window.withProgress(
								{ title: `Accessing the repository ${repoUrl}...`, location: ProgressLocation.Notification },
								() =>
									ext.clients.rpcClient.getGitTokenForRepository({
										orgId: selected.org?.id?.toString()!,
										gitOrg: repoOrg,
										gitRepo: repoName,
									}),
							);
							urlObj.username = "x-access-token";
							urlObj.password = gitPat.token;
							await window.withProgress({ title: "Setting new remote...", location: ProgressLocation.Notification }, async () => {
								await repo.addRemote("cloud-editor-remote", urlObj.href);
								const remotes = await repo.getRemotes();
								matchingRemote = remotes.find((item) => item.name === "cloud-editor-remote");
							});
						}
					}

					await window.withProgress({ title: "Adding changes to be committed...", location: ProgressLocation.Notification }, async () => {
						await repo.add(["."]);
					});

					const commitMessage = await window.showInputBox({
						placeHolder: "Message to describe the changes done to your integration",
						title: "Enter commit message",
						validateInput: (val) => {
							if (!val) {
								return "Commit message is required";
							}
							return null;
						},
					});

					if (!commitMessage) {
						window.showErrorMessage("Commit message is required in order to proceed");
						return;
					}

					const headRef = await window.withProgress(
						{ title: "Fetching remote repo metadata...", location: ProgressLocation.Notification },
						async () => {
							await repo.fetch({ silent: true, remote: matchingRemote?.name });
							await repo.commit(commitMessage);
							await delay(500);
							return repo.getHEADRef();
						},
					);

					if (headRef?.ahead && (headRef?.behind === 0 || headRef?.behind === undefined)) {
						await window.withProgress({ title: "Pushing changes to remote repository...", location: ProgressLocation.Notification }, () =>
							repo.push(matchingRemote?.name),
						);
						window.showInformationMessage("Your changes have been successfully pushed to cloud");
					} else {
						await commands.executeCommand("git.sync");
					}
				}
			} catch (err: any) {
				console.error("Failed to push to remote", err);
				window.showErrorMessage(err?.message || "Failed to push to remote");
			}
		}),
	);
}
