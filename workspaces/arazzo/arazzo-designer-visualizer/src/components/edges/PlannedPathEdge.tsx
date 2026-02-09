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

interface Waypoint {
    x: number;
    y: number;
}

interface PlannedPathData {
    waypoints?: Waypoint[];
}

/**
 * PlannedPathEdge: Custom edge component with manual waypoint control.
 * 
 * If data.waypoints exists: Draws a path through each waypoint sequentially.
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
    let edgePath: string;

    // Check if waypoints exist and are valid
    const waypoints = data?.waypoints;
    if (Array.isArray(waypoints) && waypoints.length > 0) {
        // Build SVG path command manually through waypoints
        // Start at source
        let pathCommands = `M ${sourceX} ${sourceY}`;
        
        // Draw lines through each waypoint
        waypoints.forEach((point) => {
            pathCommands += ` L ${point.x} ${point.y}`;
        });
        
        // End at target
        pathCommands += ` L ${targetX} ${targetY}`;
        
        edgePath = pathCommands;
        console.log(`[PlannedPathEdge] ${id} using waypoints:`, waypoints);
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

    return (
        <BaseEdge
            id={id}
            path={edgePath}
            style={style}
            markerEnd={markerEnd}
        />
    );
}
