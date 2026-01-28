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

/** Configuration for a single component to be created */
export interface ComponentConfig {
	directoryUriPath: string;
	directoryFsPath: string;
	directoryName: string;
	initialValues?: { type?: string; subType?: string; buildPackLang?: string; name?: string };
	isNewCodeServerComp?: boolean;
}

export interface NewComponentWebviewProps {
	type: "NewComponentForm";
	organization: Organization;
	project: Project;
	existingComponents: ComponentKind[];
	extensionName?: string;
	/** Array of components to be created. For single component creation, this will contain one item. */
	components: ComponentConfig[];
}

/**
 * Flattened props type for form section components.
 * This combines the common webview props with the current component's config.
 */
export type ComponentFormSectionProps = Omit<NewComponentWebviewProps, "components"> & ComponentConfig;

export interface ComponentsDetailsWebviewProps {
	type: "ComponentDetailsView";
	organization: Organization;
	project: Project;
	component: ComponentKind;
	directoryFsPath?: string;
	initialEnvs: Environment[];
	isNewComponent?: boolean;
}

export interface ComponentsListActivityViewProps {
	type: "ComponentsListActivityView";
	directoryFsPath?: string;
}

export type WebviewProps = ComponentsDetailsWebviewProps | NewComponentWebviewProps | ComponentsListActivityViewProps;
