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
import { Node, ObjectLiteralExpression, PropertyAssignment } from "ts-morph";
import { Visitor } from "../../ts/base-visitor";

export class FocusedSTFindingVisitor implements Visitor {
    private targetFieldFqn: string;
    private resolvedNode: PropertyAssignment;
    private index: number;
    private stack: string[];

    constructor(targetFieldFqn: string) {
        this.targetFieldFqn = targetFieldFqn;
        this.resolvedNode = null;
        this.index = -1;
        this.stack = [];
    }

    public beginVisitPropertyAssignment(node: PropertyAssignment) {
        const propertyName = node.getName();
        this.stack.push(propertyName);
        const fieldFqn = this.getFieldFqn();

        if (fieldFqn === this.targetFieldFqn) {
            this.resolvedNode = node;
        }
    }

    public beginVisitObjectLiteralExpression(node: ObjectLiteralExpression, parent: Node) {
        if (Node.isArrayLiteralExpression(parent)) {
            const elementIndex = parent.getElements().indexOf(node);
            this.stack.push(elementIndex.toString());
        }
    }

    public endVisitPropertyAssignment(_node: PropertyAssignment): void {
        this.stack.pop();
    }

    public endVisitObjectLiteralExpression(_node: ObjectLiteralExpression, parent: Node) {
        if (Node.isArrayLiteralExpression(parent)) {
            this.stack.pop();
        }
    }

    private getFieldFqn(): string {
        return this.stack.reduce((prev, current) =>
            prev.length === 0 ? current : `${prev}.${current}`, '');
    }

    public getResolvedNode(): PropertyAssignment {
        return this.resolvedNode;
    }
}
