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

import { TextEditor, Uri, ViewColumn, WebviewPanel, commands, window, workspace } from "vscode";
import { basename, dirname, join } from "path";
import { existsSync } from "fs";
import { BallerinaExtension, ExtendedLangClient } from "../../core";
import { extension } from "../../BalExtensionContext";

const COMPATIBILITY_MESSAGE = "An incompatible Ballerina version was detected. Update Ballerina to 2201.6.0 or higher to use the feature.";

let diagramWebview: WebviewPanel | undefined;
let filePath: string | undefined;

export function activate(ballerinaExtInstance: BallerinaExtension) {
    const langClient = <ExtendedLangClient>ballerinaExtInstance.langClient;

    if (window.activeTextEditor) {
        ballerinaExtInstance.setPersistStatusContext(window.activeTextEditor);
    }

    window.onDidChangeActiveTextEditor((textEditor: TextEditor) => {
        ballerinaExtInstance.setPersistStatusContext(textEditor);
    });
}

export function checkIsPersistModelFile(fileUri: Uri): boolean {
    if(!extension.isWebMode)
    {
           return basename(dirname(fileUri.fsPath)) === 'persist' && existsSync(join(dirname(dirname(fileUri.fsPath)), 'Ballerina.toml'));
    }
}
