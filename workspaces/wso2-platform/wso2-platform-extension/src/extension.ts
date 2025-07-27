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
import { type ConfigurationChangeEvent, commands, window, workspace } from "vscode";
import { PlatformExtensionApi } from "./PlatformExtensionApi";
import { ChoreoRPCClient } from "./choreo-rpc";
import { initRPCServer } from "./choreo-rpc/activate";
import { activateCmds } from "./cmds";
import { continueCreateComponent } from "./cmds/create-component-cmd";
import { activateCodeLenses } from "./code-lens";
import { activateDevantFeatures } from "./devant-utils";
import { ext } from "./extensionVariables";
import { getLogger, initLogger } from "./logger/logger";
import { activateMcp } from "./mcp";
import { activateStatusbar } from "./status-bar";
import { authStore } from "./stores/auth-store";
import { contextStore } from "./stores/context-store";
import { dataCacheStore } from "./stores/data-cache-store";
import { locationStore } from "./stores/location-store";
import { ChoreoConfigurationProvider, addTerminalHandlers } from "./tarminal-handlers";
import { activateTelemetry } from "./telemetry/telemetry";
import { activateURIHandlers } from "./uri-handlers";
import { registerYamlLanguageServer } from "./yaml-ls";

export async function activate(context: vscode.ExtensionContext) {
	activateTelemetry(context);
	await initLogger(context);
	getLogger().debug("Activating WSO2 Platform Extension");
	ext.context = context;
	ext.api = new PlatformExtensionApi();
	ext.choreoEnv = getChoreoEnv();
	setInitialEnv();

	// Initialize stores
	await authStore.persist.rehydrate();
	await contextStore.persist.rehydrate();
	await dataCacheStore.persist.rehydrate();
	await locationStore.persist.rehydrate();

	// Set context values
	authStore.subscribe(({ state }) => {
		vscode.commands.executeCommand("setContext", "isLoggedIn", !!state.userInfo);
	});
	contextStore.subscribe(({ state }) => {
		vscode.commands.executeCommand("setContext", "isLoadingContextDirs", state.loading);
		vscode.commands.executeCommand("setContext", "hasSelectedProject", !!state.selected);
	});
	workspace.onDidChangeWorkspaceFolders(() => {
		vscode.commands.executeCommand("setContext", "notUsingWorkspaceFile", !workspace.workspaceFile);
	});
	vscode.commands.executeCommand("setContext", "notUsingWorkspaceFile", !workspace.workspaceFile);

	const rpcClient = new ChoreoRPCClient();
	ext.clients = { rpcClient: rpcClient };

	initRPCServer()
		.then(async () => {
			await ext.clients.rpcClient.init();
			authStore.getState().initAuth();
			continueCreateComponent();
			addTerminalHandlers();
			context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("*", new ChoreoConfigurationProvider()));
			activateMcp(context);
			activateDevantFeatures();
			getLogger().debug("WSO2 Platform Extension activated");
			ext.config = await ext.clients.rpcClient.getConfigFromCli();
		})
		.catch((e) => {
			getLogger().error("Failed to initialize rpc client", e);
		});
	activateCmds(context);
	activateURIHandlers();
	activateCodeLenses(context);
	registerPreInitHandlers();
	registerYamlLanguageServer();
	activateStatusbar(context);
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

function setInitialEnv() {
	const choreoEnv = process.env.CHOREO_ENV || process.env.CLOUD_ENV;
	if (
		choreoEnv &&
		["dev", "stage", "prod"].includes(choreoEnv) &&
		workspace.getConfiguration().get("WSO2.WSO2-Platform.Advanced.ChoreoEnvironment") !== choreoEnv
	) {
		workspace.getConfiguration().update("WSO2.WSO2-Platform.Advanced.ChoreoEnvironment", choreoEnv);
	}
}

function registerPreInitHandlers(): any {
	workspace.onDidChangeConfiguration(async ({ affectsConfiguration }: ConfigurationChangeEvent) => {
		if (
			!process.env.CLOUD_STS_TOKEN &&
			(affectsConfiguration("WSO2.WSO2-Platform.Advanced.ChoreoEnvironment") || affectsConfiguration("WSO2.WSO2-Platform.Advanced.RpcPath"))
		) {
			// skip showing this if cloud sts env is available
			const selection = await window.showInformationMessage(
				"WSO2 Platform extension configuration changed. Please restart vscode for changes to take effect.",
				"Restart Now",
			);
			if (selection === "Restart Now") {
				if (affectsConfiguration("WSO2.WSO2-Platform.Advanced.ChoreoEnvironment")) {
					authStore.getState().logout();
				}
				commands.executeCommand("workbench.action.reloadWindow");
			}
		}
	});
}

export function deactivate() {}
