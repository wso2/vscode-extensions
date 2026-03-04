/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import { getComposerJSFiles } from '../util';
import { ApiTryItStateMachine, EVENT_TYPE } from '../stateMachine';
import { ApiRequestItem, HttpResponseResult } from '@wso2/api-tryit-core';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Buffer } from 'buffer';
import { Messenger } from 'vscode-messenger';
import { registerApiTryItRpcHandlers, ApiTryItRpcManager } from '../rpc-managers';
import { ApiExplorerProvider } from '../tree-view/ApiExplorerProvider';
import { ActivityPanel } from '../activity-panel/webview';
import { parseHurlDocument, parseHurlCollection } from '@wso2/api-tryit-hurl-parser';

export class TryItPanel {
	public static currentPanel: TryItPanel | undefined;
	private static _explorerProvider: ApiExplorerProvider | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];
	private static _messenger: Messenger = new Messenger();
	private _webviewReady = false;
	private _pendingMessages: Array<{ type: string; data?: unknown }> = [];

	private constructor(panel: vscode.WebviewPanel, extensionContext: vscode.ExtensionContext) {
		this._panel = panel;

		// Register messenger with webview panel
		TryItPanel._messenger.registerWebviewPanel(this._panel);

		this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionContext);

		// Register webview with state machine
		ApiTryItStateMachine.registerWebview(this._panel);

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Set up message handling from webview
		this._panel.webview.onDidReceiveMessage(
			async message => {
				const messageType = message.type || message.command;
				
				// Handle webviewReady to flush pending messages
				if (message.type === 'webviewReady') {

					this._webviewReady = true;
					// Flush pending messages
					while (this._pendingMessages.length > 0) {
						const msg = this._pendingMessages.shift();
						if (msg) {
							this._panel.webview.postMessage({ type: msg.type, data: msg.data });
						}
					}
					return;
				}
				// Handle folder selection for collection creation
				if (message.type === 'selectCollectionFolder') {
					try {
						const folderUris = await vscode.window.showOpenDialog({
							canSelectFolders: true,
							canSelectFiles: false,
							canSelectMany: false,
							openLabel: 'Select Collection Folder'
						});
						if (folderUris && folderUris.length > 0) {
							const selectedPath = folderUris[0].fsPath;
							this._panel.webview.postMessage({ 
								type: 'collectionFolderSelected', 
								data: { path: selectedPath } 
							});
						}
					} catch (error: unknown) {
						vscode.window.showErrorMessage(`Error selecting folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
					}
					return;
				}
				if (message.type === 'createCollectionSubmit') {
					try {
						const { name, folderPath } = message.data || {};
												
						if (!name || !name.trim()) {
							this._panel.webview.postMessage({ type: 'createCollectionResult', data: { success: false, message: 'Collection name is required' } });
							return;
						}

						if (!folderPath) {
							this._panel.webview.postMessage({ type: 'createCollectionResult', data: { success: false, message: 'Folder path is required' } });
							return;
						}
						
						const safeName = name.trim();
						const safeId = safeName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

						// Create a single collection .hurl file with @collectionName metadata.
						const collectionFilePath = path.join(folderPath, `${safeId || `collection-${Date.now()}`}.hurl`);
						const collectionFileUri = vscode.Uri.file(collectionFilePath);
						try {
							await vscode.workspace.fs.stat(collectionFileUri);
							this._panel.webview.postMessage({ type: 'createCollectionResult', data: { success: false, message: 'Collection file already exists' } });
							return;
						} catch {
							// expected: file does not exist
						}

						const hurlContent = `# @collectionName ${safeName}\n`;
					await vscode.workspace.fs.writeFile(collectionFileUri, new Uint8Array(Buffer.from(hurlContent, 'utf8')));
						// Check if the collection is in the current workspace
						const isInWorkspace = vscode.workspace.workspaceFolders?.some(folder => 
							collectionFilePath.startsWith(folder.uri.fsPath)
						) || false;
						
						if (!isInWorkspace) {
							const openInNewWindow = await vscode.window.showInformationMessage(
								`Collection "${safeName}" created outside the workspace. Would you like to open it?`,
								'Open in New Window',
								'Add to Workspace',
								'Cancel'
							);
							
							if (openInNewWindow === 'Open in New Window') {
								await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(folderPath), true);
							} else if (openInNewWindow === 'Add to Workspace') {
								vscode.workspace.updateWorkspaceFolders(
									vscode.workspace.workspaceFolders?.length || 0,
									0,
									{ uri: vscode.Uri.file(folderPath), name: path.basename(folderPath) }
								);
							}
						} else {
							vscode.window.showInformationMessage(`Collection "${safeName}" created successfully`);
						}
						
						this._panel.webview.postMessage({ type: 'createCollectionResult', data: { success: true, message: `Collection created: ${safeName}` } });

				// Add a slight delay to ensure file system operations complete, then refresh explorer
				setTimeout(() => {
					vscode.commands.executeCommand('api-tryit.refreshExplorer').then(undefined, (error: unknown) => {
						const msg = error instanceof Error ? error.message : 'Unknown error';
						vscode.window.showErrorMessage(`Failed to refresh explorer: ${msg}`);
					});
				}, 500);

				// Close the webview after a short delay so the webview can receive the success message
				setTimeout(() => {
					try {
						this._panel.dispose();
					} catch (err) {
						const msg = err instanceof Error ? err.message : String(err);
                        vscode.window.showErrorMessage(`Failed to close TryIt webview: ${msg}`);
					}
				}, 700);
					} catch (error: unknown) {
						const msg = error instanceof Error ? error.message : 'Unknown error';
						this._panel.webview.postMessage({ type: 'createCollectionResult', data: { success: false, message: msg } });
						vscode.window.showErrorMessage(`Failed to create collection: ${msg}`);
					}
					return;
				}
				switch (messageType) {
					case 'openFromCurl':
						// Handle curl to ApiRequestItem conversion
						try {
							const { curl } = message.data || {};
							if (!curl) {
								vscode.window.showErrorMessage('No curl command provided');
								break;
							}
							// Execute the openFromCurl command with the curl string
							vscode.commands.executeCommand('api-tryit.openFromCurl', curl);
						} catch (error: unknown) {
							const errorMsg = error instanceof Error ? error.message : 'Unknown error';
							vscode.window.showErrorMessage(`Failed to process curl command: ${errorMsg}`);
						}
						break;
					case 'openFromHurl':
						// Handle Hurl content -> ApiRequestItem conversion
						try {
							const { hurl } = message.data || {};
							if (!hurl) {
								vscode.window.showErrorMessage('No Hurl content provided');
								break;
							}
							vscode.commands.executeCommand('api-tryit.openFromHurl', hurl);
						} catch (error: unknown) {
							const errorMsg = error instanceof Error ? error.message : 'Unknown error';
							vscode.window.showErrorMessage(`Failed to process Hurl content: ${errorMsg}`);
						}
						break;
					case 'openFromHurlCollection':
						// Handle Hurl collection payload -> create .hurl collection in workspace
						try {
							const payload = message.data?.hurlCollection ?? message.data?.collection ?? message.data?.payload;
							if (!payload) {
								vscode.window.showErrorMessage('No Hurl collection payload provided');
								break;
							}
							// Pass optional folder name argument through to the command if provided in the message
						const folderName = message.data?.folderName ?? message.data?.folder ?? undefined;
						vscode.commands.executeCommand('api-tryit.openFromHurlCollection', typeof payload === 'string' ? payload : JSON.stringify(payload), folderName);
						} catch (error: unknown) {
							const errorMsg = error instanceof Error ? error.message : 'Unknown error';
							vscode.window.showErrorMessage(`Failed to import Hurl collection: ${errorMsg}`);
						}
						break;
				case 'sendHttpRequest':
						// Handle HTTP request sent from webview
						try {
							const { requestId, data } = message;
							const { method, url, params, headers, data: body } = data || {};
							
							// Delegate to RPC manager to handle the HTTP request
							const rpcManager = new ApiTryItRpcManager();
							rpcManager.sendHttpRequest({ method, url, params, headers, data: body }).then(
							(result: HttpResponseResult) => {
									this._panel.webview.postMessage({
										type: 'httpRequestResponse',
										requestId,
										data: result
									});
								},
								(error: unknown) => {
									const errorMsg = error instanceof Error ? error.message : 'Unknown error';
									this._panel.webview.postMessage({
										type: 'httpRequestResponse',
										requestId,
										data: {
											statusCode: 0,
											headers: [],
											body: JSON.stringify({ error: errorMsg }),
											error: errorMsg
										}
									});
								}
							);
						} catch (error: unknown) {
							const errorMsg = error instanceof Error ? error.message : 'Unknown error';
							vscode.window.showErrorMessage(`Failed to send HTTP request: ${errorMsg}`);
						}
						break;
					case 'webviewReady':
						ApiTryItStateMachine.sendEvent(EVENT_TYPE.WEBVIEW_READY);
						break;
					case 'requestUpdated':
						ApiTryItStateMachine.sendEvent(EVENT_TYPE.REQUEST_UPDATED, message.data);
						break;
					case 'saveRequest':
						// Handle save request using the RPC manager
						try {
							const { filePath, request, response } = message.data;

							// Get the current state to check for persisted file path or collection path
							const stateContext = ApiTryItStateMachine.getContext();
							const selectedTreeItemId = stateContext.selectedItem?.id;
							// Track whether the user explicitly picked a file during this save
							let userSelectedFile = false;
							// Prefer explicit filePath from the message, then the request's filePath (if present)
							let targetFilePath = filePath || (request && (request.filePath as string | undefined));

							// Fallback: check savedItems cache (preserved by state machine) for filePath if missing
							try {
								const cacheKey = selectedTreeItemId || (request && (request.id as string | undefined));
								if (!targetFilePath && cacheKey && stateContext.savedItems instanceof Map) {
									const cached = stateContext.savedItems.get(cacheKey);
									if (cached && cached.filePath) {
										try {
											// Verify the cached path still exists on disk before re-using it
											await vscode.workspace.fs.stat(vscode.Uri.file(cached.filePath));
											targetFilePath = cached.filePath;
										} catch {
											// Cached path no longer exists — ignore
											console.log(`Cached savedItem path no longer exists: ${cached.filePath}`);
										}
									}
								}
							} catch {
								// ignore
							}

							// Fallback to state machine selected file path for existing requests
							// But first verify the path still exists (not deleted)
							if (!targetFilePath && stateContext.selectedFilePath) {
								try {
									await vscode.workspace.fs.stat(vscode.Uri.file(stateContext.selectedFilePath));
									targetFilePath = stateContext.selectedFilePath;
								} catch {
									// File path no longer exists, clear it so we don't use it
									console.log(`Selected file path no longer exists: ${stateContext.selectedFilePath}`);
								}
							}

							if (!targetFilePath && stateContext.currentCollectionPath) {
								// Verify the collection target still exists before using it.
								// It can be either a collection .hurl file (new flow) or a directory (legacy flow).
								try {
									const stat = await vscode.workspace.fs.stat(vscode.Uri.file(stateContext.currentCollectionPath));
									if ((stat.type & vscode.FileType.File) === vscode.FileType.File && stateContext.currentCollectionPath.toLowerCase().endsWith('.hurl')) {
										targetFilePath = stateContext.currentCollectionPath;
									} else {
										const baseName = (request.name || 'api-request').toLowerCase().replace(/[^a-z0-9-]/g, '-');
										let candidatePath = path.join(stateContext.currentCollectionPath, `${baseName}.hurl`);
										let counter = 1;
										while (true) {
											try {
												await vscode.workspace.fs.stat(vscode.Uri.file(candidatePath));
												candidatePath = path.join(stateContext.currentCollectionPath, `${baseName}-${counter}.hurl`);
												counter++;
											} catch {
												// Not found, candidatePath is available
												break;
											}
										}
										targetFilePath = candidatePath;
									}
								} catch {
									// Collection target no longer exists, skip auto-select and fall through to prompt
									console.log(`Collection path no longer exists: ${stateContext.currentCollectionPath}`);
								}
							}

							// If still no file path, prompt user to select a file directly.
							// Do not auto-create folders/collections during save.
							if (!targetFilePath) {
								// Suggest a file name based on the request name
								const suggestedFileName = ((request && request.name) ? request.name : 'api-request').toLowerCase().replace(/[^a-z0-9-]/g, '-') + '.hurl';
								let defaultFolderUri = vscode.workspace.workspaceFolders?.[0]?.uri;
								if (stateContext.currentCollectionPath) {
									try {
										await vscode.workspace.fs.stat(vscode.Uri.file(stateContext.currentCollectionPath));
										defaultFolderUri = vscode.Uri.file(stateContext.currentCollectionPath);
									} catch {
										// ignore invalid/removed collection path and fall back to workspace root
									}
								}

								const fileUri = await vscode.window.showSaveDialog({
									defaultUri: defaultFolderUri ? vscode.Uri.joinPath(defaultFolderUri, suggestedFileName) : undefined,
									filters: {
										'Hurl files': ['hurl'],
										'YAML files': ['yaml', 'yml']
									},
									saveLabel: 'Save API Request'
								});

								if (!fileUri) {
									// User cancelled file save
									this._panel.webview.postMessage({
										type: 'saveRequestResponse',
										data: { success: false, message: 'Save cancelled by user' }
									});
									break;
								}

								userSelectedFile = true;
								targetFilePath = fileUri.fsPath;
							}

							// If the request already has an associated file, prefer to reuse it only when the user did not explicitly choose a file
							const existingFilePath = request && (request.filePath as string | undefined);
							if (existingFilePath && !userSelectedFile) {
								try {
									await vscode.workspace.fs.stat(vscode.Uri.file(existingFilePath));
									targetFilePath = existingFilePath;
								} catch {
									// existing file path no longer exists — ignore
								}
							}

							const selectedHasBackingFile = Boolean(stateContext.selectedFilePath || existingFilePath);
							const appendIfNotFound = Boolean(
								!selectedHasBackingFile &&
								stateContext.currentCollectionPath &&
								targetFilePath &&
								stateContext.currentCollectionPath === targetFilePath &&
								stateContext.currentCollectionPath.toLowerCase().endsWith('.hurl')
							);

			// Ensure the directory exists before saving
							if (targetFilePath) {
								const dirPath = path.dirname(targetFilePath);
								try {
									await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
								} catch {
									// Directory might already exist, ignore error
								}
							}

							// Import the RPC manager here to avoid circular dependencies
							const { ApiTryItRpcManager } = await import('../rpc-managers/rpc-manager');
							const rpcManager = new ApiTryItRpcManager();
								const saveResponse = await rpcManager.saveRequest({ 
									filePath: targetFilePath, 
									request,
									response,
									appendIfNotFound,
									selectedRequestTreeId: selectedTreeItemId
								});

							// Send response back to webview
							this._panel.webview.postMessage({
								type: 'saveRequestResponse',
								data: saveResponse
							});

								if (saveResponse.success) {
									vscode.window.showInformationMessage(`Request saved successfully to: ${targetFilePath}`);
									
									// Inform state machine about the saved request so it can update caches and notify webviews
									try {
										const savedItem: ApiRequestItem = {
											id: selectedTreeItemId || request.id,
											name: request.name,
											request,
											response,
											filePath: targetFilePath
										};
									ApiTryItStateMachine.sendEvent(EVENT_TYPE.REQUEST_UPDATED, savedItem);
								} catch {
									vscode.window.showErrorMessage('Failed to notify state machine about saved request');
								}
								
								// Refresh explorer and select the saved request
								setTimeout(async () => {
									try {
										await vscode.commands.executeCommand('api-tryit.refreshExplorer');
										// Give the explorer time to load, then select the saved request in the tree
										setTimeout(async () => {
												await vscode.commands.executeCommand(
													'api-tryit.selectItemByPath',
													targetFilePath,
													selectedTreeItemId || request.id,
													request.name,
													request.method,
													request.url
												);
										}, 300);
									} catch (error: unknown) {
										const msg = error instanceof Error ? error.message : 'Unknown error';
										vscode.window.showErrorMessage(`Failed to refresh explorer: ${msg}`);
									}
								}, 100);
							} else {
								vscode.window.showErrorMessage(`Failed to save request: ${saveResponse.message}`);
							}
						} catch (error: unknown) {
							this._panel.webview.postMessage({
								type: 'saveRequestResponse',
								data: { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
							});
							vscode.window.showErrorMessage(`Error saving request: ${error instanceof Error ? error.message : 'Unknown error'}`);
						}
						break;
					case 'selectFile':
						try {
							const { paramId } = message.data;
							const fileUris = await vscode.window.showOpenDialog({
								canSelectFiles: true,
								canSelectFolders: false,
								canSelectMany: false,
								openLabel: 'Select File'
							});
							if (fileUris && fileUris.length > 0) {
								const filePath = fileUris[0].fsPath;
								this._panel.webview.postMessage({
									type: 'fileSelected',
									data: { paramId, filePath }
								});
							}
						} catch (error: unknown) {
							vscode.window.showErrorMessage(`Error selecting file: ${error instanceof Error ? error.message : 'Unknown error'}`);
						}
						break;
					case 'navigateToRequest':
						try {
							const { filePath: navFilePath, requestName } = message.data || {};
							if (!navFilePath) { break; }

							// Prefer item from the already-indexed explorer (has stable tree ID)
							const explorerMatch = TryItPanel._explorerProvider?.findRequestByFilePath(navFilePath, undefined, requestName);
							if (explorerMatch) {
								const { collection, requestItem: matchedItem, treeItemId, parentIds } = explorerMatch;
								// Update state machine + send apiRequestItemSelected to TryIt webview
								ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, matchedItem, navFilePath);
								// Highlight item in the Activity Panel (Explorer sidebar)
								ActivityPanel.postMessage('selectItem', {
									id: treeItemId,
									parentIds,
									filePath: matchedItem.filePath,
									name: matchedItem.name,
									collectionId: collection.id,
									collectionName: collection.name,
									method: matchedItem.request.method,
									request: matchedItem.request
								});
								break;
							}

							// Fallback: parse file from disk when not yet indexed
							const content = await fs.readFile(navFilePath, 'utf-8');
							const parsedDocument = parseHurlDocument(content);
							let foundItem: ApiRequestItem | undefined;
							for (let index = 0; index < parsedDocument.blocks.length; index++) {
								const block = parsedDocument.blocks[index];
								let parsed;
								try {
									parsed = parseHurlCollection(block.text, { sourceFilePath: navFilePath });
								} catch {
									continue;
								}
								const item = parsed.rootItems?.[0];
								if (!item) { continue; }
								const itemName = item.request?.name || item.name || `Request ${index + 1}`;
								if (itemName === requestName) {
									foundItem = {
										...item,
										id: `${navFilePath}::${index}`,
										filePath: navFilePath,
										name: itemName
									};
									break;
								}
							}
							if (foundItem) {
								ApiTryItStateMachine.sendEvent(EVENT_TYPE.API_ITEM_SELECTED, foundItem, navFilePath);
							}
						} catch (error: unknown) {
							console.error('navigateToRequest error:', error instanceof Error ? error.message : error);
						}
						break;
				}
			},
			null,
			this._disposables
		);
	}

	public static init(apiExplorerProvider: ApiExplorerProvider) {
		TryItPanel._explorerProvider = apiExplorerProvider;
		// Register RPC handlers
		registerApiTryItRpcHandlers(TryItPanel._messenger, apiExplorerProvider);
	}

	public static show(extensionContext: vscode.ExtensionContext) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (TryItPanel.currentPanel) {
			TryItPanel.currentPanel._panel.reveal(column);
			return;
		}

		const isDevMode = process.env.WEB_VIEW_WATCH_MODE === 'true';
		const devHost = process.env.TRY_VIEW_DEV_HOST || 'http://localhost:9092';

		const panel = vscode.window.createWebviewPanel(
			'apiTryIt',
			'API TryIt',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: isDevMode
					? [extensionContext.extensionUri, vscode.Uri.parse(devHost)]
					: [extensionContext.extensionUri]
			}
		);

		TryItPanel.currentPanel = new TryItPanel(panel, extensionContext);
	}

	public static sendRequestToWebview(requestItem: unknown) {
		if (!TryItPanel.currentPanel) {
			return;
		}

		const panel = TryItPanel.currentPanel;
		if (panel._webviewReady) {
			panel._panel.webview.postMessage({
				type: 'apiRequestItemSelected',
				data: requestItem
			});
		} else {
			// Queue the message until the webview signals readiness
			panel._pendingMessages.push({ type: 'apiRequestItemSelected', data: requestItem });
		}
	}

	public static postMessage(type: string, data?: unknown) {
		if (TryItPanel.currentPanel) {
			const panel = TryItPanel.currentPanel;
			if (panel._webviewReady) {
				panel._panel.webview.postMessage({ type, data });
			} else {
				panel._pendingMessages.push({ type, data });
			}
		}
	}

	public dispose() {
		TryItPanel.currentPanel = undefined;

		// Unregister webview from state machine
		ApiTryItStateMachine.unregisterWebview();

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}

	private _getWebviewContent(webview: vscode.Webview, extensionContext: vscode.ExtensionContext) {
		const scriptUris = getComposerJSFiles(extensionContext, 'ApiTryItVisualizer', webview);

		return /*html*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <title>API TryIt</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              height: 100vh;
              overflow: hidden;
            }
            #root {
              height: 100%;
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
                window.addEventListener('DOMContentLoaded', function() {
                    console.log('DOM loaded, checking for apiTryItVisualizerWebview...');
                    console.log('window.apiTryItVisualizerWebview:', typeof window.apiTryItVisualizerWebview);
                    
                    if (typeof apiTryItVisualizerWebview !== 'undefined' && apiTryItVisualizerWebview.renderEditorPanel) {
                        console.log('Found apiTryItVisualizerWebview.renderEditorPanel, calling it...');
                        apiTryItVisualizerWebview.renderEditorPanel(document.getElementById("root"));
                    } else {
                        console.error('apiTryItVisualizerWebview not loaded or renderEditorPanel not available');
                        console.error('apiTryItVisualizerWebview:', apiTryItVisualizerWebview);
                        document.getElementById("root").innerHTML = 'Error: Failed to load API TryIt visualizer. Check console for details.';
                    }
                });
            </script>
        </body>
        </html>
      `;
	}
}
