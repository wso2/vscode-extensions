/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import { InitializedEvent, LoggingDebugSession, TerminatedEvent } from "vscode-debugadapter";
import { DebugProtocol } from "vscode-debugprotocol";
import * as vscode from "vscode";
import { startSiddhiApp, stopSiddhiApplication } from "./debugHelper";
import { getJavaHome, getServerPath } from "../utils/onboardingUtils";
import { VS_CODE_COMMANDS } from "../constants";
import { DebuggerConfig } from "./config";
import { Subject } from "await-notify";
import { debug } from "../utils/logger";

interface ILaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    env?: any;
    vmArgs?: string[];
    program?: string;
}

export class SiDebugAdapter extends LoggingDebugSession {
    private _configurationDone = new Subject();
    private siddhiAppName: string;

    public constructor(siddhiApp: string) {
        super();
        this.siddhiAppName = siddhiApp;
        this.setDebuggerLinesStartAt1(false);
        this.setDebuggerColumnsStartAt1(false);
    }

    protected initializeRequest(
        response: DebugProtocol.InitializeResponse,
        args: DebugProtocol.InitializeRequestArguments
    ): void {
        response.body = response.body || {};
        this.sendResponse(response);
        this.sendEvent(new InitializedEvent());
    }

    protected configurationDoneRequest(
        response: DebugProtocol.ConfigurationDoneResponse,
        args: DebugProtocol.ConfigurationDoneArguments,
        request?: DebugProtocol.Request | undefined
    ): void {
        super.configurationDoneRequest(response, args, request);
        this._configurationDone.notify();
    }

    protected launchRequest(
        response: DebugProtocol.LaunchResponse,
        args?: ILaunchRequestArguments,
        request?: DebugProtocol.Request
    ): void {
        getServerPath().then((serverPath) => {
            if (!serverPath) {
                const message = `Unable to locate the server path`;
                this.showErrorAndExecuteChangeServerPath(message);
                this.sendError(response, 1, message);
            } else {
                getJavaHome().then((javaHome) => {
                    if (!javaHome) {
                        const message = `Unable to locate the java home.`;
                        this.showErrorAndExecuteChangeJavaHome(message);
                        this.sendError(response, 1, message);
                    } else {
                        DebuggerConfig.setEnvVariables(args?.env ? args?.env : {});
                        DebuggerConfig.setVmArgs(args?.vmArgs ? args?.vmArgs : []);
                        vscode.commands.executeCommand("setContext", "SI.isRunning", "true");

                        startSiddhiApp(serverPath, javaHome!, args!.program!)
                            .then(async () => {
                                this.sendResponse(response);
                            })
                            .catch((error) => {
                                vscode.commands.executeCommand("setContext", "SI.isRunning", "false");
                                const completeError = `Error while launching run and debug: ${error}`;
                                vscode.window.showErrorMessage(completeError);
                                this.sendError(response, 1, completeError);
                            });
                    }
                });
            }
        });
    }

    protected async disconnectRequest(
        response: DebugProtocol.DisconnectResponse,
        args?: DebugProtocol.DisconnectArguments,
        request?: DebugProtocol.Request
    ): Promise<void> {
        vscode.commands.executeCommand("setContext", "SI.isRunning", "false");
        debug("Disconnecting from the debugger..." + this.siddhiAppName);
        try {
            await stopSiddhiApplication(this.siddhiAppName);
            this.sendEvent(new TerminatedEvent());
        } catch (error) {
            const completeError = `Error while stopping the siddhi application: ${error}`;
            this.sendError(response, 3, completeError);
        }
    }

    private sendError(response: DebugProtocol.Response, errorCode: number, errorMessage: string) {
        response.success = false;
        this.sendErrorResponse(response, {
            id: errorCode,
            format: errorMessage,
            showUser: false,
        });
    }

    private showErrorAndExecuteChangeServerPath(completeError: string) {
        vscode.window.showErrorMessage(completeError, "Change Server Path").then((selection) => {
            if (selection) {
                vscode.commands.executeCommand(VS_CODE_COMMANDS.CHANGE_SERVER_PATH);
            }
        });
    }

    private showErrorAndExecuteChangeJavaHome(completeError: string) {
        vscode.window.showErrorMessage(completeError, "Change Java Home").then((selection) => {
            if (selection) {
                vscode.commands.executeCommand(VS_CODE_COMMANDS.CHANGE_JAVA_HOME);
            }
        });
    }
}
