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
import { Handle, Position, useReactFlow } from '@xyflow/react';
import styled from '@emotion/styled';
import { ThemeColors } from '@wso2/ui-toolkit';

const PortalNodeContainer = styled.div`
    background-color: ${ThemeColors.PRIMARY};
    padding: 6px 14px;
    border-radius: 16px;
    color: ${ThemeColors.ON_PRIMARY};
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    transition: all 0.15s ease;
    user-select: none;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.16);
    }

    &:active {
        transform: translateY(0);
    }
`;

const PortalIcon = styled.span`
    font-size: 14px;
    font-weight: 700;
`;

const PortalLabel = styled.span`
    font-size: 11px;
    font-weight: 500;
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    letter-spacing: 0.2px;
`;

export interface PortalNodeProps {
    data: {
        label: string;
        pairedPortalX?: number;
        pairedPortalY?: number;
    };
    isConnectable: boolean;
}

export const PortalNode: React.FC<PortalNodeProps> = ({ data, isConnectable }) => {
    const reactFlowInstance = useReactFlow();

    const handleClick = () => {
        if (data.pairedPortalX !== undefined && data.pairedPortalY !== undefined) {
            reactFlowInstance.setCenter(data.pairedPortalX, data.pairedPortalY, { zoom: 1, duration: 800 });
        }
    };

    return (
        <PortalNodeContainer onClick={handleClick}>
            <PortalIcon>➔</PortalIcon>
            <PortalLabel>{data.label}</PortalLabel>
            <Handle 
                type="target" 
                position={Position.Bottom} 
                id="h-bottom" 
                isConnectable={isConnectable}
                style={{ opacity: 0 }}
            />
            <Handle 
                type="source" 
                position={Position.Bottom} 
                id="h-bottom-source" 
                isConnectable={isConnectable}
                style={{ opacity: 0 }}
            />
        </PortalNodeContainer>
    );
};
