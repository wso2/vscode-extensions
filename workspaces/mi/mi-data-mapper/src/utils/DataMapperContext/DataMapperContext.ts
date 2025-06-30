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
import { DMDiagnostic, DMType, Range } from "@wso2/mi-core";
import { FunctionDeclaration, PropertyAssignment, ReturnStatement, VariableStatement } from "ts-morph";

import { View } from "../../components/DataMapper/Views/DataMapperView";

type FocusedST = FunctionDeclaration | PropertyAssignment | ReturnStatement | VariableStatement;

export interface IDataMapperContext {
    functionST: FunctionDeclaration;
    focusedST: FocusedST;
    inputTrees: DMType[];
    outputTree: DMType;
    recursiveTypes: Record<string, DMType>,
    subMappingTypes: Record<string, DMType>;
    views: View[];
    diagnostics: DMDiagnostic[];
    addView: (view: View) => void;
    goToSource: (range: Range) => void;
    applyModifications: (fileContent: string) => Promise<void>;
}

export class DataMapperContext implements IDataMapperContext {

    constructor(
        public functionST: FunctionDeclaration,
        public focusedST: FocusedST,
        public inputTrees: DMType[],
        public outputTree: DMType,
        public recursiveTypes: Record<string, DMType>,
        public subMappingTypes: Record<string, DMType>,
        public views: View[] = [],
        public diagnostics: DMDiagnostic[],
        public addView: (view: View) => void,
        public goToSource: (range: Range) => void,
        public applyModifications: (fileContent: string) => Promise<void>
    ){}
}
