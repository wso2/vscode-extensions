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
import { Point } from "@projectstorm/geometry";
import { Block, VariableStatement } from "ts-morph";
import { DMType, TypeKind } from "@wso2/mi-core";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { useDMCollapsedFieldsStore, useDMSearchStore } from "../../../../store/store";
import { SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX } from "../../utils/constants";
import { getSearchFilteredInput } from "../../utils/search-utils";
import { getSubMappingTypes, getTypeForVariable } from "../../utils/type-utils";

export const SUB_MAPPING_SOURCE_NODE_TYPE = "datamapper-node-sub-mapping";
const NODE_ID = "sub-mapping-node";

export interface DMSubMapping {
    name: string;
    type: DMType;
    variableStmt: VariableStatement;
}

export class SubMappingNode extends DataMapperNodeModel {
    public subMappings: DMSubMapping[];
    public hasNoMatchingFields: boolean;
    public x: number;
    public numberOfFields:  number;

    constructor(
        public context: IDataMapperContext
    ) {
        super(
            NODE_ID,
            context,
            SUB_MAPPING_SOURCE_NODE_TYPE
        );
        this.numberOfFields = 1;
        this.subMappings = [];
    }

    async initPorts() {
        this.subMappings = [];
        const { functionST, subMappingTypes, views } = this.context;
        const searchValue = useDMSearchStore.getState().inputSearch;
        const variableStatements = (functionST.getBody() as Block).getVariableStatements();
        const focusedView = views[views.length - 1];
        const subMappingView = focusedView.subMappingInfo;

        variableStatements.forEach((stmt, index) => {
            // Constraint: Only one variable declaration is allowed in a local variable statement.

            if (subMappingView) {
                if (index >= subMappingView.index) {
                    // Skip the variable declarations that are after the focused sub-mapping
                    return;
                }
            }

            const varDecl = stmt.getDeclarations()[0];
            const varName = varDecl.getName();

            const typeWithoutFilter: DMType = getTypeForVariable(subMappingTypes, varDecl);

            const type: DMType = getSearchFilteredInput(typeWithoutFilter, varName);

            if (type) {
                const isCollapsedField = useDMCollapsedFieldsStore.getState().isCollapsedField;
                const parentPort = this.addPortsForHeader(
                    type, varName, "OUT", SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX, isCollapsedField
                );

                if (type.kind === TypeKind.Interface) {
                    const fields = type.fields;
                    fields.forEach(subField => {
                        this.numberOfFields += 1 + this.addPortsForInputField(
                            subField, "OUT", varName, varName, SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX,
                            parentPort, isCollapsedField, parentPort.collapsed
                        );
                    });
                } else {
                    this.numberOfFields += this.addPortsForInputField(
                        type, "OUT", varName, varName, SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX,
                        parentPort, isCollapsedField, parentPort.collapsed
                    );
                }

                this.subMappings.push({name: varName, type, variableStmt: stmt});
            }

        });

        this.hasNoMatchingFields = searchValue && this.subMappings.length === 0;
    }

    async initLinks() {
        // Links are always created from "IN" ports by backtracing the inputs.
    }

    setPosition(point: Point): void;
    setPosition(x: number, y: number): void;
    setPosition(x: unknown, y?: unknown): void {
        if (typeof x === 'number' && typeof y === 'number'){
            if (!this.x){
                this.x = x;
            }
            super.setPosition(this.x, y);
        }
    }
}
