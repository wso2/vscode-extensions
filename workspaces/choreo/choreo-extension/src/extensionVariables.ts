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

import type { ExtensionContext, StatusBarItem } from "vscode";
import type { ChoreoExtensionApi } from "./ChoreoExtensionApi";

// TODO: move into seperate type file along with ChoreoExtensionAPI
export class ExtensionVariables {
	public context!: ExtensionContext;
	public api!: ChoreoExtensionApi;
	public statusBarItem!: StatusBarItem;
	// biome-ignore lint/complexity/noBannedTypes: No clients available atm
	public clients!: {};
}

export const ext = new ExtensionVariables();
