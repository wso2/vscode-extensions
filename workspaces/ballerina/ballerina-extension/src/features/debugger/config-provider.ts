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

import {
    DebugConfigurationProvider, WorkspaceFolder, DebugConfiguration, debug, ExtensionContext, window, commands, DebugAdapterInlineImplementation,
    DebugSession, DebugAdapterExecutable, DebugAdapterDescriptor, DebugAdapterDescriptorFactory, DebugAdapterServer, Uri, workspace, RelativePattern, ConfigurationTarget, WorkspaceConfiguration,
    Task,
    tasks,
    TaskDefinition,
    ShellExecution,
    TaskExecution,
    DebugAdapterTrackerFactory,
    DebugAdapterTracker,
    ViewColumn,
    TabInputText
} from 'vscode';
import * as child_process from "child_process";
import { getPortPromise } from 'portfinder';
import * as path from "path";
import {
    ballerinaExtInstance, BallerinaExtension, LANGUAGE, OLD_BALLERINA_VERSION_DEBUGGER_RUNINTERMINAL,
    UNSUPPORTED_DEBUGGER_RUNINTERMINAL_KIND, INVALID_DEBUGGER_RUNINTERMINAL_KIND
} from '../../core';
import { ExtendedLangClient } from '../../core/extended-language-client';
import {
    TM_EVENT_START_DEBUG_SESSION, CMP_DEBUGGER, sendTelemetryEvent, sendTelemetryException,
    CMP_NOTEBOOK, TM_EVENT_START_NOTEBOOK_DEBUG
} from '../telemetry';
import { log, debug as debugLog, isSupportedSLVersion } from "../../utils";
import { decimal, ExecutableOptions } from 'vscode-languageclient/node';
import { BAL_NOTEBOOK, getTempFile, NOTEBOOK_CELL_SCHEME } from '../../views/notebook';
import fileUriToPath from 'file-uri-to-path';
import { existsSync, readFileSync } from 'fs';
import { dirname, sep } from 'path';
import { parseTomlToConfig } from '../config-generator/utils';
import { LoggingDebugSession, OutputEvent, TerminatedEvent } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { PALETTE_COMMANDS, PROJECT_TYPE } from '../project/cmds/cmd-runner';
import { Disposable } from 'monaco-languageclient';
import { getCurrentBallerinaFile, getCurrentBallerinaProject } from '../../utils/project-utils';
import { BallerinaProject, BallerinaProjectComponents, BIGetEnclosedFunctionRequest, EVENT_TYPE, MainFunctionParamsResponse } from '@wso2/ballerina-core';
import { openView, StateMachine } from '../../stateMachine';
import { waitForBallerinaService } from '../tryit/utils';
import { BreakpointManager } from './breakpoint-manager';
import { notifyBreakpointChange } from '../../RPCLayer';
import { VisualizerWebview } from '../../views/visualizer/webview';
import { URI } from 'vscode-uri';
import { prepareAndGenerateConfig, cleanAndValidateProject } from '../config-generator/configGenerator';

const BALLERINA_COMMAND = "ballerina.command";
const EXTENDED_CLIENT_CAPABILITIES = "capabilities";
const BALLERINA_TOML_REGEX = `**${sep}Ballerina.toml`;
const BALLERINA_FILE_REGEX = `**${sep}*.bal`;
const BALLERINA_TOML = `Ballerina.toml`;

export enum DEBUG_REQUEST {
    LAUNCH = 'launch'
}

export enum DEBUG_CONFIG {
    SOURCE_DEBUG_NAME = 'Ballerina Debug',
    TEST_DEBUG_NAME = 'Ballerina Test'
}

export interface BALLERINA_TOML {
    package: PACKAGE;
    "build-options": any;
}

export interface PACKAGE {
    org: string;
    name: string;
    version: string;
    distribution: string;
}

class DebugConfigProvider implements DebugConfigurationProvider {
    async resolveDebugConfiguration(_folder: WorkspaceFolder, config: DebugConfiguration)
        : Promise<DebugConfiguration> {
        if (!config.type) {
            commands.executeCommand('workbench.action.debug.configure');
            return Promise.resolve({ request: '', type: '', name: '' });

        }
        if (config.noDebug && (ballerinaExtInstance.enabledRunFast() || StateMachine.context().isBI)) {
            await handleMainFunctionParams(config);
        }
        return getModifiedConfigs(_folder, config);
    }
}

function getValueFromProgramArgs(programArgs: string[], idx: number) {
    return programArgs.length + 1 > idx ? programArgs[idx] : "";
}

async function handleMainFunctionParams(config: DebugConfiguration) {
    const res = await ballerinaExtInstance.langClient?.getMainFunctionParams({
        projectRootIdentifier: {
            uri: "file://" + StateMachine.context().projectUri
        }
    }) as MainFunctionParamsResponse;
    if (res.hasMain) {
        let i;
        let programArgs = config.programArgs;
        let values: string[] = [];
        if (res.params) {
            let params = res.params;
            for (i = 0; i < params.length; i++) {
                let param = params[i];
                let value = param.defaultValue ? param.defaultValue : getValueFromProgramArgs(programArgs, i);
                await showInputBox(param.paramName, value, param.type, false).then(r => {
                    values.push(r);
                });
            }
        }
        if (res.restParams) {
            while (true) {
                let value = getValueFromProgramArgs(programArgs, i);
                i++;
                let result = await showInputBox(res.restParams.paramName, value, res.restParams.type, true);
                if (result) {
                    values.push(result);
                } else {
                    break;
                }
            }
        }
        config.programArgs = values;
    }
}

async function showInputBox(paramName: string, value: string, type: string, isRest: boolean) {
    // TODO: The type information should come from the LS
    let baseType = type;
    let isOptional = false;
    if (baseType.endsWith('?')) {
        isOptional = true;
        baseType = baseType.substring(0, baseType.length - 1);
    }

    // Construct prompt message based on the flags
    let promptMessage = '';
    if (isOptional) {
        promptMessage = 'This is optional and can be left empty';
    } else if (isRest) {
        promptMessage = 'This parameter accepts multiple values. ' +
            "You'll be prompted to enter each value one by one. Press 'Escape' when finished.";
    }

    // Construct placeholder message based on the type and the flags
    let placeholderMessage = `Enter value for '${paramName}'`;
    switch (baseType) {
        case 'boolean':
            placeholderMessage += ' (enter "true" or "false")';
            break;
        case 'int':
            placeholderMessage += ' (e.g., 42)';
            break;
        case 'float':
        case 'decimal':
            placeholderMessage += ' (e.g., 3.14)';
            break;
        case 'byte':
            placeholderMessage += ' (e.g. 127)';
            break;
        case 'string':
            placeholderMessage += ' (e.g., text)';
            break;
    }

    // Show the input box to the user
    const inout = await window.showInputBox({
        title: `${paramName} (type: ${type})`,
        ignoreFocusOut: true,
        placeHolder: placeholderMessage,
        prompt: promptMessage,
        value: value,
        validateInput: (input: string) => {
            if (!isOptional && input === "") {
                return `The input is required`;
            }

            // Validate the input value based on its type
            switch (baseType) {
                case 'string':
                    return null;
                case 'int':
                    if (!Number.isInteger(Number(input)) || isNaN(Number(input))) {
                        return "The input must be an integer";
                    }
                    return null;
                case 'float':
                case 'decimal':
                    if (isNaN(Number(input))) {
                        return "The input must be a number";
                    }
                    return null;
                case 'byte':
                    const byteValue = Number(input);
                    if (!Number.isInteger(byteValue) || isNaN(byteValue) || byteValue < 0 || byteValue > 255) {
                        return "The input must be an integer between 0 and 255";
                    }
                    return null;
                case 'boolean':
                    if (input !== 'true' && input !== 'false') {
                        return "The input must be either 'true' or 'false'";
                    }
                    return null;
                default:
                    return `Unsupported type: ${baseType}. Expected one of: string, int, float, decimal, byte, boolean`;
            }
        },
    });

    // Add quotes to string by default
    return baseType === "string" && !isOptional ? `"${inout}"` : inout;
}

async function getModifiedConfigs(workspaceFolder: WorkspaceFolder, config: DebugConfiguration) {
    const debuggeePort = config.debuggeePort ?? await findFreePort();
    config.debuggeePort = debuggeePort.toString();

    const ballerinaHome = ballerinaExtInstance.getBallerinaHome();
    config['ballerina.home'] = ballerinaHome;
    config[BALLERINA_COMMAND] = ballerinaExtInstance.getBallerinaCmd();
    config[EXTENDED_CLIENT_CAPABILITIES] = { supportsReadOnlyEditors: true, supportsFastRun: isFastRunEnabled() };

    if (!config.type) {
        config.type = LANGUAGE.BALLERINA;
    }

    if (!config.request) {
        config.request = DEBUG_REQUEST.LAUNCH;
    }

    config.noDebug = Boolean(config.noDebug);

    const activeTextEditor = window.activeTextEditor;

    if (activeTextEditor && activeTextEditor.document.fileName.endsWith(BAL_NOTEBOOK)) {
        sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_START_NOTEBOOK_DEBUG, CMP_NOTEBOOK);
        let activeTextEditorUri = activeTextEditor.document.uri;
        if (activeTextEditorUri.scheme === NOTEBOOK_CELL_SCHEME) {
            activeTextEditorUri = Uri.file(getTempFile());
            config.script = fileUriToPath(activeTextEditorUri.toString(true));
        } else {
            return Promise.reject();
        }
    }

    if (!config.script) {
        const tomls = await workspace.findFiles(workspaceFolder ? new RelativePattern(workspaceFolder, BALLERINA_TOML_REGEX) : BALLERINA_TOML_REGEX);
        const projects: { project: BallerinaProject; balFile: Uri; relativePath: string }[] = [];
        for (const toml of tomls) {
            const projectRoot = dirname(toml.fsPath);
            const balFiles = await workspace.findFiles(new RelativePattern(projectRoot, BALLERINA_FILE_REGEX), undefined, 1);
            if (balFiles.length > 0) {

                const tomlContent: string = readFileSync(toml.fsPath, 'utf8');
                const tomlObj: BALLERINA_TOML = parseTomlToConfig(tomlContent) as BALLERINA_TOML;
                const relativePath = workspace.asRelativePath(projectRoot);
                projects.push({ project: { packageName: tomlObj.package.name }, balFile: balFiles[0], relativePath });
            }
        }

        if (projects.length > 0) {
            if (projects.length === 1) {
                config.script = projects[0].balFile.fsPath;
            } else {
                const selectedProject = await window.showQuickPick(projects.map((project) => {
                    return {
                        label: project.project.packageName,
                        description: project.relativePath
                    };
                }), { placeHolder: "Select a Ballerina project to debug", canPickMany: false });
                if (selectedProject) {
                    config.script = projects[projects.indexOf(projects.find((project) => {
                        return project.project.packageName === selectedProject.label;
                    }))].balFile.fsPath;
                } else {
                    return Promise.reject();
                }
            }
        } else {
            ballerinaExtInstance.showMessageInvalidProject();
            return Promise.reject();
        }

        let langClient = <ExtendedLangClient>ballerinaExtInstance.langClient;
        if (langClient.initializeResult) {
            const { experimental } = langClient.initializeResult!.capabilities;
            if (experimental && experimental.introspection && experimental.introspection.port > 0) {
                config.networkLogsPort = experimental.introspection.port;
                if (config.networkLogs === undefined) {
                    config.networkLogs = false;
                }
            }
        }
    }

    // To make compatible with 1.2.x which supports scriptArguments
    if (config.programArgs) {
        config.scriptArguments = config.programArgs;
    }

    if (config.terminal) {
        var balVersion: decimal = parseFloat(ballerinaExtInstance.ballerinaVersion);
        if (balVersion < 2201.3) {
            window.showWarningMessage(OLD_BALLERINA_VERSION_DEBUGGER_RUNINTERMINAL);
        } else if (config.terminal.toLowerCase() === "external") {
            window.showWarningMessage(UNSUPPORTED_DEBUGGER_RUNINTERMINAL_KIND);
        } else if (config.terminal.toLowerCase() !== "integrated") {
            window.showErrorMessage(INVALID_DEBUGGER_RUNINTERMINAL_KIND);
            return Promise.reject();
        }
    }

    if (!config.debugServer) {
        const debugServerPort = await findFreePort();
        config.debugServer = debugServerPort.toString();
    }

    // Notify debug server that the debug session is started in low-code mode
    const isWebviewPresent = VisualizerWebview.currentPanel !== undefined;
    if (isWebviewPresent && StateMachine.context().isBI) {
        config.lowCodeMode = true;
    }
    return config;
}

export async function constructDebugConfig(uri: Uri, testDebug: boolean, args?: any): Promise<DebugConfiguration> {

    const launchConfig: WorkspaceConfiguration = workspace.getConfiguration('launch').length > 0 ? workspace.getConfiguration('launch') :
        workspace.getConfiguration('launch', uri);
    const debugConfigs: DebugConfiguration[] = launchConfig.configurations;

    if (debugConfigs.length == 0) {
        const initialConfigurations: DebugConfiguration[] = ballerinaExtInstance.extension.packageJSON.contributes.debuggers[0].initialConfigurations;

        debugConfigs.push(...initialConfigurations);
        launchConfig.update('configurations', debugConfigs, ConfigurationTarget.WorkspaceFolder, true);
    }

    let debugConfig: DebugConfiguration | undefined;
    for (let i = 0; i < debugConfigs.length; i++) {
        if ((testDebug && debugConfigs[i].name == DEBUG_CONFIG.TEST_DEBUG_NAME) ||
            (!testDebug && debugConfigs[i].name == DEBUG_CONFIG.SOURCE_DEBUG_NAME)) {
            debugConfig = debugConfigs[i];
            break;
        }
    }

    if (!debugConfig) {
        window.showErrorMessage("Failed to resolve correct Ballerina debug configuration for the current workspace.");
        return Promise.reject();
    }

    debugConfig.script = uri.fsPath;
    debugConfig.debugTests = testDebug;
    debugConfig.tests = testDebug ? args : undefined;
    return debugConfig;
}

export function activateDebugConfigProvider(ballerinaExtInstance: BallerinaExtension) {
    let context = <ExtensionContext>ballerinaExtInstance.context;

    context.subscriptions.push(debug.registerDebugConfigurationProvider('ballerina', new DebugConfigProvider()));

    const factory = new BallerinaDebugAdapterDescriptorFactory(ballerinaExtInstance);
    context.subscriptions.push(debug.registerDebugAdapterDescriptorFactory('ballerina', factory));

    context.subscriptions.push(debug.registerDebugAdapterTrackerFactory('ballerina', new BallerinaDebugAdapterTrackerFactory()));

    // Listener to support reflect breakpoint changes in diagram when debugger is inactive
    context.subscriptions.push(debug.onDidChangeBreakpoints((session) => {
        notifyBreakpointChange();
    }));
}

class BallerinaDebugAdapterTrackerFactory implements DebugAdapterTrackerFactory {
    createDebugAdapterTracker(session: DebugSession): DebugAdapterTracker {
        return {
            onWillStartSession() {
                new BreakpointManager();
            },

            onWillStopSession() {
                // clear the active breakpoint
                BreakpointManager.getInstance().setActiveBreakpoint(undefined);
                notifyBreakpointChange();
                commands.executeCommand('setContext', 'isBIProjectRunning', false);
            },

            // Debug Adapter -> VS Code
            onDidSendMessage: async (message: DebugProtocol.ProtocolMessage) => {
                if (message.type === "response") {
                    const msg = <DebugProtocol.Response>message;
                    if ((msg.command === "launch" || msg.command == "restart") && StateMachine.context().isBI) {
                        // clear the active breakpoint
                        BreakpointManager.getInstance().setActiveBreakpoint(undefined);
                        notifyBreakpointChange();

                        // if `suggestTryit` is undefined, that means the debug session is directly started from the debug button. Therefore we should trigger the Try-It view.
                        const suggestTryit = session.configuration.suggestTryit === undefined || session.configuration.suggestTryit === true;
                        if (suggestTryit) {
                            // Trigger Try-It view when starting/restarting debug sessions in low-code mode
                            waitForBallerinaService(workspace.workspaceFolders![0].uri.fsPath).then(() => {
                                commands.executeCommand(PALETTE_COMMANDS.TRY_IT, true);
                            });
                        }
                    } else if (msg.command === "setBreakpoints") {
                        const breakpoints = msg.body.breakpoints;
                        // convert debug points to client breakpoints
                        if (breakpoints) {
                            const clientBreakpoints = breakpoints.map(bp => ({
                                ...bp,
                                line: bp.line - 1
                            }));
                            // set the breakpoints in the diagram
                            BreakpointManager.getInstance().addBreakpoints(clientBreakpoints);
                            notifyBreakpointChange();
                        }
                    } else if (msg.command === "stackTrace") {
                        const uri = Uri.parse(msg.body.stackFrames[0].source.path);
                        const isWebviewPresent = VisualizerWebview.currentPanel !== undefined;

                        // Instead of closing editor tab, arrange them side by side
                        if (isWebviewPresent) {
                            // Show webview on LHS
                            VisualizerWebview.currentPanel.getWebview().reveal(ViewColumn.Active, false);

                            // Open or focus the text editor next to the webview
                            const document = await workspace.openTextDocument(uri);
                            const editor = await window.showTextDocument(document, {
                                viewColumn: ViewColumn.Beside,
                                preserveFocus: true,
                            });
                        }

                        const hitBreakpoint = msg.body.stackFrames[0];
                        console.log(" >>> active breakpoint stackTrace ", hitBreakpoint);

                        const clientBreakpoint = {
                            ...hitBreakpoint,
                            line: Math.max(0, hitBreakpoint.line - 1),
                            column: Math.max(0, hitBreakpoint.column - 1)
                        };

                        BreakpointManager.getInstance().setActiveBreakpoint(clientBreakpoint);

                        if (isWebviewPresent) {
                            await handleBreakpointVisualization(uri, clientBreakpoint);
                        }
                    } else if (msg.command === "continue" || msg.command === "next" || msg.command === "stepIn" || msg.command === "stepOut") {
                        // clear the active breakpoint
                        BreakpointManager.getInstance().setActiveBreakpoint(undefined);
                        notifyBreakpointChange();
                    }
                }

                if (message.type === "event") {
                    const msg = <DebugProtocol.Event>message;
                    if (msg.event === "startFastRun") {
                        // clear the active breakpoint
                        BreakpointManager.getInstance().setActiveBreakpoint(undefined);
                        notifyBreakpointChange();

                        // restart the fast-run
                        getCurrentRoot().then(async (root) => {
                            const didStop = await stopRunFast(root);
                            if (didStop) {
                                runFast(root, msg.body);
                            }
                        });
                    } else if (msg.event === "output") {
                        if (msg.body.output === "Running executable\n") {
                            const workspaceRoot = workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath;
                            if (workspaceRoot) {
                                // Get the component list
                                const components: BallerinaProjectComponents = await ballerinaExtInstance?.langClient?.getBallerinaProjectComponents({
                                    documentIdentifiers: [{ uri: URI.file(workspaceRoot).toString() }]
                                });

                                // Iterate and extract the services
                                const services = components.packages
                                    ?.flatMap(pkg => pkg.modules)
                                    .flatMap(module => module.services);

                                if (services && services.length > 0) {
                                    commands.executeCommand('setContext', 'isBIProjectRunning', true);
                                }
                            }
                        }
                    }
                }
            },
        };
    }
}

async function handleBreakpointVisualization(uri: Uri, clientBreakpoint: DebugProtocol.StackFrame) {
    const newContext = StateMachine.context();

    // Check if breakpoint is in a different project
    if (!uri.fsPath.startsWith(newContext.projectUri)) {
        console.log("Breakpoint is in a different project");
        window.showInformationMessage("Cannot visualize breakpoint since it belongs to a different project");
        openView(EVENT_TYPE.OPEN_VIEW, newContext);
        notifyBreakpointChange();
        return;
    }

    // Get enclosed function definition
    const req: BIGetEnclosedFunctionRequest = {
        filePath: uri.fsPath,
        position: {
            line: clientBreakpoint.line,
            offset: clientBreakpoint.column
        }
    };

    const res = await StateMachine.langClient().getEnclosedFunctionDef(req);

    if (!res?.startLine || !res?.endLine) {
        window.showInformationMessage("Failed to open the respective view for the breakpoint. Please manually navigate to the respective view.");
        notifyBreakpointChange();
        return;
    }

    // Update context with new position
    newContext.documentUri = uri.fsPath;
    newContext.view = undefined;
    newContext.position = {
        startLine: res.startLine.line,
        startColumn: res.startLine.offset,
        endLine: res.endLine.line,
        endColumn: res.endLine.offset
    };
    openView(EVENT_TYPE.OPEN_VIEW, newContext);
}



class BallerinaDebugAdapterDescriptorFactory implements DebugAdapterDescriptorFactory {
    private ballerinaExtInstance: BallerinaExtension;
    private notificationHandler: Disposable | null = null;

    constructor(ballerinaExtInstance: BallerinaExtension) {
        this.ballerinaExtInstance = ballerinaExtInstance;
    }

    async createDebugAdapterDescriptor(session: DebugSession, executable: DebugAdapterExecutable | undefined): Promise<DebugAdapterDescriptor> {
        // Check if the project contains errors(and fix the possible ones) before starting the debug session
        const langClient = ballerinaExtInstance.langClient;
        const projectRoot = await getCurrentRoot();
        await cleanAndValidateProject(langClient, projectRoot);

        // Check if config generation is required before starting the debug session
        await prepareAndGenerateConfig(ballerinaExtInstance, session.configuration.script, false, StateMachine.context().isBI, false);

        if (session.configuration.noDebug && ballerinaExtInstance.enabledRunFast()) {
            return new Promise((resolve) => {
                resolve(new DebugAdapterInlineImplementation(new FastRunDebugAdapter()));
            });
        }

        if (session.configuration.noDebug && StateMachine.context().isBI) {
            return new Promise((resolve) => {
                resolve(new DebugAdapterInlineImplementation(new BIRunAdapter()));
            });
        }

        const port = session.configuration.debugServer;
        const configEnv = session.configuration.configEnv;
        const cwd = this.getCurrentWorkingDir();
        let args: string[] = [];
        const cmd = this.getScriptPath(args);
        args.push(port.toString());

        let opt: ExecutableOptions = { cwd, shell: true };
        opt.env = Object.assign({}, process.env, configEnv);

        try {
            log(`Starting debug adapter: '${this.ballerinaExtInstance.getBallerinaCmd()} start-debugger-adapter ${port.toString()}`);
            const serverProcess = child_process.spawn(cmd, args, opt);

            await new Promise<void>((resolve) => {
                serverProcess.stdout.on('data', (data) => {
                    if (data.toString().includes('Debug server started')) {
                        resolve();
                    }
                    log(`${data}`);
                });

                serverProcess.stderr.on('data', (data) => {
                    debugLog(`${data}`);
                });
            });
            sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_START_DEBUG_SESSION, CMP_DEBUGGER);
            this.registerLogTraceNotificationHandler(session);
            return new DebugAdapterServer(port);
        } catch (error) {
            sendTelemetryException(ballerinaExtInstance, error as Error, CMP_DEBUGGER);
            return await Promise.reject(error);
        }
    }

    private registerLogTraceNotificationHandler(session: DebugSession) {
        const langClient = ballerinaExtInstance.langClient;
        const notificationHandler = langClient.onNotification('$/logTrace', (params: any) => {
            if (params.verbose === "stopped") {
                // do nothing
            } else {
                if (params && params.message) {
                    const category = params.verbose === 'err' ? 'stderr' : 'stdout';
                    session.customRequest('output', { output: params.message, category: category });
                }
            }
        });
        this.notificationHandler = notificationHandler;
    }
    getScriptPath(args: string[]): string {
        args.push('start-debugger-adapter');
        return this.ballerinaExtInstance.getBallerinaCmd();
    }
    getCurrentWorkingDir(): string {
        return path.join(this.ballerinaExtInstance.ballerinaHome, "bin");
    }
}

class FastRunDebugAdapter extends LoggingDebugSession {

    notificationHandler: Disposable | null = null;
    root: string | null = null;
    programArgs: string[] = [];

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments, request?: DebugProtocol.Request): void {
        const langClient = ballerinaExtInstance.langClient;
        const notificationHandler = langClient.onNotification('$/logTrace', (params: any) => {
            if (params.verbose === "stopped") { // even if a single channel (stderr,stdout) stopped, we stop the debug session
                notificationHandler!.dispose();
                this.sendEvent(new TerminatedEvent());
            } else {
                const category = params.verbose === 'err' ? 'stderr' : 'stdout';
                this.sendEvent(new OutputEvent(params.message, category));
            }
        });
        this.notificationHandler = notificationHandler;
        this.programArgs = (args as any).programArgs;
        getCurrentRoot().then((root) => {
            this.root = root;
            runFast(root, { programArgs: this.programArgs }).then((didRan) => {
                response.success = didRan;
                this.sendResponse(response);
            });
        });
    }

    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): void {
        const notificationHandler = this.notificationHandler;
        stopRunFast(this.root).then((didStop) => {
            response.success = didStop;
            notificationHandler!.dispose();
            this.sendResponse(response);
        });
    }
}

class BIRunAdapter extends LoggingDebugSession {

    notificationHandler: Disposable | null = null;
    root: string | null = null;
    task: TaskExecution | null = null;
    taskTerminationListener: Disposable | null = null;

    protected launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments, request?: DebugProtocol.Request): void {
        const taskDefinition: TaskDefinition = {
            type: 'shell',
            task: 'run'
        };

        const ballerinaHome = ballerinaExtInstance.getConfiguredBallerinaHome();
        const pluginDevModeEnabled = ballerinaExtInstance.overrideBallerinaHome();

        let runCommand: string;
        if (pluginDevModeEnabled && ballerinaHome) {
            runCommand = path.join(ballerinaHome, 'bin', ballerinaExtInstance.getBallerinaCmd());
        } else {
            runCommand = ballerinaExtInstance.getBallerinaCmd();
        }
        runCommand += ' run';

        const programArgs = (args as any).programArgs;
        if (programArgs && programArgs.length > 0) {
            runCommand = `${runCommand} -- ${programArgs.join(' ')}`;
        }

        if (isSupportedSLVersion(ballerinaExtInstance, 2201130) && ballerinaExtInstance.enabledExperimentalFeatures()) {
            runCommand = `${runCommand} --experimental`;
        }

        const execution = new ShellExecution(runCommand);
        const task = new Task(
            taskDefinition,
            workspace.workspaceFolders![0], // Assumes at least one workspace folder is open
            'Ballerina Run',
            'ballerina',
            execution
        );

        try {
            tasks.executeTask(task).then((taskExecution) => {
                this.task = taskExecution;

                // Add task termination listener
                this.taskTerminationListener = tasks.onDidEndTaskProcess(e => {
                    if (e.execution === this.task) {
                        this.sendEvent(new TerminatedEvent());
                    }
                });

                response.success = true;
                this.sendResponse(response);
            });
        } catch (error) {
            window.showErrorMessage(`Failed to run Ballerina package: ${error}`);
        }
    }

    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments, request?: DebugProtocol.Request): void {
        if (this.task) {
            this.task.terminate();
        }
        this.cleanupListeners();
        response.success = true;
        this.sendResponse(response);
    }

    private cleanupListeners(): void {
        if (this.taskTerminationListener) {
            this.taskTerminationListener.dispose();
            this.taskTerminationListener = null;
        }
        if (this.notificationHandler) {
            this.notificationHandler.dispose();
            this.notificationHandler = null;
        }
    }
}

async function runFast(root: string, options: { debugPort?: number; env?: Map<string, string>; programArgs?: string[]; } = {}): Promise<boolean> {
    try {
        if (window.activeTextEditor?.document.isDirty) {
            await commands.executeCommand(PALETTE_COMMANDS.SAVE_ALL);
        }
        const { debugPort = -1, env = new Map(), programArgs = [] } = options;
        const commandArguments = [
            { key: "path", value: root },
            { key: "debugPort", value: debugPort },
            { key: "env", value: env },
            { key: "programArgs", value: programArgs }
        ];

        return await ballerinaExtInstance.langClient.executeCommand({
            command: "RUN",
            arguments: commandArguments,
        });
    } catch (error) {
        console.error('Error while executing the fast-run command:', error);
        return false;
    }
}

async function stopRunFast(root: string): Promise<boolean> {
    return await ballerinaExtInstance.langClient.executeCommand({
        command: "STOP", arguments: [
            { key: "path", value: root! }]
    });
}

async function getCurrentRoot(): Promise<string> {
    let file: string | undefined;
    try {
        file = getCurrentBallerinaFile();
    } catch (error) {
        // ignore
    }

    // If no Ballerina files are open, safe to assume that the workspace root is same as the package root in BI mode.
    if (!file) {
        const workspaceRoot = getWorkspaceRoot();
        if (!workspaceRoot && StateMachine.context().isBI) {
            throw new Error("Unable to determine the current workspace root.");
        }
        if (isBallerinaProject(workspaceRoot)) {
            return workspaceRoot;
        }
    }

    const currentProject = await getCurrentBallerinaProject(file);
    return (currentProject.kind !== PROJECT_TYPE.SINGLE_FILE) ? currentProject.path! : file;
}

function getWorkspaceRoot(): string | undefined {
    return workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function findFreePort(): Promise<number> {
    return getPortPromise({ port: 5010, stopPort: 20000 });
}

function isFastRunEnabled(): boolean {
    const config = workspace.getConfiguration('ballerina');
    return config.get<boolean>('enableRunFast');
}

function isBallerinaProject(projectPath: string): boolean {
    const ballerinaToml = path.join(projectPath, BALLERINA_TOML);
    return existsSync(ballerinaToml);
}