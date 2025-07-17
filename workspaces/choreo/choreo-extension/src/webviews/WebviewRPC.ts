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
	WebviewNotificationsMethodList,
} from "@wso2/choreo-core";
import { type WebviewPanel, type WebviewView, commands, window } from "vscode";
import { Messenger } from "vscode-messenger";
import { ext } from "../extensionVariables";
import { getContextStateStore, getIsLoggedIn, getWebviewStateStore } from "../utils";

// Register handlers
function registerWebviewRPCHandlers(messenger: Messenger, view: WebviewPanel | WebviewView) {
	messenger.onNotification(ShowErrorMessage, (error: string) => {
		window.showErrorMessage(error);
	});
	messenger.onNotification(ShowInfoMessage, (info: string) => {
		window.showInformationMessage(info);
	});
	messenger.onRequest(SetWebviewCache, async (params) => {
		const { cacheKey, data } = params as { cacheKey: string; data: any };
		await ext.context.workspaceState.update(cacheKey, data);
	});
	messenger.onRequest(RestoreWebviewCache, async (cacheKey: string) => {
		return ext.context.workspaceState.get(cacheKey);
	});
	messenger.onRequest(ClearWebviewCache, async (cacheKey: string) => {
		await ext.context.workspaceState.update(cacheKey, undefined);
	});
	messenger.onRequest(ExecuteCommandRequest, async (args: string[]) => {
		if (args.length >= 1) {
			const cmdArgs = args.length > 1 ? args.slice(1) : [];
			const result = await commands.executeCommand(args[0], ...cmdArgs);
			return result;
		}
	});
	messenger.onRequest(IsLoggedIn, getIsLoggedIn);
	messenger.onRequest(GetWebviewStateStore, getWebviewStateStore);
	messenger.onRequest(GetContextStateStore, getContextStateStore);
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
