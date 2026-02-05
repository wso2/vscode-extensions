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
} from "@wso2/arazzo-designer-core";
import { getLanguageClient } from '../../extension';
import { openView as stateMachineOpenView } from '../../stateMachine';

export class VisualizerRpcManager implements VisualizerAPI {
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
}
