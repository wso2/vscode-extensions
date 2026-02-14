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
    z-index: 10000;
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
    width: 24px;
    height: 24px;
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

// Default colors for users (Material Design palette)
const USER_COLORS = [
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#FFA07A", // Light Salmon
    "#98D8C8", // Mint
    "#F7DC6F", // Yellow
    "#BB8FCE", // Purple
    "#85C1E2", // Sky Blue
];

function getColorForUser(userId: string): string {
    // Generate a consistent color based on user ID
    const hash = userId.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return USER_COLORS[hash % USER_COLORS.length];
}

export function RemoteCursors() {
    const { remoteCursors, currentUserId, isCollaborationActive } = useDiagramContext();

    if (!isCollaborationActive || !remoteCursors || remoteCursors.size === 0) {
        return null;
    }

    const cursors: RemoteCursor[] = [];
    remoteCursors.forEach((presence: RemoteCursor) => {
        // Filter out own cursor and cursors without position data
        if (presence.user?.id !== currentUserId && presence.cursor) {
            cursors.push(presence);
        }
    });

    if (cursors.length === 0) {
        return null;
    }

    return (
        <CursorContainer>
            {cursors.map((presence) => {
                const { user, cursor } = presence;
                if (!cursor) return null;

                const color = user.color || getColorForUser(user.id);
                const userName = user.name || user.id;

                return (
                    <Cursor key={user.id} x={cursor.x} y={cursor.y} color={color}>
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
