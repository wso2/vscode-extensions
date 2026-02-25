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
import { CancellationToken, DebugConfiguration, ProviderResult, Uri, window, workspace, WorkspaceFolder } from 'vscode';
import { MiDebugAdapter } from './debugAdapter';
import { COMMANDS } from '../constants';
import { extension } from '../MIExtensionContext';
import {executeBuildTask, executeRemoteDeployTask, getServerPath, stopServer} from './debugHelper';
import { getDockerTask } from './tasks';
import { getStateMachine, refreshUI } from '../stateMachine';
import * as fs from 'fs';
import * as path from 'path';
import { SELECTED_SERVER_PATH, SELECTED_JAVA_HOME } from './constants';
import { buildBallerinaModule, setPathsInWorkSpace, verifyJavaHomePath, verifyMIPath } from '../util/onboardingUtils';
import { MACHINE_VIEW } from '@wso2/mi-core';
import { askForProject } from '../util/workspace';
import { webviews } from '../visualizer/webview';


class MiConfigurationProvider implements vscode.DebugConfigurationProvider {

    resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {
        // if launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            config.type = 'mi';
            config.name = 'MI: Run and Debug';
            config.request = 'launch';
        }

        config.internalConsoleOptions = config.noDebug ? 'neverOpen' : 'openOnSessionStart';

        return config;
    }
}

export function activateDebugger(context: vscode.ExtensionContext) {

    vscode.commands.registerCommand(COMMANDS.BUILD_PROJECT, async (projectUri?: string, shouldCopyTarget?: boolean, postBuildTask?: Function) => {
        if (!projectUri) {
            projectUri = await askForProject();
        }
        getServerPath(projectUri).then(async (serverPath) => {
            if (!serverPath) {
                vscode.window.showErrorMessage("Server path not found");
                return;
            }
            await executeBuildTask(projectUri!, serverPath, shouldCopyTarget, postBuildTask);
        });
    });

    vscode.commands.registerCommand(COMMANDS.CREATE_DOCKER_IMAGE, async (projectUri?: string) => {
        if (!projectUri) {
            projectUri = await askForProject();
        }
        const dockerTask = getDockerTask(projectUri);
        if (dockerTask) {
            await vscode.tasks.executeTask(dockerTask);
        } else {
            vscode.window.showErrorMessage('Failed to create Docker task.');
        }
    });

    vscode.commands.registerCommand(COMMANDS.REMOTE_DEPLOY_PROJECT, async (projectUri?: string, postBuildTask?: Function) => {
        if (!projectUri) {
            projectUri = await askForProject();
        }
        await executeRemoteDeployTask(projectUri, postBuildTask);
    });

    // Register command to change the WSO2 Integrator: MI server path
    vscode.commands.registerCommand(COMMANDS.CHANGE_SERVER_PATH, async () => {
        const projectUri = await askForProject();
        if (!projectUri) {
            return;
        }

        const addServerOptionLabel = "Add WSO2 Integrator: MI Server";
        const currentServerPath: string | undefined = extension.context.globalState.get(SELECTED_SERVER_PATH);
        const quickPickItems: vscode.QuickPickItem[] = [];

        if (currentServerPath) {
            quickPickItems.push(
                { kind: vscode.QuickPickItemKind.Separator, label: "Current Server Path" },
                { label: currentServerPath },
                { label: addServerOptionLabel }
            );
        } else {
            quickPickItems.push({ label: addServerOptionLabel });
        }

        const quickPickOptions: vscode.QuickPickOptions = {
            canPickMany: false,
            title: "Select WSO2 Integrator: MI Server Path",
            placeHolder: currentServerPath ? `Selected Server: ${currentServerPath}` : "Add WSO2 Integrator: MI Server",
        };

        const selected = await vscode.window.showQuickPick(quickPickItems, quickPickOptions);
        if (selected) {
            let selectedServerPath = '';
            if (selected.label === addServerOptionLabel) {
                // Open folder selection dialog
                const folders = await vscode.window.showOpenDialog({
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                    openLabel: 'Select Folder',
                });

                if (!folders || folders.length === 0) {
                    vscode.window.showErrorMessage('No folder was selected.');
                    return false;
                }

                selectedServerPath = folders[0].fsPath;
            } else {
                selectedServerPath = selected.label;
            }
            const verifiedServerPath = verifyMIPath(selectedServerPath);
            if (verifiedServerPath) {
                await extension.context.globalState.update(SELECTED_SERVER_PATH, verifiedServerPath);
                await setPathsInWorkSpace({ projectUri, type: 'MI', path: verifiedServerPath });
                return true;
            } else {
                vscode.window.showErrorMessage('Invalid WSO2 Integrator: MI server path or unsupported version detected.');
                return false;
            }
        }
        return false;
    });

    // Register command to change the Java Home path
    vscode.commands.registerCommand(COMMANDS.CHANGE_JAVA_HOME, async () => {
        const projectUri = await askForProject();
        if (!projectUri) {
            return;
        }

        try {
            const setJavaOptionLabel = "Set Java Home Path";
            const currentJavaHomePath: string | undefined = extension.context.globalState.get(SELECTED_JAVA_HOME);
            const quickPickItems: vscode.QuickPickItem[] = [];
            if (currentJavaHomePath) {
                quickPickItems.push(
                    { kind: vscode.QuickPickItemKind.Separator, label: "Current Java Home Path" },
                    { label: currentJavaHomePath },
                    { label: setJavaOptionLabel }
                );
            } else {
                quickPickItems.push({ label: setJavaOptionLabel });
            }
            const environmentJavaHome = process.env.JAVA_HOME;
            if (environmentJavaHome) {
                quickPickItems.push(
                    { kind: vscode.QuickPickItemKind.Separator, label: "Environment Java Home" },
                    { label: environmentJavaHome }
                );
            }

            const quickPickOptions: vscode.QuickPickOptions = {
                canPickMany: false,
                title: "Select Java Home Path",
                placeHolder: currentJavaHomePath ? `Selected Java Home: ${currentJavaHomePath}` : "Set Java Home Path",
            };

            const selected = await vscode.window.showQuickPick(quickPickItems, quickPickOptions);
            if (selected) {
                let selectedJavaHomePath = '';
                if (selected.label === setJavaOptionLabel) {
                    // Open folder selection dialog
                    const folders = await vscode.window.showOpenDialog({
                        canSelectFiles: false,
                        canSelectFolders: true,
                        canSelectMany: false,
                        openLabel: 'Select Folder',
                    });

                    if (!folders || folders.length === 0) {
                        vscode.window.showErrorMessage('No folder was selected.');
                        return false;
                    }

                    selectedJavaHomePath = folders[0].fsPath;
                } else {
                    selectedJavaHomePath = selected.label;
                }

                const verifiedJavaHomePath = verifyJavaHomePath(selectedJavaHomePath);
                if (verifiedJavaHomePath) {
                    await extension.context.globalState.update(SELECTED_JAVA_HOME, verifiedJavaHomePath);
                    await setPathsInWorkSpace({ projectUri, type: 'JAVA', path: verifiedJavaHomePath });
                    return true;
                } else {
                    vscode.window.showErrorMessage('Invalid Java Home path or unsupported Java version. Java 11 or later is required.');
                    return false;
                }
            }
            return false;
        } catch (error) {
            vscode.window.showErrorMessage(
                `Error occurred while setting Java Home path: ${error instanceof Error ? error.message : error}`
            );
            return false;
        }
    });


    context.subscriptions.push(vscode.commands.registerCommand(COMMANDS.BUILD_AND_RUN_PROJECT, async (args: any) => {
        const webview = [...webviews.values()].find(webview => webview.getWebview()?.active);
        let projectUri: string | undefined = undefined;
        if (webview && webview?.getProjectUri()) {
            projectUri = webview.getProjectUri();
        }
        if (!projectUri) {
            projectUri = await askForProject();
        }
        if (projectUri) {
            const projectWorkspace = workspace.getWorkspaceFolder(Uri.file(projectUri));
            const launchJsonPath = path.join(projectUri, '.vscode', 'launch.json');
            const envPath = path.join(projectUri, '.env');
            let config: vscode.DebugConfiguration | undefined = undefined;

            if (fs.existsSync(launchJsonPath)) {
                // Read the configurations from launch.json
                const configurations = vscode.workspace.getConfiguration('launch', Uri.file(projectUri));
                const allConfigs = configurations.get<vscode.DebugConfiguration[]>('configurations');

                if (allConfigs) {
                    config = allConfigs.find(c => c.name === 'MI: Run and Debug') || allConfigs[0];
                }
            }

            if (config === undefined) {
                // Default configuration if no launch.json or no matching config
                config = {
                    type: 'mi',
                    name: 'MI: Run',
                    request: 'launch',
                    noDebug: true,
                    internalConsoleOptions: 'neverOpen'
                };
            } else {
                config.name = 'MI: Run';
                config.noDebug = true;
                config.internalConsoleOptions = 'neverOpen';
            }

            if (fs.existsSync(envPath)) {
                const envFileContent = fs.readFileSync(envPath, 'utf-8');
                const envVariables = envFileContent.split('\n').reduce((acc, line) => {
                    const [key, ...values] = line.split('=');
                    const value = values.join('=').trim();
                    if (key && value) {
                        acc[key.trim()] = value;
                    }
                    return acc;
                }, {} as { [key: string]: string });

                // Adding env variables
                config.env = { ...config.env, ...envVariables };
            }

            try {
                await vscode.debug.startDebugging(projectWorkspace, config);
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to run without debugging: ${err}`);
            }
        } else {
            vscode.window.showErrorMessage('No workspace folder found');
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand(COMMANDS.TERMINATE_SERVER, async () => {

        const webview = [...webviews.values()].find(webview => webview.getWebview()?.active);
        let projectUri: string | undefined = undefined;
        if (webview && webview?.getProjectUri()) {
            projectUri = webview.getProjectUri();
        }
        if (!projectUri) {
            projectUri = await askForProject();
        }
        if (projectUri) {
            try {
                getServerPath(projectUri).then(async (serverPath) => {
                    if (!serverPath) {
                        vscode.window.showErrorMessage("Server path not found to terminate the server.");
                        return;
                    }
                    await stopServer(projectUri, serverPath, process.platform === 'win32');
                    vscode.commands.executeCommand('setContext', 'MI.isRunning', 'false');
                });
            } catch(error) {
                vscode.window.showErrorMessage('Error occurred while terminating the server.');
            }
        } else {
            vscode.window.showErrorMessage('Error occurred while determining the project to terminate the server.');
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand(COMMANDS.BUILD_BAL_MODULE, async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const filePath = editor.document.uri.fsPath;
        await buildBallerinaModule(path.dirname(filePath));
    }));


    // register a configuration provider for 'mi' debug type
    const provider = new MiConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('mi', provider));

    // register a dynamic configuration provider for 'mi' debug type
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('mi', {
        provideDebugConfigurations(folder: WorkspaceFolder | undefined): ProviderResult<DebugConfiguration[]> {
            return [
                {
                    name: "MI: Run and Debug",
                    request: "launch",
                    type: "mi"
                }
            ];
        }
    }, vscode.DebugConfigurationProviderTriggerKind.Dynamic));

    // Listener to support reflect breakpoint changes in diagram when debugger is inactive
    context.subscriptions.push(vscode.debug.onDidChangeBreakpoints((session) => {
        const projectUri = vscode.workspace.getWorkspaceFolder(((session.added[0] || session.changed[0] || session.removed[0]) as any)?.location.uri);
        if (projectUri) {
            if (webviews.get(projectUri.uri.fsPath)) {
                const context = getStateMachine(projectUri.uri.fsPath).context();

                if (context?.view == MACHINE_VIEW.ResourceView) {
                    refreshUI(projectUri.uri.fsPath);
                }
            }
        }
    }));

    const factory = new InlineDebugAdapterFactory();
    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('mi', factory));
}

class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {

    createDebugAdapterDescriptor(session: vscode.DebugSession): ProviderResult<vscode.DebugAdapterDescriptor> {
        const webview = [...webviews.values()].find(webview => webview.getWebview()?.active);
        const projectUri = webview ? webview.getProjectUri() : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!projectUri) {
            const errorMessage = "No project found in the workspace";
            console.error(errorMessage);
            window.showErrorMessage(errorMessage);
            return;
        }
        return new vscode.DebugAdapterInlineImplementation(new MiDebugAdapter(projectUri, session));
    }
}
