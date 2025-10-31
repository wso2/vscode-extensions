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
import { ViewType } from "@wso2/wi-core";
import type { WelcomeWebviewProps } from "@wso2/wi-core";
import { ExtensionAPIs } from "./extensionAPIs";
import { ext } from "./extensionVariables";
import { Uri } from "vscode";
import path from "path";
import { Messenger } from "vscode-messenger";
import { registerMainRpcHandlers } from "./rpc-managers/main/rpc-handler";

/**
 * Webview manager for WSO2 Integrator
 */
export class WebviewManager {
	private currentPanel: vscode.WebviewPanel | undefined;

	constructor(private extensionAPIs: ExtensionAPIs) { }

	/**
	 * Show welcome webview
	 */
	public showWelcome(): void {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it
		if (this.currentPanel) {
			this.currentPanel.reveal(columnToShowIn);
			return;
		}

		// Create new panel
		this.currentPanel = vscode.window.createWebviewPanel(
			"wso2IntegratorWelcome",
			"WSO2 Integrator - Welcome",
			columnToShowIn || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.joinPath(ext.context.extensionUri, "dist"),
					vscode.Uri.joinPath(ext.context.extensionUri, "resources"),
				],
			},
		);

		// Set the webview's html content
		this.currentPanel.webview.html = this.getWebviewContent(this.currentPanel.webview);

		// Handle panel disposal
		this.currentPanel.onDidDispose(
			() => {
				this.currentPanel = undefined;
			},
			null,
			ext.context.subscriptions,
		);

		// Handle messages from the webview
		const messenger = new Messenger();
		messenger.registerWebviewPanel(this.currentPanel);
		registerMainRpcHandlers(messenger);

		// Send initial data
		this.sendWelcomeData();
	}

	/**
	 * Get webview HTML content
	 */
	private getWebviewContent(webview: vscode.Webview): string {
		const isDevMode = process.env.WEB_VIEW_DEV_MODE === "true";

		const componentName = "main";
		const filePath = path.join(ext.context.extensionPath, 'resources', 'jslibs', componentName + '.js');
		const scriptUri = isDevMode
			? new URL('lib/' + componentName + '.js', process.env.WEB_VIEW_DEV_HOST).toString()
			: webview.asWebviewUri(Uri.file(filePath)).toString();

		// CSP: allow dev server in dev mode
		const cspSource = isDevMode
			? `${webview.cspSource} http://localhost:* ws://localhost:*`
			: webview.cspSource;

		const styles = `
            .container {
                background-color: var(--vscode-editor-background);
                height: 100vh;
                width: 100%;
                margin: 0;
                padding: 0;
                overflow: hidden;
            }
            .loader-wrapper {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                height: 100%;
                width: 100%;
                padding-top: 30vh;
            }
            .loader {
                width: 32px;
                aspect-ratio: 1;
                border-radius: 50%;
                border: 4px solid var(--vscode-button-background);
                animation:
                    l20-1 0.8s infinite linear alternate,
                    l20-2 1.6s infinite linear;
            }
            @keyframes l20-1{
                0%    {clip-path: polygon(50% 50%,0       0,  50%   0%,  50%    0%, 50%    0%, 50%    0%, 50%    0% )}
                12.5% {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100%   0%, 100%   0%, 100%   0% )}
                25%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 100% 100%, 100% 100% )}
                50%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
                62.5% {clip-path: polygon(50% 50%,100%    0, 100%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
                75%   {clip-path: polygon(50% 50%,100% 100%, 100% 100%,  100% 100%, 100% 100%, 50%  100%, 0%   100% )}
                100%  {clip-path: polygon(50% 50%,50%  100%,  50% 100%,   50% 100%,  50% 100%, 50%  100%, 0%   100% )}
            }
            @keyframes l20-2{ 
                0%    {transform:scaleY(1)  rotate(0deg)}
                49.99%{transform:scaleY(1)  rotate(135deg)}
                50%   {transform:scaleY(-1) rotate(0deg)}
                100%  {transform:scaleY(-1) rotate(-135deg)}
            }
            .welcome-content {
                text-align: center;
                max-width: 500px;
                padding: 2rem;
                animation: fadeIn 1s ease-in-out;
                font-family: var(--vscode-font-family);
            }
            .logo-container {
                margin-bottom: 2rem;
                display: flex;
                justify-content: center;
            }
            .welcome-title {
                color: var(--vscode-foreground);
                margin: 0 0 0.5rem 0;
                letter-spacing: -0.02em;
                font-size: 1.5em;
                font-weight: 400;
                line-height: normal;
            }
            .welcome-subtitle {
                color: var(--vscode-descriptionForeground);
                font-size: 13px;
                margin: 0 0 2rem 0;
                opacity: 0.8;
            }
            .loading-text {
                color: var(--vscode-foreground);
                font-size: 13px;
                font-weight: 500;
            }
            .loading-dots::after {
                content: '';
                animation: dots 1.5s infinite;
            }
            @keyframes fadeIn {
                0% { 
                    opacity: 0;
                }
                100% { 
                    opacity: 1;
                }
            }
            @keyframes dots {
                0%, 20% { content: ''; }
                40% { content: '.'; }
                60% { content: '..'; }
                80%, 100% { content: '...'; }
            }
        `;

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>WSO2 Integrator</title>
				<style>${styles}</style>
			</head>
			<body>
				<div id="root">
					<div class="loader-wrapper">
						<div class="welcome-content">
							<div class="logo-container">
								<div class="loader"></div>
							</div>
						</div>
					</div>
				</div>
				<script src="${scriptUri}"></script>
				<script>
					function render() {
						visualizerWebview.renderWebview(
							document.getElementById("root")
						);
					}
					render();
				</script>
			</body>
			</html>`;
	}

	/**
	 * Send welcome data to webview
	 */
	private sendWelcomeData(): void {
		if (!this.currentPanel) {
			return;
		}

		const props: WelcomeWebviewProps = {
			type: ViewType.WELCOME,
			biAvailable: this.extensionAPIs.isBIAvailable(),
			miAvailable: this.extensionAPIs.isMIAvailable(),
		};

		this.currentPanel.webview.postMessage({
			command: "initialize",
			data: props,
		});
	}

	/**
	 * Handle messages from webview
	 */
	private handleWebviewMessage(message: { command: string; data?: unknown }): void {
		switch (message.command) {
			case "openBI":
				vscode.commands.executeCommand("wso2.integrator.openBIIntegration");
				break;
			case "openMI":
				vscode.commands.executeCommand("wso2.integrator.openMIIntegration");
				break;
			case "refresh":
				this.sendWelcomeData();
				break;
			default:
				ext.log(`Unknown webview command: ${message.command}`);
		}
	}

	/**
	 * Dispose webview
	 */
	public dispose(): void {
		if (this.currentPanel) {
			this.currentPanel.dispose();
			this.currentPanel = undefined;
		}
	}
}
