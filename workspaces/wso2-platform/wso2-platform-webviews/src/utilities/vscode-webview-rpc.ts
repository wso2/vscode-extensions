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
	type AuthState,
	AuthStoreChangedNotification,
	ChoreoRpcGetAuthorizedGitOrgsRequest,
	ChoreoRpcWebview,
	ClearWebviewCache,
	CloneRepositoryIntoCompDir,
	type CloneRepositoryIntoCompDirReq,
	CloseComponentViewDrawer,
	CloseWebViewNotification,
	type CommitHistory,
	type ComponentKind,
	ContextStoreChangedNotification,
	type ContextStoreState,
	CreateLocalConnectionsConfig,
	type CreateLocalConnectionsConfigReq,
	CreateLocalEndpointsConfig,
	type CreateLocalEndpointsConfigReq,
	CreateLocalProxyConfig,
	type CreateLocalProxyConfigReq,
	DeleteFile,
	DeleteLocalConnectionsConfig,
	type DeleteLocalConnectionsConfigReq,
	ExecuteCommandRequest,
	FileExists,
	GetAuthState,
	GetAuthorizedGitOrgsReq,
	GetConfigFileDrifts,
	type GetConfigFileDriftsReq,
	GetContextState,
	GetDirectoryFileNames,
	GetLocalGitData,
	type GetLocalGitDataResp,
	GetSubPath,
	GetWebviewStoreState,
	GoToSource,
	HasDirtyLocalGitRepo,
	type IChoreoRPCClient,
	JoinFsFilePaths,
	JoinUriFilePaths,
	OpenComponentViewDrawer,
	type OpenComponentViewDrawerReq,
	type OpenDialogOptions,
	OpenExternal,
	OpenExternalChoreo,
	OpenSubDialogRequest,
	type OpenTestViewReq,
	ReadFile,
	ReadLocalEndpointsConfig,
	type ReadLocalEndpointsConfigResp,
	ReadLocalProxyConfig,
	type ReadLocalProxyConfigResp,
	RefreshContextState,
	RestoreWebviewCache,
	SaveFile,
	type SaveFileReq,
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
	type ShowInOutputChannelReq,
	ShowInfoMessage,
	ShowInputBox,
	ShowQuickPick,
	ShowTextInOutputChannel,
	type ShowWebviewInputBoxReq,
	type ShowWebviewQuickPickItemsReq,
	SubmitBatchComponentCreate,
	type SubmitBatchComponentCreateReq,
	type SubmitBatchComponentCreateResp,
	SubmitComponentCreate,
	type SubmitComponentCreateReq,
	TriggerGithubAuthFlow,
	TriggerGithubInstallFlow,
	ViewRuntimeLogs,
	type ViewRuntimeLogsReq,
	type WebviewQuickPickItem,
	type WebviewState,
	WebviewStateChangedNotification,
} from "@wso2/wso2-platform-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";
import type { WebviewApi } from "vscode-webview";
import { vscodeApiWrapper } from "./vscode-api-wrapper";

export class ChoreoWebViewAPI {
	private readonly _messenger: Messenger;
	private static _instance: ChoreoWebViewAPI;
	private _rpcClient: ChoreoRpcWebview;

	constructor(vscodeAPI: WebviewApi<unknown>) {
		this._messenger = new Messenger(vscodeAPI);
		this._messenger.start();
		this._rpcClient = new ChoreoRpcWebview(this._messenger);
	}

	public static getInstance() {
		if (!this._instance) {
			this._instance = new ChoreoWebViewAPI(vscodeApiWrapper);
		}
		return this._instance;
	}

	public getChoreoRpcClient(): IChoreoRPCClient {
		return this._rpcClient;
	}

	// Notifications
	public onAuthStateChanged(callback: (state: AuthState) => void) {
		this._messenger.onNotification(AuthStoreChangedNotification, callback);
	}

	public onWebviewStateChanged(callback: (state: WebviewState) => void) {
		this._messenger.onNotification(WebviewStateChangedNotification, callback);
	}

	public onContextStateChanged(callback: (state: ContextStoreState) => void) {
		this._messenger.onNotification(ContextStoreChangedNotification, callback);
	}

	// Send Notifications
	public showErrorMsg(error: string) {
		this._messenger.sendNotification(ShowErrorMessage, HOST_EXTENSION, error);
	}

	public showInfoMsg(info: string) {
		this._messenger.sendNotification(ShowInfoMessage, HOST_EXTENSION, info);
	}

	public closeWebView() {
		this._messenger.sendNotification(CloseWebViewNotification, HOST_EXTENSION, undefined);
	}

	public refreshContextState() {
		this._messenger.sendNotification(RefreshContextState, HOST_EXTENSION, undefined);
	}

	public sendTelemetryEvent(params: SendTelemetryEventParams) {
		return this._messenger.sendNotification(SendTelemetryEventNotification, HOST_EXTENSION, params);
	}

	public sendTelemetryException(params: SendTelemetryExceptionParams) {
		return this._messenger.sendNotification(SendTelemetryExceptionNotification, HOST_EXTENSION, params);
	}

	// Invoke RPC Calls
	public async getAuthState(): Promise<AuthState> {
		return this._messenger.sendRequest(GetAuthState, HOST_EXTENSION, undefined);
	}

	public async getContextState(): Promise<ContextStoreState> {
		return this._messenger.sendRequest(GetContextState, HOST_EXTENSION, undefined);
	}

	public async getWebviewStoreState(): Promise<WebviewState> {
		return this._messenger.sendRequest(GetWebviewStoreState, HOST_EXTENSION, undefined);
	}

	public async showOpenSubDialog(options: OpenDialogOptions): Promise<string[] | undefined> {
		return this._messenger.sendRequest(OpenSubDialogRequest, HOST_EXTENSION, options);
	}

	public async getLocalGitData(dirPath: string): Promise<GetLocalGitDataResp> {
		return this._messenger.sendRequest(GetLocalGitData, HOST_EXTENSION, dirPath);
	}

	public async joinFsFilePaths(paths: string[]): Promise<string> {
		return this._messenger.sendRequest(JoinFsFilePaths, HOST_EXTENSION, paths);
	}

	public async joinUriFilePaths(paths: string[]): Promise<string> {
		return this._messenger.sendRequest(JoinUriFilePaths, HOST_EXTENSION, paths);
	}

	public async getSubPath(params: { subPath: string; parentPath: string }): Promise<string | null> {
		return this._messenger.sendRequest(GetSubPath, HOST_EXTENSION, params);
	}

	public triggerCmd(cmdId: string, ...args: any) {
		return this._messenger.sendRequest(ExecuteCommandRequest, HOST_EXTENSION, [cmdId, ...args]);
	}

	public async setWebviewCache(cacheKey: IDBValidKey, data: unknown): Promise<void> {
		return this._messenger.sendRequest(SetWebviewCache, HOST_EXTENSION, { cacheKey, data });
	}

	public async restoreWebviewCache(cacheKey: IDBValidKey): Promise<unknown> {
		return this._messenger.sendRequest(RestoreWebviewCache, HOST_EXTENSION, cacheKey);
	}

	public async clearWebviewCache(cacheKey: IDBValidKey): Promise<unknown> {
		return this._messenger.sendRequest(ClearWebviewCache, HOST_EXTENSION, cacheKey);
	}

	public async deleteFile(filePath: string): Promise<void> {
		return this._messenger.sendRequest(DeleteFile, HOST_EXTENSION, filePath);
	}

	public async showConfirmMessage(params: ShowConfirmBoxReq): Promise<boolean> {
		return this._messenger.sendRequest(ShowConfirmMessage, HOST_EXTENSION, params);
	}

	public async readLocalEndpointsConfig(componentPath: string): Promise<ReadLocalEndpointsConfigResp> {
		return this._messenger.sendRequest(ReadLocalEndpointsConfig, HOST_EXTENSION, componentPath);
	}

	public async readLocalProxyConfig(componentPath: string): Promise<ReadLocalProxyConfigResp> {
		return this._messenger.sendRequest(ReadLocalProxyConfig, HOST_EXTENSION, componentPath);
	}

	public async showQuickPicks(params: ShowWebviewQuickPickItemsReq): Promise<WebviewQuickPickItem | undefined> {
		return this._messenger.sendRequest(ShowQuickPick, HOST_EXTENSION, params);
	}

	public async showInputBox(params: ShowWebviewInputBoxReq): Promise<string | undefined> {
		return this._messenger.sendRequest(ShowInputBox, HOST_EXTENSION, params);
	}

	public async showTextInOutputPanel(params: ShowInOutputChannelReq): Promise<void> {
		return this._messenger.sendRequest(ShowTextInOutputChannel, HOST_EXTENSION, params);
	}

	public async viewRuntimeLogs(params: ViewRuntimeLogsReq): Promise<void> {
		return this._messenger.sendRequest(ViewRuntimeLogs, HOST_EXTENSION, params);
	}

	public async triggerGithubAuthFlow(orgId: string): Promise<void> {
		return this._messenger.sendRequest(TriggerGithubAuthFlow, HOST_EXTENSION, orgId);
	}

	public async cloneRepositoryIntoCompDir(params: CloneRepositoryIntoCompDirReq): Promise<string> {
		return this._messenger.sendRequest(CloneRepositoryIntoCompDir, HOST_EXTENSION, params);
	}

	public async triggerGithubInstallFlow(orgId: string): Promise<void> {
		return this._messenger.sendRequest(TriggerGithubInstallFlow, HOST_EXTENSION, orgId);
	}

	public async submitComponentCreate(params: SubmitComponentCreateReq): Promise<ComponentKind> {
		return this._messenger.sendRequest(SubmitComponentCreate, HOST_EXTENSION, params);
	}

	public async submitBatchComponentCreate(params: SubmitBatchComponentCreateReq): Promise<SubmitBatchComponentCreateResp> {
		return this._messenger.sendRequest(SubmitBatchComponentCreate, HOST_EXTENSION, params);
	}

	public async createLocalEndpointsConfig(params: CreateLocalEndpointsConfigReq): Promise<void> {
		return this._messenger.sendRequest(CreateLocalEndpointsConfig, HOST_EXTENSION, params);
	}

	public async createLocalProxyConfig(params: CreateLocalProxyConfigReq): Promise<void> {
		return this._messenger.sendRequest(CreateLocalProxyConfig, HOST_EXTENSION, params);
	}

	public async createLocalConnectionsConfig(params: CreateLocalConnectionsConfigReq): Promise<void> {
		return this._messenger.sendRequest(CreateLocalConnectionsConfig, HOST_EXTENSION, params);
	}

	public async deleteLocalConnectionsConfig(params: DeleteLocalConnectionsConfigReq): Promise<void> {
		return this._messenger.sendRequest(DeleteLocalConnectionsConfig, HOST_EXTENSION, params);
	}

	public async getDirectoryFileNames(path: string): Promise<string[]> {
		return this._messenger.sendRequest(GetDirectoryFileNames, HOST_EXTENSION, path);
	}

	public async fileExist(fsPath: string): Promise<boolean> {
		return this._messenger.sendRequest(FileExists, HOST_EXTENSION, fsPath);
	}

	public async readFile(fsPath: string): Promise<string | null> {
		return this._messenger.sendRequest(ReadFile, HOST_EXTENSION, fsPath);
	}

	public async goToSource(fsPath: string): Promise<void> {
		return this._messenger.sendRequest(GoToSource, HOST_EXTENSION, fsPath);
	}

	public async saveFile(params: SaveFileReq): Promise<string> {
		return this._messenger.sendRequest(SaveFile, HOST_EXTENSION, params);
	}

	public async selectCommitToBuild(params: SelectCommitToBuildReq): Promise<CommitHistory | undefined> {
		return this._messenger.sendRequest(SelectCommitToBuild, HOST_EXTENSION, params);
	}

	public async openExternal(url: string): Promise<void> {
		this._messenger.sendRequest(OpenExternal, HOST_EXTENSION, url);
	}

	public async openExternalChoreo(choreoPath: string): Promise<void> {
		this._messenger.sendRequest(OpenExternalChoreo, HOST_EXTENSION, choreoPath);
	}

	public async openComponentViewDrawer(params: OpenComponentViewDrawerReq): Promise<void> {
		return this._messenger.sendRequest(OpenComponentViewDrawer, HOST_EXTENSION, params);
	}

	public async closeComponentViewDrawer(componentKey: string): Promise<void> {
		return this._messenger.sendRequest(CloseComponentViewDrawer, HOST_EXTENSION, componentKey);
	}

	public async hasDirtyLocalGitRepo(componentPath: string): Promise<boolean> {
		return this._messenger.sendRequest(HasDirtyLocalGitRepo, HOST_EXTENSION, componentPath);
	}

	public async getConfigFileDrifts(componentPath: GetConfigFileDriftsReq): Promise<string[]> {
		return this._messenger.sendRequest(GetConfigFileDrifts, HOST_EXTENSION, componentPath);
	}
}
