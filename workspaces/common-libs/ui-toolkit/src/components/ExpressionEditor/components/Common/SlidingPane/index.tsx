import React, { ReactNode, useEffect, useRef, useState } from "react";
import { SlidingPaneContext, useSlidingPane } from "./context";
import styled from '@emotion/styled';
import { Codicon } from "../../../../Codicon/Codicon";
import { VERTICAL_HELPERPANE_HEIGHT } from "../../../constants";
import { ThemeColors } from "../../../../../styles";

const DEFAULT_SLIDING_WINDOW_HEIGHT = `${VERTICAL_HELPERPANE_HEIGHT}px`;
const DEFAULT_SLIDING_WINDOW_WIDTH = 370;

type SlidingWindowProps = {
    children: React.ReactNode;
}

const SlidingWindowContainer = styled.div`
    display: flex;
    position: relative;
    width: 320px;
    max-height: 350px;
    overflow-x: scroll;
    overflow-y: scroll;
    padding: 0px;
    background-color: var(--vscode-dropdown-background);
    transition: height 0.3s ease-in-out;
`;

//TODO: move it a common place
export type VisitedPagesElement = {
    name: string;
    params: any
}

export const SlidingWindow = ({ children }: SlidingWindowProps) => {
    const [visitedPages, setVisitedPages] = useState<VisitedPagesElement[]>([{
        name: "PAGE1",
        params: {}
    }]);
    const [prevPage, setPrevPage] = useState<VisitedPagesElement>();
    const [height, setHeight] = useState(DEFAULT_SLIDING_WINDOW_HEIGHT);
    const [width, setWidth] = useState(DEFAULT_SLIDING_WINDOW_WIDTH);
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
            <SlidingWindowContainer style={{  width: width }}>
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
            setWidth(paneWidth || DEFAULT_SLIDING_WINDOW_WIDTH);
            setTimeout(() => {
                setIndex(0);
                if (isInitialRender.current) {
                    isInitialRender.current = false;
                }
            }, 50);
        }
        prevVisitedPagesLength.current = visitedPages.length;
    }, [visitedPages, name, currentPage, setClearAnimations, setHeight, setWidth, paneHeight, paneWidth]);

    if (name !== currentPage.name) return null;
    return (
        <SlidingPaneContainer index={index} clearAnimations={clearAnimations} isInitialRender={isInitialRender}>
            {children}
        </SlidingPaneContainer>
    );
}

const InvisibleButton = styled.button`
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    text-align: inherit;
    color: ${ThemeColors.ON_SURFACE_VARIANT};
    font: inherit;
    cursor: pointer;
    outline: none;
    box-shadow: none;
    appearance: none;
    display: inline-flex;
    align-items: center;
     &:hover {
        color: ${ThemeColors.ON_PRIMARY} ;
    }
`;

export const ScrollableContainer = styled.div`
    flex: 1;
    overflow: auto;
    min-height: 0;
`;

const SlidingPaneNavContainerElm = styled.div`
    width: 100%;
    max-height: 30px;
    padding: 8px;
    display: flex;
    align-items: center;
    &:hover {
        background-color: var(--vscode-list-activeSelectionBackground) !important;
        cursor: pointer;
    }
    &:hover .sliding-pane-text {
        color:  ${ThemeColors.ON_PRIMARY};
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
    sx?: React.CSSProperties;
    ref?: React.Ref<HTMLDivElement> | null;
}

export const SlidingPaneNavContainer = ({ children, to, data, endIcon, onClick, sx, ref }: SlidingPaneNavContainerProps) => {
    const { moveToNext } = useSlidingPane();
    const handleNavigation = () => {
        if (!to) return;
        moveToNext({
            name: to,
            params: data
        });
    }

    return (
        <SlidingPaneNavContainerElm ref={ref} style={sx}>
            <InvisibleButton
                className="sliding-pane-text"
                style={{ width: '100%' }}
                onClick={() => {
                    if (onClick) {
                        onClick();
                    } else {
                        handleNavigation();
                    }
                }}
            >
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
            </InvisibleButton>
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
                <InvisibleButton onClick={handleBackNavigation}>
                    <>{children}</>
                </InvisibleButton>
            )}
        </>
    )
}

const StickyHeader = styled.div`
    position: relative;
    padding: 8px;
    top: 0;
    z-index: 2;
    width: 100%;
`;


export const SlidingPaneHeader = ({ children }: { children: ReactNode }) => {
    return (
        <StickyHeader>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-start', color: ThemeColors.ON_SURFACE_VARIANT }}>
                <SlidingPaneBackButton>
                    <Codicon sx={{ color: ThemeColors.ON_SURFACE_VARIANT }} name="chevron-left"/>
                </SlidingPaneBackButton>
                {children}
            </div>
        </StickyHeader>
    )
}


export const CopilotFooter = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
`;