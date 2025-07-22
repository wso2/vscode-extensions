/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import * as vscode from 'vscode';
import { Messenger } from 'vscode-messenger';
import { StateMachine } from './stateMachine';
import { stateChanged, webviewReady } from '@wso2/si-core';
import { VisualizerWebview } from './visualizer/webview';
import { registerSiVisualizerRpcHandlers } from './rpc-managers/si-visualizer/rpc-handler';

export class RPCLayer {
    static _messenger: Messenger = new Messenger();

    constructor(webViewPanel: vscode.WebviewPanel | vscode.WebviewView) {
        if (isWebviewPanel(webViewPanel)) {
            RPCLayer._messenger.onNotification(webviewReady, () => {
                RPCLayer._messenger.sendNotification(stateChanged, { type: 'webview', webviewType: VisualizerWebview.viewType }, StateMachine.state());
            });
            RPCLayer._messenger.registerWebviewPanel(webViewPanel as vscode.WebviewPanel);
            StateMachine.service().onTransition((state) => {
                RPCLayer._messenger.sendNotification(stateChanged, { type: 'webview', webviewType: VisualizerWebview.viewType }, state.value);
            });
        } else {
            RPCLayer._messenger.registerWebviewPanel(webViewPanel as vscode.WebviewPanel);
        }
    }

    static create(webViewPanel: vscode.WebviewPanel | vscode.WebviewView) {
        return new RPCLayer(webViewPanel);
    }

    static init() {
        registerSiVisualizerRpcHandlers(RPCLayer._messenger);
    }

}

function isWebviewPanel(webview: vscode.WebviewPanel | vscode.WebviewView): boolean {
    return webview.viewType === VisualizerWebview.viewType;
}
