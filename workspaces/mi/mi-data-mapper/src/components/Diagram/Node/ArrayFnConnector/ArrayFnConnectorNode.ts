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
import { DMDiagnostic, DMType } from "@wso2/mi-core";
import md5 from "blueimp-md5";
import { CallExpression, ElementAccessExpression, Identifier, Node, PropertyAccessExpression, PropertyAssignment, SyntaxKind } from "ts-morph";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperLinkModel } from "../../Link";
import { InputOutputPortModel, IntermediatePortModel } from "../../Port";
import { ARRAY_OUTPUT_TARGET_PORT_PREFIX, FOCUSED_INPUT_SOURCE_PORT_PREFIX, OFFSETS, SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX } from "../../utils/constants";
import {
    getDefaultValue,
    getFieldNames,
    isMapFunction,
    getTnfFnReturnStatement,
    representsTnfFnReturnStmt,
    isInputAccessExpr
} from "../../utils/common-utils";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { ArrayOutputNode } from "../ArrayOutput";
import { ObjectOutputNode } from "../ObjectOutput";
import { InputNode } from "../Input";
import { getPosition, isPositionsEquals, traversNode } from "../../utils/st-utils";
import { FocusedInputNode } from "../FocusedInput";
import { LinkDeletingVisitor } from "../../../../components/Visitors/LinkDeletingVistior";
import { SubMappingNode } from "../SubMapping";
import { useDMSearchStore } from "../../../../store/store";
import { filterDiagnosticsForNode } from "../../utils/diagnostics-utils";

export const ARRAY_FUNCTION_CONNECTOR_NODE_TYPE = "array-function-connector-node";
const NODE_ID = "array-function-connector-node";
type SourceExprType = ElementAccessExpression | PropertyAccessExpression | Identifier;

export class ArrayFnConnectorNode extends DataMapperNodeModel {

    public sourceType: DMType;
    public targetType: DMType;
    public sourcePort: InputOutputPortModel;
    public targetPort: InputOutputPortModel;

    public inPort: IntermediatePortModel;
    public outPort: IntermediatePortModel;

    public targetFieldFQN: string;
    public diagnostics: DMDiagnostic[];
    public hidden: boolean;
    public hasInitialized: boolean;

    private prevSourcePort: InputOutputPortModel;

    constructor(
        public context: IDataMapperContext,
        public value: CallExpression,
        public parentNode: Node) {
        super(
            NODE_ID,
            context,
            ARRAY_FUNCTION_CONNECTOR_NODE_TYPE
        );
        this.diagnostics = filterDiagnosticsForNode(context.diagnostics, parentNode);
    }

    initPorts(): void {
        this.prevSourcePort = this.sourcePort;
        this.sourcePort = undefined;
        this.targetPort = undefined;
        this.sourceType = undefined;

        this.findSourcePort();
        this.findTargetPort();

        this.inPort = new IntermediatePortModel(
            md5(JSON.stringify(this.value.getPos()) + "IN")
            , "IN"
        );
        this.addPort(this.inPort);
        this.outPort = new IntermediatePortModel(
            md5(JSON.stringify(this.value.getPos()) + "OUT")
            , "OUT"
        );

        this.addPort(this.outPort);
    }

    private findSourcePort(): void {
        let fieldId: string;
        let paramName: string;
        const sourceExpr = this.extractSourceExprFromChain(this.value);

        if (isInputAccessExpr(sourceExpr)) {
            const fieldNames = getFieldNames(sourceExpr as ElementAccessExpression | PropertyAccessExpression);
            fieldId = fieldNames.reduce((pV, cV) => pV ? `${pV}.${cV.name}` : cV.name, "");
            paramName = fieldNames[0].name;
        } else if (Node.isIdentifier(sourceExpr)) {
            fieldId = sourceExpr.getText();
            paramName = fieldId;
        }

        this.getModel().getNodes().map(node => {
            if (node instanceof InputNode && node?.value && node.value.getName() === paramName) {
                this.sourcePort = node.getPort(fieldId + ".OUT") as InputOutputPortModel;
            } else if (node instanceof FocusedInputNode && node.innerParam.getName() === paramName) {
                const portName = FOCUSED_INPUT_SOURCE_PORT_PREFIX + "." + fieldId + ".OUT";
                this.sourcePort = node.getPort(portName) as InputOutputPortModel;
            } else if (node instanceof SubMappingNode && node.subMappings.some(sm => sm.name === paramName)) {
                const portName = SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX + "." + fieldId + ".OUT";
                this.sourcePort = node.getPort(portName) as InputOutputPortModel;
            }

            while (this.sourcePort && this.sourcePort.hidden){
                this.sourcePort = this.sourcePort.parentModel;
            }
        });
    }

    private findTargetPort(): void {
        const innerMostExpr = this.parentNode;
        const fieldName = Node.isPropertyAssignment(innerMostExpr) && innerMostExpr.getNameNode();
        const fieldNamePosition = fieldName && getPosition(fieldName);
        const returnStmt = getTnfFnReturnStatement(this.context.functionST);
        const isReturnStmtMapFn = Node.isReturnStatement(this.parentNode);
        const outputSearchValue = useDMSearchStore.getState().outputSearch;
        const shouldFindTargetPort = outputSearchValue === ""
            || fieldName?.getText().toLowerCase().includes(outputSearchValue.toLowerCase());

        if (!shouldFindTargetPort) return;

        if (fieldNamePosition) {
            this.getModel().getNodes().map((node) => {

                if (node instanceof ObjectOutputNode || node instanceof ArrayOutputNode) {
                    const ports = Object.entries(node.getPorts());

                    ports.map((entry) => {
                        const port = entry[1];

                        if (port instanceof InputOutputPortModel
                            && port?.typeWithValue && port.typeWithValue?.value
                            && Node.isPropertyAssignment(port.typeWithValue.value)
                            && isPositionsEquals(getPosition(port.typeWithValue.value.getNameNode()), fieldNamePosition)
                        ) {
                            this.targetPort = port;
                        }
                    });
                }
            });
        } else if (representsTnfFnReturnStmt(this.parentNode, returnStmt) || isReturnStmtMapFn) {
            this.getModel().getNodes().forEach((node) => {
                if (node instanceof ArrayOutputNode) {
                    const ports = Object.entries(node.getPorts());
                    ports.map((entry) => {
                        const port = entry[1];
                        if (port instanceof InputOutputPortModel
                            && port?.typeWithValue && port.typeWithValue?.value
                            && Node.isCallExpression(port.typeWithValue.value)
                            && isMapFunction(port.typeWithValue.value)
                            && isPositionsEquals(getPosition(port.typeWithValue.value), getPosition(this.value))
                            && port.portName === `${ARRAY_OUTPUT_TARGET_PORT_PREFIX}${node.rootName ? `.${node.rootName}` : ''}`
                            && port.portType === 'IN'
                        ) {
                            this.targetPort = port;
                        }
                    });
                }
            });
        } else if (Node.isVariableDeclaration(this.parentNode)) {
            // When the local variable initializer is map function
            const exprPosition = getPosition(this.parentNode.getInitializer());
            this.getModel().getNodes().forEach((node) => {
                if (node instanceof ArrayOutputNode) {
                    const ports = Object.entries(node.getPorts());
                    ports.map((entry) => {
                        const port = entry[1];
                        if (port instanceof InputOutputPortModel
                            && port?.typeWithValue && port.typeWithValue?.value
                            && Node.isCallExpression(port.typeWithValue.value)
                            && isPositionsEquals(getPosition(port.typeWithValue.value), exprPosition)
                            && port.portName === `${ARRAY_OUTPUT_TARGET_PORT_PREFIX}${node.rootName ? `.${node.rootName}` : ''}`
                            && port.portType === 'IN'
                        ) {
                            this.targetPort = port;
                        }
                    });
                }
            });
        }

        const previouslyHidden = this.hidden;
        this.hidden = this.targetPort?.hidden;
    
        if (this.hidden !== previouslyHidden || this.prevSourcePort?.getID() !== this.sourcePort?.getID()) {
            this.hasInitialized = false;
        }
        while (this.targetPort && this.targetPort.hidden){
            this.targetPort = this.targetPort.parentModel;
        }
    }

    initLinks(): void {
        if (this.hasInitialized) {
            return;
        }
        if (!this.hidden) {
            // Create links from "IN" ports and back tracing the inputs
            if (this.sourcePort && this.inPort) {
                const link = new DataMapperLinkModel(undefined, this.diagnostics, true);
                link.setSourcePort(this.sourcePort);
                link.setTargetPort(this.inPort);
                this.sourcePort.addLinkedPort(this.inPort);
                this.sourcePort.addLinkedPort(this.targetPort);
                link.registerListener({
                    selectionChanged: (event) => {
                        if (event.isSelected) {
                            this.sourcePort.fireEvent({}, "link-selected");
                            this.inPort.fireEvent({}, "link-selected");
                        } else {

                            this.sourcePort.fireEvent({}, "link-unselected");
                            this.inPort.fireEvent({}, "link-unselected");
                        }
                    },
                })
                this.getModel().addAll(link);
            }

            if (this.outPort && this.targetPort) {
                const link = new DataMapperLinkModel(undefined, this.diagnostics, true);
                link.setSourcePort(this.outPort);
                link.setTargetPort(this.targetPort);
                link.registerListener({
                    selectionChanged: (event) => {
                        if (event.isSelected) {
                            this.targetPort.fireEvent({}, "link-selected");
                            this.outPort.fireEvent({}, "link-selected");
                        } else {
                            this.targetPort.fireEvent({}, "link-unselected");
                            this.outPort.fireEvent({}, "link-unselected");
                        }
                    },
                })
                this.getModel().addAll(link);
                this.targetFieldFQN = this.targetPort.fieldFQN;
            }
        } else {
            if (this.sourcePort && this.targetPort) {
                const link = new DataMapperLinkModel(undefined, this.diagnostics, true);
                link.setSourcePort(this.sourcePort);
                link.setTargetPort(this.targetPort);
                this.sourcePort.addLinkedPort(this.targetPort);
                link.registerListener({
                    selectionChanged: (event) => {
                        if (event.isSelected) {
                            this.sourcePort.fireEvent({}, "link-selected");
                            this.targetPort.fireEvent({}, "link-selected");
                        } else {

                            this.sourcePort.fireEvent({}, "link-unselected");
                            this.targetPort.fireEvent({}, "link-unselected");
                        }
                    },
                })
                this.getModel().addAll(link);
            }
        }
        this.hasInitialized = true;
    }

    public updatePosition() {
        if (this.targetPort){
            const position = this.targetPort.getPosition()
            this.setPosition(OFFSETS.ARRAY_FN_CONNECTOR_NODE.X, position.y - 2)
        }
    }

    public hasError(): boolean {
        return this.diagnostics.length > 0;
    }

    public async deleteLink(): Promise<void> {
        const dmNode = this.getModel().getNodes().find(node =>
            node instanceof ObjectOutputNode || node instanceof ArrayOutputNode
        ) as ObjectOutputNode | ArrayOutputNode;

        if (dmNode) {
            if (Node.isPropertyAssignment(this.parentNode)) {
                const rootConstruct = dmNode.value;
                const linkDeleteVisitor = new LinkDeletingVisitor(this.parentNode, rootConstruct);
                traversNode(this.context.focusedST, linkDeleteVisitor);
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
            } else {
                this.setValue(this.value.replaceWithText(getDefaultValue(dmNode.dmType)) as CallExpression);
            }
        }

        await this.context.applyModifications(this.value.getSourceFile().getFullText());
    }

    private extractSourceExprFromChain(callExpression: CallExpression): SourceExprType {
        let currentExpr: Node = callExpression;
    
        // Traverse up the expression chain until we find the first call expression
        while (Node.isCallExpression(currentExpr) && currentExpr.getExpression()) {
            currentExpr = currentExpr.getExpression();
            if (isInputAccessExpr(currentExpr)) {
                currentExpr = (currentExpr as ElementAccessExpression).getExpression();
            }
        }
    
        // Check if the resulting expression is a valid source expression type
        if (Node.isPropertyAccessExpression(currentExpr)
            || Node.isElementAccessExpression(currentExpr)
            || Node.isIdentifier(currentExpr)
        ) {
            return currentExpr as SourceExprType;
        }
    
        return undefined;
    }

    public setValue(value: CallExpression): void {
        this.value = value;
    }
}
