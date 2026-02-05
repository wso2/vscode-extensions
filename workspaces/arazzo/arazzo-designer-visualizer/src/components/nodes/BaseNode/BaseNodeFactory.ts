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
import { BaseNodeData, BaseNodeModel } from './BaseNodeModel';

/**
 * BaseNodeFactory - Utility functions for creating and managing base nodes
 * Adapted from BI's Factory pattern to work with React Flow
 */
export class BaseNodeFactory {
    /**
     * Create a new base node with default data
     */
    static createNode(
        id: string,
        position: { x: number; y: number },
        data: Partial<BaseNodeData> = {}
    ): Node<BaseNodeData> {
        return {
            id,
            type: 'baseNode',
            position,
            data: {
                label: data.label || 'Base Node',
                description: data.description,
                width: data.width,
                height: data.height,
                disabled: data.disabled ?? false,
                hasError: data.hasError ?? false,
                errorMessage: data.errorMessage,
            },
        };
    }

    /**
     * Create a BaseNodeModel from a React Flow Node
     * Useful for Visitor patterns that need the model abstraction
     */
    static createModel(node: Node<BaseNodeData>): BaseNodeModel {
        return new BaseNodeModel(node);
    }

    /**
     * Convert array of models back to React Flow nodes
     */
    static modelsToNodes(models: BaseNodeModel[]): Node<BaseNodeData>[] {
        return models.map((model) => model.toReactFlowNode());
    }
}
