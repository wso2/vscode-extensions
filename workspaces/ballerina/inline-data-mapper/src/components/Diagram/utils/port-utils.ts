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
import { NodeModel } from "@projectstorm/react-diagrams";

import { InputNode, ObjectOutputNode } from "../Node";
import { InputOutputPortModel } from "../Port";
import { ARRAY_OUTPUT_TARGET_PORT_PREFIX, OBJECT_OUTPUT_TARGET_PORT_PREFIX } from "./constants";
import { ArrayOutputNode } from "../Node/ArrayOutput/ArrayOutputNode";

export function getInputPort(node: InputNode, inputField: string): InputOutputPortModel {
    let port = node.getPort(`${inputField}.OUT`) as InputOutputPortModel;

    while (port && port.hidden) {
        port = port.parentModel;
    }

    return port;
}

export function getOutputPort(
    node: ObjectOutputNode | ArrayOutputNode,
    outputField: string
): [InputOutputPortModel, InputOutputPortModel] {
    const portId = `${getTargetPortPrefix(node)}.${outputField}.IN`;
    const port = node.getPort(portId);
    
    if (port) {
        const actualPort = port as InputOutputPortModel;
        let mappedPort = actualPort;

        while (mappedPort && mappedPort.hidden) {
            mappedPort = mappedPort.parentModel;
        }

        return [actualPort, mappedPort];
    }

    return [undefined, undefined];
}

export function getTargetPortPrefix(node: NodeModel): string {
	switch (true) {
		case node instanceof ObjectOutputNode:
			return OBJECT_OUTPUT_TARGET_PORT_PREFIX;
        case node instanceof ArrayOutputNode:
            return ARRAY_OUTPUT_TARGET_PORT_PREFIX;
        // TODO: Update cases for other node types
		default:
			return "";
	}
}
