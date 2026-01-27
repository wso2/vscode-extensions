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
import { HistoryEntry } from "../../history";
import { EVENT_TYPE, PopupVisualizerLocation, VisualizerLocation } from "../../state-machine-types";

export interface OpenViewRequest {
    type: EVENT_TYPE;
    location: VisualizerLocation | PopupVisualizerLocation;
    isPopup?: boolean;
}

export interface HistoryEntryResponse {
    history: HistoryEntry[];
}

export interface GoToSourceRequest {
    filePath: string;
    position?: Range;
}

export interface Range {
    start: {
        line: number;
        column: number;
    };
    end: {
        line: number;
        column: number;
    };
}

export interface GetOpenAPIContentResponse {
    content: string;
    type: "yaml" | "json" | undefined;
}

export interface GetOpenAPIContentRequest {
    filePath: string;
}

export interface WriteOpenAPIContentRequest {
    filePath: string;
    content: string;
}

export interface WriteOpenAPIContentResponse {
    success: boolean;
}

export interface Schema {
    $schema?: string;
    $id?: string;
    title?: string;
    description?: string;
    type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null' | ('string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null')[];
    properties?: { [propertyName: string]: Schema };
    items?: Schema | Schema[];
    required?: string[];
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number;
    minimum?: number;
    exclusiveMinimum?: number;
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    maxItems?: number;
    minItems?: number;
    uniqueItems?: boolean;
    maxContains?: number;
    minContains?: number;
    maxProperties?: number;
    minProperties?: number;
    allOf?: Schema[];
    anyOf?: Schema[];
    oneOf?: Schema[];
    not?: Schema;
    if?: Schema;
    then?: Schema;
    else?: Schema;
    format?: string;
    contentMediaType?: string;
    contentEncoding?: string;
    definitions?: { [key: string]: Schema };
    $ref?: string;
}
