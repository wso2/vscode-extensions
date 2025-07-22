/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

export interface DesignModelResponse {
    content: string;
    stacktrace?: string;
    errorMsg?: string;
}

export interface StreamResponse {
    streamNames: string[];
}

export interface StreamAttributesResponse {
    name: string;
    attributeList: {
        name: string;
        type: number;
    }[];
}

export interface SourceCodeResponse {
    content: string;
    stacktrace?: string;
    errorMsg?: string;
}

interface TemplatedVariable {
    key: string;
    value: string;
}

interface DockerConfiguration {
    isExistingImage: boolean;
    imageName: string;
    userName: string;
    password: string;
    email: string;
    downloadDocker: boolean;
    pushDocker: boolean;
}

interface BaseExportRequest {
    templatedSiddhiApps: { appName: string; appContent: string }[];
    templatedVariables: TemplatedVariable[];
    bundles: string[];
    jars: string[];
    dockerConfiguration: DockerConfiguration;
}

export interface ExportResponse {
    success: boolean;
    errorMsg: string;
}

export interface SimulationConfigResponse {
    result: string;
    simulatorResponse: SimulatorResponse;
}

export interface SimulatorResponse {
    success: boolean;
    message: string;
}

export interface ExportDockerRequest extends BaseExportRequest {}

export interface ExportKubernetesRequest extends BaseExportRequest {
    kubernetesConfiguration: string;
}

export interface MessageResponse {
    success: boolean;
    message: string;
}
