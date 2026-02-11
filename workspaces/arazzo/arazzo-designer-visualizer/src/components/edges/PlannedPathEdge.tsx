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

import { EdgeProps, BaseEdge, getSmoothStepPath } from '@xyflow/react';
import { ThemeColors } from '@wso2/ui-toolkit';
import { useState } from 'react';

interface Waypoint {
    x: number;
    y: number;
}

interface PlannedPathData {
    waypoints?: Waypoint[];
    label?: string;
    labelPos?: number; // 0..1 position along the path
    labelOffset?: { x: number; y: number };
}

// Corner radius for rounded orthogonal edges
const CORNER_RADIUS = 6;

/**
 * PlannedPathEdge: Custom edge component with manual waypoint control.
 * 
 * If data.waypoints exists: Draws a path through each waypoint sequentially with rounded corners.
 * If data.waypoints is missing or empty: Falls back to smooth step path.
 * 
 * Labels are rendered using foreignObject with smart positioning.
 */
export default function PlannedPathEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    style,
    markerEnd,
}: EdgeProps<PlannedPathData>) {
    let edgePath: string;
    let labelPosition: { x: number; y: number } | null = null;
    const [hovered, setHovered] = useState(false);

    // Check if waypoints exist and are valid
    const waypoints = data?.waypoints;
    if (Array.isArray(waypoints) && waypoints.length > 0) {
        // Build SVG path with rounded corners at waypoints
        const points = [
            { x: sourceX, y: sourceY },
            ...waypoints,
            { x: targetX, y: targetY }
        ];

        let pathCommands = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = i < points.length - 1 ? points[i + 1] : null;

            if (!next) {
                // Last segment - draw straight to target
                pathCommands += ` L ${curr.x} ${curr.y}`;
                break;
            }

            // Calculate segment lengths
            const dx1 = curr.x - prev.x;
            const dy1 = curr.y - prev.y;
            const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

            const dx2 = next.x - curr.x;
            const dy2 = next.y - curr.y;
            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

            // Check if segments are long enough for rounding
            const radius = Math.min(CORNER_RADIUS, dist1 / 2, dist2 / 2);

            if (radius < 1) {
                // Too short - draw straight line
                pathCommands += ` L ${curr.x} ${curr.y}`;
                continue;
            }

            // Calculate the point before the corner (radius distance from corner)
            const t1 = radius / dist1;
            const beforeX = curr.x - dx1 * t1;
            const beforeY = curr.y - dy1 * t1;

            // Calculate the point after the corner (radius distance from corner)
            const t2 = radius / dist2;
            const afterX = curr.x + dx2 * t2;
            const afterY = curr.y + dy2 * t2;

            // Draw line to the point before corner
            pathCommands += ` L ${beforeX} ${beforeY}`;

            // Draw quadratic bezier curve through the corner
            // Control point is the corner itself for a smooth 90-degree arc
            pathCommands += ` Q ${curr.x} ${curr.y} ${afterX} ${afterY}`;
        }

        edgePath = pathCommands;

        // Smart label positioning for bent paths
        if (data?.label) {
            if (waypoints.length >= 2) {
                // Scenario B: Position at 20% along segment after second bend (waypoints[1])
                const secondBend = waypoints[1];
                const nextPoint = waypoints[2] || { x: targetX, y: targetY };
                
                const dx = nextPoint.x - secondBend.x;
                const dy = nextPoint.y - secondBend.y;
                const t = 0.2; // 20% along this segment
                
                labelPosition = {
                    x: secondBend.x + dx * t,
                    y: secondBend.y + dy * t
                };
            } else {
                // Fallback: 50% of last segment
                const lastWp = waypoints[waypoints.length - 1];
                const dx = targetX - lastWp.x;
                const dy = targetY - lastWp.y;
                
                labelPosition = {
                    x: lastWp.x + dx * 0.5,
                    y: lastWp.y + dy * 0.5
                };
            }
        }

        console.log(`[PlannedPathEdge] ${id} using waypoints with rounded corners:`, waypoints);
    } else {
        // Fallback to smooth step path
        const [path] = getSmoothStepPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
        });
        edgePath = path;

        // Scenario A: Straight path - position at 80% from source to target
        if (data?.label) {
            const dx = targetX - sourceX;
            const dy = targetY - sourceY;
            const t = data.labelPos ?? 0.8; // Use labelPos or default to 80%
            
            labelPosition = {
                x: sourceX + dx * t,
                y: sourceY + dy * t
            };
        }

        console.log(`[PlannedPathEdge] ${id} using fallback smooth step path`);
    }

    // Calculate label dimensions for centering
    const labelWidth = 100;
    const labelHeight = 24;

    const finalStyle = {
        ...(style || {}),
        stroke: hovered ? ThemeColors.SECONDARY : (style as any)?.stroke,
    };

    // When hovered we render a local, unique marker (inlined <defs>) and point
    // the edge at that marker so the arrowhead color follows the stroke.
    const hoverMarkerId = `pl_${id}-hover-marker`;
    const markerEndAttr = hovered && markerEnd ? `url(#${hoverMarkerId})` : markerEnd;

    return (
        <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            {hovered && markerEnd && (
                <defs>
                    <marker
                        id={hoverMarkerId}
                        markerWidth={12.5}
                        markerHeight={12.5}
                        viewBox="-10 -10 20 20"
                        markerUnits="strokeWidth"
                        orient="auto-start-reverse"
                        refX={0}
                        refY={0}
                    >
                        <polyline
                            className="arrowclosed"
                            points="-5,-4 0,0 -5,4 -5,-4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ stroke: ThemeColors.SECONDARY, fill: ThemeColors.SECONDARY, strokeWidth: 1 }}
                        />
                    </marker>
                </defs>
            )}

            <BaseEdge
                id={id}
                path={edgePath}
                style={finalStyle}
                markerEnd={markerEndAttr}
            />
            {data?.label && labelPosition && (
                <foreignObject
                    x={labelPosition.x - labelWidth / 2 + (data.labelOffset?.x ?? 0)}
                    y={labelPosition.y - labelHeight / 2 + (data.labelOffset?.y ?? -10)}
                    width={labelWidth}
                    height={labelHeight}
                    style={{ overflow: 'visible' }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '100%',
                            height: '100%',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: '12px',
                                border: `1.5px solid ${ThemeColors.PRIMARY}`,
                                backgroundColor: ThemeColors.SURFACE_BRIGHT,
                                padding: '2px 10px',
                                boxSizing: 'border-box',
                                width: 'fit-content',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                        >
                            <span
                                style={{
                                    color: ThemeColors.PRIMARY,
                                    fontSize: '12px',
                                    fontFamily: 'var(--vscode-font-family, sans-serif)',
                                    userSelect: 'none',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '200px',
                                    display: 'inline-block',
                                }}
                            >
                                {data.label}
                            </span>
                        </div>
                    </div>
                </foreignObject>
            )}
        </g>
    );
}
