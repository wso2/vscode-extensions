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

import type { Project } from "@wso2/choreo-core";
import { EventEmitter } from "vscode";

interface IChoreoExtensionAPI {
	/** Deprecated function. Exists due to backward compatibility with Ballerina extension */
	waitForLogin(): Promise<boolean>;
	/** Deprecated function. Exists due to backward compatibility with Ballerina extension */
	getChoreoProject(): Promise<Project | undefined>;
	/** Deprecated function. Exists due to backward compatibility with Ballerina extension */
	isChoreoProject(): Promise<boolean>;
	/** Deprecated function. Exists due to backward compatibility with Ballerina extension */
	enrichChoreoMetadata(model: Map<string, any>): Promise<Map<string, any> | undefined>;
	/** Deprecated function. Exists due to backward compatibility with Ballerina extension */
	getNonBalComponentModels(): Promise<{ [key: string]: any }>;
	/** Deprecated function. Exists due to backward compatibility with Ballerina extension */
	deleteComponent(projectId: string, path: string): Promise<void>;
}

export class ChoreoExtensionApi implements IChoreoExtensionAPI {
	private _onRefreshWorkspaceMetadata = new EventEmitter();
	public onRefreshWorkspaceMetadata = this._onRefreshWorkspaceMetadata.event;

	public async waitForLogin() {
		return false;
	}

	public async getChoreoProject() {
		return undefined;
	}

	public async isChoreoProject() {
		return false;
	}

	public async enrichChoreoMetadata() {
		return undefined;
	}

	public async getNonBalComponentModels() {
		return {};
	}

	public async deleteComponent() {}
}
