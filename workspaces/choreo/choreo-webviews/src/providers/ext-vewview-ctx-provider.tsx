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

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WebviewState } from "@wso2/choreo-core";
import React, { type FC, type ReactNode, useContext, useEffect } from "react";
import { ChoreoWebViewAPI } from "../utilities/vscode-webview-rpc";

const defaultContext: WebviewState = { openedComponentKey: "", componentViews: {}, choreoEnv: "prod" };

const ExtWebviewContext = React.createContext(defaultContext);

export const useExtWebviewContext = () => {
	return useContext(ExtWebviewContext);
};

interface Props {
	children: ReactNode;
}

export const ExtWebviewContextProvider: FC<Props> = ({ children }) => {
	const queryClient = useQueryClient();

	const { data: webviewContext } = useQuery({
		queryKey: ["webview_context"],
		queryFn: () => ChoreoWebViewAPI.getInstance().getWebviewStoreState(),
		refetchOnWindowFocus: true,
	});

	useEffect(() => {
		ChoreoWebViewAPI.getInstance().onWebviewStateChanged((webviewState) => {
			queryClient.setQueryData(["webview_context"], webviewState);
		});
	}, []);

	return <ExtWebviewContext.Provider value={webviewContext}>{children}</ExtWebviewContext.Provider>;
};
