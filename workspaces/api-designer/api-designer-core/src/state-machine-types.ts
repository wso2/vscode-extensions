/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { NotificationType, RequestType } from "vscode-messenger-common";

export enum MACHINE_VIEW {
    Welcome = "API Designer",
    Overview = "Overview"
}

export type MachineStateValue =
    | 'initialize' | 'projectDetected' | 'oldProjectDetected' | 'LSInit' | 'ready' | 'disabled'
    | { ready: 'viewReady' } | { ready: 'viewEditing' }
    | { newProject: 'viewReady' };

export type PopupMachineStateValue = 'initialize' | 'ready' | { open: 'active' } | { ready: 'reopen' } | { ready: 'notify' } | 'disabled';

export enum EVENT_TYPE {
    OPEN_VIEW = "OPEN_VIEW",
    REPLACE_VIEW = "REPLACE_VIEW",
    CLEAR_PROMPT = "CLEAR_PROMPT",
    FILE_EDIT = "FILE_EDIT",
    EDIT_DONE = "EDIT_DONE",
    CLOSE_VIEW = "CLOSE_VIEW"
}


export interface ErrorType {
    title: string;
    message: string;
}

// State Machine context values
export interface VisualizerLocation {
    view: MACHINE_VIEW | null;
    errors?: ErrorType[];
    documentUri?: string;
    projectUri?: string;
    identifier?: string;
    position?: any;
}

export interface PopupVisualizerLocation extends VisualizerLocation {
    recentIdentifier?: string;
}

export interface ParentPopupData {
    recentIdentifier: string;
}

export enum WebviewQuickPickItemKind {
	Separator = -1,
	Default = 0,
}

export interface WebviewQuickPickItem {
	kind?: WebviewQuickPickItemKind;
	/**  A human-readable string which is rendered prominent. */
	label: string;
	/** A human-readable string which is rendered less prominent in the same line. */
	description?: string;
	/** A human-readable string which is rendered less prominent in a separate line */
	detail?: string;
	/** Always show this item. */
	alwaysShow?: boolean;
	/** Optional flag indicating if this item is picked initially.  */
	picked?: boolean;
	/** Any data to be passed */
	item?: any;
}

export interface SelectQuickPickItemReq {
	items: WebviewQuickPickItem[];
	title: string;
    placeholder?: string;
}

export interface ShowConfirmBoxReq {
	message: string;
	buttonText: string;
}

export interface ShowWebviewInputBoxReq {
	title: string;
	value?: string;
	placeholder?: string;
}

// ------------> Main RPC Methods <-----------
export const stateChanged: NotificationType<MachineStateValue> = { method: 'stateChanged' };
export const getVisualizerState: RequestType<void, VisualizerLocation> = { method: 'getVisualizerState' };
export const onFileContentUpdate: NotificationType<void> = { method: `onFileContentUpdate` };
export const webviewReady: NotificationType<void> = { method: `webviewReady` };
export const showErrorNotification: NotificationType<string> = { method: "showErrorNotification" };
export const showInfoNotification: NotificationType<string> = { method: "showInfoNotification" };

export const selectQuickPickItem: RequestType<SelectQuickPickItemReq, WebviewQuickPickItem | undefined> = { method: 'selectQuickPickItem' };
export const selectQuickPickItems: RequestType<SelectQuickPickItemReq, WebviewQuickPickItem[] | undefined> = { method: 'selectQuickPickItems' };
export const showConfirmMessage: RequestType<ShowConfirmBoxReq, boolean> = { method: "showConfirmMessage" };
export const showInputBox: RequestType<ShowWebviewInputBoxReq, string | undefined> = { method: "showWebviewInputBoxReq" };

// ------------> Popup RPC Methods <-----------
export const getPopupVisualizerState: RequestType<void, PopupVisualizerLocation> = { method: 'getPopupVisualizerState' };
export const popupStateChanged: NotificationType<PopupMachineStateValue> = { method: 'popupStateChanged' };
export const onParentPopupSubmitted: NotificationType<ParentPopupData> = { method: `onParentPopupSubmitted` };
