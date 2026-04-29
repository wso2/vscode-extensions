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
import { Position, NodeProps } from '@xyflow/react';
import { BaseNodeWidget, NodeStyles } from '../BaseNode/BaseNodeWidget';
import { StepNodeData } from './StepNodeModel';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { ThemeColors } from '@wso2/ui-toolkit';
import successIcon from '../../../resources/icons/success.svg';
import failIcon from '../../../resources/icons/fail.svg';

// ---- Trace status overlay styles ----

const pulse = keyframes`
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
`;

type TraceIndicatorProps = { traceState: 'running' | 'passed' | 'failed' };

const TraceIndicator = styled.div<TraceIndicatorProps>`
    position: absolute;
    top: 1px;
    right: 1px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    background-color: ${({ traceState }: TraceIndicatorProps) =>
        traceState === 'running' ? ThemeColors.PRIMARY : 'transparent'};
    animation: ${({ traceState }: TraceIndicatorProps) => traceState === 'running' ? pulse : 'none'} 1s ease-in-out infinite;
    box-shadow: ${({ traceState }: TraceIndicatorProps) => traceState === 'running' ? '0 1px 4px rgba(0, 0, 0, 0.3)' : 'none'};
`;

const DurationLabel = styled.div`
    position: absolute;
    bottom: 2px;
    right: 6px;
    font-size: 10px;
    font-family: monospace;
    color: var(--vscode-descriptionForeground);
    opacity: 0.85;
    z-index: 10;
    pointer-events: none;
`;

/**
 * StepNodeWidget - React component for step nodes
 * Extends BaseNodeWidget with step-specific rendering
 */
export const StepNodeWidget: React.FC<NodeProps<StepNodeData>> = (props) => {
    const { id, data, selected, isConnectable } = props;
    const traceStatus = data.traceStatus;

    return (
        <BaseNodeWidget {...props} leftAligned>
            {/* Trace status indicator */}
            {traceStatus && (
                <TraceIndicator traceState={traceStatus.state}>
                    {traceStatus.state === 'running' ? null
                        : traceStatus.state === 'passed'
                            ? <img src={successIcon} width={14} height={14} />
                            : <img src={failIcon} width={14} height={14} />}
                </TraceIndicator>
            )}
            {/* Duration label */}
            {traceStatus && traceStatus.durationMs !== undefined && (
                <DurationLabel>
                    {traceStatus.durationMs < 1000
                        ? `${Math.round(traceStatus.durationMs)}ms`
                        : `${(traceStatus.durationMs / 1000).toFixed(1)}s`}
                </DurationLabel>
            )}
            {/* Additional handles for step nodes - ensure both sides have correct source/target roles */}
            <NodeStyles.StyledHandle
                type="target"
                position={Position.Left}
                id="h-left"
                isConnectable={isConnectable}
            />
            <NodeStyles.StyledHandle
                type="target"
                position={Position.Top}
                id="h-top"
                isConnectable={isConnectable}
            />
            {/* Additional target for goto (3/4 from left on top edge) */}
            <NodeStyles.StyledHandle
                type="target"
                position={Position.Top}
                id="goto-top-target"
                isConnectable={isConnectable}
                style={{ left: '75%' }}
            />
            <NodeStyles.StyledHandle
                type="source"
                position={Position.Right}
                id="h-right-source"
                isConnectable={isConnectable}
            />
            <NodeStyles.StyledHandle
                type="target"
                position={Position.Right}
                id="h-right-target"
                isConnectable={isConnectable}
            />
            <NodeStyles.StyledHandle
                type="source"
                position={Position.Bottom}
                id="h-bottom"
                isConnectable={isConnectable}
            />
        </BaseNodeWidget>
    );
};
