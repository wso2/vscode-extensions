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

import { CommandIds, type ICommitAndPuhCmdParams } from "@wso2/wso2-platform-core";
import { type ExtensionContext, ProgressLocation, commands, window } from "vscode";
import { ext } from "../extensionVariables";
import { contextStore } from "../stores/context-store";
import { getUserInfoForCmd, isRpcActive, setExtensionName } from "./cmd-utils";
import { initGit } from "../git/main";

export function commitAndPushToGitCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.CommitAndPushToGit, async (params: ICommitAndPuhCmdParams) => {
			if(!params.componentPath){
				throw new Error("component/integration path is required")
			}
			setExtensionName(params?.extName);
			try {
				isRpcActive(ext);
				const userInfo = await getUserInfoForCmd(`commit and push changes to Git`);
				if (userInfo) {		
					const selected = contextStore.getState().state.selected;
					if(!selected){
						throw new Error("project is not associated with a component directory")
					}

					const newGit = await initGit(ext.context);
					if (!newGit) {
						throw new Error("failed to initGit");
					}
					const dotGit = await newGit?.getRepositoryDotGit(params.componentPath);
					const repoRoot = await newGit?.getRepositoryRoot(params.componentPath);
					const repo = newGit.open(repoRoot, dotGit);

					await window.withProgress({ title: "Adding changes to be committed...", location: ProgressLocation.Notification }, async () => {
						await repo.pull();
						await repo.add(["."]);
					});

					const commitMessage = await window.showInputBox({
						placeHolder: "Enter commit message",
						title: "Enter commit message",
						validateInput: (val) => {
							if (!val) {
								return "Commit message is required";
							}
							return null;
						},
					});

					if(!commitMessage){
						window.showErrorMessage("Commit message is required in order to proceed");
						return
					}

					await window.withProgress({ title: "Committing and pushing changes to remove...", location: ProgressLocation.Notification }, async () => {
						await repo.commit(commitMessage);
						await repo.push();
					});
				}
			} catch (err: any) {
				console.error("Failed to push to remote", err);
				window.showErrorMessage(err?.message || "Failed to push to remote");
			}
		}),
	);
}
