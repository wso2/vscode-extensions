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

import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import axios from "axios";
import { ProgressLocation, window, workspace } from "vscode";
import { ext } from "../extensionVariables";

const config = workspace.getConfiguration('WSO2.WSO2-Platform');
const CHOREO_CLI_RELEASES_BASE_URL =
    process.env.CHOREO_CLI_RELEASES_BASE_URL ||
    config.get<string>('ChoreoCliReleasesBaseUrl') ||
    '';

export const getCliVersion = (): string => {
	const packageJson = JSON.parse(fs.readFileSync(path.join(ext.context.extensionPath, "package.json"), "utf8"));
	return packageJson?.cliVersion;
};

export const getChoreoExecPath = () => {
	const OS = os.platform();
	const executablePath = workspace.getConfiguration().get<string>("WSO2.WSO2-Platform.Advanced.RpcPath");
	if (executablePath) {
		if (OS === "win32" && !executablePath.endsWith(".exe")) {
			return `${executablePath}.exe`;
		}
		return executablePath;
	}

	return path.join(getChoreoBinPath(), OS === "win32" ? "choreo.exe" : "choreo");
};

export const getChoreoEnv = (): string => {
	return workspace.getConfiguration().get<string>("WSO2.WSO2-Platform.Advanced.ChoreoEnvironment") || "prod";
};

const getChoreoBinPath = () => {
	return path.join(ext.context.globalStorageUri.fsPath, "choreo-cli-rpc", getCliVersion(), "bin");
};

export const downloadCLI = async () => {
	const OS = os.platform();
	const ARCH = getArchitecture();
	const CHOREO_BIN_DIR = getChoreoBinPath();
	const CHOREO_CLI_EXEC = getChoreoExecPath();
	const CLI_VERSION = getCliVersion();
	const CHOREO_TMP_DIR = await fs.promises.mkdtemp(path.join(os.tmpdir(), `choreo-cli-rpc-${CLI_VERSION}`));

	fs.mkdirSync(CHOREO_BIN_DIR, { recursive: true });

	const FILE_NAME = `choreo-cli-${CLI_VERSION}-${OS === "win32" ? "windows" : OS}-${ARCH}`;
	let FILE_TYPE = "";

	if (OS === "linux") {
		FILE_TYPE = ".tar.gz";
	} else if (OS === "darwin") {
		FILE_TYPE = ".zip";
	} else if (OS === "win32") {
		FILE_TYPE = ".zip";
	} else {
		throw new Error(`Unsupported OS: ${OS}`);
	}
	const CHOREO_TMP_FILE_DEST = path.join(CHOREO_TMP_DIR, `${FILE_NAME}${FILE_TYPE}`);

	const INSTALLER_URL = `${CHOREO_CLI_RELEASES_BASE_URL}${CLI_VERSION}/${FILE_NAME}${FILE_TYPE}`;

	console.log(`WSO2 Platform RPC download URL: ${INSTALLER_URL}`);

	await downloadFile(INSTALLER_URL, CHOREO_TMP_FILE_DEST);

	console.log(`Extracting archive into temp dir: ${CHOREO_TMP_DIR}`);
	if (FILE_TYPE === ".tar.gz") {
		execSync(`tar -xzf ${CHOREO_TMP_FILE_DEST} -C ${CHOREO_TMP_DIR}`);
	} else if (FILE_TYPE === ".zip") {
		if (OS === "darwin") {
			execSync(`unzip -q ${CHOREO_TMP_FILE_DEST} -d ${CHOREO_TMP_DIR}`);
		} else if (OS === "win32") {
			execSync(`powershell.exe -Command "Expand-Archive '${CHOREO_TMP_FILE_DEST}' -DestinationPath '${CHOREO_TMP_DIR}' -Force"`);
		}
	}

	console.log(`Moving executable to ${CHOREO_BIN_DIR}`);
	await fs.promises.copyFile(`${CHOREO_TMP_DIR}/${OS === "win32" ? "choreo.exe" : "choreo"}`, CHOREO_CLI_EXEC);
	await fs.promises.rm(`${CHOREO_TMP_DIR}/${OS === "win32" ? "choreo.exe" : "choreo"}`);

	console.log("Cleaning up...");
	await fs.promises.rm(CHOREO_TMP_DIR, { recursive: true });

	process.chdir(CHOREO_BIN_DIR);
	if (OS !== "win32") {
		await fs.promises.chmod(CHOREO_CLI_EXEC, 0o755);
	}

	console.log("WSO2 Platform RPC server was installed successfully 🎉");
};

async function downloadFile(url: string, dest: string) {
	const controller = new AbortController();
	const response = await axios({ url, method: "GET", responseType: "stream", signal: controller.signal });
	await window.withProgress(
		{
			title: "Initializing WSO2 Platform extension",
			location: ProgressLocation.Notification,
			cancellable: true,
		},
		async (progress, cancellationToken) => {
			return new Promise<void>((resolve, reject) => {
				const writer = fs.createWriteStream(dest);
				const totalSize = Number.parseInt(response.headers["content-length"], 10);
				let downloadedSize = 0;
				let previousPercentage = 0;

				response.data.on("data", (chunk: string) => {
					downloadedSize += chunk.length;

					const progressPercentage = Math.round((downloadedSize / totalSize) * 100);
					if (progressPercentage !== previousPercentage) {
						progress.report({
							increment: progressPercentage - previousPercentage,
							message: `${progressPercentage}%`,
						});
						previousPercentage = progressPercentage;
					}
				});

				response.data.pipe(writer);

				cancellationToken.onCancellationRequested(() => {
					controller.abort();
					reject();
				});

				writer.on("finish", resolve);
				writer.on("error", reject);
			});
		},
	);
}

function getArchitecture() {
	const ARCH = os.arch();
	switch (ARCH) {
		case "x64":
			return "amd64";
		case "x32":
			return "386";
		case "arm64":
		case "aarch64":
			return "arm64";
		case "arm":
			return "arm";
		default:
			throw new Error(`Unsupported architecture: ${ARCH}`);
	}
}
