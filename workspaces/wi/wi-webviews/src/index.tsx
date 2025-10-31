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

import React from "react";
import ReactDOM from "react-dom/client";
import { ViewType, type WebviewProps } from "@wso2/wi-core";
import IntegratorWebview from "./IntegratorWebview";
import "./style.css";

const defaultProps: WebviewProps = {
	type: ViewType.WELCOME,
	biAvailable: true,
	miAvailable: true,
};
export function renderWebview(target: HTMLElement) {
	const reactRoot = ReactDOM.createRoot(target);
	reactRoot.render(
		<React.StrictMode>
			<IntegratorWebview {...defaultProps} />
		</React.StrictMode>,
	);
}
