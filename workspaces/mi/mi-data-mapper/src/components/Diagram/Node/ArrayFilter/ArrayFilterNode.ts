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
import { Point } from "@projectstorm/geometry";
import { DefaultPortModel } from "@projectstorm/react-diagrams";
import { CallExpression } from "ts-morph";

import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { ArrowLinkModel } from "../../Link";
import { FocusedInputNode } from "../FocusedInput";
import { getFilterExpressions } from "../../utils/common-utils";

export const ARRAY_FILTER_NODE_TYPE = "datamapper-node-array-filter";
const NODE_ID = "array-filter-node";

export class ArrayFilterNode extends DataMapperNodeModel {

    public x: number;
    public y: number;
    public sourcePort: DefaultPortModel;
    public targetPort: DefaultPortModel;
    public filterExpressions: CallExpression[];
    public noOfFilters: number;

    constructor(
        public focusedInputNode: FocusedInputNode
    ) {
        const context = focusedInputNode.context;
        super(
            NODE_ID,
            context,
            ARRAY_FILTER_NODE_TYPE
        );
        this.filterExpressions = getFilterExpressions(focusedInputNode.value);
        this.noOfFilters = this.filterExpressions.length;
    }

    initPorts() {
        this.sourcePort = new DefaultPortModel(false, ARRAY_FILTER_NODE_TYPE)
        this.addPort(this.sourcePort);
    }

    initLinks() {
        const lm = new ArrowLinkModel();
        lm.setSourcePort(this.sourcePort);
        lm.setTargetPort(this.targetPort);
        this.getModel().addAll(lm);
    }

    setPosition(point: Point): void;
    setPosition(x: number, y: number): void;
    setPosition(x: unknown, y?: unknown): void {
        if (typeof x === 'number' && typeof y === 'number') {
            if (!this.x || !this.y) {
                this.x = x;
                this.y = y;
            }
            super.setPosition(x, y);
        }
    }
}
