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
	ChoreoRpcWebview,
	ClearWebviewCache,
	CloseWebViewNotification,
	ContextStoreChangedNotification,
	type ContextStoreState,
	ExecuteCommandRequest,
	GetAuthState,
	GetContextState,
	GetContextStateStore,
	GetWebviewStateStore,
	GetWebviewStoreState,
	type IChoreoRPCClient,
	IsLoggedIn,
	RefreshContextState,
	RestoreWebviewCache,
	SendTelemetryEventNotification,
	type SendTelemetryEventParams,
	SendTelemetryExceptionNotification,
	type SendTelemetryExceptionParams,
	SetWebviewCache,
	ShowErrorMessage,
	ShowInfoMessage,
	WebviewStateChangedNotification,
	WebviewState,
} from "@wso2/choreo-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";
import type { WebviewApi } from "vscode-webview";
import { vscodeApiWrapper } from "./vscode-api-wrapper";
import {WebviewState as PlatformWebviewState, ContextStoreState as PlatformContextStoreState} from "@wso2/wso2-platform-core"

export class ChoreoWebViewAPI {
	private readonly _messenger;
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

	public async setWebviewCache(cacheKey: IDBValidKey, data: unknown): Promise<void> {
		return this._messenger.sendRequest(SetWebviewCache, HOST_EXTENSION, { cacheKey, data });
	}

	public async restoreWebviewCache(cacheKey: IDBValidKey): Promise<unknown> {
		return this._messenger.sendRequest(RestoreWebviewCache, HOST_EXTENSION, cacheKey);
	}

	public async clearWebviewCache(cacheKey: IDBValidKey): Promise<unknown> {
		return this._messenger.sendRequest(ClearWebviewCache, HOST_EXTENSION, cacheKey);
	}

	// to remove above
	public triggerCmd(cmdId: string, ...args: any) {
		return this._messenger.sendRequest(ExecuteCommandRequest, HOST_EXTENSION, [cmdId, ...args]);
	}

	// new types
	public async isLoggedIn(): Promise<boolean> {
		return this._messenger.sendRequest(IsLoggedIn, HOST_EXTENSION);
	}

	public async getWebviewStateStore(): Promise<PlatformWebviewState> {
		return this._messenger.sendRequest(GetWebviewStateStore, HOST_EXTENSION);
	}

	public async getContextStateStore(): Promise<PlatformContextStoreState> {
		return this._messenger.sendRequest(GetContextStateStore, HOST_EXTENSION);
	}
}
