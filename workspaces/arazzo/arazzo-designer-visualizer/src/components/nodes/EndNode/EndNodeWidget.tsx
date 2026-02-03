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
import { Handle, Position, NodeProps } from '@xyflow/react';
import styled from '@emotion/styled';
import { ThemeColors } from '@wso2/ui-toolkit';
import { END_NODE_DIAMETER, END_NODE_INNER_DIAMETER } from '../../../constants/nodeConstants';
import { EndNodeData } from './EndNodeModel';

const EndNodeRoot = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const EndNodeInner = styled.div`
    background: #960000; /* pure red */
    width: ${END_NODE_INNER_DIAMETER}px;
    height: ${END_NODE_INNER_DIAMETER}px;
    border-radius: 50%;
    box-shadow: none;
    box-sizing: border-box;
`;

const StyledHandle = styled(Handle)`
    opacity: 0;
    pointer-events: all;
`;

/**
 * EndNodeWidget - React component for end nodes
 */
export const EndNodeWidget: React.FC<NodeProps<EndNodeData>> = ({ data, isConnectable }) => {
    return (
        <EndNodeRoot>
            <EndNodeInner />

            <StyledHandle
                type="target"
                position={Position.Left}
                id="h-left"
                isConnectable={isConnectable}
                style={{ left: 0, top: '50%', transform: 'translate(-50%, -50%)' }}
            />
            <StyledHandle
                type="target"
                position={Position.Top}
                id="h-top"
                isConnectable={isConnectable}
                style={{ left: '50%', top: 0, transform: 'translate(-50%, -50%)' }}
            />
        </EndNodeRoot>
    );
};
