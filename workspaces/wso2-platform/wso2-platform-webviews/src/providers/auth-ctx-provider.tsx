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
import { ErrorBanner, ProgressIndicator } from "@wso2/ui-toolkit";
import type { UserInfo } from "@wso2/wso2-platform-core";
import React, { type FC, type ReactNode, useContext, useEffect } from "react";
import { ChoreoWebViewAPI } from "../utilities/vscode-webview-rpc";
import { SignInView } from "../views/SignInView";

interface IAuthContext {
	userInfo: UserInfo | null;
}

const defaultContext: IAuthContext = {
	userInfo: null,
};

const ChoreoAuthContext = React.createContext(defaultContext);

export const useAuthContext = () => {
	return useContext(ChoreoAuthContext) || defaultContext;
};

interface Props {
	children: ReactNode;
	viewType?: string;
}

export const AuthContextProvider: FC<Props> = ({ children, viewType }) => {
	const queryClient = useQueryClient();

	const {
		data: authState,
		error: authStateError,
		isLoading,
	} = useQuery({
		queryKey: ["auth_state"],
		queryFn: () => ChoreoWebViewAPI.getInstance().getAuthState(),
		refetchOnWindowFocus: true,
	});

	useEffect(() => {
		ChoreoWebViewAPI.getInstance().onAuthStateChanged((authState) => {
			queryClient.setQueryData(["auth_state"], authState);
		});
	}, []);

	return (
		<ChoreoAuthContext.Provider value={{ userInfo: authState?.userInfo || null }}>
			{authStateError ? (
				<ErrorBanner errorMsg="Failed to authenticate user" />
			) : (
				<>
					{isLoading ? (
						<ProgressIndicator />
					) : (
						<>{authState?.userInfo ? children : <SignInView className={!viewType?.includes("ActivityView") && "py-6"} />}</>
					)}
				</>
			)}
		</ChoreoAuthContext.Provider>
	);
};
