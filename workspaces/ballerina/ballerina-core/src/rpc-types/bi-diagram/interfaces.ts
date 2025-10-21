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

import { LineRange } from "../../interfaces/common";
import { DIRECTORY_MAP, Flow, OverviewFlow } from "../../interfaces/bi";
import { BallerinaProjectComponents } from "../../interfaces/extended-lang-client";
import { RemoteFunction, ServiceType } from "../../interfaces/ballerina";
import { ImportInfo } from "../ai-panel/interfaces";

export interface ProjectRequest {
    projectName: string;
    packageName: string;
    projectPath: string;
    createDirectory: boolean;
    createAsWorkspace?: boolean;
    workspaceName?: string;
    orgName?: string;
    version?: string;
}

export interface AddProjectToWorkspaceRequest {
    projectName: string;
    packageName: string;
    path: string;
    convertToWorkspace?: boolean;
    workspaceName?: string;
    orgName?: string;
    version?: string;
}

export interface WorkspacesResponse {
    workspaces: WorkspaceFolder[];
}

export interface WorkspaceFolder {
    index: number;
    name: string;
    fsPath: string;
}

export interface ComponentRequest {
    type: DIRECTORY_MAP | "testFunctions";
    serviceType?: ComponentServiceType;
    functionType?: ComponentFunctionType;
}

export interface ComponentServiceType {
    name: string;
    path: string;
    port: string;
    specPath?: string;
}
export interface ComponentFunctionType {
    name?: string;
    parameters: FunctionParameters[],
    returnType?: string;
    cron?: string;
    isExpressionBodied?: boolean;
}

export interface FunctionField {
    required: boolean;
    checked?: boolean;
    radioValues?: string[];
    serviceType?: ServiceType;
    functionType?: RemoteFunction;
}

export interface FunctionParameters {
    type: string;
    name: string;
    defaultValue?: string;
}
export interface CreateComponentResponse {
    response: boolean,
    error: string
}

export interface ProjectComponentsResponse {
    components: BallerinaProjectComponents
}

export interface RecordsInWorkspaceMentions {
    mentions: string[]
}

export interface ReadmeContentRequest {
    read: boolean
    content?: string;
}

export interface ReadmeContentResponse {
    content: string;
}

export interface BIAiSuggestionsRequest {
    position: LineRange;
    filePath: string;
    prompt?: string;
}
export interface BIAiSuggestionsResponse {
    flowModel: Flow;
    suggestion: string;
    overviewFlow?: OverviewFlow;
}
export interface ComponentsRequest {
    overviewFlow: OverviewFlow
}

export interface ComponentsResponse {
    response: boolean;
}

export interface BreakpointPosition {
    line: number;
    column?: number;
}
export interface BreakpointRequest {
    filePath: string;
    breakpoint: BreakpointPosition;
}

export interface Source {
    name?: string;
    path?: string;
}

export interface BreakpointData {
    verified: boolean;
    source?: Source;
    line?: number;
    column?: number;
}

export interface CurrentBreakpointsResponse {
    breakpoints: BreakpointData[];
    activeBreakpoint?: BreakpointData;
}

export interface AIChatRequest {
    scafold: boolean;
    readme: boolean;
}

export interface ImportStatements {
    filePath: string;
    statements: ImportInfo[];
}

export interface FormDidOpenParams {
    filePath: string;
}

export interface FormDidCloseParams {
    filePath: string;
}

export interface EndOfFileRequest {
    filePath: string;
}
export enum BuildMode {
    JAR = "jar",
    DOCKER = "docker"
}

export interface DevantMetadata {
    isLoggedIn?: boolean;
    hasComponent?: boolean;
    hasLocalChanges?: boolean;
}

export interface GeneratedClientSaveResponse {
    errorMessage?: string;
}
