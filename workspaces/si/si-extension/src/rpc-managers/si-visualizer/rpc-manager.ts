/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import {
    SIVisualizerAPI,
    NotificationRequest,
    NotificationResponse,
    DownloadSIRequest,
    OpenExternalRequest,
    OpenExternalResponse,
    SetupDetails,
    SetPathRequest,
    PathDetailsResponse,
    OpenViewRequest,
    EVENT_TYPE,
    VisualizerLocation
} from "@wso2/si-core";
import * as vscode from "vscode";
import { selectFolderDialog } from "../../utils/fileOperations";
import * as os from "os";
import { downloadJavaFromSI, downloadSI, getSetupDetails, setPathsInConfiguration } from "../../utils/onboardingUtils";
import * as path from 'path';
import * as fs from "fs";
import { extension } from '../../SIExtensionContext';
import { openView } from "../../stateMachine";

export class SiVisualizerRpcManager implements SIVisualizerAPI {
    async showNotification(params: NotificationRequest): Promise<NotificationResponse> {
        return new Promise(async (resolve) => {
            const { message, options, type = "info" } = params;
            let selection: string | undefined;
            if (type === "info") {
                selection = await vscode.window.showInformationMessage(message, ...(options ?? []));
            } else if (type === "warning") {
                selection = await vscode.window.showWarningMessage(message, ...(options ?? []));
            } else {
                selection = await vscode.window.showErrorMessage(message, ...(options ?? []));
            }

            resolve({ selection });
        });
    }

    async downloadJavaFromSI(miVersion: string): Promise<string> {
        const javaPath = await downloadJavaFromSI(miVersion);
        return javaPath;
    }

    async downloadSI(params: DownloadSIRequest): Promise<string> {
        const miPath = await downloadSI(params.version, params.isUpdatedPack);
        return miPath;
    }

    async retrieveRawData() {}

    async getDesignModel(): Promise<string> {
        return "";
    }

    async getSetupDetails(): Promise<SetupDetails> {
        return getSetupDetails();
    }

    async selectFolder(title: string): Promise<string | undefined> {
        try {
            const selectedFolder = await selectFolderDialog(title, vscode.Uri.file(os.homedir()));

            if (selectedFolder) {
                const folderPath = selectedFolder.fsPath;
                return folderPath;
            } else {
                vscode.window.showInformationMessage("No folder selected.");
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error selecting folder: ${error}`);
        }
    }

    async setPathsInConfiguration(request: SetPathRequest): Promise<PathDetailsResponse> {
        return await setPathsInConfiguration(request);
    }

    async createNewSiddhiFile() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage("No workspace folder is open.");
            return;
        }

        const defaultFileName = "SiddhiApp";
        var fileName = defaultFileName;

        const folderUri = workspaceFolders[0].uri;

        let index = 0;
        while (true) {
            fileName = defaultFileName + (index === 0 ? "" : `_${index}`);
            try {
                await vscode.workspace.fs.stat(vscode.Uri.file(path.join(folderUri.fsPath, fileName + ".siddhi")));
                index++;
              } catch (err) {
                break;
              }
        }

        const fileUri = vscode.Uri.file(path.join(folderUri.fsPath, fileName + ".siddhi"));
        const defaultContent = `@App:name("${fileName}")\n@App:description("Description of the plan")\n`;
        try {
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(defaultContent, "utf8"));
            const doc = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(`Created ${defaultFileName}`);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to create file: ${err}`);
        }
    }

    async openExternal(params: OpenExternalRequest): Promise<OpenExternalResponse> {
        return new Promise(async (resolve, reject) => {
            const { uri } = params;
            const isSuccess = await vscode.env.openExternal(vscode.Uri.parse(uri));
            resolve({ success: isSuccess });
        });
    }

    async getEULALicense(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const licensePath = extension.context.asAbsolutePath(path.join('resources', 'SI_LICENSE.txt'));

            try {
                const licenseText = fs.readFileSync(licensePath, 'utf-8');
                resolve(licenseText);
            } catch (err) {
                vscode.window.showErrorMessage('Failed to load license file.');
                reject(err);
            }
        });
    }

    openView(params: OpenViewRequest): void {
        openView(params.type as EVENT_TYPE, params.location as VisualizerLocation);
    }
}
