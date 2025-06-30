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
import * as React from 'react';

import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams-core';

import { ArrayFilterNode, ARRAY_FILTER_NODE_TYPE } from './ArrayFilterNode';
import { ArrayFilterNodeWidget } from "./ArrayFilterNodeWidget";

export class ArrayFilterNodeFactory extends AbstractReactFactory<ArrayFilterNode, DiagramEngine> {
    constructor() {
        super(ARRAY_FILTER_NODE_TYPE);
    }

    generateReactWidget(event: { model: ArrayFilterNode; }): JSX.Element {
        return (
            <ArrayFilterNodeWidget
                filterExpressions={event.model.filterExpressions}
                focusedInputCallExpr={event.model.focusedInputNode.value}
                context={event.model.context}
                label={event.model.focusedInputNode.nodeLabel}
                engine={this.engine}
                port={event.model.getPort(ARRAY_FILTER_NODE_TYPE)}
            />
        );
    }

    generateModel(): ArrayFilterNode {
        return undefined;
    }
}
