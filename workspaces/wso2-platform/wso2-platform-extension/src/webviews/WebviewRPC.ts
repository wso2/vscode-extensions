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

import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	renameSync,
	rmSync,
	rmdirSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from "fs";
import * as fs from "fs";
import * as os from "os";
import { join } from "path";
import * as toml from "@iarna/toml";
import {
	AuthStoreChangedNotification,
	ClearWebviewCache,
	CloneRepositoryIntoCompDir,
	type CloneRepositoryIntoCompDirReq,
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
	GitProvider,
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
	SubmitBatchComponentCreate,
	SubmitComponentCreate,
	TriggerGithubAuthFlow,
	TriggerGithubInstallFlow,
	ViewRuntimeLogs,
	WebviewNotificationsMethodList,
	type WebviewQuickPickItem,
	WebviewStateChangedNotification,
	buildGitURL,
	deepEqual,
	getShortenedHash,
	makeURLSafe,
	parseGitURL,
} from "@wso2/wso2-platform-core";
import * as yaml from "js-yaml";
import { ProgressLocation, QuickPickItemKind, Uri, type WebviewPanel, type WebviewView, commands, env, window, workspace } from "vscode";
import * as vscode from "vscode";
import { Messenger } from "vscode-messenger";
import { BROADCAST } from "vscode-messenger-common";
import { registerChoreoRpcResolver } from "../choreo-rpc";
import { getChoreoExecPath } from "../choreo-rpc/cli-install";
import { quickPickWithLoader } from "../cmds/cmd-utils";
import { enrichGitUsernamePassword } from "../cmds/commit-and-push-to-git-cmd";
import { submitBatchCreateComponentsHandler, submitCreateComponentHandler } from "../cmds/create-component-cmd";
import { ext } from "../extensionVariables";
import { initGit } from "../git/main";
import { getGitHead, getGitRemotes, getGitRoot, hasDirtyRepo, removeCredentialsFromGitURL } from "../git/util";
import { getLogger } from "../logger/logger";
import { contextStore } from "../stores/context-store";
import { dataCacheStore } from "../stores/data-cache-store";
import { webviewStateStore } from "../stores/webview-state-store";
import { sendTelemetryEvent, sendTelemetryException } from "../telemetry/utils";
import { createConnectionConfig, deleteLocalConnectionConfig, getConfigFileDrifts, getNormalizedPath, getSubPath, goTosource, readLocalEndpointsConfig, readLocalProxyConfig, saveFile } from "../utils";

// Register handlers
function registerWebviewRPCHandlers(messenger: Messenger, view: WebviewPanel | WebviewView) {
	ext.authProvider?.subscribe((store) => messenger.sendNotification(AuthStoreChangedNotification, BROADCAST, store.state));
	webviewStateStore.subscribe((store) => messenger.sendNotification(WebviewStateChangedNotification, BROADCAST, store.state));
	contextStore.subscribe((store) => messenger.sendNotification(ContextStoreChangedNotification, BROADCAST, store.state));

	messenger.onRequest(GetAuthState, () => ext.authProvider?.getState().state);
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
		vscode.env.openExternal(
			vscode.Uri.joinPath(
				vscode.Uri.parse(
					(webviewStateStore.getState().state.extensionName === "Devant" ? ext.config?.devantConsoleUrl : ext.config?.choreoConsoleUrl) || "",
				),
				choreoPath,
			),
		);
	});
	messenger.onRequest(SetWebviewCache, async (params: { cacheKey: string; data: any }) => {
		await ext.context.workspaceState.update(params.cacheKey, params.data);
	});
	messenger.onRequest(RestoreWebviewCache, async (cacheKey: string) => {
		return ext.context.workspaceState.get(cacheKey);
	});
	messenger.onRequest(ClearWebviewCache, async (cacheKey: string) => {
		await ext.context.workspaceState.update(cacheKey, undefined);
	});
	messenger.onRequest(GoToSource, async (filePath): Promise<void> => {
		await goTosource(filePath as string, false);
	});
	messenger.onRequest(
		SaveFile,
		async (params: {
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
		},
	);
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
	messenger.onRequest(ShowInputBox, async (params: { regex?: { expression: RegExp; message: string }; [x: string]: any }) => {
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
	});
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
			if (ext.choreoEnv !== "prod") {
				window.showErrorMessage(
					"Choreo extension currently displays runtime logs is only if 'WSO2.Platform.Advanced.ChoreoEnvironment' is set to 'prod'",
				);
				return;
			}
			const args = ["logs", type, "-o", orgName, "-p", projectName, "-c", componentName, "-d", deploymentTrackName, "-e", envName, "-f"];
			window.createTerminal(`${componentName}:${type.replace("component-", "")}-logs`, getChoreoExecPath(), args).show();
		},
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
		const extName = webviewStateStore.getState().state.extensionName;
		const baseUrl = extName === "Devant" ? ext.config?.devantConsoleUrl : ext.config?.choreoConsoleUrl;
		const redirectUrl = `${baseUrl}/ghapp`;
		const state = await _getGithubUrlState(orgId);
		const ghURL = Uri.parse(`${ext.config?.ghApp.authUrl}?redirect_uri=${redirectUrl}&client_id=${ext.config?.ghApp.clientId}&state=${state}`);
		await env.openExternal(ghURL);
	});
	messenger.onRequest(TriggerGithubInstallFlow, async (orgId: string) => {
		const state = await _getGithubUrlState(orgId);
		const ghURL = Uri.parse(`${ext.config?.ghApp.installUrl}?state=${state}`);
		await env.openExternal(ghURL);
	});
	messenger.onRequest(SubmitComponentCreate, submitCreateComponentHandler);
	messenger.onRequest(SubmitBatchComponentCreate, submitBatchCreateComponentsHandler);
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
		const componentYamlPath = await createConnectionConfig(params);
		if(componentYamlPath){
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
		}
	});
	messenger.onRequest(DeleteLocalConnectionsConfig, async (params: DeleteLocalConnectionsConfigReq) => {
		deleteLocalConnectionConfig(params)
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
	messenger.onRequest(CloneRepositoryIntoCompDir, async (params: CloneRepositoryIntoCompDirReq) => {
		const extName = webviewStateStore.getState().state.extensionName;
		const newGit = await initGit(ext.context);
		if (!newGit) {
			throw new Error("failed to retrieve Git details");
		}
		const _repoUrl = buildGitURL(params.repo.orgHandler, params.repo.repo, params.repo.provider, true, params.repo.serverUrl);
		if (!_repoUrl || !_repoUrl.startsWith("https://")) {
			throw new Error("failed to parse git details");
		}
		const urlObj = new URL(_repoUrl);

		const parsed = parseGitURL(_repoUrl);
		if (parsed) {
			const [repoOrg, repoName, provider] = parsed;
			await enrichGitUsernamePassword(params.org, repoOrg, repoName, provider, urlObj, _repoUrl, params.repo.secretRef || "");
		}

		const repoUrl = urlObj.href;

		// if ballerina toml exists, need to update the org and name
		const balTomlPath = join(params.cwd, "Ballerina.toml");
		if (existsSync(balTomlPath)) {
			const fileContent = await fs.promises.readFile(balTomlPath, "utf-8");
			const parsedToml: any = toml.parse(fileContent);
			if (parsedToml?.package) {
				parsedToml.package.org = params.org.handle;
				parsedToml.package.name = params.componentName?.replaceAll("-", "_");
			}
			const updatedTomlContent = toml.stringify(parsedToml);
			await fs.promises.writeFile(balTomlPath, updatedTomlContent, "utf-8");
		}

		// TODO: Enable this after fixing component creation from root
		/*
		if (params.repo?.isBareRepo && ["", "/", "."].includes(params.subpath)) {
			// if component is to be created in the root of a bare repo,
			// then we can initialize the current directory as the repo root
			await window.withProgress({ title: `Initializing currently opened directory as repository...`, location: ProgressLocation.Notification }, async () => {
				await newGit.init(params.cwd);
				const dotGit = await newGit?.getRepositoryDotGit(params.cwd);
				const repo = newGit.open(params.cwd, dotGit);
				await repo.addRemote("origin", repoUrl);
				await repo.add(["."]);
				await repo.commit(`Add source for new ${extName} ${extName === "Devant" ? "Integration" : "Component"} (${params.componentName})`);
				const headRef = await repo.getHEADRef()
				await repo.push("origin", headRef?.name);
			});
			return params.cwd;
		}
		*/

		const clonedPath = await window.withProgress(
			{
				title: `Cloning repository ${params.repo?.orgHandler}/${params.repo.repo}`,
				location: ProgressLocation.Notification,
			},
			async (progress, cancellationToken) =>
				newGit.clone(
					repoUrl,
					{
						recursive: true,
						ref: params.repo.branch,
						parentPath: join(params.cwd, ".."),
						progress: {
							report: ({ increment, ...rest }: { increment: number }) => progress.report({ increment: increment, ...rest }),
						},
					},
					cancellationToken,
				),
		);

		// Move everything into cloned dir
		const cwdFiled = readdirSync(params.cwd);
		const newPath = join(clonedPath, params.subpath);
		fs.mkdirSync(newPath, { recursive: true });

		for (const file of cwdFiled) {
			const cwdFilePath = join(params.cwd, file);
			const destFilePath = join(newPath, file);
			fs.cpSync(cwdFilePath, destFilePath, { recursive: true });
		}

		const repoRoot = await newGit?.getRepositoryRoot(newPath);
		const dotGit = await newGit?.getRepositoryDotGit(newPath);
		const repo = newGit.open(repoRoot, dotGit);

		await window.withProgress({ title: "Pushing the changes to your remote repository...", location: ProgressLocation.Notification }, async () => {
			await repo.add(["."]);
			await repo.commit(`Add source for new ${extName} ${extName === "Devant" ? "Integration" : "Component"} (${params.componentName})`);
			const headRef = await repo.getHEADRef();
			await repo.push(headRef?.upstream?.remote || "origin", headRef?.name || params.repo.branch);
		});

		return newPath;
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
