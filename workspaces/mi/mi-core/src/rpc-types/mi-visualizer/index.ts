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

export interface MIVisualizerAPI {
    getWorkspaces: () => Promise<WorkspacesResponse>;
    getProjectStructure: (params: ProjectStructureRequest) => Promise<ProjectStructureResponse>;
    getProjectOverview: (params: ProjectStructureRequest) => Promise<ProjectOverviewResponse>;
    getCurrentThemeKind: () => Promise<ColorThemeKind>;
    openView: (params: OpenViewRequest) => void;
    reloadWindow: () => Promise<void>;
    goBack: () => void;
    fetchSamplesFromGithub: () => Promise<GettingStartedData>;
    downloadSelectedSampleFromGithub: (params: SampleDownloadRequest) => void;
    addConfigurable: (params: AddConfigurableRequest) => Promise<void>;
    getHistory: () => Promise<HistoryEntryResponse>;
    addToHistory: (params: HistoryEntry) => void;
    goHome: () => void;
    goSelected: (params: number) => void;
    toggleDisplayOverview: (params: ToggleDisplayOverviewRequest) => void;
    goToSource: (params: GoToSourceRequest) => void;
    focusOutput: () => void;
    log: (params: LogRequest) => void;
    updateContext: (params: UpdateContextRequest) => void;
    retrieveContext: (params: RetrieveContextRequest) => Promise<RetrieveContextResponse>;
    showNotification: (params: NotificationRequest) => Promise<NotificationResponse>;
    getAvailableRuntimeServices: () => Promise<RuntimeServicesResponse>;
    sendSwaggerProxyRequest: (params: SwaggerProxyRequest) => Promise<SwaggerProxyResponse>;
    openExternal: (params: OpenExternalRequest) => Promise<OpenExternalResponse>;
    getReadmeContent: () => Promise<ReadmeContentResponse>;
    openReadme: () => void;
    downloadJavaFromMI: (params: string) => Promise<string>;
    downloadMI: (params: DownloadMIRequest) => Promise<string>;
    getSupportedMIVersionsHigherThan: (param:string) => Promise<string[]>;
    getProjectDetails: () => Promise<ProjectDetailsResponse>;
    updateDependencies: (params: UpdateDependenciesRequest) => Promise<boolean>;
    updatePomValues: (params: UpdatePomValuesRequest) => Promise<boolean>;
    updateConfigFileValues: (params: UpdateConfigValuesRequest) => Promise<boolean>;
    updateConnectorDependencies: () => Promise<string>;
    updateDependenciesFromOverview: (params: UpdateDependenciesRequest) => Promise<boolean>;
    importOpenAPISpec: (params: ImportOpenAPISpecRequest) => Promise<void>;
    getProjectSetupDetails: () => Promise<SetupDetails>;
    updateRuntimeVersionsInPom: (params:string) => Promise<boolean>;
    setPathsInWorkSpace: (params: SetPathRequest) => Promise<PathDetailsResponse>;
    selectFolder: (params: string) => Promise<string | undefined>;
    updateProjectSettingsConfig: (params: ProjectConfig) => Promise<void>;
    isSupportEnabled: (configValue: string) => Promise<boolean>;
    setDeployPlugin: (params: MavenDeployPluginDetails) => Promise<MavenDeployPluginDetails>;
    getDeployPluginDetails: () => Promise<MavenDeployPluginDetails>;
    removeDeployPlugin: () => Promise<MavenDeployPluginDetails>;
    updateAiDependencies: (params: UpdateAiDependenciesRequest) => Promise<boolean>;
}
