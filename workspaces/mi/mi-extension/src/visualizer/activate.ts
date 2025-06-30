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
import { commands, window } from 'vscode';
import { getStateMachine, navigate, openView, refreshUI } from '../stateMachine';
import { COMMANDS, REFRESH_ENABLED_DOCUMENTS, SWAGGER_LANG_ID, SWAGGER_REL_DIR } from '../constants';
import { EVENT_TYPE, MACHINE_VIEW, onDocumentSave } from '@wso2/mi-core';
import { extension } from '../MIExtensionContext';
import { importCapp } from '../util/importCapp';
import { SELECTED_SERVER_PATH } from '../debugger/constants';
import { debounce } from 'lodash';
import path from 'path';
import { removeFromHistory } from '../history';
import { RPCLayer } from '../RPCLayer';
import { deleteSwagger, generateSwagger } from '../util/swagger';
import { VisualizerWebview, webviews } from './webview';
import * as fs from 'fs';
import { AiPanelWebview } from '../ai-panel/webview';
import { MiDiagramRpcManager } from '../rpc-managers/mi-diagram/rpc-manager';
import { log } from '../util/logger';

export function activateVisualizer(context: vscode.ExtensionContext, firstProject: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.OPEN_PROJECT, () => {
            window.showOpenDialog({ canSelectFolders: true, canSelectFiles: true, filters: { 'CAPP': ['car', 'zip'] }, openLabel: 'Open MI Project' })
                .then(uri => {
                    if (uri && uri[0]) {
                        if (uri[0].fsPath.endsWith('.car') || uri[0].fsPath.endsWith('.zip')) {
                            window.showInformationMessage('A car file (CAPP) is selected.\n Do you want to extract it?', { modal: true }, 'Extract')
                                .then(option => {
                                    if (option === 'Extract') {
                                        window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, title: 'Select the location to extract the CAPP', openLabel: 'Select Folder' })
                                            .then(extractUri => {
                                                if (extractUri && extractUri[0]) {
                                                    importCapp({ source: uri[0].fsPath, directory: extractUri[0].fsPath, open: false });
                                                }
                                            });
                                    }
                                });
                        } else {
                            commands.executeCommand('vscode.openFolder', uri[0]);
                        }
                    }
                });
        }),
        commands.registerCommand(COMMANDS.CREATE_PROJECT_COMMAND, async (args) => {
            if (args && args.name && args.path && args.scope) {
                const rpcManager = new MiDiagramRpcManager("");
                if (rpcManager) {
                    await rpcManager.createProject(
                        {
                            directory: path.dirname(args.path),
                            name: path.basename(args.path),
                            open: false,
                            miVersion: "4.4.0"
                        }
                    );
                    await createSettingsFile(args);
                }

                async function createSettingsFile(args) {
                    const projectPath = args.path;
                    const settingsPath = path.join(projectPath, '.vscode', 'settings.json');
                    try {
                        const vscodeDir = path.join(projectPath, '.vscode');
                        if (!fs.existsSync(vscodeDir)) {
                            fs.mkdirSync(vscodeDir);
                        }
                        const settings = {
                            "MI.Scope": args.scope
                        };
                        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`Failed to create settings file: ${error.message}`);
                    }
                }
            } else {
                // active webview
                const webview = [...webviews.values()].find(webview => webview.getWebview()?.active) || [...webviews.values()][0];
                const projectUri = webview ? webview.getProjectUri() : firstProject;
                openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.ProjectCreationForm, projectUri });
                log('Create New Project');
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.IMPORT_CAPP, () => {
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.ImportProjectForm });
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.OPEN_WELCOME, () => {
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Welcome });
        })
    );
    // Activate editor/title items
    context.subscriptions.push(
        commands.registerCommand(COMMANDS.SHOW_GRAPHICAL_VIEW, async (file: vscode.Uri | string) => {
            let projectUri;
            if (typeof file !== 'string') {
                file = file.fsPath;
                projectUri = vscode.workspace.getWorkspaceFolder(file as any)?.uri.fsPath
            } else {
                projectUri = vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(file))?.uri.fsPath;
            }
            if (!projectUri) {
                return;
            }
            navigate(projectUri, { location: { view: null, documentUri: file } });
        })
    );

    context.subscriptions.push(
        commands.registerCommand(COMMANDS.SHOW_OVERVIEW, async () => {
            const projectType: string | undefined = extension.context.workspaceState.get('projectType');
            switch (projectType) {
                case 'miProject':
                    openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Overview });
                    break;
                case 'oldProject':
                    const displayState: boolean | undefined = extension.context.workspaceState.get('displayOverview');
                    const displayOverview = displayState === undefined ? true : displayState;
                    openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.UnsupportedProject, customProps: { displayOverview } });
                    break;
            }
        })
    );

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            // Check if the specific configuration key changed
            if (event.affectsConfiguration('MI.' + SELECTED_SERVER_PATH)) {
                // Show a prompt to restart the window
                vscode.window
                    .showInformationMessage(
                        'The workspace setting has changed. A window reload is required for changes to take effect.',
                        'Reload Window'
                    )
                    .then((selectedAction) => {
                        if (selectedAction === 'Reload Window') {
                            // Command to reload the window
                            vscode.commands.executeCommand('workbench.action.reloadWindow');
                        }
                    });
            }
        })
    );

    // Listen for pom changes and update dependencies
    context.subscriptions.push(
        // Handle the text change and diagram update with rpc notification
        vscode.workspace.onDidChangeTextDocument(async function (document) {
            const projectUri = vscode.workspace.getWorkspaceFolder(document.document.uri)?.uri.fsPath;
            const artifactsDir = path.join(projectUri!, 'src', 'main', "wso2mi", "artifacts");

            if (!projectUri) {
                return;
            }
            const webview = webviews.get(projectUri);

            if (!webview) {
                return;
            }

            if (!REFRESH_ENABLED_DOCUMENTS.includes(document.document.languageId) || !projectUri) {
                return;
            }

            if (webview?.getWebview()?.active || AiPanelWebview.currentPanel?.getWebview()?.active) {
                await document.document.save();
                if (!getStateMachine(projectUri).context().view?.endsWith('Form') && document?.document?.uri?.fsPath?.includes(artifactsDir)) {
                    refreshDiagram(projectUri);
                }
            }

            if (document.document.uri.fsPath.endsWith('pom.xml')) {
                const projectUri = vscode.workspace.getWorkspaceFolder(document.document.uri)?.uri.fsPath;
                const langClient = getStateMachine(projectUri!).context().langClient;
                const confirmUpdate = await vscode.window.showInformationMessage(
                    'The pom.xml file has been modified. Do you want to update the dependencies?',
                    'Yes',
                    'No'
                );

                if (confirmUpdate === 'Yes') {
                    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
                    statusBarItem.text = '$(sync) Updating dependencies...';
                    statusBarItem.show();
                    await langClient?.updateConnectorDependencies();
                    statusBarItem.hide();
                }
            }
        }, extension.context),

        vscode.workspace.onDidDeleteFiles(async function (event) {
            // Group files by project URI to handle multiple deletions efficiently
            const projectsToRefresh = new Map<string, { needsOverviewOpen: boolean }>();

            event.files.forEach(file => {
                const filePath = file;
                const projectUri = vscode.workspace.getWorkspaceFolder(filePath)?.uri.fsPath;

                if (projectUri) {
                    // Initialize project entry if not exists
                    if (!projectsToRefresh.has(projectUri)) {
                        projectsToRefresh.set(projectUri, { needsOverviewOpen: false });
                    }

                    const projectInfo = projectsToRefresh.get(projectUri)!;

                    // Handle API file deletion
                    const apiDir = path.join(projectUri, 'src', 'main', "wso2mi", "artifacts", "apis");
                    if (filePath.fsPath?.includes(apiDir)) {
                        deleteSwagger(filePath.fsPath);
                    }

                    removeFromHistory(filePath.fsPath);

                    // Check if we need to open overview for this project
                    const currentLocation = getStateMachine(projectUri).context();
                    if (currentLocation.documentUri === filePath.fsPath) {
                        projectInfo.needsOverviewOpen = true;
                    }
                }
            });

            // Process each affected project once
            projectsToRefresh.forEach((info, projectUri) => {
                if (info.needsOverviewOpen) {
                    openView(EVENT_TYPE.REPLACE_VIEW, { view: MACHINE_VIEW.Overview, projectUri });
                } else {
                    const currentView = getStateMachine(projectUri).context().view;
                    if (currentView === MACHINE_VIEW.Overview) {
                        refreshUI(projectUri);
                    }
                }
            });

            await vscode.commands.executeCommand(COMMANDS.REFRESH_COMMAND);

        }, extension.context),

        vscode.workspace.onDidSaveTextDocument(async function (document) {
            const projectUri = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
            const artifactsDir = path.join(projectUri!, 'src', 'main', "wso2mi", "artifacts");

            if (!projectUri) {
                return;
            }
            const relativePath = vscode.workspace.asRelativePath(document.uri);
            const webview = webviews.get(projectUri);

            if (!webview) {
                return;
            }

            const currentView = getStateMachine(projectUri!)?.context()?.view;
            if (SWAGGER_LANG_ID === document.languageId && projectUri) {
                // Check if the saved document is a swagger file
                if (path.dirname(relativePath) === SWAGGER_REL_DIR && webview) {
                    webview.getWebview()?.reveal(webview.isBeside() ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active);
                }
            } else if (!REFRESH_ENABLED_DOCUMENTS.includes(document.languageId)) {
                return;
            }

            const mockServicesDir = path.join(projectUri!, 'src', 'test', 'resources', 'mock-services');
            if (document.uri.toString().includes(mockServicesDir) && currentView == MACHINE_VIEW.TestSuite) {
                return;
            }

            RPCLayer._messengers.get(projectUri)?.sendNotification(
                onDocumentSave,
                { type: 'webview', webviewType: VisualizerWebview.viewType },
                { uri: document.uri.toString() }
            );

            // Generate Swagger file for API files
            const apiDir = path.join(projectUri!, 'src', 'main', "wso2mi", "artifacts", "apis");
            if (document?.uri.fsPath.includes(apiDir)) {
                const dirPath = path.join(projectUri!, SWAGGER_REL_DIR);
                const swaggerOriginalPath = path.join(dirPath, path.basename(document.uri.fsPath, path.extname(document.uri.fsPath)) + '_original.yaml');
                const swaggerPath = path.join(dirPath, path.basename(document.uri.fsPath, path.extname(document.uri.fsPath)) + '.yaml');
                if (fs.readFileSync(document.uri.fsPath, 'utf-8').split('\n').length > 3) {
                    if (fs.existsSync(swaggerOriginalPath)) {
                        fs.copyFileSync(swaggerOriginalPath, swaggerPath);
                        fs.rmSync(swaggerOriginalPath);
                    } else {
                        generateSwagger(document.uri.fsPath);
                    }
                }
            }

            if (currentView !== 'Connector Store Form' && document?.uri?.fsPath?.includes(artifactsDir)) {
                refreshDiagram(projectUri!);
            }
        }, extension.context),
    );
}

export const refreshDiagram = debounce(async (projectUri: string, refreshDiagram: boolean = true) => {
    const webview = webviews.get(projectUri);

    if (!webview) {
        return;
    }

    if (!getStateMachine(projectUri).context().isOldProject) {
        await vscode.commands.executeCommand(COMMANDS.REFRESH_COMMAND); // Refresh the project explore view
    }
    if (refreshDiagram) {
        refreshUI(projectUri);
    }
}, 500);
