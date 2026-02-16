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
import { START_NODE_DIAMETER } from '../../../constants/nodeConstants';
import * as C from '../../../constants/nodeConstants';
import { StartNodeData } from './StartNodeModel';

const StartNodeContainer = styled.div<{ selected?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: ${C.START_NODE_HEIGHT}px;
    min-width: ${C.START_NODE_WIDTH}px;
    padding: 0 12px;
    border-radius: ${C.START_NODE_DIAMETER / 2}px; /* pill */
    background-color: ${ThemeColors.SURFACE_DIM}; /* same as step nodes */
    color: ${ThemeColors.ON_SURFACE};
    position: relative;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    border: ${C.NODE_BORDER_WIDTH}px solid ${(props: { selected?: boolean }) => (props.selected ? ThemeColors.SECONDARY : ThemeColors.OUTLINE_VARIANT)};
    transition: all 0.15s ease;

    &:hover {
        transform: translateY(-2px);
        border-color: ${ThemeColors.SECONDARY};
        box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
    }
`;

const StartNodeRoot = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const StartNodeLabel = styled.div`
    color: ${ThemeColors.ON_SURFACE};
    font-weight: 600;
    font-size: 13px;
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    user-select: none;
`;

const StyledHandle = styled(Handle)`
    opacity: 0;
    background: ${ThemeColors.PRIMARY};
    border: 2px solid ${ThemeColors.SURFACE_DIM};
    width: 8px;
    height: 8px;
    transition: all 0.2s ease;

    &:hover {
        transform: scale(1.2);
    }
`;

/**
 * StartNodeWidget - React component for start nodes
 */
export const StartNodeWidget: React.FC<NodeProps<StartNodeData>> = ({ data, isConnectable, selected }) => {
    return (
        <StartNodeRoot>
            <StyledHandle
                type="source"
                position={Position.Right}
                id="h-right-source"
                isConnectable={isConnectable}
            />

            <StyledHandle
                type="source"
                position={Position.Bottom}
                id="h-bottom"
                isConnectable={isConnectable}
            />

            <StartNodeContainer selected={selected}>
                <StartNodeLabel>{data.label || 'Start'}</StartNodeLabel>
            </StartNodeContainer>
        </StartNodeRoot>
    );
};
