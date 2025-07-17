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

import { CommandIds, type ComponentKind, type ExtensionName, type Organization, type Project, type UserInfo } from "@wso2/wso2-platform-core";
import { ProgressLocation, type QuickPickItem, QuickPickItemKind, type WorkspaceFolder, commands, window, workspace } from "vscode";
import { type ExtensionVariables, ext } from "../extensionVariables";
import { authStore, waitForLogin } from "../stores/auth-store";
import { dataCacheStore } from "../stores/data-cache-store";
import { webviewStateStore } from "../stores/webview-state-store";

export const selectComponent = async (
	org: Organization,
	project: Project,
	loadingTitle = "Loading Components/Integrations...",
	selectTitle = "Select Component/Integrations",
): Promise<ComponentKind> => {
	const extName = webviewStateStore.getState().state?.extensionName;
	const selectedComponent = await quickPickWithLoader({
		cacheQuickPicks: dataCacheStore
			.getState()
			.getComponents(org.handle, project.handler)
			.map((item) => ({ label: item.metadata.displayName, item })),
		loadQuickPicks: async () => {
			const components = await ext.clients.rpcClient.getComponentList({
				orgId: org.id.toString(),
				orgHandle: org.handle,
				projectId: project.id,
				projectHandle: project.handler,
			});
			dataCacheStore.getState().setComponents(org.handle, project.handler, components);

			if (!components || components.length === 0) {
				throw new Error(
					`You do not have any existing ${extName === "Devant" ? "integrations" : "components"} in your project. Please retry after creating one.`,
				);
			}

			return components.map((item) => ({ label: item.metadata.displayName, item }));
		},
		loadingTitle,
		selectTitle,
		placeholder: `${extName === "Devant" ? "Integration" : "Component"} Name`,
	});

	if (!selectedComponent) {
		throw new Error(`Failed to select ${extName === "Devant" ? "integration" : "component"}`);
	}

	return selectedComponent;
};

export const selectProject = async (org: Organization, loadingTitle = "Loading projects...", selectTitle = "Select project"): Promise<Project> => {
	const extName = webviewStateStore.getState().state?.extensionName;
	const selectedProject = await quickPickWithLoader({
		cacheQuickPicks: dataCacheStore
			.getState()
			.getProjects(org.handle)
			.map((item) => ({ label: item.name, detail: `Handle: ${item.handler}`, item })),
		loadQuickPicks: async () => {
			const projects = await ext.clients.rpcClient.getProjects(org.id.toString());
			dataCacheStore.getState().setProjects(org.handle, projects);

			if (!projects || projects.length === 0) {
				throw new Error(`You do not have any existing ${extName === "Devant" ? "integrations" : "components"} or projects. Please try creating one.`);
			}

			return projects.map((item) => ({ label: item.name, detail: `Handle: ${item.handler}`, item }));
		},
		loadingTitle,
		selectTitle,
		placeholder: "Project Name",
	});

	if (!selectedProject) {
		throw new Error("Failed to select project");
	}

	return selectedProject;
};

export const selectProjectWithCreateNew = async (
	org: Organization,
	loadingTitle = "Loading projects...",
	selectTitle = "Select project",
): Promise<{ selectedProject: Project; projectList: Project[] }> => {
	type ProjectQuickPick = QuickPickItem & { item?: Project };
	const projectQuickPicks: ProjectQuickPick[] = [];
	const projectCachePicks = dataCacheStore
		.getState()
		.getProjects(org.handle)
		.map((item) => ({ label: item.name, detail: `Handle: ${item.handler}`, item }));
	if (projectCachePicks.length > 0) {
		projectQuickPicks.push({ kind: QuickPickItemKind.Separator, label: "Existing projects" });
		projectQuickPicks.push(...projectCachePicks);
	}
	projectQuickPicks.push({ kind: QuickPickItemKind.Separator, label: "New Project" });
	projectQuickPicks.push({
		label: "Create New",
		detail: `Create new project within ${org.name} organization`,
		alwaysShow: true,
	});

	const quickPick = window.createQuickPick();
	quickPick.busy = true;
	quickPick.title = loadingTitle;
	quickPick.ignoreFocusOut = true;
	quickPick.placeholder = "Project Name";
	quickPick.items = projectQuickPicks;
	quickPick.show();

	let projectList = dataCacheStore.getState().getProjects(org.handle);

	ext.clients.rpcClient
		.getProjects(org.id.toString())
		.then((projects) => {
			dataCacheStore.getState().setProjects(org.handle, projects);
			projectList = projects;
			quickPick.busy = false;
			quickPick.title = selectTitle || "Select an options";
			const updatedQuickPicks: ProjectQuickPick[] = [];
			const projectQuickPicks = projects?.map((item) => ({
				label: item.name,
				detail: `Handle: ${item.handler}`,
				item,
			}));
			if (projects?.length > 0) {
				updatedQuickPicks.push({ kind: QuickPickItemKind.Separator, label: "Existing projects" });
				updatedQuickPicks.push(...projectQuickPicks);
			}
			updatedQuickPicks.push({ kind: QuickPickItemKind.Separator, label: "New Project" });
			updatedQuickPicks.push({
				label: "Create New",
				detail: `Create new project within ${org.name} organization`,
				alwaysShow: true,
			});
			quickPick.items = updatedQuickPicks;
		})
		.catch((err) => {
			quickPick.dispose();
			throw err;
		});

	const selectedQuickPick = await new Promise((resolve) => {
		quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0]));
		quickPick.onDidHide(() => resolve(null));
	});
	quickPick.dispose();

	if ((selectedQuickPick as QuickPickItem)?.label === "Create New") {
		const projectCache = dataCacheStore.getState().getProjects(org.handle);

		const newProjectName = await window.showInputBox({
			placeHolder: "project-name",
			title: "New Project Name",
			validateInput: (val) => {
				if (!val) {
					return "Project name is required";
				}
				if (projectCache?.some((item) => item.name === val)) {
					return "Project name already exists";
				}
				if (val?.length > 60 || val?.length < 3) {
					return "Project name must be between 3 and 60 characters";
				}
				if (!/^[A-Za-z]/.test(val)) {
					return "Project name must start with an alphabetic letter";
				}
				if (!/^[A-Za-z\s\d\-_]+$/.test(val)) {
					return "Project name cannot have any special characters";
				}
				return null;
			},
		});

		if (!newProjectName) {
			throw new Error("New project name is required to proceed.");
		}

		const selectedProject = await window.withProgress(
			{
				title: `Creating new project ${newProjectName}...`,
				location: ProgressLocation.Notification,
			},
			() =>
				ext.clients.rpcClient.createProject({
					orgHandler: org.handle,
					orgId: org.id.toString(),
					projectName: newProjectName,
					region: "US",
				}),
		);
		return { projectList, selectedProject: selectedProject };
	}
	if ((selectedQuickPick as ProjectQuickPick)?.item) {
		return { projectList, selectedProject: (selectedQuickPick as ProjectQuickPick)?.item! };
	}

	throw new Error("Failed to select project");
};

export const selectOrg = async (userInfo: UserInfo, selectTitle = "Select organization"): Promise<Organization> => {
	const items: QuickPickItem[] = userInfo.organizations?.map((item) => ({
		label: item.name,
		detail: `Handle: ${item.handle}`,
	}));

	if (!items || items.length === 0) {
		const extensionName = webviewStateStore.getState().state.extensionName;
		throw new Error(`Please visit ${extensionName} to create a new organization`);
	}

	if (userInfo.organizations.length === 1) {
		return userInfo.organizations[0];
	}

	const orgSelection = await window.showQuickPick(items, {
		title: selectTitle,
		ignoreFocusOut: true,
		placeHolder: "Organization Name",
	});

	const selectedOrg = userInfo.organizations.find((item) => item.name === orgSelection?.label);

	if (!selectedOrg) {
		throw new Error("Failed to select organization");
	}

	return selectedOrg;
};

export const resolveWorkspaceDirectory = async (): Promise<WorkspaceFolder> => {
	if (!workspace.workspaceFolders || workspace.workspaceFolders?.length === 0) {
		throw new Error("Directory is required in order to proceed");
	}
	if (workspace.workspaceFolders?.length === 1) {
		return workspace.workspaceFolders[0];
	}
	const items: QuickPickItem[] = workspace.workspaceFolders!.map((item) => ({
		label: item.name,
		detail: item.uri.path,
	}));

	const directorySelection = await window.showQuickPick(items, {
		title: "Select Workspace",
		ignoreFocusOut: true,
	});
	return workspace.workspaceFolders?.find((item) => item.name === directorySelection?.label)!;
};

export const resolveQuickPick = async <T>(
	items: (QuickPickItem & { item: T })[] = [],
	quickPickTitle = "selectItem",
	emptyError = "No items found to pick",
): Promise<T> => {
	if (!items || items?.length === 0) {
		throw new Error(emptyError);
	}
	if (items?.length === 1) {
		return items[0]?.item;
	}
	const itemSelection = await window.showQuickPick(items, { title: quickPickTitle, ignoreFocusOut: true });
	if (!itemSelection?.item) {
		throw new Error("No items selected");
	}
	return itemSelection?.item;
};

export async function quickPickWithLoader<T>(params: {
	cacheQuickPicks?: (QuickPickItem & { item?: T })[];
	loadQuickPicks: () => Promise<(QuickPickItem & { item?: T })[]>;
	loadingTitle?: string;
	selectTitle?: string;
	placeholder?: string;
}): Promise<T | undefined | null> {
	const quickPick = window.createQuickPick();
	quickPick.busy = true;
	quickPick.title = params.loadingTitle || "Loading...";
	quickPick.ignoreFocusOut = true;
	quickPick.placeholder = params.placeholder;
	if (params.cacheQuickPicks) {
		quickPick.items = params.cacheQuickPicks;
	}
	quickPick.show();
	let parentErr: Error | undefined;

	params
		.loadQuickPicks()
		.then((quickPickItems) => {
			quickPick.items = quickPickItems;
			quickPick.busy = false;
			quickPick.title = params.selectTitle || "Select an options";
		})
		.catch((err) => {
			quickPick.dispose();
			parentErr = err;
			throw err;
		});
	const selectedQuickPick = await new Promise((resolve) => {
		quickPick.onDidAccept(() => resolve(quickPick.selectedItems[0]));
		quickPick.onDidHide(() => resolve(null));
	});

	quickPick.dispose();
	const selectedT = (selectedQuickPick as QuickPickItem & { item?: T })?.item;

	if (parentErr) {
		throw parentErr;
	}

	return selectedT;
}

export const getUserInfoForCmd = async (message: string): Promise<UserInfo | null> => {
	let userInfo = authStore.getState().state.userInfo;
	const extensionName = webviewStateStore.getState().state.extensionName;
	if (!userInfo) {
		const loginSelection = await window.showInformationMessage(
			`You are not logged into ${extensionName}.`,
			{ modal: true, detail: `Please login to continue and ${message}` },
			"Login",
		);
		if (loginSelection === "Login") {
			if (loginSelection === "Login") {
				await commands.executeCommand(CommandIds.SignIn);
			}
			userInfo = await waitForLogin();

			const response = await window.showInformationMessage(
				`Successfully logged into ${extensionName}`,
				{ modal: true, detail: `Do you want to continue and ${message}` },
				"Continue",
			);
			if (response === "Continue") {
				return userInfo;
			}
			return null;
		}
	}
	return userInfo;
};

export const setExtensionName = (extName?: ExtensionName) => {
	if (extName) {
		webviewStateStore.getState().setExtensionName(extName);
	}
};

export const isRpcActive = (ext: ExtensionVariables) => {
	if (!ext.clients.rpcClient.isActive()) {
		throw new Error(`${webviewStateStore.getState().state.extensionName} extension still hasn't been initialized...`);
	}
};
