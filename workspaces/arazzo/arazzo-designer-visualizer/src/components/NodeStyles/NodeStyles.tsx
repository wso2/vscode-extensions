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
import * as C from '../../constants/nodeConstants';

// --- Custom Condition Node ---
export const ConditionNode = ({ id, data, isConnectable }: any) => {
    // Neon Yellow Color Constant
    const neonYellow = '#FFFF00';

    return (
        <div style={{
            // --- Shape & Layout ---
            width: `${C.DIAMOND_SIZE}px`,
            height: `${C.DIAMOND_SIZE}px`,
            boxSizing: 'border-box',
            transform: 'rotate(45deg)', // Rotates square to create diamond
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',

            // --- Glass Effect ---
            background: 'rgba(255, 255, 0, 0.1)', // Low opacity yellow
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',

            // --- Border & Glow ---
            border: `2px solid ${neonYellow}`,
            // Outer glow + Inner glow
            boxShadow: `0 0 10px ${neonYellow}, inset 0 0 10px rgba(255, 255, 0, 0.2)`
        }}>
            {/* --- Text Content --- */}
            <div style={{
                transform: 'rotate(-45deg)', // Counter-rotate so text is upright
                textAlign: 'center',
                fontSize: '16px',
                fontWeight: 'bold',
                color: neonYellow,           // Neon Yellow Text
                textShadow: `0 0 8px ${neonYellow}` // Text Glow
            }}>
                ?
            </div>

            {/* Input - Visual Left (Corresponds to Bottom-Left corner of unrotated square) */}
            <Handle
                type="target"
                position={Position.Left}
                id="h-left"
                isConnectable={isConnectable}
                style={{
                    left: 0,
                    top: '100%',
                    transform: 'translate(-50%, -50%) rotate(-45deg)',
                    opacity: 0, // <--- Hidden
                    background: neonYellow
                }}
            />

            {/* Output - Visual Right (Corresponds to Top-Right corner of unrotated square) */}
            <Handle
                type="source"
                position={Position.Right}
                id="h-right"
                isConnectable={isConnectable}
                style={{
                    left: '100%',
                    top: 0,
                    transform: 'translate(-50%, -50%) rotate(-45deg)',
                    opacity: 0, // <--- Hidden
                    background: neonYellow
                }}
            />
        </div>
    );
};

export const StartNode = ({ data, isConnectable }: any) => {
    // Neon Green Color Constant
    const neonColor = '#39ff14';

    return (
        <div style={{
            // --- Glass Effect ---
            background: 'rgba(57, 255, 20, 0.1)', // Low opacity neon green
            backdropFilter: 'blur(6px)',          // The "Frosted Glass" blur
            WebkitBackdropFilter: 'blur(6px)',    // Safari support

            // --- Shape & Size ---
            width: `${C.START_NODE_DIAMETER}px`,
            height: `${C.START_NODE_DIAMETER}px`,
            borderRadius: '50%',
            boxSizing: 'border-box',

            // --- Border & Glow ---
            border: `2px solid ${neonColor}`,
            // Outer glow + Inner glow for depth
            boxShadow: `0 0 10px ${neonColor}, inset 0 0 10px rgba(57, 255, 20, 0.2)`,

            // --- Layout & Text ---
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: neonColor,
            fontWeight: 'bold',
            fontSize: '10px',
            fontFamily: '"Courier New", Courier, monospace', // Tech/Code font
            textTransform: 'uppercase',
            letterSpacing: '1px'
        }}>
            {/* Styled Handle to match */}
            <Handle
                type="source"
                position={Position.Right}
                id="h-right"
                isConnectable={isConnectable}
                style={{ background: neonColor, border: 'none', boxShadow: `0 0 5px ${neonColor}` }}
            />
            Start
        </div>
    );
};

export const EndNode = ({ data, isConnectable }: any) => {
    // Neon Red Color Constant
    const neonRed = '#ff3131';

    return (
        <div style={{
            // --- Glass Effect ---
            background: 'rgba(255, 7, 58, 0.1)', // Low opacity neon red
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',

            // --- Shape & Size ---
            width: `${C.END_NODE_DIAMETER}px`,
            height: `${C.END_NODE_DIAMETER}px`,
            borderRadius: '50%',
            boxSizing: 'border-box',

            // --- Border & Glow ---
            border: `2px solid ${neonRed}`,
            // Outer red glow + Inner red glow
            boxShadow: `0 0 10px ${neonRed}, inset 0 0 10px rgba(255, 7, 58, 0.2)`,

            // --- Layout ---
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
        }}>
            {/* Inner Termination Dot (Glowing) */}
            <div style={{
                background: neonRed,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                // Makes the inner dot look like a laser/LED
                boxShadow: `0 0 8px ${neonRed}`
            }} />

            {/* Input from normal flows (Left) */}
            <Handle
                type="target"
                position={Position.Left}
                id="h-left"
                isConnectable={isConnectable}
                style={{ opacity: 0 }}
            />

            {/* Input from Failure flows (Top) */}
            <Handle
                type="target"
                position={Position.Top}
                id="h-top"
                isConnectable={isConnectable}
                style={{ opacity: 0 }}
            />
        </div>
    );
};

// --- Custom Retry Node ---
export const RetryNode = ({ data, isConnectable }: any) => {
    // Neon Blue Color Constant
    const neonBlue = '#00f3ff';

    return (
        <div style={{
            // --- Glass Effect ---
            background: 'rgba(0, 243, 255, 0.1)', // Low opacity neon blue
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',

            // --- Shape & Size ---
            width: `${C.RETRY_NODE_DIAMETER}px`,
            height: `${C.RETRY_NODE_DIAMETER}px`,
            borderRadius: '50%',
            boxSizing: 'border-box',

            // --- Border & Glow ---
            border: `2px solid ${neonBlue}`,
            // Outer blue glow + Inner blue glow
            boxShadow: `0 0 10px ${neonBlue}, inset 0 0 10px rgba(0, 243, 255, 0.2)`,

            // --- Layout ---
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            color: neonBlue,
            fontSize: '18px',
            fontWeight: 'bold'
        }}>
            {/* Retry Icon (Unicode) */}
            <div style={{ transform: 'rotate(0deg)', marginTop: '-2px' }}>
                ↻
            </div>

            {/* Input from normal flows (Left) */}
            <Handle
                type="target"
                position={Position.Left}
                id="h-left"
                isConnectable={isConnectable}
                style={{ background: neonBlue, border: 'none', boxShadow: `0 0 5px ${neonBlue}`, opacity: 0 }}
            />

            {/* Input from Failure flows (Top) */}
            <Handle
                type="target"
                position={Position.Top}
                id="h-top"
                isConnectable={isConnectable}
                style={{ background: neonBlue, border: 'none', boxShadow: `0 0 5px ${neonBlue}`, opacity: 0 }}
            />
        </div>
    );
};

// --- Custom Step Node ---
export const StepNode = ({ data, isConnectable }: any) => {
    // Deep Electric Blue (Dark Neon)
    const neonDarkBlue = '#0099ff';

    return (
        <div style={{
            // --- Glass Effect & Colors ---
            // Very dark background to contrast with the deep blue
            background: 'rgba(2, 4, 10, 0.95)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',

            // --- Border & Glow ---
            border: `1px solid ${neonDarkBlue}`,
            // Deep blue glow
            boxShadow: `0 0 10px ${neonDarkBlue}, inset 0 0 20px rgba(44, 90, 242, 0.1)`,
            color: '#ffffff',

            // --- Layout & Size ---
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            borderRadius: '4px',
            padding: '10px',
            minWidth: '150px',
            textAlign: 'center',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',

            // --- Text Styling ---
            fontSize: '12px',
            fontFamily: '"Courier New", Courier, monospace',
            letterSpacing: '1px',
            fontWeight: 'bold',
            textTransform: 'uppercase'
        }}>
            <div style={{
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }}>
                {data.label}
            </div>

            {/* --- Handles (Hidden but Functional) --- */}
            <Handle
                type="target"
                position={Position.Left}
                id="h-left"
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
            <Handle
                type="source"
                position={Position.Right}
                id="h-right"
                isConnectable={isConnectable}
                style={{ opacity: 0 }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="h-bottom"
                isConnectable={isConnectable}
                style={{ opacity: 0 }}
            />
        </div>
    );
};

// --- Custom Portal Node ---
export const PortalNode = ({ data, isConnectable }: any) => {
    const reactFlowInstance = useReactFlow();

    const handleClick = () => {
        if (data.pairedPortalX !== undefined && data.pairedPortalY !== undefined) {
            // Move viewport to center on the paired portal
            reactFlowInstance.setCenter(data.pairedPortalX, data.pairedPortalY, { zoom: 1, duration: 800 });
        }
    };

    return (
        <div
            onClick={handleClick}
            style={{
                background: '#39f',
                padding: '5px 10px',
                borderRadius: '15px',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                border: '1px solid #0055aa',
                cursor: 'pointer'
            }}>
            <span style={{ fontSize: '10px' }}>➔</span>
            <span>{data.label}</span>
            <Handle type="target" position={Position.Bottom} id="h-bottom" isConnectable={isConnectable} />
            <Handle type="source" position={Position.Bottom} id="h-bottom-source" isConnectable={isConnectable} />
        </div>
    );
};

// Register custom node types
export const nodeTypes = {
    condition: ConditionNode,
    start: StartNode,
    end: EndNode,
    retry: RetryNode,
    stepNode: StepNode,
    portal: PortalNode
};
