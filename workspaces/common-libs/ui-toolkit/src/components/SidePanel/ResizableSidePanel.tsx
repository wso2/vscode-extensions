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
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Overlay } from './../Commons/Overlay';
import { colors } from '../Commons/Colors';
import { SidePanelProps } from './SidePanel';

export interface ResizableSidePanelProps extends Omit<SidePanelProps, 'width'> {
    resizable?: boolean;
    minWidth?: number;
    maxWidth?: number;
    defaultWidth?: number;
    onResize?: (width: number) => void;
}

const SidePanelContainer = styled.div<ResizableSidePanelProps & { currentWidth: number; isResizing?: boolean }>`
    position: fixed;
    top: ${(props: ResizableSidePanelProps & { currentWidth: number }) => props.alignment === "bottom" ? "auto" : 0};
    left: ${(props: ResizableSidePanelProps & { currentWidth: number }) => props.alignment === "left" ? 0 : (props.alignment === "bottom" || props.alignment === "top") ? 0 : "auto"};
    right: ${(props: ResizableSidePanelProps & { currentWidth: number }) => props.alignment === "right" ? 0 : "auto"};
    bottom: ${(props: ResizableSidePanelProps & { currentWidth: number }) => props.alignment === "bottom" ? 0 : "auto"};
    width: ${(props: ResizableSidePanelProps & { currentWidth: number; isResizing?: boolean }) => {
        // Use CSS variable during resize for GPU-only updates
        if (props.isResizing) return 'var(--panel-width, ' + props.currentWidth + 'px)';
        return props.isFullWidth ? "100%" : props.alignment === "bottom" || props.alignment === "top" ? `calc(100% - ${props.currentWidth}px)` : `${props.currentWidth}px`;
    }};
    height: ${(props: ResizableSidePanelProps & { currentWidth: number }) => props.alignment === "bottom" ? `${props.currentWidth}px` : "100%"};
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    box-shadow: 0 5px 10px 0 var(--vscode-badge-background);
    z-index: 2000;
    opacity: ${(props: ResizableSidePanelProps & { currentWidth: number }) => props.isOpen ? 1 : 0};
    transform: ${(props: ResizableSidePanelProps & { currentWidth: number }) => {
        if (props.alignment === 'left') return `translate3d(${props.isOpen ? '0%' : '-100%'}, 0, 0)`;
        if (props.alignment === 'right') return `translate3d(${props.isOpen ? '0%' : '100%'}, 0, 0)`;
        if (props.alignment === 'bottom') return `translate3d(0, ${props.isOpen ? '0%' : '100%'}, 0)`;
        if (props.alignment === 'top') return `translate3d(0, ${props.isOpen ? '0%' : '-100%'}, 0)`;
        return 'translate3d(0, 0, 0)';
    }};
    transition: ${(props: ResizableSidePanelProps & { currentWidth: number; isResizing?: boolean }) => 
        props.isResizing ? 'none' : 'transform 0.4s ease, opacity 0.4s ease'};
    overflow: hidden;
    ${(props: ResizableSidePanelProps & { currentWidth: number }) => props.sx};
`;

const ResizeHandle = styled.div<{ alignment?: "left" | "right" | "top" | "bottom"; isResizing: boolean }>`
    position: absolute;
    ${(props: { alignment?: "left" | "right" | "top" | "bottom"; isResizing: boolean }) => {
        if (props.alignment === 'left') return 'right: 0; top: 0; bottom: 0; width: 3px; cursor: ew-resize;';
        if (props.alignment === 'right') return 'left: 0; top: 0; bottom: 0; width: 3px; cursor: ew-resize;';
        if (props.alignment === 'top') return 'bottom: 0; left: 0; right: 0; height: 3px; cursor: ns-resize;';
        if (props.alignment === 'bottom') return 'top: 0; left: 0; right: 0; height: 3px; cursor: ns-resize;';
        return '';
    }}
    background-color: transparent;
    transition: background-color 0.15s ease;
    z-index: 2001;
    
    &:hover {
        background-color: var(--vscode-focusBorder);
    }
    
    &:active {
        background-color: var(--vscode-focusBorder);
    }
`;

const SubPanelContainer = styled.div<ResizableSidePanelProps & { currentWidth: number }>`
    position: fixed;
    top: 0;
    ${(props: ResizableSidePanelProps & { currentWidth: number }) => props.alignment === "left" ? `left: ${props.currentWidth}px;` : `right: ${props.currentWidth}px;`}
    width: ${(props: ResizableSidePanelProps & { currentWidth: number }) => props?.subPanelWidth ? `${props?.subPanelWidth}px` : `calc(100vw - ${props.currentWidth}px)`};
    height: 100%;
    box-shadow: 0 5px 10px 0 var(--vscode-badge-background);
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    z-index: 1500;
    opacity: ${(props: ResizableSidePanelProps & { currentWidth: number }) => props.isSubPanelOpen ? 1 : 0};
    transform: translateX(${(props: ResizableSidePanelProps) => props.alignment === 'left'
        ? (props.isSubPanelOpen ? '0%' : '-100%')
        : (props.isSubPanelOpen ? '0%' : '100%')});
    transition: transform 0.4s ease 0.1s, opacity 0.4s ease 0.1s;
`;

export const ResizableSidePanel: React.FC<ResizableSidePanelProps> = (props: ResizableSidePanelProps) => {
    const { 
        id, 
        className, 
        isOpen = false, 
        alignment = "right", 
        defaultWidth = 400,
        minWidth = 200,
        maxWidth = 800,
        children, 
        sx, 
        overlay = true, 
        isFullWidth = false, 
        subPanel, 
        subPanelWidth, 
        isSubPanelOpen,
        resizable = true,
        onResize
    } = props;

    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(isOpen);
    const [subPanelOpen, setSubPanelOpen] = useState(isSubPanelOpen);
    const [currentWidth, setCurrentWidth] = useState(defaultWidth);
    const [isResizing, setIsResizing] = useState(false);
    const resizeRef = useRef<{ startX: number; startY: number; startWidth: number }>({ startX: 0, startY: 0, startWidth: defaultWidth });
    const rafRef = useRef<number | null>(null);
    const pendingWidthRef = useRef<number>(defaultWidth);
    const panelRef = useRef<HTMLDivElement>(null);
    const lastUpdateTime = useRef<number>(0);
    const debounceTimerRef = useRef<number | null>(null);
    const THROTTLE_MS = 16; // ~60fps - throttle visual updates
    const DEBOUNCE_MS = 100; // Wait 100ms after last resize to finalize callback

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

    const handleMouseDown = useCallback((event: React.MouseEvent) => {
        if (!resizable) return;
        
        event.preventDefault();
        setIsResizing(true);
        resizeRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            startWidth: currentWidth,
        };
    }, [resizable, currentWidth]);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!isResizing || !panelRef.current) return;

        // Time-based throttling for smooth visual updates
        const now = performance.now();
        if (now - lastUpdateTime.current < THROTTLE_MS) {
            return;
        }
        lastUpdateTime.current = now;

        let newWidth: number;
        
        if (alignment === 'left') {
            newWidth = resizeRef.current.startWidth + (event.clientX - resizeRef.current.startX);
        } else if (alignment === 'right') {
            newWidth = resizeRef.current.startWidth - (event.clientX - resizeRef.current.startX);
        } else if (alignment === 'top') {
            newWidth = resizeRef.current.startWidth + (event.clientY - resizeRef.current.startY);
        } else {
            newWidth = resizeRef.current.startWidth - (event.clientY - resizeRef.current.startY);
        }

        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        pendingWidthRef.current = newWidth;
        
        // Use CSS variable for instant GPU-only updates - NO React re-renders during drag
        if (panelRef.current) {
            panelRef.current.style.setProperty('--panel-width', `${newWidth}px`);
        }
        
        // Debounce the callback to reduce callback frequency
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = setTimeout(() => {
            if (onResize) {
                onResize(pendingWidthRef.current);
            }
        }, DEBOUNCE_MS);
    }, [isResizing, alignment, minWidth, maxWidth, onResize, THROTTLE_MS, DEBOUNCE_MS]);

    const handleMouseUp = useCallback(() => {
        // Clean up any pending animations
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        
        // Clean up debounce timer and immediately fire final resize
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        
        // Immediately fire the final onResize callback
        if (onResize) {
            onResize(pendingWidthRef.current);
        }
        
        // Sync React state after resize ends
        setCurrentWidth(pendingWidthRef.current);
        setIsResizing(false);
    }, [onResize]);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = alignment === 'left' || alignment === 'right' ? 'ew-resize' : 'ns-resize';
            document.body.style.userSelect = 'none';
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                // Clean up timers on unmount
                if (rafRef.current !== null) {
                    cancelAnimationFrame(rafRef.current);
                }
                if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                }
            };
        }
    }, [isResizing, handleMouseMove, handleMouseUp, alignment]);

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
                    <SidePanelContainer 
                        ref={panelRef}
                        data-testid="resizable-side-panel" 
                        isOpen={open} 
                        alignment={alignment} 
                        currentWidth={currentWidth}
                        isFullWidth={isFullWidth}
                        isResizing={isResizing}
                        sx={sx} 
                        onTransitionEnd={handleTransitionEnd}
                    >
                        {resizable && (
                            <ResizeHandle 
                                alignment={alignment}
                                isResizing={isResizing}
                                onMouseDown={handleMouseDown}
                            />
                        )}
                        <div style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'var(--vscode-editor-background)',
                            overflow: 'hidden',
                            pointerEvents: isResizing ? 'none' : 'auto',
                            transform: 'translateZ(0)',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden'
                        }}>
                            {children}
                        </div>
                    </SidePanelContainer>
                    {subPanel && (
                        <SubPanelContainer
                            data-testid="side-panel-sub-panel"
                            isOpen={open}
                            isSubPanelOpen={subPanelOpen}
                            alignment={alignment}
                            currentWidth={currentWidth}
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
