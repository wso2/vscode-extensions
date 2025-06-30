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

import type { ComponentViewDrawers, WebviewState } from "@wso2/choreo-core";
import { workspace } from "vscode";
import { createStore } from "zustand";

interface WebviewStateStore {
	state: WebviewState;
	setOpenedComponentKey: (openedComponentKey: string) => void;
	onCloseComponentView: (openedComponentKey: string) => void;
	onOpenComponentDrawer: (componentKey: string, drawer: ComponentViewDrawers, params?: any) => void;
	onCloseComponentDrawer: (componentKey: string) => void;
}

export const webviewStateStore = createStore<WebviewStateStore>((set) => ({
	state: { openedComponentKey: "", componentViews: {}, choreoEnv: workspace.getConfiguration().get<string>("Advanced.ChoreoEnvironment") || "prod" },
	setOpenedComponentKey: (openedComponentKey) => set(({ state }) => ({ state: { ...state, openedComponentKey } })),
	onCloseComponentView: (openedComponentKey) =>
		set(({ state }) => ({
			state: {
				...state,
				openedComponentKey: openedComponentKey === state.openedComponentKey ? "" : state.openedComponentKey,
			},
		})),
	onOpenComponentDrawer: (componentKey, openedDrawer, drawerParams) =>
		set(({ state }) => ({
			state: {
				...state,
				componentViews: { ...state.componentViews, [componentKey]: { ...state.componentViews[componentKey], openedDrawer, drawerParams } },
			},
		})),
	onCloseComponentDrawer: (componentKey) =>
		set(({ state }) => ({
			state: {
				...state,
				componentViews: {
					...state.componentViews,
					[componentKey]: { ...state.componentViews[componentKey], openedDrawer: undefined, drawerParams: undefined },
				},
			},
		})),
}));
