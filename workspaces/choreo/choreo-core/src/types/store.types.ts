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

import type { CommitHistory, ComponentKind, Environment, Organization, Project, UserInfo } from "./common.types";

export interface DataCacheState {
	orgs?: {
		[orgHandle: string]: {
			projects?: {
				[projectHandle: string]: {
					data?: Project;
					envs?: Environment[];
					components?: {
						[componentHandle: string]: {
							data?: ComponentKind;
							commits?: { [branch: string]: CommitHistory[] };
						};
					};
				};
			};
			data?: Organization;
		};
	};
	loading?: boolean;
}

export interface AuthState {
	userInfo: UserInfo | null;
}

export interface WebviewState {
	choreoEnv: string;
	openedComponentKey: string;
	componentViews: {
		[componentKey: string]: {
			openedDrawer?: string;
			// biome-ignore lint/suspicious/noExplicitAny: can be any type of data
			drawerParams?: any;
		};
	};
}

export interface ContextItem {
	project: string;
	org: string;
}

export interface ContextItemDir {
	workspaceName: string;
	contextFileFsPath: string;
	projectRootFsPath: string;
	dirFsPath: string;
}

export interface ContextItemEnriched {
	projectHandle: string;
	project?: Project;
	orgHandle: string;
	org?: Organization;
	contextDirs: ContextItemDir[];
}

export interface ContextStoreComponentState {
	component?: ComponentKind;
	workspaceName: string;
	componentFsPath: string;
	componentRelativePath: string;
}

export interface ContextStoreState {
	items: {
		[key: string]: ContextItemEnriched;
	};
	selected?: ContextItemEnriched;
	components?: ContextStoreComponentState[];
	loading?: boolean;
}

export interface LocationStoreState {
	projectLocations: {
		[projectKey: string]: {
			[fsPath: string]: ContextStoreComponentState[];
		};
	};
}
