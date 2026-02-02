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

const StepNodeContainer = styled.div`
    background-color: ${ThemeColors.SURFACE_DIM};
    border: ${1}px solid ${ThemeColors.OUTLINE_VARIANT};
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    border-radius: 10px;
    padding: 8px ${C.PADDING / 4}px;
    width: ${C.NODE_WIDTH}px;
    min-height: ${C.NODE_HEIGHT}px;
    box-sizing: border-box;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    cursor: default;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 14px rgba(0,0,0,0.18);
        border-color: ${ThemeColors.SECONDARY};
    }
`;

const StepNodeContent = styled.div`
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--vscode-editor-foreground, #d4d4d4);
    font-size: 12px;
    font-weight: 500;
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    text-align: center;
    letter-spacing: 0.2px;
    user-select: none;
`;

const StyledHandle = styled(Handle)`
    opacity: 0;
    pointer-events: all;
`;

export interface StepNodeProps {
    data: {
        label: string;
    };
    isConnectable: boolean;
}

export const StepNode: React.FC<StepNodeProps> = ({ data, isConnectable }) => {
    return (
        <StepNodeContainer>
            <StepNodeContent>{data.label}</StepNodeContent>
            
            {/* Preserve all original handles */}
            <StyledHandle
                type="target"
                position={Position.Left}
                id="h-left"
                isConnectable={isConnectable}
            />
            <StyledHandle
                type="source"
                position={Position.Top}
                id="h-top"
                isConnectable={isConnectable}
            />
            <StyledHandle
                type="target"
                position={Position.Top}
                id="h-top-target"
                isConnectable={isConnectable}
            />
            <StyledHandle
                type="source"
                position={Position.Right}
                id="h-right"
                isConnectable={isConnectable}
            />
            <StyledHandle
                type="source"
                position={Position.Bottom}
                id="h-bottom"
                isConnectable={isConnectable}
            />
        </StepNodeContainer>
    );
};
