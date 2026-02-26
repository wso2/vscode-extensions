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
import React, { ReactNode, useEffect, useState } from 'react';
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
    transform: ${(props: SidePanelProps) => {
        if (props.alignment === 'left') return `translateX(${props.isOpen ? '0%' : '-100%'})`;
        if (props.alignment === 'right') return `translateX(${props.isOpen ? '0%' : '100%'})`;
        if (props.alignment === 'bottom') return `translateY(${props.isOpen ? '0%' : '100%'})`;
        if (props.alignment === 'top') return `translateY(${props.isOpen ? '0%' : '-100%'})`;
        return 'none';
    }};
    transition: transform 0.4s ease, opacity 0.4s ease;
    ${(props: SidePanelProps) => props.sx};
`;

const SubPanelContainer = styled.div<SidePanelProps>`
    position: fixed;
    top: 0;
    ${(props: SidePanelProps) => props.alignment === "left" ? `left: ${props.width}px;` : `right: ${props.width}px;`}
    width: ${(props: SidePanelProps) => props?.subPanelWidth ? `${props?.subPanelWidth}px` : `calc(100vw - ${props.width}px)`};
    height: 100%;
    box-shadow: 0 5px 10px 0 var(--vscode-badge-background);
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    z-index: 1900;
    opacity: ${(props: SidePanelProps) => props.isSubPanelOpen ? 1 : 0};
    transform: translateX(${(props: SidePanelProps) => props.alignment === 'left'
        ? (props.isSubPanelOpen ? '0%' : '-100%')
        : (props.isSubPanelOpen ? '0%' : '100%')});
    transition: transform 0.4s ease 0.1s, opacity 0.4s ease 0.1s;
`;

export const SidePanel: React.FC<SidePanelProps> = (props: SidePanelProps) => {
    const { id, className, isOpen = false, alignment = "right", width = 312, children, sx, overlay = true, isFullWidth = false, subPanel, subPanelWidth, isSubPanelOpen } = props;

    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(isOpen);
    const [subPanelOpen, setSubPanelOpen] = useState(isSubPanelOpen);

    const handleTransitionEnd = (event: React.TransitionEvent) => {
        if (event.propertyName === 'transform' && !isOpen) {
            setVisible(false);
        }
    };

    const handleOverlayClose = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (props.onClose) {
            setOpen(false);
            props.onClose(event);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setVisible(true);
            requestAnimationFrame(() => {
                setOpen(true);
            });
        } else {
            setOpen(false);
            setSubPanelOpen(false);
        }
    }, [isOpen]);

    useEffect(() => {
        setSubPanelOpen(!!subPanel);
    }, [subPanel]);

    useEffect(() => {
        if (!open && !isOpen) {
            const timer = setTimeout(() => {
                setVisible(false);
            }, 500); // Corresponds to the transition time
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
                    {subPanel && (
                        <SubPanelContainer
                            data-testid="side-panel-sub-panel"
                            isOpen={open}
                            isSubPanelOpen={subPanelOpen}
                            alignment={alignment}
                            width={width}
                            subPanelWidth={subPanelWidth}
                            sx={sx}
                        >
                            {subPanel}
                        </SubPanelContainer>
                    )}
                </>
            )}
        </div>
    );
};
