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
import {
    EXTENSION_ID,
    LANGUAGE_CLIENT_ID,
    LANGUAGE_CLIENT_NAME,
    MESSAGES,
    SERVER_BASE_URL,
} from "../constants/constants";
import { WEB_IDE_SCHEME } from "../fs/activateFs";
import { LANGUAGE, ballerinaExtInstance } from "../../core/extension";

export async function activateLanguageServer(): Promise<WebExtendedLanguageClient> {
    console.log("activate Language Server");

    // activate status bar
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

    // activate language server
    const langClient = createExtendedLanguageClient(ballerinaExtInstance.context);
    await langClient.start();
    if (langClient.state === LS_STATE.Stopped) {
    } else if (langClient.state === LS_STATE.Running) {
        const balInfo = await getBallerinaInfo(statusBar);
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
