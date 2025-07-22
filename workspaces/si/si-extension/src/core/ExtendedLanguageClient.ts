/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import {
    DesignModelResponse,
    StreamResponse,
    StreamAttributesResponse,
    SourceCodeResponse,
    ExportDockerRequest,
    ExportResponse,
    SimulatorResponse,
    SimulationConfigResponse,
    MessageResponse,
} from "@wso2/si-core";

export class ExtendedLanguageClient extends LanguageClient {
    constructor(id: string, name: string, serverOptions: ServerOptions, clientOptions: LanguageClientOptions) {
        super(id, name, serverOptions, clientOptions);
    }

    public async getDesignModel(params: string): Promise<DesignModelResponse> {
        return this.sendRequest("flowDesignService/getDesignView", { value: params });
    }

    public async getSourceCode(params: string): Promise<SourceCodeResponse> {
        return this.sendRequest<SourceCodeResponse>("flowDesignService/getSourceCode", { designJson: params });
    }

    public async getStreams(siddhiApp: string, siddhiAppUri: string): Promise<StreamResponse> {
        return this.sendRequest<StreamResponse>("eventSimulator/getStreams", { siddhiApp, siddhiAppUri });
    }

    public async getStreamAttributes(
        siddhiAppString: string,
        streamName: string,
        siddhiAppUri: string
    ): Promise<StreamAttributesResponse> {
        return this.sendRequest<StreamAttributesResponse>("eventSimulator/getStreamAttributes", {
            siddhiAppString,
            streamName,
            siddhiAppUri,
        });
    }

    public async getMetaData(): Promise<DesignModelResponse> {
        return this.sendRequest("flowDesignService/getMetaData");
    }

    public async exportDocker(exportDockerRequest: ExportDockerRequest): Promise<ExportResponse> {
        return this.sendRequest("export/exportDocker", exportDockerRequest);
    }

    public async initializeEventSimulator(): Promise<MessageResponse> {
        return this.sendRequest("eventSimulator/initializeEventSimulator");
    }

    public async addFeedSimulation(body: string): Promise<SimulatorResponse> {
        return this.sendRequest("eventSimulator/addFeedSimulation", { simulationConfig: body });
    }

    public async getFeedSimulation(simulationName: string): Promise<SimulationConfigResponse> {
        return this.sendRequest("eventSimulator/getFeedSimulation", { simulationName });
    }

    public async getFeedSimulations(siddhiApps: string[]): Promise<SimulationConfigResponse> {
        return this.sendRequest<SimulationConfigResponse>("eventSimulator/getFeedSimulations", { siddhiApps });
    }

    public async updateFeedSimulation(simulationName: string, simulationConfig: string): Promise<SimulatorResponse> {
        return this.sendRequest("eventSimulator/updateFeedSimulation", { simulationName, simulationConfig });
    }

    public async deleteSimulation(simulationName: string): Promise<SimulatorResponse> {
        return this.sendRequest("eventSimulator/deleteFeedSimulation", { simulationName });
    }

    public async getFeedSimulationStatus(simulationName: string): Promise<SimulationConfigResponse> {
        return this.sendRequest("eventSimulator/getFeedSimulationStatus", { simulationName });
    }

    public async testDBConnection(
        dataSourceLocation: string,
        driver: string,
        username: string,
        password: string
    ): Promise<SimulatorResponse> {
        return this.sendRequest("eventSimulator/testDBConnection", { dataSourceLocation, driver, username, password });
    }

    public async getDatabaseTables(
        dataSourceLocation: string,
        driver: string,
        username: string,
        password: string
    ): Promise<SimulationConfigResponse> {
        return this.sendRequest("eventSimulator/getDatabaseTables", { dataSourceLocation, driver, username, password });
    }

    public async getDatabaseTableColumns(
        dataSourceLocation: string,
        driver: string,
        username: string,
        password: string,
        tableName: string
    ): Promise<SimulationConfigResponse> {
        return this.sendRequest("eventSimulator/getDatabaseTableColumns", {
            dataSourceLocation,
            driver,
            username,
            password,
            tableName,
        });
    }

    public async uploadFile(fileName: string): Promise<SimulatorResponse> {
        return this.sendRequest("eventSimulator/uploadFile", { fileName });
    }

    public async updateFile(fileName: string): Promise<SimulatorResponse> {
        return this.sendRequest("eventSimulator/updateFile", { fileName });
    }

    public async deleteFile(fileName: string): Promise<SimulatorResponse> {
        return this.sendRequest("eventSimulator/deleteFile", { fileName });
    }

    public async getFileNames(): Promise<SimulationConfigResponse> {
        return this.sendRequest("eventSimulator/getFileNames", {});
    }

    public async initializeExtensionInstaller(): Promise<MessageResponse> {
        return this.sendRequest("extensionInstaller/initializeExtensionInstaller", {});
    }

    public async getAllExtensionStatuses(): Promise<SimulationConfigResponse> {
        return this.sendRequest("extensionInstaller/getAllExtensionStatuses", {});
    }

    public async getExtensionStatus(): Promise<SimulationConfigResponse> {
        return this.sendRequest("extensionInstaller/getExtensionStatus", {});
    }

    public async getDependencyStatuses(): Promise<SimulationConfigResponse> {
        return this.sendRequest("extensionInstaller/getDependencyStatuses", {});
    }

    public async getDependencySharingExtensions(extensionName: string): Promise<SimulationConfigResponse> {
        return this.sendRequest("extensionInstaller/getDependencySharingExtensions", {extensionName});
    }

    public async installDependencies(extensionName: string): Promise<SimulationConfigResponse> {
        return this.sendRequest("extensionInstaller/installDependencies", {extensionName});
    }

    public async uninstallDependencies(extensionName: string): Promise<SimulationConfigResponse> {
        return this.sendRequest("extensionInstaller/uninstallDependencies",{extensionName});
    }

    public async installMissingExtensions(): Promise<SimulationConfigResponse> {
        return this.sendRequest("extensionInstaller/installMissingExtensions", {});
    }
}
