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
 * EndNodeData - Extends BaseNodeData with end-specific properties
 */
export interface EndNodeData extends BaseNodeData {
    endType?: string;
    // Add any end-specific data here
}

/**
 * EndNodeModel - Data model for end nodes
 * Extends BaseNodeModel with end-specific logic
 */
export class EndNodeModel extends BaseNodeModel {
    declare data: EndNodeData;

    constructor(node: Node<EndNodeData>) {
        super(node);
        this.type = 'endNode';
    }

    // Add end-specific methods here if needed
    getEndType(): string | undefined {
        return this.data.endType;
    }
}
