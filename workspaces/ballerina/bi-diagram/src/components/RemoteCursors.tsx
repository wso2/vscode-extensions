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

import React from "react";
import styled from "@emotion/styled";
import { useDiagramContext } from "./DiagramContext";
import { getPreferredCursorAnchor } from "./cursorAnchor";

/**
 * Convert diagram coordinates back to screen/viewport coordinates for rendering
 * Applies zoom and pan transformations
 */
function diagramToScreenPosition(engine: any, diagramX: number, diagramY: number): { x: number; y: number } {
    if (!engine) return { x: diagramX, y: diagramY };
    
    const model = engine.getModel();
    const zoomLevel = model.getZoomLevel() / 100.0;
    const offsetX = model.getOffsetX();
    const offsetY = model.getOffsetY();
    
    // Apply the transformation: multiply by zoom, then add offset
    const screenX = diagramX * zoomLevel + offsetX;
    const screenY = diagramY * zoomLevel + offsetY;
    
    return { x: screenX, y: screenY };
}

interface RemoteCursor {
    user: {
        id: string;
        name: string;
        color?: string;
    };
    cursor?: {
        x: number;
        y: number;
        nodeId?: string;
        timestamp: number;
    };
}

const CursorContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 1000;
    width: 100%;
    height: 100%;
`;

const Cursor = styled.div<{ x: number; y: number; color: string }>`
    position: absolute;
    left: ${(props) => props.x}px;
    top: ${(props) => props.y}px;
    transform: translate(-2px, -2px);
    transition: all 0.1s ease-out;
    pointer-events: none;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
`;

const CursorSVG = styled.svg<{ color: string }>`
    width: 22px;
    height: 22px;
    fill: ${(props) => props.color};
`;

const CursorLabel = styled.div<{ color: string }>`
    position: absolute;
    left: 20px;
    top: 20px;
    background-color: ${(props) => props.color};
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

function getColorForUser(userId: string): string {
    let hash = 2166136261;
    for (let i = 0; i < userId.length; i++) {
        hash ^= userId.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    const normalizedHash = hash >>> 0;
    const hue = normalizedHash % 360;
    const saturation = 65 + (normalizedHash % 15);
    const lightness = 50 + ((normalizedHash >>> 8) % 12);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function RemoteCursors() {
    const { remoteCursors, currentUserId, isCollaborationActive, diagramEngine } = useDiagramContext();

    if (!isCollaborationActive) {
        console.log('[RemoteCursors] Collaboration not active');
        return null;
    }
    
    if (!remoteCursors || remoteCursors.size === 0) {
        console.log('[RemoteCursors] No remote cursors to display');
        return null;
    }
    
    if (!diagramEngine) {
        console.warn('[RemoteCursors] DiagramEngine not available - cannot transform coordinates');
        return null;
    }

    const cursors: RemoteCursor[] = [];
    remoteCursors.forEach((presence: RemoteCursor, key: string) => {
        console.log('[RemoteCursors] Processing cursor entry:', { key, presence });
        // Filter out own cursor and cursors without position data
        if (presence.user?.id && presence.user.id !== currentUserId && presence.cursor) {
            cursors.push(presence);
        }
    });

    console.log('[RemoteCursors] Filtered cursors to render:', cursors.length, cursors);

    if (cursors.length === 0) {
        return null;
    }

    return (
        <CursorContainer>
            {cursors.map((presence) => {
                const { user, cursor } = presence;
                if (!cursor) return null;
                const anchoredDiagramPos = getPreferredCursorAnchor(diagramEngine, cursor.nodeId);
                const screenPos = diagramToScreenPosition(
                    diagramEngine,
                    anchoredDiagramPos?.x ?? cursor.x,
                    anchoredDiagramPos?.y ?? cursor.y
                );

                const color = getColorForUser(user.id);
                const userName = user.name || user.id;

                return (
                    <Cursor key={user.id} x={screenPos.x} y={screenPos.y} color={color}>
                        <CursorSVG color={color} viewBox="0 0 24 24">
                            <path d="M4.5 2 L4.5 18 L9 13.5 L12.5 20 L15 19 L11.5 12 L18 12 Z" />
                        </CursorSVG>
                        <CursorLabel color={color}>{userName}</CursorLabel>
                    </Cursor>
                );
            })}
        </CursorContainer>
    );
}
