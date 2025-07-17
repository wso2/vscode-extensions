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

import type { NotificationType, RequestType } from "vscode-messenger-common";
import type { ComponentViewDrawers } from "../enums";
import type { CreateComponentReq } from "./cli-rpc.types";
import type {
	CommitHistory,
	ComponentEP,
	ComponentKind,
	DeploymentTrack,
	Environment,
	MarketplaceItem,
	Organization,
	Project,
	WebviewQuickPickItem,
} from "./common.types";
import type { Endpoint, ProxyConfig } from "./config-file.types";
import type { AuthState, ContextStoreState, WebviewState } from "./store.types";

// Request types
export const GetAuthState: RequestType<void, AuthState> = { method: "getAuthState" };
export const GetContextState: RequestType<void, ContextStoreState> = { method: "getContextState" };
export const GetWebviewStoreState: RequestType<void, WebviewState> = { method: "getWebviewStoreState" };
export const OpenSubDialogRequest: RequestType<OpenDialogOptions, string[]> = { method: "openDialog" };
export const GetLocalGitData: RequestType<string, GetLocalGitDataResp | undefined> = { method: "getLocalGitData" };
export const JoinFsFilePaths: RequestType<string[], string> = { method: "joinFsFilePaths" };
export const JoinUriFilePaths: RequestType<string[], string> = { method: "joinUriFilePaths" };
export const GetSubPath: RequestType<{ subPath: string; parentPath: string }, string | null> = { method: "getSubPath" };
export const SetWebviewCache: RequestType<SetWebviewCacheRequestParam, void> = { method: "setWebviewCache" };
export const RestoreWebviewCache: RequestType<IDBValidKey, unknown> = { method: "restoreWebviewCache" };
export const ClearWebviewCache: RequestType<IDBValidKey, void> = { method: "clearWebviewCache" };
export const GoToSource: RequestType<string, void> = { method: "goToSource" };
export const ShowErrorMessage: NotificationType<string> = { method: "showErrorMessage" };
export const ShowInfoMessage: NotificationType<string> = { method: "showInfoMessage" };
export const RefreshContextState: NotificationType<void> = { method: "refreshContextState" };
export const DeleteFile: RequestType<string, void> = { method: "deleteFile" };
export const ShowConfirmMessage: RequestType<ShowConfirmBoxReq, boolean> = { method: "showConfirmMessage" };
export const ShowQuickPick: RequestType<ShowWebviewQuickPickItemsReq, WebviewQuickPickItem | undefined> = { method: "showQuickPicks" };
export const ShowInputBox: RequestType<ShowWebviewInputBoxReq, string | undefined> = { method: "showWebviewInputBoxReq" };
export const ReadLocalEndpointsConfig: RequestType<string, ReadLocalEndpointsConfigResp> = { method: "readLocalEndpointsConfig" };
export const ReadLocalProxyConfig: RequestType<string, ReadLocalProxyConfigResp> = { method: "readLocalProxyConfig" };
export const ShowTextInOutputChannel: RequestType<ShowInOutputChannelReq, void> = { method: "showTextInOutputChannel" };
export const ViewRuntimeLogs: RequestType<ViewRuntimeLogsReq, void> = { method: "viewRuntimeLogs" };
export const TriggerGithubAuthFlow: RequestType<string, void> = { method: "triggerGithubAuthFlow" };
export const TriggerGithubInstallFlow: RequestType<string, void> = { method: "triggerGithubInstallFlow" };
export const GetGithubAuthStatus: RequestType<string, { cancelled?: boolean; error?: string }> = { method: "getGithubAuthStatus" };
export const SubmitComponentCreate: RequestType<SubmitComponentCreateReq, ComponentKind> = { method: "submitComponentCreate" };
export const GetDirectoryFileNames: RequestType<string, string[]> = { method: "getDirectoryFileNames" };
export const FileExists: RequestType<string, boolean> = { method: "fileExists" };
export const ReadFile: RequestType<string, string | null> = { method: "readFile" };
export const ExecuteCommandRequest: RequestType<string[], unknown> = { method: "executeCommand" };
export const OpenExternal: RequestType<string, void> = { method: "openExternal" };
export const OpenExternalChoreo: RequestType<string, void> = { method: "openExternalChoreo" };
export const SelectCommitToBuild: RequestType<SelectCommitToBuildReq, CommitHistory | undefined> = { method: "selectCommitToBuild" };
export const OpenComponentViewDrawer: RequestType<OpenComponentViewDrawerReq, void> = { method: "openComponentViewDrawer" };
export const CloseComponentViewDrawer: RequestType<string, void> = { method: "closeComponentViewDrawer" };
export const HasDirtyLocalGitRepo: RequestType<string, boolean> = { method: "hasDirtyLocalGitRepo" };
export const GetConfigFileDrifts: RequestType<GetConfigFileDriftsReq, string[]> = { method: "getConfigFileDrifts" };
export const SaveFile: RequestType<SaveFileReq, string> = { method: "saveFile" };
export const CreateLocalEndpointsConfig: RequestType<CreateLocalEndpointsConfigReq, void> = { method: "createLocalEndpointsConfig" };
export const CreateLocalProxyConfig: RequestType<CreateLocalProxyConfigReq, void> = { method: "createLocalProxyConfig" };
export const CreateLocalConnectionsConfig: RequestType<CreateLocalConnectionsConfigReq, void> = { method: "createLocalConnectionsConfig" };
export const DeleteLocalConnectionsConfig: RequestType<DeleteLocalConnectionsConfigReq, void> = { method: "deleteLocalConnectionsConfig" };

const NotificationMethods = {
	onAuthStateChanged: "onAuthStateChanged",
	onWebviewStateChanged: "onWebviewStateChanged",
	onContextStateChanged: "onContextStateChanged",
};

export const WebviewNotificationsMethodList = Object.values(NotificationMethods);

// Notification types
export const SendProjectTelemetryEventNotification: NotificationType<SendTelemetryEventParams> = { method: "sendProjectTelemetryEvent" };
export const SendTelemetryEventNotification: NotificationType<SendTelemetryEventParams> = { method: "sendTelemetryEvent" };
export const SendTelemetryExceptionNotification: NotificationType<SendTelemetryExceptionParams> = { method: "sendTelemetryException" };
export const CloseWebViewNotification: NotificationType<void> = { method: "close" };
export const AuthStoreChangedNotification: NotificationType<AuthState> = { method: NotificationMethods.onAuthStateChanged };
export const WebviewStateChangedNotification: NotificationType<WebviewState> = { method: NotificationMethods.onWebviewStateChanged };
export const ContextStoreChangedNotification: NotificationType<ContextStoreState> = { method: NotificationMethods.onContextStateChanged };

export interface OpenTestViewReq {
	component: ComponentKind;
	project: Project;
	org: Organization;
	env: Environment;
	deploymentTrack: DeploymentTrack;
	endpoints: ComponentEP[];
}

export interface SubmitComponentCreateReq {
	org: Organization;
	project: Project;
	createParams: CreateComponentReq;
	autoBuildOnCommit?: boolean;
	type: string;
}

export interface CreateLocalEndpointsConfigReq {
	componentDir: string;
	endpoints?: Endpoint[];
}

export interface CreateLocalConnectionsConfigReq {
	componentDir: string;
	name: string;
	visibility: string;
	marketplaceItem: MarketplaceItem;
}

export interface DeleteLocalConnectionsConfigReq {
	componentDir: string;
	connectionName: string;
}

export interface CreateLocalProxyConfigReq {
	componentDir: string;
	proxy: ProxyConfig;
}

export interface ShowInOutputChannelReq {
	key: string;
	output: string;
}

export interface ViewRuntimeLogsReq {
	type: "application" | "gateway";
	orgName: string;
	projectName: string;
	componentName: string;
	deploymentTrackName: string;
	envName: string;
}

export interface ReadLocalEndpointsConfigResp {
	endpoints: Endpoint[];
	filePath: string;
}

export interface ReadLocalProxyConfigResp {
	proxy?: ProxyConfig;
	filePath: string;
}

export interface OpenDialogOptions {
	title: string;
	canSelectFiles: boolean;
	canSelectFolders: boolean;
	canSelectMany: boolean;
	defaultUri: string;
	filters: { [name: string]: string[] };
}

export interface ShowConfirmBoxReq {
	message: string;
	buttonText: string;
}

export interface ShowWebviewQuickPickItemsReq {
	items: WebviewQuickPickItem[];
	title: string;
}

export interface ShowWebviewInputBoxReq {
	title: string;
	value?: string;
	placeholder?: string;
	regex?: {
		expression: RegExp;
		message: string;
	};
}

export interface SelectCommitToBuildReq {
	org: Organization;
	component: ComponentKind;
	project: Project;
	deploymentTrack: DeploymentTrack;
}

export interface GetConfigFileDriftsReq {
	type: string;
	repoDir: string;
	repoUrl: string;
	branch: string;
}

export interface CreateNewFilReq {
	fileDir: string;
	fileName: string;
	context?: string;
}

export interface SaveFileReq {
	fileName: string;
	fileContent: string;
	baseDirectoryFs: string;
	successMessage?: string;
	shouldPromptDirSelect?: boolean;
	isOpenApiFile?: boolean;
	dialogTitle?: string;
	shouldOpen?: boolean;
}

export interface OpenComponentViewDrawerReq {
	componentKey: string;
	drawer: ComponentViewDrawers;
	// biome-ignore lint/suspicious/noExplicitAny: can be any type of data
	params?: any;
}

export interface SetWebviewCacheRequestParam {
	cacheKey: IDBValidKey;
	data: unknown;
}

export interface GetLocalGitDataResp {
	remotes?: string[];
	upstream?: { name?: string; remote?: string; remoteUrl?: string };
	gitRoot?: string;
}

export interface SendTelemetryExceptionParams {
	error: Error;
	properties?: {
		[key: string]: string;
	};
	measurements?: {
		[key: string]: number;
	};
}

export interface SendTelemetryEventParams {
	eventName: string;
	properties?: {
		[key: string]: string;
	};
	measurements?: {
		[key: string]: number;
	};
}
