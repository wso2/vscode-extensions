/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import * as vscode from "vscode";
import { CancellationToken, DebugConfiguration, ProviderResult, WorkspaceFolder } from "vscode";
import { SiDebugAdapter } from "./debugAdapter";
import { VS_CODE_COMMANDS, SIDDHI_HOME_CONFIG, JAVA_HOME_CONFIG } from "../constants";
import * as fs from "fs";
import * as path from "path";
import { verifyJavaHomePath, verifySIPath } from "../utils/onboardingUtils";
import { extension } from "../SIExtensionContext";
import { getSiddhiFileNameWithoutExtension } from "../utils/utils";

class SiConfigurationProvider implements vscode.DebugConfigurationProvider {
    resolveDebugConfiguration(
        folder: WorkspaceFolder | undefined,
        config: DebugConfiguration,
        token?: CancellationToken
    ): ProviderResult<DebugConfiguration> {
        // if launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            config.type = "si";
            config.name = "SI: Run and Debug";
            config.request = "launch";
        }

        config.internalConsoleOptions = config.noDebug ? "neverOpen" : "openOnSessionStart";

        return config;
    }
}

export async function activateDebugger(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(VS_CODE_COMMANDS.BUILD_AND_RUN, async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

            if (!workspaceFolder) {
                vscode.window.showErrorMessage("No workspace folder found");
                return;
            }
            const editor = vscode.window.activeTextEditor;
            const fileName = getSiddhiFileNameWithoutExtension(editor?.document.uri.fsPath!);
            extension.fileUri = editor?.document.uri!;

            const launchJsonPath = path.join(workspaceFolder.uri.fsPath, ".vscode", "launch.json");
            let config: vscode.DebugConfiguration | undefined = undefined;

            if (fs.existsSync(launchJsonPath)) {
                const configurations = vscode.workspace.getConfiguration("launch", workspaceFolder.uri);
                const allConfigs = configurations.get<vscode.DebugConfiguration[]>("configurations");

                if (allConfigs) {
                    config = allConfigs.find((c) => c.name === "SI: Run and Debug") || allConfigs[0];
                }
            }

            if (config === undefined) {
                config = {
                    type: "si",
                    name: `${fileName}`,
                    request: "launch",
                    noDebug: true,
                    internalConsoleOptions: "neverOpen",
                    program: "${file}",
                };
            } else {
                config.name = `${fileName}`;
                config.noDebug = true;
                config.internalConsoleOptions = "neverOpen";
                config.program = "${file}";
            }

            try {
                await vscode.debug.startDebugging(undefined, config);
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to run without debugging: ${err}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(VS_CODE_COMMANDS.CHANGE_SERVER_PATH, async () => {
            const addServerOptionLabel = "Add WSO2 Integrator: SI Server";
            let jsonConfig = vscode.workspace.getConfiguration('siddhi');
            const currentServerPath: string | undefined = jsonConfig.get('home');
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
                title: "Select WSO2 Integrator: SI Server Path",
                placeHolder: currentServerPath
                    ? `Selected Server: ${currentServerPath}`
                    : "Add WSO2 Integrator: SI Server",
            };

            const selected = await vscode.window.showQuickPick(quickPickItems, quickPickOptions);
            if (selected) {
                let selectedServerPath = "";
                if (selected.label === addServerOptionLabel) {
                    // Open folder selection dialog
                    const folders = await vscode.window.showOpenDialog({
                        canSelectFiles: false,
                        canSelectFolders: true,
                        canSelectMany: false,
                        openLabel: "Select Folder",
                    });

                    if (!folders || folders.length === 0) {
                        vscode.window.showErrorMessage("No folder was selected.");
                        return false;
                    }

                    selectedServerPath = folders[0].fsPath;
                } else {
                    selectedServerPath = selected.label;
                }
                const verifiedServerPath = verifySIPath(selectedServerPath);
                if (verifiedServerPath) {
                    jsonConfig.update('home', verifiedServerPath, vscode.ConfigurationTarget.Global);
                    const config = vscode.workspace.getConfiguration();
                    await config.update(SIDDHI_HOME_CONFIG, verifiedServerPath, vscode.ConfigurationTarget.Global);
                    return true;
                } else {
                    vscode.window.showErrorMessage(
                        "Invalid WSO2 Integrator: SI Server path or unsupported WSO2 Integrator: SI version."
                    );
                    return false;
                }
            }
            return false;
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(VS_CODE_COMMANDS.CHANGE_JAVA_HOME, async () => {
            try {
                const setJavaOptionLabel = "Set Java Home Path";
                let jsonConfig = vscode.workspace.getConfiguration('siddhi');
                const currentJavaHomePath: string | undefined = jsonConfig.get('javaHome')
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
                    placeHolder: currentJavaHomePath
                        ? `Selected Java Home: ${currentJavaHomePath}`
                        : "Set Java Home Path",
                };

                const selected = await vscode.window.showQuickPick(quickPickItems, quickPickOptions);
                if (selected) {
                    let selectedJavaHomePath = "";
                    if (selected.label === setJavaOptionLabel) {
                        const folders = await vscode.window.showOpenDialog({
                            canSelectFiles: false,
                            canSelectFolders: true,
                            canSelectMany: false,
                            openLabel: "Select Folder",
                        });

                        if (!folders || folders.length === 0) {
                            vscode.window.showErrorMessage("No folder was selected.");
                            return false;
                        }

                        selectedJavaHomePath = folders[0].fsPath;
                    } else {
                        selectedJavaHomePath = selected.label;
                    }

                    const verifiedJavaHomePath = verifyJavaHomePath(selectedJavaHomePath);
                    if (verifiedJavaHomePath) {
                        const config = vscode.workspace.getConfiguration();
                        await config.update(JAVA_HOME_CONFIG, verifiedJavaHomePath, vscode.ConfigurationTarget.Global);
                        return true;
                    } else {
                        vscode.window.showErrorMessage(
                            "Invalid Java Home path or unsupported Java version. Java 11 or later is required."
                        );
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
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (!editor || editor.document.languageId !== "siddhi") {
                vscode.commands.executeCommand("setContext", "SI.isRunning", "false");
                return;
            }

            const fileName = getSiddhiFileNameWithoutExtension(editor.document.uri.fsPath);
            if (extension.runningSiddhiApps.includes(fileName)) {
                vscode.commands.executeCommand("setContext", "SI.isRunning", "true");
                return;
            }
            vscode.commands.executeCommand("setContext", "SI.isRunning", "false");
        })
    );

    // register a configuration provider for 'si' debug type
    const provider = new SiConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("si", provider));

    // register a dynamic configuration provider for 'si' debug type
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider(
            "si",
            {
                provideDebugConfigurations(folder: WorkspaceFolder | undefined): ProviderResult<DebugConfiguration[]> {
                    return [
                        {
                            name: "SI: Run and Debug",
                            request: "launch",
                            type: "si"
                        },
                    ];
                },
            },
            vscode.DebugConfigurationProviderTriggerKind.Dynamic
        )
    );

    const factory = new InlineDebugAdapterFactory();
    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory("si", factory));
}

class InlineDebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
    createDebugAdapterDescriptor(_session: vscode.DebugSession): ProviderResult<vscode.DebugAdapterDescriptor> {
        return new vscode.DebugAdapterInlineImplementation(new SiDebugAdapter(getSiddhiFileNameWithoutExtension(extension.fileUri.path)));
    }
}
