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
import { DIAMOND_SIZE } from '../../../constants/nodeConstants';
import { BranchIcon } from '../../../resources/icons/BranchIcon';
import { ConditionNodeData } from './ConditionNodeModel';

const ConditionNodeContainer = styled.div`
    width: ${DIAMOND_SIZE}px;
    height: ${DIAMOND_SIZE}px;
    box-sizing: border-box;
    transform: rotate(45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    background-color: ${ThemeColors.SURFACE_DIM};
    border: 2px solid ${ThemeColors.OUTLINE_VARIANT};
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
        transform: rotate(45deg) translateY(-1px);
        box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.2),
            0 2px 4px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }
`;

const ConditionNodeContent = styled.div`
    transform: rotate(-45deg);
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    color: ${ThemeColors.ON_SURFACE};
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 26px;
        height: 26px;
    }

    svg path {
        fill: ${ThemeColors.ON_SURFACE};
    }

    user-select: none;
`;

const StyledHandle = styled(Handle)`
    opacity: 0;
    pointer-events: all;
    background: ${ThemeColors.OUTLINE_VARIANT};
`;

export const ConditionNodeWidget: React.FC<NodeProps<ConditionNodeData>> = ({ data, isConnectable }) => {
    return (
        <ConditionNodeContainer>
            <ConditionNodeContent>
                <BranchIcon />
            </ConditionNodeContent>
            
            <StyledHandle
                type="target"
                position={Position.Left}
                id="h-left"
                isConnectable={isConnectable}
                style={{
                    left: 0,
                    top: '100%',
                    transform: 'translate(-50%, -50%) rotate(-45deg)',
                }}
            />
            <StyledHandle
                type="source"
                position={Position.Right}
                id="h-right"
                isConnectable={isConnectable}
                style={{
                    right: 0,
                    top: 0,
                    transform: 'translate(50%, -50%) rotate(-45deg)',
                }}
            />
        </ConditionNodeContainer>
    );
};
