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
import { HistoryEntry } from "../../history";
import { ColorThemeKind } from "../../state-machine-types";
import {
    ProjectStructureRequest,
    ProjectStructureResponse,
    WorkspacesResponse,
    OpenViewRequest,
    HistoryEntryResponse,
    ToggleDisplayOverviewRequest,
    GoToSourceRequest,
    LogRequest,
    UpdateContextRequest,
    RetrieveContextRequest,
    RetrieveContextResponse,
    NotificationRequest,
    NotificationResponse,
    RuntimeServicesResponse,
    SwaggerProxyRequest,
    SwaggerProxyResponse,
    OpenExternalRequest,
    OpenExternalResponse,
    ProjectOverviewResponse,
    ReadmeContentResponse,
    AddConfigurableRequest,
    ProjectDetailsResponse,
    UpdateDependenciesRequest,
    UpdatePomValuesRequest,
    UpdateConfigValuesRequest,
    ImportOpenAPISpecRequest,
    SetupDetails,
    SetPathRequest,
    PathDetailsResponse,
    DownloadMIRequest,
    UpdateAiDependenciesRequest,
    ProjectConfig,
    MavenDeployPluginDetails
} from "./types";
import { GettingStartedData, SampleDownloadRequest } from "./types";
import { RequestType, NotificationType } from "vscode-messenger-common";

const _preFix = "mi-visualizer";
export const getWorkspaces: RequestType<void, WorkspacesResponse> = { method: `${_preFix}/getWorkspaces` };
export const getProjectStructure: RequestType<ProjectStructureRequest, ProjectStructureResponse> = { method: `${_preFix}/getProjectStructure` };
export const getProjectOverview: RequestType<ProjectStructureRequest, ProjectOverviewResponse> = { method: `${_preFix}/getProjectOverview` };
export const getCurrentThemeKind: RequestType<void, ColorThemeKind> = { method: `${_preFix}/getCurrentThemeKind` };
export const openView: NotificationType<OpenViewRequest> = { method: `${_preFix}/openView` };
export const reloadWindow: RequestType<void, void> = { method: `${_preFix}/reloadWindow` };
export const goBack: NotificationType<void> = { method: `${_preFix}/goBack` };
export const fetchSamplesFromGithub: RequestType<void, GettingStartedData> = { method: `${_preFix}/fetchSamplesFromGithub` };
export const downloadSelectedSampleFromGithub: NotificationType<SampleDownloadRequest> = { method: `${_preFix}/downloadSelectedSampleFromGithub` };
export const addConfigurable: RequestType<AddConfigurableRequest, void> = { method: `${_preFix}/addConfigurable` };
export const getHistory: RequestType<void, HistoryEntryResponse> = { method: `${_preFix}/getHistory` };
export const addToHistory: NotificationType<HistoryEntry> = { method: `${_preFix}/addToHistory` };
export const goHome: NotificationType<void> = { method: `${_preFix}/goHome` };
export const goSelected: NotificationType<number> = { method: `${_preFix}/goSelected` };
export const toggleDisplayOverview: NotificationType<ToggleDisplayOverviewRequest> = { method: `${_preFix}/toggleDisplayOverview` };
export const goToSource: NotificationType<GoToSourceRequest> = { method: `${_preFix}/goToSource` };
export const focusOutput: NotificationType<void> = { method: `${_preFix}/focusOutput` };
export const log: NotificationType<LogRequest> = { method: `${_preFix}/log` };
export const updateContext: NotificationType<UpdateContextRequest> = { method: `${_preFix}/updateContext` };
export const retrieveContext: RequestType<RetrieveContextRequest, RetrieveContextResponse> = { method: `${_preFix}/retrieveContext` };
export const showNotification: RequestType<NotificationRequest, NotificationResponse> = { method: `${_preFix}/showNotification` };
export const getAvailableRuntimeServices: RequestType<void, RuntimeServicesResponse> = { method: `${_preFix}/getAvailableRuntimeServices` };
export const sendSwaggerProxyRequest: RequestType<SwaggerProxyRequest, SwaggerProxyResponse> = { method: `${_preFix}/sendSwaggerProxyRequest` };
export const openExternal: RequestType<OpenExternalRequest, OpenExternalResponse> = { method: `${_preFix}/openExternal` };
export const importOpenAPISpec: RequestType<ImportOpenAPISpecRequest, void> = { method: `${_preFix}/importOpenAPISpec` };
export const getReadmeContent: RequestType<void, ReadmeContentResponse> = { method: `${_preFix}/getReadmeContent` };
export const openReadme: NotificationType<void> = { method: `${_preFix}/openReadme` };

export const downloadJavaFromMI: RequestType<string, string> = { method: `${_preFix}/downloadJavaFromMI` };
export const downloadMI: RequestType<DownloadMIRequest, string> = { method: `${_preFix}/downloadMI` };
export const getSupportedMIVersionsHigherThan: RequestType<string, string[]> = { method: `${_preFix}/getSupportedMIVersionsHigherThan` };
export const getProjectDetails: RequestType<void, ProjectDetailsResponse> = { method: `${_preFix}/getProjectDetails` };
export const updateDependencies: RequestType<UpdateDependenciesRequest, boolean> = { method: `${_preFix}/updateDependencies` };
export const updatePomValues: RequestType<UpdatePomValuesRequest, boolean> = { method: `${_preFix}/updatePomValues` };
export const updateConfigFileValues: RequestType<UpdateConfigValuesRequest, boolean> = { method: `${_preFix}/updateConfigFileValues` };
export const updateConnectorDependencies: RequestType<void, string> = { method: `${_preFix}/updateConnectorDependencies` };
export const updateDependenciesFromOverview: RequestType<UpdateDependenciesRequest, boolean> = { method: `${_preFix}/updateDependenciesFromOverview` };
export const getProjectSetupDetails: RequestType<void, SetupDetails> = { method: `${_preFix}/getProjectSetupDetails` };
export const updateRuntimeVersionsInPom: RequestType<string, boolean> = { method: `${_preFix}/updateRuntimeVersionsInPom` };
export const setPathsInWorkSpace: RequestType<SetPathRequest, PathDetailsResponse> = { method: `${_preFix}/setPathsInWorkSpace` };
export const selectFolder: RequestType<string, string | undefined> = { method: `${_preFix}/selectFolder` };
export const updateProjectSettingsConfig: RequestType<ProjectConfig, void> = { method: `${_preFix}/updateProjectSettingsConfig` };
export const isSupportEnabled: RequestType<string, boolean> = { method: `${_preFix}/isSupportEnabled` };
export const setDeployPlugin: RequestType<MavenDeployPluginDetails, MavenDeployPluginDetails> = { method: `${_preFix}/setDeployPlugin` };
export const getDeployPluginDetails: RequestType<void, MavenDeployPluginDetails> = { method: `${_preFix}/getDeployPluginDetails` };
export const removeDeployPlugin: RequestType<void, MavenDeployPluginDetails> = { method: `${_preFix}/removeDeployPlugin` };
export const updateAiDependencies: RequestType<UpdateAiDependenciesRequest, boolean> = { method: `${_preFix}/updateAiDependencies` };
