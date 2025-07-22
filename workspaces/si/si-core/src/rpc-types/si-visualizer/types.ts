/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { EVENT_TYPE, VisualizerLocation } from "../../state-machine-types";

export interface DownloadSIRequest {
    version: string;
    isUpdatedPack: boolean;
}

type NotificationType = "info" | "warning" | "error";

export interface NotificationRequest {
    message: string;
    options?: string[];
    type?: NotificationType;
}

export interface NotificationResponse {
    selection: string | undefined;
}

export interface OpenExternalRequest {
    uri: string;
}

export interface OpenExternalResponse {
    success: boolean;
}

export interface OpenViewRequest {
    type: EVENT_TYPE;
    location: VisualizerLocation;
    isPopup?: boolean;
}

export interface PathDetailsResponse {
    path?: string;
    status: "valid" | "not-valid" | "valid-not-updated";
    version?: string;
}

export interface SetupDetails {
    siVersionStatus?: "valid" | "not-valid" | "valid-not-updated";
    siVersion?: string;
    siDetails: PathDetailsResponse;
    javaDetails: PathDetailsResponse;
    showDownloadButtons?: boolean;
    recommendedVersions?: { siVersion: string; javaVersion: string };
}

export interface SetPathRequest {
    type: "JAVA" | "SI";
    path: string;
}
