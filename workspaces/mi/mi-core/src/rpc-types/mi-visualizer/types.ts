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
import { AIVisualizerLocation, EVENT_TYPE, POPUP_EVENT_TYPE, PopupVisualizerLocation, VisualizerLocation } from "../../state-machine-types";
import { Range as STRange } from "../../../../syntax-tree/lib/src"
import { TextEdit } from "vscode-languageserver-types";

export interface WorkspacesResponse {
    workspaces: WorkspaceFolder[];
}

export interface WorkspaceFolder {
    index: number;
    name: string;
    fsPath: string;
}

export interface Range {
    start: {
        line: number;
        column: number;
    };
    end: {
        line: number;
        column: number;
    };
}

export interface ProjectStructureRequest {
    documentUri?: string;
}

export interface ProjectStructureResponse {
    directoryMap: {
        src: {
            main: {
                test: ProjectDirectoryMap,
                wso2mi: {
                    artifacts: {
                        apis: ProjectStructureArtifactResponse[],
                        dataServices: ProjectStructureArtifactResponse[],
                        dataSources: ProjectStructureArtifactResponse[],
                        endpoints: ProjectStructureArtifactResponse[],
                        inboundEndpoints: ProjectStructureArtifactResponse[],
                        localEntries: ProjectStructureArtifactResponse[],
                        messageProcessors: ProjectStructureArtifactResponse[],
                        messageStores: ProjectStructureArtifactResponse[],
                        proxyServices: ProjectStructureArtifactResponse[],
                        sequences: ProjectStructureArtifactResponse[],
                        tasks: ProjectStructureArtifactResponse[],
                        templates: ProjectStructureArtifactResponse[],
                    },
                    resources: {
                        connectors: ProjectStructureArtifactResponse[],
                        metadata: ProjectStructureArtifactResponse[],
                        registry: ProjectStructureArtifactResponse[],
                    },
                }
            }
        }
    };
}

export interface TreeViewStructureArtifactsResponse {
    APIs: ProjectStructureArtifactResponse[],
    Triggers: ProjectStructureArtifactResponse[],
    'Scheduled Tasks': ProjectStructureArtifactResponse[],
    'Data Integration': DataIntegrationResponse,
    'Common Artifacts': CommonArtifactsResponse[],
    'Advanced Artifacts': AdvancedArtifactsResponse[]
}

export interface ProjectStructureArtifactResponse {
    name: string;
    path: string;
    type: string;
}

export interface ProjectDetailsResponse {
    primaryDetails: PrimaryDetails;
    buildDetails: BuildDetails;
    dependencies: DependenciesDetails;
    unitTest: UnitTestDetails;
    configurables: PomNodeDetails[];
    advanced: AdvancedProjectDetails;
}

export interface AdvancedProjectDetails {
    isLegacyExpressionEnabled: boolean;
}

export interface PomNodeDetails {
    value: string;
    key?: string;
    displayValue?: string;
    range?: STRange | STRange[];
}

export interface PrimaryDetails {
    projectName: PomNodeDetails;
    projectVersion: PomNodeDetails;
    projectDescription: PomNodeDetails;
    runtimeVersion: PomNodeDetails;
    projectPackaging: PomNodeDetails;
}

export interface BuildDetails {
    dockerDetails: DockerDetails;
    advanceDetails: AdvanceDetails;
}

export interface DockerDetails {
    dockerFileBaseImage: PomNodeDetails;
    dockerName: PomNodeDetails;
    cipherToolEnable: PomNodeDetails;
    keyStoreName: PomNodeDetails;
    keyStorePassword: PomNodeDetails;
    keyStoreAlias: PomNodeDetails;
    keyStoreType: PomNodeDetails;
}

export interface AdvanceDetails {
    projectGroupId: PomNodeDetails;
    projectArtifactId: PomNodeDetails;
    pluginDetails: PluginDetatils;
}

export interface PluginDetatils {
    projectBuildPluginVersion: PomNodeDetails;
    miContainerPluginVersion: PomNodeDetails;
    unitTestPluginVersion: PomNodeDetails;
}

export interface DependenciesDetails {
    connectorDependencies: DependencyDetails[];
    otherDependencies: DependencyDetails[];
}

export interface DependencyDetails {
    groupId: string;
    artifact: string;
    version: string;
    type?: "zip" | "jar";
    range?: STRange;
}

export interface UnitTestDetails {
    skipTest: PomNodeDetails;
    serverPath: PomNodeDetails;
    serverPort: PomNodeDetails;
    serverVersion: PomNodeDetails;
    serverHost: PomNodeDetails;
    serverType: PomNodeDetails;
    serverDownloadLink: PomNodeDetails;
}

export interface UpdatePomValuesRequest {
    pomValues: PomNodeDetails[];
}

export interface UpdateConfigValuesRequest {
    configValues: PomNodeDetails[];
}

export interface UpdateDependenciesRequest {
    dependencies: DependencyDetails[];
}

export interface UpdateConfigValuesResponse {
    textEdits: TextEdit[];
}

export interface UpdateDependenciesResponse {
    textEdits: TextEdit[];
}

export interface DataIntegrationResponse {
    'Data Sources': ProjectStructureArtifactResponse[];
    'Data Servies': ProjectStructureArtifactResponse[];
    path: string;
}

export interface CommonArtifactsResponse {
    'Sequences': ProjectStructureArtifactResponse[];
    'Connections': ProjectStructureArtifactResponse[];
    'Data Mappers': ProjectStructureArtifactResponse[];
    'Class Mediators': ProjectStructureArtifactResponse[];
    path: string;
}

export interface AdvancedArtifactsResponse {
    'Proxy Services': ProjectStructureArtifactResponse[];
    'Endpoints': ProjectStructureArtifactResponse[];
    'Message Stores': ProjectStructureArtifactResponse[];
    'Message Processors': ProjectStructureArtifactResponse[];
    'Local Entries': ProjectStructureArtifactResponse[];
    'Templates': ProjectStructureArtifactResponse[];
    path: string;
}

export interface ProjectDirectoryMap {
    [key: string]: ProjectStructureEntry[];
}

export interface EsbDirectoryMap {
    esbConfigs: ProjectDirectoryMap,
    name: string,
    path: string,
    type: string
}

export interface ProjectStructureEntry {
    resources?: ResourceStructureEntry[],
    sequences?: ProjectStructureEntry[],
    endpoints?: ProjectStructureEntry[],
    type: string,
    subType?: string,
    name: string,
    path: string,
    isRegistryResource?: boolean
}

export interface RegistryStructureEntry {
    type: string,
    name: string,
    path: string,
}

export interface ResourceStructureEntry {
    uriTemplate: string,
    urlMapping: string,
    method: string
}

export interface RegistryResourcesFolder {
    name: string,
    path: string,
    files: RegistryResourceFile[];
    folders: RegistryResourcesFolder[];
}

export interface RegistryResourceFile {
    name: string,
    path: string
}

export interface GettingStartedSample {
    category: number;
    priority: number;
    title: string;
    description: string;
    zipFileName: string;
    isAvailable?: boolean;
}

export interface GettingStartedCategory {
    id: number;
    title: string;
    icon: string;
}
export interface GettingStartedData {
    categories: GettingStartedCategory[];
    samples: GettingStartedSample[];
}
export interface SampleDownloadRequest {
    zipFileName: string;
}

export interface AddConfigurableRequest {
    projectUri: string;
    configurableName: string;
    configurableType: string;
}

export interface OpenViewRequest {
    type: EVENT_TYPE | POPUP_EVENT_TYPE;
    location: VisualizerLocation | AIVisualizerLocation | PopupVisualizerLocation;
    isPopup?: boolean;
}

export interface HistoryEntryResponse {
    history: HistoryEntry[];
}

export interface ToggleDisplayOverviewRequest {
    displayOverview: boolean;
}

export interface GoToSourceRequest {
    filePath: string;
    position?: Range;
}

export interface LogRequest {
    message: string;
}

type ContextType = "workspace" | "global";

export interface UpdateContextRequest {
    key: string;
    value: unknown;
    contextType?: ContextType;
}

export interface RetrieveContextRequest {
    key: string;
    contextType?: ContextType;
}

export interface RetrieveContextResponse {
    value: unknown;
}

type NotificationType = "info" | "warning" | "error";

export interface NotificationRequest {
    message: string;
    options?: string[];
    type?: NotificationType;
}

export interface RuntimeServiceDetails {
    count: number;
    list: unknown;
}

export interface Request {
    url: string;
    headers: string;
    method: string;
    body?: string;
}

export interface Response {
    status: number;
    statusText: string;
    data?: string;
    text?: string;
    body?: string;
    obj?: string;
    headers?: Record<string, string>;
}

export interface SwaggerProxyRequest {
    command: string;
    request: Request;
}

export interface SwaggerProxyResponse {
    isResponse: boolean;
    response?: Response;
}

export interface ImportOpenAPISpecRequest {
    filePath: string;
}

export interface RuntimeServicesResponse {
    api: RuntimeServiceDetails | undefined;
    proxy: RuntimeServiceDetails | undefined;
    dataServices: RuntimeServiceDetails | undefined;
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

export interface ProjectOverviewResponse {
    name: string;
    connections: Connection[];
    entrypoints: Entrypoint[];
    projectDetails: ProjectDetailsResponse;
}

export interface Connection {
    name: string;
}

export interface Entrypoint {
    id: string;
    name: string;
    type: string;
    path: string;
    dependencies: string[];
    connections: string[];
}
export interface ReadmeContentResponse {
    content: string;
}
export interface PathDetailsResponse {
    path?: string;
    status: "valid" | "valid-not-updated" | "mismatch" | "not-valid";
    version?: string;
}
export interface SetPathRequest {
    projectUri: string;
    type: "JAVA" | "MI";
    path: string;
}
export interface SetupDetails {
    miVersionStatus?: "valid" | "missing" | "not-valid";
    miVersionFromPom?: string;
    miDetails: PathDetailsResponse;
    javaDetails: PathDetailsResponse;
    showDownloadButtons?: boolean;
    recommendedVersions?: { miVersion: string, javaVersion: string }
}

export interface DownloadMIRequest {
    version: string;
    isUpdatedPack: boolean;
}

export interface UpdateAiDependenciesRequest {
    dependencies: DependencyDetails[];
    operation: "add" | "remove";
}

export interface UpdateAiDependenciesResponse {
    textEdits: TextEdit[];
}

export interface MavenDeployPluginDetails {
    truststorePath?: string;
    truststorePassword?: string;
    truststoreType?: string;
    serverUrl?: string;
    username?: string;
    password?: string;
    serverType?: string;
    content?: string;
    range?: Range;
}

export interface ProjectConfig {
    configName: string;
    value: boolean;
}

export interface UpdateAiDependenciesRequest {
    dependencies: DependencyDetails[];
    operation: "add" | "remove";
}

export interface UpdateAiDependenciesResponse {
    textEdits: TextEdit[];
}
