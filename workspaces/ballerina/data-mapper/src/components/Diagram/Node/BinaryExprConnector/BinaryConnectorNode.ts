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
import { DMDiagnostic, NewMapping, BinaryInput, BasicInput } from "@wso2/ballerina-core";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperLinkModel } from "../../Link";
import { InputOutputPortModel, IntermediatePortModel } from "../../Port";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { findInputNode } from "../../utils/node-utils";
import { getInputPort, getTargetPortPrefix } from "../../utils/port-utils";
import { OFFSETS } from "../../utils/constants";

export const BINARY_EXPR_CONNECTOR_NODE_TYPE = "binary-expr-connector-node";
const NODE_ID = "binary-expr-connector-node";

export class BinaryConnectorNode extends DataMapperNodeModel {

    public sourcePorts: InputOutputPortModel[] = [];
    public leftSourcePort: InputOutputPortModel;
    public rightSourcePort: InputOutputPortModel;
    public targetPort: InputOutputPortModel;
    public targetMappedPort: InputOutputPortModel;

    // public inPort: IntermediatePortModel;
    public outPort: IntermediatePortModel;

    public lhsInPort: IntermediatePortModel;
    public rhsInPort: IntermediatePortModel;

    public diagnostics: DMDiagnostic[];
    public value: string;
    public hidden: boolean;
    public shouldInitLinks: boolean;
    public label: string;

    constructor(
        public context: IDataMapperContext,
        public mapping: NewMapping
    ) {
        super(
            NODE_ID,
            context,
            BINARY_EXPR_CONNECTOR_NODE_TYPE
        );
    }

    initPorts(): void {
        this.sourcePorts = [];
        this.leftSourcePort = undefined;
        this.rightSourcePort = undefined;
        this.targetMappedPort = undefined;
        this.outPort = new IntermediatePortModel(`${this.mapping.outputId}_OUT`, "OUT");
        const binaryInput = this.mapping.input as BinaryInput; // c = a + b
        this.lhsInPort = new IntermediatePortModel(`${binaryInput.left}_BINARY_IN_LEFT`, "IN");
        this.rhsInPort = new IntermediatePortModel(`${binaryInput.right}_BINARY_IN_RIGHT`, "IN");
        this.addPort(this.outPort);
        this.addPort(this.lhsInPort);
        this.addPort(this.rhsInPort);

        const basicLeftInput = binaryInput.left as BasicInput;
        const basicRightInput = binaryInput.right as BasicInput;

        const leftInputNode = findInputNode(basicLeftInput.id, this, undefined, undefined);
        if (leftInputNode) {
            this.leftSourcePort = getInputPort(leftInputNode, basicLeftInput.id);
        }

        const rightInputNode = findInputNode(basicRightInput.id, this, undefined, undefined);
        if (rightInputNode) {
            this.rightSourcePort = getInputPort(rightInputNode, basicRightInput.id);
        }

        this.getModel().getNodes().map((node) => {
            const targetPortPrefix = getTargetPortPrefix(node);
            this.targetPort = node.getPort(`${targetPortPrefix}.${this.mapping.outputId}.IN`) as InputOutputPortModel;
            if (this.targetPort) {
                this.targetMappedPort = this.targetPort;
                return;
            }
        });
    }

    initLinks(): void {
        const leftSourcePort = this.leftSourcePort;
        if (leftSourcePort) {
            const inPort = this.lhsInPort;
            const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);

            lm.setTargetPort(inPort);
            lm.setSourcePort(leftSourcePort);
            lm.registerListener({
                selectionChanged(event) {
                    if (event.isSelected) {
                        inPort.fireEvent({}, "link-selected");
                        leftSourcePort.fireEvent({}, "link-selected");
                    } else {
                        inPort.fireEvent({}, "link-unselected");
                        leftSourcePort.fireEvent({}, "link-unselected");
                    }
                },
            })
            this.getModel().addAll(lm as any);
        }

        const rightSourcePort = this.rightSourcePort;
        if (rightSourcePort) {
            const inPort1 = this.rhsInPort;
            const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);

            lm.setTargetPort(inPort1);
            lm.setSourcePort(rightSourcePort);
            lm.registerListener({
                selectionChanged(event) {
                    if (event.isSelected) {
                        inPort1.fireEvent({}, "link-selected");
                        rightSourcePort.fireEvent({}, "link-selected");
                    } else {
                        inPort1.fireEvent({}, "link-unselected");
                        rightSourcePort.fireEvent({}, "link-unselected");
                    }
                },
            })
            this.getModel().addAll(lm as any);
        }

        if (this.targetMappedPort) {
            const outPort = this.outPort;
            const targetPort = this.targetMappedPort;

            const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);

            lm.setTargetPort(this.targetMappedPort);
            lm.setSourcePort(this.outPort);
            lm.registerListener({
                selectionChanged(event) {
                    if (event.isSelected) {
                        outPort.fireEvent({}, "link-selected");
                        targetPort.fireEvent({}, "link-selected");
                    } else {
                        outPort.fireEvent({}, "link-unselected");
                        targetPort.fireEvent({}, "link-unselected");
                    }
                },
            })

            this.getModel().addAll(lm as any);
        }
    }

    public updatePosition() {
        if (this.targetMappedPort) {
            const position = this.targetMappedPort.getPosition();
            this.setPosition(
                this.hasError()
                    ? OFFSETS.QUERY_EXPR_CONNECTOR_NODE_WITH_ERROR.X
                    : OFFSETS.LINK_CONNECTOR_NODE.X,
                position.y - 2
            );
        }
    }

    public hasError(): boolean {
        return this.diagnostics?.length > 0;
    }
}
