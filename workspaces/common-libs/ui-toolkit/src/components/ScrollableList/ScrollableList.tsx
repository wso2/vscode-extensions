/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import styled from '@emotion/styled';
import { Codicon } from '../Codicon/Codicon';
import { ThemeColors } from '../../styles/Theme';

const Wrapper = styled.div({
    position: 'relative',
    paddingBottom: '20px'
});

interface ContainerProps {
    maxHeight: string;
}

const Container = styled.div<ContainerProps>(({ maxHeight }: ContainerProps) => ({
    maxHeight,
    overflowY: 'auto' as const,
    paddingRight: '4px'
}));

const ScrollIndicator = styled.button({
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: '-16px',
    zIndex: 2,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4px',
    opacity: 0.6,
    cursor: 'pointer',
    background: ThemeColors.SURFACE_BRIGHT,
    border: 'none',
    color: ThemeColors.ON_SURFACE_VARIANT,
    borderRadius: '2px',
    '&:hover': {
        opacity: 1
    },
    '&:focus': {
        outline: 'none'
    },
    '&:focus-visible': {
        outline: 'none'
    }
});

export interface ScrollableListRef {
    scrollToBottom: () => void;
    scrollToTop: () => void;
}

export interface ScrollableListProps {
    /** The content to be rendered inside the scrollable container */
    children: React.ReactNode;
    /** Maximum number of items before enabling scroll */
    maxVisibleItems?: number;
    /** Total number of items in the list */
    itemCount: number;
    /** Maximum height of the scrollable area (default: '300px') */
    maxHeight?: string;
    /** Amount to scroll on each indicator click in pixels (default: 100) */
    scrollAmount?: number;
    /** Whether to show the scroll indicator arrow (default: true) */
    showScrollIndicator?: boolean;
}

export const ScrollableList = forwardRef<ScrollableListRef, ScrollableListProps>((
    {
        children,
        maxVisibleItems = 5,
        itemCount,
        maxHeight = '300px',
        scrollAmount = 100,
        showScrollIndicator = true
    },
    ref
) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isScrollable = itemCount > maxVisibleItems;

    useImperativeHandle(ref, () => ({
        scrollToBottom: () => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        },
        scrollToTop: () => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        }
    }));

    const handleScrollDown = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        }
    };

    if (!isScrollable) {
        return <>{children}</>;
    }

    return (
        <Wrapper>
            <Container ref={scrollContainerRef} maxHeight={maxHeight}>
                {children}
            </Container>
            {showScrollIndicator && (
                <ScrollIndicator
                    type="button"
                    aria-label="Scroll down"
                    onClick={handleScrollDown}
                >
                    <Codicon name="chevron-down" iconSx={{ color: 'inherit', fontSize: '14px' }} sx={{ width: '16px', height: '16px' }} />
                </ScrollIndicator>
            )}
        </Wrapper>
    );
});

ScrollableList.displayName = 'ScrollableList';
