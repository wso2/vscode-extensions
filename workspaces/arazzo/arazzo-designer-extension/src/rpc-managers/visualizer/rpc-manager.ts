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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import {
    VisualizerAPI,
    GoToSourceRequest,
    HistoryEntry,
    HistoryEntryResponse,
    OpenViewRequest,
    GetArazzoModelRequest,
    GetArazzoModelResponse,
    ArazzoDefinition,
    RunWorkflowRequest,
    GetWorkflowRunInputsRequest,
    GetWorkflowRunInputsResponse,
    SaveWorkflowRunInputsRequest,
} from "@wso2/arazzo-designer-core";
import * as vscode from 'vscode';
import { getLanguageClient } from '../../extension';
import { openView as stateMachineOpenView } from '../../stateMachine';

const RUN_INPUTS_STATE_KEY = 'arazzo.runInputs.v1';

type RunInputsStore = {
    [fileUri: string]: {
        [workflowId: string]: {
            inputs: Record<string, any>;
            updatedAt: number;
        };
    };
};

export class VisualizerRpcManager implements VisualizerAPI {
    private _context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }

    async openView(params: OpenViewRequest): Promise<void> {
        stateMachineOpenView(params.type, params.location);
    }

    async goBack(): Promise<void> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }

    async getHistory(): Promise<HistoryEntryResponse> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }

    async addToHistory(params: HistoryEntry): Promise<void> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }

    async goHome(): Promise<void> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }

    async goToSource(params: GoToSourceRequest): Promise<void> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }

    async getArazzoModel(params: GetArazzoModelRequest): Promise<GetArazzoModelResponse> {
        const languageClient = getLanguageClient();
        if (!languageClient) {
            throw new Error('Language server is not available');
        }

        const result = await languageClient.sendRequest<ArazzoDefinition>(
            'arazzo/getModel',
            { uri: params.uri }
        );
        return { model: result };
    }

    async runWorkflow(params: RunWorkflowRequest): Promise<void> {
        const command = params.mode === 'curl' ? 'arazzo.tryWorkflow' : 'arazzo.tryAIWorkflow';
        await vscode.commands.executeCommand(command, params);
    }

    async getWorkflowRunInputs(params: GetWorkflowRunInputsRequest): Promise<GetWorkflowRunInputsResponse> {
        const store = this._context.workspaceState.get<RunInputsStore>(RUN_INPUTS_STATE_KEY, {});
        const inputs = store[params.uri]?.[params.workflowId]?.inputs;
        return { inputs };
    }

    async saveWorkflowRunInputs(params: SaveWorkflowRunInputsRequest): Promise<void> {
        const store = this._context.workspaceState.get<RunInputsStore>(RUN_INPUTS_STATE_KEY, {});
        if (!store[params.uri]) {
            store[params.uri] = {};
        }
        store[params.uri][params.workflowId] = {
            inputs: params.inputs,
            updatedAt: Date.now(),
        };
        await this._context.workspaceState.update(RUN_INPUTS_STATE_KEY, store);
    }
}
