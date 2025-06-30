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

import { writeFileSync } from "fs";
import * as os from "os";
import * as path from "path";
import { CommandIds, type ComponentKind, type Organization, type Project, type WorkspaceConfig } from "@wso2/choreo-core";
import { type ExtensionContext, Uri, commands, window, workspace } from "vscode";
import { ext } from "../extensionVariables";
import { contextStore } from "../stores/context-store";
import { getUserInfoForCmd, selectOrg, selectProject } from "./cmd-utils";

export function createProjectWorkspaceCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.CreateProjectWorkspace, async () => {
			try {
				const userInfo = await getUserInfoForCmd("create a project workspace");
				if (userInfo) {
					let selectedOrg: Organization;
					let selectedProject: Project;

					const selected = contextStore.getState().state.selected;
					if (selected) {
						selectedOrg = selected.org!;
						selectedProject = selected.project!;
					} else {
						selectedOrg = await selectOrg(userInfo, "Select organization");
						selectedProject = await selectProject(
							selectedOrg,
							`Loading projects from '${selectedOrg.name}'`,
							`Select project from '${selectedOrg.name}'`,
						);
					}

					const workspaceFileDirs = await window.showOpenDialog({
						canSelectFolders: true,
						canSelectFiles: false,
						canSelectMany: false,
						title: "Select a folder to create the project workspace file",
						defaultUri: workspace.workspaceFolders?.[0]?.uri || Uri.file(os.homedir()),
					});

					if (workspaceFileDirs === undefined || workspaceFileDirs.length === 0) {
						throw new Error("Directory is required in order to create the workspace file");
					}

					const workspaceFileDir = workspaceFileDirs[0];

					const workspaceFilePath = createWorkspaceFile(
						workspaceFileDir.fsPath,
						selectedProject!,
						contextStore.getState().state.components?.map((item) => ({
							component: item.component!,
							fsPath: item.componentFsPath,
						})) ?? [],
					);

					const openInCurrentWorkspace = await window.showInformationMessage(
						"Where do you want to open the project workspace?",
						{ modal: true },
						"Current Window",
						"New Window",
					);

					if (openInCurrentWorkspace) {
						await commands.executeCommand("vscode.openFolder", Uri.file(workspaceFilePath), {
							forceNewWindow: openInCurrentWorkspace === "New Window",
						});
					}
				}
			} catch (err: any) {
				console.error("Failed to create project workspace", err);
				window.showErrorMessage(err?.message || "Failed to create project workspace");
			}
		}),
	);
}

export const showProjectWorkspaceCreateNotification = async () => {
	if (!workspace.workspaceFile && contextStore.getState().getValidItems().length > 0) {
		if (!ext.context.workspaceState.get("shown-workspace-create-notification")) {
			ext.context.workspaceState.update("shown-workspace-create-notification", "true");
			window.showInformationMessage("Choreo project detected. Would you like to open it within a workspace", "Create workspace").then((resp) => {
				if (resp === "Create workspace") {
					commands.executeCommand(CommandIds.CreateProjectWorkspace);
				}
			});
		}
	}
};

export const createWorkspaceFile = (workspaceFileDirFsPath: string, project: Project, items: { component: ComponentKind; fsPath: string }[]) => {
	const workspaceFile: WorkspaceConfig = {
		folders:
			items?.map((item) => ({
				name: item.component?.metadata.name!,
				path: path.normalize(path.relative(workspaceFileDirFsPath, item.fsPath)),
			})) ?? [],
	};
	const workspaceFilePath = path.join(workspaceFileDirFsPath, `${project?.handler}.code-workspace`);
	writeFileSync(workspaceFilePath, JSON.stringify(workspaceFile, null, 4));

	return workspaceFilePath;
};
