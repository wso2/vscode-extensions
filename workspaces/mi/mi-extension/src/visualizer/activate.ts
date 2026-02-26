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
import { commands, window, workspace } from 'vscode';
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
import { AiPanelWebview } from '../ai-features/webview';
import { MiDiagramRpcManager } from '../rpc-managers/mi-diagram/rpc-manager';
import { log } from '../util/logger';
import { CACHED_FOLDER, INTEGRATION_PROJECT_DEPENDENCIES_DIR } from '../util/onboardingUtils';
import { getHash } from '../util/fileOperations';
import { MILanguageClient } from '../lang-client/activator';

export function activateVisualizer(context: vscode.ExtensionContext, firstProject: string) {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.OPEN_PROJECT, (providedUri?: vscode.Uri) => {
            const processUri = (uri: vscode.Uri[] | undefined) => {
                if (uri && uri[0]) {
                    const handleOpenProject = (folderUri: vscode.Uri) => {
                        window.showInformationMessage('Where would you like to open the project?',
                            { modal: true },
                            'Current Window',
                            'New Window'
                        ).then(selection => {
                            if (selection === "Current Window") {
                                const workspaceFolders = workspace.workspaceFolders || [];
                                if (!workspaceFolders.some(folder => folder.uri.fsPath === folderUri.fsPath)) {
                                    workspace.updateWorkspaceFolders(workspaceFolders.length, 0, { uri: folderUri });
                                }
                            } else if (selection === "New Window") {
                                commands.executeCommand('vscode.openFolder', folderUri);
                            }
                        });
                    };
                    if (uri[0].fsPath.endsWith('.car') || uri[0].fsPath.endsWith('.zip')) {
                        window.showInformationMessage('A car file (CAPP) is selected.\n Do you want to extract it?', { modal: true }, 'Extract')
                            .then(option => {
                                if (option === 'Extract') {
                                    window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, title: 'Select the location to extract the CAPP', openLabel: 'Select Folder' })
                                        .then(async extractUri => {
                                            if (extractUri && extractUri[0]) {
                                                try {
                                                    const result = await importCapp({ source: uri[0].fsPath, directory: extractUri[0].fsPath, open: false });
                                                    if (result.filePath) {
                                                        handleOpenProject(extractUri[0]);
                                                    } else {
                                                        window.showErrorMessage('Failed to import CAPP. Please check the file and try again.');
                                                    }
                                                } catch (error: any) {
                                                    window.showErrorMessage(`CAPP import failed: ${error.message}`);
                                                }
                                            }
                                        });
                                }
                            });
                    } else {
                        const webview = [...webviews.values()].find(webview => webview.getWebview()?.active) || [...webviews.values()][0];
                        const projectUri = webview ? webview.getProjectUri() : firstProject;
                        const projectOpened = getStateMachine(projectUri).context().projectOpened;
                        if (projectOpened) {
                            handleOpenProject(uri[0]);
                        } else {
                            commands.executeCommand('vscode.openFolder', uri[0]);
                        }
                    }
                }
            };

            if (providedUri) {
                processUri([providedUri]);
            } else {
                window.showOpenDialog({ canSelectFolders: true, canSelectFiles: true, filters: { 'CAPP': ['car', 'zip'] }, openLabel: 'Open MI Project' })
                    .then(processUri);
            }
        }),
        commands.registerCommand(COMMANDS.CREATE_PROJECT_COMMAND, async (args) => {
            if (args && args.name && args.path && args.scope) {
                const rpcManager = new MiDiagramRpcManager("");
                if (rpcManager) {
                    const result = await rpcManager.createProject(
                        {
                            directory: path.dirname(args.path),
                            name: path.basename(args.path),
                            open: args.open ?? false,
                            miVersion: "4.4.0"
                        }
                    );
                    await createSettingsFile(args);
                    return result;
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
            const webview = [...webviews.values()].find(webview => webview.getWebview()?.active) || [...webviews.values()][0];
            openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Welcome, projectUri: webview ? webview.getProjectUri() : firstProject });
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
                projectUri = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(file))?.uri.fsPath;
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
        vscode.workspace.onDidChangeTextDocument(async function (e : vscode.TextDocumentChangeEvent) {
            const projectUri = vscode.workspace.getWorkspaceFolder(e.document.uri)?.uri.fsPath;
            if (!projectUri) {
                return;
            }
            const artifactsDir = path.join(projectUri!, 'src', 'main', "wso2mi", "artifacts");
            const webview = webviews.get(projectUri);

            if (!webview) {
                return;
            }

            if (!REFRESH_ENABLED_DOCUMENTS.includes(e.document.languageId) || !projectUri) {
                return;
            }

            if (webview?.getWebview()?.active || AiPanelWebview.currentPanel?.getWebview()?.active) {
                await e.document.save();
                if (!getStateMachine(projectUri).context().view?.endsWith('Form') && e?.document?.uri?.fsPath?.includes(artifactsDir)) {
                    refreshDiagram(projectUri);
                }
            }

            if (e.document.uri.fsPath.endsWith('pom.xml')) {
                const projectUri = vscode.workspace.getWorkspaceFolder(e.document.uri)?.uri.fsPath;
                const langClient = await MILanguageClient.getInstance(projectUri!);
                
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
                    await extractCAppDependenciesAsProjects(projectUri);
                    await langClient?.loadDependentCAppResources();
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
            
            if (!projectUri) {
                return;
            }
            const artifactsDir = path.join(projectUri, 'src', 'main', "wso2mi", "artifacts");
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
                generateSwagger(document.uri.fsPath);
            }

            const swaggerDir = path.join(projectUri!, "src", "main", "wso2mi", "resources", "api-definitions");
            if (document?.uri.fsPath.includes(swaggerDir)) {
                const rpcManager = new MiDiagramRpcManager(projectUri!);
                const langClient = await MILanguageClient.getInstance(projectUri!);
                const apiPath = path.join(apiDir, path.basename(document?.uri.fsPath, path.extname(document?.uri.fsPath)) + '.xml');
                const apiName = path.basename(document?.uri.fsPath).split("_v")[0];
                langClient?.getSyntaxTree({
                    documentIdentifier: {
                        uri: apiPath
                    }
                }).then(st => {
                    rpcManager.compareSwaggerAndAPI({
                        apiName: apiName,
                        apiPath: apiPath
                    }).then(async response => {
                        if (response.swaggerExists && !response.isEqual) {
                            const confirmUpdate = await vscode.window.showInformationMessage(
                                'The OpenAPI definition is different from the Synapse API.',
                                { modal: true },
                                "Update API", "Update Swagger"
                            );
                            switch (confirmUpdate) {
                                case "Update Swagger":
                                    rpcManager.updateSwaggerFromAPI({
                                        apiName: apiName,
                                        apiPath: apiPath,
                                        existingSwagger: response.existingSwagger,
                                        generatedSwagger: response.generatedSwagger
                                    });
                                    break;
                                case "Update API":
                                    const resources = getResources(st);
                                    rpcManager.updateAPIFromSwagger({
                                        apiName: apiName,
                                        apiPath: apiPath,
                                        existingSwagger: response.existingSwagger,
                                        generatedSwagger: response.generatedSwagger,
                                        resources: resources.map(r => ({
                                            path: r.path,
                                            methods: r.methods,
                                            position: r.position
                                        })),
                                        insertPosition: {
                                            line: st.syntaxTree.api.range.endTagRange.start.line,
                                            character: st.syntaxTree.api.range.endTagRange.start.character
                                        }
                                    });
                                    break;
                                default:
                                    break;
                            }
                        }
                    })
                });
            }

            if (currentView !== 'Connector Store Form' && document?.uri?.fsPath?.includes(artifactsDir) || currentView === MACHINE_VIEW.IdpConnectorSchemaGeneratorForm) {
                refreshDiagram(projectUri!);
            }
        }, extension.context),
    );
}

export async function extractCAppDependenciesAsProjects(projectUri: string | undefined) {
    try {
        if (!projectUri) {
            return;
        }
        const dependenciesDir = path.join(CACHED_FOLDER, INTEGRATION_PROJECT_DEPENDENCIES_DIR);
        const hashedProjectPath = getHash(projectUri);
        const projectName = path.basename(projectUri);
        const selectedDependencyDir = `${projectName}_${hashedProjectPath}`;
        if (!fs.existsSync(path.join(dependenciesDir, selectedDependencyDir))) {
            return;
        }
        const downloadedDir = path.join(dependenciesDir, selectedDependencyDir, 'Downloaded');
        const extractedDir = path.join(dependenciesDir, selectedDependencyDir, 'Extracted');
        const carFiles = fs.readdirSync(downloadedDir).filter(file => file.endsWith('.car'));

        // Delete any directory inside the Extracted directory
        if (fs.existsSync(extractedDir)) {
            const extractedSubDirs = fs.readdirSync(extractedDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => path.join(extractedDir, dirent.name));

            extractedSubDirs.forEach(subDir => {
                fs.rmSync(subDir, { recursive: true, force: true });
            });
        }

        for (const carFile of carFiles) {
            const carFileNameWithoutExt = path.basename(carFile, path.extname(carFile));
            const carFileExtractedDir = path.join(extractedDir, carFileNameWithoutExt);

            if (!fs.existsSync(carFileExtractedDir)) {
                fs.mkdirSync(carFileExtractedDir, { recursive: true });
            }
            await importCapp({
                source: path.join(downloadedDir, carFile),
                directory: carFileExtractedDir,
                open: false
            });
            // During the extraction process, the .car file is renamed to .zip
            // Hence remove the .car file after extraction
            const zipFilePath = path.join(downloadedDir, carFileNameWithoutExt + '.zip');
            if (fs.existsSync(zipFilePath)) {
                fs.rmSync(zipFilePath);
            }
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to load integration project dependencies: ${error.message}`);
    }
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

const getResources = (st: any): any[] => {
    const resources: any[] = st?.syntaxTree?.api?.resource ?? [];
    return resources.map((resource) => ({
        methods: resource.methods,
        path: resource.uriTemplate || resource.urlMapping,
        position: {
            startLine: resource.range.startTagRange.start.line,
            startColumn: resource.range.startTagRange.start.character,
            endLine: resource.range.endTagRange.end.line,
            endColumn: resource.range.endTagRange.end.character,
        },
        expandable: false
    }));
};
