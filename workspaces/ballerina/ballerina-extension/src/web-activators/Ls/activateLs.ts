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

import * as vscode from "vscode";
import { WebExtendedLanguageClient } from "../webExtendedLanguageClient";
import { LanguageClientOptions, State as LS_STATE } from "vscode-languageclient";
import { extension } from "../../BalExtensionContext";
import {
    EXTENSION_ID,
    LANGUAGE_CLIENT_ID,
    LANGUAGE_CLIENT_NAME,
    MESSAGES,
    PALETTE_COMMANDS,
    SERVER_BASE_URL,
} from "../constants/constants";
import { WEB_IDE_SCHEME } from "../fs/activateFs";
import { LANGUAGE, ballerinaExtInstance } from "../../core/extension";

// import { log, outputChannel } from "../editer-support/output-channel";

export async function activateLanguageServer(): Promise<WebExtendedLanguageClient> {
    console.log("activate Language Server");

    // Register show logs command.
    // ballerinaExtInstance.context.subscriptions.push(
    //     vscode.commands.registerCommand(PALETTE_COMMANDS.SHOW_LOGS, () => {
    //         outputChannel.show();
    //     })
    // );

    // activate status bar
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    // ballerinaExtInstance.statusBar = statusBar;
    // updateStatusBarText(statusBar, MESSAGES.BALLERINA_DETECTING);
    // statusBar.command = PALETTE_COMMANDS.SHOW_LOGS;
    // statusBar.show();
    // vscode.window.onDidChangeActiveTextEditor((editor) => {
    //     if (editor.document.uri.scheme === WEB_IDE_SCHEME && editor.document.languageId === LANGUAGE.BALLERINA) {
    //         statusBar.show();
    //     } else {
    //         statusBar.hide();
    //     }
    // });

    // activate language server
    const langClient = createExtendedLanguageClient(ballerinaExtInstance.context);
    await langClient.start();
    if (langClient.state === LS_STATE.Stopped) {
        // If the language server is not running, show an error message in the status bar
        // and log the message to output channel.
        // updateStatusBarText(statusBar, MESSAGES.BALLERINA_NOT_FOUND, "statusBarItem.errorBackground");
        // log(MESSAGES.LS_CONNECTION_ERROR);
    } else if (langClient.state === LS_STATE.Running) {
        // If the language server is running, register extended capabilities.
        // await langClient?.registerExtendedAPICapabilities();
        // Get the ballerina version details from the server and update the status bar text
        // and output channel.
        const balInfo = await getBallerinaInfo(statusBar);
        //  ballerinaExtInstance.ballerinaVersion = balInfo.ballerinaVersion;
        // ballerinaExtInstance.ballerinaVersionText = balInfo.ballerinaVersionText;
        // updateStatusBarText(statusBar, `Ballerina ${balInfo.ballerinaVersionText}`);
        // const extension = vscode.extensions.getExtension(EXTENSION_ID);
        //  const pluginVersion = extension.packageJSON.version.split('-')[0];
        // log(`Plugin version: ${pluginVersion}\nBallerina version: ${balInfo.ballerinaVersionText}`);
        ballerinaExtInstance.langClient = langClient;
        ballerinaExtInstance.context?.subscriptions.push(langClient);
    }

    return langClient;
}

function createExtendedLanguageClient(context: vscode.ExtensionContext): WebExtendedLanguageClient {
    const serverMain = vscode.Uri.joinPath(context.extensionUri, "/dist/browserServerMain.js");
    const worker = new Worker(serverMain.toString(true));
    return new WebExtendedLanguageClient(LANGUAGE_CLIENT_ID, LANGUAGE_CLIENT_NAME, getClientOptions(), worker, context);
}

function getClientOptions(): LanguageClientOptions {
    return {
        documentSelector: [
            { scheme: "file", language: LANGUAGE.BALLERINA },
            { scheme: "file", language: LANGUAGE.TOML },
            { scheme: WEB_IDE_SCHEME, language: LANGUAGE.BALLERINA },
            { scheme: WEB_IDE_SCHEME, language: LANGUAGE.TOML },
        ],
        synchronize: { configurationSection: LANGUAGE.BALLERINA },
        initializationOptions: {
            supportBalaScheme: "true",
            supportQuickPick: "true",
            supportPositionalRenamePopup: "true",
        },
        // outputChannel: outputChannel,
    };
}

async function getBallerinaInfo(statusBar: vscode.StatusBarItem) {
    const balInfo = await fetch(`${SERVER_BASE_URL}/bala/info`);
    if (!balInfo.ok) {
        statusBar.text = MESSAGES.BALLERINA_NOT_FOUND;
    }
    const data = await balInfo.json();

    return data;
}

async function updateStatusBarText(statusBar: vscode.StatusBarItem, text: string, backgroundColor?: string) {
    statusBar.text = text;
    if (backgroundColor) {
        statusBar.backgroundColor = new vscode.ThemeColor(backgroundColor);
    }
}
