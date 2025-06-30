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

import type { AuthState, Organization, UserInfo } from "@wso2/choreo-core";
import { createStore } from "zustand";
import { persist } from "zustand/middleware";
import { ext } from "../extensionVariables";
import { contextStore } from "./context-store";
import { dataCacheStore } from "./data-cache-store";
import { getGlobalStateStore } from "./store-utils";

interface AuthStore {
	state: AuthState;
	resetState: () => void;
	loginSuccess: (userInfo: UserInfo) => void;
	logout: () => Promise<void>;
	initAuth: () => Promise<void>;
}

const initialState: AuthState = { userInfo: null };

export const authStore = createStore(
	persist<AuthStore>(
		(set, get) => ({
			state: initialState,
			resetState: () => set(() => ({ state: initialState })),
			loginSuccess: (userInfo) => {
				dataCacheStore.getState().setOrgs(userInfo.organizations);
				set(({ state }) => ({ state: { ...state, userInfo } }));
				contextStore.getState().refreshState();
			},
			logout: async () => {
				get().resetState();
				ext.clients.rpcClient.signOut().catch(() => {
					// ignore error
				});
			},
			initAuth: async () => {
				try {
					const userInfo = await ext.clients.rpcClient.getUserInfo();
					if (userInfo) {
						get().loginSuccess(userInfo);
						const contextStoreState = contextStore.getState().state;
						if (contextStoreState.selected?.org) {
							ext?.clients?.rpcClient?.changeOrgContext(contextStoreState.selected?.org?.id?.toString());
						}
					} else {
						get().logout();
					}
				} catch (err) {
					get().logout();
				}
			},
		}),
		getGlobalStateStore("auth-zustand-storage"),
	),
);

export const waitForLogin = async (): Promise<UserInfo> => {
	return new Promise((resolve) => {
		authStore.subscribe(({ state }) => {
			if (state.userInfo) {
				resolve(state.userInfo);
			}
		});
	});
};
