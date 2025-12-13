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

import type { AuthState, ComponentKind, ContextItemEnriched, ContextStoreComponentState, IWso2PlatformExtensionAPI, openClonedDirReq } from "@wso2/wso2-platform-core";
import { ext } from "./extensionVariables";
import { hasDirtyRepo } from "./git/util";
import { authStore } from "./stores/auth-store";
import { contextStore } from "./stores/context-store";
import { webviewStateStore } from "./stores/webview-state-store";
import { openClonedDir } from "./uri-handlers";
import { isSamePath } from "./utils";

export class PlatformExtensionApi implements IWso2PlatformExtensionAPI {
	private getComponentsOfDir = (fsPath: string, components?: ContextStoreComponentState[]) => {
		return (components?.filter((item) => isSamePath(item?.componentFsPath, fsPath))
			?.map((item) => item?.component)
			?.filter((item) => !!item) as ComponentKind[]) ?? []
	}

	public getAuthState = () => authStore.getState().state;
	public isLoggedIn = () => !!authStore.getState().state?.userInfo;
	public getDirectoryComponents = (fsPath: string) => this.getComponentsOfDir(fsPath, contextStore.getState().state?.components);
	public localRepoHasChanges = (fsPath: string) => hasDirtyRepo(fsPath, ext.context, ["context.yaml"]);
	public getWebviewStateStore = () => webviewStateStore.getState().state;
	public getContextStateStore = () => contextStore.getState().state;
	public openClonedDir = (params: openClonedDirReq) => openClonedDir(params);
	public getStsToken = () => ext.clients.rpcClient.getStsToken();
	public getSelectedContext = () => contextStore.getState().state?.selected || null;
	public getDevantConsoleUrl = async() => (await ext.clients.rpcClient.getConfigFromCli()).devantConsoleUrl;

	// Auth state subscriptions
	public subscribeAuthState = (callback: (state: AuthState)=>void) => authStore.subscribe((state)=>callback(state.state));
	public subscribeIsLoggedIn = (callback: (isLoggedIn: boolean)=>void) => authStore.subscribe((state)=>callback(!!state.state?.userInfo));

	// Context state subscriptions
	public subscribeContextState = (callback: (state: ContextItemEnriched | undefined)=>void) => contextStore.subscribe((state)=>callback(state.state?.selected));
	public subscribeDirComponents = (fsPath: string, callback: (comps: ComponentKind[])=>void) => contextStore.subscribe((state)=>callback(this.getComponentsOfDir(fsPath, state.state.components)));
}
