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
import { DMDiagnostic } from "@wso2/mi-core";
import { Node } from "ts-morph";

export function filterDiagnosticsForNode(diagnostics: DMDiagnostic[], node: Node): DMDiagnostic[] {

    if (!node) {
        return [];
    }

    let targetNode = node;
    const parent = node.getParent();

    if (parent && (Node.isPropertyAssignment(parent) || Node.isReturnStatement(parent))) {
        targetNode = parent;
    }

    return diagnostics.filter(diagnostic =>
        (diagnostic.start >= targetNode.getStart()
            && diagnostic.start + diagnostic.length <= targetNode.getEnd())
        || (diagnostic.start <= targetNode.getStart()
            && diagnostic.start + diagnostic.length >= targetNode.getEnd())
    );
}
