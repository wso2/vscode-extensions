/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import * as vscode from "vscode";
import {
    EXTENSION_INSTALLER_WEBVIEW_ID,
    EXTENSION_INSTALLER_WEBVIEW_TITLE,
    UI_COMMAND_RESPONSES,
    UI_COMMANDS,
} from "../constants";
import { StateMachine } from "../stateMachine";
import { WebviewBase } from "./webview-base";
import { extension } from "../SIExtensionContext";

export class ExtensionInstallerWebview extends WebviewBase {
    constructor() {
        super("extension-installer.html", EXTENSION_INSTALLER_WEBVIEW_ID, EXTENSION_INSTALLER_WEBVIEW_TITLE, vscode.ViewColumn.Beside);
    }

    public registerEventListeners() {
        this._panel!.webview.onDidReceiveMessage(
            async (message) => {
                const client = StateMachine.context().langClient;
                switch (message.command) {
                    case UI_COMMANDS.DEPENDENCY_SHARING_EXTENSIONS: {
                        const content = await client?.getDependencySharingExtensions(message.payload);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.DEPENDENCY_SHARING_EXTENSIONS, content);
                        break;
                    }
                    case UI_COMMANDS.INSTALL_DEPENDENCIES: {
                        const content = await client?.installDependencies(message.payload);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.INSTALL_DEPENDENCIES, content);
                        break;
                    }
                    case UI_COMMANDS.UNINSTALL_DEPENDENCIES: {
                        const content = await client?.uninstallDependencies(message.payload);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.UNINSTALL_DEPENDENCIES, content);
                        break;
                    }
                    default:
                        break;
                }
            },
            undefined,
            extension.context.subscriptions
        );
    }
}
