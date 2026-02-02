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

const StartNodeContainer = styled.div`
    width: ${C.START_NODE_DIAMETER}px;
    height: ${C.START_NODE_DIAMETER}px;
    border-radius: 50%;
    background-color: ${ThemeColors.PRIMARY};
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    border: 2px solid ${ThemeColors.OUTLINE_VARIANT};
    transition: all 0.15s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.16);
    }
`;

const StartNodeLabel = styled.div`
    color: ${ThemeColors.ON_PRIMARY};
    font-weight: 700;
    font-size: 11px;
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    user-select: none;
`;

const StyledHandle = styled(Handle)`
    background: ${ThemeColors.PRIMARY};
    border: 2px solid ${ThemeColors.SURFACE_DIM};
    width: 8px;
    height: 8px;
    transition: all 0.2s ease;

    &:hover {
        transform: scale(1.2);
    }
`;

export interface StartNodeProps {
    data: any;
    isConnectable: boolean;
}

export const StartNode: React.FC<StartNodeProps> = ({ data, isConnectable }) => {
    return (
        <StartNodeContainer>
            <StyledHandle
                type="source"
                position={Position.Right}
                id="h-right"
                isConnectable={isConnectable}
            />
            <StartNodeLabel>Start</StartNodeLabel>
        </StartNodeContainer>
    );
};
