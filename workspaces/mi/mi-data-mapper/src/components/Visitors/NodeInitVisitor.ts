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
import {
    Node,
    PropertyAssignment,
    ObjectLiteralExpression,
    FunctionDeclaration,
    ReturnStatement,
    ArrayLiteralExpression,
    CallExpression,
    VariableStatement,
    SyntaxKind,
    Expression
} from "ts-morph";
import { TypeKind } from "@wso2/mi-core";

import { Visitor } from "../../ts/base-visitor";
import { ObjectOutputNode } from "../Diagram/Node";
import { DataMapperNodeModel } from "../Diagram/Node/commons/DataMapperNode";
import { DataMapperContext } from "../../utils/DataMapperContext/DataMapperContext";
import { InputDataImportNodeModel, OutputDataImportNodeModel } from "../Diagram/Node/DataImport/DataImportNode";
import {
    canConnectWithLinkConnector,
    getInputAccessNodes,
    getCallExprReturnStmt,
    isConditionalExpression,
    isMapFunction,
    getInnermostArrowFnBody,
    isFilterFunction
} from "../Diagram/utils/common-utils";
import { ArrayFnConnectorNode } from "../Diagram/Node/ArrayFnConnector";
import { getPosition, isPositionsEquals } from "../Diagram/utils/st-utils";
import { getDMType, getDMTypeForRootChaninedMapFunction, getDMTypeOfSubMappingItem } from "../Diagram/utils/type-utils";
import { UnsupportedExprNodeKind, UnsupportedIONode } from "../Diagram/Node/UnsupportedIO";
import { ARRAY_FILTER_NODE_PREFIX, OFFSETS } from "../Diagram/utils/constants";
import { FocusedInputNode } from "../Diagram/Node/FocusedInput";
import {
    createInputNodeForDmFunction,
    createLinkConnectorNode,
    createOutputNodeForDmFunction,
    getArrayFilterNode,
    getOutputNode,
    getSubMappingNode,
    isDataImportNode,
    isObjectOrArrayLiteralExpression
} from "../Diagram/utils/node-utils";
import { SourceNodeType } from "../DataMapper/Views/DataMapperView";

export class NodeInitVisitor implements Visitor {
    private inputNode: DataMapperNodeModel | InputDataImportNodeModel;
    private outputNode: DataMapperNodeModel | OutputDataImportNodeModel;
    private intermediateNodes: DataMapperNodeModel[] = [];
    private arrayFilterNode: DataMapperNodeModel;
    private mapIdentifiers: Node[] = [];
    private isWithinArrayFn = 0;
    private isWithinVariableStmt = 0;

    constructor(private context: DataMapperContext) {}

    beginVisitFunctionDeclaration(node: FunctionDeclaration): void {
        this.inputNode = createInputNodeForDmFunction(node, this.context);
        this.outputNode = createOutputNodeForDmFunction(node, this.context);
    }

    beginVisitPropertyAssignment(node: PropertyAssignment, parent?: Node): void {
        this.mapIdentifiers.push(node);

        const { focusedST, functionST, views, subMappingTypes } = this.context;
        const { sourceFieldFQN, targetFieldFQN, sourceNodeType, mapFnIndex, subMappingInfo } = views[views.length - 1];
        const isFocusedST = isPositionsEquals(getPosition(node), getPosition(focusedST));

        if (isFocusedST) {
            let exprType = getDMType(targetFieldFQN, this.context.outputTree, mapFnIndex);
            let initializer = node.getInitializer();

            const callExpr = initializer as CallExpression;
 
            const returnStatement = getCallExprReturnStmt(callExpr);

            const innerExpr = returnStatement?.getExpression();

            const hasConditionalOutput = Node.isConditionalExpression(innerExpr);
            if (hasConditionalOutput) {
                this.outputNode = new UnsupportedIONode(
                    this.context,
                    UnsupportedExprNodeKind.Output,
                    undefined,
                    innerExpr,
                );
            } else if (exprType?.kind === TypeKind.Array) {
                const { memberType } = exprType;
                this.outputNode = getOutputNode(this.context, innerExpr, memberType);
            } else {
                if (exprType?.kind === TypeKind.Interface) {
                    this.outputNode = new ObjectOutputNode(this.context, innerExpr, exprType);
                } else {
                    // Constraint: The return type of the transformation function should be an interface or an array
                }
                if (isConditionalExpression(innerExpr)) {
                    const inputNodes = getInputAccessNodes(returnStatement);
                    const linkConnectorNode = createLinkConnectorNode(
                        node, "", parent, inputNodes, this.mapIdentifiers.slice(0), this.context
                    );
                    this.intermediateNodes.push(linkConnectorNode);
                }
            }

            this.outputNode.setPosition(OFFSETS.TARGET_NODE.X, 0);

            // Create input node
            const inputType = sourceNodeType === SourceNodeType.SubMappingNode
                ? getDMTypeOfSubMappingItem(functionST, sourceFieldFQN, subMappingTypes)
                : getDMType(sourceFieldFQN, this.context.inputTrees[0]);

            const focusedInputNode = new FocusedInputNode(this.context, callExpr, inputType);
            focusedInputNode.setPosition(OFFSETS.SOURCE_NODE.X, 0);

            this.inputNode = focusedInputNode;
        } else {
            const initializer = node.getInitializer();
            if (initializer
                && !isObjectOrArrayLiteralExpression(initializer)
                && ( this.isWithinArrayFn === 0 || (views.length > 2 && !!subMappingInfo))
                && this.isWithinVariableStmt === 0
            ) {
                const inputAccessNodes = getInputAccessNodes(initializer);
                if (canConnectWithLinkConnector(inputAccessNodes, initializer)) {
                    const linkConnectorNode = createLinkConnectorNode(
                        node, node.getName(), parent, inputAccessNodes, this.mapIdentifiers.slice(0), this.context
                    );
                    this.intermediateNodes.push(linkConnectorNode);
                }
            }
        }
    }

    beginVisitReturnStatement(node: ReturnStatement, parent: Node): void {
        const returnExpr = node.getExpression();
        const { views, focusedST, outputTree } = this.context;
        const focusedView = views[views.length - 1];
        const { targetFieldFQN, mapFnIndex } = focusedView;
        const mapFnAtRootReturnOrDecsendent = !targetFieldFQN && mapFnIndex !== undefined;
        const isFocusedST = views.length > 1 && isPositionsEquals(getPosition(node), getPosition(focusedST));

        // Create IO nodes whan the return statement contains the focused map function
        if (isFocusedST) {
            const callExpr = returnExpr as CallExpression;
            const mapFnReturnStmt = getCallExprReturnStmt(callExpr);
            const mapFnReturnExpr = mapFnReturnStmt?.getExpression();
            const outputType = mapFnAtRootReturnOrDecsendent
                ? getDMTypeForRootChaninedMapFunction(outputTree, mapFnIndex)
                : getDMType(targetFieldFQN, this.context.outputTree, mapFnIndex);

            if (outputType.kind === TypeKind.Array) {
                const { memberType } = outputType;
                this.outputNode = getOutputNode(this.context, mapFnReturnExpr, memberType);
            } else if (outputTree?.kind === TypeKind.Interface) {
                this.outputNode = new ObjectOutputNode(this.context, mapFnReturnExpr, outputTree);
            } else {
                // Constraint: The return type of the transformation function should be an interface or an array
            }
            this.outputNode.setPosition(OFFSETS.TARGET_NODE.X, 0);

            // Create input node
            const { sourceFieldFQN } = views[views.length - 1];
            const inputRoot = this.context.inputTrees[0];
            const noOfSourceFields = sourceFieldFQN.split('.').length;
            const inputType = mapFnAtRootReturnOrDecsendent && inputRoot.kind === TypeKind.Array
                ? getDMTypeForRootChaninedMapFunction(inputRoot, mapFnIndex)
                // Use mapFnIndex when the input of the focused map function is root of the input tree
                : getDMType(sourceFieldFQN, inputRoot, noOfSourceFields === 1 ? mapFnIndex : undefined);

            const focusedInputNode = new FocusedInputNode(this.context, callExpr, inputType);

            focusedInputNode.setPosition(OFFSETS.SOURCE_NODE.X, 0);
            this.inputNode = focusedInputNode;
        }

        // Create link connector node for expressions within return statements
        if (this.isWithinArrayFn === 0
            && this.isWithinVariableStmt === 0
            && !isObjectOrArrayLiteralExpression(returnExpr)
        ) {
            const inputAccessNodes = getInputAccessNodes(returnExpr);
            if (canConnectWithLinkConnector(inputAccessNodes, returnExpr)) {
                const linkConnectorNode = createLinkConnectorNode(
                    returnExpr, "", parent, inputAccessNodes, [...this.mapIdentifiers, returnExpr], this.context
                );
                this.intermediateNodes.push(linkConnectorNode);
            }
        }
    }

    beginVisitObjectLiteralExpression(node: ObjectLiteralExpression): void {
        this.mapIdentifiers.push(node);
    }

    beginVisitArrayLiteralExpression(node: ArrayLiteralExpression, parent?: Node): void {
        this.mapIdentifiers.push(node);
        const elements = node.getElements();

        if (elements && this.isWithinVariableStmt === 0) {
            elements.forEach(element => {
                if (!isObjectOrArrayLiteralExpression(element)) {
                    const inputAccessNodes = getInputAccessNodes(element);
                    if (canConnectWithLinkConnector(inputAccessNodes, element)) {
                        const linkConnectorNode = createLinkConnectorNode(
                            element, "", parent, inputAccessNodes, [...this.mapIdentifiers, element], this.context
                        );
                        this.intermediateNodes.push(linkConnectorNode);
                    }
                }
            })
        }
    }

    beginVisitCallExpression(node: CallExpression, parent: Node): void {
        const { focusedST, views } = this.context;
        const isMapFn = isMapFunction(node);
        const isFilterFn = isFilterFunction(node);
        const isFocusedSTWithinPropAssignment = parent
            && Node.isPropertyAssignment(parent)
            && isPositionsEquals(getPosition(parent), getPosition(focusedST));
        const isFocusedSTWithinReturnStmt = parent
            && Node.isReturnStatement(parent)
            && isPositionsEquals(getPosition(parent), getPosition(focusedST))
            && views.length > 1;
        const isParentFocusedST = isFocusedSTWithinPropAssignment || isFocusedSTWithinReturnStmt;
        
        if (!isParentFocusedST && this.isWithinVariableStmt === 0) {
            if (isMapFn) {
                this.isWithinArrayFn += 1;
                while (parent.isKind(SyntaxKind.ElementAccessExpression) && parent.getParent())
                    parent = parent.getParent();
                const arrayFnConnectorNode = new ArrayFnConnectorNode(this.context, node, parent);
                this.intermediateNodes.push(arrayFnConnectorNode);
            } else if (isFilterFn) {
                this.isWithinArrayFn += 1;
            }
        }
    }

    beginVisitVariableStatement(node: VariableStatement, parent: Node): void {
        const { focusedST, views } = this.context;
        const lastView = views[views.length - 1];
        const { label, sourceFieldFQN } = lastView;
        const focusedOnSubMappingRoot = views.length === 2;
        // Constraint: Only one variable declaration is allowed in a local variable statement.
        const varDecl = node.getDeclarations()[0];

        const isFocusedST = isPositionsEquals(getPosition(node), getPosition(focusedST));

        if (isFocusedST) {
            const initializer = varDecl.getInitializer();
            let callExpr = initializer;
            if (initializer) {
                if (!focusedOnSubMappingRoot) {
                    // Variable Statement become focused when the view is sub mapping
                    // This case, always the input node of the second view is the input node of the first view
                    // Hence, creating focused input node from the thrid view onwards
                    if (Node.isCallExpression(initializer)) {
                        // A2A mappings with map function within focused sub mappings at the root output level
                        const { mapFnIndex } = lastView.subMappingInfo;
                        const callExprs = initializer.getDescendantsOfKind(SyntaxKind.CallExpression);
                        const mapFns = callExprs.filter(expr => {
                            const expression = expr.getExpression();
                            return Node.isPropertyAccessExpression(expression) && expression.getName() === "map";
                        });
                        const inputType = getDMType(sourceFieldFQN, this.context.inputTrees[0]);
                        callExpr = !!mapFnIndex ? mapFns[mapFnIndex - 1] : initializer;
                        this.inputNode = new FocusedInputNode(this.context, callExpr as CallExpression, inputType);
                    } else if (Node.isObjectLiteralExpression(initializer)) {
                        // A2A mappings with map function within focused sub mappings at the output field level
                        const properties = initializer.getProperties();
                        const focusedProperty = properties.find(property => {
                            if (Node.isPropertyAssignment(property)) {
                                return property.getName() === sourceFieldFQN;
                            }
                        }) as PropertyAssignment;
                        if (focusedProperty) {
                            const focusedInitializer = focusedProperty.getInitializer();
                            if (Node.isCallExpression(focusedInitializer)) {
                                callExpr = focusedInitializer;
                                const inputType = getDMType(sourceFieldFQN, this.context.inputTrees[0]);
                                this.inputNode = new FocusedInputNode(this.context, focusedInitializer, inputType);
                            }
                        }
                    }
                }

                const shouldCheckForLinkConnectorNodes = !(focusedOnSubMappingRoot
                    && isObjectOrArrayLiteralExpression(initializer));
                
                if (shouldCheckForLinkConnectorNodes && this.isWithinArrayFn === 0) {
                    let targetExpr = Node.isCallExpression(callExpr) ? getInnermostArrowFnBody(callExpr) : callExpr;
                    const inputAccessNodes = getInputAccessNodes(targetExpr);
                    const isObjectLiteralExpr = Node.isObjectLiteralExpression(targetExpr);

                    if (canConnectWithLinkConnector(inputAccessNodes, targetExpr as Expression) && !isObjectLiteralExpr) {
                        const linkConnectorNode = createLinkConnectorNode(
                            node, label, parent, inputAccessNodes, this.mapIdentifiers.slice(0), this.context
                        );
                        this.intermediateNodes.push(linkConnectorNode);
                    }
                }
            }
        } else {
            this.isWithinVariableStmt += 1;
        }
    }

    endVisitPropertyAssignment(node: PropertyAssignment): void {
        if (this.mapIdentifiers.length > 0) {
            this.mapIdentifiers.pop()
        }    
    }

    endVisitObjectLiteralExpression(node: ObjectLiteralExpression): void {
        if (this.mapIdentifiers.length > 0) {
            this.mapIdentifiers.pop()
        }
    }

    endVisitArrayLiteralExpression(node: ArrayLiteralExpression): void {
        if (this.mapIdentifiers.length > 0) {
            this.mapIdentifiers.pop()
        }
    }

    endVisitCallExpression(node: CallExpression, parent: Node): void {
        const { focusedST } = this.context;
        const isMapFn = isMapFunction(node);
        const isFilterFn = isFilterFunction(node);
        const isParentFocusedST = parent
            && Node.isPropertyAssignment(parent)
            && isPositionsEquals(getPosition(parent), getPosition(focusedST));
        
        if (!isParentFocusedST && this.isWithinVariableStmt === 0 && (isMapFn || isFilterFn)) {
            this.isWithinArrayFn -= 1;
        }
    }

    endVisitVariableStatement(node: VariableStatement, parent: Node): void {
        const { focusedST } = this.context;
        const isFocusedST = isPositionsEquals(getPosition(node), getPosition(focusedST));

        if (!isFocusedST) {
            this.isWithinVariableStmt -= 1;
        }
    }

    getNodes() {
        const nodes = [this.inputNode, this.outputNode];

        if (!isDataImportNode(this.inputNode) && !isDataImportNode(this.outputNode)) {
            // Add node to capture the sub mappings
            const subMappingNode = getSubMappingNode(this.context);
            // Insert subMappingNode in the middle
            nodes.splice(1, 0, subMappingNode);

            // Add array filter node in focused views
            if (this.inputNode instanceof FocusedInputNode) {
                this.arrayFilterNode = getArrayFilterNode(this.inputNode);
            }
        }

        nodes.push(...this.intermediateNodes);

        if (this.arrayFilterNode) {
            nodes.unshift(this.arrayFilterNode);
        }

        return nodes;
    }

    getRootInputNode() {
        return createInputNodeForDmFunction(this.context.functionST, this.context);
    }

    getInputNode() {
        return this.inputNode;
    }

    getIntermediateNodes() {
        return this.intermediateNodes;
    }
}
