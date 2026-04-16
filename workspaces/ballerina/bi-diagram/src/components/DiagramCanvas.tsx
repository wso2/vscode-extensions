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

import React, { useCallback } from "react";
import { css, Global } from "@emotion/react";
import styled from "@emotion/styled";
import "../resources/assets/font/fonts.css";
import { useDiagramContext } from "./DiagramContext";
import { CANVAS_BG_COLOR, CANVAS_DOT_COLOR, NODE_TEXT_COLOR } from "../resources/constants";
import { getPreferredCursorAnchor } from "./cursorAnchor";

export interface DiagramCanvasProps {
    color?: string;
    background?: string;
    children?: React.ReactNode;
}

export namespace DiagramStyles {
    export const Container = styled.div<{ color: string; background: string; locked?: boolean }>`
        height: 100%;
        background-size: 50px 50px;
        display: flex;
        position: relative;
        pointer-events: ${(props) => (props.locked ? "none" : "auto")};

        > * {
            height: 100%;
            min-height: 100%;
            width: 100%;
        }

        background-image: radial-gradient(${CANVAS_DOT_COLOR} 10%, transparent 0px);
        background-size: 16px 16px;
        background-color: ${CANVAS_BG_COLOR};
        font-family: "GilmerRegular";
    `;

    export const Expand = css`
        html,
        body,
        #root {
            height: 100%;
        }
    `;
}

/**
 * Convert viewport coordinates to diagram coordinates
 * Accounts for pan (offset) and zoom transformations
 */
function screenToDiagramPosition(engine: any, screenX: number, screenY: number): { x: number; y: number } {
    if (!engine) return { x: screenX, y: screenY };
    
    const model = engine.getModel();
    const zoomLevel = model.getZoomLevel() / 100.0;
    const offsetX = model.getOffsetX();
    const offsetY = model.getOffsetY();
    
    // Reverse the transformation: subtract offset, then divide by zoom
    const diagramX = (screenX - offsetX) / zoomLevel;
    const diagramY = (screenY - offsetY) / zoomLevel;
    
    return { x: diagramX, y: diagramY };
}

export function DiagramCanvas(props: DiagramCanvasProps) {
    const { color, background, children } = props;
    const { lockCanvas, onCursorMove, isCollaborationActive, diagramEngine, selectedNodeId, menuOpenNodeId } = useDiagramContext();

    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (onCursorMove && isCollaborationActive) {
            const rect = event.currentTarget.getBoundingClientRect();
            const viewportX = event.clientX - rect.left;
            const viewportY = event.clientY - rect.top;
            
            // Convert viewport coordinates to diagram coordinates
            const diagramPos = screenToDiagramPosition(diagramEngine, viewportX, viewportY);
            
            console.log('[DiagramCanvas] Mouse move:', {
                viewport: { x: viewportX, y: viewportY },
                diagram: diagramPos,
                zoom: diagramEngine?.getModel()?.getZoomLevel(),
                offset: { 
                    x: diagramEngine?.getModel()?.getOffsetX(), 
                    y: diagramEngine?.getModel()?.getOffsetY() 
                }
            });
            
            const anchorNodeId = menuOpenNodeId || selectedNodeId;
            if (anchorNodeId) {
                const anchor = getPreferredCursorAnchor(diagramEngine, anchorNodeId);
                if (anchor) {
                    onCursorMove(anchor.x, anchor.y, anchorNodeId);
                    return;
                }
                onCursorMove(diagramPos.x, diagramPos.y, anchorNodeId);
                return;
            }

            onCursorMove(diagramPos.x, diagramPos.y);
        }
    }, [onCursorMove, isCollaborationActive, diagramEngine, selectedNodeId, menuOpenNodeId]);

    return (
        <>
            <Global styles={DiagramStyles.Expand} />
            <DiagramStyles.Container
                id="bi-diagram-canvas"
                data-testid="bi-diagram-canvas"
                background={background || CANVAS_BG_COLOR}
                color={color || NODE_TEXT_COLOR}
                locked={lockCanvas}
                onMouseMove={handleMouseMove}
            >
                {children}
            </DiagramStyles.Container>
        </>
    );
}
