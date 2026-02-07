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
	ChoreoComponentType,
	CommandIds,
	ComponentConfig,
	type ComponentKind,
	DevantScopes,
	type ExtensionName,
	type ICreateComponentCmdParams,
	type Organization,
	type Project,
	type SubmitBatchComponentCreateReq,
	type SubmitBatchComponentCreateResp,
	type SubmitComponentCreateReq,
	type UserInfo,
	type WorkspaceConfig,
	getComponentKindRepoSource,
	getComponentTypeText,
	getIntegrationScopeText,
	getTypeOfIntegrationType,
	parseGitURL,
} from "@wso2/wso2-platform-core";
import { type ExtensionContext, ProgressLocation, type QuickPickItem, Uri, commands, window, workspace } from "vscode";
import { ext } from "../extensionVariables";
import { initGit } from "../git/main";
import { getGitRemotes, getGitRoot } from "../git/util";
import { getLogger } from "../logger/logger";
import { contextStore, waitForContextStoreToLoad } from "../stores/context-store";
import { dataCacheStore } from "../stores/data-cache-store";
import { webviewStateStore } from "../stores/webview-state-store";
import { convertFsPathToUriPath, isSamePath, isSubpath, openDirectory } from "../utils";
import { showComponentDetailsView } from "../webviews/ComponentDetailsView";
import { ComponentFormView, type IComponentCreateFormParams, type ISingleComponentCreateFormParams } from "../webviews/ComponentFormView";
import { createNewProject, getUserInfoForCmd, isRpcActive, selectOrg, selectProjectWithCreateNew, setExtensionName } from "./cmd-utils";
import { updateContextFile } from "./create-directory-context-cmd";

let componentWizard: ComponentFormView;

// ============================================================================
// Terminology Helpers - Centralize Devant vs Choreo naming differences
// ============================================================================

interface TerminologyContext {
	readonly isDevant: boolean;
	readonly componentTerm: string;
	readonly componentTermCapitalized: string;
	readonly articleComponentTerm: string;
}

function getTerminology(extName: ExtensionName | undefined): TerminologyContext {
	const isDevant = extName === "Devant";
	return {
		isDevant,
		componentTerm: isDevant ? "integration" : "component",
		componentTermCapitalized: isDevant ? "Integration" : "Component",
		articleComponentTerm: isDevant ? "an integration" : "a component",
	};
}

// ============================================================================
// Organization & Project Selection
// ============================================================================

interface OrgProjectSelection {
	org: Organization;
	project: Project;
}

async function selectOrgAndProject(userInfo: UserInfo, terminology: TerminologyContext): Promise<OrgProjectSelection> {
	await waitForContextStoreToLoad();
	const selected = contextStore.getState().state.selected;

	if (selected?.project && selected?.org) {
		return { org: selected.org, project: selected.project };
	}

	const selectedOrg = await selectOrg(userInfo, "Select organization");
	const createdProjectRes = await selectProjectWithCreateNew(
		selectedOrg,
		`Loading projects from '${selectedOrg.name}'`,
		`Select the project from '${selectedOrg.name}', to create the ${terminology.componentTerm} in`,
	);

	return { org: selectedOrg, project: createdProjectRes.selectedProject };
}

async function selectOrgAndProjectForBatch(
	userInfo: UserInfo,
	rootDirectory: string
): Promise<OrgProjectSelection> {
	await waitForContextStoreToLoad();
	const selected = contextStore.getState().state.selected;

	if (selected?.project && selected?.org) {
		return { org: selected.org, project: selected.project };
	}

	const selectedOrg = await selectOrg(userInfo, "Select organization");

	const projectName = path.basename(rootDirectory);
	const project = await createNewProject(selectedOrg, projectName, true);
	return { org: selectedOrg, project: project };
}

// ============================================================================
// Component Type Selection
// ============================================================================

interface ComponentTypeSelection {
	type: string;
	subType?: string;
}

function getAvailableComponentTypes(isDevant: boolean): string[] {
	if (isDevant) {
		return [
			DevantScopes.AUTOMATION,
			DevantScopes.AI_AGENT,
			DevantScopes.INTEGRATION_AS_API,
			DevantScopes.EVENT_INTEGRATION,
			DevantScopes.FILE_INTEGRATION,
			DevantScopes.LIBRARY,
		];
	}
	return [
		ChoreoComponentType.Service,
		ChoreoComponentType.WebApplication,
		ChoreoComponentType.ScheduledTask,
		ChoreoComponentType.ManualTrigger,
		ChoreoComponentType.ApiProxy,
	];
}

function extractTypeFromParams(
	params: ICreateComponentCmdParams,
	componentTypes: string[],
	isDevant: boolean,
): ComponentTypeSelection | undefined {
	if (isDevant && params?.integrationType && componentTypes.includes(params.integrationType)) {
		const intType = getTypeOfIntegrationType(params.integrationType);
		if (intType.type) {
			return { type: intType.type, subType: intType.subType };
		}
	}

	if (!isDevant && params?.type && componentTypes.includes(params.type)) {
		return { type: params.type };
	}

	return undefined;
}

async function promptForComponentType(
	componentTypes: string[],
	terminology: TerminologyContext,
): Promise<ComponentTypeSelection | undefined> {
	const typeQuickPicks: (QuickPickItem & { value: string })[] = componentTypes.map((item) => ({
		label: terminology.isDevant ? getIntegrationScopeText(item) : getComponentTypeText(item),
		value: item,
	}));

	const selectedTypePick = await window.showQuickPick(typeQuickPicks, {
		title: `Select ${terminology.componentTermCapitalized} Type`,
	});

	if (!selectedTypePick?.value) {
		return undefined;
	}

	if (terminology.isDevant) {
		const intType = getTypeOfIntegrationType(selectedTypePick.value);
		if (intType.type) {
			return { type: intType.type, subType: intType.subType };
		}
		return undefined;
	}

	return { type: selectedTypePick.value };
}

async function resolveComponentType(
	params: ICreateComponentCmdParams,
	terminology: TerminologyContext,
): Promise<ComponentTypeSelection> {
	const componentTypes = getAvailableComponentTypes(terminology.isDevant);

	const typeFromParams = extractTypeFromParams(params, componentTypes, terminology.isDevant);
	if (typeFromParams) {
		return typeFromParams;
	}

	const selectedType = await promptForComponentType(componentTypes, terminology);
	if (!selectedType) {
		throw new Error(`${terminology.componentTermCapitalized} type is required`);
	}

	return selectedType;
}

// ============================================================================
// Directory Selection
// ============================================================================

function getDefaultUri(): Uri {
	if (workspace.workspaceFile && workspace.workspaceFile.scheme !== "untitled") {
		return workspace.workspaceFile;
	}
	if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
		return workspace.workspaceFolders[0].uri;
	}
	return Uri.file(os.homedir());
}

async function selectComponentDirectory(
	params: ICreateComponentCmdParams,
	terminology: TerminologyContext,
): Promise<Uri> {
	if (params?.componentDir && existsSync(params.componentDir)) {
		return Uri.parse(convertFsPathToUriPath(params.componentDir));
	}

	const selectedPaths = await window.showOpenDialog({
		canSelectFolders: true,
		canSelectFiles: false,
		canSelectMany: false,
		title: `Select ${terminology.componentTerm} directory`,
		defaultUri: getDefaultUri(),
	});

	if (!selectedPaths || selectedPaths.length === 0) {
		throw new Error(`${terminology.componentTermCapitalized} directory selection is required`);
	}

	return selectedPaths[0];
}

// ============================================================================
// Git & Component Existence Checking
// ============================================================================

interface GitInfo {
	root: string | undefined;
	isInitialized: boolean;
}

async function getGitInfo(context: ExtensionContext, directoryPath: string): Promise<GitInfo> {
	try {
		const root = await getGitRoot(context, directoryPath);
		return { root, isInitialized: true };
	} catch {
		return { root: undefined, isInitialized: false };
	}
}

async function checkIfComponentExistsAtPath(
	components: ComponentKind[],
	gitRoot: string,
	selectedPath: string,
): Promise<boolean> {
	const remotes = await getGitRemotes(ext.context, gitRoot);

	for (const component of components) {
		const repoUrl = getComponentKindRepoSource(component.spec.source).repo;
		const parsedRepoUrl = parseGitURL(repoUrl);

		if (!parsedRepoUrl) {
			continue;
		}

		const [repoOrg, repoName, repoProvider] = parsedRepoUrl;

		const hasMatchingRemote = remotes.some((remote) => {
			const parsedRemoteUrl = parseGitURL(remote.fetchUrl);
			if (!parsedRemoteUrl) {
				return false;
			}
			const [remoteOrg, remoteName, remoteProvider] = parsedRemoteUrl;
			return repoOrg === remoteOrg && repoName === remoteName && repoProvider === remoteProvider;
		});

		if (hasMatchingRemote) {
			const componentPath = path.join(gitRoot, getComponentKindRepoSource(component.spec.source)?.path);
			if (isSamePath(componentPath, selectedPath)) {
				return true;
			}
		}
	}

	return false;
}

async function handleExistingComponent(
	project: Project,
	org: Organization,
	gitRoot: string,
	terminology: TerminologyContext,
): Promise<boolean> {
	const message =
		`${terminology.isDevant ? "An integration" : "A component"} for the selected directory already exists ` +
		`within your project(${project.name}). Do you want to proceed and create another ${terminology.componentTerm}?`;

	const response = await window.showInformationMessage(message, { modal: true }, "Proceed");

	if (response === "Proceed") {
		return true;
	}

	const projectCache = dataCacheStore.getState().getProjects(org.handle);
	const userInfo = ext.authProvider?.getState().state.userInfo;

	if (!userInfo) {
		window.showErrorMessage("User information is not available. Please sign in and try again.");
		return false;
	}

	updateContextFile(gitRoot, userInfo, project, org, projectCache);
	contextStore.getState().refreshState();
	return false;
}

// ============================================================================
// Component Name Generation
// ============================================================================

function generateUniqueComponentName(
	baseName: string,
	existingComponents: ComponentKind[],
	reservedNames: Set<string> = new Set(),
): string {
	const existingNames = new Set(
		existingComponents.map((c) => c.metadata?.name?.toLowerCase?.()),
	);
	reservedNames.forEach((name) => existingNames.add(name.toLowerCase()));

	if (!existingNames.has(baseName.toLowerCase())) {
		return baseName;
	}

	let counter = 1;
	let candidateName = `${baseName}-${counter}`;

	while (existingNames.has(candidateName.toLowerCase())) {
		counter++;
		candidateName = `${baseName}-${counter}`;
	}

	return candidateName;
}

// ============================================================================
// Component Fetching
// ============================================================================

async function fetchProjectComponents(
	org: Organization,
	project: Project,
	terminology: TerminologyContext,
): Promise<ComponentKind[]> {
	const components = await window.withProgress(
		{
			title: `Fetching ${terminology.isDevant ? "integrations" : "components"} of project ${project.name}...`,
			location: ProgressLocation.Notification,
		},
		() =>
			ext.clients.rpcClient.getComponentList({
				orgId: org.id.toString(),
				orgHandle: org.handle,
				projectId: project.id,
				projectHandle: project.handler,
			}),
	);

	dataCacheStore.getState().setComponents(org.handle, project.handler, components);
	return components;
}

// ============================================================================
// Form Display
// ============================================================================

function buildCreateFormParams(
	selectedUri: Uri,
	typeSelection: ComponentTypeSelection,
	componentName: string,
	gitInfo: GitInfo,
	buildPackLang?: string,
	supportedIntegrationTypes?: string[],
): ComponentConfig {
	return {
		directoryUriPath: selectedUri.path,
		directoryFsPath: selectedUri.fsPath,
		directoryName: path.basename(selectedUri.fsPath),
		initialValues: {
			type: typeSelection.type,
			subType: typeSelection.subType,
			buildPackLang: buildPackLang,
			name: componentName,
		},
		isNewCodeServerComp: !gitInfo.isInitialized && ext.isDevantCloudEditor,
		supportedIntegrationTypes,
	};
}

async function buildComponentConfigWithoutExistenceCheck(
	context: ExtensionContext,
	param: ICreateComponentCmdParams,
	components: ComponentKind[],
	terminology: TerminologyContext,
	reservedNames: Set<string> = new Set(),
): Promise<ComponentConfig | null> {
	const typeSelection = await resolveComponentType(param, terminology);
	const selectedUri = await selectComponentDirectory(param, terminology);
	const gitInfo = await getGitInfo(context, selectedUri.fsPath);

	const baseName = param?.name || path.basename(selectedUri.fsPath) || typeSelection.type;
	const componentName = generateUniqueComponentName(baseName, components, reservedNames);

	return buildCreateFormParams(
		selectedUri,
		typeSelection,
		componentName,
		gitInfo,
		param?.buildPackLang,
		param?.supportedIntegrationTypes,
	);
}

async function buildComponentConfig(
	context: ExtensionContext,
	param: ICreateComponentCmdParams,
	org: Organization,
	project: Project,
	components: ComponentKind[],
	terminology: TerminologyContext,
): Promise<ComponentConfig | null> {
	const typeSelection = await resolveComponentType(param, terminology);
	const selectedUri = await selectComponentDirectory(param, terminology);
	const gitInfo = await getGitInfo(context, selectedUri.fsPath);

	if (gitInfo.root) {
		const componentExists = await checkIfComponentExistsAtPath(components, gitInfo.root, selectedUri.fsPath);
		if (componentExists) {
			const shouldProceed = await handleExistingComponent(project, org, gitInfo.root, terminology);
			if (!shouldProceed) {
				return null;
			}
		}
	}

	const baseName = param?.name || path.basename(selectedUri.fsPath) || typeSelection.type;
	const componentName = generateUniqueComponentName(baseName, components);

	return buildCreateFormParams(
		selectedUri,
		typeSelection,
		componentName,
		gitInfo,
		param?.buildPackLang,
		param?.supportedIntegrationTypes,
	);
}

function showComponentFormInWorkspace(
	createParams: ISingleComponentCreateFormParams | IComponentCreateFormParams,
	rootDirectory: string
): void {
	componentWizard = new ComponentFormView(ext.context.extensionUri, createParams, rootDirectory);
	componentWizard.getWebview()?.reveal();
}

function showComponentFormOutsideWorkspace(
	createParams: ISingleComponentCreateFormParams | IComponentCreateFormParams,
	gitRoot: string | undefined,
	directoryPath: string,
): void {
	openDirectory(
		gitRoot || directoryPath,
		"Where do you want to open the selected directory?",
		() => {
			ext.context.globalState.update("create-comp-params", JSON.stringify(createParams));
		},
	);
}

// ============================================================================
// Component Preparation Helper
// ============================================================================

interface PreparedComponentResult {
	formParams: IComponentCreateFormParams;
	gitRoot: string | undefined;
	directoryPath: string;
	isWithinWorkspace: boolean;
}

async function prepareComponentFormParams(
	context: ExtensionContext,
	params: ICreateComponentCmdParams,
	org: Organization,
	project: Project,
	components: ComponentKind[],
	terminology: TerminologyContext
): Promise<PreparedComponentResult | null> {

	const componentConfig = await buildComponentConfig(context, params, org, project, components, terminology);
	if (!componentConfig) {
		return null;
	}

	const formParams: IComponentCreateFormParams = {
		organization: org,
		project: project,
		extensionName: webviewStateStore.getState().state.extensionName,
		components: [componentConfig],
		rootDirectory: params?.componentDir ? convertFsPathToUriPath(params.componentDir) : "",
	};

	const isWithinWorkspace = workspace.workspaceFolders?.some((folder) =>
		isSubpath(folder.uri?.fsPath, componentConfig.directoryFsPath),
	) ?? false;

	const gitInfo = await getGitInfo(context, componentConfig.directoryFsPath);

	return {
		formParams: formParams,
		gitRoot: gitInfo.root,
		directoryPath: componentConfig.directoryUriPath,
		isWithinWorkspace: isWithinWorkspace
	}
}

async function prepareComponentFormParamsBatch(
	context: ExtensionContext,
	params: ICreateComponentCmdParams[],
	org: Organization,
	project: Project,
	components: ComponentKind[],
	terminology: TerminologyContext,
	rootDirectory: string,
): Promise<PreparedComponentResult | null> {
	if (rootDirectory === "" || params?.length === 0) {
		return null;
	}

	let directoryUri: Uri;
	if (rootDirectory !== "" && existsSync(rootDirectory)) {
		directoryUri = Uri.parse(convertFsPathToUriPath(rootDirectory));
	} else {
		return null;
	}

	const componentConfigs: ComponentConfig[] = [];
	const reservedNames = new Set<string>();
	const gitInfo = await getGitInfo(context, directoryUri.fsPath);

	// Pre-check: identify which components already exist and filter to only new ones
	const newComponentParams: ICreateComponentCmdParams[] = [];

	if (gitInfo.root) {
		for (const param of params) {
			const selectedUri = await selectComponentDirectory(param, terminology);
			const componentExists = await checkIfComponentExistsAtPath(components, gitInfo.root, selectedUri.fsPath);
			
			if (!componentExists) {
				newComponentParams.push(param);
			}
		}

		// If no new components to deploy, silently update context and return
		if (newComponentParams.length === 0) {
			const userInfo = ext.authProvider?.getState().state.userInfo;
			if (userInfo) {
				const projectCache = dataCacheStore.getState().getProjects(org.handle);
				updateContextFile(gitInfo.root, userInfo, project, org, projectCache);
				contextStore.getState().refreshState();
			}
			return null;
		}
	}

	// Process only new components (or all if git root not found)
	const paramsToProcess = gitInfo.root && newComponentParams.length > 0 ? newComponentParams : params;

	for (const param of paramsToProcess) {
		const componentConfig = await buildComponentConfigWithoutExistenceCheck(
			context, 
			param, 
			components, 
			terminology,
			reservedNames
		);
		if (!componentConfig) {
			continue;
		}
		if (componentConfig.initialValues?.name) {
			reservedNames.add(componentConfig.initialValues.name);
		}
		componentConfigs.push(componentConfig);
	}

	if (componentConfigs.length === 0) {
		return null;
	}

	const formParams: IComponentCreateFormParams = {
		organization: org,
		project: project,
		extensionName: webviewStateStore.getState().state.extensionName,
		components: componentConfigs,
		rootDirectory: convertFsPathToUriPath(rootDirectory),
	};

	const isWithinWorkspace = workspace.workspaceFolders?.some((folder) =>
		isSubpath(folder.uri?.fsPath, directoryUri.fsPath),
	) ?? false;

	return {
		formParams: formParams,
		gitRoot: gitInfo.root,
		directoryPath: directoryUri.path,
		isWithinWorkspace: isWithinWorkspace
	}
}

function showComponentForm(prepared: PreparedComponentResult): void {
	if (prepared.isWithinWorkspace || workspace.workspaceFile) {
		showComponentFormInWorkspace(prepared.formParams, prepared.directoryPath);
	} else {
		showComponentFormOutsideWorkspace(prepared.formParams, prepared.gitRoot, prepared.directoryPath);
	}
}

// ============================================================================
// Main Command Handler
// ============================================================================

async function executeCreateComponentCommand(
	context: ExtensionContext,
	params: ICreateComponentCmdParams,
): Promise<void> {
	setExtensionName(params?.extName);
	const extName = webviewStateStore.getState().state.extensionName;
	const terminology = getTerminology(extName);

	isRpcActive(ext);

	const userInfo = await getUserInfoForCmd(`create ${terminology.articleComponentTerm}`);
	if (!userInfo) {
		return;
	}

	const { org, project } = await selectOrgAndProject(userInfo, terminology);
	const components = await fetchProjectComponents(org, project, terminology);

	const prepared = await prepareComponentFormParams(context, params, org, project, components, terminology);
	if (!prepared) {
		return;
	}

	showComponentForm(prepared);
}

async function executeCreateMultipleNewComponentsCommand(
	context: ExtensionContext,
	params: ICreateComponentCmdParams[],
	rootDirectory: string,
): Promise<void> {
	if (!params || params.length === 0) {
		return;
	}

	// Use the first param's extName for setup
	setExtensionName(params[0]?.extName);
	const extName = webviewStateStore.getState().state.extensionName;
	const terminology = getTerminology(extName);

	isRpcActive(ext);

	const userInfo = await getUserInfoForCmd(`create multiple ${terminology.componentTerm}s`);
	if (!userInfo) {
		return;
	}

	// Select org and project once for all components
	const { org, project } = extName === "Devant"
		? await selectOrgAndProjectForBatch(userInfo, rootDirectory)
		: await selectOrgAndProject(userInfo, terminology);
	const components = await fetchProjectComponents(org, project, terminology);

	// Prepare all components first, collecting form params
	const preparedComponents = await prepareComponentFormParamsBatch(
		context,
		params,
		org,
		project,
		components,
		terminology,
		rootDirectory
	);
	if (!preparedComponents) {
		return;
	}

	showComponentForm(preparedComponents);
}

export function createNewComponentCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.CreateNewComponent, async (params: ICreateComponentCmdParams) => {
			const extName = webviewStateStore.getState().state.extensionName;
			const terminology = getTerminology(extName);

			try {
				await executeCreateComponentCommand(context, params);
			} catch (err: any) {
				console.error(`Failed to create ${terminology.componentTerm}`, err);
				window.showErrorMessage(err?.message || `Failed to create ${terminology.componentTerm}`);
			}
		}),
	);
}

export function createMultipleNewComponentsCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(
			CommandIds.CreateMultipleNewComponents,
			async (params: ICreateComponentCmdParams[], rootDirectory: string) => {
				const extName = webviewStateStore.getState().state.extensionName;
				const terminology = getTerminology(extName);

				try {
					await executeCreateMultipleNewComponentsCommand(context, params, rootDirectory);
				} catch (err: any) {
					console.error(`Failed to create multiple ${terminology.componentTerm}s`, err);
					window.showErrorMessage(err?.message || `Failed to create multiple ${terminology.componentTerm}s`);
				}
			}
		),
	);
}

/** Continue create component flow if user chooses a directory outside his/her workspace. */
export const continueCreateComponent = () => {
	const compParams: string | null | undefined = ext.context.globalState.get("create-comp-params");
	if (compParams) {
		ext.context.globalState.update("create-comp-params", null);
		const createCompParams: ISingleComponentCreateFormParams | IComponentCreateFormParams = JSON.parse(compParams);
		if (createCompParams?.rootDirectory) {
			createCompParams.rootDirectory = convertFsPathToUriPath(createCompParams.rootDirectory);
		}
		if (createCompParams?.extensionName) {
			webviewStateStore.getState().setExtensionName(createCompParams?.extensionName as ExtensionName);
		}
		componentWizard = new ComponentFormView(ext.context.extensionUri, createCompParams, createCompParams.rootDirectory);
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

		const compCache = dataCacheStore.getState().getComponents(org.handle, project.handler);
		dataCacheStore.getState().setComponents(org.handle, project.handler, [createdComponent, ...compCache]);

		// update the context file if needed
		try {
			const newGit = await initGit(ext.context);
			const gitRoot = await newGit?.getRepositoryRoot(createParams.componentDir);
			const dotGit = await newGit?.getRepositoryDotGit(createParams.componentDir);
			const projectCache = dataCacheStore.getState().getProjects(org.handle);
			if (newGit && gitRoot && dotGit) {
				if (ext.isDevantCloudEditor) {
					// update the code server, to attach itself to the created component
					const repo = newGit.open(gitRoot, dotGit);
					const head = await repo.getHEAD();
					if (head.name) {
						const commit = await repo.getCommit(head.name);
						try {
							await window.withProgress(
								{ title: "Updating cloud editor with newly created component...", location: ProgressLocation.Notification },
								() =>
									ext.clients.rpcClient.updateCodeServer({
										componentId: createdComponent.metadata.id,
										orgHandle: org.handle,
										orgId: org.id.toString(),
										orgUuid: org.uuid,
										projectId: project.id,
										sourceCommitHash: commit.hash,
									}),
							);
						} catch (err) {
							getLogger().error("Failed to updated code server after creating the component", err);
						}

						// Clear code server local storage data data
						try {
							await commands.executeCommand("devantEditor.clearLocalStorage");
						} catch (err) {
							getLogger().error(`Failed to execute devantEditor.clearLocalStorage command: ${err}`);
						}
					}
				} else {
					const userInfo = ext.authProvider?.getState().state.userInfo;
					if (userInfo) {
						updateContextFile(gitRoot, userInfo, project, org, projectCache);
						contextStore.getState().refreshState();
					} else {
						getLogger().error("Cannot update context file: userInfo is undefined.");
					}
				}
			}
		} catch (err) {
			console.error("Failed to get git details of ", createParams.componentDir);
		}

		if (extensionName !== "Devant") {
			showComponentDetailsView(org, project, createdComponent, createParams?.componentDir, undefined, true);
		}

		const successMessage = `${extensionName === "Devant" ? "Integration" : "Component"} '${createdComponent.metadata.name}' was successfully created.`;

		const isWithinWorkspace = workspace.workspaceFolders?.some((item) => isSubpath(item.uri?.fsPath, createParams.componentDir));

		if (ext.isDevantCloudEditor) {
			await ext.context.globalState.update("code-server-component-id", createdComponent.metadata?.id);
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
		} else if (isWithinWorkspace) {
			window.showInformationMessage(successMessage, `Open in ${extensionName}`).then(async (resp) => {
				if (resp === `Open in ${extensionName}`) {
					commands.executeCommand(
						"vscode.open",
						`${extensionName === "Devant" ? ext.config?.devantConsoleUrl : ext.config?.choreoConsoleUrl}/organizations/${org.handle}/projects/${extensionName === "Devant" ? project.id : project.handler}/components/${createdComponent.metadata.handler}/overview`,
					);
				}
			});
		} else {
			window.showInformationMessage(`${successMessage} Reload workspace to continue`, { modal: true }, "Continue").then(async (resp) => {
				if (resp === "Continue") {
					commands.executeCommand("vscode.openFolder", Uri.file(createParams.componentDir), { forceNewWindow: false });
				}
			});
		}

		contextStore.getState().refreshState();
	}

	return createdComponent;
};

/**
 * Handler for batch component creation - optimized for creating multiple components at once.
 */
export const submitBatchCreateComponentsHandler = async ({
	org,
	project,
	components,
}: SubmitBatchComponentCreateReq): Promise<SubmitBatchComponentCreateResp> => {
	const extensionName = webviewStateStore.getState().state?.extensionName;
	const terminology = getTerminology(extensionName);
	const totalCount = components.length;
	const componentTerm = terminology.isDevant ? "integration" : "component";
	const componentTermPlural = `${componentTerm}s`;

	const result: SubmitBatchComponentCreateResp = {
		created: [],
		failed: [],
		total: totalCount,
	};

	// Show a single progress notification for the entire batch
	await window.withProgress(
		{
			title: totalCount === 1
				? `Creating ${componentTerm} '${components[0].createParams.displayName || components[0].createParams.name}'... `
				: `Creating ${totalCount} ${componentTermPlural}... `,
			location: ProgressLocation.Notification,
			cancellable: false,
		},
		async (progress) => {
			for (let i = 0; i < components.length; i++) {
				const componentReq = components[i];
				const componentName = componentReq.createParams.displayName || componentReq.createParams.name;

				if (totalCount > 1) {
					// Update progress
					progress.report({
						message: `(${i + 1}/${totalCount}) ${componentName}`,
						increment: (100 / totalCount),
					});
				}

				try {
					const createdComponent = await ext.clients.rpcClient.createComponent(componentReq.createParams);

					if (createdComponent) {
						result.created.push(createdComponent);

						// Update component cache
						const compCache = dataCacheStore.getState().getComponents(org.handle, project.handler);
						dataCacheStore.getState().setComponents(org.handle, project.handler, [createdComponent, ...compCache]);
					} else {
						result.failed.push({ name: componentName, error: "Creation returned null" });
					}
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					result.failed.push({ name: componentName, error: errorMessage });
					getLogger().error(`Failed to create ${terminology.componentTerm} ${componentName}:`, error);
				}
			}
		},
	);

	// Update context file once for the batch (using the first successfully created component's directory)
	if (result.created.length > 0) {
		try {
			const firstCreated = result.created[0];
			const firstComponentDir = components.find(
				(c) => c.createParams.name === firstCreated.metadata.name,
			)?.createParams?.componentDir;

			if (firstComponentDir) {
				const newGit = await initGit(ext.context);
				const gitRoot = await newGit?.getRepositoryRoot(firstComponentDir);
				const dotGit = await newGit?.getRepositoryDotGit(firstComponentDir);
				const projectCache = dataCacheStore.getState().getProjects(org.handle);

				if (newGit && gitRoot && dotGit && !ext.isDevantCloudEditor) {
					const userInfo = ext.authProvider?.getState().state.userInfo;
					if (userInfo) {
						updateContextFile(gitRoot, userInfo, project, org, projectCache);
					}
				}
			}
		} catch (err) {
			getLogger().error("Failed to update context file after batch creation:", err);
		}

		contextStore.getState().refreshState();
	}

	// Show summary message
	const successCount = result.created.length;
	const failCount = result.failed.length;

	if (failCount === 0) {
		// All succeeded
		window.showInformationMessage(
			`Successfully created ${successCount} ${successCount === 1 ? terminology.componentTerm : componentTermPlural}.`,
			`Open in ${extensionName}`,
		).then((resp) => {
			if (resp === `Open in ${extensionName}`) {
				const consoleUrl = extensionName === "Devant" ? ext.config?.devantConsoleUrl : ext.config?.choreoConsoleUrl;
				const projectPath = extensionName === "Devant" ? project.id : project.handler;
				commands.executeCommand(
					"vscode.open",
					`${consoleUrl}/organizations/${org.handle}/projects/${projectPath}/components`,
				);
			}
		});
	} else if (successCount === 0) {
		// All failed
		window.showErrorMessage(
			`Failed to create all ${totalCount} ${componentTermPlural}. Check the output for details.`,
		);
	} else {
		// Partial success
		window.showWarningMessage(
			`Created ${successCount} of ${totalCount} ${componentTermPlural}. ${failCount} failed.`,
			"View Details",
		).then((resp) => {
			if (resp === "View Details") {
				const failedNames = result.failed.map((f) => `• ${f.name}: ${f.error}`).join("\n");
				window.showErrorMessage(`Failed ${componentTermPlural}:\n${failedNames}`, { modal: true });
			}
		});
	}

	return result;
};
