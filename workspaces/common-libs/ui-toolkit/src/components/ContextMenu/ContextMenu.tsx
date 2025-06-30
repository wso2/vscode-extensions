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
import React, { ReactNode, useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
    VSCodeButton,
    VSCodeDataGrid,
    VSCodeDataGridCell,
    VSCodeDataGridRow,
    VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import styled from "@emotion/styled";
import { Codicon } from "../Codicon/Codicon";
import { createPortal } from "react-dom";
import { Overlay } from "../Commons/Overlay";
import { debounce } from "lodash";

interface Item {
    id: number | string;
    label: React.ReactNode;
    onClick: (evt?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    disabled?: boolean;
    sunMenuItems?: Item[];
}

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top" | "bottom" | "left" | "right";

export interface ContextMenuProps {
    id?: string;
    className?: string;
    menuItems?: Item[];
    isOpen?: boolean;
    isLoading?: boolean;
    menuId?: string;
    children?: React.ReactNode;
    icon?: ReactNode;
    sx?: React.CSSProperties;
    iconSx?: React.CSSProperties;
    menuSx?: React.CSSProperties;
    position?: Position;
}

interface ContainerProps {
    sx?: any;
    top?: number;
    left?: number;
}

const VSCodeDataGridInlineCell = styled(VSCodeDataGridCell)`
    color: var(--vscode-inputOption-activeForeground);
    text-align: left;
    display: flex;
    justify-content: flex-start;
    flex-grow: 1;
    white-space: nowrap;
    padding: 6px 10px;
    &:hover {
        color: var(--button-primary-foreground);
        background-color: var(--vscode-button-hoverBackground);
    };
`;

const VSCodeDataGridFlexRow = styled(VSCodeDataGridRow)`
    display: flex;
    padding: calc((var(--design-unit) / 4) * 1px) 0;
    box-sizing: border-box;
    width: 100%;
    background: transparent;
`;

const ExpandedMenu = styled.div<ContainerProps>`
    position: absolute;
    z-index: 3333;
    background: var(--vscode-editor-background);
    box-shadow: var(--vscode-widget-shadow) 0px 4px 10px;
    top: ${(props: ContainerProps) => `${props.top}px`};
    left: ${(props: ContainerProps) => `${props.left}px`};
    ${(props: ContextMenuProps) => props.sx};
`;

const IconWrapper = styled.div<ContainerProps>`
    ${(props: ContextMenuProps) => props.sx};
`;

const MenuContainer = styled.div`
    display: flex;
    flex-direction: row;
    gap : 2px;
    position: relative;
`;

const SubMenuContainer = styled.div<{ top: number }>`
    position: absolute;
    left: calc(100% + 2px);
    top: ${(props: { top: number; }) => props.top}px;
    background: var(--vscode-editor-background);
    box-shadow: var(--vscode-widget-shadow) 0px 4px 10px;
`;

const SmallProgressRing = styled(VSCodeProgressRing)`
    height: calc(var(--design-unit) * 3px);
    width: calc(var(--design-unit) * 3px);
    margin-top: auto;
    padding: 4px;
`;

const Container = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const ContextMenu: React.FC<ContextMenuProps> = (props: ContextMenuProps) => {
    const { id, className, isLoading, isOpen, menuId, sx, iconSx, menuSx, menuItems, icon, position = "bottom" } = props;
    const [isMenuOpen, setIsMenuOpen] = useState(isOpen);
    const [subMenuItems, setSubMenuItems] = useState<Item[]>([]);
    const [mouseLeaveTimeout, setMouseLeaveTimeout] = useState(null);

    const [topPosition, setTopPosition] = useState(0);
    const [leftPosition, setLeftPosition] = useState(0);

    const iconRef = React.useRef<HTMLDivElement>(null);

    const expandMenuRef = React.useRef<HTMLDivElement>(null);

    const [mainMenuHeight, setMainMenuHeight] = useState(0);
    const [subMenuHeight, setSubMenuHeight] = useState(0);
    const [subMenuTop, setSubMenuTop] = useState(0);
    const mainMenuRef = React.useRef<HTMLDivElement>(null);
    const subMenuRef = React.useRef<HTMLDivElement>(null);

    const handleClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        event.stopPropagation();
        setIsMenuOpen(true);
    };

    const handleMenuClose = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        event.stopPropagation();
        setIsMenuOpen(false);
    };

    // Function to calculate the left and top coordinates of the expanded menu based on the position of the icon
    const calculatePosition = useCallback((position: Position, iconMiddlePointX: number,
        iconMiddlePointY: number, expandMenuWidth: number, expandMenuHeight: number,
        viewportWidth: number, viewportHeight: number) => {
        let top = 0;
        let left = 0;
        switch (position) {
            case "top-left":
                top = iconMiddlePointY - expandMenuHeight;
                left = iconMiddlePointX - expandMenuWidth;
                break;
            case "top-right":
                top = iconMiddlePointY - expandMenuHeight;
                left = iconMiddlePointX;
                break;
            case "bottom-left":
                top = iconMiddlePointY;
                left = iconMiddlePointX - expandMenuWidth;
                break;
            case "bottom-right":
                top = iconMiddlePointY;
                left = iconMiddlePointX;
                break;
            case "top":
                top = iconMiddlePointY - expandMenuHeight;
                left = iconMiddlePointX - expandMenuWidth / 2;
                break;
            case "bottom":
                top = iconMiddlePointY;
                left = iconMiddlePointX - expandMenuWidth / 2;
                break;
            case "left":
                top = iconMiddlePointY - expandMenuHeight / 2;
                left = iconMiddlePointX - expandMenuWidth;
                break;
            case "right":
                top = iconMiddlePointY - expandMenuHeight / 2;
                left = iconMiddlePointX;
                break;
        }
        if (left + expandMenuWidth > viewportWidth) {
            left = viewportWidth - expandMenuWidth;
        }
        if (top + expandMenuHeight > viewportHeight) {
            top = viewportHeight - expandMenuHeight;
        }
        return { top, left };
    }, []);

    const onWindowResize = useCallback(() => {
        const debouncedResize = debounce(() => {
            const expandMenuWidth = expandMenuRef.current?.getBoundingClientRect().width || 0;
            const expandMenuHeight = expandMenuRef.current?.getBoundingClientRect().height || 0;
            const iconMiddlePointX = iconRef.current?.getBoundingClientRect().left + iconRef.current?.getBoundingClientRect().width / 2;
            const iconMiddlePointY = iconRef.current?.getBoundingClientRect().top + iconRef.current?.getBoundingClientRect().height / 2;
            const { top, left } = calculatePosition(position, iconMiddlePointX, iconMiddlePointY, expandMenuWidth, expandMenuHeight, window.innerWidth, window.innerHeight);
            setTopPosition(top);
            setLeftPosition(left);
        }, 200);
        debouncedResize();
    }, [calculatePosition, position]);

    const handleItemHover = (event: React.MouseEvent<HTMLElement>, item: Item) => {
        if (mouseLeaveTimeout) {
            clearTimeout(mouseLeaveTimeout);
            setMouseLeaveTimeout(null);
        }

        if (item.sunMenuItems) {
            setSubMenuItems(item.sunMenuItems);
            const itemTop = event.currentTarget.offsetTop;
            const newSubMenuTop = Math.min(
                itemTop,
                Math.max(0, mainMenuHeight - subMenuHeight)
            );
            setSubMenuTop(newSubMenuTop);
        } else {
            setSubMenuItems([]);
        }
    };

    const handleMouseLeave = () => {
        const timeout = setTimeout(() => {
            setSubMenuItems([]);
        }, 300);
        setMouseLeaveTimeout(timeout);
    };

    useEffect(() => {
        if (isMenuOpen) {
            const expandMenuWidth = expandMenuRef.current?.getBoundingClientRect().width || 0;
            const expandMenuHeight = expandMenuRef.current?.getBoundingClientRect().height || 0;
            const iconMiddlePointX = iconRef.current?.getBoundingClientRect().left + iconRef.current?.getBoundingClientRect().width / 2;
            const iconMiddlePointY = iconRef.current?.getBoundingClientRect().top + iconRef.current?.getBoundingClientRect().height / 2;
            const { top, left } = calculatePosition(position, iconMiddlePointX, iconMiddlePointY, expandMenuWidth, expandMenuHeight, window.innerWidth, window.innerHeight);
            setTopPosition(top);
            setLeftPosition(left);
        }
    }, [calculatePosition, isMenuOpen, position]);

    useEffect(() => {
        const resizeListener = () => onWindowResize();
        window.addEventListener('resize', resizeListener);
        return () => {
            window.removeEventListener('resize', resizeListener);
        };
    }, [onWindowResize, position]);

    useEffect(() => {
        setIsMenuOpen(isOpen);
    }, [isOpen]);

    useLayoutEffect(() => {
        if (mainMenuRef.current) {
            setMainMenuHeight(mainMenuRef.current.scrollHeight);
        }
    }, [menuItems]);
    useLayoutEffect(() => {
        if (subMenuRef.current) {
            setSubMenuHeight(subMenuRef.current.scrollHeight);
        }
    }, [subMenuItems]);

    return (
        <>
            <Container id={id} className={className}>
                {isLoading ? (
                    <SmallProgressRing />
                ) : (
                    iconSx ? (
                        <IconWrapper ref={iconRef} onClick={handleClick} id={`component-list-menu-${menuId ? menuId : "btn"}`}>
                            {icon ? icon : <Codicon name="ellipsis" iconSx={iconSx} sx={sx}/>}
                        </IconWrapper>
                    ) : (
                        <VSCodeButton ref={iconRef} appearance="icon" onClick={handleClick} title="More Actions" id={`component-list-menu-${menuId ? menuId : "btn"}`}>
                            {icon ? icon : <Codicon name="ellipsis"/>}
                        </VSCodeButton>
                    )
                )}
                {isMenuOpen &&
                createPortal(
                    <>
                        <ExpandedMenu ref={expandMenuRef} sx={menuSx} top={topPosition} left={leftPosition}>
                            <MenuContainer onMouseLeave={handleMouseLeave}>
                                <VSCodeDataGrid aria-label="Context Menu" ref={mainMenuRef}>
                                    {menuItems?.map(item => (
                                        <VSCodeDataGridFlexRow
                                            key={item.id}
                                            data-testid={`context-menu-${item.id}`}
                                            onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>) => {
                                                if (!item?.disabled) {
                                                    event.stopPropagation();
                                                    if (item?.onClick) {
                                                        item.onClick(event);
                                                    }
                                                    if (item.sunMenuItems) {
                                                        handleItemHover(event, item);
                                                    } else {
                                                        setIsMenuOpen(false);
                                                    }
                                                }
                                            }}
                                            onMouseEnter={(event: React.MouseEvent<HTMLElement, MouseEvent>) => {
                                                if (item.sunMenuItems) {
                                                    handleItemHover(event, item);
                                                } else {
                                                    setSubMenuItems([]);
                                                }
                                            }}
                                            style={{
                                                cursor: item.disabled ? "not-allowed" : "pointer",
                                                opacity: item.disabled ? 0.5 : 1,
                                            }}
                                            id={`component-list-menu-${item.id}`}
                                        >
                                            <VSCodeDataGridInlineCell>{item.label}</VSCodeDataGridInlineCell>
                                        </VSCodeDataGridFlexRow>
                                    ))}
                                </VSCodeDataGrid>
                                {(subMenuItems.length > 0) && (
                                    <SubMenuContainer 
                                        top={subMenuTop}
                                        ref={subMenuRef}
                                        onMouseEnter={() => {
                                            if (mouseLeaveTimeout) {
                                                clearTimeout(mouseLeaveTimeout);
                                                setMouseLeaveTimeout(null);
                                            }
                                        }}
                                    >
                                        <VSCodeDataGrid aria-label="Context Sub Menu">
                                            {subMenuItems.map(item => (
                                                <VSCodeDataGridFlexRow
                                                    key={item.id}
                                                    data-testid={`context-menu-${item.id}`}
                                                    onClick={(event: React.MouseEvent<HTMLElement, MouseEvent>) => {
                                                        if (!item?.disabled) {
                                                            event.stopPropagation();
                                                            if (item?.onClick) {
                                                                item.onClick(event);
                                                            }
                                                            setIsMenuOpen(false);
                                                        }
                                                    }}
                                                    style={{
                                                        cursor: item.disabled ? "not-allowed" : "pointer",
                                                        opacity: item.disabled ? 0.5 : 1,
                                                    }}
                                                    id={`component-list-menu-${item.id}`}
                                                >
                                                    <VSCodeDataGridInlineCell>{item.label}</VSCodeDataGridInlineCell>
                                                </VSCodeDataGridFlexRow>
                                            ))}
                                        </VSCodeDataGrid>
                                    </SubMenuContainer>
                                )}
                            </MenuContainer>
                        </ExpandedMenu>
                        {isMenuOpen && <Overlay onClose={handleMenuClose} />}
                    </>,
                    document.body
                )}
            </Container>
        </>
    );
};
