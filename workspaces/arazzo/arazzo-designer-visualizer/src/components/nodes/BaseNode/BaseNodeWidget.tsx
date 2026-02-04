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
import { keyframes } from '@emotion/react';
import { ThemeColors } from '@wso2/ui-toolkit';
import {
    NODE_WIDTH,
    NODE_HEIGHT,
    PADDING,
    NODE_PADDING,
} from '../../../constants/nodeConstants';
import { BaseNodeData } from './BaseNodeModel';

/**
 * Styled Components - Matching BI styling exactly
 */
export namespace NodeStyles {
    export type NodeStyleProp = {
        disabled?: boolean;
        hovered?: boolean;
        hasError?: boolean;
        readOnly?: boolean;
        isSelected?: boolean;
        flash?: boolean;
    };

    const flashAnim = keyframes`
        0% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
        40% { box-shadow: 0 6px 18px rgba(255, 235, 59, 0.18); }
        100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); }
    `;

    export const Node = styled.div<NodeStyleProp>`
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        min-height: ${NODE_HEIGHT}px;
        padding: 0 ${PADDING / 2}px;
        background-color: ${ThemeColors.SURFACE_DIM};
        color: ${ThemeColors.ON_SURFACE};
        opacity: ${(props: NodeStyleProp) => (props.disabled ? 0.7 : 1)};
        border: ${(props: NodeStyleProp) => (props.disabled ? 2 : 1)}px;
        border-style: ${(props: NodeStyleProp) => (props.disabled ? 'dashed' : 'solid')};
        border-color: ${(props: NodeStyleProp) =>
            props.hasError
                ? ThemeColors.ERROR
                : props.flash
                    ? ThemeColors.SECONDARY
                    : props.isSelected && !props.disabled
                        ? ThemeColors.SECONDARY
                        : props.hovered && !props.disabled && !props.readOnly
                            ? ThemeColors.SECONDARY
                            : ThemeColors.OUTLINE_VARIANT};
        border-radius: 10px;
        cursor: ${(props: NodeStyleProp) => (props.readOnly ? 'default' : 'pointer')};
        transition: all 0.15s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
        animation: ${(props: NodeStyleProp) => (props.flash ? `${flashAnim} 0.8s ease` : 'none')};

        &:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
        }
    `;

    export const Header = styled.div`
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        gap: 2px;
        flex: 1;
        min-width: 0;
        padding: ${NODE_PADDING}px;
    `;

    export const Title = styled.div`
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: 'GilmerMedium', sans-serif;
        font-size: 14px;
    `;

    export const Description = styled.div`
        width: 100%;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: monospace;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        word-break: break-all;
        color: ${ThemeColors.ON_SURFACE};
        opacity: 0.7;
        white-space: normal;
        font-size: 12px;
        line-height: 14px;
        max-height: 28px;
    `;

    export const StyledHandle = styled(Handle)`
        opacity: 0;
        pointer-events: all;
        background: ${ThemeColors.OUTLINE_VARIANT};
    `;
}

/**
 * BaseNodeWidget - Base React component for all nodes
 * Matches BI BaseNodeWidget but adapted for React Flow
 */
export interface BaseNodeWidgetProps {
    id: string;
    data: BaseNodeData;
    selected?: boolean;
    isConnectable?: boolean;
    children?: React.ReactNode;
}

export const BaseNodeWidget: React.FC<BaseNodeWidgetProps> = ({
    id,
    data,
    selected,
    isConnectable,
    children,
}) => {
    const [hovered, setHovered] = React.useState(false);

    return (
        <NodeStyles.Node
            disabled={data.disabled}
            hovered={hovered}
            flash={data.flash}
            hasError={data.hasError}
            isSelected={selected}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <NodeStyles.Header>
                <NodeStyles.Title>{data.label}</NodeStyles.Title>
            </NodeStyles.Header>

            {children}

            {/* Standard handles - child nodes can override or extend */}
            <NodeStyles.StyledHandle
                type="target"
                position={Position.Top}
                id="h-top-target"
                isConnectable={isConnectable}
            />
            <NodeStyles.StyledHandle
                type="source"
                position={Position.Bottom}
                id="h-bottom-source"
                isConnectable={isConnectable}
            />
        </NodeStyles.Node>
    );
};
