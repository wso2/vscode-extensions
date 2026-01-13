// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import {
    Input,
    BasicInput,
    BinaryInput,
    QueryInput,
    UndefinedInput,
} from "@wso2/ballerina-core";
import { DataMapperContext } from "../utils/DataMapperContext/DataMapperContext";
import { BinaryConnectorNode } from "../components/Diagram/Node";
import { DataMapperNodeModel } from "../components/Diagram/Node/commons/DataMapperNode";
import { findNode } from "../components/Diagram/utils/node-utils";

export interface CreatedNode {
    id: string;
    node: DataMapperNodeModel;
}

export interface NodeVisitor {
    visitBasicNode(node: BasicInput, outputId?: string): CreatedNode | void;
    visitBinaryNode(node: BinaryInput, leftResult: CreatedNode, rightResult: CreatedNode, outputId: string): CreatedNode | void;
    visitQueryNode(node: QueryInput, outputId?: string): CreatedNode | void;
    visitUndefinedNode(node: UndefinedInput, outputId?: string): CreatedNode | void;
}

export function traverseInput(input: Input, visitor: NodeVisitor, outputId?: string): CreatedNode | void {
    if (!input) return;

    switch (input.kind) {
        case "binary":
            const binaryInput = input as BinaryInput;
            const leftResult = traverseInput(binaryInput.left, visitor);
            const rightResult = traverseInput(binaryInput.right, visitor);
            return visitor.visitBinaryNode(binaryInput, <CreatedNode>leftResult, <CreatedNode>rightResult, outputId);

        case "query":
            return visitor.visitQueryNode(input as QueryInput);

        case "undefined":
            const undefinedInput = input as UndefinedInput;
            if (undefinedInput.inputs) {
                for (const nestedInput of undefinedInput.inputs) {
                    traverseInput(nestedInput, visitor);
                }
            }
            return visitor.visitUndefinedNode(input as UndefinedInput);

        default:
            return visitor.visitBasicNode(input as BasicInput);
    }
}

export class NodeCreationVisitor implements NodeVisitor {
    private nodeMap: Map<string, DataMapperNodeModel> = new Map();

    constructor(
        private context: DataMapperContext,
        private nodes: DataMapperNodeModel[]
    ) { }

    visitBasicNode(node: BasicInput): CreatedNode | void {
        const inputNode = findNode(node.id, this.nodes);
        if (inputNode) {
            return { id: node.id, node: inputNode };
        }
    }

    visitBinaryNode(node: BinaryInput, leftResult: CreatedNode, rightResult: CreatedNode, outputId?: string): CreatedNode | void {
        const binaryNode = new BinaryConnectorNode(this.context, outputId, node, leftResult.id, leftResult.node, rightResult.id, rightResult.node);
        this.nodes.push(binaryNode);
        this.nodeMap.set(node.expression, binaryNode);
        return { id: binaryNode.getOutputId(), node: binaryNode };
    }

    visitQueryNode(node: QueryInput): void {
        // const queryNode = new QueryConnectorNode(this.context, node);
        // this.createdNodes.push(queryNode);
        // this.nodeMap.set(node.id, queryNode);
    }

    visitUndefinedNode(node: UndefinedInput): void {
        // const undefinedNode = new UndefinedInputNode(this.context, node);
        // this.createdNodes.push(undefinedNode);
        // this.nodeMap.set(node.expression, undefinedNode);
    }

    getCreatedNodes(): DataMapperNodeModel[] {
        return this.nodes;
    }

    getNodeByKey(key: string): DataMapperNodeModel | undefined {
        return this.nodeMap.get(key);
    }
}
