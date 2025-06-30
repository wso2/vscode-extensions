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

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider, type PersistedClient, type Persister } from "@tanstack/react-query-persist-client";
import React from "react";
import { ChoreoWebViewAPI } from "../utilities/vscode-webview-rpc";

/** Persist data within vscode workspace cache  */
const webviewStatePersister = (queryBaseKey: string) => {
	return {
		persistClient: async (client: PersistedClient) => {
			ChoreoWebViewAPI.getInstance().setWebviewCache(queryBaseKey, client);
		},
		restoreClient: async () => {
			const cache = await ChoreoWebViewAPI.getInstance().restoreWebviewCache(queryBaseKey);
			return cache;
		},
		removeClient: async () => {
			await ChoreoWebViewAPI.getInstance().clearWebviewCache(queryBaseKey);
		},
	} as Persister;
};

export const ChoreoWebviewQueryClientProvider = ({ type, children }: { type: string; children: React.ReactNode }) => {
	return (
		<PersistQueryClientProvider
			client={
				new QueryClient({
					defaultOptions: {
						queries: {
							cacheTime: 1000 * 60 * 60 * 24 * 7 * 31, // 1 month
							retry: false,
							refetchOnWindowFocus: false,
						},
					},
				})
			}
			persistOptions={{
				persister: webviewStatePersister(`react-query-persister-${type}`),
				buster: "choreo-webview-cache-v2",
			}}
		>
			{children}
		</PersistQueryClientProvider>
	);
};
