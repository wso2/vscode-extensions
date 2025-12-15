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

import type { GetCliRpcResp } from "@wso2/wso2-platform-core";
import { type ExtensionContext, type StatusBarItem, extensions } from "vscode";
import type { WSO2AuthenticationProvider } from "./auth/wso2-auth-provider";
import type { PlatformExtensionApi } from "./PlatformExtensionApi";
import type { ChoreoRPCClient } from "./choreo-rpc";

// TODO: move into seperate type file along with PlatformExtensionApi
export class ExtensionVariables {
	public context!: ExtensionContext;
	public api!: PlatformExtensionApi;
	public statusBarItem!: StatusBarItem;
	public config?: GetCliRpcResp;
	public choreoEnv: string;
	public isChoreoExtInstalled: boolean;
	public isDevantCloudEditor: boolean;
	public authProvider?: WSO2AuthenticationProvider;

	public constructor() {
		this.choreoEnv = "prod";
		this.isDevantCloudEditor = !!process.env.CLOUD_STS_TOKEN;
		this.isChoreoExtInstalled = !!extensions.getExtension("wso2.choreo");
	}

	public clients!: {
		rpcClient: ChoreoRPCClient;
	};
}

export const ext = new ExtensionVariables();
