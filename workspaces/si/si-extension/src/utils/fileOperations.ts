/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import * as vscode from "vscode";
import * as fs from 'fs';
import axios from "axios";
import { DownloadProgressData, onDownloadProgress} from "@wso2/si-core";
import { RPCLayer } from "../RPCLayer";
import { VisualizerWebview } from "../visualizer/webview";
import { spawn } from "child_process";

export function getFileName(filePath: string): string {
    const fileNameWithExt = filePath.split('/').pop();
    return fileNameWithExt?.split('.')[0] || '';
}

async function downloadFile(url: string, filePath: string, progressCallback?: (downloadProgress: DownloadProgressData) => void) {
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
                RPCLayer._messenger.sendNotification(
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
        vscode.window.showErrorMessage(`Error while downloading the file: ${error}`);
        throw error;
    }
}

export async function downloadWithProgress(url: string, downloadPath: string, title: string) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
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
        await downloadFile(url, downloadPath, handleProgress).catch((error) => {
            if (fs.existsSync(downloadPath)) {
                fs.unlinkSync(downloadPath);
            }
        });
    });
}

export async function extractWithProgress(filePath: string, destination: string, title: string) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: title,
        cancellable: false
    }, async () => {
        await extractArchive(filePath, destination);
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
            vscode.window.showErrorMessage('unzip or tar command not found. Please install these to extract the archive.');
        }

        throw new Error(`Error while extracting the archive: ${errorMessage}`);
    }
}

export async function selectFolderDialog(title: string, defaultUri?: vscode.Uri): Promise<vscode.Uri | undefined> {
    return vscode.window.showOpenDialog({
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
