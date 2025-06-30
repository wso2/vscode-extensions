import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import child_process, { spawnSync } from 'child_process';
import axios from 'axios';
import { downloadWithProgress, extractWithProgress, selectFolderDialog } from './fileOperations';
import { extension } from '../MIExtensionContext';
import { copyMavenWrapper } from '.';
import { SELECTED_JAVA_HOME, SELECTED_SERVER_PATH } from '../debugger/constants';
import { COMMANDS } from '../constants';
import { SetPathRequest, PathDetailsResponse, SetupDetails } from '@wso2/mi-core';
import { parseStringPromise } from 'xml2js';
import { LATEST_CAR_PLUGIN_VERSION } from './templates';
import { runCommand, runBasicCommand } from '../test-explorer/runner';
import { XMLParser, XMLBuilder } from "fast-xml-parser";

const AdmZip = require('adm-zip');
// Add Latest MI version as the first element in the array
export const supportedJavaVersionsForMI: { [key: string]: string } = {
    '4.4.0': '21',
    '4.3.0': '17',
    '4.2.0': '17',
    '4.1.0': '11',
};
export const LATEST_MI_VERSION = "4.4.0";
const COMPATIBLE_JDK_VERSION = "11";
const miDownloadUrls: { [key: string]: string } = {
    '4.4.0-UPDATED': 'https://mi-distribution.wso2.com/4.4.0/wso2mi-4.4.0-UPDATED.zip',
    '4.4.0': 'https://mi-distribution.wso2.com/4.4.0/wso2mi-4.4.0.zip',
    '4.3.0': 'https://mi-distribution.wso2.com/4.3.0/wso2mi-4.3.0.zip'
};

export const miUpdateVersionCheckUrl: string = process.env.MI_UPDATE_VERSION_CHECK_URL as string;
export const ADOPTIUM_API_BASE_URL: string = process.env.ADOPTIUM_API_BASE_URL as string;

const CACHED_FOLDER = path.join(os.homedir(), '.wso2-mi');

let ballerinaOutputChannel: vscode.OutputChannel | undefined;

export async function setupEnvironment(projectUri: string, isOldProject: boolean): Promise<boolean> {
    try {
        const wrapperFiles = await vscode.workspace.findFiles(
            new vscode.RelativePattern(projectUri, '{mvnw,mvnw.cmd}'),
            '**/node_modules/**',
            1
        );
        if (!isOldProject) {
            if (wrapperFiles.length === 0) {
                await copyMavenWrapper(
                    extension.context.asAbsolutePath(path.join('resources', 'maven-wrapper')),
                    projectUri
                );
            }
            setupConfigFiles(projectUri);
        }
        const { miVersionFromPom } = await getProjectSetupDetails(projectUri);
        if (!miVersionFromPom) {
            return false;
        }
        const versions: string[] = ["4.0.0", "4.1.0", "4.2.0", "4.3.0"];
        if (miVersionFromPom && versions.includes(miVersionFromPom)) {
            const config = vscode.workspace.getConfiguration('MI', vscode.Uri.parse(projectUri));
            await config.update("LEGACY_EXPRESSION_ENABLED", true, vscode.ConfigurationTarget.Workspace);
        }
        const isMISet = await isMISetup(projectUri, miVersionFromPom);
        const isJavaSet = await isJavaSetup(projectUri, miVersionFromPom);

        if (isMISet && isJavaSet) {
            const isUpdateRequested = await isServerUpdateRequested();
            return !isUpdateRequested;
        }
        return isMISet && isJavaSet;
    } catch (error) {
        console.error('Error setting up environment:', error);
        vscode.window.showErrorMessage(`Error setting up environment: ${error instanceof Error ? error.message : error}`);
        return false;
    }
}

export async function isMIUpToDate(): Promise<boolean> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const config = vscode.workspace.getConfiguration('MI', workspaceFolder.uri);
        const currentServerPath = config.get<string>(SELECTED_SERVER_PATH);
        if (currentServerPath) {
            const currentMIVersion = getMIVersion(currentServerPath);
            if (currentMIVersion) {
                const latestUpdateVersion = await fetchLatestMIVersion(currentMIVersion);
                const currentUpdateVersion = getCurrentUpdateVersion(currentServerPath);
                return compareVersions(latestUpdateVersion, currentUpdateVersion) <= 0;
            }
        }
    }
    return false;
}

export async function getProjectSetupDetails(projectUri: string): Promise<SetupDetails> {
    const miVersion = await getMIVersionFromPom();
    if (!miVersion) {
        vscode.window.showErrorMessage('Failed to get Micro Integrator version from pom.xml.');
        return { miVersionStatus: 'missing', javaDetails: { status: 'not-valid' }, miDetails: { status: 'not-valid' } };
    }
    if (isSupportedMIVersion(miVersion)) {
        const recommendedVersions = { miVersion, javaVersion: supportedJavaVersionsForMI[miVersion] };
        const setupDetails = await getJavaAndMIPathsFromWorkspace(projectUri, miVersion);
        return { ...setupDetails, miVersionStatus: 'valid', showDownloadButtons: isDownloadableMIVersion(miVersion), recommendedVersions, miVersionFromPom: miVersion };
    }

    return { miVersionStatus: 'not-valid', javaDetails: { status: 'not-valid' }, miDetails: { status: 'not-valid' } };
}
export async function getMIVersionFromPom(): Promise<string | null> {
    const pomFiles = await vscode.workspace.findFiles('pom.xml', '**/node_modules/**', 1);
    if (pomFiles.length === 0) {
        vscode.window.showErrorMessage('pom.xml not found.');
        return null;
    }

    const pomContent = await vscode.workspace.openTextDocument(pomFiles[0]);
    const result = await parseStringPromise(pomContent.getText(), { explicitArray: false, ignoreAttrs: true });
    const runtimeVersion = result?.project?.properties?.["project.runtime.version"];
    return runtimeVersion;
}

export function filterConnectorVersion(connectorName: string, connectors: any[] | undefined): string {
    if (!connectors) {
        return '';
    }
    for (const connector of connectors) {
        if (connector.connectorName === connectorName) {
            return connector.version.tagName;
        }
    }
    return '';
}

export function generateInitialDependencies(httpConnectorVersion: string): string {
    if (!httpConnectorVersion || httpConnectorVersion === '') {
        return '';
    }
    return `<dependencies>
        <dependency>
            <groupId>org.wso2.integration.connector</groupId>
            <artifactId>mi-connector-http</artifactId>
            <version>${httpConnectorVersion}</version>
            <type>zip</type>
            <exclusions>
                <exclusion>
                    <groupId>*</groupId>
                    <artifactId>*</artifactId>
                </exclusion>
            </exclusions>
        </dependency>
    </dependencies>`
}

async function isMISetup(projectUri: string, miVersion: string): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('MI');
    const currentMIPath = config.get<string>(SELECTED_SERVER_PATH);
    if (currentMIPath) {
        const availableMIVersion = getMIVersion(currentMIPath);
        if (availableMIVersion && isCompatibleMIVersion(availableMIVersion, miVersion)) {
            if (availableMIVersion !== miVersion) {
                showMIPathChangePrompt();
            }
            return true;
        } else {
            vscode.window.showErrorMessage('Invalid Micro Integrator path or Unsupported version found in the workspace. Please set a valid Micro Integrator path.');
            return false;
        }
    }

    const oldServerPath: string | undefined = extension.context.globalState.get(SELECTED_SERVER_PATH);
    if (oldServerPath) {
        const availableMIVersion = getMIVersion(oldServerPath);
        if (availableMIVersion && compareVersions(availableMIVersion, miVersion) >= 0) {
            if (availableMIVersion !== miVersion) {
                showMIPathChangePrompt();
            }
        }

        const miCachedPathInfo = getLatestMIPathFromCache(miVersion);
        if (miCachedPathInfo && miCachedPathInfo.path) {
            await config.update(SELECTED_SERVER_PATH, miCachedPathInfo.path, vscode.ConfigurationTarget.Workspace);
            return true;
        }
    }

    return false;
    function showMIPathChangePrompt() {
        const DONT_SHOW_AGAIN_KEY = 'dontShowMIPathChangePrompt';
        const dontShowAgain = extension.context.globalState.get<boolean>(DONT_SHOW_AGAIN_KEY);

        if (dontShowAgain) {
            return;
        }

        const downloadOption = 'Download Micro Integrator';
        const changePathOption = 'Change Micro Integrator Path';
        const dontShowAgainOption = 'Don\'t Show Again';

        vscode.window
            .showWarningMessage(
                'The selected Micro Integrator version is different from the version in the workspace. Do you want to change the Micro Integrator path?',
                downloadOption,
                changePathOption,
                dontShowAgainOption
            )
            .then((selection) => {
                if (selection) {
                    if (selection === downloadOption) {
                        downloadMI(projectUri, miVersion).then((miPath) => {
                            if (miPath) {
                                setPathsInWorkSpace({ projectUri, type: 'MI', path: miPath });
                            }
                        });
                    } else if (selection === changePathOption) {
                        selectFolderDialog('Select Micro Integrator Path').then((miPath) => {
                            if (miPath) {
                                const validMIPath = verifyMIPath(miPath.fsPath);
                                if (validMIPath) {
                                    setPathsInWorkSpace({ projectUri, type: 'MI', path: validMIPath });
                                } else {
                                    vscode.window.showErrorMessage('Invalid Micro Integrator path. Please set a valid Micro Integrator path and run the command again.');
                                }
                            }
                        });
                    } else if (selection === dontShowAgainOption) {
                        extension.context.globalState.update(DONT_SHOW_AGAIN_KEY, true);
                    }
                }
            });
    }
}
async function isJavaSetup(projectUri: string, miVersion: string): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('MI');
    const currentJavaHome = config.get<string>(SELECTED_JAVA_HOME);
    if (currentJavaHome) {
        const currentJavaVersion = getJavaVersion(path.join(currentJavaHome, 'bin')) ?? '';
        if (isCompatibleJavaVersionForMI(currentJavaVersion, miVersion)) {
            if (!isRecommendedJavaVersionForMI(currentJavaVersion, miVersion)) {
                showJavaHomeChangePrompt();
            }
            return true;
        } else {
            vscode.window.showErrorMessage('Invalid Java Home path or Unsupported version found in the workspace. Please set a valid Java Home path.');
            return false;
        }
    }

    const globalJavaHome: string | undefined = extension.context.globalState.get(SELECTED_JAVA_HOME);
    if (globalJavaHome) {
        const javaVersion = getJavaVersion(path.join(globalJavaHome, 'bin')) ?? '';
        if (isCompatibleJavaVersionForMI(javaVersion, miVersion)) {
            if (!isRecommendedJavaVersionForMI(javaVersion, miVersion)) {
                showJavaHomeChangePrompt();
            }
            await config.update(SELECTED_JAVA_HOME, globalJavaHome, vscode.ConfigurationTarget.Workspace);
            return true;
        }
    }

    const javaHome = getJavaHomeForMIVersionFromCache(miVersion);

    if (javaHome) {
        await config.update(SELECTED_JAVA_HOME, path.normalize(javaHome), vscode.ConfigurationTarget.Workspace);
        return true;
    }
    if (process.env.JAVA_HOME) {
        const javaVersion = getJavaVersion(path.join(process.env.JAVA_HOME, 'bin')) ?? '';
        if (isCompatibleJavaVersionForMI(javaVersion, miVersion)) {
            if (!isRecommendedJavaVersionForMI(javaVersion, miVersion)) {
                showJavaHomeChangePrompt();
            }
            await config.update(SELECTED_JAVA_HOME, process.env.JAVA_HOME, vscode.ConfigurationTarget.Workspace);
            return true;
        }
    }
    return false;

    function showJavaHomeChangePrompt() {
        const DONT_SHOW_AGAIN_KEY = 'dontShowJavaHomeChangePrompt';
        const dontShowAgain = extension.context.globalState.get<boolean>(DONT_SHOW_AGAIN_KEY);

        if (dontShowAgain) {
            return;
        }

        const downloadOption = 'Download Java';
        const changePathOption = 'Change Java Home';
        const dontShowAgainOption = 'Don\'t Show Again';

        vscode.window
            .showWarningMessage(
                'The selected Java version is not recommended with the Micro Integrator version. Do you want to change the Java Home path?',
                downloadOption,
                changePathOption,
                dontShowAgainOption
            )
            .then((selection) => {
                if (selection) {
                    if (selection === downloadOption) {
                        downloadJavaFromMI(projectUri, miVersion).then((javaPath) => {
                            if (javaPath) {
                                setPathsInWorkSpace({ projectUri, type: 'JAVA', path: javaPath });
                            }
                        });
                    } else if (selection === changePathOption) {
                        selectFolderDialog('Select Java Home').then((javaHome) => {
                            if (javaHome) {
                                const validJavaHome = verifyJavaHomePath(javaHome.fsPath);
                                if (validJavaHome) {
                                    setPathsInWorkSpace({ projectUri, type: 'JAVA', path: validJavaHome });
                                } else {
                                    vscode.window.showErrorMessage('Invalid Java Home path. Please set a valid Java Home path and run the command again.');
                                }
                            }
                        });
                    } else if (selection === dontShowAgainOption) {
                        extension.context.globalState.update(DONT_SHOW_AGAIN_KEY, true);
                    }
                }
            });
    }
}

export function verifyJavaHomePath(folderPath: string): string | null {
    const javaExecutableName = process.platform === 'win32' ? 'java.exe' : 'java';
    let javaPath = path.join(folderPath, 'bin', javaExecutableName);
    let javaHomePath: string | null = null;

    if (fs.existsSync(javaPath)) {
        javaHomePath = path.normalize(folderPath);
    }

    javaPath = path.join(folderPath, javaExecutableName);
    if (fs.existsSync(javaPath)) {
        javaHomePath = path.normalize(path.join(folderPath, '..'));
    }

    if (javaHomePath) {
        const javaVersion = getJavaVersion(path.join(javaHomePath, 'bin'));
        if (javaVersion && isSupportedJavaVersionForLS(javaVersion)) {
            return javaHomePath;
        }
    }
    return null;
}
export function verifyMIPath(folderPath: string): string | null {
    const miExecutable = process.platform === 'win32' ? 'micro-integrator.bat' : 'micro-integrator.sh';
    let miPath = path.join(folderPath, 'bin', miExecutable);
    let miHomePath: string | null = null;

    if (fs.existsSync(miPath)) {
        miHomePath = path.normalize(folderPath);
    }

    miPath = path.join(folderPath, miExecutable);
    if (fs.existsSync(miPath)) {
        miHomePath = path.normalize(path.join(folderPath, '..'));
    }

    if (miHomePath) {
        const miVersion = getMIVersion(miHomePath);
        if (miVersion && isSupportedMIVersion(miVersion)) {
            return miHomePath;
        }
    }

    return null;
}

export function getSupportedMIVersionsHigherThan(version: string): string[] {
    if (version) {
        return Object.keys(supportedJavaVersionsForMI).filter((v) => compareVersions(v, version) >= 0);
    }
    return Object.keys(supportedJavaVersionsForMI);
}

export async function downloadJavaFromMI(projectUri: string, miVersion: string): Promise<string> {
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

    const javaVersion = supportedJavaVersionsForMI[miVersion];
    const javaPath = path.join(CACHED_FOLDER, 'java');
    const osType = os.type();

    const osMap: { [key: string]: string } = {
        Darwin: 'mac',
        Linux: 'linux',
        Windows_NT: 'windows',
    };

    const archMap: { [key: string]: string } = {
        x64: 'x64',
        x32: 'x86',
        arm64: 'aarch64',
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
            throw new Error('Unsupported Java version.');
        }

        if (!fs.existsSync(javaPath)) {
            fs.mkdirSync(javaPath, { recursive: true });
        }

        const apiUrl = `${ADOPTIUM_API_BASE_URL}/${javaVersion}/ga?architecture=${archName}&heap_size=normal&image_type=jdk&jvm_impl=hotspot&os=${osName}&project=jdk&vendor=eclipse`;

        const response = await axios.get<AdoptiumApiResponse[]>(apiUrl);
        if (response.data.length === 0) {
            throw new Error(`Failed to find Java binaries for version ${javaVersion}.`);
        }

        const targetRelease = response.data[0];

        if (!targetRelease) {
            throw new Error(
                `Java version ${javaVersion} not found for the specified OS and architecture.`
            );
        }

        const downloadUrl = targetRelease.binaries[0].package.link;
        const releaseName = targetRelease.release_name;

        const javaDownloadPath = path.join(
            javaPath,
            osType === 'Windows_NT' ? `${releaseName}.zip` : `${releaseName}.tar.gz`
        );

        await downloadWithProgress(projectUri, downloadUrl, javaDownloadPath, 'Downloading Java');
        await extractWithProgress(javaDownloadPath, javaPath, 'Extracting Java');

        if (osType === 'Darwin') {
            return path.join(javaPath, releaseName, 'Contents', 'Home');
        } else {
            return path.join(javaPath, releaseName);
        }
    } catch (error) {
        throw new Error(
            `Failed to download Java. ${error instanceof Error ? error.message : error
            }.
            If issue persists, please download and install Java ${javaVersion} manually.`
        );
    }
}

export async function downloadMI(projectUri: string, miVersion: string, isUpdatedPack?: boolean): Promise<string> {
    const miPath = path.join(CACHED_FOLDER, 'micro-integrator');

    try {
        if (!fs.existsSync(miPath)) {
            fs.mkdirSync(miPath, { recursive: true });
        }
        const miDownloadUrl = isUpdatedPack ? miDownloadUrls[miVersion + '-UPDATED'] : miDownloadUrls[miVersion];
        const zipName = miDownloadUrl.split('/').pop();
        const miDownloadPath = path.join(miPath, zipName!);

        if (!fs.existsSync(miDownloadPath)) {
            await downloadWithProgress(projectUri, miDownloadUrl, miDownloadPath, 'Downloading Micro Integrator');
        } else {
            vscode.window.showInformationMessage('Micro Integrator already downloaded.');
        }
        await extractWithProgress(miDownloadPath, miPath, 'Extracting Micro Integrator');

        return getLatestMIPathFromCache(miVersion)?.path!;

    } catch (error) {
        if ((error as Error).message?.includes('Error while extracting the archive')) {
            vscode.window.showWarningMessage('The Micro Integrator archive is invalid. Attempting to redownload the Micro Integrator.');
            return downloadMI(projectUri, miVersion, isUpdatedPack);
        }
        throw new Error('Failed to download Micro Integrator.');
    }
}

function isSupportedJavaVersionForLS(version: string): boolean {
    if (!version) {
        return false;
    }
    return compareVersions(version, COMPATIBLE_JDK_VERSION) >= 0;
}
function isSupportedMIVersion(version: string): boolean {
    return Object.keys(supportedJavaVersionsForMI).includes(version);
}
function isDownloadableMIVersion(version: string): boolean {
    return miDownloadUrls[version] !== undefined;
}

function getJavaVersion(javaBinPath: string): string | null {
    const javaExecutableName = process.platform === 'win32' ? 'java.exe' : 'java';
    const javaExecutable = path.join(javaBinPath, javaExecutableName);
    const result = spawnSync(javaExecutable, ['-version'], { encoding: 'utf8' });

    if (result.error || result.status !== 0) {
        return null;
    }
    const versionMatch = result.stderr.match(/(\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[0].split('.')[0] : null;
}
function getMIVersion(miPath: string): string | null {
    const miVersionFile = path.join(miPath, 'bin', 'version.txt');
    if (!isMIInstalledAtPath(miPath) || !fs.existsSync(miVersionFile)) {
        return null;
    }
    const miVersionContent = fs.readFileSync(miVersionFile, 'utf8');
    const versionMatch = miVersionContent.match(/v(\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[1] : null;
}
function isRecommendedJavaVersionForMI(javaVersion: string, miVersion: string): boolean {
    if (!javaVersion || !miVersion) {
        return false;
    }
    const supportedVersion = supportedJavaVersionsForMI[miVersion];
    return supportedVersion ? javaVersion === supportedVersion : false;
}
function isCompatibleJavaVersionForMI(javaVersion: string, miVersion: string): boolean {
    if (!javaVersion || !miVersion) {
        return false;
    }
    return isSupportedJavaVersionForLS(javaVersion) &&
        compareVersions(javaVersion, supportedJavaVersionsForMI[miVersion]) <= 0; // higher java version not compatible
}

function isCompatibleMIVersion(runtimeVersion: string, projectVersion: string): boolean {
    if (!projectVersion || !runtimeVersion) {
        return false;
    }
    return compareVersions(runtimeVersion, projectVersion) >= 0; // lower mi version not compatible
}

function isMIInstalledAtPath(miPath: string): boolean {
    const miExecutable = process.platform === 'win32' ? 'micro-integrator.bat' : 'micro-integrator.sh';
    return fs.existsSync(path.join(miPath, 'bin', miExecutable));
}
export async function setPathsInWorkSpace(request: SetPathRequest): Promise<PathDetailsResponse> {
    const projectMIVersion = await getMIVersionFromPom();

    let response: PathDetailsResponse = { status: 'not-valid' };
    if (projectMIVersion) {
        const config = vscode.workspace.getConfiguration('MI');
        if (request.type === 'JAVA') {
            const validJavaHome = verifyJavaHomePath(request.path);
            if (validJavaHome) {
                const javaVersion = getJavaVersion(path.join(validJavaHome, 'bin'));
                if (supportedJavaVersionsForMI[projectMIVersion] === javaVersion) {
                    response = { status: "valid", path: validJavaHome, version: javaVersion };
                } else if (javaVersion && isCompatibleJavaVersionForMI(javaVersion, projectMIVersion)) {
                    response = { status: "mismatch", path: validJavaHome, version: javaVersion! };
                }
            }
            if (response.status !== 'not-valid') {
                config.update(SELECTED_JAVA_HOME, validJavaHome, vscode.ConfigurationTarget.Workspace);
                extension.context.globalState.update(SELECTED_JAVA_HOME, validJavaHome);

            } else {
                vscode.window.showErrorMessage('Invalid Java Home path or Unsupported version. Please set a valid Java Home path. ');
            }
        }
        else if (request.type === 'MI') {
            const validServerPath = verifyMIPath(request.path);
            if (validServerPath) {
                const runtimeVersion = getMIVersion(validServerPath);
                if (projectMIVersion === runtimeVersion) {
                    response = { status: "valid", path: validServerPath, version: runtimeVersion };
                } else if (runtimeVersion && compareVersions(runtimeVersion, projectMIVersion) >= 0) {
                    response = { status: "mismatch", path: validServerPath, version: runtimeVersion! };
                }
            }
            if (response.status !== 'not-valid') {
                config.update(SELECTED_SERVER_PATH, validServerPath, vscode.ConfigurationTarget.Workspace);
                extension.context.globalState.update(SELECTED_SERVER_PATH, validServerPath);
                config.update('suppressServerUpdateNotification', true, vscode.ConfigurationTarget.Workspace);
            } else {
                vscode.window.showErrorMessage('Invalid Micro Integrator path or Unsupported version. Please set a valid Micro Integrator path');
            }

        }
    }
    return response;
}

async function getJavaAndMIPathsFromWorkspace(projectUri: string, projectMiVersion: string): Promise<SetupDetails> {
    const response: SetupDetails = {
        javaDetails: { status: 'not-valid', version: supportedJavaVersionsForMI[projectMiVersion] },
        miDetails: { status: 'not-valid', version: projectMiVersion }
    };
    if (projectMiVersion) {
        const config = vscode.workspace.getConfiguration('MI', vscode.Uri.parse(projectUri));

        const javaHome = config.get<string>(SELECTED_JAVA_HOME);
        const validJavaHome = javaHome && verifyJavaHomePath(javaHome) ||
            getJavaFromGlobalOrEnv(projectMiVersion) ||
            getJavaHomeForMIVersionFromCache(projectMiVersion);
        if (validJavaHome) {
            const javaVersion = getJavaVersion(path.join(validJavaHome, 'bin'));
            if (supportedJavaVersionsForMI[projectMiVersion] === javaVersion) {
                response.javaDetails = { status: "valid", path: validJavaHome, version: javaVersion };
            } else if (javaVersion && isCompatibleJavaVersionForMI(javaVersion, projectMiVersion)) {
                response.javaDetails = { status: "mismatch", path: validJavaHome, version: javaVersion! };
            }
        }
        const serverPath = config.get<string>(SELECTED_SERVER_PATH);
        const validServerPath = serverPath && verifyMIPath(serverPath) ||
            getMIFromGlobal(projectMiVersion) ||
            getLatestMIPathFromCache(projectMiVersion)?.path;

        if (validServerPath) {
            const miVersion = getMIVersion(validServerPath);
            if (projectMiVersion === miVersion) {
                let status: "valid" | "valid-not-updated" | "mismatch" | "not-valid" = "valid";
                if (miVersion === "4.4.0") {
                    const isUpdatedPack = await isMIUpToDate();
                    status = isUpdatedPack ? "valid" : "valid-not-updated";
                }
                response.miDetails = { status: status, path: validServerPath, version: miVersion };
            } else if (miVersion && isCompatibleMIVersion(miVersion, projectMiVersion)) {
                response.miDetails = { status: "mismatch", path: validServerPath, version: miVersion! };
            }
        }
    }

    return response;
}

export async function updatePomForClassMediator(projectUri: string): Promise<void> {
    const pomFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(projectUri, 'pom.xml'),
        '**/node_modules/**',
        1
    );
    if (pomFiles.length === 0) {
        throw new Error('pom.xml not found in the specified project.');
    }
    const pomContent = await vscode.workspace.openTextDocument(pomFiles[0]);
    const originalXml = pomContent.getText();

    const parser = new XMLParser({
        ignoreAttributes: false,
        preserveOrder: true
    });
    const parsedXml = parser.parse(originalXml);

    updatePomXml(parsedXml, "project.packaging", "jar");

    createTagIfNotFound(parsedXml, "project.dependencies");
    const dependencyXml = {
        dependency: [
            { groupId: [{ "#text": "org.apache.synapse" }] },
            { artifactId: [{ "#text": "synapse-core" }] },
            { version: [{ "#text": "4.0.0-wso2v165" }] }
        ]
    };

    parsedXml.forEach((node: any) => {
        if (Array.isArray(node.project)) {
            node.project.forEach((projectNode: any) => {
                if (projectNode.dependencies) {
                    projectNode.dependencies.push(dependencyXml);
                }
            });
        }
    });

    const builder = new XMLBuilder({
        ignoreAttributes: false,
        format: true,
        preserveOrder: true,
        commentPropName: "#comment",
        indentBy: "    "
    });

    const updatedXml = builder.build(parsedXml);

    await fs.promises.writeFile(pomFiles[0].fsPath, updatedXml);
}

export async function updateRuntimeVersionsInPom(version: string): Promise<void> {
    const pomFiles = await vscode.workspace.findFiles('pom.xml', '**/node_modules/**', 1);
    if (pomFiles.length === 0) {
        throw new Error('pom.xml not found.');
    }
    const pomContent = await vscode.workspace.openTextDocument(pomFiles[0]);
    const originalXml = pomContent.getText();

    const parser = new XMLParser({
        ignoreAttributes: false,
        preserveOrder: true,
        commentPropName: "#comment"
    });
    const parsedXml = parser.parse(originalXml);

    createTagIfNotFound(parsedXml, "project.properties");
    updatePomXml(parsedXml, "project.properties.{project.runtime.version}", version);
    updatePomXml(parsedXml, "project.properties.{car.plugin.version}", LATEST_CAR_PLUGIN_VERSION);
    updatePomXml(parsedXml, "project.properties.{dockerfile.base.image}", "wso2/wso2mi:${project.runtime.version}");
    updatePomXml(parsedXml, "project.profiles.profile.build.plugins.plugin[artifactId=vscode-car-plugin].version", "${car.plugin.version}");
    updatePomXml(parsedXml, "project.profiles.profile.build.plugins.plugin[artifactId=mi-container-config-mapper].executions.execution[id=config-mapper-parser].configuration.miVersion", "${project.runtime.version}");

    const builder = new XMLBuilder({
        ignoreAttributes: false,
        format: true,
        preserveOrder: true,
        commentPropName: "#comment",
        indentBy: "    "
    });

    const updatedXml = builder.build(parsedXml);

    await fs.promises.writeFile(pomFiles[0].fsPath, updatedXml);
}

function createTagIfNotFound(parsedXml: any[], path: string) {
    const pathParts = path.split('.');
    let currentNode = parsedXml;
    let parentNode = null as any;

    for (const part of pathParts) {
        if (Array.isArray(currentNode)) {
            // If currentNode is an array, find the first object with the property
            const foundNode = currentNode.find((node: any) => node[part]);
            if (foundNode) {
                parentNode = currentNode;
                currentNode = foundNode[part];
            } else {
                // Create a new object and push it to the array
                const newNode = { [part]: [] };
                currentNode.push(newNode);
                parentNode = currentNode;
                currentNode = newNode[part];
            }
        }
    }
}

/**
 * Updates values in a parsed XML object using path notation
 * 
 * @param parsedXml - The parsed XML object (array-based structure from XMLParser with preserveOrder:true)
 * @param path - Path with special notation:
 *   - Regular nested elements: "project.properties"
 *   - Properties with dots in name: "project.properties.{project.runtime.version}"
 *   - Conditional selection: "plugin[artifactId=vscode-car-plugin]"
 * @param value - The new value to set
 * @param createIfNotFound - Whether to create the last node if not found (default: true)
 */
function updatePomXml(parsedXml: any[], path: string, value: string, createIfNotFound = true): void {
    // Parse the path parts, handling the special curly brace syntax for properties with dots
    const pathParts = extractPathParts();

    traverseWithPath(parsedXml, 0);

    function extractPathParts() {
        const pathParts = [] as any[];
        let currentPart = '';
        let inCurlyBraces = false;

        // Parse the path, handling the curly brace notation
        for (let i = 0; i < path.length; i++) {
            const char = path[i];

            if (char === '{' && !inCurlyBraces) {
                // Start of curly brace section
                inCurlyBraces = true;
                if (currentPart) {
                    pathParts.push(currentPart);
                    currentPart = '';
                }
            } else if (char === '}' && inCurlyBraces) {
                // End of curly brace section
                inCurlyBraces = false;
                pathParts.push(currentPart);
                currentPart = '';
            } else if (char === '.' && !inCurlyBraces) {
                // Path separator (only outside curly braces)
                if (currentPart) {
                    pathParts.push(currentPart);
                    currentPart = '';
                }
            } else {
                // Regular character
                currentPart += char;
            }
        }

        // Add the last part if there is one
        if (currentPart) {
            pathParts.push(currentPart);
        }
        return pathParts;
    }

    function traverseWithPath(currentNodes: any[], currentPathIndex: number): void {
        if (currentPathIndex >= pathParts.length) {
            return;
        }
        const currentPathPart = pathParts[currentPathIndex];

        // For the last path part, update the value
        if (currentPathIndex === pathParts.length - 1 && currentPathPart) {
            let updated = false;
            for (const node of currentNodes) {
                if (Array.isArray(node[currentPathPart])) {
                    if (node[currentPathPart].length > 0) {
                        node[currentPathPart][0]["#text"] = value;
                    } else {
                        node[currentPathPart].push({ "#text": value });
                    }
                    updated = true;
                }
            }
            // If node not found, add it
            if (createIfNotFound && !updated) {
                const newNode = { [currentPathPart]: [{ "#text": value }] };
                currentNodes.push(newNode);
            }
        } else {
            const conditionMatch = currentPathPart.match(/^(.+)\[(.+)=(.+)\]$/);
            if (conditionMatch) {
                const [_, elementName, conditionProp, conditionValue] = conditionMatch;
                // Find all nodes with this element name that match the condition
                for (const node of currentNodes) {
                    if (Array.isArray(node[elementName])) {
                        for (const element of node[elementName]) {
                            if (typeof element[conditionProp] === 'object' &&
                                element[conditionProp][0]?.["#text"] === conditionValue) {
                                traverseWithPath(node[elementName], currentPathIndex + 1);
                            }
                        }
                    }
                }
            } else {
                for (const node of currentNodes) {
                    if (Array.isArray(node[currentPathPart])) {
                        traverseWithPath(node[currentPathPart], currentPathIndex + 1);
                    }
                }
            }
        }
    }
}

function getJavaFromGlobalOrEnv(miVersion: string): string | undefined {
    const defaultJavaHome = extension.context.globalState.get<string>(SELECTED_JAVA_HOME);
    if (defaultJavaHome) {
        const defaultJavaVersion = getJavaVersion(path.join(defaultJavaHome, 'bin')) ?? '';
        if (isCompatibleJavaVersionForMI(defaultJavaVersion, miVersion)) {
            return defaultJavaHome;
        }
    }
    const environmentJavaHome = process.env.JAVA_HOME;
    if (environmentJavaHome) {
        const environmentJavaVersion = getJavaVersion(path.join(environmentJavaHome, 'bin')) ?? '';
        if (isCompatibleJavaVersionForMI(environmentJavaVersion, miVersion)) {
            return environmentJavaHome;
        }
    }
}

function getJavaHomeForMIVersionFromCache(miVersion: string): string | null {

    const javaCachedPath = path.join(CACHED_FOLDER, 'java');
    if (fs.existsSync(javaCachedPath)) {
        const javaFolders = fs.readdirSync(javaCachedPath, { withFileTypes: true });
        for (const folder of javaFolders) {
            if (folder.isDirectory()) {
                const javaHomePath = process.platform === 'darwin'
                    ? path.join(javaCachedPath, folder.name, 'Contents', 'Home')
                    : path.join(javaCachedPath, folder.name);
                const javaVersion = getJavaVersion(path.join(javaHomePath, 'bin'));
                if (javaVersion && isRecommendedJavaVersionForMI(javaVersion, miVersion)) {
                    return javaHomePath;
                }
            }
        }
    }
    return null;
}

function getMIFromGlobal(miVersion: string): string | undefined {
    const defaultServerPath: string | undefined = extension.context.globalState.get(SELECTED_SERVER_PATH);
    if (defaultServerPath && isMIInstalledAtPath(defaultServerPath)) {
        const defaultServerMIVersion = getMIVersion(defaultServerPath);
        if (defaultServerMIVersion && compareVersions(defaultServerMIVersion, miVersion) == 0) {
            return defaultServerPath;
        }
    }
}

/**
 * Compares two version strings and returns a number indicating their relative order.
 *
 * The version strings should be in the format "x.y.z" where x, y, and z are numeric parts.
 * If the version strings contain non-numeric parts, they will be ignored.
 *
 * @param v1 - The first version string to compare.
 * @param v2 - The second version string to compare.
 * @returns A number indicating the relative order of the versions:
 *          - 1 if v1 is greater than v2
 *          - -1 if v1 is less than v2
 *          - 0 if v1 is equal to v2
 */
export function compareVersions(v1: string, v2: string): number {
    // Extract only the numeric parts of the version string
    const getVersionNumbers = (str: string): string => {
        const match = str.match(/(\d+(\.\d+)*)/);
        return match ? match[0] : '0';
    };

    const version1 = getVersionNumbers(v1);
    const version2 = getVersionNumbers(v2);

    const parts1 = version1.split('.').map(part => parseInt(part, 10));
    const parts2 = version2.split('.').map(part => parseInt(part, 10));

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;

        if (part1 > part2) { return 1; }
        if (part1 < part2) { return -1; }
    }
    return 0;
}

function setupConfigFiles(projectUri: string): void {
    const envFilePath = path.join(projectUri, '.env');
    const targetFolder = path.join(projectUri, 'src', 'main', 'wso2mi', 'resources', 'conf');
    const configFilePath = path.join(targetFolder, 'config.properties');
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
    }
    if (!fs.existsSync(configFilePath)) {
        fs.writeFileSync(configFilePath, '', 'utf8');
    }
    if (!fs.existsSync(envFilePath)) {
        fs.writeFileSync(envFilePath, '', 'utf8');
    }
}

export function getJavaHomeFromConfig(projectUri: string): string | undefined {
    const config = vscode.workspace.getConfiguration('MI');
    const currentJavaHome = config.get<string>(SELECTED_JAVA_HOME);

    const projectName = path.basename(projectUri);

    if (currentJavaHome) {
        if (!isJavaHomePathValid(currentJavaHome)) {
            vscode.window
                .showErrorMessage(
                    'Invalid Java Home path. Please set a valid Java Home path and run the command again.',
                    'Change Java Home'
                )
                .then((selection) => {
                    if (selection) {
                        vscode.commands.executeCommand(COMMANDS.CHANGE_JAVA_HOME);
                    }
                });
        }
    } else {
        vscode.window
            .showErrorMessage(
                `Java Home path is not set for the project: ${projectName}. Please set a valid Java Home path and run the command again.`,
                'Set Java Home'
            )
            .then((selection) => {
                if (selection) {
                    vscode.commands.executeCommand(COMMANDS.CHANGE_JAVA_HOME);
                }
            });
    }
    return currentJavaHome;

    function isJavaHomePathValid(javaHome: string): boolean {
        const javaExecutable = path.join(javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
        return fs.existsSync(javaExecutable);
    }
}

export function getServerPathFromConfig(projectUri: string): string | undefined {
    const config = vscode.workspace.getConfiguration('MI');
    const currentServerPath = config.get<string>(SELECTED_SERVER_PATH);
    return currentServerPath;
}

export function getDefaultProjectPath(): string {
    return path.join(os.homedir(), 'wso2mi', 'Projects');
}

export async function buildBallerinaModule(projectPath: string) {
    const isBallerinaInstalled = await isBallerinaAvailableGlobally();
    if (isBallerinaInstalled || fs.existsSync(path.join(os.homedir(), '.ballerina', 'ballerina-home', 'bin', process.platform === 'win32' ? 'bal.bat' : 'bal'))) {
        await runBallerinaBuildsWithProgress(projectPath, isBallerinaInstalled);
    } else {
        vscode.window.showErrorMessage('Ballerina not found. Please download Ballerina and try again.');
        showExtensionPrompt();
    }
}

async function runBallerinaBuildsWithProgress(projectPath: string, isBallerinaInstalled: boolean = false) {
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: "Running Ballerina Build",
            cancellable: false,
        },
        async (progress, token) => await new Promise<void>((resolve, reject) => {
            progress.report({ increment: 10, message: "Pull dependencies..." });
            const balHome = path.join(os.homedir(), '.ballerina', 'ballerina-home', 'bin').toString();

            runCommand(isBallerinaInstalled ? 'bal tool pull mi-module-gen' : `${balHome}${path.sep}bal tool pull mi-module-gen`, `"${projectPath}"`, onData, onError, buildModule);

            let isModuleAlreadyInstalled = false, commandFailed = false;
            function onData(data: string) {
                if (data.includes("is already available locally")) {
                    isModuleAlreadyInstalled = true;
                }
            }

            function onError(data: string) {
                if (data) {
                    if (data.includes("spawn bal ENOENT") ||
                        data.includes("The system cannot find the path specified") ||
                        data.includes("'ba' is not recognized as an internal or external command, operable program or batch file.")) {
                        vscode.window.showErrorMessage("Ballerina not found. Please install and setup the Ballerina Extension and try again.");
                        showExtensionPrompt();
                    } else {
                        vscode.window.showErrorMessage(`Error: ${data}`);
                    }
                    commandFailed = true;
                }
            }

            function buildModule() {
                if (!isModuleAlreadyInstalled && commandFailed) {
                    reject();
                    return;
                }
                commandFailed = false;
                progress.report({ increment: 40, message: "Generating module..." });

                if (!ballerinaOutputChannel) {
                    ballerinaOutputChannel = vscode.window.createOutputChannel('Ballerina Module Builder');
                }
                ballerinaOutputChannel.clear();
                runBasicCommand(isBallerinaInstalled ? 'bal mi-module-gen -i .' : `${balHome}${path.sep}bal mi-module-gen -i .`, `${projectPath}`,
                    onData, onError, onComplete, ballerinaOutputChannel
                );

                async function onComplete() {
                    try {
                        if (commandFailed) {
                            reject();
                            return;
                        }
                        progress.report({ increment: 40, message: "Copying Ballerina module..." });
                        const targetFolderPath = path.join(projectPath, 'target');
                        if (fs.existsSync(targetFolderPath)) {
                            fs.rmSync(targetFolderPath, { recursive: true, force: true });
                        } else {
                            reject();
                            return vscode.window.showErrorMessage("Ballerina module build process failed.");
                        }

                        const tomlContent = fs.readFileSync(path.join(projectPath, "Ballerina.toml"), 'utf8');
                        const nameMatch = tomlContent.match(/name\s*=\s*"([^"]+)"/);
                        const versionMatch = tomlContent.match(/version\s*=\s*"([^"]+)"/);
                        const name = nameMatch ? nameMatch[1] : null;
                        const version = versionMatch ? versionMatch[1] : null;

                        const zipName = name + "-connector-" + version + ".zip";
                        const zipPath = path.join(projectPath, zipName);

                        const projectUri = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(projectPath))?.uri?.fsPath;
                        if (!projectUri) {
                            reject();
                            return vscode.window.showErrorMessage("Could not find the workspace folder");
                        }
                        const copyTo = path.join(projectUri, 'src', 'main', 'wso2mi', 'resources', 'connectors', zipName);
                        if (fs.existsSync(copyTo)) {
                            await fs.promises.rm(copyTo, { force: true });

                            // TODO: Remove this after fixing the issue from LS side
                            // https://github.com/wso2/mi-vscode/issues/952
                            await new Promise((resolve) => setTimeout(resolve, 1000));
                        }
                        await fs.promises.copyFile(zipPath, copyTo);
                        await fs.promises.rm(zipPath);

                        progress.report({ increment: 10, message: "Completed Ballerina module build." });
                        vscode.window.showInformationMessage("Ballerina module build successful");
                        resolve();
                    } catch (error) {
                        if (error instanceof Error) {
                            onError(error.message);
                        } else {
                            onError(String(error));
                        }
                        reject();
                    }
                }
            }
        })
    );
}

async function showExtensionPrompt() {
    vscode.window.showInformationMessage(
        'Ballerina distribution is required to build the Ballerina module. Install and setup the Ballerina Extension from the Visual Studio Code Marketplace.',
        'Install Now'
    ).then(async (selection) => {
        if (selection === 'Install Now') {
            await vscode.commands.executeCommand(COMMANDS.INSTALL_EXTENSION_COMMAND, COMMANDS.BI_EXTENSION);
            await vscode.commands.executeCommand(COMMANDS.BI_OPEN_COMMAND);
        }
    });
}

async function isBallerinaAvailableGlobally(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const proc = child_process.spawn("bal version", [], { shell: true });
        proc.on("error", () => resolve(false));
        proc.on("exit", (code) => resolve(code === 0));
    });
}

async function fetchLatestMIVersion(miVersion: string): Promise<string> {
    try {
        const response = await axios.get(miUpdateVersionCheckUrl);
        const versions = response.data;
        return versions[miVersion] || '';
    } catch (error) {
        console.error('Error fetching MI update version:', error);
        return '';
    }
}

function getCurrentUpdateVersion(miPath: string): string {
    const updateConfigPath = path.join(miPath, 'updates', 'config.json');
    if (fs.existsSync(updateConfigPath)) {
        const configContent = fs.readFileSync(updateConfigPath, 'utf8');
        const updateConfig = JSON.parse(configContent);
        return updateConfig["update-level"] || '0';
    }
    return '0';
}

export async function isServerUpdateRequested(): Promise<boolean> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const config = vscode.workspace.getConfiguration('MI', workspaceFolder.uri);
        const isUpdatedDisabled = config.get<boolean>('suppressServerUpdateNotification');
        if (isUpdatedDisabled) {
            return false;
        }
        const currentServerPath = config.get<string>(SELECTED_SERVER_PATH);
        if (currentServerPath) {
            const currentMIVersion = getMIVersion(currentServerPath);
            if (currentMIVersion) {
                const latestUpdateVersion = await fetchLatestMIVersion(currentMIVersion);
                const currentUpdateVersion = getCurrentUpdateVersion(currentServerPath);
                if (latestUpdateVersion && compareVersions(latestUpdateVersion, currentUpdateVersion) > 0) {
                    const cachedMIPath = getLatestMIPathFromCache(currentMIVersion);
                    if (cachedMIPath && cachedMIPath.version === latestUpdateVersion) {
                        const changeOption = 'Switch to Updated Version';
                        const cancelOption = 'Keep Current Version';
                        vscode.window.showWarningMessage(
                            'A newer version of the Micro Integrator is available locally. Would you like to switch to it?',
                            changeOption,
                            cancelOption
                        ).then((selection) => {
                            if (selection === changeOption) {
                                setPathsInWorkSpace({ projectUri: workspaceFolder.uri.fsPath, type: 'MI', path: cachedMIPath.path });
                            }
                        });
                    } else {
                        const selection = await vscode.window.showInformationMessage(
                            'A new version of the Micro Integrator is available. Would you like to update now?',
                            { modal: true },
                            "Yes",
                            "No, Don't Ask Again"
                        );
                        if (selection === "Yes") {
                            return true;
                        } else if (selection === "No, Don't Ask Again") {
                            const config = vscode.workspace.getConfiguration('MI', workspaceFolder.uri);
                            config.update('suppressServerUpdateNotification', true, vscode.ConfigurationTarget.Workspace);
                        }
                    }
                }
            }
        }
    }
    return false;
}

function getLatestMIPathFromCache(miVersion: string): { path: string, version: string } | null {
    const miCachePath = path.join(CACHED_FOLDER, 'micro-integrator');
    if (fs.existsSync(miCachePath)) {
        const miFolders = fs.readdirSync(miCachePath, { withFileTypes: true });
        let highestUpdateVersion = '0';
        let latestMIPath = '';
        for (const folder of miFolders) {
            if (folder.isDirectory()) {
                const miHomePath = path.join(miCachePath, folder.name);
                const miRuntimeVersion = getMIVersion(miHomePath);
                if (miRuntimeVersion && compareVersions(miVersion, miRuntimeVersion) === 0) {
                    const updateVersion = getCurrentUpdateVersion(miHomePath);
                    if (compareVersions(updateVersion, highestUpdateVersion) >= 0) {
                        highestUpdateVersion = updateVersion;
                        latestMIPath = miHomePath;
                    }
                }
            }
        }
        return latestMIPath ? { path: latestMIPath, version: highestUpdateVersion } : null;
    }
    return null;
}

function extractRootFolderFromZip(zipFilePath: string): string | null {
    try {
        const zipArchive = new AdmZip(zipFilePath);
        const zipEntries = zipArchive.getEntries();

        if (zipEntries.length === 0) {
            return null;
        }

        let rootFolderName: string | null = null;

        for (const entry of zipEntries) {
            const entryPath = entry.entryName;

            if (entryPath.includes('/')) {
                const pathParts = entryPath.split('/');
                const firstPathPart = pathParts[0];

                if (rootFolderName === null && firstPathPart) {
                    rootFolderName = firstPathPart;
                    break;
                }
            }
        }

        return rootFolderName;
    } catch (error) {
        console.error("Error reading zip file:", error);
        return null;
    }
}

async function updateMI(projectUri: string, miVersion: string, latestUpdateVersion: string): Promise<void> {
    try {
        const updateTempFolder = path.join(CACHED_FOLDER, '.mi-temp');
        if (!fs.existsSync(updateTempFolder)) {
            fs.mkdirSync(updateTempFolder, { recursive: true });
        }

        const miZipFileName = miDownloadUrls[miVersion].split('/').pop();
        const miZipPath = path.join(updateTempFolder, miZipFileName!);
        await downloadWithProgress(projectUri, miDownloadUrls[miVersion], miZipPath, 'Downloading Micro Integrator Update');

        const miCachePath = path.join(CACHED_FOLDER, 'micro-integrator');
        const existingMIPath = getLatestMIPathFromCache(miVersion)?.path;
        const rootFolderName = extractRootFolderFromZip(miZipPath);
        if (existingMIPath) {
            const replaceOption = 'Replace existing runtime';
            const createNewOption = 'Install as a separate runtime';
            const selection = await vscode.window.showWarningMessage(
                'An existing Micro Integrator runtime was found. Would you like to replace it or install as a separate runtime? Note: Replacing will remove all existing configurations and CApps in the server.',
                replaceOption,
                createNewOption
            );

            if (selection === replaceOption) {
                fs.rmSync(existingMIPath, { recursive: true, force: true });
                await extractWithProgress(miZipPath, miCachePath, 'Extracting Micro Integrator Update');
                setPathsInWorkSpace({ projectUri, type: 'MI', path: path.join(miCachePath, rootFolderName!) });
            } else if (selection === createNewOption) {
                const newFolderName = `wso2mi-${miVersion}-update-${latestUpdateVersion}`;
                await extractWithProgress(miZipPath, updateTempFolder, 'Extracting Micro Integrator Update');
                fs.renameSync(path.join(updateTempFolder, rootFolderName!), path.join(miCachePath, newFolderName));
                setPathsInWorkSpace({ projectUri, type: 'MI', path: path.join(miCachePath, newFolderName) });
            }
        } else {
            await extractWithProgress(miZipPath, miCachePath, 'Extracting Micro Integrator Update');
            setPathsInWorkSpace({ projectUri, type: 'MI', path: path.join(miCachePath, rootFolderName!) });
        }
        fs.rmSync(updateTempFolder, { recursive: true, force: true });

        vscode.window.showInformationMessage('Micro Integrator has been updated successfully.');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to update Micro Integrator: ${error instanceof Error ? error.message : error}`);
    }
}
