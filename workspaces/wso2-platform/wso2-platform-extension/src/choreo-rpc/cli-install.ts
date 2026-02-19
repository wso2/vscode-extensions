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
import { workspace } from "vscode";
import { ext } from "../extensionVariables";
import { getLogger } from "../logger/logger";

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
	return (
		process.env.CHOREO_ENV ||
		process.env.CLOUD_ENV ||
		workspace.getConfiguration().get<string>("WSO2.WSO2-Platform.Advanced.ChoreoEnvironment") ||
		"prod"
	);
};

const getChoreoBinPath = () => {
	const OS = os.platform();
	const ARCH = getArchitecture();
	return path.join(ext.context.extensionPath, "resources", "choreo-cli", getCliVersion(), OS, ARCH, "bin");
};

export const installCLI = async () => {
	const OS = os.platform();
	const ARCH = getArchitecture();
	const CHOREO_BIN_DIR = getChoreoBinPath();
	const CHOREO_CLI_EXEC = getChoreoExecPath();
	const CLI_VERSION = getCliVersion();
	
	// Path to the combined zip file in resources
	const COMBINED_ZIP_PATH = path.join(ext.context.extensionPath, "resources", "choreo-cli", `choreo-cli-${CLI_VERSION}.zip`);
	
	if (!fs.existsSync(COMBINED_ZIP_PATH)) {
		throw new Error(`Combined CLI zip not found at: ${COMBINED_ZIP_PATH}\nPlease run 'pnpm run download-choreo-cli' to download the CLI.`);
	}

	getLogger().trace(`Extracting Choreo CLI from: ${COMBINED_ZIP_PATH}`);

	const CHOREO_TMP_DIR = await fs.promises.mkdtemp(path.join(os.tmpdir(), `choreo-cli-rpc-${CLI_VERSION}-`));

	try {
		fs.mkdirSync(CHOREO_BIN_DIR, { recursive: true });

		// Extract the combined zip to temp directory
		getLogger().trace(`Extracting combined zip to temp dir: ${CHOREO_TMP_DIR}`);
		try {
			if (OS === "win32") {
				execSync(`powershell.exe -Command "Expand-Archive -Path '${COMBINED_ZIP_PATH}' -DestinationPath '${CHOREO_TMP_DIR}' -Force"`);
			} else {
				execSync(`unzip -q '${COMBINED_ZIP_PATH}' -d '${CHOREO_TMP_DIR}'`);
			}
		} catch (error) {
			throw new Error(`Failed to extract combined zip: ${error instanceof Error ? error.message : String(error)}`);
		}

		// Determine the specific file to extract based on OS and architecture
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

		const PLATFORM_ARCHIVE = path.join(CHOREO_TMP_DIR, `${FILE_NAME}${FILE_TYPE}`);
		
		if (!fs.existsSync(PLATFORM_ARCHIVE)) {
			throw new Error(`Platform-specific archive not found: ${FILE_NAME}${FILE_TYPE}`);
		}

		getLogger().trace(`Extracting platform-specific archive: ${FILE_NAME}${FILE_TYPE}`);
		const PLATFORM_TMP_DIR = path.join(CHOREO_TMP_DIR, "platform-extract");
		fs.mkdirSync(PLATFORM_TMP_DIR, { recursive: true });

		// Extract the platform-specific archive
		try {
			if (FILE_TYPE === ".tar.gz") {
				execSync(`tar -xzf '${PLATFORM_ARCHIVE}' -C '${PLATFORM_TMP_DIR}'`);
			} else if (FILE_TYPE === ".zip") {
				if (OS === "darwin") {
					execSync(`unzip -q '${PLATFORM_ARCHIVE}' -d '${PLATFORM_TMP_DIR}'`);
				} else if (OS === "win32") {
					execSync(`powershell.exe -Command "Expand-Archive -Path '${PLATFORM_ARCHIVE}' -DestinationPath '${PLATFORM_TMP_DIR}' -Force"`);
				}
			}
		} catch (error) {
			throw new Error(`Failed to extract platform-specific archive: ${error instanceof Error ? error.message : String(error)}`);
		}

		// Copy the executable to the bin directory
		const executableName = OS === "win32" ? "choreo.exe" : "choreo";
		const extractedExecutable = path.join(PLATFORM_TMP_DIR, executableName);
		
		if (!fs.existsSync(extractedExecutable)) {
			throw new Error(`Executable not found after extraction: ${extractedExecutable}`);
		}

		getLogger().trace(`Copying executable to ${CHOREO_BIN_DIR}`);
		try {
			await fs.promises.copyFile(extractedExecutable, CHOREO_CLI_EXEC);
		} catch (error) {
			throw new Error(`Failed to copy executable: ${error instanceof Error ? error.message : String(error)}`);
		}

		// Set executable permissions on Unix systems
		if (OS !== "win32") {
			try {
				await fs.promises.chmod(CHOREO_CLI_EXEC, 0o755);
			} catch (error) {
				throw new Error(`Failed to set executable permissions: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		getLogger().trace("WSO2 Platform RPC server was installed successfully 🎉");
	} catch (error) {
		// Clean up temp directory on error and re-throw
		getLogger().error("Error during CLI installation:", error);
		await fs.promises.rm(CHOREO_TMP_DIR, { recursive: true, force: true }).catch(() => {
			// Ignore cleanup errors
		});
		throw error;
	}

	// Clean up temp directory on success
	getLogger().trace("Cleaning up temporary files...");
	await fs.promises.rm(CHOREO_TMP_DIR, { recursive: true, force: true });
};

function getArchitecture() {
	const arch = workspace.getConfiguration().get<string>("WSO2.WSO2-Platform.Advanced.RpcArchitecture");
	if (arch) {
		return arch;
	}
	const ARCH = os.arch();
	switch (ARCH) {
		case "x64":
			return "amd64";
		// case "x32":
		// 	return "386";
		case "arm64":
		case "aarch64":
			return "arm64";
		case "arm":
			return "arm";
		default:
			throw new Error(`Unsupported architecture: ${ARCH}`);
	}
}
