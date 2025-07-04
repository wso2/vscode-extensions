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
import { DMType, TypeKind } from "@wso2/mi-core";
import { Expression, CallExpression, Node } from "ts-morph";

import { useDMCollapsedFieldsStore, useDMSearchStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { ExpressionLabelModel } from "../../Label";
import { DataMapperLinkModel } from "../../Link";
import { DMTypeWithValue } from "../../Mappings/DMTypeWithValue";
import { MappingMetadata } from "../../Mappings/MappingMetadata";
import { InputOutputPortModel } from "../../Port";
import { PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX } from "../../utils/constants";
import {
    findInputNode,
    getDefaultValue,
    getInputPort,
    getOutputPort,
    getTypeName,
    isArrayOrInterface,
    isMapFnAtPropAssignment,
    isMapFnAtRootReturn
} from "../../utils/common-utils";
import { getEnrichedDMType } from "../../utils/type-utils";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { getFilteredMappings } from "../../utils/search-utils";
import { filterDiagnosticsForNode } from "../../utils/diagnostics-utils";

export const PRIMITIVE_OUTPUT_NODE_TYPE = "data-mapper-node-primitive-output";
const NODE_ID = "primitive-output-node";

export class PrimitiveOutputNode extends DataMapperNodeModel {

    public dmType: DMType;
    public dmTypeWithValue: DMTypeWithValue;
    public typeName: string;
    public hasNoMatchingFields: boolean;
    public x: number;
    public y: number;
    public isMapFn: boolean;

    constructor(
        public context: IDataMapperContext,
        public value: Expression | undefined,
        public originalType: DMType,
        public isSubMapping: boolean = false
    ) {
        super(
            NODE_ID,
            context,
            PRIMITIVE_OUTPUT_NODE_TYPE
        );
        this.dmType = this.originalType;
    }

    async initPorts() {
        if (this.dmType) {
            const { focusedST, functionST, views } = this.context;
            const isCollapsedField = useDMCollapsedFieldsStore.getState().isCollapsedField;
            const valueEnrichedType = getEnrichedDMType(this.dmType, this.value, this.context.recursiveTypes);
            const searchValue = useDMSearchStore.getState().outputSearch;
            const isMapFnAtPropAsmt = isMapFnAtPropAssignment(focusedST);
            const isMapFnAtRootRtn = views.length > 1 && isMapFnAtRootReturn(functionST, focusedST);
            this.isMapFn = isMapFnAtPropAsmt || isMapFnAtRootRtn;

            this.typeName = getTypeName(valueEnrichedType.type);
            this.dmTypeWithValue = valueEnrichedType;
            this.hasNoMatchingFields = searchValue && !this.value.getText().includes(searchValue);
            
            if (valueEnrichedType.type.kind === TypeKind.Array && this.isMapFn) {
                this.dmTypeWithValue = valueEnrichedType.elements[0].member;
            }
            const parentPort = this.addPortsForHeader(
                this.dmType, '', "IN", PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX,
                isCollapsedField, this.dmTypeWithValue, this.isMapFn
            );
            this.addPortsForOutputField(
                this.dmTypeWithValue, "IN", this.dmTypeWithValue.type.kind, undefined,
                PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX, parentPort, isCollapsedField, parentPort.collapsed, this.isMapFn
            );
        }
    }

    initLinks(): void {
        if (!this.value) {
            return;
        }
        const searchValue = useDMSearchStore.getState().outputSearch;
        const mappings = this.genMappings(this.value);
        const filteredMappings = getFilteredMappings(mappings, searchValue);
        this.createLinks(filteredMappings);
    }

    private createLinks(mappings: MappingMetadata[]) {
        mappings.forEach((mapping) => {
            let outPort: InputOutputPortModel;
            let mappedOutPort: InputOutputPortModel;
            let inPort: InputOutputPortModel;

            const { fields, value, otherVal } = mapping;
            const field = fields[fields.length - 1];

            if (!value || !value.getText() || (otherVal && (Node.isCallExpression(otherVal) || Node.isBinaryExpression(otherVal)))) {
                // Unsupported mapping
                return;
            }

            const inputNode = findInputNode(value, this);

            if (inputNode) {
                inPort = getInputPort(inputNode, value);
            }

            if (!isArrayOrInterface(this.dmTypeWithValue.type)) {
                outPort = this.getPort(`${PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX}.${
                    this.dmTypeWithValue.type.kind}.IN`) as InputOutputPortModel;
                mappedOutPort = outPort;
            } else {
                [outPort, mappedOutPort] = getOutputPort(
                    fields, this.dmTypeWithValue, PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX,
                    (portId: string) =>  this.getPort(portId) as InputOutputPortModel
                );
            }
            if (inPort && mappedOutPort) {
                let targetNodeForDiagnostics = otherVal || value;
                if (Node.isVariableStatement(this.context.focusedST)) {
                    targetNodeForDiagnostics = this.context.focusedST;
                }
                const diagnostics = filterDiagnosticsForNode(this.context.diagnostics, targetNodeForDiagnostics);
                const lm = new DataMapperLinkModel(value, diagnostics, true);

                lm.setTargetPort(mappedOutPort);
                lm.setSourcePort(inPort);
                inPort.addLinkedPort(mappedOutPort);

                lm.addLabel(new ExpressionLabelModel({
                    value:  otherVal?.getText(),
                    valueNode: otherVal || value,
                    context: this.context,
                    link: lm,
                    field: Node.isPropertyAssignment(field) ? field.getInitializer() : field,
                    editorLabel: Node.isPropertyAssignment(field)
                        ? field.getName()
                        : `${outPort.fieldFQN.split('.').pop()}${outPort.index ? `[${outPort.index}]`: ''}`,
                    deleteLink: () => this.deleteField(field),
                }));

                lm.registerListener({
                    selectionChanged(event) {
                        if (event.isSelected) {
                            inPort.fireEvent({}, "link-selected");
                            mappedOutPort.fireEvent({}, "link-selected");
                        } else {
                            inPort.fireEvent({}, "link-unselected");
                            mappedOutPort.fireEvent({}, "link-unselected");
                        }
                    },
                });

                this.getModel().addAll(lm);
            }
        });
    }

    async deleteField(field: Node) {
        const typeOfValue = this.isLocked && this.dmType?.memberType ? this.dmType.memberType : this.dmType;
        const defaultValue = getDefaultValue(typeOfValue);
        const updatedField = field.replaceWithText(defaultValue);
        await this.context.applyModifications(updatedField.getSourceFile().getFullText());
    }

    public updatePosition() {
        this.setPosition(this.position.x, this.position.y);
    }

    setPosition(point: Point): void;
    setPosition(x: number, y: number): void;
    setPosition(x: unknown, y?: unknown): void {
        if (typeof x === 'number' && typeof y === 'number') {
            if (!this.x || !this.y) {
                this.x = x;
                this.y = y;
                super.setPosition(x, y);
            }
        }
    }
}
