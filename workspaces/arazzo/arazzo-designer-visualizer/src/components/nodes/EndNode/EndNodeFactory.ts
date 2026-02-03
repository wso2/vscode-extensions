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
import { EndNodeModel, EndNodeData } from './EndNodeModel';

/**
 * EndNodeFactory - Utility functions for creating and managing end nodes
 */
export class EndNodeFactory {
    static createNode(
        id: string,
        position: { x: number; y: number },
        data: Partial<EndNodeData> = {}
    ): Node<EndNodeData> {
        return {
            id,
            type: 'endNode',
            position,
            data: {
                label: data.label || 'End',
                description: data.description,
                endType: data.endType,
                width: data.width,
                height: data.height,
                disabled: data.disabled ?? false,
                hasError: data.hasError ?? false,
                errorMessage: data.errorMessage,
            },
        };
    }

    static createModel(node: Node<EndNodeData>): EndNodeModel {
        return new EndNodeModel(node);
    }

    static modelsToNodes(models: EndNodeModel[]): Node<EndNodeData>[] {
        return models.map((model) => model.toReactFlowNode() as Node<EndNodeData>);
    }
}
