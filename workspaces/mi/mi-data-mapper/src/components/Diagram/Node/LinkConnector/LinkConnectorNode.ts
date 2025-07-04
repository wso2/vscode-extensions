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
import { DMDiagnostic, TypeKind } from "@wso2/mi-core";
import md5 from "blueimp-md5";
import { BinaryExpression, ElementAccessExpression, Identifier, Node, PropertyAccessExpression } from "ts-morph";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperLinkModel } from "../../Link";
import { IntermediatePortModel, InputOutputPortModel } from "../../Port";
import { ARRAY_OUTPUT_TARGET_PORT_PREFIX, OFFSETS, PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX } from "../../utils/constants";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { ObjectOutputNode } from "../ObjectOutput";
import { getPosition, isPositionsEquals, traversNode } from "../../utils/st-utils";
import {
    findInputNode,
    getDefaultValue,
    getInputPort,
    getOutputPort,
    getTargetPortPrefix
} from "../../utils/common-utils";
import { filterDiagnosticsForNode } from "../../utils/diagnostics-utils";
import { ArrayOutputNode } from "../ArrayOutput";
import { LinkDeletingVisitor } from "../../../../components/Visitors/LinkDeletingVistior";
import { PrimitiveOutputNode } from "../PrimitiveOutput";
import { ExpressionLabelModel } from "../../Label";
import { UnionOutputNode } from "../UnionOutput";

export const LINK_CONNECTOR_NODE_TYPE = "link-connector-node";
const NODE_ID = "link-connector-node";

export class LinkConnectorNode extends DataMapperNodeModel {

    public sourcePorts: InputOutputPortModel[] = [];
    public sourceValues:{[key: string]: Node[]} = {};
    public targetPort: InputOutputPortModel;
    public targetMappedPort: InputOutputPortModel;

    public inPort: IntermediatePortModel;
    public outPort: IntermediatePortModel;

    public value: string;
    public diagnostics: DMDiagnostic[];
    public hidden: boolean;
    public hasInitialized: boolean;
    public innerNode: Node;

    private _isFocusedOnSubMapping: boolean;

    constructor(
        public context: IDataMapperContext,
        public valueNode: Node,
        public editorLabel: string,
        public parentNode: Node,
        public inputAccessNodes: (PropertyAccessExpression | ElementAccessExpression | Identifier)[],
        public fields: Node[],
        public isPrimitiveTypeArrayElement?: boolean
    ) {
        super(
            NODE_ID,
            context,
            LINK_CONNECTOR_NODE_TYPE
        );

        if (Node.isPropertyAssignment(valueNode)) {
            this.innerNode = valueNode.getInitializer();
            this.value = this.innerNode ? this.innerNode.getText().trim() : '';
            this.diagnostics = filterDiagnosticsForNode(context.diagnostics, valueNode.getInitializer());
        } else if (Node.isVariableStatement(valueNode)) {
            const varDecl = valueNode.getDeclarations()[0];
            this.innerNode = varDecl.getInitializer();
            this.value = this.innerNode ? this.innerNode.getText().trim() : '';
            this.diagnostics = filterDiagnosticsForNode(context.diagnostics, valueNode);
        } else {
            this.innerNode = this.valueNode;
            this.value = valueNode.getText().trim();
            this.diagnostics = filterDiagnosticsForNode(context.diagnostics, valueNode);
        }
    }

    initPorts(): void {
        const prevSourcePorts = this.sourcePorts;
        this.sourcePorts = [];
        this.sourceValues = {};
        this.targetMappedPort = undefined;
        this.inPort = new IntermediatePortModel(md5(JSON.stringify(getPosition(this.valueNode)) + "IN"), "IN");
        this.outPort = new IntermediatePortModel(md5(JSON.stringify(getPosition(this.valueNode)) + "OUT"), "OUT");
        this.addPort(this.inPort);
        this.addPort(this.outPort);

        this._isFocusedOnSubMapping = Node.isVariableStatement(this.context.focusedST);

        this.inputAccessNodes.forEach((field) => {
            const inputNode = findInputNode(field, this);
            if (inputNode) {
                const inputPort = getInputPort(inputNode, field);
                if (!this.sourcePorts.some(port => port.getID() === inputPort.getID())) {
                    this.sourcePorts.push(inputPort);
                    this.sourceValues[inputPort.getID()] = [field];
                } else {
                    this.sourceValues[inputPort.getID()].push(field);
                }
            }
        });

        if (this.outPort) {
            this.getModel().getNodes().map((node) => {
    
                if (node instanceof ObjectOutputNode
                    || node instanceof ArrayOutputNode
                    || node instanceof UnionOutputNode
                    || node instanceof PrimitiveOutputNode
                ) {
                    const targetPortPrefix = getTargetPortPrefix(node);

                    if (Node.isBlock(this.parentNode) || (this._isFocusedOnSubMapping && !this.parentNode)) {
                        if (!(node instanceof ObjectOutputNode)) {
                            const typeName = targetPortPrefix === PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX
                                ? node.dmTypeWithValue.type.kind
                                : targetPortPrefix === ARRAY_OUTPUT_TARGET_PORT_PREFIX
                                    ? (node as ArrayOutputNode).rootName
                                    : undefined;
                            this.targetPort = node.getPort(
                                `${targetPortPrefix}${typeName ? `.${typeName}` : ''}.IN`) as InputOutputPortModel;
                        } else {
                            this.targetPort = node.getPort(`${targetPortPrefix}.IN`) as InputOutputPortModel;
                        }
                        this.targetMappedPort = this.targetPort;
                    } else {
                        const rootName = targetPortPrefix === ARRAY_OUTPUT_TARGET_PORT_PREFIX
                            && (node as ArrayOutputNode).rootName;

                        [this.targetPort, this.targetMappedPort] = getOutputPort(
                            this.fields, node.dmTypeWithValue, targetPortPrefix,
                            (portId: string) =>  node.getPort(portId) as InputOutputPortModel, rootName
                        );
                        const previouslyHidden = this.hidden;
                        this.hidden = this.targetMappedPort?.portName !== this.targetPort?.portName;
                        if (this.hidden !== previouslyHidden
                            || (prevSourcePorts.length !== this.sourcePorts.length
                                || prevSourcePorts.map(port => port.getID()).join('')
                                    !== this.sourcePorts.map(port => port.getID()).join('')))
                        {
                            this.hasInitialized = false;
                        }
                    }
                }
            });
        }
    }

    initLinks(): void {
        if (this.hasInitialized) {
            return;
        }
        if (this.hidden) {
            if (this.targetMappedPort) {
                this.sourcePorts.forEach((sourcePort) => {
                    const inPort = this.targetMappedPort;
                    const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);

                    sourcePort.addLinkedPort(this.targetMappedPort);

                    lm.setTargetPort(this.targetMappedPort);
                    lm.setSourcePort(sourcePort);
                    lm.registerListener({
                        selectionChanged(event) {
                            if (event.isSelected) {
                                inPort.fireEvent({}, "link-selected");
                                sourcePort.fireEvent({}, "link-selected");
                            } else {
                                inPort.fireEvent({}, "link-unselected");
                                sourcePort.fireEvent({}, "link-unselected");
                            }
                        },
                    })
                    this.getModel().addAll(lm);

                    if (!this.editorLabel) {
                        this.editorLabel = this.targetMappedPort.fieldFQN.split('.').pop();
                    }
                })
            }
        } else {
            this.sourcePorts.forEach((sourcePort) => {
                const inPort = this.inPort;
                const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);
    
                if (sourcePort) {
                    sourcePort.addLinkedPort(this.inPort);
                    sourcePort.addLinkedPort(this.targetMappedPort)

                    lm.setTargetPort(this.inPort);
                    lm.setSourcePort(sourcePort);

                    if (this.sourcePorts.length > 1) {
                        lm.addLabel(new ExpressionLabelModel({
                            link: lm,
                            value: undefined,
                            context: undefined,
                            isSubLinkLabel: true,
                            deleteLink: () => this.deleteSubLink(sourcePort.getID())
                        }));
                    }

                    lm.registerListener({
                        selectionChanged(event) {
                            if (event.isSelected) {
                                inPort.fireEvent({}, "link-selected");
                                sourcePort.fireEvent({}, "link-selected");
                            } else {
                                inPort.fireEvent({}, "link-unselected");
                                sourcePort.fireEvent({}, "link-unselected");
                            }
                        },
                    })
                    this.getModel().addAll(lm);
                }
            })

            if (this.targetMappedPort) {
                const outPort = this.outPort;
                const targetPort = this.targetMappedPort;

                const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);

                lm.setTargetPort(this.targetMappedPort);
                lm.setSourcePort(this.outPort);
                lm.registerListener({
                    selectionChanged(event) {
                        if (event.isSelected) {
                            outPort.fireEvent({}, "link-selected");
                            targetPort.fireEvent({}, "link-selected");
                        } else {
                            outPort.fireEvent({}, "link-unselected");
                            targetPort.fireEvent({}, "link-unselected");
                        }
                    },
                })

                if (!this.editorLabel) {
                    const fieldFQN = this.targetMappedPort.fieldFQN;
                    this.editorLabel = fieldFQN ? this.targetMappedPort.fieldFQN.split('.').pop() : '';
                }
                this.getModel().addAll(lm);
            }
        }
        this.hasInitialized = true;
    }

    async updateSource(suffix: string): Promise<void> {
        this.value = `${this.value} + ${suffix}`;
        this.setInnerNode(this.innerNode.replaceWithText(this.value));
        await this.context.applyModifications(this.innerNode.getSourceFile().getFullText());
    }

    public updatePosition() {
        if (this.targetMappedPort) {
            const position = this.targetMappedPort.getPosition()
            this.setPosition(this.hasError() ? OFFSETS.LINK_CONNECTOR_NODE_WITH_ERROR.X : OFFSETS.LINK_CONNECTOR_NODE.X, position.y - 2)
        }
    }

    public hasError(): boolean {
        return this.diagnostics.length > 0;
    }

    public async deleteLink(): Promise<void> {
        const targetField = this.targetPort.field;
        const targetNode = this.targetPort.getNode();
        const { functionST, applyModifications } = this.context;
        const exprFuncBodyPosition = getPosition(functionST.getBody());
        const defaultValue = getDefaultValue(targetField);

        if ((!targetField?.fieldName
            && targetField?.kind !== TypeKind.Array
            && targetField?.kind !== TypeKind.Interface)
                || isPositionsEquals(exprFuncBodyPosition, getPosition(this.valueNode)) 
                || Node.isCallExpression(this.valueNode))
        {
            let targetNode = this.valueNode;
            if (Node.isVariableStatement) {
                targetNode = this.innerNode;
            }
            const updatedTargetNode = targetNode.replaceWithText(defaultValue);
            await applyModifications(updatedTargetNode.getSourceFile().getFullText());
        } else {
            let rootExpr = this.parentNode;
            if (targetNode instanceof ObjectOutputNode || targetNode instanceof ArrayOutputNode) {
                rootExpr = targetNode.value;
            }
            const linkDeleteVisitor = new LinkDeletingVisitor(this.valueNode, rootExpr);
            traversNode(functionST, linkDeleteVisitor);
            const targetNodes = linkDeleteVisitor.getNodesToDelete();

            targetNodes.forEach(node => {
                const parentNode = node.getParent();

                if (Node.isPropertyAssignment(node)) {
                    if (this._isFocusedOnSubMapping) {
                        node.getInitializer().replaceWithText(defaultValue);
                    } else {
                        node.remove();
                    }
                } else if (parentNode && Node.isArrayLiteralExpression(parentNode)) {
                    const elementIndex = parentNode.getElements().find(e => e === node);
                    parentNode.removeElement(elementIndex);
                } else {
                    node.replaceWithText('');
                }
            });
            await this.context.applyModifications(this.valueNode.getSourceFile().getFullText());
        }
    }

    public async deleteSubLink(sourcePortId: string): Promise<void> {

        const subLinkValuesTexts = this.sourceValues[sourcePortId].map(node => node.getText());

        for (let subLinkValueText of subLinkValuesTexts) {

            let subLinkValue = this.valueNode.getDescendants().find(node => node.getText() === subLinkValueText);

            if (!subLinkValue || subLinkValue.wasForgotten()) continue;

            let parentSubLinkValue = subLinkValue.getParent();

            while (parentSubLinkValue && shouldUpdateParent(parentSubLinkValue, subLinkValue)) {
                subLinkValue = parentSubLinkValue;
                parentSubLinkValue = subLinkValue.getParent();
            }

            if (Node.isBinaryExpression(parentSubLinkValue)) {
                const leftNode = (parentSubLinkValue as BinaryExpression).getLeft();
                const rightNode = (parentSubLinkValue as BinaryExpression).getRight();

                if (leftNode === subLinkValue) {
                    parentSubLinkValue.replaceWithText(rightNode.getText());
                } else if (rightNode === subLinkValue) {
                    parentSubLinkValue.replaceWithText(leftNode.getText());
                }
            } else if (Node.isCallExpression(parentSubLinkValue)) {
                const indexToRemove = parentSubLinkValue.getArguments().indexOf(subLinkValue);
                parentSubLinkValue.removeArgument(indexToRemove);
            } else if (Node.isElementAccessExpression(parentSubLinkValue)) {
                subLinkValue.replaceWithText('0');
            } else if (Node.isPropertyAssignment(parentSubLinkValue) || Node.isVariableStatement(parentSubLinkValue) || Node.isReturnStatement(parentSubLinkValue)) {
                await this.deleteLink();
                return;
            }

        }

        await this.context.applyModifications(this.valueNode.getSourceFile().getFullText());

        function shouldUpdateParent(parentNode: Node, childNode: Node): boolean {
            if (Node.isCallExpression(parentNode)) {
                return parentNode.getArguments().length === 1;
            }

            if (Node.isElementAccessExpression(parentNode)) {
                const argExpr = parentNode.getArgumentExpression();
                if (argExpr == childNode && argExpr.getType().isNumber()) {
                    return false;
                }
            }

            if (Node.isPropertyAssignment(parentNode) || Node.isVariableStatement(parentNode) || Node.isReturnStatement(parentNode)) {
                return false;
            }

            return !Node.isBinaryExpression(parentNode);
        }

    }

    public setInnerNode(innerNode: Node): void {
        this.innerNode = innerNode;
    }
}
