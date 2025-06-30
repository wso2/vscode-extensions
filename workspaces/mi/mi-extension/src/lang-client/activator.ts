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
    commands,
    ExtensionContext,
    extensions,
    IndentAction,
    LanguageConfiguration,
    languages,
    Position,
    TextDocument,
    window,
    workspace,
    RelativePattern,
    Uri,
} from 'vscode';
import * as path from 'path';
import {
    CloseAction,
    CloseHandlerResult,
    ErrorAction,
    ErrorHandlerResult,
    LanguageClientOptions,
    Message
} from 'vscode-languageclient';
import { ServerOptions } from "vscode-languageclient/node";
import { DidChangeConfigurationNotification } from 'vscode-languageserver-protocol';
import { ErrorType } from '@wso2/mi-core';
import { activateTagClosing, AutoCloseResult } from './tagClosing';
import { ExtendedLanguageClient } from './ExtendedLanguageClient';
import { GoToDefinitionProvider } from './DefinitionProvider';
import { FormattingProvider } from './FormattingProvider';

import util = require('util');
import { log } from '../util/logger';
import { getJavaHomeFromConfig } from '../util/onboardingUtils';
import { SELECTED_SERVER_PATH } from '../debugger/constants';
import { extension } from '../MIExtensionContext';
const exec = util.promisify(require('child_process').exec);

export interface ScopeInfo {
    scope: "default" | "global" | "workspace" | "folder";
    configurationTarget: boolean | undefined;
}

namespace TagCloseRequest {
    export const method: string = 'xml/closeTag';
}

// Error types
const ERRORS: Record<string, ErrorType> = {
    INCOMPATIBLE_JDK: {
        title: "Incompatible JDK Error",
        message: "Incompatible JDK version detected. Please install JDK 11 or above."
    },
    JAVA_HOME: {
        title: "Java Home Error",
        message: "JAVA_HOME is not set."
    },
    LANG_CLIENT_START: {
        title: "Lang Client Start Error",
        message: "Could not start the Synapse Language Server."
    },
    // Common error
    LANG_CLIENT: {
        title: "Lang Client Error",
        message: "Failed to launch the language client. Please check the output channel for more details."
    },
} as const;

type LangClientErrorType = (typeof ERRORS)[keyof typeof ERRORS];

let ignoreAutoCloseTags = false;
let vmArgsCache: any;
let ignoreVMArgs = false;
const main: string = 'org.eclipse.lemminx.XMLServerLauncher';

const versionRegex = /(\d+\.\d+\.?\d*)/g;

export class MILanguageClient {
    private static _instances: Map<string, MILanguageClient> = new Map();
    public languageClient: ExtendedLanguageClient | undefined;

    // eslint-disable-next-line @typescript-eslint/naming-convention
    private COMPATIBLE_JDK_VERSION = "11"; // Minimum JDK version required to run the language server
    private _errorStack: ErrorType[] = [];

    constructor(private projectUri: string) { }

    public static async getInstance(projectUri: string): Promise<MILanguageClient> {
        if (!this._instances.has(projectUri)) {
            const instance = new MILanguageClient(projectUri);
            await instance.launch(projectUri);
            this._instances.set(projectUri, instance);
        }
        return this._instances.get(projectUri)!;
    }

    public static async stopInstance(projectUri: string) {
        const instance = this._instances.get(projectUri);
        if (instance) {
            await instance.stop();
            this._instances.delete(projectUri);
        }
    }

    public static async getAllInstances(): Promise<MILanguageClient[]> {
        const instances: MILanguageClient[] = [];
        for (const instance of this._instances.values()) {
            instances.push(instance);
        }
        return instances;
    }

    public getErrors() {
        return this._errorStack;
    }

    private updateErrors(error: LangClientErrorType) {
        this._errorStack.push(error);
    }

    private isCompatibleJDKVersion(version: string): boolean {
        const match = version.match(versionRegex);
        if (match) {
            const jdkVersion = match[0].split(".")[0];
            if (parseInt(jdkVersion) < parseInt(this.COMPATIBLE_JDK_VERSION)) {
                return false;
            }
        }
        return true;
    }

    public async checkJDKCompatibility(javaHome: string): Promise<boolean> {
        const env = { ...process.env };
        env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${env.PATH}`;
        const { stderr } = await exec('java -version',
            { env: env }
        );
        const isCompatible = this.isCompatibleJDKVersion(stderr);
        return isCompatible;
    }

    private async launch(projectUri: string) {
        try {
            const JAVA_HOME = getJavaHomeFromConfig(this.projectUri);
            if (JAVA_HOME) {
                const isJDKCompatible = await this.checkJDKCompatibility(JAVA_HOME);
                if (!isJDKCompatible) {
                    const errorMessage = `Incompatible JDK version detected. Please install JDK ${this.COMPATIBLE_JDK_VERSION} or above.`;
                    window.showErrorMessage(errorMessage);
                    this.updateErrors(ERRORS.INCOMPATIBLE_JDK);
                    throw new Error(errorMessage);
                }
                let executable: string = path.join(JAVA_HOME, 'bin', 'java');
                let schemaPath = extension.context.asAbsolutePath(path.join("synapse-schemas", "synapse_config.xsd"));
                let langServerCP = extension.context.asAbsolutePath(path.join('ls', '*'));

                let schemaPathArg = '-DSCHEMA_PATH=' + schemaPath;
                const args: string[] = [schemaPathArg, '-cp', langServerCP];

                if (process.env.LSDEBUG === "true") {
                    const message = 'LSDEBUG is set to "true". Services will run on debug mode';
                    console.log(message);
                    log(message);
                    args.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005,quiet=y');
                }

                let serverOptions: ServerOptions = {
                    command: executable,
                    args: [...args, main],
                    options: {},
                };
                let workspaceFolder = workspace.getWorkspaceFolder(Uri.parse(this.projectUri));

                if (!workspaceFolder) {
                    throw new Error("Workspace folder not found.");
                }
                // Options to control the language client
                let clientOptions: LanguageClientOptions = {
                    initializationOptions: { "settings": getXMLSettings() },
                    workspaceFolder: workspaceFolder,
                    synchronize: {
                        //preferences starting with these will trigger didChangeConfiguration
                        configurationSection: ['xml', '[SynapseXml]'],
                        fileEvents: workspace.createFileSystemWatcher(new RelativePattern(workspaceFolder, '**/*.zip'))
                    },
                    // Register the server for synapse xml documents
                    documentSelector: [{ scheme: 'file', language: 'SynapseXml' }],
                    middleware: {
                        workspace: {
                            didChangeConfiguration: async () => {
                                this.languageClient!.sendNotification(DidChangeConfigurationNotification.method,
                                    { settings: getXMLSettings() });
                                if (!ignoreAutoCloseTags) {
                                    verifyAutoClosing();
                                }
                                !ignoreVMArgs ? verifyVMArgs() : undefined;
                            }
                        }
                    },
                    outputChannelName: 'Synapse Language Server',
                    initializationFailedHandler: (error) => {
                        console.log(error);
                        window.showErrorMessage("Could not start the Synapse Language Server.");
                        log(error.toString());
                        this.updateErrors(ERRORS.LANG_CLIENT_START);
                        return false;
                    },
                    errorHandler: {
                        error: (error: Error, message: Message | undefined, count: number | undefined): ErrorHandlerResult | Promise<ErrorHandlerResult> => {
                            console.error("Language Client Error:", error);
                            if (count && count >= 3) {
                                window.showWarningMessage(
                                    "The language server is returning errors. Please restart the editor.",
                                    "Reload",
                                    "Cancel"
                                ).then(selection => {
                                    if (selection === "Reload") {
                                        commands.executeCommand("workbench.action.reloadWindow");
                                    }
                                }); return { action: ErrorAction.Shutdown };
                            }
                            return { action: ErrorAction.Continue };
                        },
                        closed: (): CloseHandlerResult => {
                            window.showWarningMessage(
                                "The language client has closed unexpectedly. Please restart the editor.",
                                "Reload",
                                "Cancel"
                            ).then(selection => {
                                if (selection === "Reload") {
                                    commands.executeCommand("workbench.action.reloadWindow");
                                }
                            });
                            return { action: CloseAction.DoNotRestart };
                        }
                    }
                };

                // Create the language client and start the client.
                this.languageClient = new ExtendedLanguageClient('synapseXML', 'Synapse Language Server', this.projectUri,
                    serverOptions, clientOptions);
                await this.languageClient.start();

                //Setup autoCloseTags
                let tagProvider: (document: TextDocument, position: Position) => Thenable<AutoCloseResult> = (document: TextDocument, position: Position) => {
                    let param = this.languageClient!.code2ProtocolConverter.asTextDocumentPositionParams(document, position);
                    return this.languageClient!.sendRequest(TagCloseRequest.method, param);
                };

                activateTagClosing(tagProvider, { synapseXml: true, xsl: true },
                    'xml.completion.autoCloseTags');
                languages.setLanguageConfiguration('SynapseXml', getIndentationRules());
                registerDefinitionProvider(extension.context, this.languageClient);
                registerFormattingProvider(extension.context, this.languageClient);
            } else {
                log("Error: The JAVA_HOME environment variable is not defined. Please make sure to set the JAVA_HOME environment variable to the installation directory of your JDK.");
                this.updateErrors(ERRORS.JAVA_HOME);
                throw new Error("JAVA_HOME is not set");
            }
        } catch (error: any) {
            const errorMessage = "Failed to launch the language client. Please check the console for more details.";
            console.error(errorMessage, error);
            window.showErrorMessage(errorMessage);
            log(error.toString());
            this.updateErrors(ERRORS.LANG_CLIENT);
        }

        function getXMLSettings(): JSON {
            let configXML = workspace.getConfiguration().get('xml');
            let xml: any;
            if (!configXML) { //Set default preferences if not provided
                xml =
                {
                    xml: {
                        trace: {
                            server: 'verbose'
                        },
                        logs: {
                            client: true
                        },
                        format: {
                            enabled: false,
                            splitAttributes: false
                        },
                        completion: {
                            autoCloseTags: false
                        }
                    }
                };
            } else {
                let x: string = JSON.stringify(configXML); //configXML is not a JSON type
                JSON.parse(x);
                xml = { xml: JSON.parse(x) };

            }
            let extensionPath = extensions.getExtension("wso2.micro-integrator")!.extensionPath;
            const config = workspace.getConfiguration('MI', Uri.file(projectUri));
            const currentServerPath = config.get<string>(SELECTED_SERVER_PATH) || "";
            xml['xml']['extensionPath'] = [`${extensionPath}`];
            xml['xml']['miServerPath'] = currentServerPath;
            xml['xml']['catalogs'] = [`${extensionPath}/synapse-schemas/catalog.xml`];
            xml['xml']['useCache'] = true;
            return xml;
        }

        function verifyAutoClosing() {
            let configXML = workspace.getConfiguration();
            let closeTags = configXML.get("xml.completion.autoCloseTags");
            let x: any = configXML.get("[SynapseXml]");
            if (x) {
                let closeBrackets: any = x["editor.autoClosingBrackets"];
                if (closeTags && closeBrackets !== "never") {
                    window.showWarningMessage(
                        "The [SynapseXml].editor.autoClosingBrackets setting conflicts with " +
                        "xml.completion.autoCloseTags. It's recommended to disable it.",
                        "Disable", "Ignore")
                        .then((selection) => {
                            if (selection === "Disable") {
                                let scopeInfo: ScopeInfo = getScopeLevel("", "[SynapseXml]");
                                workspace.getConfiguration().update("[SynapseXml]",
                                    { "editor.autoClosingBrackets": "never" },
                                    scopeInfo.configurationTarget).then(
                                        () => console.log('[SynapseXml].editor.autoClosingBrackets globally set to never'),
                                        (error) => console.log(error)
                                    );
                            } else if (selection === "Ignore") {
                                ignoreAutoCloseTags = true;
                            }
                        });
                }
            }
        }

        function verifyVMArgs() {
            let currentVMArgs = workspace.getConfiguration("xml.server").get("vmargs");
            if (vmArgsCache !== undefined) {
                if (vmArgsCache !== currentVMArgs) {
                    window.showWarningMessage(
                        "XML Language Server configuration changed, please restart VS Code.",
                        "Restart",
                        "Ignore").then((selection: string | undefined) => {
                            if (selection === "Restart") {
                                commands.executeCommand("workbench.action.reloadWindow");
                            } else if (selection === "Ignore") {
                                ignoreVMArgs = true;
                            }
                        });
                }
            } else {
                vmArgsCache = currentVMArgs;
            }
        }

        function getScopeLevel(configurationKey: string, key: string): ScopeInfo {
            let configXML = workspace.getConfiguration(configurationKey);
            let result = configXML.inspect(key);
            let scope: "default" | "global" | "workspace" | "folder", configurationTarget;
            if (result && result.workspaceFolderValue === undefined) {
                if (result.workspaceValue === undefined) {
                    if (result.globalValue === undefined) {
                        scope = "default";
                        configurationTarget = true;
                    } else {
                        scope = "global";
                        configurationTarget = true;
                    }
                } else {
                    scope = "workspace";
                    configurationTarget = false;
                }
            } else {
                scope = "folder";
                configurationTarget = undefined;
            }
            return { "scope": scope, "configurationTarget": configurationTarget };
        }

        function getIndentationRules(): LanguageConfiguration {
            return {
                onEnterRules: [
                    {
                        beforeText: new RegExp(`<([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
                        afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>/i,
                        action: { indentAction: IndentAction.IndentOutdent }
                    },
                    {
                        beforeText: new RegExp(`<(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
                        action: { indentAction: IndentAction.Indent }
                    }
                ],
            };
        }

        function registerDefinitionProvider(context: ExtensionContext, langClient: ExtendedLanguageClient) {
            const gotoDefinitionProvider = new GoToDefinitionProvider(langClient);
            context.subscriptions.push(languages.registerDefinitionProvider("SynapseXml", gotoDefinitionProvider));
        }

        function registerFormattingProvider(context: ExtensionContext, langClient: ExtendedLanguageClient) {
            const formattingProvider = new FormattingProvider(langClient);
            context.subscriptions.push(languages.registerDocumentRangeFormattingEditProvider("SynapseXml", formattingProvider));
        }
    }

    public async stop() {
        if (this.languageClient) {
            return this.languageClient.stop();
        }
    }
}
