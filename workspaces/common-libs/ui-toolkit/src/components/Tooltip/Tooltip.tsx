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
import React, { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
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
    const { id, className, content, position, offset, children, sx, containerPosition, containerSx } = props;

    const tooltipEl = React.useRef<HTMLDivElement>(null);

    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [isHovering, setIsHovering] = useState<boolean>(false);
    const [tooltipElPosition, setTooltipElPosition] = useState<Position>({ top: 0, left: 0 });
    const [timer, setTimer] = useState<number | null>(null);

    const updatePosition = (e: React.MouseEvent<HTMLDivElement>) => {
        if (timer) clearTimeout(timer);
        setTimer(setTimeout(() => {
            if (!isHovering && tooltipEl.current) {
                const { height, width } = tooltipEl.current.getBoundingClientRect() as ElementProperties;
                const { top: offsetTop, left: offsetLeft } = getOffsetByPosition(position || 'bottom-end', height, width);
                const topOffset = offset ? offsetTop + offset.top : offsetTop;
                const leftOffset = offset ? offsetLeft + offset.left : offsetLeft;
                // Reset the position if it overflows the window
                const { top, left } = getPositionOnOverflow(
                    window.innerWidth,
                    window.innerHeight,
                    e.clientY + topOffset,
                    e.clientX + leftOffset,
                    height,
                    width
                );

                setTooltipElPosition({ top, left });
                if (!isVisible) setIsVisible(true);
            }
        }, 500))
    }

    const onMouseLeave = () => {
        if (timer) clearTimeout(timer);
        setIsVisible(false);
    }

    useEffect(() => {
        return () => {
            if (timer) clearTimeout(timer);
        }
    }, [timer])

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
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    style={{
                        opacity: isVisible ? 1 : 0,
                        visibility: isVisible ? 'visible' : 'hidden',
                        ...tooltipElPosition
                    }}
                    sx={sx}
                >
                    {content}
                </TooltipContent>,
                document.body
            )}
        </TooltipContainer>
    );
};
