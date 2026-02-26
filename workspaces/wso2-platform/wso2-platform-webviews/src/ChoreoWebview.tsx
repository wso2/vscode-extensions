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

import type {
	ComponentsDetailsWebviewProps,
	ComponentsListActivityViewProps,
	ComponentFormWebviewProps,
	WebviewProps,
} from "@wso2/wso2-platform-core";
import React from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthContextProvider } from "./providers/auth-ctx-provider";
import { ExtWebviewContextProvider } from "./providers/ext-vewview-ctx-provider";
import { LinkedDirStateContextProvider } from "./providers/linked-dir-state-ctx-provider";
import { ChoreoWebviewQueryClientProvider } from "./providers/react-query-provider";
import { ComponentDetailsView } from "./views/ComponentDetailsView";
import { ComponentFormView } from "./views/ComponentFormView";
import { ComponentListView } from "./views/ComponentListView";

function ChoreoWebview(props: WebviewProps) {
	return (
		<ChoreoWebviewQueryClientProvider type={props.type}>
			<ErrorBoundary>
				<ExtWebviewContextProvider>
					<AuthContextProvider viewType={props.type}>
						<main>
							{(() => {
								switch (props.type) {
									case "NewComponentForm":
										return <ComponentFormView {...(props as ComponentFormWebviewProps)} />;
									case "ComponentDetailsView":
										return <ComponentDetailsView {...(props as ComponentsDetailsWebviewProps)} />;
									case "ComponentsListActivityView":
										return (
											<LinkedDirStateContextProvider>
												<ComponentListView {...(props as ComponentsListActivityViewProps)} />
											</LinkedDirStateContextProvider>
										);
									default:
										return null;
								}
							})()}
						</main>
					</AuthContextProvider>
				</ExtWebviewContextProvider>
			</ErrorBoundary>
		</ChoreoWebviewQueryClientProvider>
	);
}

export default ChoreoWebview;
