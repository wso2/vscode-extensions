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

import { Node } from '@xyflow/react';
import { BaseNodeModel, BaseNodeData } from '../BaseNode/BaseNodeModel';

/**
 * StepNodeData - Extends BaseNodeData with step-specific properties
 */
export interface StepNodeData extends BaseNodeData {
    stepType?: string;
    // Add any step-specific data here
}

/**
 * StepNodeModel - Data model for step nodes
 * Extends BaseNodeModel with step-specific logic
 */
export class StepNodeModel extends BaseNodeModel {
    declare data: StepNodeData;

    constructor(node: Node<StepNodeData>) {
        super(node);
        this.type = 'stepNode';
    }

    // Add step-specific methods here if needed
    getStepType(): string | undefined {
        return this.data.stepType;
    }
}
