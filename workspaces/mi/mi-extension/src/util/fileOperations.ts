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

import { Progress, window, ProgressLocation, commands, workspace, Uri, TextEditorRevealType, Selection, Range as VSCodeRange, ViewColumn, TextEditor, WorkspaceEdit, Position, TextEdit } from "vscode";
import * as fs from 'fs';
import * as os from 'os';
import axios from "axios";
import * as path from 'path';
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import * as unzipper from 'unzipper';
import { DownloadProgressData, ListRegistryArtifactsResponse, onDownloadProgress, Range, RegistryArtifact, UpdateRegistryMetadataRequest, ApplyEditResponse, RangeFormatRequest} from "@wso2/mi-core";
import { rm } from 'node:fs/promises';
import { existsSync } from "fs";
import { spawn } from "child_process";
import { RPCLayer } from "../RPCLayer";
import { VisualizerWebview } from "../visualizer/webview";
import { MiVisualizerRpcManager } from "../rpc-managers/mi-visualizer/rpc-manager";

interface ProgressMessage {
    message: string;
    increment?: number;
}

export function getFileName(filePath: string): string {
    const fileNameWithExt = filePath.split('/').pop();
    return fileNameWithExt?.split('.')[0] || '';
}

async function selectFileDownloadPath(): Promise<string> {
    const folderPath = await window.showOpenDialog({ title: 'Sample download directory', canSelectFolders: true, canSelectFiles: false, openLabel: 'Select Folder' });
    if (folderPath && folderPath.length > 0) {
        const newlySelectedFolder = folderPath[0].fsPath;
        return newlySelectedFolder;
    }
    return "";
}

async function downloadFile(projectUri: string, url: string, filePath: string, progressCallback?: (downloadProgress: DownloadProgressData) => void) {
    const writer = fs.createWriteStream(filePath);
    let totalBytes = 0;
    try {
        const response = await axios.get(url, {
            responseType: 'stream',
            headers: {
                "User-Agent": "Mozilla/5.0"
            },
            onDownloadProgress: (progressEvent) => {
                totalBytes = progressEvent.total!;
                const formatSize = (sizeInBytes: number) => {
                    const sizeInKB = sizeInBytes / 1024;
                    if (sizeInKB < 1024) {
                        return `${Math.floor(sizeInKB)} KB`;
                    } else {
                        return `${Math.floor(sizeInKB / 1024)} MB`;
                    }
                };
                const progress: DownloadProgressData = {
                    percentage: Math.round((progressEvent.loaded * 100) / totalBytes),
                    downloadedAmount: formatSize(progressEvent.loaded),
                    downloadSize: formatSize(totalBytes)
                };
                if (progressCallback) {
                    progressCallback(progress);
                }
                // Notify the visualizer
                RPCLayer._messengers.get(projectUri)?.sendNotification(
                    onDownloadProgress,
                    { type: 'webview', webviewType: VisualizerWebview.viewType },
                    progress
                );
            }
        });
        response.data.pipe(writer);
        await new Promise<void>((resolve, reject) => {
            writer.on('finish', () => {
                writer.close();
                resolve();
            });

            writer.on('error', (error) => {
                reject(error);
            });
        });
    } catch (error) {
        window.showErrorMessage(`Error while downloading the file: ${error}`);
        throw error;
    }
}

async function handleDownloadFile(projectUri: string, rawFileLink: string, defaultDownloadsPath: string, progress: Progress<ProgressMessage>, cancelled: boolean) {
    const handleProgress = (progressPercentage) => {
        progress.report({ message: "Downloading file...", increment: progressPercentage });
    };
    try {
        await downloadFile(projectUri, rawFileLink, defaultDownloadsPath, handleProgress);
    } catch (error) {
        window.showErrorMessage(`Failed to download file: ${error}`);
    }
    progress.report({ message: "Download finished" });
}

export function appendContent(path: string, content: string): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            fs.writeFileSync(path, content, { flag: 'a' });
            resolve(true);
        } catch (error) {
            console.error('Error appending content:', error);
            resolve(false);
        }
    });
}

export async function handleOpenFile(projectUri: string, sampleName: string, repoUrl: string) {
    const rawFileLink = repoUrl + sampleName + '/' + sampleName + '.zip';
    const defaultDownloadsPath = path.join(os.homedir(), 'Downloads'); // Construct the default downloads path
    const pathFromDialog = await selectFileDownloadPath();
    if (pathFromDialog === "") {
        return;
    }
    const selectedPath = pathFromDialog === "" ? defaultDownloadsPath : pathFromDialog;
    const filePath = path.join(selectedPath, sampleName + '.zip');
    let isSuccess = false;

    if (fs.existsSync(filePath)) {
        // already downloaded
        isSuccess = true;
    } else {
        await window.withProgress({
            location: ProgressLocation.Notification,
            title: 'Downloading file',
            cancellable: true
        }, async (progress, cancellationToken) => {

            let cancelled: boolean = false;
            cancellationToken.onCancellationRequested(async () => {
                cancelled = true;
            });

            try {
                await handleDownloadFile(projectUri, rawFileLink, filePath, progress, cancelled);
                isSuccess = true;
                return;
            } catch (error) {
                window.showErrorMessage(`Error while downloading the file: ${error}`);
            }
        });
    }

    if (isSuccess) {
        const successMsg = `The Integration sample file has been downloaded successfully to the following directory: ${filePath}.`;
        const zipReadStream = fs.createReadStream(filePath);
        if (fs.existsSync(path.join(selectedPath, sampleName))) {
            // already extracted
            let uri = Uri.file(path.join(selectedPath, sampleName));
            commands.executeCommand("vscode.openFolder", uri, true);
            return;
        }
        zipReadStream.pipe(unzipper.Parse()).on("entry", function (entry) {
            var isDir = entry.type === "Directory";
            var fullpath = path.join(selectedPath, entry.path);
            var directory = isDir ? fullpath : path.dirname(fullpath);
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
            }
            if (!isDir) {
                entry.pipe(fs.createWriteStream(fullpath));
            }
        }).on("close", () => {
            console.log("Extraction complete!");
            let uri = Uri.file(path.join(selectedPath, sampleName));
            window.showInformationMessage('Where would you like to open the project?',
                { modal: true },
                'This Window',
                'New Window'
            ).then((selection) => {
                if (selection === undefined) {
                    return;
                }
                commands.executeCommand("vscode.openFolder", uri, selection === 'New Window');
            });
        });
        window.showInformationMessage(
            successMsg,
        );
    }
}

/**
    * Add new entry to artifact.xml in registry resources folder.
    * @param artifactName  The name of the artifact.
    * @param file          The file name of the artifact.
    * @param artifactPath  The path of the artifact.
    * @param mediaType     The media type of the artifact.
    */
export async function addNewEntryToArtifactXML(projectDir: string, artifactName: string, file: string,
    artifactPath: string, mediaType: string, isCollection: boolean, isRegistry: boolean): Promise<boolean> {
    return new Promise(async (resolve) => {
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "@",
            parseTagValue: true,
            format: true,
        };
        const parser = new XMLParser(options);
        const artifactXMLPath = isRegistry ? path.join(projectDir, 'src', 'main', 'wso2mi', 'resources', 'registry', 'artifact.xml') : path.join(projectDir, 'src', 'main', 'wso2mi', 'resources', 'artifact.xml');
        if (!fs.existsSync(artifactXMLPath)) {
            fs.writeFileSync(artifactXMLPath, `<?xml version="1.0" encoding="UTF-8"?><artifacts></artifacts>`);
        }
        const mvnInfo = await getMavenInfoFromRootPom(projectDir);
        const artifactXML = fs.readFileSync(artifactXMLPath, "utf8");
        const artifactXMLData = parser.parse(artifactXML);
        if (artifactXMLData.artifacts === '') {
            artifactXMLData.artifacts = {};
            artifactXMLData.artifacts.artifact = [];
        } else if (!Array.isArray(artifactXMLData.artifacts.artifact)) {
            const temp = artifactXMLData.artifacts.artifact;
            artifactXMLData.artifacts.artifact = [];
            artifactXMLData.artifacts.artifact.push(temp);
        }
        if (isCollection) {
            artifactXMLData.artifacts.artifact.push({
                '@name': artifactName,
                '@groupId': mvnInfo.groupId,
                '@version': mvnInfo.version,
                '@type': 'registry/resource',
                '@serverRole': 'EnterpriseIntegrator',
                collection: {
                    directory: file,
                    path: artifactPath,
                    properties: null,
                }
            });
        } else {
            artifactXMLData.artifacts.artifact.push({
                '@name': artifactName,
                '@groupId': mvnInfo.groupId,
                '@version': mvnInfo.version,
                '@type': 'registry/resource',
                '@serverRole': 'EnterpriseIntegrator',
                item: {
                    file: file,
                    path: artifactPath,
                    mediaType: mediaType,
                    properties: null,
                }
            });
        }
        const builder = new XMLBuilder(options);
        const updatedXmlString = builder.build(artifactXMLData);
        fs.writeFileSync(artifactXMLPath, updatedXmlString);
        resolve(true);
    });
}

/**
 * Remove the entry from the artifact.xml file if exists.
 * @param projectDir    The project directory.
 * @param artifactPath  The path of the artifact.
 * @param isCollection  The type of the artifact.
 * @returns             The status of the removal.
 */
export async function removeEntryFromArtifactXML(projectDir: string, artifactPath: string, fileName: string): Promise<boolean> {
    return new Promise(async (resolve) => {
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "@",
            parseTagValue: true,
            format: true,
        };
        const parser = new XMLParser(options);
        let artifactXMLPath;
        if (path.normalize(artifactPath).includes(path.normalize("_system/governance/mi-resources"))) {
            artifactXMLPath = path.join(projectDir, 'src', 'main', 'wso2mi', 'resources', 'artifact.xml');
        } else {
            artifactXMLPath = path.join(projectDir, 'src', 'main', 'wso2mi', 'resources', 'registry', 'artifact.xml');
        }
        if (!fs.existsSync(artifactXMLPath)) {
            resolve(false);
        }
        const artifactXML = fs.readFileSync(artifactXMLPath, "utf8");
        const artifactXMLData = parser.parse(artifactXML);
        var removed = false;
        if (Array.isArray(artifactXMLData.artifacts.artifact)) {
            const startCount = artifactXMLData.artifacts.artifact.length;
            var artifacts = artifactXMLData.artifacts.artifact;
            if (fileName) {
                artifacts = artifacts.filter((artifact) => {
                    return artifact.collection || !(artifact.item && artifact.item.file === fileName && artifact.item.path === artifactPath);
                });
            } else {
                artifacts = artifactXMLData.artifacts.artifact.filter((artifact) => {
                    return (artifact.item && !(artifact.item.path === artifactPath || (artifact.item.path.startsWith(artifactPath)
                        && artifact.item.path.replace(artifactPath, '').startsWith('/'))))
                        || (artifact.collection && !(artifact.collection.path === artifactPath || (artifact.collection.path.startsWith(artifactPath)
                            && artifact.collection.path.replace(artifactPath, '').startsWith('/'))));
                });
            }
            const endCount = artifacts.length;
            artifactXMLData.artifacts.artifact = artifacts;
            if (endCount < startCount) {
                removed = true;
            }
        } else {
            if (fileName) {
                // if file name present do the exact match
                if (artifactXMLData.artifacts.artifact.item && artifactXMLData.artifacts.artifact.item.file === fileName &&
                    [artifactPath, `${artifactPath}/`].includes(artifactXMLData.artifacts.artifact.item.path)) {
                    removed = true;
                    artifactXMLData.artifacts.artifact = [];
                }
            } else {
                if (artifactXMLData.artifacts.artifact.collection && (artifactXMLData.artifacts.artifact.collection.path === artifactPath
                    || (artifactXMLData.artifacts.artifact.collection.path.startsWith(artifactPath)
                        && artifactXMLData.artifacts.artifact.collection.path.replace(artifactPath, '').startsWith('/')))) {
                    artifactXMLData.artifacts.artifact = [];
                    removed = true;
                }
                if (artifactXMLData.artifacts.artifact.item && (artifactXMLData.artifacts.artifact.item.path === artifactPath
                    || (artifactXMLData.artifacts.artifact.item.path.startsWith(artifactPath)
                        && artifactXMLData.artifacts.artifact.item.path.replace(artifactPath, '').startsWith('/')))) {
                    artifactXMLData.artifacts.artifact = [];
                    removed = true;
                }
            }
        }
        if (removed) {
            const builder = new XMLBuilder(options);
            const updatedXmlString = builder.build(artifactXMLData);
            fs.writeFileSync(artifactXMLPath, updatedXmlString);
        }
        resolve(removed);
    });
}

/**
 * Get the maven information from the root pom.xml file.
 * @returns The maven information.
 */
export async function getMavenInfoFromRootPom(projectDir: string): Promise<{ groupId: string, artifactId: string, version: string }> {
    return new Promise(async (resolve) => {
        const pomXMLPath = path.join(projectDir, 'pom.xml');
        if (fs.existsSync(pomXMLPath)) {
            const pomXML = fs.readFileSync(pomXMLPath, "utf8");
            const options = {
                ignoreAttributes: true
            };
            const parser = new XMLParser(options);
            const pomXMLData = parser.parse(pomXML);
            const artifactId = pomXMLData["project"]["artifactId"];
            const groupId = pomXMLData["project"]["groupId"];
            const version = pomXMLData["project"]["version"];
            const response = {
                groupId: groupId,
                artifactId: artifactId,
                version: version
            };
            resolve(response);
        }

    });
}

/**
 * Get media type and file extension of the registry resource for the given template type.
 * @param templateType  The template type of the registry resource.
 * @returns             The media type and file extension of the registry resource.
 */
export function getMediatypeAndFileExtension(templateType: string): { mediaType: string, fileExtension: string } {
    let mediaType = 'application/vnd.wso2.esb.endpoint';
    let fileExtension = 'xml';
    switch (templateType) {
        case "Address endpoint":
        case "Default Endpoint":
        case "Failover Endpoint":
        case "HTTP Endpoint":
        case "Load Balance Endpoint":
        case "Recipient List Endpoint":
        case "Template Endpoint":
        case "WSDL Endpoint":
            break;
        case "Default Endpoint Template":
        case "HTTP Endpoint Template":
        case "WSDL Endpoint Template":
        case "Address endpoint template":
            mediaType = 'application/vnd.wso2.template.endpoint';
            break;
        case "XSLT File":
            mediaType = 'application/xslt+xml';
            fileExtension = 'xslt';
            break;
        case "XSD File":
            mediaType = 'application/x-xsd+xml';
            fileExtension = 'xsd';
            break;
        case "XSL File":
            mediaType = 'application/xsl+xml';
            fileExtension = 'xsl';
            break;
        case "WSDL File":
            mediaType = 'application/wsdl+xml';
            fileExtension = 'wsdl';
            break;
        case "Data Mapper":
            mediaType = 'text/plain';
            fileExtension = 'dmc';
            break;
        case "Data Mapper Schema":
            mediaType = 'text/plain';
            fileExtension = 'json';
            break;
        case "Javascript File":
            mediaType = 'application/javascript';
            fileExtension = 'js';
            break;
        case "SQL Script File":
            mediaType = '';
            fileExtension = 'sql';
            break;
        case "RB File":
            mediaType = '';
            fileExtension = 'rb';
            break;
        case "GROOVY File":
            mediaType = '';
            fileExtension = 'groovy';
            break;
        case "JSON File":
            mediaType = 'application/json';
            fileExtension = 'json';
            break;
        case "YAML File":
            mediaType = 'application/yaml';
            fileExtension = 'yaml';
            break;
        case "TEXT File":
            mediaType = 'text/plain';
            fileExtension = 'txt';
            break;
        case "XML File":
            mediaType = 'application/xml';
            fileExtension = 'xml';
            break;
        case "Local Entry":
            mediaType = 'application/vnd.wso2.esb.localentry';
            break;
        case "Sequence":
            mediaType = 'application/vnd.wso2.sequence';
            break;
        case "Sequence Template":
            mediaType = 'application/vnd.wso2.template';
            break;
        case "WS-Policy":
            mediaType = 'application/wspolicy+xml';
            break;
        default:
            break;
    }
    return { mediaType, fileExtension };
}

/**
 * Method to detect the media type of the imported registry resource.
 * @param filePath  The file path of the registry resource.
 * @returns         The media type of the registry resource.
 */
export async function detectMediaType(filePath: string): Promise<string> {
    return new Promise((resolve) => {
        var mediaType = '';
        if (fs.existsSync(filePath)) {
            if (filePath.endsWith('.xml')) {
                const pomXML = fs.readFileSync(filePath, "utf8");
                const options = {
                    ignoreAttributes: false,
                    attributeNamePrefix: "@",
                };
                const parser = new XMLParser(options);
                const resourceXMLData = parser.parse(pomXML);
                const template = resourceXMLData["template"];
                if (resourceXMLData["endpoint"]) {
                    mediaType = 'application/vnd.wso2.esb.endpoint';
                } else if (template) {
                    if (template["endpoint"]) {
                        mediaType = 'application/vnd.wso2.template.endpoint';
                    } else if (template["sequence"]) {
                        mediaType = 'application/vnd.wso2.template';
                    }
                } else if (resourceXMLData["localEntry"]) {
                    mediaType = 'application/vnd.wso2.esb.localentry';
                } else if (resourceXMLData["sequence"]) {
                    mediaType = 'application/vnd.wso2.sequence';
                } else if (resourceXMLData["wsp:Policy"]) {
                    mediaType = 'application/wspolicy+xml';
                } else {
                    mediaType = 'application/xml';
                }
            } else if (filePath.endsWith('.xslt') || filePath.endsWith('.xsl')) {
                mediaType = 'application/xslt+xml';
            } else if (filePath.endsWith('.xsd')) {
                mediaType = 'application/x-xsd+xml';
            } else if (filePath.endsWith('.yaml')) {
                mediaType = 'application/yaml';
            } else if (filePath.endsWith('.json')) {
                mediaType = 'application/json';
            } else if (filePath.endsWith('.js')) {
                mediaType = 'application/javascript';
            } else if (filePath.endsWith('.sql')) {
                mediaType = '';
            } else if (filePath.endsWith('.wsdl')) {
                mediaType = 'application/wsdl+xml';
            } else if (filePath.endsWith('.dmc')) {
                mediaType = 'application/datamapper';
            }
        }
        resolve(mediaType);
    });
}

/**
 *  Delete the registry resource folder and the recursively delete the artifacts from the artifact.xml file.
 * @param filePath  The file path of the registry resource folder.
 * @returns         The status of the deletion.
 */
export async function deleteRegistryResource(filePath: string): Promise<{ status: boolean, info: string }> {
    return new Promise(async (resolve) => {
        const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(filePath))?.uri.fsPath;
        if (workspaceFolder) {
            var tempPath = filePath.replace(workspaceFolder, '');
            const platform = os.platform();
            if (platform === 'win32') {
                tempPath = tempPath.replace(/\\/g, '/');
            }
            tempPath = path.normalize(tempPath);
            if (tempPath.includes('/src/main/wso2mi/resources/registry/')) {
                tempPath = tempPath.replace('/src/main/wso2mi/resources/registry/', '');
                var regPath = "";
                if (tempPath.startsWith('gov')) {
                    regPath = '/_system/governance/';
                    regPath = regPath + tempPath.replace('gov/', '');
                } else {
                    regPath = '/_system/config/';
                    regPath = regPath + tempPath.replace('conf/', '');
                }
            } else {
                tempPath = tempPath.replace('/src/main/wso2mi/resources/', '');
                var regPath = "/_system/governance/mi-resources/" + tempPath;
            }
            if (fs.lstatSync(filePath).isDirectory()) {
                removeEntryFromArtifactXML(workspaceFolder, regPath, "");
                await rm(filePath, { recursive: true, force: true });
            } else {
                const fileName = path.basename(filePath);
                regPath = regPath.replace('/' + fileName, '');
                removeEntryFromArtifactXML(workspaceFolder, regPath, fileName);
                fs.unlinkSync(filePath);
            }
            resolve({ status: true, info: "Resource removed" });
        } else {
            resolve({ status: false, info: "Workspace not found" });
        }
    });
}

export function deleteDataMapperResources(filePath: string): Promise<{ status: boolean, info: string }> {
    return new Promise(async (resolve) => {
        const projectDir = workspace.getWorkspaceFolder(Uri.file(filePath))?.uri.fsPath;
        const fileName = path.basename(filePath);
        if (projectDir && fileName.endsWith('.ts')) {
            const dmName = fileName.replace('.ts', '');
            let artifactXmlSavePath = '';
            let projectDirPath = '';
            if (path.normalize(filePath).includes(path.normalize(path.join('resources', 'datamapper')))) {
                artifactXmlSavePath = '/_system/governance/mi-resources/datamapper/' + dmName
                projectDirPath = path.join(projectDir, 'src', 'main', 'wso2mi', 'resources', 'datamapper', dmName);
            } else {
                artifactXmlSavePath = '/_system/governance/datamapper/' + dmName;
                projectDirPath = path.join(projectDir, 'src', 'main', 'wso2mi', 'resources', 'registry', 'gov', 'datamapper', dmName);
            }
            removeEntryFromArtifactXML(projectDir, artifactXmlSavePath, dmName + '_inputSchema.json');
            removeEntryFromArtifactXML(projectDir, artifactXmlSavePath, dmName + '_outputSchema.json');
            removeEntryFromArtifactXML(projectDir, artifactXmlSavePath, dmName + '.dmc');
            workspace.fs.delete(Uri.parse(projectDirPath), { recursive: true, useTrash: true });
            resolve({ status: true, info: "Datamapper resources removed" });
        }
    });
}

/**
 * Create meta data files for the registry collection.
 * @param collectionRoot root folder of the collection.
 * @param regPath        registry path of the collection.
 */
export async function createMetadataFilesForRegistryCollection(collectionRoot: string, regPath: string) {
    return new Promise(async (resolve) => {
        const metaFolder = path.join(collectionRoot, '.meta');
        const folderName = path.basename(collectionRoot);
        var folderRegPath = regPath.slice(0, regPath.length - folderName.length - 1);
        fs.mkdirSync(metaFolder);
        const initialMetaFile = path.join(metaFolder, '~.xml');
        var content = '<?xml version="1.0" encoding="UTF-8"?><resource name="' + folderName + '" isCollection="true" path="'
            + folderRegPath + '" registryUrl="https://localhost:9443/registry" status="added"/>';
        fs.writeFileSync(initialMetaFile, content);
        const files = fs.readdirSync(collectionRoot);
        files.forEach(async (file) => {
            const curPath = path.join(collectionRoot, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                if (file !== '.meta') {
                    const newRegPath = regPath + '/' + file;
                    await createMetadataFilesForRegistryCollection(curPath, newRegPath);
                }
            } else {
                if (file !== '.DS_Store') {
                    const mediaType = await detectMediaType(curPath);
                    const newRegPath = regPath + '/' + file;
                    const newMetaFile = path.join(metaFolder, '~' + file + '.xml');
                    var content = '<?xml version="1.0" encoding="UTF-8"?><resource name="' + file + '" isCollection="false" path="'
                        + newRegPath + '" registryUrl="https://localhost:9443/registry" status="added"><mediaType>'
                        + mediaType + '</mediaType></resource>';
                    fs.writeFileSync(newMetaFile, content);
                }
            }
        });
        resolve(true);
    });
}

/**
 * Get a list of currently available registry resources.
 * @param projectDir    The project directory.
 * @returns             The list of available registry resources.
 */
export function getAvailableRegistryResources(projectDir: string): ListRegistryArtifactsResponse {
    const result: RegistryArtifact[] = [];
    var artifactXMLPath = path.join(projectDir, 'src', 'main', 'wso2mi', 'resources', 'registry', 'artifact.xml');
    if (fs.existsSync(artifactXMLPath)) {
        const artifactXML = fs.readFileSync(artifactXMLPath, "utf8");
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "@",
            parseTagValue: true,
            format: true,
        };
        const parser = new XMLParser(options);
        const artifactXMLData = parser.parse(artifactXML);
        if (!artifactXMLData.artifacts) {
            return { artifacts: [] };
        }
        if (!Array.isArray(artifactXMLData.artifacts.artifact)) {
            artifactXMLData.artifacts.artifact = [artifactXMLData.artifacts.artifact];
        }
        for (const artifact of artifactXMLData.artifacts.artifact) {
            if (artifact.collection) {
                const registryArtifact: RegistryArtifact = {
                    name: artifact["@name"],
                    path: artifact.collection.path,
                    file: artifact.collection.directory,
                    isCollection: true
                };
                result.push(registryArtifact);
            } else if (artifact.item) {
                const registryArtifact: RegistryArtifact = {
                    name: artifact["@name"],
                    path: artifact.item.path,
                    file: artifact.item.file,
                    mediaType: artifact.item.mediaType,
                    isCollection: false
                };
                result.push(registryArtifact);
            }
        }
        return { artifacts: result };
    } else {
        return { artifacts: [] };
    }
}

export function getRegistryResourceMetadata(projectDir: string): RegistryArtifact {
    const regPathPrefix = path.join("wso2mi", "resources", "registry");
    const lastIndex = projectDir.indexOf(regPathPrefix) !== -1 ? projectDir.indexOf(regPathPrefix) + regPathPrefix.length : 0;
    const registryPath = projectDir.substring(lastIndex);
    const transformedPath = registryPath.replace("/gov", "/_system/governance").replace("/conf", "/_system/config");
    const artifactXMLData = getArtifactData(projectDir)[1];
    for (const artifact of artifactXMLData) {
        if (artifact.item && (artifact.item.path.endsWith("/") ? artifact.item.path +
            artifact.item.file : artifact.item.path + "/" + artifact.item.file) === transformedPath) {
            let properties = [];
            if (artifact.item.properties && artifact.item.properties.property) {
                if (!Array.isArray(artifact.item.properties.property)) {
                    artifact.item.properties.property = [artifact.item.properties.property];
                }
                properties = artifact.item.properties.property;
            }
            return {
                name: artifact["@name"],
                path: artifact.item.path,
                file: artifact.item.file,
                isCollection: false,
                properties: properties,
                mediaType: artifact.item.mediaType
            };
        } else if (artifact.collection && artifact.collection.path === transformedPath) {
            let properties = [];
            if (artifact.collection.properties && artifact.collection.properties.property) {
                if (!Array.isArray(artifact.collection.properties.property)) {
                    artifact.collection.properties.property = [artifact.collection.properties.property];
                }
                properties = artifact.collection.properties.property;
            }
            return {
                name: artifact["@name"],
                path: artifact.collection.path,
                file: artifact.collection.directory,
                isCollection: true,
                properties: properties
            };
        }
    }
    return {} as RegistryArtifact;
}

export function updateRegistryResourceMetadata(request: UpdateRegistryMetadataRequest): string {
    const artifactData = getArtifactData(request.projectDirectory);
    const artifactXMLData = artifactData[0];
    const artifacts = artifactData[1];
    let updated = false;
    let updatedArtifact: { artifact: any, properties: { key: string, value: string }[] } = { artifact: null, properties: [] };
    if (artifacts) {
        for (const artifact of artifacts) {
            if (artifact.item && (artifact.item.path.endsWith("/") ? artifact.item.path +
                artifact.item.file : artifact.item.path + "/" + artifact.item.file) === request.registryPath) {
                artifact.item.mediaType = request.mediaType;
                artifact.item.properties = {};
                artifact.item.properties.property = [];
                const propertiesArray = Object.entries(request.properties);
                for (const [key, value] of propertiesArray) {
                    artifact.item.properties.property.push({ "@key": key, "@value": value });
                    updatedArtifact.properties.push({ "key": key, "value": value });
                }
                updated = true;
                updatedArtifact.artifact = artifact;
                break;
            } else if (artifact.collection && artifact.collection.path === request.registryPath) {
                artifact.collection.properties = {};
                artifact.collection.properties.property = [];
                const propertiesArray = Object.entries(request.properties);
                for (const [key, value] of propertiesArray) {
                    artifact.collection.properties.property.push({ "@key": key, "@value": value });
                    updatedArtifact.properties.push({ "key": key, "value": value });
                }
                updated = true;
                updatedArtifact.artifact = artifact;
                break;
            }
        }
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "@",
            parseTagValue: true,
            format: true,
        };
        if (updated) {
            const builder = new XMLBuilder(options);
            const updatedXmlString = builder.build(artifactXMLData);
            fs.writeFileSync(artifactData[2], updatedXmlString);
            updatePropertiesFileForRegistry(request.projectDirectory, updatedArtifact);
            return "Metadata updated successfully";
        } else {
            window.showErrorMessage("Could not update the registry resource metadata. Please check the artifact.xml file");
        }
    }
    return "Could not read the artifact.xml file";
}
function updatePropertiesFileForRegistry(projectDir: string, artifact: { artifact: any, properties: { key: string, value: string }[] }) {
    const properties = artifact.properties;
    const propertiesFilePath = projectDir + '.properties';
    if (properties.length > 0) {
        const propertiesContent = properties.map((property) => property.key + "=" + property.value).join('\n');
        fs.writeFileSync(propertiesFilePath, propertiesContent);
    }
}

function getArtifactData(projectDir: string): [any, any[], string] {
    const fileUri = Uri.file(projectDir);
    let artifactXMLPath = "";
    const workspaceFolder = workspace.getWorkspaceFolder(fileUri);
    if (workspaceFolder) {
        projectDir = path.join(workspaceFolder.uri.fsPath, 'src', 'main', 'wso2mi', 'resources', 'registry');
        artifactXMLPath = path.join(projectDir, 'artifact.xml');
    }
    if (fs.existsSync(artifactXMLPath)) {
        const artifactXML = fs.readFileSync(artifactXMLPath, "utf8");
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: "@",
            parseTagValue: true,
            format: true,
        };
        const parser = new XMLParser(options);
        const artifactXMLData = parser.parse(artifactXML);
        if (artifactXMLData.artifacts) {
            if (!Array.isArray(artifactXMLData.artifacts.artifact)) {
                artifactXMLData.artifacts.artifact = [artifactXMLData.artifacts.artifact];
            }
            return [artifactXMLData, artifactXMLData.artifacts.artifact, artifactXMLPath];
        }
    }
    return [null, [], ""];
}

export function findJavaFiles(folderPath): Map<string, string> {
    const results = new Map();
    function traverse(currentPath) {
        if (!fs.existsSync(currentPath)) {
            console.error(`Directory does not exist: ${currentPath}`);
            return results;
        }

        const files = fs.readdirSync(currentPath);
        for (const file of files) {
            const filePath = path.join(currentPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                traverse(filePath);
            } else if (stats.isFile() && path.extname(filePath) === '.java') {
                const fileContents = fs.readFileSync(filePath, 'utf8');
                const extendsPattern = /class\s+\w+\s+extends\s+AbstractMediator\b/g;
                const matches = fileContents.match(extendsPattern);
                if (matches) {
                    const packagePath = path.dirname(filePath).replace(folderPath, '');
                    const packageName = packagePath.split(path.sep).filter(part => part);
                    results.set(filePath, packageName.join('.'));
                }
            }
        }
    }

    traverse(folderPath);
    return results;
}

/**
 * Focus on the source file at the given position in the editor.
 * @param filePath   path of the file.
 * @param position   position to be focused.
 */
export function goToSource(filePath: string, position?: Range) {
    if (!existsSync(filePath)) {
        return;
    }

    const openedDocument = window.visibleTextEditors.find((editor) => editor.document.fileName === filePath);
    if (!position) {
        openTextEditor(openedDocument, filePath);
    } else {
        const { start: { line, column } } = position;
        const range: VSCodeRange = new VSCodeRange(line, column, line!, column!);

        if (openedDocument) {
            focusTextEditor(openedDocument, range);
        } else {
            openAndFocusTextDocument(filePath, range);
        }
    }

    function openTextEditor(editor: TextEditor | undefined, filePath: string) {
        if (editor) {
            window.showTextDocument(editor.document, { viewColumn: editor.viewColumn });
        } else {
            commands.executeCommand('vscode.open', Uri.file(filePath), { viewColumn: ViewColumn.Beside });
        }
    }

    function focusTextEditor(editor: TextEditor, range: VSCodeRange) {
        window.visibleTextEditors[0].revealRange(range, TextEditorRevealType.InCenter);
        window.showTextDocument(editor.document, { preview: false, preserveFocus: false, viewColumn: editor.viewColumn })
            .then(textEditor => updateEditor(textEditor, range));
    }

    function openAndFocusTextDocument(filePath: string, range: VSCodeRange) {
        workspace.openTextDocument(filePath).then(sourceFile => {
            window.showTextDocument(sourceFile, { preview: false, preserveFocus: false, viewColumn: ViewColumn.Beside })
                .then(textEditor => updateEditor(textEditor, range));
        });
    }

    function updateEditor(textEditor: TextEditor, range: VSCodeRange) {
        textEditor.revealRange(range, TextEditorRevealType.InCenter);
        textEditor.selection = new Selection(range.start, range.start);
    }
}

export async function downloadWithProgress(projectUri: string, url: string, downloadPath: string, title: string) {
    await window.withProgress({
        location: ProgressLocation.Notification,
        title: title,
        cancellable: false
    }, async (progress) => {
        let lastPercentageReported = 0;
        const handleProgress = (downloadProgress: DownloadProgressData) => {
            const percentCompleted = downloadProgress.percentage;
            if (percentCompleted > lastPercentageReported) {
                progress.report({ increment: percentCompleted - lastPercentageReported, message: `${percentCompleted}% of ${downloadProgress.downloadSize}` });
                lastPercentageReported = percentCompleted;
            }
        };
        await downloadFile(projectUri, url, downloadPath, handleProgress).catch((error) => {
            if (fs.existsSync(downloadPath)) {
                fs.unlinkSync(downloadPath);
            }
        });
    });
}

export async function extractWithProgress(filePath: string, destination: string, title: string) {
    await window.withProgress({
        location: ProgressLocation.Notification,
        title: title,
        cancellable: false
    }, async () => {
        await extractArchive(filePath, destination);
    });
}
export async function performTaskWithProgress(
    task: () => Promise<void>,
    title: string,
    cancellable = false
) {
    await window.withProgress({
        location: ProgressLocation.Notification,
        title: title,
        cancellable: cancellable,
    }, async (progress, cancellationToken) => {

        let cancelled = false;
        cancellationToken.onCancellationRequested(() => {
            cancelled = true;
        });

        try {
            await task();
        } catch (error) {
            window.showErrorMessage(`Error while performing the task: ${error}`);
        }
    });
}

async function extractArchive(filePath: string, destination: string) {
    const platform = process.platform;

    function runCommand(command: string, args: string[] = [], options = {}) {
        return new Promise<void>((resolve, reject) => {
            const child = spawn(command, args, options);

            child.stdout.on('data', (data) => {
                console.log(`stdout: ${data}`);
            });

            child.stderr.on('data', (data) => {
                console.error(`stderr: ${data}`);
            });

            child.on('error', (error) => {
                reject(error);
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Unzip failed with code ${code}`));
                }
            });
        });
    }

    try {
        if (filePath.endsWith('.zip')) {
            if (platform === 'win32') {
                await runCommand('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -Path "${filePath}" -DestinationPath "${destination}" -Force`]);
            } else {
                await runCommand('unzip', ['-o', filePath, '-d', destination]);
            }
        } else if (filePath.endsWith('.tar') || filePath.endsWith('.tar.gz') || filePath.endsWith('.tgz')) {
            if (platform === 'win32') {
                await runCommand('powershell.exe', ['-NoProfile', '-Command', `tar -xf "${filePath}" -C "${destination}"`]);
            } else {
                await runCommand('tar', ['-xf', filePath, '-C', destination]);
            }
        } else {
            throw new Error('Unsupported file type');
        }
    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : String(error);

        if (errorMessage.includes("Unzip failed with code") && fs.existsSync(destination)) {
            fs.unlinkSync(filePath);
        }

        if (errorMessage.includes("ENOENT")) {
            window.showErrorMessage('unzip or tar command not found. Please install these to extract the archive.');
        }

        throw new Error(`Error while extracting the archive: ${errorMessage}`);
    }
}
export async function selectFolderDialog(title: string, defaultUri?: Uri): Promise<Uri | undefined> {
    return window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: defaultUri,
        openLabel: 'Select',
        title: title
    }).then((uris) => {
        return uris ? uris[0] : undefined;
    });
}

export async function rangeFormat(req: RangeFormatRequest): Promise<ApplyEditResponse> {
    return new Promise(async (resolve) => {
        const editorConfig = workspace.getConfiguration('editor');
        if (editorConfig.get('formatOnSave')) {
            resolve({ status: true });
            return;
        }
        let formattingOptions = {
            tabSize: editorConfig.get("tabSize") ?? 4,
            insertSpaces: editorConfig.get("insertSpaces") ?? false,
            trimTrailingWhitespace: editorConfig.get("trimTrailingWhitespace") ?? false
        };
        const uri = Uri.file(req.uri);
        let edits: TextEdit[];
        if (req.range) {
            edits = await commands.executeCommand("vscode.executeFormatRangeProvider", uri, req.range, formattingOptions);
        } else {
            edits = await commands.executeCommand("vscode.executeFormatDocumentProvider", uri, formattingOptions);
        }
        const workspaceEdit = new WorkspaceEdit();
        workspaceEdit.set(uri, edits);
        await workspace.applyEdit(workspaceEdit);
        resolve({ status: true });
    });
}
