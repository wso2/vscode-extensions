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
import { getChoreoEnv, getChoreoExecPath } from "./choreo-rpc/cli-install";
import { getUserInfoForCmd } from "./cmds/cmd-utils";

export function activateMcp(context: vscode.ExtensionContext) {
	const didChangeEmitter = new vscode.EventEmitter<void>();
	context.subscriptions.push(
		vscode.lm.registerMcpServerDefinitionProvider("choreo", {
			onDidChangeMcpServerDefinitions: didChangeEmitter.event,
			provideMcpServerDefinitions: async () => {
				const servers: vscode.McpServerDefinition[] = [];
				servers.push(
					new vscode.McpStdioServerDefinition(
						"Choreo MCP Server",
						getChoreoExecPath(),
						["start-mcp-server"],
						{ CHOREO_ENV: getChoreoEnv() },
						"1.0.0",
					),
				);
				return servers;
			},
			resolveMcpServerDefinition: async (def, _token) => {
				const userInfo = await getUserInfoForCmd("connect with Choreo MCP server");
				if (userInfo) {
					return def;
				}
				return undefined;
			},
		}),
	);
}
