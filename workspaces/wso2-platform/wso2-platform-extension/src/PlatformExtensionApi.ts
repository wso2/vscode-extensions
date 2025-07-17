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

import type { ComponentKind, IWso2PlatformExtensionAPI, openClonedDirReq } from "@wso2/wso2-platform-core";
import { ext } from "./extensionVariables";
import { hasDirtyRepo } from "./git/util";
import { authStore } from "./stores/auth-store";
import { contextStore } from "./stores/context-store";
import { webviewStateStore } from "./stores/webview-state-store";
import { openClonedDir } from "./uri-handlers";
import { isSamePath } from "./utils";
export class PlatformExtensionApi implements IWso2PlatformExtensionAPI {
	public isLoggedIn = () => !!authStore.getState().state?.userInfo;
	public getDirectoryComponents = (fsPath: string) =>
		(contextStore
			.getState()
			.state?.components?.filter((item) => isSamePath(item?.componentFsPath, fsPath))
			?.map((item) => item?.component)
			?.filter((item) => !!item) as ComponentKind[]) ?? [];
	public localRepoHasChanges = (fsPath: string) => hasDirtyRepo(fsPath, ext.context, ["context.yaml"]);
	public getWebviewStateStore = () => webviewStateStore.getState().state;
	public getContextStateStore = () => contextStore.getState().state;
	public openClonedDir = (params: openClonedDirReq) => openClonedDir(params);
}
