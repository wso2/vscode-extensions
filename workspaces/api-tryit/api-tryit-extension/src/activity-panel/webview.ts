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
import * as path from 'path';
import type { ApiRequestItem, ApiRequest } from '@wso2/api-tryit-core';
import { getComposerJSFiles } from '../util';
import { ApiExplorerProvider } from '../tree-view/ApiExplorerProvider';
import { ApiTryItStateMachine, EVENT_TYPE } from '../stateMachine';
import { TryItPanel } from '../webview-panel/TryItPanel';

export class ActivityPanel implements vscode.WebviewViewProvider {
	public static readonly viewType = 'api-tryit.activity.panel';
	public static currentPanel: ActivityPanel | undefined;
	private _view?: vscode.WebviewView;
	private _sendCollectionsTimeoutId: ReturnType<typeof setTimeout> | undefined;
	private _lastSentCollectionsHash: string | undefined;
	private _listenersInitialized = false;
	private _webviewReady = false;
	private _pendingMessages: Array<{ type: string; data?: unknown }> = [];

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _apiExplorerProvider?: ApiExplorerProvider
	) { }

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext<unknown>,
		_token: vscode.CancellationToken
	): void | Promise<void> {
		this._view = webviewView;
		ActivityPanel.currentPanel = this;
		const isDevMode = process.env.WEB_VIEW_WATCH_MODE === 'true';
		const devHost = process.env.WEB_VIEW_DEV_HOST || 'http://localhost:8080';

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: isDevMode
				? [
					this._extensionContext.extensionUri,
					vscode.Uri.parse(devHost)
				]
				: [
					this._extensionContext.extensionUri
				]
		};

		webviewView.webview.html = this._getWebviewContent(webviewView.webview);

		// Handle messages from webview
		webviewView.webview.onDidReceiveMessage((message: Record<string, unknown>) => {
			switch (message.command) {
				case 'newRequest':
					vscode.commands.executeCommand('api-tryit.newRequest');
					break;
				case 'search':
					if (this._apiExplorerProvider) {
						this._apiExplorerProvider.setSearchFilter(message.value as string);
					}
					break;
				case 'clearSearch':
					if (this._apiExplorerProvider) {
						this._apiExplorerProvider.setSearchFilter('');
					}
					break;
				case 'openRequest':
					// Handle opening a request with state machine
					this._handleOpenRequest(message.request as Record<string, unknown>);
					break;
				case 'selectItem':
					// Handle item selection
					break;
				case 'getCollections':
					// Send collections to webview
					this._sendCollections(true);
					break;
				case 'webviewReady':
					// Webview is ready, send initial data
					this._webviewReady = true;
					this._sendCollections(true);
					// flush pending messages
					while (this._pendingMessages.length > 0 && this._view) {
						const msg = this._pendingMessages.shift();
						if (msg) {
							this._view.webview.postMessage({ type: msg.type, data: msg.data });
						}
					}
					break;
				case 'addRequestToCollection':
					// Handle adding a request to a collection
					this._handleAddRequestToCollection(message.collectionId as string);
					break;
			}
		});

		// Only register listeners once to prevent duplicates
		if (!this._listenersInitialized) {
			this._listenersInitialized = true;

			// Refresh webview when provider data changes
			if (this._apiExplorerProvider) {
				this._apiExplorerProvider.onDidChangeTreeData(() => {
					this._debouncedSendCollections();
				});
			}

			// Handle webview visibility changes
			webviewView.onDidChangeVisibility(() => {
				if (webviewView.visible) {
					// Refresh collections when webview becomes visible
					this._debouncedSendCollections();
				}
			});
		}

		// Send initial collections data immediately (no debounce)
		this._sendCollections(true);
	}

	public static postMessage(type: string, data?: unknown) {
		if (ActivityPanel.currentPanel && ActivityPanel.currentPanel._view && ActivityPanel.currentPanel._webviewReady) {
			ActivityPanel.currentPanel._view.webview.postMessage({ type, data });
		} else if (ActivityPanel.currentPanel) {
			ActivityPanel.currentPanel._pendingMessages.push({ type, data });
		}
	}

	private _debouncedSendCollections() {
		// Clear any pending timeout
		if (this._sendCollectionsTimeoutId) {
			clearTimeout(this._sendCollectionsTimeoutId);
		}

		// Set a new timeout to debounce rapid calls (300ms)
		this._sendCollectionsTimeoutId = setTimeout(() => {
			this._sendCollections(false);
		}, 300);
	}

	private async _sendCollections(skipHashCheck: boolean = false) {
		if (this._view && this._apiExplorerProvider) {
			const collections = await this._apiExplorerProvider.getCollections();
			
			// Create a hash of the collections to avoid sending identical data
			const collectionsHash = JSON.stringify(collections);
			
			// Only send if collections have changed (skip hash check for initial sends)
			if (skipHashCheck || collectionsHash !== this._lastSentCollectionsHash) {
				this._lastSentCollectionsHash = collectionsHash;
				this._view.webview.postMessage({
					command: 'updateCollections',
					collections
				});
			}
		}
	}

	private async _handleOpenRequest(requestData: Record<string, unknown>) {
		try {
			const requestId = requestData.id as string;

			if (!requestId) {
				vscode.window.showErrorMessage('Invalid request ID');
				return;
			}

			if (this._apiExplorerProvider) {
				const allCollections = await this._apiExplorerProvider.getCollections();
				const requestItem = this._findRequestItem(allCollections, requestId);

				if (!requestItem) {
					vscode.window.showErrorMessage('Request not found');
					return;
				}

				// Show the TryIt panel
				TryItPanel.show(this._extensionContext);

				// Safely extract properties from the requestItem
				const itemId = (requestItem.id as string) || '';
				const itemName = (requestItem.name as string) || '';
				const itemRequest = (requestItem.request as unknown) || null;

				// Build a proper ApiRequest object
				const apiRequest: ApiRequest = itemRequest && typeof itemRequest === 'object'
					? (itemRequest as ApiRequest)
					: {
						id: itemId,
						name: itemName,
						method: 'GET',
						url: '',
						queryParameters: [],
						headers: []
					};

				// Create a properly typed ApiRequestItem object
				const apiRequestItem: ApiRequestItem = {
					id: itemId,
					name: itemName,
					request: apiRequest,
					filePath: (requestItem.filePath as string) || ''
				};

				// Send event to state machine to load the request
				ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, apiRequestItem, '');
				
				// Also send the request directly to the TryIt webview
				TryItPanel.sendRequestToWebview(apiRequestItem);
				
				vscode.window.showInformationMessage(`Opening: ${apiRequestItem.request.method} ${apiRequestItem.name}`);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open request: ${error}`);
		}
	}

	private async _handleAddRequestToCollection(collectionId: string) {
		try {
			if (!this._apiExplorerProvider) {
				vscode.window.showErrorMessage('API Explorer provider not available');
				return;
			}

			// Get all collections to find the one with matching ID
			const allCollections = await this._apiExplorerProvider.getCollections();
			const collection = this._findCollectionById(allCollections, collectionId);

			if (!collection) {
				vscode.window.showErrorMessage('Collection not found');
				return;
			}

			// Show TryIt panel
			TryItPanel.show(this._extensionContext);

			// Wait a moment to ensure the panel is ready
			await new Promise(resolve => setTimeout(resolve, 300));

			// Construct the full collection directory path
			const config = vscode.workspace.getConfiguration('api-tryit');
			const configuredPath = config.get<string>('collectionsPath');
			const storagePath = configuredPath || 
				(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');

			if (!storagePath) {
				vscode.window.showErrorMessage('No workspace path available');
				return;
			}

			const collectionPath = path.join(storagePath, collectionId);

			// Send event to state machine to create a new request in this collection
			ApiTryItStateMachine.sendEvent(EVENT_TYPE.ADD_REQUEST_TO_COLLECTION, undefined, collectionPath);

			const collectionName = typeof collection === 'object' && collection !== null && 'name' in collection 
				? (collection as Record<string, unknown>).name 
				: 'Unknown';
			vscode.window.showInformationMessage(`Add request to "${collectionName}" collection`);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to add request: ${error}`);
		}
	}

	private _findCollectionById(items: unknown[], collectionId: string): unknown {
		for (const item of items) {
			const typedItem = item as Record<string, unknown>;
			if (typedItem.id === collectionId) {
				return typedItem;
			}
			if (Array.isArray(typedItem.children)) {
				const found = this._findCollectionById(typedItem.children as unknown[], collectionId);
				if (found) return found;
			}
		}
		return undefined;
	}

	private _findRequestItem(collections: unknown[], requestId: string): Record<string, unknown> | undefined {
		for (const collectionUnknown of collections) {
			const collection = collectionUnknown as Record<string, unknown>;
			if (collection.id === requestId) {
				return collection;
			}

			const children = collection.children as unknown[];
			if (children && Array.isArray(children)) {
				for (const folderUnknown of children) {
					const folder = folderUnknown as Record<string, unknown>;
					if (folder.id === requestId) {
						return folder;
					}

					const folderChildren = folder.children as unknown[];
					if (folderChildren && Array.isArray(folderChildren)) {
						for (const requestUnknown of folderChildren) {
							const request = requestUnknown as Record<string, unknown>;
							if (request.id === requestId) {
								return request;
							}
						}
					}
				}
			}
		}
		return undefined;
	}

    private _getWebviewContent(webview: vscode.Webview) {
        const scriptUris = getComposerJSFiles(this._extensionContext, 'ApiTryItVisualizer', webview);

        return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <title>WSO2 API TryIt</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: var(--vscode-font-family);
              color: var(--vscode-foreground);
              background-color: var(--vscode-sideBar-background);
            }
            #root {
              display: flex;
              height: 100vh;
              width: 100%;
            }
          </style>
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root">
                Loading ....
            </div>
            ${scriptUris.map(jsFile => `<script charset="UTF-8" src="${jsFile}"></script>`).join('\n')}
            <script>
                // Function to initialize the React app
                function initializeApp() {
                    console.log('API TryIt: Initializing app...');
                    if (typeof apiTryItVisualizerWebview !== 'undefined' && apiTryItVisualizerWebview.renderActivityPanel) {
                        console.log('API TryIt: renderActivityPanel function found, rendering...');
                        const rootElement = document.getElementById("root");
                        if (rootElement) {
                            apiTryItVisualizerWebview.renderActivityPanel(rootElement);
                        }
                    } else {
                        console.error('API TryIt: renderActivityPanel function not found, retrying...');
                        setTimeout(initializeApp, 100);
                    }
                }

                window.addEventListener('DOMContentLoaded', function() {
                    console.log('API TryIt: DOMContentLoaded');
                    initializeApp();
                });

                // Also try to initialize on load in case DOMContentLoaded doesn't fire
                window.addEventListener('load', function() {
                    console.log('API TryIt: window load event');
                    setTimeout(() => {
                        const rootElement = document.getElementById("root");
                        if (rootElement && (rootElement.innerHTML === 'Loading ....' || rootElement.innerHTML === '')) {
                            console.log('API TryIt: Retrying initialization on load');
                            initializeApp();
                        }
                    }, 200);
                });

                // Listen for VS Code webview ready event
                window.addEventListener('message', function(event) {
                    if (event.data && event.data.type === 'vscode-webview-ready') {
                        console.log('API TryIt: VS Code webview ready');
                        initializeApp();
                    }
                });
            </script>
        </body>
        </html>
      `;
    }
}
