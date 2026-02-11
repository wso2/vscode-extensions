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

import React from 'react';
import { Position, NodeProps } from '@xyflow/react';
import { BaseNodeWidget, NodeStyles } from '../BaseNode/BaseNodeWidget';
import { StepNodeData } from './StepNodeModel';

/**
 * StepNodeWidget - React component for step nodes
 * Extends BaseNodeWidget with step-specific rendering
 */
export const StepNodeWidget: React.FC<NodeProps<StepNodeData>> = (props) => {
    const { id, data, selected, isConnectable } = props;

    return (
        <BaseNodeWidget {...props}>
            {/* Additional handles for step nodes - ensure both sides have correct source/target roles */}
            <NodeStyles.StyledHandle
                type="target"
                position={Position.Left}
                id="h-left"
                isConnectable={isConnectable}
            />
            <NodeStyles.StyledHandle
                type="target"
                position={Position.Top}
                id="h-top"
                isConnectable={isConnectable}
            />
            {/* Additional target for goto (3/4 from left on top edge) */}
            <NodeStyles.StyledHandle
                type="target"
                position={Position.Top}
                id="goto-top-target"
                isConnectable={isConnectable}
                style={{ left: '75%' }}
            />
            <NodeStyles.StyledHandle
                type="source"
                position={Position.Right}
                id="h-right-source"
                isConnectable={isConnectable}
            />
            <NodeStyles.StyledHandle
                type="target"
                position={Position.Right}
                id="h-right-target"
                isConnectable={isConnectable}
            />
            <NodeStyles.StyledHandle
                type="source"
                position={Position.Bottom}
                id="h-bottom"
                isConnectable={isConnectable}
            />
        </BaseNodeWidget>
    );
};
