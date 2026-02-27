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

import { exec } from "child_process";
import * as fs from "fs";
import { installCLI, getChoreoExecPath, getCliVersion } from "./cli-install";
import { RPCClient } from "./client";
import { getLogger } from "../logger/logger";

function isChoreoCliInstalled(): Promise<boolean> {
	return new Promise((resolve) => {
		const rpcPath = getChoreoExecPath();
		getLogger().info(`RPC path: ${rpcPath}`);

		if (!fs.existsSync(rpcPath)) {
			return resolve(false);
		}

		const process = exec(`"${rpcPath}" --version`, (error) => {
			if (error) {
				console.error("error", error);
				fs.rmSync(rpcPath);
				resolve(false);
			} else {
				resolve(true);
			}
		});

		const timeout = setTimeout(() => {
			process.kill(); // Kill the process if it exceeds 5 seconds
			getLogger().error("Timeout: Process took too long");
			fs.rmSync(rpcPath);
			getLogger().error(`Delete RPC path and try again ${rpcPath}`);
			resolve(false);
		}, 5000);

		process.on("exit", () => clearTimeout(timeout));
	});
}

export async function installRPCServer() {
	try {
		const installed = await isChoreoCliInstalled();
		if (!installed) {
			getLogger().trace(`WSO2 Platform RPC version ${getCliVersion()} not installed`);
			await installCLI();
		}

		await RPCClient.getInstance();
		getLogger().info("RPC server initialized successfully");
	} catch (error) {
		getLogger().error(`Failed to initialize RPC server: ${error instanceof Error ? error.message : String(error)}`);
		// Allow extension to continue without RPC functionality
		// Important for test environments where CLI resources may not be available
	}
}
