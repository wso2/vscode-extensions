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

import * as fs from 'fs';
import path from "path";
import vscode, { Uri, workspace } from 'vscode';

import { StateMachine } from "../../stateMachine";
import { getRefreshedAccessToken, REFRESH_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE } from '../../../src/utils/ai/auth';
import { AIStateMachine } from '../../../src/views/ai-panel/aiMachine';
import { AIMachineEventType } from '@wso2/ballerina-core/lib/state-machine-types';
import { CONFIG_FILE_NAME, ERROR_NO_BALLERINA_SOURCES, PROGRESS_BAR_MESSAGE_FROM_WSO2_DEFAULT_MODEL } from './constants';
import { getCurrentBallerinaProjectFromContext } from '../config-generator/configGenerator';
import { BallerinaProject } from '@wso2/ballerina-core';
import { BallerinaExtension } from 'src/core';

const config = workspace.getConfiguration('ballerina');
export const BACKEND_URL: string = config.get('rootUrl') || process.env.BALLERINA_ROOT_URL;
export const AUTH_ORG: string = config.get('authOrg') || process.env.BALLERINA_AUTH_ORG;
export const AUTH_CLIENT_ID: string = config.get('authClientID') || process.env.BALLERINA_AUTH_CLIENT_ID;
export const AUTH_REDIRECT_URL: string = config.get('authRedirectURL') || process.env.BALLERINA_AUTH_REDIRECT_URL;

export const DEVANT_API_KEY: string = config.get('devantApiKey') || process.env.DEVANT_API_KEY;
export const DEVANT_API_KEY_FOR_ASK: string = config.get('devantApiKeyForAsk') || process.env.DEVANT_API_KEY_FOR_ASK;
export const DEVANT_STS_TOKEN: string = config.get('cloudStsToken') || process.env.CLOUD_STS_TOKEN;

// This refers to old backend before FE Migration. We need to eventually remove this.
export const OLD_BACKEND_URL: string = BACKEND_URL + "/v2.0";

export async function closeAllBallerinaFiles(dirPath: string): Promise<void> {
    // Check if the directory exists
    if (!fs.existsSync(dirPath)) {
        console.error(`Directory does not exist: ${dirPath}`);
        return;
    }

    // Get the language client
    const langClient = StateMachine.langClient();

    // Function to recursively find and close .bal files
    async function processDir(currentPath: string): Promise<void> {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                // Recursively process subdirectories
                await processDir(entryPath);
            } else if (entry.isFile() && entry.name.endsWith('.bal')) {
                // Convert file path to URI
                const fileUri = Uri.file(entryPath).toString();

                // Call didClose for this Ballerina file
                await langClient.didClose({
                    textDocument: { uri: fileUri }
                });
                await langClient.didChangedWatchedFiles({
                    changes: [
                        {
                            uri: fileUri,
                            type: 3
                        }
                    ]
                });

                console.log(`Closed file: ${entryPath}`);
            }
        }
    }

    // Start the recursive processing
    await processDir(dirPath);
}

export async function getConfigFilePath(ballerinaExtInstance: BallerinaExtension, rootPath: string): Promise<string> {
    if (await isBallerinaProjectAsync(rootPath)) {
        return rootPath;
    }

    const activeTextEditor = vscode.window.activeTextEditor;
    const currentProject = ballerinaExtInstance.getDocumentContext().getCurrentProject();
    let activeFilePath = "";
    let configPath = "";

    if (rootPath !== "") {
        return rootPath;
    }

    if (activeTextEditor) {
        activeFilePath = activeTextEditor.document.uri.fsPath;
    }

    if (currentProject == null && activeFilePath == "") {
        return await showNoBallerinaSourceWarningMessage();
    }

    try {
        const currentBallerinaProject: BallerinaProject = await getCurrentBallerinaProjectFromContext(ballerinaExtInstance);

        if (!currentBallerinaProject) {
            return await showNoBallerinaSourceWarningMessage();
        }

        if (currentBallerinaProject.kind == 'SINGLE_FILE_PROJECT') {
            configPath = path.dirname(currentBallerinaProject.path);
        } else {
            configPath = currentBallerinaProject.path;
        }

        if (configPath == undefined || configPath == "") {
            return await showNoBallerinaSourceWarningMessage();
        }
        return configPath;
    } catch (error) {
        return await showNoBallerinaSourceWarningMessage();
    }
}

export async function getTokenForDefaultModel() {
    try {
        const token = await getRefreshedAccessToken();
        return token;
    } catch (error) {
        throw error;
    }
}

export async function getBackendURL(): Promise<string> {
    return new Promise(async (resolve) => {
        resolve(OLD_BACKEND_URL);
    });
}

// Function to find a file in a case-insensitive way
function findFileCaseInsensitive(directory: string, fileName: string): string {
    const files = fs.readdirSync(directory);
    const targetFile = files.find(file => file.toLowerCase() === fileName.toLowerCase());
    const file = targetFile ? targetFile : fileName;
    return path.join(directory, file);
}

// Helper to add or replace a config line
function addOrReplaceConfigLine(lines: string[], key: string, value: string) {
    const configLine = `${key} = "${value}"`;
    const idx = lines.findIndex(l => l.trim().startsWith(`${key} =`));
    if (idx === -1) {
        // Add after header
        lines.splice(1, 0, configLine);
    } else {
        lines[idx] = configLine;
    }
}

function addDefaultModelConfig(
    projectPath: string, token: string, backendUrl: string): boolean {
    const targetTable = `[ballerina.ai.wso2ProviderConfig]`;
    const SERVICE_URL_KEY = 'serviceUrl';
    const ACCESS_TOKEN_KEY = 'accessToken';
    const urlLine = `${SERVICE_URL_KEY} = "${backendUrl}"`;
    const accessTokenLine = `${ACCESS_TOKEN_KEY} = "${token}"`;
    const configFilePath = findFileCaseInsensitive(projectPath, CONFIG_FILE_NAME);

    let fileContent = '';

    if (fs.existsSync(configFilePath)) {
        fileContent = fs.readFileSync(configFilePath, 'utf-8');
    }

    const tableStartIndex = fileContent.indexOf(targetTable);

    if (tableStartIndex === -1) {
        // Table doesn't exist, create it
        if (fileContent.length > 0 && !fileContent.endsWith('\n')) {
            fileContent += '\n\n';
        }
        fileContent += `\n${targetTable}\n${urlLine}\n${accessTokenLine}\n`;
        fs.writeFileSync(configFilePath, fileContent);
        return true;
    }

    // Table exists, update it
    // Find the end of the table (next table or end of file)
    let tableEndIndex = fileContent.indexOf('\n[', tableStartIndex);
    if (tableEndIndex === -1) {
        tableEndIndex = fileContent.length;
    }

    // Extract table content and split into lines once
    let tableContent = fileContent.substring(tableStartIndex, tableEndIndex);
    let lines = tableContent.split('\n');

    // Add or replace serviceUrl
    addOrReplaceConfigLine(lines, SERVICE_URL_KEY, backendUrl);
    // Add or replace accessToken (after serviceUrl)
    // Ensure accessToken is after serviceUrl
    let serviceUrlIdx = lines.findIndex(l => l.trim().startsWith(`${SERVICE_URL_KEY} =`));
    let accessTokenIdx = lines.findIndex(l => l.trim().startsWith(`${ACCESS_TOKEN_KEY} =`));
    if (accessTokenIdx === -1) {
        lines.splice(serviceUrlIdx + 1, 0, `${ACCESS_TOKEN_KEY} = "${token}"`);
    } else {
        lines[accessTokenIdx] = `${ACCESS_TOKEN_KEY} = "${token}"`;
        // Move accessToken if not after serviceUrl
        if (accessTokenIdx !== serviceUrlIdx + 1) {
            const accessTokenLine = lines[accessTokenIdx];
            lines.splice(accessTokenIdx, 1);
            lines.splice(serviceUrlIdx + 1, 0, accessTokenLine);
        }
    }

    // Join lines and replace the table in the file content
    const updatedTableContent = lines.join('\n');
    fileContent = fileContent.substring(0, tableStartIndex) + updatedTableContent + fileContent.substring(tableEndIndex);
    fs.writeFileSync(configFilePath, fileContent);
    return true;
}

export async function addConfigFile(configPath: string): Promise<boolean> {
    const progress = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: PROGRESS_BAR_MESSAGE_FROM_WSO2_DEFAULT_MODEL,
            cancellable: false,
        },
        async () => {
            try {
                const token: string | null = await getTokenForDefaultModel();
                if (token === null) {
                    AIStateMachine.service().send(AIMachineEventType.LOGOUT);
                    throw new Error(REFRESH_TOKEN_NOT_AVAILABLE_ERROR_MESSAGE);
                }
                const success = addDefaultModelConfig(configPath, token, await getBackendURL());
                if (success) {
                    return true;
                }
            } catch (error) {
                AIStateMachine.service().send(AIMachineEventType.LOGOUT);
                throw error;
            }
        }
    );
    return progress;
}

export async function isBallerinaProjectAsync(rootPath: string): Promise<boolean> {
    try {
        if (!fs.existsSync(rootPath)) {
            return false;
        }

        const files = fs.readdirSync(rootPath);
        return files.some(file =>
            file.toLowerCase() === 'ballerina.toml' ||
            file.toLowerCase().endsWith('.bal')
        );
    } catch (error) {
        console.error(`Error checking Ballerina project: ${error}`);
        return false;
    }
}

async function showNoBallerinaSourceWarningMessage() {
    return await vscode.window.showWarningMessage(ERROR_NO_BALLERINA_SOURCES);
}
