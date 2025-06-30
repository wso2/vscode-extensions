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

import { CommandIds } from "@wso2/choreo-core";
import { type ExtensionContext, commands } from "vscode";
import { authStore } from "../stores/auth-store";
import { contextStore } from "../stores/context-store";

export function refreshContextCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.RefreshDirectoryContext, async () => {
			const userInfo = authStore.getState().state.userInfo;
			if (!userInfo) {
				throw new Error("You are not logged in. Please log in and retry.");
			}

			await contextStore.getState().refreshState();
		}),
	);
}
