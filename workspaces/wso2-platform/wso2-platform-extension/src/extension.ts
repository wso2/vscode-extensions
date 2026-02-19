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

import * as vscode from "vscode";
import { type ConfigurationChangeEvent, authentication, commands, window, workspace } from "vscode";
import { WSO2AuthenticationProvider, WSO2_AUTH_PROVIDER_ID } from "./auth/wso2-auth-provider";
import { PlatformExtensionApi } from "./PlatformExtensionApi";
import { ChoreoRPCClient } from "./choreo-rpc";
import { installRPCServer } from "./choreo-rpc/activate";
import { getCliVersion } from "./choreo-rpc/cli-install";
import { activateCmds } from "./cmds";
import { continueCreateComponent } from "./cmds/create-component-cmd";
import { activateCodeLenses } from "./code-lens";
import { activateDevantFeatures } from "./devant-utils";
import { ext } from "./extensionVariables";
import { getLogger, initLogger } from "./logger/logger";
import { activateChoreoMcp } from "./mcp";
import { activateStatusbar } from "./status-bar";
import { contextStore } from "./stores/context-store";
import { dataCacheStore } from "./stores/data-cache-store";
import { locationStore } from "./stores/location-store";
import { ChoreoConfigurationProvider, addTerminalHandlers } from "./tarminal-handlers";
import { activateTelemetry } from "./telemetry/telemetry";
import { activateURIHandlers } from "./uri-handlers";
import { getExtVersion } from "./utils";
import { registerYamlLanguageServer } from "./yaml-ls";

export async function activate(context: vscode.ExtensionContext) {
	activateTelemetry(context);
	await initLogger(context);

	ext.context = context;
	ext.api = new PlatformExtensionApi();
	ext.choreoEnv = getChoreoEnv();

	getLogger().info("Activating WSO2 Platform Extension");
	getLogger().info(`Extension version: ${getExtVersion(context)}`);
	getLogger().info(`CLI version: ${getCliVersion()}`);

	// Initialize stores
	await contextStore.persist.rehydrate();
	await dataCacheStore.persist.rehydrate();
	await locationStore.persist.rehydrate();

	// Set context values
	// Note: authProvider will be set up below, so we'll subscribe to it in initAuth
	contextStore.subscribe(({ state }) => {
		vscode.commands.executeCommand("setContext", "isLoadingContextDirs", state.loading);
		vscode.commands.executeCommand("setContext", "hasSelectedProject", !!state.selected);
	});
	workspace.onDidChangeWorkspaceFolders(() => {
		vscode.commands.executeCommand("setContext", "notUsingWorkspaceFile", !workspace.workspaceFile);
	});
	vscode.commands.executeCommand("setContext", "notUsingWorkspaceFile", !workspace.workspaceFile);

	// Initialize and register authentication provider
	const authProvider = new WSO2AuthenticationProvider(context.secrets);
	ext.authProvider = authProvider;
	context.subscriptions.push(
		authentication.registerAuthenticationProvider(WSO2_AUTH_PROVIDER_ID, "WSO2 Platform", authProvider, {
			supportsMultipleAccounts: false,
		}),
	);

	// Subscribe to auth state changes
	authProvider.subscribe(({ state }) => {
		vscode.commands.executeCommand("setContext", "isLoggedIn", !!state.userInfo);
	});

	await installRPCServer();
	const rpcClient = new ChoreoRPCClient();
	await rpcClient.waitUntilActive();
	ext.clients = { rpcClient: rpcClient };
	authProvider.getState().initAuth();
	continueCreateComponent();
	if (ext.isChoreoExtInstalled) {
		addTerminalHandlers();
		context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("*", new ChoreoConfigurationProvider()));
		activateChoreoMcp(context);
	}
	if (ext.isDevantCloudEditor) {
		activateDevantFeatures();
	}
	ext.config = await ext.clients.rpcClient.getConfigFromCli();
	activateCmds(context);
	activateURIHandlers();
	activateCodeLenses(context);
	registerPreInitHandlers();
	registerYamlLanguageServer();
	activateStatusbar(context);
	getLogger().debug("WSO2 Platform Extension activated");
	return ext.api;
}

const getChoreoEnv = (): string => {
	return (
		process.env.CHOREO_ENV ||
		process.env.CLOUD_ENV ||
		workspace.getConfiguration().get<string>("WSO2.WSO2-Platform.Advanced.ChoreoEnvironment") ||
		"prod"
	);
};

function registerPreInitHandlers(): any {
	workspace.onDidChangeConfiguration(async ({ affectsConfiguration }: ConfigurationChangeEvent) => {
		if (affectsConfiguration("WSO2.WSO2-Platform.Advanced.ChoreoEnvironment") || affectsConfiguration("WSO2.WSO2-Platform.Advanced.RpcPath")) {
			// skip showing this if cloud sts env is available
			const selection = await window.showInformationMessage(
				"WSO2 Platform extension configuration changed. Please restart vscode for changes to take effect.",
				"Restart Now",
			);
			if (selection === "Restart Now") {
				if (affectsConfiguration("WSO2.WSO2-Platform.Advanced.ChoreoEnvironment")) {
					ext.authProvider?.getState().logout();
				}
				commands.executeCommand("workbench.action.reloadWindow");
			}
		}
	});
}

export function deactivate() {}
