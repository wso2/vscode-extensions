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

import { PortModelAlignment } from "@projectstorm/react-diagrams";
import { APIResource, NamedSequence, STNode } from "@wso2/mi-syntax-tree/src";
import { NodePortModel } from "../../NodePort/NodePortModel";
import { NodeTypes } from "../../../resources/constants";
import { BaseNodeModel } from "../BaseNodeModel";

export class PlusNodeModel extends BaseNodeModel {
    protected model: APIResource | NamedSequence;
    readonly type: "OpenSidePanel" | "AddNewTag" = "AddNewTag";

    constructor(stNode: STNode, mediatorName: string, documentUri: string, type: "OpenSidePanel" | "AddNewTag" = "AddNewTag") {
        super(NodeTypes.PLUS_NODE, mediatorName, documentUri, stNode);
        this.type = type;
    }

    addPort<T extends NodePortModel>(port: T): T {
        super.addPort(port);
        if (port.getOptions().in) {
            this.portIn = port;
        } else {
            this.portOut = port;
        }
        return port;
    }

    addInPort(label: string): NodePortModel {
        const port = new NodePortModel({
            in: true,
            name: "in",
            label: label,
            alignment: PortModelAlignment.TOP,
        });
        super.addPort(port);
        this.portIn = port;
        return port;
    }
}
