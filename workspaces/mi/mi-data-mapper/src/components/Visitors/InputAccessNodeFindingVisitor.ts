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
import { CallExpression, ElementAccessExpression, Identifier, Node, PropertyAccessExpression } from "ts-morph";
import { Visitor } from "../../ts/base-visitor";
import { isFunctionArgument, isFunctionCall, isInputAccessExpr, isMapFunction, isMethodCall } from "../Diagram/utils/common-utils";

export class InputAccessNodeFindingVisitor implements Visitor {
    private inputNodes: (PropertyAccessExpression | ElementAccessExpression | Identifier)[];
    private mapFnDepth: number;

    constructor() {
        this.inputNodes = []
        this.mapFnDepth = 0;
    }

    public beginVisitPropertyAccessExpression(node: PropertyAccessExpression, parent?: Node) {
        this.addToInputNodesIfEligible(node, parent);
    }


    public beginVisitElementAccessExpression(node: ElementAccessExpression, parent?: Node) {
        this.addToInputNodesIfEligible(node, parent);
    }

    public beginVisitIdentifier(node: Identifier, parent?: Node) {
        const inputAccessExpr = isInputAccessExpr(parent);
        let functionCall = false;
        
        
        if (isFunctionCall(parent)) {
            const fnName = (parent as CallExpression).getExpression().getText();
            functionCall = fnName === node.getText();
        }

        const typeReference = parent && Node.isTypeReference(parent);

        if ((!parent || !(inputAccessExpr || functionCall || typeReference)) && this.mapFnDepth === 0) {
            this.inputNodes.push(node);
        }
    }

    public beginVisitCallExpression(node: CallExpression) {
        if (isMapFunction(node)) {
            this.mapFnDepth += 1;
        }
    }

    public endVisitCallExpression(node: CallExpression){
        if (isMapFunction(node)) {
            this.mapFnDepth -= 1;
        }
    }

    private addToInputNodesIfEligible(node: ElementAccessExpression | PropertyAccessExpression, parent?: Node) {
        if (this.mapFnDepth > 0) return;
    
        if (!parent || (!isInputAccessExpr(parent) && !Node.isCallExpression(parent))) {
            this.inputNodes.push(node);
        } else if (parent && Node.isCallExpression(parent)) {
            const expr = node.getExpression();

            if (isFunctionCall(parent) || isMethodCall(parent)) {
                const args = parent.getArguments();
                if (args.includes(node)) {
                    // Capture the input access expressions as arguments of the function/method call
                    // eg: average(ride1.distance, ride2.distance)
                    this.inputNodes.push(node);
                } else if (isMethodCall(parent)) {
                    // Capture the input access expressions as access expressions of the function/method call
                    // eg: ride1.distance.toString()
                    const isInputAccessExpression = isInputAccessExpr(expr)
                    const isIdentifier = Node.isIdentifier(expr)
                        && isFunctionArgument(expr.getText(), parent.getSourceFile());
                    
                    if (isInputAccessExpression || isIdentifier) {
                        this.inputNodes.push(expr as ElementAccessExpression | PropertyAccessExpression | Identifier);
                    }
                }
            } else if (isInputAccessExpr(expr) || Node.isIdentifier(expr)) {
                this.inputNodes.push(expr as ElementAccessExpression | PropertyAccessExpression | Identifier);
            }
        }
    }

    public getInputAccessNodes(): (PropertyAccessExpression | ElementAccessExpression | Identifier)[] {
        return this.inputNodes
    }
}
