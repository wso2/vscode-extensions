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
    ConvertToQueryRequest,
    AddClausesRequest,
    DataMapperModelRequest,
    DataMapperModelResponse,
    DataMapperSourceRequest,
    DataMapperSourceResponse,
    VisualizableFieldsRequest,
    VisualizableFieldsResponse,
    PropertyRequest,
    PropertyResponse,
    InitialIDMSourceResponse,
    InitialIDMSourceRequest,
    GetDataMapperCodedataRequest,
    GetDataMapperCodedataResponse,
    GetSubMappingCodedataRequest,
    AllDataMapperSourceRequest,
    AddSubMappingRequest,
    DeleteMappingRequest,
    DeleteSubMappingRequest,
    MapWithFnRequest,
    DMModelRequest,
    ProcessTypeReferenceResponse,
    ProcessTypeReferenceRequest,
    ExpandedDMModelResponse
} from "../../interfaces/extended-lang-client";
import { RequestType } from "vscode-messenger-common";

const _preFix = "data-mapper";
export const getInitialIDMSource: RequestType<InitialIDMSourceRequest, InitialIDMSourceResponse> = { method: `${_preFix}/getInitialIDMSource` };
export const getDataMapperModel: RequestType<DataMapperModelRequest, DataMapperModelResponse> = { method: `${_preFix}/getDataMapperModel` };
export const getDataMapperSource: RequestType<DataMapperSourceRequest, DataMapperSourceResponse> = { method: `${_preFix}/getDataMapperSource` };
export const getVisualizableFields: RequestType<VisualizableFieldsRequest, VisualizableFieldsResponse> = { method: `${_preFix}/getVisualizableFields` };
export const addNewArrayElement: RequestType<AddArrayElementRequest, DataMapperSourceResponse> = { method: `${_preFix}/addNewArrayElement` };
export const convertToQuery: RequestType<ConvertToQueryRequest, DataMapperSourceResponse> = { method: `${_preFix}/convertToQuery` };
export const addClauses: RequestType<AddClausesRequest, DataMapperSourceResponse> = { method: `${_preFix}/addClauses` };
export const addSubMapping: RequestType<AddSubMappingRequest, DataMapperSourceResponse> = { method: `${_preFix}/addSubMapping` };
export const deleteMapping: RequestType<DeleteMappingRequest, DataMapperSourceResponse> = { method: `${_preFix}/deleteMapping` };
export const deleteSubMapping: RequestType<DeleteSubMappingRequest, DataMapperSourceResponse> = { method: `${_preFix}/deleteSubMapping` };
export const mapWithCustomFn: RequestType<MapWithFnRequest, DataMapperSourceResponse> = { method: `${_preFix}/mapWithCustomFn` };
export const mapWithTransformFn: RequestType<MapWithFnRequest, DataMapperSourceResponse> = { method: `${_preFix}/mapWithTransformFn` };
export const getDataMapperCodedata: RequestType<GetDataMapperCodedataRequest, GetDataMapperCodedataResponse> = { method: `${_preFix}/getDataMapperCodedata` };
export const getSubMappingCodedata: RequestType<GetSubMappingCodedataRequest, GetDataMapperCodedataResponse> = { method: `${_preFix}/getSubMappingCodedata` };
export const getAllDataMapperSource: RequestType<AllDataMapperSourceRequest, DataMapperSourceResponse> = { method: `${_preFix}/getAllDataMapperSource` };
export const getProperty: RequestType<PropertyRequest, PropertyResponse> = { method: `${_preFix}/getProperty` };
export const getExpandedDMFromDMModel: RequestType<DMModelRequest, ExpandedDMModelResponse> = { method: `${_preFix}/getExpandedDMFromDMModel` };
export const getProcessTypeReference: RequestType<ProcessTypeReferenceRequest, ProcessTypeReferenceResponse> = { method: `${_preFix}/getProcessTypeReference` };
