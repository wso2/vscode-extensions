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
import React, { PropsWithChildren, ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from "@emotion/styled";

export type PositionType =
    'bottom-end' |
    'bottom-start' |
    'bottom' |
    'left' |
    'right' |
    'top-end' |
    'top-start' |
    'top'
    ;

export interface Position {
    top: number;
    left: number;
}

export type ElementProperties = {
    width: number;
    height: number;
}

export interface TooltipProps {
    id?: string;
    className?: string;
    content?: string | ReactNode;
    position?: PositionType;
    sx?: any;
    containerSx?: any;
    containerPosition?: string;
    offset?: Position;
    /**
     * Wraps the content at this width instead of keeping it on one line. Content taller than
     * `maxLines` is clamped behind a "Show more" toggle, and the tooltip stays open while hovered
     * so the toggle can be clicked.
     */
    maxWidth?: number | string;
    /** Lines shown before "Show more" when `maxWidth` is set. Defaults to 3. */
    maxLines?: number;
}

export interface TooltipConatinerProps {
    position?: string;
    containerSx?: any;
}

const TooltipContainer = styled.div<TooltipConatinerProps>`
    position: ${(props: TooltipConatinerProps) => props.position || 'relative'};
    display: inline-block;
    cursor: pointer;
    pointer-events: auto;
    ${(props: TooltipConatinerProps) => props.containerSx}
`;

const TooltipContent = styled.div<TooltipProps>`
    position: absolute;
    width: fit-content;
    height: fit-content;
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    border: var(--vscode-editorHoverWidget-statusBarBackground) 1px solid;
    border-radius: 4px;
    padding: 8px;
    font-size: 14px;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.2s ease-in-out;
    white-space: nowrap;
    z-index: 999999;
    ${(props: TooltipProps) => props.sx}
`;

const ClampedContent = styled.div<{ lines?: number }>`
    ${(props: { lines?: number }) => props.lines ? `
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: ${props.lines};
        overflow: hidden;
    ` : ''}
`;

const ShowMoreButton = styled.button`
    margin-top: 4px;
    padding: 0;
    border: none;
    background: none;
    color: var(--vscode-textLink-foreground);
    font-size: inherit;
    font-family: inherit;
    cursor: pointer;
    &:hover {
        text-decoration: underline;
    }
`;

const DEFAULT_MAX_LINES = 3;
// Grace period to move the pointer from the anchor into an expandable tooltip before it hides.
const HIDE_DELAY_MS = 200;
// Vertical padding + border of TooltipContent, so an expanded tooltip's outer height fits the window.
const TOOLTIP_CHROME_HEIGHT = 18;

const getOffsetByPosition = (position: PositionType, height: number, width: number): Position => {
    const offset: Position = { top: 0, left: 0 };
    switch (position) {
        case 'bottom-end':
            break;
        case 'bottom':
            offset.left = -(width / 2);
            break;
        case 'bottom-start':
            offset.left = -width;
            break;
        case 'left':
            offset.top = -(height / 2);
            offset.left = -width;
            break;
        case 'top-start':
            offset.top = -height;
            offset.left = -width;
            break;
        case 'top':
            offset.top = -height;
            offset.left = -(width / 2);
            break;
        case 'top-end':
            offset.top = -height;
            break;
        case 'right':
            offset.top = -(height / 2);
            break;
    }

    return offset;
}

const getPositionOnOverflow = (
    windowWidth: number,
    windowHeight: number,
    top: number,
    left: number,
    height: number,
    width: number
): Position => {
    const position: Position = { top, left };
    // Position on x axis
    if (left < 0) {
        position.left = 0;
    } else if (left + width > windowWidth) {
        position.left = windowWidth - width;
    }

    // Position on y axis
    if (top < 0) {
        position.top = 0;
    } else if (top + height > windowHeight) {
        position.top = windowHeight - height;
    }

    return position;
}

export const Tooltip: React.FC<PropsWithChildren<TooltipProps>> = (props: PropsWithChildren<TooltipProps>) => {
    const {
        id, className, content, position, offset, children, sx, containerPosition, containerSx, maxWidth, maxLines
    } = props;
    const expandable = maxWidth !== undefined;
    const lines = maxLines ?? DEFAULT_MAX_LINES;

    const tooltipEl = useRef<HTMLDivElement>(null);
    const contentEl = useRef<HTMLDivElement>(null);
    const isHovering = useRef<boolean>(false);
    const showTimer = useRef<number | null>(null);
    const hideTimer = useRef<number | null>(null);
    // Pointer position the tooltip is anchored to, kept so a resize can re-anchor it.
    const anchor = useRef<Position | null>(null);

    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [isOverflowing, setIsOverflowing] = useState<boolean>(false);
    const [tooltipElPosition, setTooltipElPosition] = useState<Position>({ top: 0, left: 0 });

    const clearShowTimer = () => {
        if (showTimer.current) {
            clearTimeout(showTimer.current);
            showTimer.current = null;
        }
    }

    const clearHideTimer = () => {
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
    }

    const hide = () => {
        clearHideTimer();
        setIsVisible(false);
        setIsExpanded(false);
    }

    const placeAtAnchor = useCallback(() => {
        if (!anchor.current || !tooltipEl.current) return;
        const { height, width } = tooltipEl.current.getBoundingClientRect() as ElementProperties;
        const { top: offsetTop, left: offsetLeft } = getOffsetByPosition(position || 'bottom-end', height, width);
        const topOffset = offset ? offsetTop + offset.top : offsetTop;
        const leftOffset = offset ? offsetLeft + offset.left : offsetLeft;
        // Reset the position if it overflows the window
        const { top, left } = getPositionOnOverflow(
            window.innerWidth,
            window.innerHeight,
            anchor.current.top + topOffset,
            anchor.current.left + leftOffset,
            height,
            width
        );

        // Skip no-op updates; this also runs from an effect that may fire on every render.
        setTooltipElPosition(current => current.top === top && current.left === left ? current : { top, left });
    }, [position, offset]);

    const updatePosition = (e: React.MouseEvent<HTMLDivElement>) => {
        // Moves inside the portaled tooltip bubble up here too; don't chase the pointer while it's on the tooltip.
        if (isHovering.current) return;
        clearHideTimer();
        clearShowTimer();
        showTimer.current = setTimeout(() => {
            if (!isHovering.current && tooltipEl.current) {
                anchor.current = { top: e.clientY, left: e.clientX };
                placeAtAnchor();
                if (!isVisible) setIsVisible(true);
            }
        }, 500);
    }

    const onMouseLeave = () => {
        clearShowTimer();
        if (!expandable) {
            setIsVisible(false);
            return;
        }
        clearHideTimer();
        hideTimer.current = setTimeout(() => {
            if (!isHovering.current) hide();
        }, HIDE_DELAY_MS);
    }

    const onTooltipMouseEnter = () => {
        isHovering.current = true;
        clearHideTimer();
    }

    const onTooltipMouseLeave = () => {
        isHovering.current = false;
        if (expandable) hide();
    }

    const toggleExpanded = (e: React.MouseEvent<HTMLButtonElement>) => {
        // The tooltip is portaled but still bubbles through the React tree to the anchor's handlers.
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    }

    useLayoutEffect(() => {
        const el = contentEl.current;
        if (!expandable || !el) return;
        // Wrapped text keeps its box at maxWidth even when the longest line is much shorter,
        // so shrink the box to the widest rendered line.
        el.style.width = '';
        const range = document.createRange();
        range.selectNodeContents(el);
        const lineWidth = Math.ceil(range.getBoundingClientRect().width);
        if (lineWidth > 0 && lineWidth < el.clientWidth) {
            el.style.width = `${lineWidth}px`;
        }
        // Detect whether the clamped content is cut off, so "Show more" only appears when it reveals something.
        if (!isExpanded) {
            setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
        }
    }, [expandable, isExpanded, isVisible, content, lines, maxWidth]);

    // Expanding, new content or the toggle appearing changes the tooltip's size, so re-anchor it:
    // a "top" tooltip has to grow upwards.
    useLayoutEffect(() => {
        if (isVisible) placeAtAnchor();
    }, [isExpanded, isVisible, placeAtAnchor, content, maxWidth, lines, isOverflowing]);

    useEffect(() => () => {
        clearShowTimer();
        clearHideTimer();
    }, []);

    return (
        <TooltipContainer
            id={id}
            className={className}
            position={containerPosition}
            onMouseMove={updatePosition}
            onMouseLeave={onMouseLeave}
            containerSx={containerSx}
        >
            {children}
            {content !== undefined && content !== "" && createPortal(
                <TooltipContent
                    ref={tooltipEl}
                    onMouseEnter={onTooltipMouseEnter}
                    onMouseLeave={onTooltipMouseLeave}
                    style={{
                        opacity: isVisible ? 1 : 0,
                        visibility: isVisible ? 'visible' : 'hidden',
                        ...(expandable && {
                            whiteSpace: 'normal',
                            // Long unbroken strings (URLs, paths) would otherwise spill past maxWidth.
                            overflowWrap: 'anywhere',
                            maxWidth,
                            // An expanded tooltip taller than the window scrolls instead of losing its top.
                            maxHeight: `calc(100vh - ${TOOLTIP_CHROME_HEIGHT}px)`,
                            overflowY: 'auto'
                        }),
                        ...tooltipElPosition
                    }}
                    sx={sx}
                >
                    {expandable ? (
                        <>
                            <ClampedContent ref={contentEl} lines={isExpanded ? undefined : lines}>
                                {content}
                            </ClampedContent>
                            {(isOverflowing || isExpanded) && (
                                <ShowMoreButton onClick={toggleExpanded}>
                                    {isExpanded ? 'Show less' : 'Show more'}
                                </ShowMoreButton>
                            )}
                        </>
                    ) : content}
                </TooltipContent>,
                document.body
            )}
        </TooltipContainer>
    );
};
