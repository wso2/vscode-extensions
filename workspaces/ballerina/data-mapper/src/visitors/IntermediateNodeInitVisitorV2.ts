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
import { LinkConnectorNode, QueryExprConnectorNode, ClauseConnectorNode, BinaryConnectorNode } from "../components/Diagram/Node";
import { DataMapperNodeModel } from "../components/Diagram/Node/commons/DataMapperNode";
import { DataMapperContext } from "../utils/DataMapperContext/DataMapperContext";
import { NewMapping } from "@wso2/ballerina-core";
import { BaseVisitor } from "./BaseVisitor";

export class IntermediateNodeInitVisitorV2 implements BaseVisitor {
    private intermediateNodes: DataMapperNodeModel[] = [];

    constructor(
        private context: DataMapperContext,
    ){
    }

    beginVisitNewMapping(node: NewMapping): void {
        // Assign node.input to a variable
        const input = node.input;
        if (input.kind == "binary") {
            const binaryExprNode = new BinaryConnectorNode(this.context, node);
            this.intermediateNodes.push(binaryExprNode);
        }
    }

    getNodes() {
        return this.intermediateNodes;
    }
}
