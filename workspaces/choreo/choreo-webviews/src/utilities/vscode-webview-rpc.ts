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
	ClearWebviewCache,
	ExecuteCommandRequest,
	GetContextStateStore,
	GetWebviewStateStore,
	IsLoggedIn,
	RestoreWebviewCache,
	SetWebviewCache,
	ShowErrorMessage,
	ShowInfoMessage,
} from "@wso2/choreo-core";
import type { ContextStoreState as PlatformContextStoreState, WebviewState as PlatformWebviewState } from "@wso2/wso2-platform-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";
import type { WebviewApi } from "vscode-webview";
import { vscodeApiWrapper } from "./vscode-api-wrapper";

export class ChoreoWebViewAPI {
	private readonly _messenger;
	private static _instance: ChoreoWebViewAPI;

	constructor(vscodeAPI: WebviewApi<unknown>) {
		this._messenger = new Messenger(vscodeAPI);
		this._messenger.start();
	}

	public static getInstance() {
		if (!this._instance) {
			this._instance = new ChoreoWebViewAPI(vscodeApiWrapper);
		}
		return this._instance;
	}

	// Invoke RPC Calls
	public async setWebviewCache(cacheKey: IDBValidKey, data: unknown): Promise<void> {
		return this._messenger.sendRequest(SetWebviewCache, HOST_EXTENSION, { cacheKey, data });
	}

	public async restoreWebviewCache(cacheKey: IDBValidKey): Promise<unknown> {
		return this._messenger.sendRequest(RestoreWebviewCache, HOST_EXTENSION, cacheKey);
	}

	public async clearWebviewCache(cacheKey: IDBValidKey): Promise<unknown> {
		return this._messenger.sendRequest(ClearWebviewCache, HOST_EXTENSION, cacheKey);
	}

	public triggerCmd(cmdId: string, ...args: any) {
		return this._messenger.sendRequest(ExecuteCommandRequest, HOST_EXTENSION, [cmdId, ...args]);
	}

	// send notifications
	public showErrorMsg(error: string) {
		this._messenger.sendNotification(ShowErrorMessage, HOST_EXTENSION, error);
	}

	public showInfoMsg(info: string) {
		this._messenger.sendNotification(ShowInfoMessage, HOST_EXTENSION, info);
	}

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
