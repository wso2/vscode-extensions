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

import { type ChildProcessWithoutNullStreams, spawn } from "child_process";
import { type MessageConnection, StreamMessageReader, StreamMessageWriter, createMessageConnection } from "vscode-jsonrpc/node";
import { ext } from "../extensionVariables";
import { getLogger } from "../logger/logger";
import { parseJwt } from "../utils";
import { getChoreoExecPath } from "./cli-install";

export class StdioConnection {
	private _connection: MessageConnection;
	private _serverProcess: ChildProcessWithoutNullStreams;
	constructor() {
		const executablePath = getChoreoExecPath();
		console.log("Starting RPC server, path:", executablePath);
		getLogger().debug(`Starting RPC server${executablePath}`);
		let region = process.env.CLOUD_REGION;
		if (!region && process.env.CLOUD_STS_TOKEN && parseJwt(process.env.CLOUD_STS_TOKEN)?.iss?.includes(".eu.")) {
			region = "EU";
		}
		this._serverProcess = spawn(executablePath, ["start-rpc-server"], {
			env: {
				...process.env,
				SKIP_KEYRING: process.env.CLOUD_STS_TOKEN ? "true" : "",
				CHOREO_ENV: ext.choreoEnv,
				CHOREO_REGION: region,
			},
		});
		this._connection = createMessageConnection(
			new StreamMessageReader(this._serverProcess.stdout),
			new StreamMessageWriter(this._serverProcess.stdin),
		);
	}

	stop(): Promise<void> {
		return new Promise<void>((resolve) => {
			this._serverProcess.on("exit", () => {
				resolve();
			});
			this._serverProcess.kill();
		});
	}

	getProtocolConnection(): MessageConnection {
		return this._connection;
	}

	getChildProcess(): ChildProcessWithoutNullStreams {
		return this._serverProcess;
	}
}
