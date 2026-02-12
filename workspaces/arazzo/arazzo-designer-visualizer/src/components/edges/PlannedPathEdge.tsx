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

import { EdgeProps, BaseEdge, getSmoothStepPath, useEdges, useNodes } from '@xyflow/react';
import { BRIDGE_RADIUS, DEFAULT_EPS, getPointsForEdge as getEdgePoints, detectBridgesForSegment, buildSegmentPathWithBridges } from './edgeIntersectDetect';
import { ThemeColors } from '@wso2/ui-toolkit';
import { useState } from 'react';
import * as C from '../../constants/nodeConstants';

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
    const [labelHovered, setLabelHovered] = useState(false);

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

        // intersection helpers moved to `edgeIntersectDetect.ts`; constants imported above (BRIDGE_RADIUS, DEFAULT_EPS)

        // Gather other edges & nodes once (exclude current).
        // NOTE: React Flow may not populate sourceX/targetX on edges returned by
        // `useEdges()` in some render passes — fall back to node positions.
        const allEdges = useEdges();
        const otherEdges = (allEdges || []).filter(e => e.id !== id);
        // Get nodes from React Flow so we can reconstruct edge endpoints when
        // `sourceX/sourceY` or `targetX/targetY` are not available on the edge object.
        const nodes = useNodes() as any[] || [];
        const nodeById = new Map((nodes || []).map((n: any) => [n.id, n]));

        // Forwarding wrapper that uses the centralized helper (keeps behaviour)
        const getPointsForEdge = (e: any) => getEdgePoints(e, nodeById);

        // Emit a straight segment but inject bridge arcs when crossing
        // orthogonal segments from other edges (supports vertical *and* horizontal).
        let pen = { x: points[0].x, y: points[0].y };
        const emitLineWithBridges = (from: { x: number; y: number }, to: { x: number; y: number }) => {
            const intersections = detectBridgesForSegment(from, to, otherEdges as any[], nodeById, BRIDGE_RADIUS, DEFAULT_EPS);
            const frag = buildSegmentPathWithBridges(from, to, intersections, BRIDGE_RADIUS);
            pen = { x: to.x, y: to.y };
            return frag;
        };

        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = i < points.length - 1 ? points[i + 1] : null;

            if (!next) {
                // Last segment - draw straight to target (with bridges if needed)
                pathCommands += emitLineWithBridges(pen, { x: curr.x, y: curr.y });
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
                // Too short - draw straight line (with bridges)
                pathCommands += emitLineWithBridges(pen, { x: curr.x, y: curr.y });
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

            // Draw line to the point before corner (with bridges on that straight)
            pathCommands += emitLineWithBridges(pen, { x: beforeX, y: beforeY });

            // Draw quadratic bezier curve through the corner
            // Control point is the corner itself for a smooth 90-degree arc
            pathCommands += ` Q ${curr.x} ${curr.y} ${afterX} ${afterY}`;
            pen = { x: afterX, y: afterY };
        }

        edgePath = pathCommands;

        // Smart label positioning for bent paths
        if (data?.label) {
            if (waypoints.length >= 2) {
                // Scenario B: position at a fixed distance along the segment after second bend
                const secondBend = waypoints[1];
                const nextPoint = waypoints[2] || { x: targetX, y: targetY };

                const dx = nextPoint.x - secondBend.x;
                const dy = nextPoint.y - secondBend.y;
                const segLen = Math.sqrt(dx * dx + dy * dy);

                // If segment is too short, fall back to midpoint behavior
                if (segLen < 1) {
                    labelPosition = { x: secondBend.x + dx * 0.5, y: secondBend.y + dy * 0.5 };
                } else {
                    const ux = dx / segLen;
                    const uy = dy / segLen;
                    const dist = Math.min(C.LABEL_OFFSET, segLen * 0.5); // don't overshoot
                    labelPosition = {
                        x: secondBend.x + ux * dist, //+ dx * C.LABEL_OFFSET_RANDOMNESS_MULTIPLIER, // the dx * 0.2 is to introduce some randomness based on the line length so that the labels do not overlap
                        y: secondBend.y + uy * dist //+ dy * C.LABEL_OFFSET_RANDOMNESS_MULTIPLIER,
                    };
                }
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

    const finalStyle = {
        ...(style || {}),
        stroke: hovered ? ThemeColors.SECONDARY : (style as any)?.stroke,
    };

    // When hovered we render a local, unique marker (inlined <defs>) and point
    // the edge at that marker so the arrowhead color follows the stroke.
    const hoverMarkerId = `pl_${id}-hover-marker`;
    const markerEndAttr = hovered && markerEnd ? `url(#${hoverMarkerId})` : markerEnd;

    return (
        <g 
            onMouseEnter={() => setHovered(true)} 
            onMouseLeave={() => setHovered(false)}
            style={{ pointerEvents: 'all' }}
        >
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
                    x={labelPosition.x - 400 + (data.labelOffset?.x ?? 0)}
                    y={labelPosition.y - 20 + (data.labelOffset?.y ?? -10)}
                    width={800}
                    height={40}
                    style={{ overflow: 'visible', pointerEvents: 'none' }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none'
                        }}
                    >
                        <div
                            title={String(data.label || '')}
                            onMouseEnter={() => setLabelHovered(true)}
                            onMouseLeave={() => setLabelHovered(false)}
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
                                transition: 'all 0.2s ease-in-out',
                                zIndex: labelHovered ? 100 : 1,
                                position: 'relative',
                                pointerEvents: 'all'
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
                                    maxWidth: labelHovered ? '800px' : '200px',
                                    display: 'inline-block',
                                    transition: 'max-width 0.2s ease-in-out'
                                }}
                            >
                                {(() => {
                                    const raw = String(data.label || '');
                                    const max = C.CONDITION_CHARS_BEFORE_WRAP;
                                    if (labelHovered) return raw;
                                    return raw.length > max ? `${raw.slice(0, max)}...` : raw;
                                })()}
                            </span>
                        </div>
                    </div>
                </foreignObject>
            )}
        </g>
    );
}
