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

import type { ComponentKind, Environment, Organization, Project } from "./common.types";

export type WebviewTypes = "NewComponentForm" | "ComponentsListActivityView" | "ComponentDetailsView" | "ChoreoCellView";

export interface NewComponentWebviewProps {
	type: "NewComponentForm";
	directoryUriPath: string;
	directoryFsPath: string;
	directoryName: string;
	organization: Organization;
	project: Project;
	existingComponents: ComponentKind[];
	initialValues?: { type?: string; buildPackLang?: string; name?: string };
}

export interface ComponentsDetailsWebviewProps {
	type: "ComponentDetailsView";
	organization: Organization;
	project: Project;
	component: ComponentKind;
	directoryFsPath?: string;
	initialEnvs: Environment[];
}

export interface ComponentsListActivityViewProps {
	type: "ComponentsListActivityView";
	directoryFsPath?: string;
}

export type WebviewProps = ComponentsDetailsWebviewProps | NewComponentWebviewProps | ComponentsListActivityViewProps;
