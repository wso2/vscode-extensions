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
import { RETRY_NODE_DIAMETER } from '../../../constants/nodeConstants';
import { RetryNodeData } from './RetryNodeModel';

const RetryNodeContainer = styled.div`
    width: ${RETRY_NODE_DIAMETER}px;
    height: ${RETRY_NODE_DIAMETER}px;
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

export const RetryNodeWidget: React.FC<NodeProps<RetryNodeData>> = ({ id, data, isConnectable }) => {
    const reactFlowInstance = useReactFlow();

    const handleHoverAddEdge = () => {
        try {
            const targetId = (data as any).gotoNodeId || (data as any).gotoNode || undefined;
            if (!targetId) { return; }
            const hoverEdgeId = `hover_e_${id}-${targetId}`;

            reactFlowInstance.setEdges((eds: any[]) => {
                const exists = eds.some(e => e.id === hoverEdgeId);
                if (exists) { return eds; }
                const newEdge = {
                    id: hoverEdgeId,
                    source: id,
                    target: targetId,
                    sourceHandle: 'h-top-source',
                    targetHandle: 'h-top',
                    type: 'smoothstep',
                    style: { stroke: ThemeColors.SECONDARY, strokeDasharray: '4 4' },
                    animated: false,
                };
                return [...eds, newEdge];
            });
        } catch (e) {
            // ignore
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
        const targetId = (data as any).gotoNodeId || (data as any).gotoNode || undefined;
        if (!targetId) { return; }

        if (data.gotoX !== undefined && data.gotoY !== undefined) {
            reactFlowInstance.setCenter(data.gotoX, data.gotoY, { zoom: 1, duration: 800 });
        } else {
            try {
                const nodes = reactFlowInstance.getNodes();
                const targetNode: any = nodes.find((n: any) => n.id === targetId);
                if (targetNode) {
                    const nodeX = targetNode.position?.x ?? (targetNode.data?.viewState?.x ?? 0);
                    const nodeY = targetNode.position?.y ?? (targetNode.data?.viewState?.y ?? 0);
                    const nodeW = (targetNode.style && targetNode.style.width) || (targetNode.data?.viewState?.w) || 0;
                    const nodeH = (targetNode.style && targetNode.style.height) || (targetNode.data?.viewState?.h) || 0;
                    const centerX = nodeX + (Number(nodeW) / 2);
                    const centerY = nodeY + (Number(nodeH) / 2);
                    reactFlowInstance.setCenter(centerX, centerY, { zoom: 1, duration: 800 });
                }
            } catch (e) {
                // ignore
            }
        }

        // Flash the target node border briefly
        try {
            reactFlowInstance.setNodes((nds: any[]) =>
                nds.map(n => n.id === targetId ? { ...n, data: { ...n.data, flash: true } } : n)
            );

            window.setTimeout(() => {
                reactFlowInstance.setNodes((nds: any[]) =>
                    nds.map(n => n.id === targetId ? { ...n, data: { ...n.data, flash: false } } : n)
                );
            }, 800);
        } catch (e) {
            // ignore
        }
    };

    const tooltip = data.gotoLabel || data.label || '';

    return (
        <RetryNodeContainer
            onClick={handleClick}
            onMouseEnter={handleHoverAddEdge}
            onMouseLeave={handleHoverRemoveEdge}
            title={tooltip}
        >
            <RetryIcon>↻</RetryIcon>

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
            {/* invisible source handle for hover-edge rendering */}
            <StyledHandle
                type="source"
                position={Position.Top}
                id="h-top-source"
                isConnectable={isConnectable}
                style={{ opacity: 0 }}
            />
        </RetryNodeContainer>
    );
};
