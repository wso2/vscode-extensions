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

import { CommandIds, type ICmdParamsBase } from "@wso2/wso2-platform-core";
import { type ExtensionContext, ProgressLocation, commands, window } from "vscode";
import * as vscode from "vscode";
import { ext } from "../extensionVariables";
import { getLogger } from "../logger/logger";
import { webviewStateStore } from "../stores/webview-state-store";
import { isRpcActive, setExtensionName } from "./cmd-utils";

export function signInCommand(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand(CommandIds.SignIn, async (params: ICmdParamsBase) => {
			setExtensionName(params?.extName);
			try {
				isRpcActive(ext);
				getLogger().debug("Signing in to WSO2 Platform");
				const callbackUrl = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://wso2.wso2-platform/signin`));

				console.log("Generating WSO2 Platform login URL for ", callbackUrl.toString());
				const loginUrl = await window.withProgress({ title: "Generating Login URL...", location: ProgressLocation.Notification }, async () => {
					if (webviewStateStore.getState().state?.extensionName === "Devant") {
						return ext.clients.rpcClient.getDevantSignInUrl({ callbackUrl: callbackUrl.toString() });
					}
					return ext.clients.rpcClient.getSignInUrl({ callbackUrl: callbackUrl.toString() });
				});

				if (loginUrl) {
					await vscode.env.openExternal(vscode.Uri.parse(loginUrl));
				} else {
					getLogger().error("Unable to open external link for authentication.");
					window.showErrorMessage("Unable to open external link for authentication.");
				}
			} catch (error: any) {
				getLogger().error(`Error while signing in to WSO2 Platform. ${error?.message}${error?.cause ? `\nCause: ${error.cause.message}` : ""}`);
				if (error instanceof Error) {
					window.showErrorMessage(error.message);
				}
			}
		}),
	);
}
