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

import type { ContextStoreState, IWso2PlatformExtensionAPI, WebviewState } from "@wso2/wso2-platform-core";
import { extensions } from "vscode";
import { getLogger } from "./logger/logger";

export const getIsLoggedIn = async () => {
	try {
		const platformExt = extensions.getExtension("wso2.wso2-platform");
		if (!platformExt) {
			return false;
		}
		if (!platformExt.isActive) {
			await platformExt.activate();
		}
		const platformExtAPI: IWso2PlatformExtensionAPI = platformExt.exports;
		return platformExtAPI.isLoggedIn();
	} catch (err) {
		getLogger().error("failed to get isLoggedIn", err);
		return false;
	}
};

export const getWebviewStateStore = async () => {
	try {
		const platformExt = extensions.getExtension("wso2.wso2-platform");
		if (!platformExt) {
			return {} as WebviewState;
		}
		if (!platformExt.isActive) {
			await platformExt.activate();
		}
		const platformExtAPI: IWso2PlatformExtensionAPI = platformExt.exports;
		return platformExtAPI.getWebviewStateStore();
	} catch (err) {
		getLogger().error("failed to getWebviewStateStore", err);
		return {} as WebviewState;
	}
};

export const getContextStateStore = async () => {
	try {
		const platformExt = extensions.getExtension("wso2.wso2-platform");
		if (!platformExt) {
			return {} as ContextStoreState;
		}
		if (!platformExt.isActive) {
			await platformExt.activate();
		}
		const platformExtAPI: IWso2PlatformExtensionAPI = platformExt.exports;
		return platformExtAPI.getContextStateStore();
	} catch (err) {
		getLogger().error("failed to getContextStateStore", err);
		return {} as ContextStoreState;
	}
};
