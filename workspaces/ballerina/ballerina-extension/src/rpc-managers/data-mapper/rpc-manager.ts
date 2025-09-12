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
    AddSubMappingRequest,
    AllDataMapperSourceRequest,
    ConvertToQueryRequest,
    DataMapperAPI,
    DataMapperModelRequest,
    DataMapperModelResponse,
    DataMapperSourceRequest,
    DataMapperSourceResponse,
    DeleteMappingRequest,
    DeleteSubMappingRequest,
    DMModelRequest,
    ExpandedDMModel,
    ExpandedDMModelResponse,
    GetDataMapperCodedataRequest,
    GetDataMapperCodedataResponse,
    GetSubMappingCodedataRequest,
    InitialIDMSourceRequest,
    InitialIDMSourceResponse,
    MapWithFnRequest,
    ProcessTypeReferenceRequest,
    ProcessTypeReferenceResponse,
    PropertyRequest,
    PropertyResponse,
    VisualizableFieldsRequest,
    VisualizableFieldsResponse
} from "@wso2/ballerina-core";

import { StateMachine } from "../../stateMachine";

import {
    buildSourceRequests,
    consolidateTextEdits,
    expandDMModel,
    processSourceRequests,
    processTypeReference,
    setHasStopped,
    updateAndRefreshDataMapper,
    updateSource
} from "./utils";

export class DataMapperRpcManager implements DataMapperAPI {
    async getInitialIDMSource(params: InitialIDMSourceRequest): Promise<InitialIDMSourceResponse> {
        console.log(">>> requesting data mapper initial source from ls", params);
        return new Promise((resolve) => {
            StateMachine
                .langClient()
                .getSourceCode(params)
                .then(model => {
                    console.log(">>> Data mapper initial source from ls", model);
                    const varName = params.flowNode.properties?.variable?.value as string ?? null;
                    updateSource(model.textEdits, params.filePath, params.flowNode.codedata, varName)
                        .then(codeData => {
                            resolve({ textEdits: model.textEdits, codedata: codeData });
                        });
                })
                .catch((error) => {
                    console.log(">>> error fetching data mapper initial source from ls", error);
                    return new Promise((resolve) => {
                        resolve({ artifacts: [], error: error });
                    });
                });
        });
    }

    async getDataMapperModel(params: DataMapperModelRequest): Promise<DataMapperModelResponse> {
        return new Promise(async (resolve) => {
            const dataMapperModel = await StateMachine
                .langClient()
                .getDataMapperMappings(params);
            resolve(dataMapperModel as DataMapperModelResponse);
        });
    }

    async getDataMapperSource(params: DataMapperSourceRequest): Promise<DataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            StateMachine
                .langClient()
                .getDataMapperSource(params)
                .then((resp) => {
                    console.log(">>> Data mapper initial source from ls", resp);
                    updateAndRefreshDataMapper(
                        resp.textEdits,
                        params.filePath,
                        params.codedata,
                        params.varName,
                        params.targetField,
                        params.subMappingName
                    )
                    .then(() => {
                        resolve({ textEdits: resp.textEdits });
                    });
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

    async addNewArrayElement(params: AddArrayElementRequest): Promise<DataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .addArrayElement({
                    filePath: params.filePath,
                    codedata: params.codedata,
                    targetField: params.targetField,
                    propertyKey: params.propertyKey
                })
                .then((resp) => {
                    console.log(">>> Data mapper add array element response", resp);
                    updateAndRefreshDataMapper(
                        resp.textEdits,
                        params.filePath,
                        params.codedata,
                        params.varName,
                        params.targetField,
                        params.subMappingName
                    )
                    .then(() => {
                        resolve({ textEdits: resp.textEdits });
                    });
                });
        });
    }

    async convertToQuery(params: ConvertToQueryRequest): Promise<DataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .convertToQuery(params)
                .then((resp) => {
                    console.log(">>> Data mapper convert to query response", resp);
                    updateAndRefreshDataMapper(
                        resp.textEdits,
                        params.filePath,
                        params.codedata,
                        params.varName,
                        params.targetField,
                        params.subMappingName
                    )
                    .then(() => {
                        resolve({ textEdits: resp.textEdits });
                    });
                });
        });
    }

    async addClauses(params: AddClausesRequest): Promise<DataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .addClauses(params)
                .then((resp) => {
                    console.log(">>> Data mapper add clauses response", resp);
                    updateAndRefreshDataMapper(
                        resp.textEdits,
                        params.filePath,
                        params.codedata,
                        params.varName,
                        params.targetField,
                        params.subMappingName
                    )
                    .then(() => {
                        resolve({ textEdits: resp.textEdits });
                    });
                });
        });
    }

    async addSubMapping(params: AddSubMappingRequest): Promise<DataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .addSubMapping(params)
                .then((resp) => {
                    console.log(">>> Data mapper add sub mapping response", resp);
                    updateAndRefreshDataMapper(resp.textEdits, params.filePath, params.codedata, params.varName)
                    .then(() => {
                        resolve({ textEdits: resp.textEdits });
                    });
                });
        });
    }

    async getDataMapperCodedata(params: GetDataMapperCodedataRequest): Promise<GetDataMapperCodedataResponse> {
        return new Promise(async (resolve) => {
            const dataMapperCodedata = await StateMachine
                .langClient()
                .getDataMapperCodedata(params) as GetDataMapperCodedataResponse;

            resolve(dataMapperCodedata);
        });
    }

    async getSubMappingCodedata(params: GetSubMappingCodedataRequest): Promise<GetDataMapperCodedataResponse> {
        return new Promise(async (resolve) => {
            const dataMapperCodedata = await StateMachine
                .langClient()
                .getSubMappingCodedata(params) as GetDataMapperCodedataResponse;

            resolve(dataMapperCodedata);
        });
    }

    async getAllDataMapperSource(params: AllDataMapperSourceRequest): Promise<DataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            setHasStopped(false);

            const sourceRequests = buildSourceRequests(params);
            const responses = await processSourceRequests(sourceRequests);
            const allTextEdits = consolidateTextEdits(responses, params.mappings.length);
            resolve ({ textEdits: allTextEdits });
        });
    }

    async getProperty(params: PropertyRequest): Promise<PropertyResponse> {
        return new Promise(async (resolve) => {
            const property = await StateMachine
                .langClient()
                .getProperty(params) as PropertyResponse;

            resolve(property);
        });
    }

    async deleteMapping(params: DeleteMappingRequest): Promise<DataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .deleteMapping(params)
                .then((resp) => {
                    console.log(">>> Data mapper delete mapping response", resp);
                    updateAndRefreshDataMapper(
                        resp.textEdits,
                        params.filePath,
                        params.codedata,
                        params.varName,
                        params.targetField,
                        params.subMappingName
                    )
                    .then(() => {
                        resolve({ textEdits: resp.textEdits });
                    });
                });
        });
    }

    async mapWithCustomFn(params: MapWithFnRequest): Promise<DataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .mapWithCustomFn(params)
                .then((resp) => {
                    console.log(">>> Data mapper map with custom fn response", resp);
                    updateAndRefreshDataMapper(
                        resp.textEdits,
                        params.filePath,
                        params.codedata,
                        params.varName,
                        params.targetField,
                        params.subMappingName
                    )
                    .then(() => {
                        resolve({ textEdits: resp.textEdits });
                    });
                });
        });
    }

     async getExpandedDMFromDMModel(params: DMModelRequest): Promise<ExpandedDMModelResponse> {
        try {
            const { model, rootViewId, options = {} } = params;

            // Validate input parameters
            if (!model) {
                throw new Error("DMModel is required for transformation");
            }

            if (!rootViewId) {
                throw new Error("rootViewId is required for transformation");
            }

            // Transform the model using the existing expansion logic
            const expandedModel = expandDMModel(model, rootViewId);

            return {
                expandedModel,
                success: true
            };
        } catch (error) {
            return {
                expandedModel: {} as ExpandedDMModel,
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred during transformation"
            };
        }
    }

    async getProcessTypeReference(params: ProcessTypeReferenceRequest): Promise<ProcessTypeReferenceResponse> {
        try {
            const { ref, fieldId, model, visitedRefs = new Set<string>() } = params;

            if (!ref || !fieldId || !model) {
                throw new Error("ref, fieldId, and model are required parameters");
            }

            const result = processTypeReference(ref, fieldId, model, visitedRefs);

            return {
                result,
                success: true
            };
        } catch (error) {
            return {
                result: {},
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred during type reference processing"
            };
        }
    }

    async mapWithTransformFn(params: MapWithFnRequest): Promise<DataMapperSourceResponse> {
        return new Promise(async (resolve) => {
            await StateMachine
                .langClient()
                .mapWithTransformFn(params)
                .then((resp) => {
                    console.log(">>> Data mapper map with transform fn response", resp);
                    updateAndRefreshDataMapper(
                        resp.textEdits,
                        params.filePath,
                        params.codedata,
                        params.varName,
                        params.targetField,
                        params.subMappingName
                    )
                    .then(() => {
                        resolve({ textEdits: resp.textEdits });
                    });
                });
        });
    }

    async deleteSubMapping(params: DeleteSubMappingRequest): Promise<DataMapperSourceResponse> {
        // ADD YOUR IMPLEMENTATION HERE
        throw new Error('Not implemented');
    }
}
