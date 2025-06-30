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
    GoToSourceRequest,
    HistoryEntry,
    LogRequest,
    NotificationRequest,
    OpenExternalRequest,
    OpenViewRequest,
    ProjectStructureRequest,
    RetrieveContextRequest,
    SampleDownloadRequest,
    SwaggerProxyRequest,
    ToggleDisplayOverviewRequest,
    UpdateContextRequest,
    AddConfigurableRequest,
    addToHistory,
    downloadSelectedSampleFromGithub,
    fetchSamplesFromGithub,
    focusOutput,
    getAvailableRuntimeServices,
    getCurrentThemeKind,
    addConfigurable,
    getHistory,
    getProjectOverview,
    getProjectStructure,
    getReadmeContent,
    getWorkspaces,
    goBack,
    goHome,
    goSelected,
    goToSource,
    isSupportEnabled,
    log,
    openExternal,
    openReadme,
    openView,
    reloadWindow,
    retrieveContext,
    sendSwaggerProxyRequest,
    showNotification,
    downloadJavaFromMI,
    downloadMI,
    getSupportedMIVersionsHigherThan,
    toggleDisplayOverview,
    updateContext,
    getProjectDetails,
    updateDependencies,
    updatePomValues,
    updateConfigFileValues,
    UpdateDependenciesRequest,
    UpdatePomValuesRequest,
    UpdateConfigValuesRequest,
    importOpenAPISpec,
    updateConnectorDependencies,
    ImportOpenAPISpecRequest,
    updateRuntimeVersionsInPom,
    getProjectSetupDetails,
    setPathsInWorkSpace,
    selectFolder,
    SetPathRequest,
    updateProjectSettingsConfig,
    updateDependenciesFromOverview,
    DownloadMIRequest,
    updateAiDependencies,
    UpdateAiDependenciesRequest,
    UpdateAiDependenciesResponse,
    ProjectConfig,
    MavenDeployPluginDetails,
    setDeployPlugin,
    getDeployPluginDetails,
    removeDeployPlugin
} from "@wso2/mi-core";
import { Messenger } from "vscode-messenger";
import { MiVisualizerRpcManager } from "./rpc-manager";

export function registerMiVisualizerRpcHandlers(messenger: Messenger, projectUri: string): void {
    const rpcManger = new MiVisualizerRpcManager(projectUri);
    messenger.onRequest(getWorkspaces, () => rpcManger.getWorkspaces());
    messenger.onRequest(getProjectStructure, (args: ProjectStructureRequest) => rpcManger.getProjectStructure(args));
    messenger.onRequest(getProjectOverview, (args: ProjectStructureRequest) => rpcManger.getProjectOverview(args));
    messenger.onRequest(getCurrentThemeKind, () => rpcManger.getCurrentThemeKind());
    messenger.onNotification(openView, (args: OpenViewRequest) => rpcManger.openView(args));
    messenger.onNotification(reloadWindow, () => rpcManger.reloadWindow());
    messenger.onNotification(goBack, () => rpcManger.goBack());
    messenger.onRequest(fetchSamplesFromGithub, () => rpcManger.fetchSamplesFromGithub());
    messenger.onNotification(downloadSelectedSampleFromGithub, (args: SampleDownloadRequest) => rpcManger.downloadSelectedSampleFromGithub(args));
    messenger.onRequest(addConfigurable, (args: AddConfigurableRequest) => rpcManger.addConfigurable(args));
    messenger.onRequest(getHistory, () => rpcManger.getHistory());
    messenger.onNotification(addToHistory, (args: HistoryEntry) => rpcManger.addToHistory(args));
    messenger.onNotification(goHome, () => rpcManger.goHome());
    messenger.onNotification(goSelected, (args: number) => rpcManger.goSelected(args));
    messenger.onNotification(toggleDisplayOverview, (args: ToggleDisplayOverviewRequest) => rpcManger.toggleDisplayOverview(args));
    messenger.onNotification(goToSource, (args: GoToSourceRequest) => rpcManger.goToSource(args));
    messenger.onNotification(focusOutput, () => rpcManger.focusOutput());
    messenger.onNotification(log, (args: LogRequest) => rpcManger.log(args));
    messenger.onNotification(updateContext, (args: UpdateContextRequest) => rpcManger.updateContext(args));
    messenger.onRequest(retrieveContext, (args: RetrieveContextRequest) => rpcManger.retrieveContext(args));
    messenger.onRequest(showNotification, (args: NotificationRequest) => rpcManger.showNotification(args));
    messenger.onRequest(getAvailableRuntimeServices, () => rpcManger.getAvailableRuntimeServices());
    messenger.onRequest(sendSwaggerProxyRequest, (args: SwaggerProxyRequest) => rpcManger.sendSwaggerProxyRequest(args));
    messenger.onRequest(openExternal, (args: OpenExternalRequest) => rpcManger.openExternal(args));
    messenger.onRequest(getReadmeContent, () => rpcManger.getReadmeContent());
    messenger.onNotification(openReadme, () => rpcManger.openReadme());
    messenger.onRequest(downloadJavaFromMI, (args: string) => rpcManger.downloadJavaFromMI(args));
    messenger.onRequest(downloadMI, (args: DownloadMIRequest) => rpcManger.downloadMI(args));
    messenger.onRequest(getSupportedMIVersionsHigherThan, (args: string) => rpcManger.getSupportedMIVersionsHigherThan(args));
    messenger.onRequest(getProjectDetails, () => rpcManger.getProjectDetails());
    messenger.onRequest(updateDependencies, (args: UpdateDependenciesRequest) => rpcManger.updateDependencies(args));
    messenger.onRequest(updatePomValues, (args: UpdatePomValuesRequest) => rpcManger.updatePomValues(args));
    messenger.onRequest(updateConfigFileValues, (args: UpdateConfigValuesRequest) => rpcManger.updateConfigFileValues(args));
    messenger.onRequest(updateConnectorDependencies, () => rpcManger.updateConnectorDependencies());
    messenger.onRequest(updateDependenciesFromOverview, (args: UpdateDependenciesRequest) => rpcManger.updateDependenciesFromOverview(args));
    messenger.onRequest(importOpenAPISpec, (args: ImportOpenAPISpecRequest) => rpcManger.importOpenAPISpec(args));
    messenger.onRequest(getProjectSetupDetails, () => rpcManger.getProjectSetupDetails());
    messenger.onRequest(updateRuntimeVersionsInPom, (args: string) => rpcManger.updateRuntimeVersionsInPom(args));
    messenger.onRequest(setPathsInWorkSpace, (args: SetPathRequest) => rpcManger.setPathsInWorkSpace(args));
    messenger.onRequest(selectFolder, (args: string) => rpcManger.selectFolder(args));
    messenger.onRequest(updateProjectSettingsConfig, (args: ProjectConfig) => rpcManger.updateProjectSettingsConfig(args));
    messenger.onRequest(isSupportEnabled, (args: string) => rpcManger.isSupportEnabled(args));
    messenger.onRequest(setDeployPlugin, (args: MavenDeployPluginDetails) => rpcManger.setDeployPlugin(args));
    messenger.onRequest(getDeployPluginDetails, () => rpcManger.getDeployPluginDetails());
    messenger.onRequest(removeDeployPlugin, () => rpcManger.removeDeployPlugin());
    messenger.onRequest(updateAiDependencies, (args: UpdateAiDependenciesRequest) => rpcManger.updateAiDependencies(args));
    messenger.onRequest(updateAiDependencies, (args: UpdateAiDependenciesRequest) => rpcManger.updateAiDependencies(args));
}
