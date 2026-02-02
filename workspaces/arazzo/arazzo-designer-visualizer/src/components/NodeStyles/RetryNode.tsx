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
import { Handle, Position } from '@xyflow/react';
import styled from '@emotion/styled';
import * as C from '../../constants/nodeConstants';
import { ThemeColors } from '@wso2/ui-toolkit';

const RetryNodeContainer = styled.div`
    width: ${C.RETRY_NODE_DIAMETER}px;
    height: ${C.RETRY_NODE_DIAMETER}px;
    border-radius: 50%;
    background-color: ${ThemeColors.SECONDARY};
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    border: 2px solid ${ThemeColors.OUTLINE_VARIANT};
    transition: all 0.15s ease;
    cursor: pointer;

    &:hover {
        transform: translateY(-2px) rotate(6deg);
        box-shadow: 0 6px 12px rgba(0,0,0,0.16);
    }
`;

const RetryIcon = styled.div`
    color: ${ThemeColors.ON_SECONDARY};
    font-size: 22px;
    font-weight: 700;
    user-select: none;
    margin-top: -2px;
`;

const StyledHandle = styled(Handle)`
    opacity: 0;
    pointer-events: all;
    background: ${ThemeColors.SECONDARY};
    border: 2px solid ${ThemeColors.ON_SURFACE};
    width: 10px;
    height: 10px;
    box-shadow: 0 0 8px rgba(0,0,0,0.08);
`;

export interface RetryNodeProps {
    data: any;
    isConnectable: boolean;
}

export const RetryNode: React.FC<RetryNodeProps> = ({ data, isConnectable }) => {
    return (
        <RetryNodeContainer>
            <RetryIcon>↻</RetryIcon>
            
            {/* Preserve exact handles from original */}
            <StyledHandle
                type="target"
                position={Position.Left}
                id="h-left"
                isConnectable={isConnectable}
            />
            <StyledHandle
                type="target"
                position={Position.Top}
                id="h-top"
                isConnectable={isConnectable}
            />
        </RetryNodeContainer>
    );
};
