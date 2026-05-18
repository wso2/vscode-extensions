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
import { getChoreoExecPath } from "./choreo-rpc/cli-install";
import { getUserInfoForCmd } from "./cmds/cmd-utils";
import { ext } from "./extensionVariables";

export function activateChoreoMcp(context: vscode.ExtensionContext) {
	const didChangeEmitter = new vscode.EventEmitter<void>();
	context.subscriptions.push(
		(vscode.lm as any).registerMcpServerDefinitionProvider("choreo", {
			onDidChangeMcpServerDefinitions: didChangeEmitter.event,
			provideMcpServerDefinitions: async () => {
				const servers: any[] = [];
				servers.push(
					new (vscode as any).McpStdioServerDefinition(
						"Choreo MCP Server",
						getChoreoExecPath(),
						["start-mcp-server"],
						{ CHOREO_ENV: ext.choreoEnv, CHOREO_REGION: process.env.CLOUD_REGION || "" },
						"1.0.0",
					),
				);
				return servers;
			},
			resolveMcpServerDefinition: async (def: any, _token: any) => {
				return def;
				// Uncomment below, if we want to ask user to login when MCP server is started
				/*
				const userInfo = await getUserInfoForCmd("connect with Choreo MCP server");
				if (userInfo) {
					return def;
				}
				return undefined;
				*/
			},
		}),
	);
}
