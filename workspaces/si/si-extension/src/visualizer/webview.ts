/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { getComposerJSFiles } from '../utils/utils';
import { RPCLayer } from '../RPCLayer';
import { extension } from '../SIExtensionContext';
import { MACHINE_VIEW } from '@wso2/si-core';

export class VisualizerWebview {
    public static currentPanel: VisualizerWebview | undefined;
    public static readonly viewType = 'streaming-integrator.visualizer';
    private _panel: vscode.WebviewPanel | undefined;
    private _disposables: vscode.Disposable[] = [];

    constructor(view: MACHINE_VIEW, beside: boolean = false) {
        this._panel = VisualizerWebview.createWebview(view, beside);
        this._panel.iconPath = {
            light: vscode.Uri.file(path.join(extension.context.extensionPath, 'resources', 'images', 'icons', 'light-icon.svg')),
            dark: vscode.Uri.file(path.join(extension.context.extensionPath, 'resources', 'images', 'icons', 'dark-icon.svg'))
          };
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this.getWebviewContent(this._panel.webview);
        RPCLayer.create(this._panel);
    }

    private static createWebview(view: MACHINE_VIEW, beside: boolean): vscode.WebviewPanel {
        let title: string = "WSO2 Integrator: SI";
        const panel = vscode.window.createWebviewPanel(
            VisualizerWebview.viewType,
            title,
            beside ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(os.homedir())
                ]
            }
        );
        return panel;
    }

    public getWebview(): vscode.WebviewPanel | undefined {
        return this._panel;
    }


    protected getWebviewContent(webview: vscode.Webview) {
        // The JS file from the React build output
        const scriptUri = getComposerJSFiles(extension.context, 'Visualizer', webview).map(jsFile =>
            '<script charset="UTF-8" src="' + jsFile + '"></script>').join('\n');

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <title>WSO2 Integrator: SI</title>
         
          <style>
            body, html, #root {
                height: 100%;
                margin: 0;
                padding: 0px;
                overflow: hidden;
            }
          </style>
          ${scriptUri}
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root">
            </div>
            <script>
            function render() {
                visualizerWebview.renderWebview(
                    document.getElementById("root"), "visualizer"
                );
            }
            render();
        </script>
        </body>
        </html>
      `;
    }

    public dispose() {
        VisualizerWebview.currentPanel = undefined;
        this._panel?.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }

        this._panel = undefined;
    }
}
