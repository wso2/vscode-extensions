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

import { useQuery } from "@tanstack/react-query";
import { ErrorBanner, ProgressIndicator } from "@wso2/ui-toolkit";
import React, { type FC, type ReactNode, useContext } from "react";
import { ChoreoWebViewAPI } from "../utilities/vscode-webview-rpc";
import { SignInView } from "../views/SignInView";

interface IAuthContext {
	isLoggedIn: boolean | null;
}

const defaultContext: IAuthContext = {
	isLoggedIn: false,
};

const ChoreoAuthContext = React.createContext(defaultContext);

export const useAuthContext = () => {
	return useContext(ChoreoAuthContext);
};

interface Props {
	children: ReactNode;
}

export const AuthContextProvider: FC<Props> = ({ children }) => {

	const {
		data: isLoggedIn = false,
		error: authStateError,
		isLoading,
	} = useQuery({
		queryKey: ["auth_state"],
		queryFn: () => ChoreoWebViewAPI.getInstance().isLoggedIn(),
		refetchOnWindowFocus: true,
		refetchInterval: 2000,
	});


	return (
		<ChoreoAuthContext.Provider value={{ isLoggedIn }}>
			{authStateError ? (
				<ErrorBanner errorMsg="Failed to authenticate user" />
			) : (
				<>
					{isLoading ? (
						<ProgressIndicator />
					) : (
						<>{isLoggedIn ? children : <SignInView />}</>
					)}
				</>
			)}
		</ChoreoAuthContext.Provider>
	);
};
