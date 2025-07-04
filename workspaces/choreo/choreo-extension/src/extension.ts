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
import * as vscode from "vscode";
import { commands } from "vscode";
import { ChoreoExtensionApi } from "./ChoreoExtensionApi";
import { activateCmds } from "./cmd-handlers";
import { ext } from "./extensionVariables";
import { getLogger, initLogger } from "./logger/logger";
import { activateURIHandlers } from "./uri-handlers";
import { getContextStateStore, getIsLoggedIn } from "./utils";
import { activateActivityWebViews } from "./webviews/utils";

export async function activate(context: vscode.ExtensionContext) {
	await initLogger(context);
	getLogger().debug("Activating Choreo Extension");
	ext.context = context;
	ext.api = new ChoreoExtensionApi();

	setInterval(async () => {
		const isLoggedIn = await getIsLoggedIn();
		vscode.commands.executeCommand("setContext", "isLoggedIn", isLoggedIn);
	}, 2000);

	setInterval(async () => {
		const state = await getContextStateStore();
		vscode.commands.executeCommand("setContext", "isLoadingContextDirs", state.loading);
		vscode.commands.executeCommand("setContext", "hasSelectedProject", !!state.selected);
	}, 2000);

	ext.clients = {};
	activateCmds(context);
	activateActivityWebViews(context);
	activateURIHandlers();

	getLogger().debug("Choreo Extension activated");

	commands.registerCommand(CommandIds.OpenWalkthrough, () => {
		commands.executeCommand("workbench.action.openWalkthrough", "wso2.choreo#choreo.getStarted", false);
	});
	return ext.api;
}

export function deactivate() {}
