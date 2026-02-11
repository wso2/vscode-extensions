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
import { useRef, useLayoutEffect, useState } from 'react';

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
    const pathRef = useRef<SVGPathElement>(null);
    const [labelPosition, setLabelPosition] = useState<{ x: number; y: number } | null>(null);
    const floatingLabelRef = useRef<SVGTextElement | null>(null);
    let edgePath: string;

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
        console.log(`[PlannedPathEdge] ${id} using fallback smooth step path`);
    }

    // Compute label position along the path
    useLayoutEffect(() => {
        if (data?.label && pathRef.current) {
            try {
                // Find the path element inside the BaseEdge
                const pathEl = pathRef.current.querySelector('path');
                if (pathEl) {
                    const pathLength = pathEl.getTotalLength();
                    const t = data.labelPos ?? 0.5; // default to middle
                    const point = pathEl.getPointAtLength(pathLength * t);
                    setLabelPosition(point);
                }
            } catch (e) {
                console.warn(`[PlannedPathEdge] Could not compute label position for ${id}`);
            }
        }
    }, [edgePath, data?.label, data?.labelPos, id]);

    // Keep label rendered on top by creating a floating <text> element appended to the top-level SVG.
    useLayoutEffect(() => {
        const svg = pathRef.current?.ownerSVGElement;
        if (!svg) return;

        // If no label, remove any floating label
        if (!data?.label || !labelPosition) {
            if (floatingLabelRef.current && floatingLabelRef.current.parentNode) {
                floatingLabelRef.current.parentNode.removeChild(floatingLabelRef.current);
                floatingLabelRef.current = null;
            }
            return;
        }

        // Create floating text if missing
        if (!floatingLabelRef.current) {
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('fill', 'var(--vscode-editor-foreground, #333)');
            t.setAttribute('font-size', '12px');
            t.setAttribute('font-family', 'var(--vscode-font-family, sans-serif)');
            t.setAttribute('text-anchor', 'middle');
            t.setAttribute('pointer-events', 'none');
            (t as any).style.userSelect = 'none';
            svg.appendChild(t);
            floatingLabelRef.current = t;
        }

        // Update label content and position
        const t = floatingLabelRef.current!;
        t.textContent = data.label as string;
        const offsetX = data.labelOffset?.x ?? 0;
        const offsetY = data.labelOffset?.y ?? -8;
        t.setAttribute('x', String(labelPosition.x + offsetX));
        t.setAttribute('y', String(labelPosition.y + offsetY));

        return () => {
            // cleanup will be handled by effect above when label removed, but ensure removal on unmount
            // (do not remove here to avoid flicker when just updating)
        };
    }, [data?.label, data?.labelOffset, labelPosition]);

    // Remove floating label on unmount
    useLayoutEffect(() => {
        return () => {
            if (floatingLabelRef.current && floatingLabelRef.current.parentNode) {
                floatingLabelRef.current.parentNode.removeChild(floatingLabelRef.current);
                floatingLabelRef.current = null;
            }
        };
    }, []);

    return (
        <g ref={pathRef}>
            <BaseEdge
                id={id}
                path={edgePath}
                style={style}
                markerEnd={markerEnd}
            />
        </g>
    );
}
