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
import { type ExtensionContext, commands, window } from "vscode";
import * as vscode from "vscode";
import { ResponseError } from "vscode-jsonrpc";
import { ErrorCode } from "../choreo-rpc/constants";
import { ext } from "../extensionVariables";
import { getLogger } from "../logger/logger";
import { authStore } from "../stores/auth-store";

export function signInWithAuthCodeCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.SignInWithAuthCode, async () => {
			try {
				// This is used in the extension test runner to sign into choreo
				getLogger().debug("Signing in to Choreo using code");

				const authCode = await vscode.window.showInputBox({
					prompt: "Enter Authentication Code: ",
					placeHolder: "Code",
					ignoreFocusOut: true,
				});

				if (authCode) {
					ext.clients.rpcClient.signInWithAuthCode(authCode).then((userInfo) => {
						if (userInfo) {
							authStore.getState().loginSuccess(userInfo);
						}
					});
				} else {
					window.showErrorMessage("Auth Code is required to login");
				}
			} catch (error: any) {
				if (!(error instanceof ResponseError) || error.code !== ErrorCode.NoOrgsAvailable) {
					window.showErrorMessage("Sign in failed. Please check the logs for more details.");
				}
				getLogger().error(`Choreo sign in Failed: ${error.message}`);
			}
		}),
	);
}
