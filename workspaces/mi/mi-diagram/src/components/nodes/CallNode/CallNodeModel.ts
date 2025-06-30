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

import { Endpoint, STNode } from "@wso2/mi-syntax-tree/src";
import { NODE_DIMENSIONS, NodeTypes } from "../../../resources/constants";
import { BaseNodeModel } from "../BaseNodeModel";
import { Diagnostic } from "vscode-languageserver-types";

export class CallNodeModel extends BaseNodeModel {
    readonly endpoint: Endpoint;
    readonly nodeWidth = NODE_DIMENSIONS.CALL.WIDTH;
    readonly nodeHeight = NODE_DIMENSIONS.CALL.HEIGHT;

    constructor(stNode: STNode, mediatorName:string, documentUri: string, parentNode?: STNode, prevNodes: STNode[] = [], endpoint?: Endpoint) {
        super(NodeTypes.CALL_NODE, mediatorName, documentUri, stNode, parentNode, prevNodes);
        if (endpoint) {
            this.endpoint = endpoint;
        }
    }

    getEndpoint(): STNode {
        return this.endpoint;
    }

    endpointHasDiagnostics(): boolean {
        return this.endpoint?.diagnostics && this.endpoint.diagnostics.length > 0;
    }

    getEndpointDiagnostics(): Diagnostic[] {
        return this.endpoint?.diagnostics || [];
    }
}
