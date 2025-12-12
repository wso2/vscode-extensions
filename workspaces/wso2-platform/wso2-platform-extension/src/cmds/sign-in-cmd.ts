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
