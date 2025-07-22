/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import * as vscode from "vscode";
import * as path from "path";
import { SIMULATOR_WEBVIEW_ID, SIMULATOR_WEBVIEW_TITLE, UI_COMMAND_RESPONSES, UI_COMMANDS } from "../constants";
import { StateMachine } from "../stateMachine";
import { createRunningSiddhiAppMap } from "./activate";
import { feedSimulate, simulateSingleEvent } from "../debugger/debugHelper";
import { convertTypeToString, encodeToBase64, openFileAndGetContent } from "../utils/utils";
import { extension } from "../SIExtensionContext";
import { WebviewBase } from "./webview-base";

export class SimulatorVisualizerWebview extends WebviewBase {
    constructor() {
        super("simulator.html", SIMULATOR_WEBVIEW_ID, SIMULATOR_WEBVIEW_TITLE, vscode.ViewColumn.Beside);
    }

    public registerEventListeners() {
        this._panel!.webview.onDidReceiveMessage(
            async (message) => {
                const client = StateMachine.context().langClient;
                switch (message.command) {
                    case UI_COMMANDS.RETRIEVE_SIDDHI_APP_NAMES: {
                        this.publishMessageToWebview(
                            UI_COMMAND_RESPONSES.RETRIEVE_SIDDHI_APP_NAMES,
                            createRunningSiddhiAppMap()
                        );
                        break;
                    }

                    case UI_COMMANDS.RETRIEVE_STREAM_NAMES: {
                        const siddhiAppName = message.payload;
                        const encodedContent = await this.getEncodedSiddhiFileContent(siddhiAppName);
                        const content = await client?.getStreams(encodedContent, siddhiAppName);
                        if (!content || !content.streamNames) {
                            vscode.window.showErrorMessage("Failed to retrieve streams.");
                            return;
                        }
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.RETRIEVE_STREAM_NAMES, content.streamNames);
                        break;
                    }

                    case UI_COMMANDS.SINGLE_EVENT: {
                        const result = await simulateSingleEvent(message.siddhiAppName, message.singleEventConfig);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.SINGLE_EVENT, result);
                        break;
                    }

                    case UI_COMMANDS.SIMULATION_ACTION: {
                        const { siddhiAppName, action, simulationName } = message.payload;
                        const result = await feedSimulate(siddhiAppName, action, simulationName);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.SIMULATION_ACTION, result);
                        break;
                    }

                    case UI_COMMANDS.RETRIEVE_STEAM_ATTRIBUTES: {
                        const encodedContent = await this.getEncodedSiddhiFileContent(message.siddhiAppName);
                        const content = await client?.getStreamAttributes(
                            encodedContent,
                            message.streamName,
                            message.siddhiAppName
                        );
                        if (!content || !content.attributeList) {
                            vscode.window.showErrorMessage("Failed to retrieve stream attributes.");
                            return;
                        }
                        this.publishMessageToWebview(
                            UI_COMMAND_RESPONSES.RETRIEVE_STEAM_ATTRIBUTES,
                            convertTypeToString(content)
                        );
                        break;
                    }

                    case UI_COMMANDS.UPLOAD_SIMULATION: {
                        const result = await client?.addFeedSimulation(message.payload);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.UPLOAD_SIMULATION, result);
                        break;
                    }

                    case UI_COMMANDS.GET_FEED_SIMULATIONS: {
                        const result = await client?.getFeedSimulations(extension.runningSiddhiApps);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.GET_FEED_SIMULATIONS, result);
                        break;
                    }

                    case UI_COMMANDS.DELETE_SIMULATION: {
                        const { simulationName } = message.payload;
                        const result = await client?.deleteSimulation(simulationName);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.DELETE_SIMULATION, result);
                        break;
                    }

                    case UI_COMMANDS.UPDATE_SIMULATION: {
                        const { simulationName, simulationConfig } = message.payload;
                        const result = await client?.updateFeedSimulation(simulationName, simulationConfig);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.UPDATE_SIMULATION, result);
                        break;
                    }

                    case UI_COMMANDS.TEST_DATABASE_CONNECTIVITY: {
                        const { dataSourceLocation, driver, username, password } = message.payload;
                        const result = await client?.testDBConnection(dataSourceLocation, driver, username, password);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.TEST_DATABASE_CONNECTIVITY, result);
                        break;
                    }

                    case UI_COMMANDS.RETRIEVE_TABLE_NAMES: {
                        const { dataSourceLocation, driver, username, password } = message.payload;
                        const result = await client?.getDatabaseTables(dataSourceLocation, driver, username, password);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.RETRIEVE_TABLE_NAMES, result);
                        break;
                    }

                    case UI_COMMANDS.RETRIEVE_COLUMN_NAMES: {
                        const {
                            connectionDetails: { dataSourceLocation, driver, username, password },
                            tableName,
                        } = message.payload;
                        const result = await client?.getDatabaseTableColumns(
                            dataSourceLocation,
                            driver,
                            username,
                            password,
                            tableName
                        );
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.RETRIEVE_COLUMN_NAMES, result);
                        break;
                    }

                    case UI_COMMANDS.UPLOAD_CSV_FILE: {
                        const files = await vscode.window.showOpenDialog({ canSelectMany: false });
                        if (files && files.length > 0) {
                            const filePath = files[0].fsPath;
                            const result = await client?.uploadFile(filePath);
                            this.publishMessageToWebview(UI_COMMAND_RESPONSES.UPLOAD_CSV_FILE, result);
                        }

                        break;
                    }

                    case UI_COMMANDS.UPDATE_FILE: {
                        const files = await vscode.window.showOpenDialog({ canSelectMany: false });
                        if (files && files.length > 0) {
                            const filePath = files[0].fsPath;
                            const result = await client?.updateFile(filePath);
                            this.publishMessageToWebview(UI_COMMAND_RESPONSES.UPDATE_FILE, result);
                        }

                        break;
                    }

                    case UI_COMMANDS.DELETE_FILE: {
                        const { fileName } = message.payload;
                        const result = await client?.deleteFile(fileName);
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.DELETE_FILE, result);
                        break;
                    }

                    case UI_COMMANDS.RETRIEVE_CSV_FILE_NAMES: {
                        const result = await client?.getFileNames();
                        this.publishMessageToWebview(UI_COMMAND_RESPONSES.RETRIEVE_CSV_FILE_NAMES, result);
                        break;
                    }

                    default:
                        break;
                }
            },
            undefined,
            extension.context.subscriptions
        );
    }
    
    private async getEncodedSiddhiFileContent(siddhiFileName: string): Promise<string> {
        const fileContent = await openFileAndGetContent(
            vscode.Uri.file(path.join(vscode.workspace.workspaceFolders?.[0].uri.fsPath || "", siddhiFileName + ".siddhi"))
        );
        return encodeToBase64(fileContent);
    }
}
