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
import { downloadCLI, getChoreoExecPath, getCliVersion } from "./cli-install";
import { RPCClient } from "./client";

function isChoreoCliInstalled(): Promise<boolean> {
	return new Promise((resolve) => {
		const rpcPath = getChoreoExecPath();
		if (fs.existsSync(rpcPath)) {
			exec(`"${rpcPath}" --version`, (error) => {
				console.log("error", error);
				if (error) {
					resolve(false);
				} else {
					resolve(true);
				}
			});
		} else {
			resolve(false);
		}
	});
}

export async function initRPCServer() {
	const installed = await isChoreoCliInstalled();
	if (!installed) {
		console.log(`Choreo RPC version ${getCliVersion()} not installed`);
		await downloadCLI();
	}

	await RPCClient.getInstance();
}
