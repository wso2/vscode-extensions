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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    ColorThemeKind,
    EVENT_TYPE,
    GettingStartedCategory,
    GettingStartedData,
    GettingStartedSample,
    GoToSourceRequest,
    HistoryEntry,
    HistoryEntryResponse,
    LogRequest,
    MACHINE_VIEW,
    SetupDetails,
    SetPathRequest,
    MIVisualizerAPI,
    NotificationRequest,
    NotificationResponse,
    OpenExternalRequest,
    OpenExternalResponse,
    OpenViewRequest,
    POPUP_EVENT_TYPE,
    PopupVisualizerLocation,
    ProjectOverviewResponse,
    ProjectStructureRequest,
    ProjectStructureResponse,
    ReadmeContentResponse,
    RetrieveContextRequest,
    RetrieveContextResponse,
    RuntimeServicesResponse,
    SampleDownloadRequest,
    AddConfigurableRequest,
    SwaggerProxyRequest,
    SwaggerProxyResponse,
    ToggleDisplayOverviewRequest,
    UpdateContextRequest,
    VisualizerLocation,
    WorkspaceFolder,
    WorkspacesResponse,
    ProjectDetailsResponse,
    UpdateDependenciesRequest,
    UpdatePomValuesRequest,
    UpdateConfigValuesRequest,
    ImportOpenAPISpecRequest,
    PathDetailsResponse,
    DownloadMIRequest,
    UpdateAiDependenciesRequest,
    RuntimeServiceDetails,
    MavenDeployPluginDetails,
    ProjectConfig
} from "@wso2/mi-core";
import * as https from "https";
import Mustache from "mustache";
import fetch from 'node-fetch';
import * as vscode from 'vscode';
import { Position, Uri, ViewColumn, WorkspaceEdit, commands, env, window, workspace, Range } from "vscode";
import * as os from 'os';
import { extension } from "../../MIExtensionContext";
import { DebuggerConfig } from "../../debugger/config";
import { history } from "../../history";
import { getStateMachine, navigate, openView, refreshUI } from "../../stateMachine";
import { goToSource, handleOpenFile, appendContent, selectFolderDialog } from "../../util/fileOperations";
import { openPopupView } from "../../stateMachinePopup";
import { SwaggerServer } from "../../swagger/server";
import { log, outputChannel } from "../../util/logger";
import { escapeXml } from '../../util/templates';
import path from "path";
import { copy } from 'fs-extra';

const fs = require('fs');
import { TextEdit } from "vscode-languageclient";
import { downloadJavaFromMI, downloadMI, getProjectSetupDetails, getSupportedMIVersionsHigherThan, setPathsInWorkSpace, updateRuntimeVersionsInPom, getMIVersionFromPom } from '../../util/onboardingUtils';

Mustache.escape = escapeXml;
export class MiVisualizerRpcManager implements MIVisualizerAPI {
    constructor(private projectUri: string) { }

    async getWorkspaces(): Promise<WorkspacesResponse> {
        return new Promise(async (resolve) => {
            const workspaces = workspace.workspaceFolders;
            const response: WorkspaceFolder[] = (workspaces ?? []).map(space => ({
                index: space.index,
                fsPath: space.uri.fsPath,
                name: space.name
            }));
            resolve({ workspaces: response });
        });
    }

    async getProjectStructure(params: ProjectStructureRequest): Promise<ProjectStructureResponse> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;

            const res = await langClient.getProjectStructure(this.projectUri);
            resolve(res);
        });
    }

    async getProjectDetails(): Promise<ProjectDetailsResponse> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;
            const res = await langClient.getProjectDetails();
            resolve(res);
        });
    }

    async setDeployPlugin(params: MavenDeployPluginDetails): Promise<MavenDeployPluginDetails> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;
            const res = await langClient.setDeployPlugin(params);
            await this.updatePom([res.textEdit]);
            resolve(res);
        });
    }

    async getDeployPluginDetails(): Promise<MavenDeployPluginDetails> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;
            const res = await langClient.getDeployPluginDetails();
            resolve(res);
        });
    }

    async removeDeployPlugin(): Promise<MavenDeployPluginDetails> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;
            const res = await langClient.removeDeployPlugin();
            if (res.range.start.line !== 0 && res.range.start.character !== 0) {
                await this.updatePom([res]);
            }
            resolve(res);
        });
    }

    async updateDependencies(params: UpdateDependenciesRequest): Promise<boolean> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;

            const projectDetails = await langClient.getProjectDetails();
            const existingDependencies = projectDetails.dependencies || [];

            const updatedDependencies: any[] = [];
            const removedDependencies: any[] = [];

            params.dependencies.forEach(dep => {
                const dependenciesToCheck = dep.type === 'zip' ? existingDependencies.connectorDependencies : existingDependencies.otherDependencies;
                let alreadyAvailable = false;
                dependenciesToCheck.forEach(existingDep => {
                    if (existingDep.groupId === dep.groupId &&
                        existingDep.artifact === dep.artifact) {
                        if (existingDep.version !== dep.version) {
                            removedDependencies.push(existingDep);
                        } else {
                            alreadyAvailable = true;
                        }
                        return;
                    }
                });

                !alreadyAvailable && updatedDependencies.push(dep);
            });

            if (updatedDependencies.length > 0) {
                const res = await langClient.updateDependencies({ dependencies: updatedDependencies });
                await this.updatePom(res.textEdits);
            }

            if (removedDependencies.length > 0) {
                await this.updatePomValues({
                    pomValues: removedDependencies.map(dep => ({ range: dep.range, value: '' }))
                });
            }

            resolve(true);
        });
    }

    async updatePomValues(params: UpdatePomValuesRequest): Promise<boolean> {
        return new Promise(async (resolve) => {
            const textEdits = params.pomValues.map((pomValue) => {
                return {
                    newText: pomValue.value,
                    range: pomValue.range! as Range
                };

            });
            await this.updatePom(textEdits);
            resolve(true);
        });
    }

    async updateConfigFileValues(params: UpdateConfigValuesRequest): Promise<boolean> {
        return new Promise(async (resolve) => {
            const configFilePath = [this.projectUri, 'src', 'main', 'wso2mi', 'resources', 'conf', 'config.properties'].join(path.sep);
            const configDir = path.dirname(configFilePath);
            if (!fs.existsSync(configDir)) {
                // Create the directory structure for the config file if it doesn't exist
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Create config.properties if it doesn't exist
            if (!fs.existsSync(configFilePath)) {
                fs.writeFileSync(configFilePath, "");
            }

            const content = params.configValues.map(configValue => `${configValue.key}:${configValue.value}`).join('\n');
            fs.writeFileSync(configFilePath, content);
            navigate(this.projectUri);

            resolve(true);
        });
    }

    async updateConnectorDependencies(): Promise<string> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;
            const res = await langClient.updateConnectorDependencies();
            resolve(res);
        });
    }

    async updateDependenciesFromOverview(params: UpdateDependenciesRequest): Promise<boolean> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;
            const res = await langClient.updateDependencies({ dependencies: params.dependencies });
            await this.updatePom(res.textEdits);
            resolve(true);
        });
    }

    openView(params: OpenViewRequest): void {
        (params.location as VisualizerLocation).projectUri = this.projectUri;
        if (params.isPopup) {
            const view = params.location.view;

            if (view && view === MACHINE_VIEW.Overview) {
                openPopupView(this.projectUri, POPUP_EVENT_TYPE.CLOSE_VIEW, params.location as PopupVisualizerLocation);
            } else {
                openPopupView(this.projectUri, params.type as POPUP_EVENT_TYPE, params.location as PopupVisualizerLocation);
            }
        } else {
            openView(params.type as EVENT_TYPE, params.location as VisualizerLocation);
        }
    }

    goBack(): void {
        if (!getStateMachine(this.projectUri).context().view?.includes("Form")) {
            const entry = history.pop();
            navigate(this.projectUri, entry);
        } else {
            navigate(this.projectUri);
        }
    }

    async fetchSamplesFromGithub(): Promise<GettingStartedData> {
        return new Promise(async (resolve) => {
            const url = 'https://mi-connectors.wso2.com/samples/info.json';
            try {
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const samples = JSON.parse(JSON.stringify(data)).Samples;
                const categories = JSON.parse(JSON.stringify(data)).categories;

                let categoriesList: GettingStartedCategory[] = [];
                for (let i = 0; i < categories.length; i++) {
                    const cat: GettingStartedCategory = {
                        id: categories[i][0],
                        title: categories[i][1],
                        icon: categories[i][2]
                    };
                    categoriesList.push(cat);
                }
                let sampleList: GettingStartedSample[] = [];
                for (let i = 0; i < samples.length; i++) {
                    const sample: GettingStartedSample = {
                        category: samples[i][0],
                        priority: samples[i][1],
                        title: samples[i][2],
                        description: samples[i][3],
                        zipFileName: samples[i][4],
                        isAvailable: samples[i][5]
                    };
                    sampleList.push(sample);
                }
                const gettingStartedData: GettingStartedData = {
                    categories: categoriesList,
                    samples: sampleList
                };
                resolve(gettingStartedData);

            } catch (error) {
                console.error('Error:', error);
            }
        });
    }

    downloadSelectedSampleFromGithub(params: SampleDownloadRequest): void {
        const url = 'https://mi-connectors.wso2.com/samples/samples/';
        handleOpenFile(this.projectUri, params.zipFileName, url);
    }

    async addConfigurable(params: AddConfigurableRequest): Promise<void> {
        const configPropertiesFilePath = [this.projectUri, 'src', 'main', 'wso2mi', 'resources', 'conf', 'config.properties'].join(path.sep);
        const envFilePath = [this.projectUri, '.env'].join(path.sep);
        await appendContent(configPropertiesFilePath, `${params.configurableName}:${params.configurableType}\n`);
        await appendContent(envFilePath, `${params.configurableName}\n`);
    }

    async getHistory(): Promise<HistoryEntryResponse> {
        return new Promise(async (resolve) => {
            const res = history.get();
            resolve({ history: res });
        });
    }

    goHome(): void {
        history.clear();
        navigate(this.projectUri);
    }

    goSelected(index: number): void {
        history.select(index);
        navigate(this.projectUri);
    }

    addToHistory(entry: HistoryEntry): void {
        history.push(entry);
        navigate(this.projectUri);
    }

    async getCurrentThemeKind(): Promise<ColorThemeKind> {
        return new Promise((resolve) => {
            const currentThemeKind = window.activeColorTheme.kind;
            resolve(currentThemeKind);
        });
    }

    async toggleDisplayOverview(params: ToggleDisplayOverviewRequest): Promise<void> {
        return new Promise(async (resolve) => {
            await extension.context.workspaceState.update('displayOverview', params.displayOverview);
            resolve();
        });
    }

    goToSource(params: GoToSourceRequest): void {
        goToSource(params.filePath, params.position);
    }

    reloadWindow(): Promise<void> {
        return new Promise(async (resolve) => {
            await commands.executeCommand('workbench.action.reloadWindow');
            resolve();
        });
    }

    focusOutput(): void {
        // Focus on the output channel
        outputChannel.show();
    }

    log(params: LogRequest): void {
        // Logs the message to the output channel
        log(params.message);
    }

    async updateContext(params: UpdateContextRequest): Promise<void> {
        return new Promise(async (resolve) => {
            const { key, value, contextType = "global" } = params;
            if (contextType === "workspace") {
                await extension.context.workspaceState.update(key, value);
            } else {
                await extension.context.globalState.update(key, value);
            }
            resolve();
        });
    }

    async retrieveContext(params: RetrieveContextRequest): Promise<RetrieveContextResponse> {
        return new Promise((resolve) => {
            const { key, contextType = "global" } = params;
            const value = contextType === "workspace" ?
                extension.context.workspaceState.get(key) :
                extension.context.globalState.get(key);
            resolve({ value });
        });
    }

    async showNotification(params: NotificationRequest): Promise<NotificationResponse> {
        return new Promise(async (resolve) => {
            const { message, options, type = "info" } = params;
            let selection: string | undefined;
            if (type === "info") {
                selection = await window.showInformationMessage(message, ...options ?? []);
            } else if (type === "warning") {
                selection = await window.showWarningMessage(message, ...options ?? []);
            } else {
                selection = await window.showErrorMessage(message, ...options ?? []);
            }

            resolve({ selection });
        });
    }

    async getAvailableRuntimeServices(): Promise<RuntimeServicesResponse> {
        return new Promise(async (resolve) => {
            const username = DebuggerConfig.getManagementUserName();
            const password = DebuggerConfig.getManagementPassword();

            const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
            const authHeader = `Basic ${token}`;
            // Create an HTTPS agent that ignores SSL certificate verification
            // MI has ignored the verification for management api, check on this
            const agent = new https.Agent({ rejectUnauthorized: false });

            const runtimeServicesResponse: RuntimeServicesResponse = {
                api: undefined,
                proxy: undefined,
                dataServices: undefined
            };

            const managementPort = DebuggerConfig.getManagementPort();
            const host = DebuggerConfig.getHost();

            const response = await fetch(`https://${host}:${managementPort}/management/login`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${token}`,
                },
                agent: agent // Pass the custom agent
            });

            if (response.ok) {
                const responseBody = await response.json() as { AccessToken: string } | undefined;
                const authToken = responseBody?.AccessToken;

                const apiResponse = await fetch(`https://${host}:${managementPort}/management/apis`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    agent: agent // Pass the custom agent
                });

                if (apiResponse.ok) {
                    const apiResponseData = await apiResponse.json() as RuntimeServiceDetails | undefined;
                    runtimeServicesResponse.api = apiResponseData;
                }


                // get the proxy details
                const proxyResponse = await fetch(`https://${host}:${managementPort}/management/proxy-services`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    agent: agent // Pass the custom agent
                });

                if (proxyResponse.ok) {
                    const proxyResponseData = await proxyResponse.json() as RuntimeServiceDetails | undefined;
                    runtimeServicesResponse.proxy = proxyResponseData;
                }

                // get the data services details
                const dataServicesResponse = await fetch(`https://${host}:${managementPort}/management/data-services`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    agent: agent // Pass the custom agent
                });

                if (dataServicesResponse.ok) {
                    const dataServicesResponseData = await dataServicesResponse.json() as RuntimeServiceDetails | undefined;
                    runtimeServicesResponse.dataServices = dataServicesResponseData;
                }

                resolve(runtimeServicesResponse);
            } else {
                log(`Error while login to MI management api: ${response.statusText}`);
                vscode.window.showErrorMessage(`Error while login into the MI Management API: ${response.statusText}`);
            }
        });
    }

    async sendSwaggerProxyRequest(params: SwaggerProxyRequest): Promise<SwaggerProxyResponse> {
        return new Promise(async (resolve) => {
            if (params.command !== 'swaggerRequest') {
                resolve({ isResponse: false });
            } else {
                const swaggerServer: SwaggerServer = new SwaggerServer();
                await swaggerServer.sendRequest(params.request as any, false).then((response) => {
                    if (typeof response === 'boolean') {
                        resolve({ isResponse: true, response: undefined });
                    } else {
                        const responseData: SwaggerProxyResponse = {
                            isResponse: true,
                            response: response
                        };
                        resolve(responseData);
                    }
                });
            }
        });
    }

    async openExternal(params: OpenExternalRequest): Promise<OpenExternalResponse> {
        return new Promise(async (resolve, reject) => {
            const { uri } = params;
            const isSuccess = await env.openExternal(Uri.parse(uri));
            resolve({ success: isSuccess });
        });
    }
    async downloadJavaFromMI(miVersion: string): Promise<string> {
        const javaPath = await downloadJavaFromMI(this.projectUri, miVersion);
        return javaPath;
    }
    async downloadMI(params: DownloadMIRequest): Promise<string> {
        const miPath = await downloadMI(this.projectUri, params.version, params.isUpdatedPack);
        return miPath;
    }
    async getSupportedMIVersionsHigherThan(miVersion: string): Promise<string[]> {
        return getSupportedMIVersionsHigherThan(miVersion);
    }
    async setPathsInWorkSpace(request: SetPathRequest): Promise<PathDetailsResponse> {
        return await setPathsInWorkSpace(request);
    }

    async selectFolder(title: string): Promise<string | undefined> {
        try {
            const selectedFolder = await selectFolderDialog(title, vscode.Uri.file(os.homedir()));

            if (selectedFolder) {
                const folderPath = selectedFolder.fsPath;
                return folderPath;
            } else {
                vscode.window.showInformationMessage('No folder selected.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting folder: ${error}`);
        }
    }

    async getProjectSetupDetails(): Promise<SetupDetails> {
        return getProjectSetupDetails(this.projectUri);
    }
    async updateRuntimeVersionsInPom(version: string): Promise<boolean> {
        try {
            await updateRuntimeVersionsInPom(version);
            return true;
        } catch (e) {
            vscode.window.showErrorMessage('Error updating the runtime versions in the pom.xml file');
            return false;
        }
    }
    async getProjectOverview(params: ProjectStructureRequest): Promise<ProjectOverviewResponse> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;
            const res = await langClient.getOverviewModel();
            resolve(res);
        });
    }

    openReadme(): void {
        const readmePath = path.join(this.projectUri, "README.md");

        if (!fs.existsSync(readmePath)) {
            // Create README.md if it doesn't exist
            fs.writeFileSync(readmePath, "# Project Overview\n\nAdd your project description here.");
        }

        // Open README.md in the editor
        workspace.openTextDocument(readmePath).then((doc) => {
            window.showTextDocument(doc, ViewColumn.Beside);
        });
    }

    async getReadmeContent(): Promise<ReadmeContentResponse> {
        return new Promise((resolve) => {
            const readmePath = path.join(this.projectUri, "README.md");

            if (!fs.existsSync(readmePath)) {
                resolve({ content: "" });
                return;
            }

            fs.readFile(readmePath, "utf8", (err, data) => {
                if (err) {
                    console.error("Error reading README.md:", err);
                    resolve({ content: "" });
                } else {
                    resolve({ content: data });
                }
            });
        });
    }

    private async updatePom(textEdits: TextEdit[]) {
        const pomPath = path.join(this.projectUri, 'pom.xml');

        if (!fs.existsSync(pomPath)) {
            throw new Error("pom.xml not found");
        }

        const edit = new WorkspaceEdit();
        for (const textEdit of textEdits) {
            const content = textEdit.newText;

            const range = new Range(new Position(textEdit.range.start.line - 1, textEdit.range.start.character - 1),
                new Position(textEdit.range.end.line - 1, textEdit.range.end.character - 1));

            edit.replace(Uri.file(pomPath), range, content);
        }
        const success = await workspace.applyEdit(edit);
        // Make sure to save the document after applying the edits
        if (success) {
            const document = await workspace.openTextDocument(pomPath);
            await document.save();
            if (getStateMachine(this.projectUri).context().view === MACHINE_VIEW.Overview) {
                refreshUI(this.projectUri);
            }
        } else {
            throw new Error("Failed to apply edits to pom.xml");
        }
    }

    async importOpenAPISpec(params: ImportOpenAPISpecRequest): Promise<void> {
        const { filePath } = params;
        const langClient = getStateMachine(this.projectUri).context().langClient!;
        if (filePath && filePath.length > 0) {
            const connectorGenRequest = {
                openAPIPath: filePath,
                connectorProjectPath: path.join(this.projectUri, 'target')
            };
            const { buildStatus, connectorPath } = await langClient.generateConnector(connectorGenRequest);
            if (buildStatus) {
                await copy(connectorPath, path.join(this.projectUri, 'src', 'main', 'wso2mi', 'resources', 'connectors', path.basename(connectorPath)));
                vscode.window.showInformationMessage("Connector generated successfully");
            } else {
                vscode.window.showErrorMessage("Error while generating connector");
            }
        }
    }

    async updateProjectSettingsConfig(params: ProjectConfig): Promise<void> {
        const config = workspace.getConfiguration('MI');
        await config.update(params.configName, params.value, vscode.ConfigurationTarget.Workspace);
    }

    async isSupportEnabled(configName: string): Promise<boolean> {
        const projectRuntimeVersion = await getMIVersionFromPom();
        return new Promise((resolve, reject) => {
            try {
                if (configName === "LEGACY_EXPRESSION_ENABLED") {
                    const versions: string[] = ["4.0.0", "4.1.0", "4.2.0", "4.3.0"];
                    if (projectRuntimeVersion && versions.includes(projectRuntimeVersion)) {
                        resolve(true);
                        return;
                    }
                }
                const config = workspace.getConfiguration('MI');
                resolve(config.get(configName) || false);
            } catch (error) {
                reject(error);
            }
        });
    }

    async updateAiDependencies(params: UpdateAiDependenciesRequest): Promise<boolean> {
        return new Promise(async (resolve) => {
            const langClient = getStateMachine(this.projectUri).context().langClient!;

            const projectDetails = await langClient.getProjectDetails();
            const existingDependencies = projectDetails.dependencies || [];

            const updatedDependencies: any[] = [];
            const removedDependencies: any[] = [];

            params.dependencies.forEach(dep => {
                const dependenciesToCheck = dep.type === 'zip' ? existingDependencies.connectorDependencies : existingDependencies.otherDependencies;
                let alreadyAvailable = false;
                
                // Find matching dependency only once
                const matchingDep = dependenciesToCheck.find(existingDep => 
                    existingDep.groupId === dep.groupId && existingDep.artifact === dep.artifact
                );
                
                if (params.operation === 'add') {
                    // Only add if not already available
                    if (!matchingDep) {
                        updatedDependencies.push(dep);
                    }
                } else if (params.operation === 'remove') {
                    // Add to removed dependencies if found
                    if (matchingDep) {
                        removedDependencies.push(matchingDep);
                    }
                }
            });
            
            if (updatedDependencies.length > 0) {
                const res = await langClient.updateDependencies({ dependencies: updatedDependencies });
                await this.updatePom(res.textEdits);
                resolve(true);
            }

            if (removedDependencies.length > 0) {
                await this.updatePomValues({
                    pomValues: removedDependencies.map(dep => ({ range: dep.range, value: '' }))
                });
                resolve(true);
            }

            resolve(false);
        });
    }
}
