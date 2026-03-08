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

import { WebviewView, WebviewPanel, window, env, commands } from 'vscode';
import { Messenger } from 'vscode-messenger';
import { stateChanged, getVisualizerState, getAIVisualizerState, VisualizerLocation, AIVisualizerLocation, sendAIStateEvent, AI_EVENT_TYPE, aiStateChanged, themeChanged, getPopupVisualizerState, PopupVisualizerLocation, webviewReady, Platform } from '@wso2/mi-core';
import { registerMiDiagramRpcHandlers } from './rpc-managers/mi-diagram/rpc-handler';
import { VisualizerWebview } from './visualizer/webview';
import { registerMiVisualizerRpcHandlers } from './rpc-managers/mi-visualizer/rpc-handler';
import { AiPanelWebview } from './ai-features/webview';
import { StateMachineAI } from './ai-features/aiMachine';
import { registerMiDataMapperRpcHandlers } from './rpc-managers/mi-data-mapper/rpc-handler';
import { extension } from './MIExtensionContext';
import { registerMiDebuggerRpcHandlers } from './rpc-managers/mi-debugger/rpc-handler';
import { registerMIAiPanelRpcHandlers } from './rpc-managers/ai-features/rpc-handler';
import { registerMIAgentPanelRpcHandlers } from './rpc-managers/agent-mode/rpc-handler';
import path = require('path');
import { getStateMachine } from './stateMachine';
import { getPopupStateMachine } from './stateMachinePopup';
const os = require('os')
const platform = getPlatform();

export class RPCLayer {
    static _messengers: Map<string, Messenger> = new Map();

    static create(webViewPanel: WebviewPanel, projectUri: string): void {
        if (this._messengers.has(projectUri)) {
            this._messengers.get(projectUri)!.registerWebviewPanel(webViewPanel as WebviewPanel);
            return;
        }
        const messenger = new Messenger();
        this._messengers.set(projectUri, messenger);
        messenger.registerWebviewPanel(webViewPanel as WebviewPanel);

        // ----- Main Webview RPC Methods
        messenger.onRequest(getVisualizerState, () => getContext(projectUri));
        registerMiVisualizerRpcHandlers(messenger, projectUri);
        registerMiDiagramRpcHandlers(messenger, projectUri);
        registerMiDataMapperRpcHandlers(messenger, projectUri);
        registerMiDebuggerRpcHandlers(messenger, projectUri);
        registerMIAiPanelRpcHandlers(messenger, projectUri);
        registerMIAgentPanelRpcHandlers(messenger, projectUri);
        // ----- AI Webview RPC Methods
        messenger.onRequest(getAIVisualizerState, () => getAIContext());
        messenger.onRequest(sendAIStateEvent, (event: any) => StateMachineAI.sendEvent(event));
        // ----- Form Views RPC Methods
        messenger.onRequest(getPopupVisualizerState, () => getFormContext(projectUri));

        messenger.onNotification(webviewReady, () => {
            messenger.sendNotification(stateChanged, { type: 'webview', webviewType: VisualizerWebview.viewType }, getStateMachine(projectUri).state());
        });
        getStateMachine(projectUri).service().onTransition((state) => {
            messenger.sendNotification(stateChanged, { type: 'webview', webviewType: VisualizerWebview.viewType }, state.value);

            if (state.event.viewLocation?.view) {
                const documentUri = state.event.viewLocation?.documentUri?.toLowerCase();
                commands.executeCommand('setContext', 'showGoToSource', documentUri?.endsWith('.xml') || documentUri?.endsWith('.ts') || documentUri?.endsWith('.dbs') || documentUri?.endsWith('.json'));
            }
        });
        window.onDidChangeActiveColorTheme((theme) => {
            messenger.sendNotification(themeChanged, { type: 'webview', webviewType: VisualizerWebview.viewType }, theme.kind);
        });
        StateMachineAI.service().onTransition((state) => {
            messenger.sendNotification(aiStateChanged, { type: 'webview', webviewType: AiPanelWebview.viewType }, state.value);
        });
    }

    static getMessenger(projectUri: string): Messenger | undefined {
        return this._messengers.get(projectUri);
    }
}

async function getContext(projectUri: string): Promise<VisualizerLocation> {
    const context = getStateMachine(projectUri).context();
    return new Promise((resolve) => {
        resolve({
            documentUri: context.documentUri,
            view: context.view,
            identifier: context.identifier,
            projectUri: projectUri,
            platform,
            pathSeparator: path.sep,
            projectOpened: context.projectOpened,
            customProps: context.customProps,
            stNode: context.stNode,
            diagnostics: context.diagnostics,
            dataMapperProps: context.dataMapperProps,
            errors: context.errors,
            isLoading: context.isLoading,
            isLegacyRuntime: context.isLegacyRuntime,
            env: {
                MI_AUTH_ORG: process.env.MI_AUTH_ORG || '',
                MI_AUTH_CLIENT_ID: process.env.MI_AUTH_CLIENT_ID || '',
                MI_AUTH_REDIRECT_URL: process.env.MI_AUTH_REDIRECT_URL || '',
                COPILOT_ROOT_URL: process.env.COPILOT_ROOT_URL || '',
                DEVANT_TOKEN_EXCHANGE_URL: process.env.DEVANT_TOKEN_EXCHANGE_URL || '',
                MI_COPILOT_TOKEN_EXCHANGE_URL: process.env.MI_COPILOT_TOKEN_EXCHANGE_URL || '',
                MI_UPDATE_VERSION_CHECK_URL: process.env.MI_UPDATE_VERSION_CHECK_URL || '',
                MI_SAMPLE_ICONS_GITHUB_URL: process.env.MI_SAMPLE_ICONS_GITHUB_URL || '',
                MI_CONNECTOR_STORE: process.env.MI_CONNECTOR_STORE || '',
                MI_CONNECTOR_STORE_BACKEND: process.env.MI_CONNECTOR_STORE_BACKEND || '',
                MI_CONNECTOR_STORE_BACKEND_SEARCH: process.env.MI_CONNECTOR_STORE_BACKEND_SEARCH || '',
                MI_CONNECTOR_STORE_BACKEND_INBOUND_ENDPOINTS: process.env.MI_CONNECTOR_STORE_BACKEND_INBOUND_ENDPOINTS || '',
                MI_CONNECTOR_STORE_BACKEND_GETBYVERSION: process.env.MI_CONNECTOR_STORE_BACKEND_GETBYVERSION || '',
                ADOPTIUM_API_BASE_URL: process.env.ADOPTIUM_API_BASE_URL || ''
            },
        });
    });
}

async function getAIContext(): Promise<AIVisualizerLocation> {
    const context = StateMachineAI.context();
    return new Promise((resolve) => {
        resolve({ 
            initialPrompt: extension.initialPrompt, 
            state: StateMachineAI.state(), 
            loginMethod: context.loginMethod,
            userToken: context.userToken,
            usage: context.usage,
            errorMessage: context.errorMessage
        });
    });
}

async function getFormContext(projectUri: string): Promise<PopupVisualizerLocation> {
    const context = getPopupStateMachine(projectUri).context();
    return new Promise((resolve) => {
        resolve({
            projectUri: projectUri,
            documentUri: context.documentUri,
            view: context.view,
            recentIdentifier: context.recentIdentifier,
            customProps: context.customProps,
            platform,
            pathSeparator: path.sep
        });
    });
}

function isWebviewPanel(webview: WebviewPanel | WebviewView): boolean {
    return webview.viewType === VisualizerWebview.viewType;
}

function getPlatform() {
    if (os.platform() === 'linux' || env.remoteName === 'wsl') {
        return Platform.LINUX;
    }
    if (os.platform()?.startsWith('win')) {
        return Platform.WINDOWS;
    }
    if (os.platform() === 'darwin') {
        return Platform.MAC;
    }
}
