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
import styled from '@emotion/styled';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Overlay } from './../Commons/Overlay';
import { colors } from '../Commons/Colors';

export interface SidePanelProps {
    id?: string;
    className?: string;
    isOpen?: boolean;
    overlay?: boolean;
    children?: React.ReactNode;
    alignment?: "top" | "bottom" | "left" | "right";
    isFullWidth?: boolean;
    width?: number;
    sx?: any;
    onClose?: (event?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    subPanel?: ReactNode;
    subPanelWidth?: number;
    isSubPanelOpen?: boolean;
}

// Panels open often, so they fade in from a short offset instead of sliding across the screen.
const ENTER_TRANSITION = "transform 200ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)";
const EXIT_TRANSITION = "transform 150ms cubic-bezier(0.23, 1, 0.32, 1), opacity 150ms cubic-bezier(0.23, 1, 0.32, 1)";
// Rounds the panel edge that faces the canvas, like VS Code's large surfaces.
const OUTER_RADIUS = "var(--vscode-cornerRadius-large, 8px)";
// Kept as a transform, not none, so the panel stays the containing block for fixed-position children.
const OPEN_TRANSFORM = "translate(0, 0)";
const CLOSED_TRANSFORM: Record<SidePanelProps["alignment"], string> = {
    left: "translateX(-24px)",
    right: "translateX(24px)",
    top: "translateY(-24px)",
    bottom: "translateY(24px)",
};

// Runs after the next paint, so a just-mounted panel paints its closed state and the transition has a start.
const afterPaint = (callback: () => void) => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(callback);
    });
    return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
    };
};

const SidePanelContainer = styled.div<SidePanelProps>`
    position: fixed;
    top: ${(props: SidePanelProps) => props.alignment === "bottom" ? "auto" : 0};
    left: ${(props: SidePanelProps) => props.alignment === "left" ? 0 : (props.alignment === "bottom" || props.alignment === "top") ? 0 : "auto"};
    right: ${(props: SidePanelProps) => props.alignment === "right" ? 0 : "auto"};
    bottom: ${(props: SidePanelProps) => props.alignment === "bottom" ? 0 : "auto"};
    width: ${(props: SidePanelProps) => props.isFullWidth ? "100%" : props.alignment === "bottom" || props.alignment === "top" ? `calc(100% - ${props.width}px)` : `${props.width}px`};
    height: ${(props: SidePanelProps) => props.alignment === "bottom" ? `${props.width}px` : "100%"};
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    box-shadow: 0 5px 10px 0 var(--vscode-badge-background);
    z-index: 2000;
    opacity: ${(props: SidePanelProps) => props.isOpen ? 1 : 0};
    transform: ${(props: SidePanelProps) => props.isOpen ? OPEN_TRANSFORM : CLOSED_TRANSFORM[props.alignment]};
    transition: ${(props: SidePanelProps) => props.isOpen ? ENTER_TRANSITION : EXIT_TRANSITION};
    @media (prefers-reduced-motion: reduce) {
        transform: ${OPEN_TRANSFORM};
    }
    ${(props: SidePanelProps) => props.sx};
`;

const SubPanelContainer = styled.div<SidePanelProps>`
    position: fixed;
    top: 0;
    ${(props: SidePanelProps) => props.alignment === "left" ? `left: ${props.width}px;` : `right: ${props.width}px;`}
    ${(props: SidePanelProps) => props.alignment === "left"
        ? `border-top-right-radius: ${OUTER_RADIUS}; border-bottom-right-radius: ${OUTER_RADIUS};`
        : `border-top-left-radius: ${OUTER_RADIUS}; border-bottom-left-radius: ${OUTER_RADIUS};`}
    width: ${(props: SidePanelProps) => props?.subPanelWidth ? `${props?.subPanelWidth}px` : `calc(100vw - ${props.width}px)`};
    height: 100%;
    box-shadow: 0 5px 10px 0 var(--vscode-badge-background);
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    z-index: 1900;
    opacity: ${(props: SidePanelProps) => props.isSubPanelOpen ? 1 : 0};
    transform: ${(props: SidePanelProps) => props.isSubPanelOpen
        ? OPEN_TRANSFORM
        : CLOSED_TRANSFORM[props.alignment === 'left' ? 'left' : 'right']};
    transition: ${(props: SidePanelProps) => props.isSubPanelOpen ? ENTER_TRANSITION : EXIT_TRANSITION};
    @media (prefers-reduced-motion: reduce) {
        transform: ${OPEN_TRANSFORM};
    }
    ${(props: SidePanelProps) => props.sx};
`;

export const SidePanel: React.FC<SidePanelProps> = (props: SidePanelProps) => {
    const { id, className, isOpen = false, alignment = "right", width = 312, children, sx, overlay = true, isFullWidth = false, subPanel, subPanelWidth, isSubPanelOpen } = props;

    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(isOpen);
    const [subPanelOpen, setSubPanelOpen] = useState(isSubPanelOpen);
    const [subPanelMounted, setSubPanelMounted] = useState(!!subPanel && isOpen);

    const hidePanels = () => {
        setVisible(false);
        setSubPanelMounted(false);
    };

    const handleTransitionEnd = (event: React.TransitionEvent) => {
        // Opacity also animates under reduced motion; children's transitions bubble up here.
        if (event.target === event.currentTarget && event.propertyName === 'opacity' && !isOpen) {
            hidePanels();
        }
    };

    const handleOverlayClose = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (props.onClose) {
            setOpen(false);
            props.onClose(event);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setOpen(false);
            setSubPanelOpen(false);
            return;
        }
        setVisible(true);
        return afterPaint(() => setOpen(true));
    }, [isOpen]);

    const showSubPanel = !!subPanel && isOpen;
    // The last sub panel stays mounted while it animates out, so it fades instead of vanishing.
    const shownSubPanel = useRef({ content: subPanel, width: subPanelWidth, sx });
    if (subPanel) {
        shownSubPanel.current = { content: subPanel, width: subPanelWidth, sx };
    }
    useEffect(() => {
        if (!showSubPanel) {
            setSubPanelOpen(false);
            return;
        }
        setSubPanelMounted(true);
        return afterPaint(() => setSubPanelOpen(true));
    }, [showSubPanel]);

    const handleSubPanelTransitionEnd = (event: React.TransitionEvent) => {
        if (event.target === event.currentTarget && event.propertyName === 'opacity' && !showSubPanel) {
            setSubPanelMounted(false);
        }
    };

    useEffect(() => {
        if (!open && !isOpen) {
            const timer = setTimeout(hidePanels, 500); // Corresponds to the transition time
            return () => clearTimeout(timer);
        }
    }, [open, isOpen]);

    return (
        <div id={id} className={className}>
            {visible && (
                <>
                    { overlay && isOpen && <Overlay sx={{background: colors.vscodeInputBackground, opacity: 0.4, zIndex: 2000}} onClose={handleOverlayClose}/> }
                    <SidePanelContainer data-testid="side-panel" isOpen={open} alignment={alignment} width={width} isFullWidth={isFullWidth} sx={sx} onTransitionEnd={handleTransitionEnd}>
                        {children}
                    </SidePanelContainer>
                    {subPanelMounted && (
                        <SubPanelContainer
                            data-testid="side-panel-sub-panel"
                            isOpen={open}
                            isSubPanelOpen={subPanelOpen}
                            alignment={alignment}
                            width={width}
                            subPanelWidth={shownSubPanel.current.width}
                            sx={shownSubPanel.current.sx}
                            onTransitionEnd={handleSubPanelTransitionEnd}
                        >
                            {shownSubPanel.current.content}
                        </SubPanelContainer>
                    )}
                </>
            )}
        </div>
    );
};
