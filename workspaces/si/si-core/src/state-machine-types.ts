/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { NotificationType, RequestType } from "vscode-messenger-common";

export enum MACHINE_VIEW {
    Welcome = "WSO2 Integrator: SI",
    Overview = "Project Overview",
    Disabled = "SI Extension",
    UpdateExtension = "Update Extension"
}

export type MachineStateValue =
    | 'initialize' | 'projectDetected' | 'oldProjectDetected' | 'LSInit' | 'ready' | 'disabled'
    | { ready: 'viewReady' } | { ready: 'viewEditing' }
    | { newProject: 'viewReady' }| { environmentSetup: 'viewReady' };


export enum EVENT_TYPE {
    OPEN_VIEW = "OPEN_VIEW",
    REPLACE_VIEW = "REPLACE_VIEW",
    REFRESH_ENVIRONMENT = "REFRESH_ENVIRONMENT",
}

export enum Platform {
    WINDOWS,
    MAC,
    LINUX
}

export interface MachineEvent {
    type: EVENT_TYPE;
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
    platform?: Platform;
    pathSeparator?: string;
}


export interface DownloadProgressData {
    percentage: number;
    downloadedAmount: string;
    downloadSize: string;
}

export const stateChanged: NotificationType<MachineStateValue> = { method: 'stateChanged' };
export const getVisualizerState: RequestType<void, VisualizerLocation> = { method: 'getVisualizerState' };
export const webviewReady: NotificationType<void> = { method: `webviewReady` };
export const onDownloadProgress: NotificationType<DownloadProgressData> = { method: `onDownloadProgress` };
