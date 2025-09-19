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
import { FnMetadata, ExpandedDMModel, IOType, LineRange, Mapping, ResultClauseType } from "@wso2/ballerina-core";
import { View } from "../../components/DataMapper/Views/DataMapperView";

export interface IDataMapperContext {
    model: ExpandedDMModel;
    views: View[];
    addView: (view: View) => void;
    applyModifications: (outputId: string, expression: string, viewId: string, name: string) => Promise<void>;
    addArrayElement: (outputId: string, viewId: string, name: string) => Promise<void>;
    hasInputsOutputsChanged: boolean;
    convertToQuery: (mapping: Mapping, clauseType: ResultClauseType, viewId: string, name: string) => Promise<void>;
    deleteMapping: (mapping: Mapping, viewId: string) => Promise<void>;
    deleteSubMapping: (index: number, viewId: string) => Promise<void>;
    mapWithCustomFn: (mapping: Mapping, metadata: FnMetadata, viewId: string) => Promise<void>;
    mapWithTransformFn: (mapping: Mapping, metadata: FnMetadata, viewId: string) => Promise<void>;
    goToFunction: (functionRange: LineRange) => Promise<void>;
    enrichChildFields: (parentField: IOType) => Promise<void>;
}

export class DataMapperContext implements IDataMapperContext {

    constructor(
        public model: ExpandedDMModel,
        public views: View[] = [],
        public addView: (view: View) => void,
        public applyModifications: (outputId: string, expression: string, viewId: string, name: string) => Promise<void>,
        public addArrayElement: (outputId: string, viewId: string, name: string) => Promise<void>,
        public hasInputsOutputsChanged: boolean = false,
        public convertToQuery: (mapping: Mapping, clauseType: ResultClauseType, viewId: string, name: string) => Promise<void>,
        public deleteMapping: (mapping: Mapping, viewId: string) => Promise<void>,
        public deleteSubMapping: (index: number, viewId: string) => Promise<void>,
        public mapWithCustomFn: (mapping: Mapping, metadata: FnMetadata, viewId: string) => Promise<void>,
        public mapWithTransformFn: (mapping: Mapping, metadata: FnMetadata, viewId: string) => Promise<void>,
        public goToFunction: (functionRange: LineRange) => Promise<void>,
        public enrichChildFields: (parentField: IOType) => Promise<void>
    ){}
}
