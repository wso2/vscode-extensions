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
import { DMDiagnostic, BinaryInput } from "@wso2/ballerina-core";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperLinkModel } from "../../Link";
import { InputOutputPortModel, IntermediatePortModel } from "../../Port";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { getInputPortV2, getTargetPortPrefix } from "../../utils/port-utils";
import { OFFSETS } from "../../utils/constants";

export const BINARY_EXPR_CONNECTOR_NODE_TYPE = "binary-expr-connector-node";
const NODE_ID = "binary-expr-connector-node";

export class BinaryConnectorNode extends DataMapperNodeModel {

    public leftSourcePort: InputOutputPortModel;
    public rightSourcePort: InputOutputPortModel;
    public targetPort: InputOutputPortModel;
    public targetMappedPort: InputOutputPortModel;
    public targetMappedPortIntermediate: IntermediatePortModel;

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
        public outputId: string,
        public binaryInput: BinaryInput,

        public letfSourceNodeId: string,
        public leftSourceNode: DataMapperNodeModel,
        public rightSourceNodeId: string,
        public rightSourceNode: DataMapperNodeModel,
    ) {
        super(
            NODE_ID,
            context,
            BINARY_EXPR_CONNECTOR_NODE_TYPE
        );
    }

    initPorts(): void {
        this.leftSourcePort = undefined;
        this.rightSourcePort = undefined;
        this.targetMappedPort = undefined;
        this.outPort = new IntermediatePortModel(`${this.outputId}.OUT`, "OUT");
        this.lhsInPort = new IntermediatePortModel(`${this.binaryInput.left}_BINARY_IN_LEFT`, "IN");
        this.rhsInPort = new IntermediatePortModel(`${this.binaryInput.right}_BINARY_IN_RIGHT`, "IN");
        this.addPort(this.outPort);
        this.addPort(this.lhsInPort);
        this.addPort(this.rhsInPort);

        this.leftSourcePort = getInputPortV2(this.leftSourceNode, this.letfSourceNodeId);
        this.rightSourcePort = getInputPortV2(this.rightSourceNode, this.rightSourceNodeId);

        this.getModel().getNodes().map((node) => {
            const targetPortPrefix = getTargetPortPrefix(node);
            this.targetPort = node.getPort(`${targetPortPrefix}.${this.outputId}.IN`) as InputOutputPortModel;
            if (this.targetPort) {
                this.targetMappedPort = this.targetPort;
                return;
            }
        });

        // check targetMappedPort undefined case
        if (!this.targetMappedPort) {
            // this.targetMappedPort = new InputOutputPortModel({field: {id: this.outputId}, portName: `${this.outputId}`, portType:"IN"});
            this.targetMappedPortIntermediate = new IntermediatePortModel(`${this.outputId}`, "IN");
        }
    }

    initLinks(): void {
        this.createLink(this.leftSourcePort, this.lhsInPort);
        this.createLink(this.rightSourcePort, this.rhsInPort);
        if (this.targetMappedPortIntermediate) {
            this.createLink(this.outPort, this.targetMappedPortIntermediate);
        } else {
            this.createLink(this.outPort, this.targetMappedPort);
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

    private createLink(sourcePort: InputOutputPortModel|IntermediatePortModel, targetPort: InputOutputPortModel|IntermediatePortModel) {
        if (sourcePort) {
            const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);
            lm.setTargetPort(targetPort);
            lm.setSourcePort(sourcePort);
            lm.registerListener({
                selectionChanged(event) {
                    if (event.isSelected) {
                        targetPort.fireEvent({}, "link-selected");
                        sourcePort.fireEvent({}, "link-selected");
                    } else {
                        targetPort.fireEvent({}, "link-unselected");
                        sourcePort.fireEvent({}, "link-unselected");
                    }
                },
            })
            this.getModel().addAll(lm as any);
        }
    }

    public getOutputId(): string {
        if (this.outputId) {
            return this.outputId;
        }
        const dataToHash = `${this.binaryInput.expression}`;
        // const hash = crypto.createHash('sha256')
        //     .update(dataToHash)
        //     .digest('hex')
        //     .substring(0, 12);
        const hash = "crypto";
        this.outputId = `binary_${hash}`;
        return this.outputId;
    }
}
