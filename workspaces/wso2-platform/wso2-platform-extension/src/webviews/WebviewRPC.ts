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

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import {
	AuthStoreChangedNotification,
	ClearWebviewCache,
	CloseComponentViewDrawer,
	CloseWebViewNotification,
	type CommitHistory,
	type ComponentYamlContent,
	ContextStoreChangedNotification,
	CreateLocalConnectionsConfig,
	type CreateLocalConnectionsConfigReq,
	CreateLocalEndpointsConfig,
	type CreateLocalEndpointsConfigReq,
	CreateLocalProxyConfig,
	type CreateLocalProxyConfigReq,
	DeleteFile,
	DeleteLocalConnectionsConfig,
	type DeleteLocalConnectionsConfigReq,
	EndpointType,
	ExecuteCommandRequest,
	FileExists,
	GetAuthState,
	GetConfigFileDrifts,
	type GetConfigFileDriftsReq,
	GetContextState,
	GetDirectoryFileNames,
	GetLocalGitData,
	GetSubPath,
	GetWebviewStoreState,
	GoToSource,
	HasDirtyLocalGitRepo,
	JoinFsFilePaths,
	JoinUriFilePaths,
	OpenComponentViewDrawer,
	type OpenComponentViewDrawerReq,
	type OpenDialogOptions,
	OpenExternal,
	OpenExternalChoreo,
	OpenSubDialogRequest,
	type ProxyConfig,
	ReadFile,
	ReadLocalEndpointsConfig,
	ReadLocalProxyConfig,
	RefreshContextState,
	RestoreWebviewCache,
	SaveFile,
	SelectCommitToBuild,
	type SelectCommitToBuildReq,
	SendTelemetryEventNotification,
	type SendTelemetryEventParams,
	SendTelemetryExceptionNotification,
	type SendTelemetryExceptionParams,
	SetWebviewCache,
	type ShowConfirmBoxReq,
	ShowConfirmMessage,
	ShowErrorMessage,
	ShowInfoMessage,
	ShowInputBox,
	ShowQuickPick,
	ShowTextInOutputChannel,
	SubmitComponentCreate,
	TriggerGithubAuthFlow,
	TriggerGithubInstallFlow,
	ViewRuntimeLogs,
	WebviewNotificationsMethodList,
	type WebviewQuickPickItem,
	WebviewStateChangedNotification,
	deepEqual,
	getShortenedHash,
	makeURLSafe,
} from "@wso2/wso2-platform-core";
import * as yaml from "js-yaml";
import { ProgressLocation, QuickPickItemKind, Uri, type WebviewPanel, type WebviewView, commands, env, window } from "vscode";
import * as vscode from "vscode";
import { Messenger } from "vscode-messenger";
import { BROADCAST } from "vscode-messenger-common";
import { registerChoreoRpcResolver } from "../choreo-rpc";
import { getChoreoEnv, getChoreoExecPath } from "../choreo-rpc/cli-install";
import { quickPickWithLoader } from "../cmds/cmd-utils";
import { submitCreateComponentHandler } from "../cmds/create-component-cmd";
import { choreoEnvConfig } from "../config";
import { ext } from "../extensionVariables";
import { getGitHead, getGitRemotes, getGitRoot, hasDirtyRepo, removeCredentialsFromGitURL } from "../git/util";
import { getLogger } from "../logger/logger";
import { authStore } from "../stores/auth-store";
import { contextStore } from "../stores/context-store";
import { dataCacheStore } from "../stores/data-cache-store";
import { webviewStateStore } from "../stores/webview-state-store";
import { sendTelemetryEvent, sendTelemetryException } from "../telemetry/utils";
import { getConfigFileDrifts, getNormalizedPath, getSubPath, goTosource, readLocalEndpointsConfig, readLocalProxyConfig, saveFile } from "../utils";

// Register handlers
function registerWebviewRPCHandlers(messenger: Messenger, view: WebviewPanel | WebviewView) {
	authStore.subscribe((store) => messenger.sendNotification(AuthStoreChangedNotification, BROADCAST, store.state));
	webviewStateStore.subscribe((store) => messenger.sendNotification(WebviewStateChangedNotification, BROADCAST, store.state));
	contextStore.subscribe((store) => messenger.sendNotification(ContextStoreChangedNotification, BROADCAST, store.state));

	messenger.onRequest(GetAuthState, () => authStore.getState().state);
	messenger.onRequest(GetWebviewStoreState, async () => webviewStateStore.getState().state);
	messenger.onRequest(GetContextState, async () => contextStore.getState().state);

	messenger.onRequest(OpenSubDialogRequest, async (options: OpenDialogOptions) => {
		try {
			const result = await window.showOpenDialog({ ...options, defaultUri: Uri.parse(options.defaultUri) });
			return result?.map((file) => file.path);
		} catch (error: any) {
			getLogger().error(error.message);
			return [];
		}
	});
	messenger.onRequest(GetLocalGitData, async (dirPath: string) => {
		try {
			const gitRoot = await getGitRoot(ext.context, dirPath);
			const remotes = await getGitRemotes(ext.context, dirPath);
			const head = await getGitHead(ext.context, dirPath);
			let headRemoteUrl = "";
			const remotesSet = new Set<string>();
			remotes.forEach((remote) => {
				if (remote.fetchUrl) {
					const sanitized = removeCredentialsFromGitURL(remote.fetchUrl);
					remotesSet.add(sanitized);
					if (head?.upstream?.remote === remote.name) {
						headRemoteUrl = sanitized;
					}
				}
			});

			return {
				remotes: Array.from(remotesSet),
				upstream: { name: head?.name, remote: head?.upstream?.remote, remoteUrl: headRemoteUrl },
				gitRoot: gitRoot,
			};
		} catch (error: any) {
			getLogger().error(error.message);
			return undefined;
		}
	});
	messenger.onRequest(JoinFsFilePaths, (files: string[]) => join(...files));
	messenger.onRequest(JoinUriFilePaths, ([base, ...rest]: string[]) => Uri.joinPath(Uri.parse(base), ...rest).path);
	messenger.onRequest(GetSubPath, (params: { subPath: string; parentPath: string }) => getSubPath(params.subPath, params.parentPath));
	messenger.onRequest(ExecuteCommandRequest, async (args: string[]) => {
		if (args.length >= 1) {
			const cmdArgs = args.length > 1 ? args.slice(1) : [];
			const result = await commands.executeCommand(args[0], ...cmdArgs);
			return result;
		}
	});
	messenger.onRequest(OpenExternal, (url: string) => {
		vscode.env.openExternal(vscode.Uri.parse(url));
	});
	messenger.onRequest(OpenExternalChoreo, (choreoPath: string) => {
		if (webviewStateStore.getState().state.extensionName === "Devant") {
			vscode.env.openExternal(vscode.Uri.joinPath(vscode.Uri.parse(choreoEnvConfig.getDevantUrl()), choreoPath));
		} else {
			vscode.env.openExternal(vscode.Uri.joinPath(vscode.Uri.parse(choreoEnvConfig.getConsoleUrl()), choreoPath));
		}
	});
	messenger.onRequest(SetWebviewCache, async (params: { cacheKey: string; data: any }) => {
		await ext.context.workspaceState.update(params.cacheKey, params.data);
	});
	messenger.onRequest(RestoreWebviewCache, async (cacheKey:string) => {
		return ext.context.workspaceState.get(cacheKey);
	});
	messenger.onRequest(ClearWebviewCache, async (cacheKey: string) => {
		await ext.context.workspaceState.update(cacheKey, undefined);
	});
	messenger.onRequest(GoToSource, async (filePath): Promise<void> => {
		await goTosource(filePath as string, false);
	});
	messenger.onRequest(SaveFile, async (params: {
		fileName: string;
		fileContent: string;
		baseDirectoryFs: string;
		successMessage?: string;
		isOpenApiFile?: boolean;
		shouldPromptDirSelect?: boolean;
		dialogTitle?: string;
		shouldOpen?: boolean;
	}): Promise<string> => {
		return saveFile(
			params.fileName,
			params.fileContent,
			params.baseDirectoryFs,
			params.successMessage,
			params.isOpenApiFile,
			params.shouldPromptDirSelect,
			params.dialogTitle,
			params.shouldOpen,
		);
	});
	messenger.onRequest(DeleteFile, async (filePath) => {
		unlinkSync(filePath as string);
	});
	messenger.onRequest(ShowConfirmMessage, async (params: ShowConfirmBoxReq) => {
		const response = await window.showInformationMessage(params.message, { modal: true }, params.buttonText);
		return response === params.buttonText;
	});
	messenger.onRequest(ReadLocalEndpointsConfig, async (componentPath: string) => readLocalEndpointsConfig(componentPath));
	messenger.onRequest(ReadLocalProxyConfig, async (componentPath: string) => readLocalProxyConfig(componentPath));
	messenger.onRequest(ShowQuickPick, async (params: { items: any[]; title?: string }) => {
		const itemSelection = await window.showQuickPick(params.items as vscode.QuickPickItem[], {
			title: params.title,
		});
		return itemSelection as WebviewQuickPickItem;
	});
	messenger.onRequest(
		ShowInputBox,
		async (params: { regex?: { expression: RegExp; message: string }; [x: string]: any }) => {
			const { regex, ...rest } = params;
			return window.showInputBox({
				...rest,
				validateInput: (val) => {
					if (regex && !new RegExp(regex.expression).test(val)) {
						return regex.message;
					}
					return null;
				},
			});
		}
	);
	const outputChanelMap: Map<string, vscode.OutputChannel> = new Map();
	messenger.onRequest(ShowTextInOutputChannel, async (params: { key: string; output: string }) => {
		if (!outputChanelMap.has(params.key)) {
			outputChanelMap.set(params.key, window.createOutputChannel(params.key));
		}
		outputChanelMap.get(params.key)?.replace(params.output);
		outputChanelMap.get(params.key)?.show();
	});
	messenger.onRequest(
		ViewRuntimeLogs,
		async (params: { orgName: string; projectName: string; componentName: string; deploymentTrackName: string; envName: string; type: string }) => {
			const { orgName, projectName, componentName, deploymentTrackName, envName, type } = params;
			// todo: export the env from here
			if (getChoreoEnv() !== "prod") {
				window.showErrorMessage(
					"Choreo extension currently displays runtime logs is only if 'WSO2.Platform.Advanced.ChoreoEnvironment' is set to 'prod'",
				);
				return;
			}
			const args = ["logs", type, "-o", orgName, "-p", projectName, "-c", componentName, "-d", deploymentTrackName, "-e", envName, "-f"];
			window.createTerminal(`${componentName}:${type.replace("component-", "")}-logs`, getChoreoExecPath(), args).show();
		}
	);
	const _getGithubUrlState = async (orgId: string): Promise<string> => {
		const callbackUrl = await env.asExternalUri(Uri.parse(`${env.uriScheme}://wso2.wso2-platform/ghapp`));
		const state = {
			origin: "vscode.choreo.ext",
			orgId,
			callbackUri: callbackUrl.toString(),
			extensionName: webviewStateStore.getState().state.extensionName,
		};
		return Buffer.from(JSON.stringify(state), "binary").toString("base64");
	};
	messenger.onRequest(TriggerGithubAuthFlow, async (orgId: string) => {
		const { authUrl, clientId, redirectUrl, devantRedirectUrl } = choreoEnvConfig.getGHAppConfig();
		const extName = webviewStateStore.getState().state.extensionName;
		const state = await _getGithubUrlState(orgId);
		const ghURL = Uri.parse(`${authUrl}?redirect_uri=${extName === "Devant" ? devantRedirectUrl : redirectUrl}&client_id=${clientId}&state=${state}`);
		await env.openExternal(ghURL);
	});
	messenger.onRequest(TriggerGithubInstallFlow, async (orgId: string) => {
		const { installUrl } = choreoEnvConfig.getGHAppConfig();
		const state = await _getGithubUrlState(orgId);
		const ghURL = Uri.parse(`${installUrl}?state=${state}`);
		await env.openExternal(ghURL);
	});
	messenger.onRequest(SubmitComponentCreate, submitCreateComponentHandler);
	messenger.onRequest(GetDirectoryFileNames, (dirPath: string) => {
		return readdirSync(dirPath)?.filter((fileName) => statSync(join(dirPath, fileName)).isFile());
	});
	messenger.onRequest(CreateLocalEndpointsConfig, (params: CreateLocalEndpointsConfigReq) => {
		if (existsSync(join(params.componentDir, ".choreo", "endpoints.yaml"))) {
			rmSync(join(params.componentDir, ".choreo", "endpoints.yaml"));
		}
		if (existsSync(join(params.componentDir, ".choreo", "component-config.yaml"))) {
			rmSync(join(params.componentDir, ".choreo", "component-config.yaml"));
		}

		const componentYamlPath = join(params.componentDir, ".choreo", "component.yaml");
		if (existsSync(componentYamlPath)) {
			const componentYamlFileContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
			componentYamlFileContent.endpoints =
				params.endpoints?.map((item, index) => ({
					name: item.name ? makeURLSafe(item.name) : `endpoint-${index}`,
					service: {
						port: item.port,
						basePath: [EndpointType.REST, EndpointType.GraphQL].includes(item.type as EndpointType) ? item.context || undefined : undefined,
					},
					type: item.type || "REST",
					displayName: item.name,
					networkVisibilities: item.networkVisibilities && item.networkVisibilities?.length > 0 ? item.networkVisibilities : undefined,
					schemaFilePath: item.schemaFilePath,
				})) ?? [];
			const originalContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
			if (!deepEqual(originalContent, componentYamlFileContent)) {
				writeFileSync(componentYamlPath, yaml.dump(componentYamlFileContent));
			}
		} else {
			if (!existsSync(join(params.componentDir, ".choreo"))) {
				mkdirSync(join(params.componentDir, ".choreo"));
			}
			const endpointFileContent: ComponentYamlContent = {
				schemaVersion: "1.2",
				endpoints:
					params.endpoints?.map((item, index) => ({
						name: item.name ? makeURLSafe(item.name) : `endpoint-${index}`,
						service: {
							port: item.port,
							basePath: [EndpointType.REST, EndpointType.GraphQL].includes(item.type as EndpointType) ? item.context || undefined : undefined,
						},
						type: item.type || "REST",
						displayName: item.name,
						networkVisibilities: item.networkVisibilities && item.networkVisibilities?.length > 0 ? item.networkVisibilities : undefined,
						schemaFilePath: item.schemaFilePath,
					})) ?? [],
			};
			writeFileSync(componentYamlPath, yaml.dump(endpointFileContent));
		}
	});
	messenger.onRequest(CreateLocalProxyConfig, (params: CreateLocalProxyConfigReq) => {
		if (existsSync(join(params.componentDir, ".choreo", "endpoints.yaml"))) {
			rmSync(join(params.componentDir, ".choreo", "endpoints.yaml"));
		}
		if (existsSync(join(params.componentDir, ".choreo", "component-config.yaml"))) {
			rmSync(join(params.componentDir, ".choreo", "component-config.yaml"));
		}

		const proxyConfig: ProxyConfig = {
			...params.proxy,
			docPath: params.proxy?.docPath || undefined,
			thumbnailPath: params.proxy?.thumbnailPath || undefined,
		};

		const componentYamlPath = join(params.componentDir, ".choreo", "component.yaml");
		if (existsSync(componentYamlPath)) {
			const componentYamlFileContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
			componentYamlFileContent.proxy = proxyConfig;
			const originalContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
			if (!deepEqual(originalContent, componentYamlFileContent)) {
				writeFileSync(componentYamlPath, yaml.dump(componentYamlFileContent));
			}
		} else {
			if (!existsSync(join(params.componentDir, ".choreo"))) {
				mkdirSync(join(params.componentDir, ".choreo"));
			}
			const endpointFileContent: ComponentYamlContent = { schemaVersion: "1.2", proxy: proxyConfig };
			writeFileSync(componentYamlPath, yaml.dump(endpointFileContent));
		}
	});
	messenger.onRequest(CreateLocalConnectionsConfig, async (params: CreateLocalConnectionsConfigReq) => {
		if (existsSync(join(params.componentDir, ".choreo", "endpoints.yaml"))) {
			rmSync(join(params.componentDir, ".choreo", "endpoints.yaml"));
		}
		if (existsSync(join(params.componentDir, ".choreo", "component-config.yaml"))) {
			rmSync(join(params.componentDir, ".choreo", "component-config.yaml"));
		}

		const org = authStore?.getState().state?.userInfo?.organizations?.find((item) => item.uuid === params.marketplaceItem?.organizationId);
		if (!org) {
			return;
		}

		let project = dataCacheStore
			.getState()
			.getProjects(org.handle)
			?.find((item) => item.id === params.marketplaceItem?.projectId);
		if (!project) {
			const projects = await window.withProgress(
				{ title: `Fetching projects of organization ${org.name}...`, location: ProgressLocation.Notification },
				() => ext.clients.rpcClient.getProjects(org.id.toString()),
			);
			project = projects?.find((item) => item.id === params.marketplaceItem?.projectId);
			if (!project) {
				return;
			}
		}

		let component = dataCacheStore
			.getState()
			.getComponents(org.handle, project.handler)
			?.find((item) => item.metadata?.id === params.marketplaceItem?.component?.componentId);
		if (!component) {
			const extName = webviewStateStore.getState().state?.extensionName;
			const components = await window.withProgress(
				{
					title: `Fetching ${extName === "Devant" ? "integrations" : "components"} of project ${project.name}...`,
					location: ProgressLocation.Notification,
				},
				() =>
					ext.clients.rpcClient.getComponentList({
						orgHandle: org.handle,
						orgId: org.id.toString(),
						projectHandle: project?.handler!,
						projectId: project?.id!,
					}),
			);
			component = components?.find((item) => item.metadata?.id === params.marketplaceItem?.component?.componentId);
			if (!component) {
				return;
			}
		}

		const componentYamlPath = join(params.componentDir, ".choreo", "component.yaml");
		const resourceRef = `service:/${project.handler}/${component.metadata?.handler}/v1/${params?.marketplaceItem?.component?.endpointId}/${params.visibility}`;
		if (existsSync(componentYamlPath)) {
			const componentYamlFileContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
			const schemaVersion = Number(componentYamlFileContent.schemaVersion);
			if (schemaVersion < 1.2) {
				componentYamlFileContent.schemaVersion = "1.2";
			}
			componentYamlFileContent.dependencies = {
				...componentYamlFileContent.dependencies,
				connectionReferences: [...(componentYamlFileContent.dependencies?.connectionReferences ?? []), { name: params?.name, resourceRef }],
			};
			const originalContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
			if (!deepEqual(originalContent, componentYamlFileContent)) {
				writeFileSync(componentYamlPath, yaml.dump(componentYamlFileContent));
			}
		} else {
			if (!existsSync(join(params.componentDir, ".choreo"))) {
				mkdirSync(join(params.componentDir, ".choreo"));
			}
			const endpointFileContent: ComponentYamlContent = {
				schemaVersion: "1.2",
				dependencies: { connectionReferences: [{ name: params?.name, resourceRef }] },
			};
			writeFileSync(componentYamlPath, yaml.dump(endpointFileContent));
		}

		window
			.showInformationMessage(
				`Connection ${params.name} created and component.yaml updated. Follow the developer guide to finish integration. Once done, commit and push your changes.`,
				"View Configurations",
			)
			.then((res) => {
				if (res === "View Configurations") {
					goTosource(componentYamlPath);
				}
			});
	});
	messenger.onRequest(DeleteLocalConnectionsConfig, async (params: DeleteLocalConnectionsConfigReq) => {
		const componentYamlPath = join(params.componentDir, ".choreo", "component.yaml");
		if (existsSync(componentYamlPath)) {
			const componentYamlFileContent: ComponentYamlContent = yaml.load(readFileSync(componentYamlPath, "utf8")) as any;
			if (componentYamlFileContent.dependencies?.connectionReferences) {
				componentYamlFileContent.dependencies.connectionReferences = componentYamlFileContent.dependencies.connectionReferences.filter(
					(item) => item.name !== params.connectionName,
				);
			}
			if (componentYamlFileContent.dependencies?.serviceReferences) {
				componentYamlFileContent.dependencies.serviceReferences = componentYamlFileContent.dependencies.serviceReferences.filter(
					(item) => item.name !== params.connectionName,
				);
			}
			writeFileSync(componentYamlPath, yaml.dump(componentYamlFileContent));
		}
	});
	messenger.onRequest(FileExists, (filePath: string) => existsSync(getNormalizedPath(filePath)));
	messenger.onRequest(ReadFile, (filePath: string) => {
		try {
			return readFileSync(filePath).toString();
		} catch (err) {
			return null;
		}
	});
	messenger.onRequest(SelectCommitToBuild, async (params: SelectCommitToBuildReq) => {
		const getQuickPickItems = (commits: CommitHistory[]) => {
			if (commits?.length > 0) {
				const latestCommit = commits?.find((item) => item.isLatest) ?? commits[0];
				return [
					{ kind: QuickPickItemKind.Separator, label: "Latest Commit" },
					{ label: "Build Latest", detail: latestCommit.message, description: getShortenedHash(latestCommit.sha), item: latestCommit },
					{ kind: QuickPickItemKind.Separator, label: "Previous Commits" },
					...commits.filter((item) => !item.isLatest).map((item) => ({ label: item.message, description: getShortenedHash(item.sha), item })),
				];
			}
			return [];
		};

		const selectedComponent = await quickPickWithLoader({
			cacheQuickPicks: getQuickPickItems(
				dataCacheStore
					.getState()
					.getCommits(params.org.handle, params.project.handler, params.component.metadata.name, params.deploymentTrack.branch),
			),
			loadQuickPicks: async () => {
				const commits = await ext.clients.rpcClient.getCommits({
					branch: params.deploymentTrack.branch,
					componentId: params.component.metadata.id,
					orgHandler: params.org.handle,
					orgId: params.org.id.toString(),
				});
				dataCacheStore
					.getState()
					.setCommits(params.org.handle, params.project.handler, params.component.metadata.name, params.deploymentTrack.branch, commits);
				return getQuickPickItems(commits);
			},
			loadingTitle: `Loading commits from branch ${params.deploymentTrack.branch}...`,
			selectTitle: `Select Commit from branch ${params.deploymentTrack.branch}, to Build`,
			placeholder: "Select Commit",
		});
		return selectedComponent;
	});
	messenger.onNotification(RefreshContextState, () => {
		contextStore.getState().refreshState();
	});
	messenger.onNotification(ShowErrorMessage, (error: string) => {
		window.showErrorMessage(error);
	});
	messenger.onNotification(ShowInfoMessage, (info: string) => {
		window.showInformationMessage(info);
	});
	messenger.onNotification(SendTelemetryEventNotification, (event: SendTelemetryEventParams) => {
		sendTelemetryEvent(event.eventName, event.properties, event.measurements);
	});
	messenger.onNotification(SendTelemetryExceptionNotification, (event: SendTelemetryExceptionParams) => {
		sendTelemetryException(event.error, event.properties, event.measurements);
	});
	messenger.onNotification(CloseWebViewNotification, () => {
		if ("dispose" in view) {
			view.dispose();
		}
	});
	messenger.onRequest(OpenComponentViewDrawer, (params: OpenComponentViewDrawerReq) => {
		webviewStateStore.getState().onOpenComponentDrawer(params.componentKey, params.drawer, params.params);
	});
	messenger.onRequest(CloseComponentViewDrawer, (componentKey: string) => {
		webviewStateStore.getState().onCloseComponentDrawer(componentKey);
	});
	messenger.onRequest(HasDirtyLocalGitRepo, async (componentPath: string) => {
		return hasDirtyRepo(componentPath, ext.context, ["context.yaml"]);
	});
	messenger.onRequest(GetConfigFileDrifts, async (params: GetConfigFileDriftsReq) => {
		return getConfigFileDrifts(params.type, params.repoUrl, params.branch, params.repoDir, ext.context);
	});

	// Register Choreo CLL RPC handler
	registerChoreoRpcResolver(messenger, ext.clients.rpcClient);
}

export class WebViewPanelRpc {
	private _messenger = new Messenger();
	private _panel: WebviewPanel | undefined;

	constructor(view: WebviewPanel) {
		this.registerPanel(view);
		registerWebviewRPCHandlers(this._messenger, view);
	}

	public get panel(): WebviewPanel | undefined {
		return this._panel;
	}

	public registerPanel(view: WebviewPanel) {
		if (!this._panel) {
			this._messenger.registerWebviewPanel(view, {
				broadcastMethods: [...WebviewNotificationsMethodList],
			});
			this._panel = view;
		} else {
			throw new Error("Panel already registered");
		}
	}

	public dispose() {
		if (this._panel) {
			this._panel.dispose();
			this._panel = undefined;
		}
	}
}

export class WebViewViewRPC {
	private _messenger = new Messenger();
	private _view: WebviewView | undefined;

	constructor(view: WebviewView) {
		this.registerView(view);
		try {
			registerWebviewRPCHandlers(this._messenger, view);
		} catch (err) {
			console.log("registerWebviewRPCHandlers error:", err);
		}
	}

	public get view(): WebviewView | undefined {
		return this._view;
	}

	public registerView(view: WebviewView) {
		if (!this._view) {
			this._messenger.registerWebviewView(view, {
				broadcastMethods: [...WebviewNotificationsMethodList],
			});
			this._view = view;
		} else {
			throw new Error("View already registered");
		}
	}
}
