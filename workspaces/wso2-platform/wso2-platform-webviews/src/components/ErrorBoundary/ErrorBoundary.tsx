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

import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { Component, type ErrorInfo, type FC } from "react";
import { ChoreoWebViewAPI } from "../../utilities/vscode-webview-rpc";
import { Banner } from "../Banner";

interface ErrorBoundaryCProps {
	children: React.ReactNode;
	queryClient: QueryClient;
}

interface ErrorBoundaryState {
	hasError: boolean;
	clearedCache: boolean;
}

class ErrorBoundaryC extends Component<ErrorBoundaryCProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryCProps) {
		super(props);
		this.state = {
			hasError: false,
			clearedCache: false,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		if (this.state.clearedCache === false) {
			// If an exception is thrown, clear the queryClient cache and try again
			this.props.queryClient.clear();
			this.setState({ clearedCache: true });
		} else {
			// Show the error boundary if an exception is thrown even after clearing the cache
			this.setState({ hasError: true });
			ChoreoWebViewAPI.getInstance().sendTelemetryException({ error });
			console.error(error, errorInfo);
		}
	}

	render() {
		if (this.state.hasError) {
			return <Banner type="error" className="m-6" title="Oops! Something went wrong. Please reopen this window and try again" />;
		}

		return <div key={`Error-boundary-${this.state.clearedCache ? "with" : "with-reset"}-cache`}>{this.props.children}</div>;
	}
}

export const ErrorBoundary: FC<{ children: React.ReactNode }> = ({ children }) => {
	const queryClient = useQueryClient();
	return <ErrorBoundaryC queryClient={queryClient}>{children}</ErrorBoundaryC>;
};
