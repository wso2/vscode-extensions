/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { spawnSync, exec } from "child_process";
import axios from "axios";
import { downloadWithProgress, extractWithProgress } from "./fileOperations";
import { INVALID_SERVER_PATH_MSG, SIDDHI_HOME_CONFIG, VS_CODE_COMMANDS } from "../constants";
import { PathDetailsResponse, SetupDetails, SetPathRequest } from "@wso2/si-core";

export const supportedJavaVersionsForSI: { [key: string]: string } = {
    "4.3.0": "17",
    "4.2.0": "17",
    "4.1.0": "11",
};
export const LATEST_SI_VERSION = "4.3.0";

const siDownloadUrls: { [key: string]: string } = {
    "4.3.0": "https://si-distribution.wso2.com/4.3.0/wso2si-4.3.0.zip",
};

const CACHED_FOLDER = path.join(os.homedir(), ".wso2-si");

export function verifyJavaHomePath(folderPath: string): string | null {
    const javaExecutableName = process.platform === "win32" ? "java.exe" : "java";
    let javaPath = path.join(folderPath, "bin", javaExecutableName);
    let javaHomePath: string | null = null;

    if (fs.existsSync(javaPath)) {
        javaHomePath = path.normalize(folderPath);
    }

    javaPath = path.join(folderPath, javaExecutableName);
    if (fs.existsSync(javaPath)) {
        javaHomePath = path.normalize(path.join(folderPath, ".."));
    }

    if (javaHomePath) {
        const javaVersion = getJavaVersion(path.join(javaHomePath, "bin"));
        if (javaVersion) {
            return javaHomePath;
        }
    }
    return null;
}

export function verifySIPath(folderPath: string): string | null {
    const siExecutable = process.platform === "win32" ? "server.bat" : "server.sh";
    let siPath = path.join(folderPath, "bin", siExecutable);
    let siHomePath: string | null = null;

    if (fs.existsSync(siPath)) {
        siHomePath = path.normalize(folderPath);
    }

    if (siHomePath) {
        const siVersion = getSIVersion(siHomePath);
        if (siVersion && isSupportedSIVersion(siVersion)) {
            return siHomePath;
        }
    }

    return null;
}

export async function downloadJavaFromSI(siVersion: string): Promise<string> {
    interface AdoptiumApiResponse {
        binaries: {
            package: {
                link: string;
            };
        }[];
        release_name: string;
        version_data: {
            openjdk_version: string;
        };
    }

    const javaVersion = supportedJavaVersionsForSI[siVersion];
    const javaPath = path.join(CACHED_FOLDER, "java");
    const osType = os.type();

    const osMap: { [key: string]: string } = {
        Darwin: "mac",
        Linux: "linux",
        Windows_NT: "windows",
    };

    const archMap: { [key: string]: string } = {
        x64: "x64",
        x32: "x86",
        arm64: "aarch64",
    };

    try {
        const osName = osMap[osType];
        if (!osName) {
            throw new Error(`Unsupported OS type: ${osType}`);
        }

        const archName = archMap[os.arch()];
        if (!archName) {
            throw new Error(`Unsupported architecture: ${os.arch()}`);
        }

        if (!javaVersion) {
            throw new Error("Unsupported Java version.");
        }

        if (!fs.existsSync(javaPath)) {
            fs.mkdirSync(javaPath, { recursive: true });
        }

        const apiUrl = `https://api.adoptium.net/v3/assets/feature_releases/${javaVersion}/ga?architecture=${archName}&heap_size=normal&image_type=jdk&jvm_impl=hotspot&os=${osName}&project=jdk&vendor=eclipse`;

        const response = await axios.get<AdoptiumApiResponse[]>(apiUrl);
        if (response.data.length === 0) {
            throw new Error(`Failed to find Java binaries for version ${javaVersion}.`);
        }

        const targetRelease = response.data[0];

        if (!targetRelease) {
            throw new Error(`Java version ${javaVersion} not found for the specified OS and architecture.`);
        }

        const downloadUrl = targetRelease.binaries[0].package.link;
        const releaseName = targetRelease.release_name;

        const javaDownloadPath = path.join(
            javaPath,
            osType === "Windows_NT" ? `${releaseName}.zip` : `${releaseName}.tar.gz`
        );

        await downloadWithProgress(downloadUrl, javaDownloadPath, "Downloading Java");
        await extractWithProgress(javaDownloadPath, javaPath, "Extracting Java");

        if (osType === "Darwin") {
            return path.join(javaPath, releaseName, "Contents", "Home");
        } else {
            return path.join(javaPath, releaseName);
        }
    } catch (error) {
        throw new Error(
            `Failed to download Java. ${error instanceof Error ? error.message : error}.
            If issue persists, please download and install Java ${javaVersion} manually.`
        );
    }
}

export async function downloadSI(siVersion: string, isUpdatedPack?: boolean): Promise<string> {
    const siPath = path.join(CACHED_FOLDER, "streaming-integrator");

    try {
        if (!fs.existsSync(siPath)) {
            fs.mkdirSync(siPath, { recursive: true });
        }
        const siDownloadUrl = isUpdatedPack ? siDownloadUrls[siVersion + "-UPDATED"] : siDownloadUrls[siVersion];
        const zipName = siDownloadUrl.split("/").pop();
        const siDownloadPath = path.join(siPath, zipName!);

        if (!fs.existsSync(siDownloadPath)) {
            await downloadWithProgress(siDownloadUrl, siDownloadPath, "Downloading WSO2 Integrator: SI");
        } else {
            vscode.window.showInformationMessage("WSO2 Integrator: SI already downloaded.");
        }
        await extractWithProgress(siDownloadPath, siPath, "Extracting WSO2 Integrator: SI");

        return getLatestSIPathFromCache(siVersion)?.path!;
    } catch (error) {
        if ((error as Error).message?.includes("Error while extracting the archive")) {
            vscode.window.showWarningMessage(
                "The WSO2 Integrator: SI archive is invalid. Attempting to redownload the WSO2 Integrator: SI."
            );
            return downloadSI(siVersion, isUpdatedPack);
        }
        throw new Error("Failed to download WSO2 Integrator: SI.");
    }
}

function isSupportedSIVersion(version: string): boolean {
    return Object.keys(supportedJavaVersionsForSI).includes(version);
}

function getJavaVersion(javaBinPath: string): string | null {
    const javaExecutableName = process.platform === "win32" ? "java.exe" : "java";
    const javaExecutable = path.join(javaBinPath, javaExecutableName);
    const result = spawnSync(javaExecutable, ["-version"], { encoding: "utf8" });

    if (result.error || result.status !== 0) {
        return null;
    }
    const versionMatch = result.stderr.match(/(\d+)(\.\d+)*(\.\d+)*/);
    return versionMatch ? versionMatch[0].split(".")[0] : null;
}

function getSIVersion(siPath: string): string | null {
    const siVersionFile = path.join(siPath, "bin", "version.txt");
    if (!fs.existsSync(siVersionFile)) {
        return null;
    }
    const siVersionContent = fs.readFileSync(siVersionFile, "utf8");
    const versionMatch = siVersionContent.match(/v(\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[1] : null;
}

// /**
//  * Compares two version strings and returns a number indicating their relative order.
//  *
//  * The version strings should be in the format "x.y.z" where x, y, and z are numeric parts.
//  * If the version strings contain non-numeric parts, they will be ignored.
//  *
//  * @param v1 - The first version string to compare.
//  * @param v2 - The second version string to compare.
//  * @returns A number indicating the relative order of the versions:
//  *          - 1 if v1 is greater than v2
//  *          - -1 if v1 is less than v2
//  *          - 0 if v1 is equal to v2
//  */
export function compareVersions(v1: string, v2: string): number {
    // Extract only the numeric parts of the version string
    const getVersionNumbers = (str: string): string => {
        const match = str.match(/(\d+(\.\d+)*)/);
        return match ? match[0] : "0";
    };

    const version1 = getVersionNumbers(v1);
    const version2 = getVersionNumbers(v2);

    const parts1 = version1.split(".").map((part) => parseInt(part, 10));
    const parts2 = version2.split(".").map((part) => parseInt(part, 10));
    const part1 = parts1[0] || 0;
    const part2 = parts2[0] || 0;

    if (part1 > part2) {
        return 1;
    }
    if (part1 < part2) {
        return -1;
    }
    return 0;
}

export function getServerPathFromConfig(): string | undefined {
    let siddhiHome = vscode.workspace.getConfiguration().get(SIDDHI_HOME_CONFIG) as string;
    if (siddhiHome) {
        return siddhiHome;
    } else {
        return process.env.SIDDHI_HOME;
    }
}

export function getJavaHomeFromConfig(): string | undefined {
    let javaHome = vscode.workspace.getConfiguration().get("siddhi.javaHome") as string;
    if (javaHome) {
        return javaHome;
    } else {
        return process.env.JAVA_HOME;
    }
}

function getCurrentUpdateVersion(siPath: string): string {
    const updateConfigPath = path.join(siPath, "updates", "config.json");
    if (fs.existsSync(updateConfigPath)) {
        const configContent = fs.readFileSync(updateConfigPath, "utf8");
        const updateConfig = JSON.parse(configContent);
        return updateConfig["update-level"] || "0";
    }
    return "0";
}

function getLatestSIPathFromCache(siVersion: string): { path: string; version: string } | null {
    const siCachePath = path.join(CACHED_FOLDER, "streaming-integrator");
    if (fs.existsSync(siCachePath)) {
        const siFolders = fs.readdirSync(siCachePath, { withFileTypes: true });
        let highestUpdateVersion = "0";
        let latestSIPath = "";
        for (const folder of siFolders) {
            if (folder.isDirectory()) {
                const siHomePath = path.join(siCachePath, folder.name);
                const siRuntimeVersion = getSIVersion(siHomePath);
                if (siRuntimeVersion && compareVersions(siVersion, siRuntimeVersion) === 0) {
                    const updateVersion = getCurrentUpdateVersion(siHomePath);
                    if (compareVersions(updateVersion, highestUpdateVersion) >= 0) {
                        highestUpdateVersion = updateVersion;
                        latestSIPath = siHomePath;
                    }
                }
            }
        }
        return latestSIPath ? { path: latestSIPath, version: highestUpdateVersion } : null;
    }
    return null;
}

export async function getSetupDetails(): Promise<SetupDetails> {
    let serverPath = getServerPathFromConfig();
    let siVersionStatus: "valid" | "not-valid" = "not-valid";
    let siVersion: string | null = null;
    let javaDetails: PathDetailsResponse = await checkJava();
    let siDetails: PathDetailsResponse = { status: "not-valid", path: serverPath };
    let recommendedVersions: { siVersion: string; javaVersion: string } | undefined = {
        siVersion: LATEST_SI_VERSION,
        javaVersion: supportedJavaVersionsForSI[LATEST_SI_VERSION],
    };
    let requiredJavaVersion: string | undefined = supportedJavaVersionsForSI[LATEST_SI_VERSION];

    if (serverPath) {
        siVersion = getSIVersion(serverPath);
        if (siVersion) {
            siVersionStatus = "valid";
            siDetails = { ...siDetails, version: siVersion, status: "valid" };
            requiredJavaVersion = supportedJavaVersionsForSI[siVersion] || requiredJavaVersion;
        }
    }
    if (javaDetails.status == "valid" && compareVersions(requiredJavaVersion, javaDetails.version as string) == -1) {
        javaDetails.status = "not-valid";
    }
    return {
        siVersionStatus,
        javaDetails,
        siDetails,
        showDownloadButtons: javaDetails.status !== "valid" || siVersionStatus !== "valid",
        recommendedVersions,
    };
}

function checkJava(): Promise<PathDetailsResponse> {
    let javaHome = getJavaHomeFromConfig();
    if (javaHome) {
        return new Promise((resolve) => {
            resolve({
                status: "valid",
                version: getJavaVersion(path.join(javaHome, "bin")) as string,
                path: javaHome,
            });
        });
    }
    return new Promise((resolve) => {
        exec("java -XshowSettings:properties -version", (error, stdout, stderr) => {
            if (error) {
                resolve({ status: "not-valid" });
                return;
            }

            const output = stdout + stderr;

            const versionMatch = output.match(/^\s*java\.version = (.+)$/m);
            const javaHomeMatch = output.match(/^\s*java\.home = (.+)$/m);

            resolve({
                status: "valid",
                version: versionMatch?.[1],
                path: javaHomeMatch?.[1],
            });
        });
    });
}

export async function setPathsInConfiguration(request: SetPathRequest): Promise<PathDetailsResponse> {
    let response: PathDetailsResponse = { status: "not-valid" };
    let config = vscode.workspace.getConfiguration("siddhi");
    if (request.type === "JAVA") {
        const validJavaHome = verifyJavaHomePath(request.path);
        if (validJavaHome) {
            const javaVersion = getJavaVersion(path.join(validJavaHome, "bin"));
            if (compareVersions(supportedJavaVersionsForSI[LATEST_SI_VERSION], javaVersion as string) != -1) {
                response = { status: "valid", path: validJavaHome };
            } else {
                response = { status: "not-valid", path: validJavaHome };
            }
        }
        if (response.status !== "not-valid") {
            config.update("javaHome", validJavaHome, vscode.ConfigurationTarget.Global);
        } else {
            vscode.window.showErrorMessage(
                "Invalid Java Home path or Unsupported version. Please set a valid Java Home path. "
            );
        }
    } else if (request.type === "SI") {
        const validServerPath = verifySIPath(request.path);
        if (validServerPath) {
            response = { status: "valid", path: validServerPath };
        }
        if (response.status !== "not-valid") {
            config.update("home", validServerPath, vscode.ConfigurationTarget.Global);
        } else {
            vscode.window.showErrorMessage(INVALID_SERVER_PATH_MSG);
        }
    }
    return response;
}

export async function getServerPath(): Promise<string | undefined> {
    const currentPath = getServerPathFromConfig();
    if (currentPath) {
        return path.normalize(currentPath);
    }
    await vscode.commands.executeCommand(VS_CODE_COMMANDS.CHANGE_SERVER_PATH);
    const updatedPath = getServerPathFromConfig();
    if (updatedPath) {
        return path.normalize(updatedPath);
    }
    return updatedPath;
}

export async function getJavaHome(): Promise<string | undefined> {
    const currentPath = getJavaHomeFromConfig();
    if (currentPath) {
        return path.normalize(currentPath);
    }
    await vscode.commands.executeCommand(VS_CODE_COMMANDS.CHANGE_SERVER_PATH);
    const updatedPath = getJavaHomeFromConfig();
    if (updatedPath) {
        return path.normalize(updatedPath);
    }
    return updatedPath;
}
