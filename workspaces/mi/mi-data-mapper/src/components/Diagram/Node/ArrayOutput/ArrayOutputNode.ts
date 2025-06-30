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
import { Expression, Node } from "ts-morph";

import { useDMCollapsedFieldsStore, useDMSearchStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { ExpressionLabelModel } from "../../Label";
import { DataMapperLinkModel } from "../../Link";
import { DMTypeWithValue } from "../../Mappings/DMTypeWithValue";
import { MappingMetadata } from "../../Mappings/MappingMetadata";
import { InputOutputPortModel } from "../../Port";
import { ARRAY_OUTPUT_TARGET_PORT_PREFIX } from "../../utils/constants";
import { filterDiagnosticsForNode } from "../../utils/diagnostics-utils";
import { enrichAndProcessType } from "../../utils/type-utils";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { getFilteredMappings, getSearchFilteredOutput, hasNoOutputMatchFound } from "../../utils/search-utils";
import { getPosition, traversNode } from "../../utils/st-utils";
import { LinkDeletingVisitor } from "../../../../components/Visitors/LinkDeletingVistior";
import {
    findInputNode,
    getDefaultValue,
    getInputPort,
    getOutputPort,
    getTypeName,
    getTypeOfValue,
    isMapFnAtPropAssignment,
    isMapFnAtRootReturn
} from "../../utils/common-utils";

export const ARRAY_OUTPUT_NODE_TYPE = "data-mapper-node-array-output";
const NODE_ID = "array-output-node";

export class ArrayOutputNode extends DataMapperNodeModel {
    public dmType: DMType;
    public dmTypeWithValue: DMTypeWithValue;
    public typeName: string;
    public rootName: string;
    public mappings: MappingMetadata[];
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
            ARRAY_OUTPUT_NODE_TYPE
        );
    }

    async initPorts() {
        this.dmType = getSearchFilteredOutput(this.originalType);

        if (this.dmType) {
            this.rootName = this.dmType?.fieldName;
            const { focusedST, functionST, views } = this.context;

            const isMapFnAtPropAsmt = isMapFnAtPropAssignment(focusedST);
            const isMapFnAtRootRtn = views.length > 1 && isMapFnAtRootReturn(functionST, focusedST);
            this.isMapFn = isMapFnAtPropAsmt || isMapFnAtRootRtn;

            const isCollapsedField = useDMCollapsedFieldsStore.getState().isCollapsedField;
            const [valueEnrichedType, type] = enrichAndProcessType(this.dmType, this.value, this.context.recursiveTypes);
            this.dmType = type;
            this.typeName = getTypeName(valueEnrichedType.type);

            this.hasNoMatchingFields = hasNoOutputMatchFound(this.originalType, valueEnrichedType);
            this.dmTypeWithValue = valueEnrichedType;

            const parentPort = this.addPortsForHeader(
                this.dmType, this.rootName, "IN", ARRAY_OUTPUT_TARGET_PORT_PREFIX,
                isCollapsedField, valueEnrichedType, this.isMapFn
            );

            if (valueEnrichedType.type.kind === TypeKind.Array) {
                
                if (this.dmTypeWithValue?.elements &&
                    this.dmTypeWithValue.elements.length > 0 &&
                    this.dmTypeWithValue.elements[0].elementNode) {
                    this.dmTypeWithValue.elements.forEach((field, index) => {
                        this.addPortsForOutputField(
                            field.member, "IN", this.rootName, index, ARRAY_OUTPUT_TARGET_PORT_PREFIX,
                            parentPort, isCollapsedField, parentPort.collapsed, this.isMapFn
                        );
                    });
                } else {
                    this.dmTypeWithValue.type.fieldName = "";
                    const arrItemField = { ...this.dmTypeWithValue.type.memberType, fieldName: `<${this.dmTypeWithValue.type.fieldName}Item>` };
                    this.addPortsForPreviewField(
                        arrItemField, "IN", this.rootName, this.rootName, ARRAY_OUTPUT_TARGET_PORT_PREFIX, parentPort,
                        isCollapsedField, parentPort.collapsed, this.isMapFn
                    );
                }
               
                
            }
        }
    }

    async initLinks() {
        if (!this.value) {
            return;
        }
        const searchValue = useDMSearchStore.getState().outputSearch;
        const mappings = this.genMappings(this.value);
        this.mappings = getFilteredMappings(mappings, searchValue);
        this.createLinks(this.mappings);
    }

    private createLinks(mappings: MappingMetadata[]) {
        mappings.forEach((mapping) => {
            const { fields, value, otherVal } = mapping;
            const field = fields[fields.length - 1];

            if (!value || !value.getText() || (otherVal && (Node.isCallExpression(otherVal) || Node.isBinaryExpression(otherVal)))) {
                // Unsupported mapping
                return;
            }

            const inputNode = findInputNode(value, this);
            let inPort: InputOutputPortModel;
            if (inputNode) {
                inPort = getInputPort(inputNode, value);
            }

            let outPort: InputOutputPortModel;
            let mappedOutPort: InputOutputPortModel;
            const body = this.dmTypeWithValue.value;

            if (this.dmTypeWithValue.type.kind === TypeKind.Array
                && this.dmTypeWithValue?.value
                && !Node.isArrayLiteralExpression(body)
            ) {
                const portId = `${ARRAY_OUTPUT_TARGET_PORT_PREFIX}${this.rootName ? `.${this.rootName}` : ''}.IN`;
                outPort = this.getPort(portId) as InputOutputPortModel;
                mappedOutPort = outPort;
            } else {
                [outPort, mappedOutPort] = getOutputPort(
                    fields, this.dmTypeWithValue, ARRAY_OUTPUT_TARGET_PORT_PREFIX,
                    (portId: string) =>  this.getPort(portId) as InputOutputPortModel, this.rootName
                );
            }

            if (inPort && mappedOutPort) {
                const diagnostics = filterDiagnosticsForNode(this.context.diagnostics, otherVal || value);
                const lm = new DataMapperLinkModel(value, diagnostics, true);

                lm.setTargetPort(mappedOutPort);
                lm.setSourcePort(inPort);
                inPort.addLinkedPort(mappedOutPort);

                lm.addLabel(new ExpressionLabelModel({
                    value: otherVal?.getText() || value.getText(),
                    valueNode: otherVal || value,
                    context: this.context,
                    link: lm,
                    field: Node.isPropertyAssignment(field)
                        ? field.getInitializer()
                        : field,
                    editorLabel: Node.isPropertyAssignment(field)
                        ? field.getName()
                        : outPort.fieldFQN  && `${outPort.fieldFQN.split('.').pop()}[${outPort.index}]`,
                    deleteLink: () => this.deleteField(field, true)
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
                })
                this.getModel().addAll(lm);
            }
        });
    }

    async deleteField(field: Node, keepDefaultVal?: boolean) {
        const typeOfValue = getTypeOfValue(this.dmTypeWithValue, getPosition(field));

        if (keepDefaultVal && !Node.isPropertyAssignment(field)) {
            const replaceWith = getDefaultValue(typeOfValue);
            field.replaceWithText(replaceWith);
        }  else {
            const linkDeleteVisitor = new LinkDeletingVisitor(field, this.value);
            traversNode(this.value, linkDeleteVisitor);
            const targetNodes = linkDeleteVisitor.getNodesToDelete();

            targetNodes.forEach(node => {
                const parentNode = node.getParent();

                if (Node.isPropertyAssignment(node)) {
                    node.remove();
                } else if (parentNode && Node.isArrayLiteralExpression(parentNode)) {
                    const elementIndex = parentNode.getElements().find(e => e === node);
                    parentNode.removeElement(elementIndex);
                } else {
                    node.replaceWithText('');
                }
            });
        }

        await this.context.applyModifications(field.getSourceFile().getFullText());
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
            }
            super.setPosition(x, y);
        }
    }
}
