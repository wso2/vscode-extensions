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

import type { WebviewProps } from "@wso2/wso2-platform-core";
import React from "react";
import { render } from "react-dom";
import ChoreoWebview from "./ChoreoWebview";
import "./style.css";

export function renderChoreoWebViews(target: HTMLDivElement, params: WebviewProps) {
	render(
		<React.StrictMode>
			<ChoreoWebview {...params} />
		</React.StrictMode>,
		target,
	);
}
