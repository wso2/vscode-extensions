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
import * as fs from "fs";
import { extension } from "../SIExtensionContext";

export abstract class WebviewBase {
    protected _panel: vscode.WebviewPanel | undefined;
    protected _disposables: vscode.Disposable[] = [];

    constructor(htmlFile: string, id: string, title: string, showOptions: vscode.ViewColumn) {
        this._panel = vscode.window.createWebviewPanel(id, title, showOptions, {
            enableScripts: true,
            retainContextWhenHidden: true,
              localResourceRoots: [
                vscode.Uri.file(path.join(extension.context.extensionPath, "src", "web")),
              ],
              enableFindWidget: true,
        });
        this._panel.iconPath = {
            light: vscode.Uri.file(path.join(extension.context.extensionPath, 'resources', 'images', 'icons', 'light-icon.svg')),
            dark: vscode.Uri.file(path.join(extension.context.extensionPath, 'resources', 'images', 'icons', 'dark-icon.svg')),
        };
        const htmlPath = path.join(extension.context.extensionPath, "src", "web", htmlFile);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getWebviewContent(this._panel.webview, htmlPath);
    }

    public getWebview(): vscode.WebviewPanel | undefined {
        return this._panel;
    }

    protected getWebviewContent(
        webview: vscode.Webview,
        htmlPath: number | fs.PathLike
    ) {
        let html = fs.readFileSync(htmlPath, "utf8");
        const mediaUri = webview.asWebviewUri(vscode.Uri.file(path.join(extension.context.extensionPath, "src", "web")));
        html = html.replace(/(\bsrc="|href=")([^"]*)\b/g, (match, prefix, value) => {
            if (value.startsWith("http") || value.startsWith("data:") || value.startsWith("vscode-webview-resource:")) {
                return match;
            }
            return `${prefix}${mediaUri}/${value}`;
        });
        html = html.replace(/\$\{extensionPath\}/g, mediaUri.toString());
        return html;
    }

    public dispose() {
        this._panel?.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
        this._panel = undefined;
    }

    public publishMessageToWebview(command: string, payload: any) {
        this._panel?.webview.postMessage({ command, payload });
    }

    public publishNotificationToWebview(command: string) {
        this._panel?.webview.postMessage({ command });
    }

    public abstract registerEventListeners(): void;
}
