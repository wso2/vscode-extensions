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

import React, { ReactNode, useEffect, useRef, useState } from "react";
import { SlidingPaneContext, useSlidingPane } from "./context";
import styled from '@emotion/styled';
import { Codicon } from "../../../../Codicon/Codicon";
import { BI_HELPER_PANE_WIDTH, VERTICAL_HELPERPANE_HEIGHT } from "../../../constants";
import { ThemeColors } from "../../../../../styles";
import { Icon } from "../../../../Icon/Icon";

const DEFAULT_SLIDING_WINDOW_HEIGHT = `${VERTICAL_HELPERPANE_HEIGHT}px`;

type SlidingWindowProps = {
    children: React.ReactNode;
}

const SlidingWindowContainer = styled.div`
    display: flex;
    position: relative;
    width: 320px;
    max-height: 350px;
    overflow-x: hidden;
    overflow-y: hidden;
    padding: 0px;
    background-color: var(--vscode-dropdown-background);
    transition: height 0.3s ease-in-out;
`;

//TODO: move it a common place
export type VisitedPagesElement = {
    name: string;
    params: Record<string, unknown>;
}

export const SlidingWindow = ({ children }: SlidingWindowProps) => {
    const [visitedPages, setVisitedPages] = useState<VisitedPagesElement[]>([{
        name: "PAGE1",
        params: {}
    }]);
    const [prevPage, setPrevPage] = useState<VisitedPagesElement>();
    const [height, setHeight] = useState(DEFAULT_SLIDING_WINDOW_HEIGHT);
    const [width, setWidth] = useState(BI_HELPER_PANE_WIDTH);
    const [clearAnimations, setClearAnimations] = useState(false);
    const isInitialRender = useRef(true);


    const moveToNext = (nextPage: VisitedPagesElement) => {
        setVisitedPages([...visitedPages, nextPage]);
    };

    const getParams = () => {
        if (visitedPages.length > 0) {
            return visitedPages[visitedPages.length - 1].params;
        }
    }

    const moveToPrev = () => {
        if (visitedPages.length > 1) {
            const visitedPagesCopy = [...visitedPages];
            visitedPagesCopy.pop();
            setVisitedPages(visitedPagesCopy);
        }
    };
    return (
        <SlidingPaneContext.Provider
            value={{
                height: height,
                width: width,
                setWidth: setWidth,
                setHeight: setHeight,
                moveToNext: moveToNext,
                moveToPrev: moveToPrev,
                visitedPages: visitedPages,
                setVisitedPages: setVisitedPages,
                clearAnimations: clearAnimations,
                setClearAnimations: setClearAnimations,
                prevPage: prevPage,
                setPrevPage: setPrevPage,
                getParams: getParams,
                isInitialRender: isInitialRender
            }}>
            <SlidingWindowContainer style={{ width: width }}>
                {children}
            </SlidingWindowContainer>
        </SlidingPaneContext.Provider>
    );
}

export const SlidingPaneContainer = styled.div<{ index: number; isCurrent?: boolean; width?: string, clearAnimations?: boolean, isInitialRender?: React.MutableRefObject<boolean> }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  transition: ${({ clearAnimations }: { clearAnimations: boolean }) =>
        clearAnimations ? 'none' : 'transform 0.3s ease-in-out, height 0.3s ease-in-out'};
  transform: ${({ index, isInitialRender }: { index: number, isInitialRender?: React.MutableRefObject<boolean> }) =>
        isInitialRender?.current ? 'none' : `translateX(${index * 100}%)`};
`;

type SlidingPaneProps = {
    name: string,
    paneHeight?: string,
    paneWidth?: number,
    nextView?: string,
    prevView?: string,
    children: React.ReactNode,
    disableAnimation?: boolean
}

export const SlidingPane = ({ children, name, paneHeight, paneWidth }: SlidingPaneProps) => {
    const { setHeight, setWidth, visitedPages, setClearAnimations, clearAnimations, isInitialRender } = useSlidingPane();
    const [index, setIndex] = useState(1);
    const currentPage = visitedPages[visitedPages.length - 1];
    const prevVisitedPagesLength = useRef(visitedPages.length);
    useEffect(() => {
        setClearAnimations(true);
        setIndex(visitedPages.length >= prevVisitedPagesLength.current ? 1 : -1);
        if (name === currentPage.name) {
            setTimeout(() => {
                setClearAnimations(false);
            }, 50);
            setHeight(paneHeight || DEFAULT_SLIDING_WINDOW_HEIGHT);
            setWidth(paneWidth || BI_HELPER_PANE_WIDTH);
            setTimeout(() => {
                setIndex(0);
                if (isInitialRender.current) {
                    isInitialRender.current = false;
                }
            }, 50);
        }
        prevVisitedPagesLength.current = visitedPages.length;
    }, [visitedPages, name, currentPage, setClearAnimations, setHeight, setWidth, paneHeight, paneWidth, isInitialRender]);

    if (name !== currentPage.name) return null;
    return (
        <SlidingPaneContainer index={index} clearAnimations={clearAnimations} isInitialRender={isInitialRender}>
            {children}
        </SlidingPaneContainer>
    );
}

const StickyHeader = styled.div`
    position: relative;
    top: 0;
    z-index: 2;
    display: flex;
    justify-content: left;
    align-items: center;
    gap: 8px;

    padding: 4px 6px;
    margin: 4px 8px;
    transition: background-color 0.2s ease;
    border-radius: 6px;
    height: 36px;
    cursor: pointer;

    font-weight: 600;
    font-size: 13px;
    color: var(--input-foreground);
    
    &:hover {
        background-color: ${ThemeColors.SURFACE_DIM_2};
    }
`;

export const ScrollableContainer = styled.div`
    flex: 1;
    overflow: auto;
    min-height: 0;
`;

const SlidingPaneNavContainerElm = styled.div`
    display: flex;
    align-items: center;
    flex: 1;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 6px;
    height: 32px;
    margin-inline: 4px;
    &:hover {
        background-color: ${ThemeColors.SURFACE_DIM_2};
        outline: 1px solid var(--dropdown-border);
        outline-offset: -1px;
    }
`
export const SlidingPaneCallbackCOntainer = styled.div`
    width: 100%;
    padding: 8px;
    &:hover {
        background-color:rgb(29, 29, 29);
        cursor: pointer;
    }
`

type SlidingPaneNavContainerProps = {
    children?: React.ReactNode;
    to?: string;
    data?: any;
    endIcon?: ReactNode;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    sx?: React.CSSProperties;
    ref?: React.Ref<HTMLDivElement> | null;
} & React.HTMLAttributes<HTMLDivElement>;

export const SlidingPaneNavContainer = ({ children, to, data, endIcon, onClick, sx, ref, onMouseEnter, onMouseLeave, ...props }: SlidingPaneNavContainerProps) => {
    const { moveToNext } = useSlidingPane();
    const handleNavigation = () => {
        if (!to) return;
        moveToNext({
            name: to,
            params: data
        });
    }

    return (
        <SlidingPaneNavContainerElm onClick={() => {
            if (onClick) {
                onClick();
            } else {
                handleNavigation();
            }
        }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} ref={ref} style={sx} {...props}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div>
                    {children}
                </div>
                {
                    endIcon ? (
                        <>{endIcon}</>
                    ) : to ? (
                        <div style={{ marginLeft: '8px', display: 'flex', alignItems: 'center' }}>
                            <Codicon name="chevron-right" />
                        </div>
                    ) : null
                }
            </div>
        </SlidingPaneNavContainerElm>
    )
}

export const SlidingPaneBackButton = ({ children }: { children: ReactNode }) => {
    const { moveToPrev, setPrevPage, visitedPages } = useSlidingPane();
    const handleBackNavigation = () => {
        const prevPage = visitedPages[visitedPages.length - 2];
        setPrevPage(prevPage);
        setTimeout(() => {
            moveToPrev();
        }, 50);

    }
    return (
        <>
            {visitedPages.length > 1 && (
                <StickyHeader onClick={handleBackNavigation}>
                    <>{children}</>
                </StickyHeader>
            )}
        </>
    )
}

export const SlidingPaneHeader = ({ children }: { children: ReactNode }) => {
    return (
        <SlidingPaneBackButton>
            <Icon name="bi-arrow-back" sx={{ color: ThemeColors.ON_SURFACE_VARIANT, fontSize: "16px" }} />
            {children}
        </SlidingPaneBackButton>
    )
}


export const CopilotFooter = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
`;

export { useSlidingPane };
