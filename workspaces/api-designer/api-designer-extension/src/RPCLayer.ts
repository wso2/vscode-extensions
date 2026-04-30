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

import * as vscode from 'vscode';
import { WebviewView, WebviewPanel, window, QuickPickItem } from 'vscode';
import { Messenger } from 'vscode-messenger';
import { getVisualizerState, VisualizerLocation, selectQuickPickItem, WebviewQuickPickItem, selectQuickPickItems, showConfirmMessage, showInputBox, showInfoNotification, showErrorNotification, generateWithAI, saveSpec, requestValidation, navigateTo, openExternal } from '@wso2/api-designer-core';
import { AIManager } from './ai/ai-manager';
import { extension } from './APIDesignerExtensionContext';
import { registerApiDesignerVisualizerRpcHandlers } from './rpc-managers/api-designer-visualizer/rpc-handler';

export class RPCLayer {
    static _messenger: Messenger = new Messenger();
    static _aiManager: AIManager;

    constructor(webViewPanel: WebviewPanel | WebviewView) {
        RPCLayer._messenger.registerWebviewPanel(webViewPanel as WebviewPanel);
    }

    static create(webViewPanel: WebviewPanel | WebviewView) {
        return new RPCLayer(webViewPanel);
    }

    static init() {
        // Initialize AI Manager (supports Copilot, Claude, OpenAI, etc.)
        RPCLayer._aiManager = AIManager.getInstance(
            RPCLayer._messenger,
            extension.context
        );

        // ----- Main Webview RPC Methods
        RPCLayer._messenger.onRequest(getVisualizerState, () => getContext());
        registerApiDesignerVisualizerRpcHandlers(RPCLayer._messenger);

        // ----- VScode interactions RPC Methods
        RPCLayer._messenger.onRequest(selectQuickPickItem, async (params) => {
            const itemSelection = await window.showQuickPick(params.items as QuickPickItem[],{title: params.title, placeHolder:params.placeholder});
            return itemSelection as WebviewQuickPickItem;
        });
        RPCLayer._messenger.onRequest(selectQuickPickItems, async (params) => {
            const itemSelection = await window.showQuickPick(params.items as QuickPickItem[],{title: params.title, placeHolder:params.placeholder,canPickMany: true});
            return itemSelection as WebviewQuickPickItem[];
        });
        RPCLayer._messenger.onRequest(showConfirmMessage, async (params) => {
            const response = await window.showInformationMessage(params.message, { modal: true }, params.buttonText);
		    return response === params.buttonText;
        });
        RPCLayer._messenger.onRequest(showInputBox, async (params) => window.showInputBox(params));
        RPCLayer._messenger.onNotification(showInfoNotification,  (message) => {
            window.showInformationMessage(message);
        });
        RPCLayer._messenger.onNotification(showErrorNotification,  (message) => {
            window.showErrorMessage(message);
        });

        // ----- AI Generation RPC Method (supports multiple AI providers)
        RPCLayer._messenger.onRequest(generateWithAI, async (params) => {
            return await RPCLayer._aiManager.generateWithAI(
                params.context,
                params.prompt
            );
        });

        RPCLayer._messenger.onNotification(saveSpec, async (payload) => {
            const { ApiDesignerPanel } = await import('./visualizer/api-designer-panel');
            const currentPanel = ApiDesignerPanel.getCurrentPanel();
            if (currentPanel) {
                await currentPanel.handleSaveSpecNotification(payload?.data);
            }
        });

        RPCLayer._messenger.onNotification(requestValidation, async () => {
            const { ApiDesignerPanel } = await import('./visualizer/api-designer-panel');
            const currentPanel = ApiDesignerPanel.getCurrentPanel();
            if (currentPanel) {
                await currentPanel.sendValidationData();
            }
        });

        RPCLayer._messenger.onNotification(navigateTo, async (payload) => {
            const { ApiDesignerPanel } = await import('./visualizer/api-designer-panel');
            const currentPanel = ApiDesignerPanel.getCurrentPanel();
            if (currentPanel) {
                await currentPanel.handleNavigateToNotification(payload?.data?.focusPath);
            }
        });

        RPCLayer._messenger.onNotification(openExternal, async (payload) => {
            const url = payload?.url;
            if (typeof url === 'string' && url.trim().length > 0) {
                try {
                    await vscode.env.openExternal(vscode.Uri.parse(url));
                } catch {
                    // Ignore invalid URLs
                }
            }
        });
    }

}


async function getContext(): Promise<VisualizerLocation> {
    let documentUri: string | undefined;
    try {
        const { ApiDesignerPanel } = await import('./visualizer/api-designer-panel');
        const currentPanel = ApiDesignerPanel.getCurrentPanel();
        if (currentPanel) {
            documentUri = currentPanel.getCurrentFilePath();
        }
    } catch {
        // Ignore import errors
    }
    return { documentUri, view: null };
}
