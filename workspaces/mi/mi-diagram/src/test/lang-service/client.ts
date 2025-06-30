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

import * as fs from 'fs';
import path from "path";
import { readFileSync } from "fs";
import { GetSyntaxTreeParams, GetSyntaxTreeResponse, IMILangClient } from ".";
import { UpdateMediatorRequest, UpdateMediatorResponse } from '@wso2/mi-core';
const { spawn } = require('child_process');
const { StreamMessageReader, StreamMessageWriter, createMessageConnection } = require('vscode-jsonrpc');

const extensionRoot = path.join(__dirname, "..", "..", "..", "..", "mi-extension");
export class LanguageClient implements IMILangClient {
    connection: any;
    lsProcess: any;

    constructor() {
        this.connection = null;
        this.lsProcess = null;
    }

    async start() {
        const main: string = 'org.eclipse.lemminx.XMLServerLauncher';

        const { JAVA_HOME } = process.env;
        let executable: string = path.join(JAVA_HOME, 'bin', 'java');
        let schemaPath = path.join(extensionRoot, "synapse-schemas", "synapse_config.xsd");
        let langServerCP = path.join(extensionRoot, 'ls', '*');

        let schemaPathArg = '-DSCHEMA_PATH=' + schemaPath;
        const args: string[] = [schemaPathArg, '-cp', langServerCP];

        if (process.env.LSDEBUG === "true") {
            const message = 'LSDEBUG is set to "true". Services will run on debug mode';
            console.log(message);
            args.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005,quiet=y');
        }

        // Start the language server
        this.lsProcess = spawn(executable, [...args, main]);

        const reader = new StreamMessageReader(this.lsProcess.stdout);
        const writer = new StreamMessageWriter(this.lsProcess.stdin);

        this.connection = createMessageConnection(reader, writer);

        this.connection.listen();
        await this.initialize();

        this.lsProcess.stderr.on('data', (data: any) => {
            console.error(`Language Server Error: ${data}`);
        });
    }

    async initialize() {

        function getXMLSettings(): JSON {
            let xml: any;
            xml =
            {
                xml: {
                    trace: {
                        server: 'verbose'
                    },
                    logs: {
                        client: false
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

            xml['xml']['extensionPath'] = [extensionRoot];
            xml['xml']['miServerPath'] = "";
            xml['xml']['catalogs'] = [path.join(extensionRoot, "synapse-schemas", "catalog.xml")];
            xml['xml']['useCache'] = true;
            return xml;
        }

        let clientOptions: any = {
            initializationOptions: { "settings": getXMLSettings() },

            synchronize: {
                configurationSection: ['xml', '[SynapseXml]'],
            },
            documentSelector: [{ scheme: 'file', language: 'SynapseXml' }],
            initializationFailedHandler: (error: any) => {
                console.log(error);
                return false;
            }
        };
        const initializeParams = {
            processId: process.pid,
            capabilities: clientOptions.capabilities || {},
            initializationOptions: clientOptions.initializationOptions || {},
            trace: clientOptions.trace || 'off'
        };

        try {
            const result = await this.sendRequest('initialize', initializeParams);
            return result;
        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }

    private async sendRequest(method: string, params: any) {
        try {
            const result = await this.connection.sendRequest(method, params);
            return result;
        } catch (error) {
            console.error(`Error sending request ${method}:`, error);
        }
    }

    private async sendNotification(method: string, params: any) {
        try {
            await this.connection.sendNotification(method, params);
        } catch (error) {
            console.error(`Error sending notification ${method}:`, error);
        }
    }

    async getSyntaxTree(req: GetSyntaxTreeParams): Promise<GetSyntaxTreeResponse> {
        await this.didOpen(req.documentIdentifier.uri);
        return this.sendRequest('synapse/syntaxTree', { uri: `file://${req.documentIdentifier.uri}` });
    }

    async generateSynapseConfig(request: UpdateMediatorRequest): Promise<UpdateMediatorResponse> {
        return this.sendRequest("synapse/generateSynapseConfig", request);
    }

    async didOpen(fileUri: string): Promise<void> {
        if (fs.existsSync(fileUri) && fs.lstatSync(fileUri).isFile()) {
            const content: string = readFileSync(fileUri, { encoding: 'utf-8' });
            const didOpenParams = {
                textDocument: {
                    uri: `file://${fileUri}`,
                    languageId: 'xml',
                    version: 1,
                    text: content
                }
            };
            await this.sendNotification("textDocument/didOpen", didOpenParams);
        }
    }

    stop() {
        if (this.connection) {
            this.lsProcess.kill();
            this.connection.dispose();
        }
    }
}
