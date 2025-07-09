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
    AddArrayElementRequest,
    AddClausesRequest,
    ConvertToQueryRequest,
    EVENT_TYPE,
    GetInlineDataMapperCodedataRequest,
    GetInlineDataMapperCodedataResponse,
    GetSubMappingCodedataRequest,
    InitialIDMSourceRequest,
    InitialIDMSourceResponse,
    InlineAllDataMapperSourceRequest,
    InlineDataMapperAPI,
    InlineDataMapperModelRequest,
    InlineDataMapperModelResponse,
    InlineDataMapperSourceRequest,
    InlineDataMapperSourceResponse,
    MACHINE_VIEW,
    TextEdit,
    VisualizableFieldsRequest,
    VisualizableFieldsResponse
} from "@wso2/ballerina-core";

import { openView, StateMachine, updateInlineDataMapperView } from "../../stateMachine";
import { updateSourceCode } from "../../utils";
import { fetchDataMapperCodeData, updateAndRefreshDataMapper } from "./utils";

export let hasStopped: boolean = false;

export class InlineDataMapperRpcManager implements InlineDataMapperAPI {
    async getInitialIDMSource(params: InitialIDMSourceRequest): Promise<InitialIDMSourceResponse> {
        console.log(">>> requesting inline data mapper initial source from ls", params);
        return new Promise((resolve) => {
            StateMachine.langClient()
                .getSourceCode(params)
                .then(async (model) => {
                    console.log(">>> inline data mapper initial source from ls", model);
                    await updateSourceCode({ textEdits: model.textEdits });

                    let modelCodeData = params.flowNode.codedata;
                    if (modelCodeData.isNew) {
                        // Clone the object to avoid mutating the original reference
                        const clonedModelCodeData = { ...modelCodeData };
                        clonedModelCodeData.lineRange.startLine.line += 1;
                        clonedModelCodeData.lineRange.endLine.line += 1;
                        modelCodeData = clonedModelCodeData;
                    }

                    const varName = params.flowNode.properties?.variable?.value as string ?? null;
                    const codeData = await fetchDataMapperCodeData(params.filePath, modelCodeData, varName);
                    // const codeData = params.flowNode.codedata;
                    // const varName = params.flowNode.properties?.variable?.value as string ?? null;

                    openView(EVENT_TYPE.OPEN_VIEW, {
                        view: MACHINE_VIEW.InlineDataMapper,
                        documentUri: params.filePath,
                        position: {
                            startLine: codeData.lineRange.startLine.line,
                            startColumn: codeData.lineRange.startLine.offset,
                            endLine: codeData.lineRange.endLine.line,
                            endColumn: codeData.lineRange.endLine.offset
                        },
                        dataMapperMetadata: {
                            name: varName,
                            codeData: codeData
                        }
                    });
                    resolve({ textEdits: model.textEdits });
                })
                .catch((error) => {
                    console.log(">>> error fetching inline data mapper initial source from ls", error);
                    return new Promise((resolve) => {
                        resolve({ artifacts: [], error: error });
                    });
                });
        });
    }

    async getDataMapperModel(params: InlineDataMapperModelRequest): Promise<InlineDataMapperModelResponse> {
        return new Promise(async (resolve) => {
            const dataMapperModel = await StateMachine
                .langClient()
                .getInlineDataMapperMappings(params);

            resolve(dataMapperModel as InlineDataMapperModelResponse);
        });
    }

    async getDataMapperSource(params: InlineDataMapperSourceRequest): Promise<InlineDataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            StateMachine.langClient()
                .getInlineDataMapperSource(params)
                .then(async (resp) => {
                    console.log(">>> inline data mapper initial source from ls", resp);
                    updateAndRefreshDataMapper(resp.textEdits, params.filePath, params.codedata, params.varName);
                    resolve({ textEdits: resp.textEdits });
                });
        });
    }

    async getVisualizableFields(params: VisualizableFieldsRequest): Promise<VisualizableFieldsResponse> {
        return new Promise(async (resolve) => {
            const fieldIds = await StateMachine
                .langClient()
                .getVisualizableFields(params) as VisualizableFieldsResponse;

            resolve(fieldIds);
        });
    }

    async addNewArrayElement(params: AddArrayElementRequest): Promise<InlineDataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine.langClient()
                .addArrayElement({
                    filePath: params.filePath,
                    codedata: params.codedata,
                    targetField: params.targetField,
                    propertyKey: params.propertyKey
                })
                .then(async (resp) => {
                    console.log(">>> inline data mapper add array element response", resp);
                    updateAndRefreshDataMapper(resp.textEdits, params.filePath, params.codedata, params.varName);
                    resolve({ textEdits: resp.textEdits });
                });
        });
    }

    async convertToQuery(params: ConvertToQueryRequest): Promise<InlineDataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine.langClient()
                .convertToQuery(params)
                .then(async (resp) => {
                    console.log(">>> inline data mapper convert to query response", resp);
                    updateAndRefreshDataMapper(resp.textEdits, params.filePath, params.codedata, params.varName);
                    resolve({ textEdits: resp.textEdits });
                });
        });
    }

    async addClauses(params: AddClausesRequest): Promise<InlineDataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .addClauses(params)
                .then(async (resp) => {
                    console.log(">>> inline data mapper add clauses response", resp);
                    updateAndRefreshDataMapper(resp.textEdits, params.filePath, params.codedata, params.varName);
                    resolve({ textEdits: resp.textEdits });
                });
        });
    }

    async getDataMapperCodedata(params: GetInlineDataMapperCodedataRequest): Promise<GetInlineDataMapperCodedataResponse> {
        return new Promise(async (resolve) => {
            const dataMapperCodedata = await StateMachine
                .langClient()
                .getDataMapperCodedata(params) as GetInlineDataMapperCodedataResponse;

            resolve(dataMapperCodedata);
        });
    }

    async getSubMappingCodedata(params: GetSubMappingCodedataRequest): Promise<GetInlineDataMapperCodedataResponse> {
        return new Promise(async (resolve) => {
            const dataMapperCodedata = await StateMachine
                .langClient()
                .getSubMappingCodedata(params) as GetInlineDataMapperCodedataResponse;

            resolve(dataMapperCodedata);
        });
    }

    private buildSourceRequests(params: InlineAllDataMapperSourceRequest): InlineDataMapperSourceRequest[] {
        return params.mappings.map(mapping => ({
            filePath: params.filePath,
            codedata: params.codedata,
            varName: params.varName,
            targetField: params.targetField,
            mapping: mapping
        }));
    }

    private async processSourceRequests(requests: InlineDataMapperSourceRequest[]): Promise<PromiseSettledResult<InlineDataMapperSourceResponse>[]> {
        return Promise.allSettled(
            requests.map(async (request) => {
                if (hasStopped) {
                    throw new Error("Operation was stopped");
                }
                try {
                    return await StateMachine.langClient().getInlineDataMapperSource(request);
                } catch (error) {
                    console.error("Error in getDataMapperSource:", error);
                    throw error;
                }
            })
        );
    }

    private consolidateTextEdits(
        responses: PromiseSettledResult<InlineDataMapperSourceResponse>[],
        totalMappings: number
    ): { [key: string]: TextEdit[] } {
        const allTextEdits: { [key: string]: TextEdit[] } = {};

        responses.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`>>> Completed mapping ${index + 1}/${totalMappings}`);
                this.mergeTextEdits(allTextEdits, result.value.textEdits);
            } else {
                console.error(`>>> Failed mapping ${index + 1}:`, result.reason);
            }
        });

        return this.optimizeTextEdits(allTextEdits);
    }

    private mergeTextEdits(
        allTextEdits: { [key: string]: TextEdit[] },
        newTextEdits?: { [key: string]: TextEdit[] }
    ): void {
        if (!newTextEdits) { return; }

        Object.entries(newTextEdits).forEach(([key, edits]) => {
            if (!allTextEdits[key]) {
                allTextEdits[key] = [];
            }
            allTextEdits[key].push(...edits);
        });
    }

    private optimizeTextEdits(allTextEdits: { [key: string]: TextEdit[] }): { [key: string]: TextEdit[] } {
        const optimizedEdits: { [key: string]: TextEdit[] } = {};

        Object.entries(allTextEdits).forEach(([key, edits]) => {
            if (edits.length === 0) { return; }

            const sortedEdits = this.sortTextEdits(edits);
            const combinedEdit = this.combineTextEdits(sortedEdits);

            optimizedEdits[key] = [combinedEdit];
        });

        return optimizedEdits;
    }

    private sortTextEdits(edits: TextEdit[]): TextEdit[] {
        return edits.sort((a, b) => {
            if (a.range.start.line !== b.range.start.line) {
                return a.range.start.line - b.range.start.line;
            }
            return a.range.start.character - b.range.start.character;
        });
    }

    private combineTextEdits(edits: TextEdit[]): TextEdit {
        const formattedTexts = edits.map((edit, index) => {
            const text = edit.newText.trim();
            return index < edits.length - 1 ? `${text},` : text;
        });

        return {
            range: edits[0].range,
            newText: formattedTexts.join('\n').trimStart()
        };
    }

    private async updateSourceCode(params: { textEdits: { [key: string]: TextEdit[] } }): Promise<void> {
        try {
            await updateSourceCode(params);
        } catch (error) {
            console.error("Failed to update source code:", error);
            throw new Error("Source code update failed");
        }
    }

    private async updateInlineDataMapperView(params: InlineAllDataMapperSourceRequest): Promise<void> {
        try {
            const finalCodedataResp = await StateMachine
                .langClient()
                .getDataMapperCodedata({
                    filePath: params.filePath,
                    codedata: params.codedata,
                    name: params.varName
                });

            updateInlineDataMapperView(finalCodedataResp.codedata);
        } catch (error) {
            console.error("Failed to update inline data mapper view:", error);
            throw new Error("View update failed");
        }
    }

    async getAllDataMapperSource(params: InlineAllDataMapperSourceRequest): Promise<InlineDataMapperSourceResponse> {
        try {
            hasStopped = false;

            const sourceRequests = this.buildSourceRequests(params);
            const responses = await this.processSourceRequests(sourceRequests);
            const allTextEdits = this.consolidateTextEdits(responses, params.mappings.length);

            await this.updateSourceCode({ textEdits: allTextEdits });
            await this.updateInlineDataMapperView(params);

            return { textEdits: allTextEdits };
        } catch (error) {
            console.error("Error in getAllDataMapperSource:", error);
            return {
                error: error instanceof Error ? error.message : "Unknown error occurred",
                userAborted: hasStopped
            };
        }
    }
}
