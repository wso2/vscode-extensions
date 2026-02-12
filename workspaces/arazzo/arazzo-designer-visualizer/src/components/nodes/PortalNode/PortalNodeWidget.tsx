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
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import styled from '@emotion/styled';
import { ThemeColors } from '@wso2/ui-toolkit';
import { PortalNodeData } from './PortalNodeModel';

const PortalNodeContainer = styled.div`
    background-color: ${ThemeColors.SURFACE_DIM};
    padding: 6px 12px;
    border-radius: 999px;
    color: ${ThemeColors.ON_SURFACE};
    display: inline-flex;
    align-items: center;
    gap: 8px;
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

const PortalIcon = styled.i`
    font-size: 14px;
    line-height: 1;
`;

const PortalLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    text-transform: lowercase;
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    letter-spacing: 0.2px;
`;

export const PortalNodeWidget: React.FC<NodeProps<PortalNodeData>> = ({ id, data, isConnectable }) => {
    const reactFlowInstance = useReactFlow();

    const handleHoverAddEdge = () => {
        try {
            const targetId = (data as any).gotoNodeId || (data as any).gotoNode || undefined;
            if (!targetId) { return; }
            const hoverEdgeId = `hover_e_${id}-${targetId}`;

            // add edge if not already present
            reactFlowInstance.setEdges((eds: any[]) => {
                const exists = eds.some(e => e.id === hoverEdgeId);
                if (exists) { return eds; }
                const newEdge = {
                    id: hoverEdgeId,
                    source: id,
                    target: targetId,
                    sourceHandle: 'h-top',
                    targetHandle: 'goto-top-target',
                    type: 'smoothstep',
                    style: { stroke: ThemeColors.SECONDARY, strokeDasharray: '4 4' ,strokeWidth: 2 },
                    animated: false,
                };
                return [...eds, newEdge];
            });
        } catch (e) {
            // ignore if react flow instance doesn't expose setEdges
        }
    };

    const handleHoverRemoveEdge = () => {
        try {
            const targetId = (data as any).gotoNodeId || (data as any).gotoNode || undefined;
            if (!targetId) { return; }
            const hoverEdgeId = `hover_e_${id}-${targetId}`;
            reactFlowInstance.setEdges((eds: any[]) => eds.filter(e => e.id !== hoverEdgeId));
        } catch (e) {
            // ignore
        }
    };

    const handleClick = () => {
        if (data.gotoX !== undefined && data.gotoY !== undefined) {
            reactFlowInstance.setCenter(data.gotoX, data.gotoY, { zoom: 1, duration: 800 });

            // Flash the target node border briefly to draw attention
            try {
                const targetId = (data as any).gotoNodeId || (data as any).gotoNode || undefined;
                if (targetId) {
                    reactFlowInstance.setNodes((nds: any[]) =>
                        nds.map(n => n.id === targetId ? { ...n, data: { ...n.data, flash: true } } : n)
                    );

                    window.setTimeout(() => {
                        reactFlowInstance.setNodes((nds: any[]) =>
                            nds.map(n => n.id === targetId ? { ...n, data: { ...n.data, flash: false } } : n)
                        );
                    }, 800);
                }
            } catch (e) {
                // ignore if react flow instance doesn't expose setNodes/getNodes in this build
            }
        }
    };

    // Tooltip should show the actual target step label (gotoLabel)
    const tooltip = data.gotoLabel || data.label || '';

    return (
        <PortalNodeContainer
            onClick={handleClick}
            onMouseEnter={handleHoverAddEdge}
            onMouseLeave={handleHoverRemoveEdge}
            title={tooltip}
        >
            <PortalIcon className="fw fw-link-round" />
            <PortalLabel>goto</PortalLabel>
            <Handle 
                type="target" 
                position={Position.Bottom} 
                id="h-bottom" 
                isConnectable={isConnectable}
                style={{ opacity: 0 }}
            />
            <Handle 
                type="source" 
                position={Position.Top} 
                id="h-top" 
                isConnectable={isConnectable}
                style={{ opacity: 0 }}
            />
            <Handle 
                type="target" 
                position={Position.Top} 
                id="h-top-target" 
                isConnectable={isConnectable}
                style={{ opacity: 0 }}
            />
        </PortalNodeContainer>
    );
};
