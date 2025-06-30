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
import { ArrayLiteralExpression, BinaryExpression, Node, ObjectLiteralExpression } from "ts-morph";
import { Visitor } from "../../ts/base-visitor";
import { getPosition, isPositionsEquals, NodePosition, traversNode } from "../Diagram/utils/st-utils";
import { isInputAccessExpr } from "../Diagram/utils/common-utils";

export class LinkDeletingVisitor implements Visitor {
    /** The property assignment or object literal expression that needs to be removed  */
    private field: Node;
    /** Node of the root level object literal expression which will be traversed to find the delete position */
    private rootObjLitExpr: Node;
    /** Nodes to be deleted */
    private targetedDeleteNodes: Node[];
    /** NodePosition of the property assignment or object literal expression that needs to be removed */
    private fieldPosition: NodePosition;

    /**
     * Visitor to traverse and identify the delete position when deleting a link
     * @param field The property assignment or object literal expression that needs to be removed
     * @param rootObjLitExpr Node of the root level object literal expression
     */
    constructor(field: Node, rootObjLitExpr: Node) {
        this.field = field;
        this.rootObjLitExpr = rootObjLitExpr;
        this.targetedDeleteNodes = [];
        this.fieldPosition = getPosition(field);
    }

    public beginVisitObjectLiteralExpression(node: ObjectLiteralExpression) {
        this.findDeletePosition(node, false);
    }

    public beginVisitArrayLiteralExpression(node: ArrayLiteralExpression): void {
        this.findDeletePositionWithinListConstructor(node);
    }

    public beginVisitBinaryExpression(node: BinaryExpression): void {
        if (this.targetedDeleteNodes.length === 0) {
            // LHS could be another binary expression or field access node
            // RHS is always property access expression

            const lhsExpr = node.getLeft();
            const rhsExpr = node.getRight();
    
            if (lhsExpr
                && isInputAccessExpr(lhsExpr)
                && isPositionsEquals(this.fieldPosition, getPosition(lhsExpr))
            ) {
                // If LHS is a property access expression to be deleted
                // Then also delete the operator right to it
                this.targetedDeleteNodes.push(lhsExpr, node.getOperatorToken());
            } else if (rhsExpr
                && isInputAccessExpr(rhsExpr)
                && isPositionsEquals(this.fieldPosition, getPosition(rhsExpr))
            ) {
                // If RHS is a property access expressionto be deleted
                // Then also delete the operator left to it
                this.targetedDeleteNodes.push(rhsExpr, node.getOperatorToken());
            }
        }
    }

    /**
     * Traverse and find the position that needs to be removed
     * @param node object literal expression which will be checked for the item to delete
     * @param isChildOfList Is object literal expression, a child of a array literal expression
     */
    private findDeletePosition(node: ObjectLiteralExpression, isChildOfList: boolean) {
        if (this.targetedDeleteNodes.length === 0) {
            const properties = node.getProperties();
            const deleteIndex = properties.findIndex(property => {
                if (Node.isPropertyAssignment(property)) {
                    const innerExprBody = property.getInitializer();
                    if (Node.isObjectLiteralExpression(innerExprBody)) {
                        // If its a nested map constructor, then compare with the value expression position
                        if (isPositionsEquals(this.fieldPosition, getPosition(innerExprBody))) {
                            return true;
                        }
                    }
                }
                // Else if its a normal field access elements
                return isPositionsEquals(this.fieldPosition, getPosition(property));
            });

            if (deleteIndex !== -1) {
                /** Field to be deleted */
                const propery = properties[deleteIndex];
                let updatedTargetedDeleteNode = this.field;

                if (Node.isPropertyAssignment(propery)) {
                    const innerExpr = propery.getInitializer();
                    if (Node.isObjectLiteralExpression(innerExpr)) {
                        // If its a nested object literal expression,
                        // then select the delete position as the selected node position
                        updatedTargetedDeleteNode = propery;
                    }
                }

                if (properties.length === 1) {
                    // If only one element in the expression (Could be a root level or sub level object literal expression)
                    if (isPositionsEquals(getPosition(node), getPosition(this.rootObjLitExpr)) || isChildOfList || Node.isAsExpression(node.getParent())) {
                        // If only single element in the root level mapping, then only delete that link
                        // Or if the last element is within a object literal expression which is within a array literal expression
                        this.targetedDeleteNodes.push(updatedTargetedDeleteNode);
                    } else {
                        // if there's only a single element in a sub level object mapping
                        // Then, will need to delete record object literal expression element itself
                        // Therefore re-running the same visitor with the parent object map as the one to delete
                        const linkDeleteVisitor = new LinkDeletingVisitor(node, this.rootObjLitExpr);
                        traversNode(this.rootObjLitExpr, linkDeleteVisitor);
                        this.targetedDeleteNodes.push(...linkDeleteVisitor.getNodesToDelete());
                    }
                } else {
                    this.targetedDeleteNodes.push(updatedTargetedDeleteNode);
                }
            }
        }
    }

    private findDeletePositionWithinListConstructor(node: ArrayLiteralExpression) {
        if (this.targetedDeleteNodes.length === 0) {
            const elements = node.getElements();
            const deleteIndex = elements.findIndex(element => {
                if (Node.isAsExpression(element)) {
                    element = element.getExpression();
                }
                return isPositionsEquals(this.fieldPosition, getPosition(element));
            });

            if (deleteIndex !== -1) {
                const selected = elements[deleteIndex];
                this.targetedDeleteNodes.push(selected);
            } else {
                for (const item of elements) {
                    if (Node.isObjectLiteralExpression(item)) {
                        this.findDeletePosition(item, true);
                    }
                }
            }
        }
    }

    /** Get Nodes to be removed when deleting a link in a object literal expression */
    getNodesToDelete(): Node[] {
        return this.targetedDeleteNodes;
    }
}
