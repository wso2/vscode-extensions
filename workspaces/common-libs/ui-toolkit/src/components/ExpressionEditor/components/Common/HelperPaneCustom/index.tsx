/**
 * Copyright (c) 2024, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein in any form is strictly forbidden, unless permitted by WSO2 expressly.
 * You may not alter or remove any copyright or other notice from copies of this content.
 */

import React, { CSSProperties, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import {
    ArrowProps,
    HelperPaneBodyProps,
    HelperPaneCategoryItemProps,
    HelperPaneCollapsibleSectionProps,
    HelperPaneCompletionItemProps,
    HelperPaneCustomProps,
    HelperPaneFooterProps,
    HelperPaneHeaderProps,
    HelperPaneIconButtonProps,
    HelperPaneSectionProps,
    LibraryBrowserProps,
    LoadingSectionProps,
    PanelsProps,
    PanelTabProps,
    PanelViewProps,
    StyleBase
} from '../types';
import { Codicon } from '../../../../Codicon/Codicon';
import { Divider } from '../../../../Divider/Divider';
import { SearchBox } from '../../../../SeachBox/SearchBox';
import Typography from '../../../../Typography/Typography';
import { Overlay } from '../../../../Commons/Overlay';
import { ARROW_HEIGHT } from '../../../constants';
import { HelperPanePanelProvider, useHelperPanePanelContext } from './context';

export const Arrow = styled.div<ArrowProps>`
    position: absolute;
    height: ${ARROW_HEIGHT}px;
    width: ${ARROW_HEIGHT}px;
    background-color: var(--vscode-dropdown-background);
    clip-path: polygon(50% 0%, 0% 100%, 100% 100%);

    ${(props: ArrowProps) => props.origin === "left" && `
        transform: rotate(90deg);
    `}

    ${(props: ArrowProps) => props.origin === "right" && `
        transform: rotate(-90deg);
    `}

    ${(props: StyleBase) => props.sx}
`;

const PanelViewContainer = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
`;

const PanelTabContainer = styled.div<{ isActive: boolean }>`
    padding: 4px 0;
    color: var(--panel-tab-foreground);
    cursor: pointer;
    text-wrap: nowrap;
    ${({ isActive }: { isActive: boolean }) =>
        isActive &&
        `
        color: var(--panel-tab-active-foreground);
        border-bottom: 1px solid var(--panel-tab-active-border);
    `}
`;

const ViewContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    overflow-y: auto;
`;

const TabContainer = styled.div<{ sx?: CSSProperties }>`
    display: flex;
    align-items: center;
    gap: 32px;
    ${({ sx }: { sx?: CSSProperties }) => sx}
`;

const PanelContainer = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const LibraryBrowserSearchBoxContainer = styled.div`
    margin-bottom: 16px;
`;

const LibraryBrowserBody = styled.div`
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    padding: 16px;
    overflow-y: auto;
    scrollbar-color: auto;
    border: 1px solid var(--vscode-dropdown-border);
`;

const LibraryBrowserHeader = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-inline: 16px;
`;

const LibraryBrowserWithOverlay = styled.div`
    height: 100vh;
`;

const LibraryBrowserContainer = styled.div`
    width: 55%;
    height: 70%;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    padding: 16px;
    border-radius: 8px;
    background-color: var(--vscode-dropdown-background);
    box-shadow: 0 3px 8px rgb(0 0 0 / 0.2);
    z-index: 3002;
`;

const IconButtonContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;

    & p,
    & i {
        color: var(--vscode-button-background);
    }

    & p:hover,
    & i:hover {
        color: var(--vscode-button-hoverBackground);
    }
`;

const FooterBody = styled.div`
    padding-inline: 8px;
`;

const FooterContainer = styled.footer`
    display: flex;
    flex-direction: column;
`;

const CompletionItemOuterContainer = styled.div<{ indent: boolean }>`
    display: flex;
    flex-direction: column;
    margin-bottom: 2px;
    padding-left: ${({ indent }: { indent: boolean }) => indent ? 16 : 0}px;
`;

const CompletionItemContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px;
    border-radius: 4px;
    cursor: pointer;
`;

const HorizontalLine = styled.div`
    border-top: 1px dotted var(--vscode-editorIndentGuide-background);
    display: flex;
    flex: 1 1 auto;
`;

const CompletionItemWithoutCollapseContainer = styled.div<{ isParent: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;

    ${({ isParent }: { isParent: boolean }) => !isParent && `
        flex: 1 1 auto;
    `}

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const CategoryItemContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    margin-block: 4px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 8px;
    cursor: pointer;

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const CollapseButton = styled.div`
    cursor: pointer;

    & p {
        color: var(--vscode-button-background);
    }

    & p:hover {
        color: var(--vscode-button-hoverBackground);
    }
`;

const LoadingHeader = styled.div`
    width: 100px;
    height: 16px;
    margin-bottom: 2px;
    background: var(--vscode-editor-background);
    animation: loading 1s infinite alternate;

    @keyframes loading {
        0% {
            background: var(--vscode-editor-background);
        }
        100% {
            background: var(--vscode-editor-inactiveSelectionBackground);
        }
    }
`;

const LoadingItem = styled.div`
    height: 16px;
    margin-bottom: 2px;
    background: var(--vscode-editor-background);
    animation: loading 1s infinite alternate;

    @keyframes loading {
        0% {
            background: var(--vscode-editor-background);
        }
        100% {
            background: var(--vscode-editor-inactiveSelectionBackground);
        }
    }
`;

const CollapsibleSectionTitle = styled.div`
    display: flex;
    align-items: center;
    padding-block: 8px;
    cursor: pointer;

    & p {
        color: var(--vscode-button-background);
    }

    & p:hover {
        color: var(--vscode-button-hoverBackground);
    }
`;

const SectionBody = styled.div<{ columns?: number }>`
    display: grid;
    grid-template-columns: 1fr;
    ${({ columns }: { columns?: number }) =>
        columns &&
        `
        grid-template-columns: repeat(auto-fit, minmax(calc(${100 / columns}% - ${8 * (columns - 1)}px), 130px));
        column-gap: 8px;
    `}
`;

const SectionContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 16px;
`;

const SearchBoxContainer = styled.div`
    padding-inline: 8px;
`;

const TitleContainer = styled.div<{ isLink?: boolean }>`
    display: flex;
    align-items: center;
    gap: 4px;
    ${({ isLink }: { isLink?: boolean }) =>
        isLink &&
        `
        cursor: pointer;
    `}
`;

const HeaderContainer = styled.header`
    display: flex;
    align-items: center;
    padding-inline: 8px;
`;

const HeaderContainerWithSearch = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const DropdownBody = styled.div<{  sx?: CSSProperties }>`
    display: flex;
    flex-direction: column;
    padding: 2px;
    border-radius: 2px;
    color: var(--input-foreground);
    ${({ sx }: { sx?: CSSProperties }) => {
        let style = '';
        if (sx) {
            const sxObj = sx as Record<string, any>;
            for (const key in sxObj) {
                if (key === 'zIndex' && sxObj[key] !== undefined) {
                    style += `z-index: ${sxObj[key]} !important;`;
                } else if (sxObj[key] !== undefined) {
                    // Convert camelCase to kebab-case
                    const kebabKey = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                    style += `${kebabKey}: ${sxObj[key]};`;
                }
            }
        }
        return style;
    }}
`;

const Loader: React.FC<LoadingSectionProps> = ({ columns, rows, sections }) => {
    const sectionCount = sections ? sections : 2;
    const rowCount = rows ? rows : 2;
    const colCount = columns ? columns : 2;

    return (
        <>
            {Array.from({ length: sectionCount }).map((_, sectionIndex) => (
                <SectionContainer key={sectionIndex}>
                    {/* Loading section header */}
                    <LoadingHeader />

                    {/* Loading section body */}
                    <SectionBody columns={colCount}>
                        {Array.from({ length: rowCount * colCount }).map((_, index) => (
                            <LoadingItem key={`${sectionIndex}-${index}`} />
                        ))}
                    </SectionBody>
                </SectionContainer>
            ))}
        </>
    );
}

const PanelView: React.FC<PanelViewProps> = ({ children, id }) => {
    const { activePanelIndex } = useHelperPanePanelContext();
    
    return (
        <>
            {activePanelIndex === id && (
                <PanelViewContainer>
                    {React.Children.toArray(children).length > 0 ? (
                        children
                    ) : (
                        <Typography variant="body3">No items found.</Typography>
                    )}
                </PanelViewContainer>
            )}
        </>
    );
};
PanelView.displayName = 'PanelView';

const PanelTab: React.FC<PanelTabProps> = ({ title, id, onClick }) => {
    const { activePanelIndex, setActivePanelIndex } = useHelperPanePanelContext();

    const handleClick = () => {
        setActivePanelIndex(id);
        onClick?.(id);
    };

    return (
        <PanelTabContainer isActive={activePanelIndex === id} onClick={handleClick}>
            <Typography variant="body3">{title}</Typography>
        </PanelTabContainer>
    );
};
PanelTab.displayName = 'PanelTab';

const Panels: React.FC<PanelsProps> = ({ children, sx }) => {
    const [activePanelIndex, setActivePanelIndex] = useState<number>(0);

    const tabs = React.Children.toArray(children).filter(child => 
        React.isValidElement(child) && (child.type as any).displayName === 'PanelTab'
    );

    const views = React.Children.toArray(children).filter(child => 
        React.isValidElement(child) && (child.type as any).displayName === 'PanelView'
    );
    
    return (
        <HelperPanePanelProvider activePanelIndex={activePanelIndex} setActivePanelIndex={setActivePanelIndex}>
            <PanelContainer>
                <TabContainer sx={{ ...sx }}>
                    {tabs}
                </TabContainer>
                <ViewContainer>
                    {views}
                </ViewContainer>
            </PanelContainer>
        </HelperPanePanelProvider>
    );
};

const LibraryBrowserSubSection: React.FC<HelperPaneSectionProps> = ({
    title,
    columns = 1,
    collapsible,
    defaultCollapsed = false,
    collapsedItemsCount = 10,
    children
}) => {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);
    const items = React.Children.toArray(children);
    const visibleItems = isCollapsed ? items.slice(0, collapsedItemsCount) : items;
    const isItemsOverflowing = items.length > collapsedItemsCount;

    return (
        <SectionContainer>
            <Typography variant="body3" sx={{ fontStyle: "italic" }}>{title}</Typography>
            <SectionBody columns={columns}>
                {visibleItems.length > 0 ? visibleItems : <Typography variant="body3">No items found.</Typography>}
            </SectionBody>
            {collapsible && isItemsOverflowing && (
                <CollapseButton onClick={() => setIsCollapsed(!isCollapsed)}>
                    <Typography variant="caption">{isCollapsed ? 'Show more' : 'Show less'}</Typography>
                </CollapseButton>
            )}
        </SectionContainer>
    );
};

const LibraryBrowserSection: React.FC<HelperPaneSectionProps> = ({
    title,
    columns = 1,
    collapsible,
    defaultCollapsed = false,
    collapsedItemsCount = 10,
    children,
    titleSx
}) => {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);
    const items = React.Children.toArray(children);
    const visibleItems = isCollapsed ? items.slice(0, collapsedItemsCount) : items;
    const isItemsOverflowing = items.length > collapsedItemsCount;

    return (
        <SectionContainer>
            <Typography variant="h3" sx={{ margin: 0, ...titleSx }}>
                {title}
            </Typography>
            <SectionBody columns={columns}>
                {visibleItems.length > 0 ? visibleItems : <Typography variant="body3">No items found.</Typography>}
            </SectionBody>
            {collapsible && isItemsOverflowing && (
                <CollapseButton onClick={() => setIsCollapsed(!isCollapsed)}>
                    <Typography variant="body2">{isCollapsed ? 'Show more' : 'Show less'}</Typography>
                </CollapseButton>
            )}
        </SectionContainer>
    );
};

const LibraryBrowser: React.FC<LibraryBrowserProps> = ({
    anchorRef,
    children,
    loading = false,
    searchValue,
    title = "Library Browser",
    titleSx,
    onSearch,
    onClose,
}) => {
    const handleClose = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e.stopPropagation();
        onClose();
    };

    return createPortal(
        <LibraryBrowserWithOverlay ref={anchorRef}>
            <Overlay
                sx={{
                    background: "var(--vscode-editor-inactiveSelectionBackground)",
                    opacity: 0.4,
                    zIndex: 2001
                }}
                onClose={handleClose}
            />
            <LibraryBrowserContainer>
                <LibraryBrowserHeader>
                    <Typography variant="h2" sx={{ margin: 0, ...titleSx }}>
                        {title}
                    </Typography>
                    <Codicon name="close" onClick={handleClose} />
                </LibraryBrowserHeader>
                <Divider />
                <LibraryBrowserSearchBoxContainer>
                    <SearchBox id="helper-pane-search" placeholder="Search" value={searchValue} onChange={onSearch} />
                </LibraryBrowserSearchBoxContainer>
                <LibraryBrowserBody>
                    {loading ? (
                        <Loader columns={4} rows={3} sections={3} />
                    ) : (
                        children
                    )}
                </LibraryBrowserBody>
            </LibraryBrowserContainer>
        </LibraryBrowserWithOverlay>,
        document.body
    );
};

const IconButton: React.FC<HelperPaneIconButtonProps> = ({ title, getIcon, onClick }) => {
    return (
        <IconButtonContainer onClick={onClick}>
            {getIcon && getIcon()}
            <Typography variant="body3">{title}</Typography>
        </IconButtonContainer>
    );
};

const Footer: React.FC<HelperPaneFooterProps> = ({ children }) => {
    return (
        <FooterContainer>
            <Divider />
            <FooterBody>{children}</FooterBody>
        </FooterContainer>
    );
};

const CompletionItem: React.FC<HelperPaneCompletionItemProps> = ({ getIcon, indent = false, label, type, onClick, children }) => {
    const [collapsed, setCollapsed] = useState<boolean>(false);

    // Get the child nodes of type CompletionItem
    const completionItems = children ? React.Children.toArray(children).filter(child => 
        React.isValidElement(child) && (child.type as any).displayName === 'CompletionItem'
    ) : [];

    const handleCollapseClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e.preventDefault();
        e.stopPropagation();
        setCollapsed(!collapsed);
    };

    return (
        <CompletionItemOuterContainer indent={indent}>
            <CompletionItemContainer>
                <CompletionItemWithoutCollapseContainer
                    title={label}
                    isParent={completionItems.length > 0}
                    onClick={onClick}
                >
                    {getIcon && getIcon()}
                    <Typography variant="body3" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {label}
                    </Typography>
                    {type && (
                        <Typography variant="body3" sx={{ color: 'var(--vscode-terminal-ansiGreen)' }}>
                            {type}
                        </Typography>
                    )}
                </CompletionItemWithoutCollapseContainer>
                {completionItems.length > 0 && <HorizontalLine />}
                {completionItems.length > 0 && (collapsed ? (
                    <Codicon name="chevron-up" onClick={handleCollapseClick} />
                ) : (
                    <Codicon name="chevron-down" onClick={handleCollapseClick} />
                ))}
            </CompletionItemContainer>
            {!collapsed && completionItems}
        </CompletionItemOuterContainer>
    );
};
CompletionItem.displayName = 'CompletionItem';

const CategoryItem: React.FC<HelperPaneCategoryItemProps> = ({ label, labelSx, onClick, getIcon }) => {
    return (
        <CategoryItemContainer onClick={onClick}>
            {getIcon && getIcon()}
            <Typography variant="body2" sx={labelSx}>{label}</Typography>
            <Codicon sx={{ marginLeft: 'auto' }} name="chevron-right" />
        </CategoryItemContainer>
    );
};

const CollapsibleSection: React.FC<HelperPaneCollapsibleSectionProps> = ({
    title,
    titleSx,
    defaultCollapsed = false,
    children,
}) => {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);

    return (
        <>
            <CollapsibleSectionTitle onClick={() => setIsCollapsed(!isCollapsed)}>
                <Typography variant="body3" sx={{ fontStyle: "italic", ...titleSx }}>
                    {isCollapsed ? "Show " : "Hide "}{title}
                </Typography>
            </CollapsibleSectionTitle>
            {!isCollapsed && children}
        </>
    );
};

const SubSection: React.FC<HelperPaneSectionProps> = ({
    title,
    columns = 1,
    collapsible,
    defaultCollapsed = false,
    collapsedItemsCount = 10,
    children
}) => {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);
    const items = React.Children.toArray(children);
    const visibleItems = isCollapsed ? items.slice(0, collapsedItemsCount) : items;
    const isItemsOverflowing = items.length > collapsedItemsCount;

    return (
        <SectionContainer>
            <Typography variant="body3" sx={{ fontStyle: "italic" }}>{title}</Typography>
            <SectionBody columns={columns}>
                {visibleItems.length > 0 ? visibleItems : <Typography variant="body3">No items found.</Typography>}
            </SectionBody>
            {collapsible && isItemsOverflowing && (
                <CollapseButton onClick={() => setIsCollapsed(!isCollapsed)}>
                    <Typography variant="caption">{isCollapsed ? 'Show more' : 'Show less'}</Typography>
                </CollapseButton>
            )}
        </SectionContainer>
    );
};

const Section: React.FC<HelperPaneSectionProps> = ({
    title,
    columns = 1,
    collapsible,
    defaultCollapsed = false,
    collapsedItemsCount = 10,
    children,
    titleSx
}) => {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);
    const items = React.Children.toArray(children);
    const visibleItems = isCollapsed ? items.slice(0, collapsedItemsCount) : items;
    const isItemsOverflowing = items.length > collapsedItemsCount;

    return (
        <SectionContainer>
            <Typography variant="body2" sx={titleSx}>
                {title}
            </Typography>
            <SectionBody columns={columns}>
                {visibleItems.length > 0 ? (
                    visibleItems
                ) : (
                    <Typography variant="body3">No items found.</Typography>
                )}
            </SectionBody>
            {collapsible && isItemsOverflowing && (
                <CollapseButton onClick={() => setIsCollapsed(!isCollapsed)}>
                    <Typography variant="caption">{isCollapsed ? 'Show more' : 'Show less'}</Typography>
                </CollapseButton>
            )}
        </SectionContainer>
    );
};

const Body: React.FC<HelperPaneBodyProps> = ({ children }) => {
    return (
        <div >
            {children}
        </div>
    );
};

const Header: React.FC<HelperPaneHeaderProps> = ({
    title,
    titleSx,
    onBack,
    onClose,
    searchValue,
    onSearch,
    startAdornment,
    endAdornment
}) => {
    return (
        <>
            <HeaderContainerWithSearch>
                {title && (
                    <HeaderContainer>
                        {startAdornment && startAdornment}
                        <TitleContainer isLink={!!onBack} onClick={onBack}>
                            {onBack && <Codicon name="chevron-left" />}
                            {onBack ? (
                                <Typography variant="caption" sx={titleSx}>{title}</Typography>
                            ) : (
                                <Typography sx={{ margin: 0, ...titleSx }}>{title}</Typography>
                            )}
                        </TitleContainer>
                        {endAdornment && endAdornment}
                        {onClose && <Codicon name="close" sx={{ marginLeft: 'auto' }} onClick={onClose} />}
                    </HeaderContainer>
                )}
                {onSearch && (
                    <SearchBoxContainer>
                        <SearchBox id="helper-pane-search" placeholder="Search" value={searchValue} onChange={onSearch} />
                    </SearchBoxContainer>
                )}
            </HeaderContainerWithSearch>
            <Divider />
        </>
    );
};

const HelperPaneCustom: React.FC<HelperPaneCustomProps> & {
    Header: typeof Header;
    Body: typeof Body;
    Section: typeof Section;
    SubSection: typeof SubSection;
    CollapsibleSection: typeof CollapsibleSection;
    CategoryItem: typeof CategoryItem;
    CompletionItem: typeof CompletionItem;
    Footer: typeof Footer;
    IconButton: typeof IconButton;
    LibraryBrowser: typeof LibraryBrowser;
    LibraryBrowserSection: typeof LibraryBrowserSection;
    LibraryBrowserSubSection: typeof LibraryBrowserSubSection;
    Panels: typeof Panels;
    PanelTab: typeof PanelTab;
    PanelView: typeof PanelView;
    Arrow: typeof Arrow;
    Loader: typeof Loader;
} = ({ children, sx, anchorRef }: HelperPaneCustomProps) => {
    return (
        <DropdownBody sx={sx} ref={anchorRef} className='unq-modal-overlay'>
            {children}
        </DropdownBody>
    );
};

HelperPaneCustom.Header = Header;
HelperPaneCustom.Body = Body;
HelperPaneCustom.Section = Section;
HelperPaneCustom.SubSection = SubSection;
HelperPaneCustom.CollapsibleSection = CollapsibleSection;
HelperPaneCustom.CategoryItem = CategoryItem;
HelperPaneCustom.CompletionItem = CompletionItem;
HelperPaneCustom.Footer = Footer;
HelperPaneCustom.IconButton = IconButton;
HelperPaneCustom.LibraryBrowser = LibraryBrowser;
HelperPaneCustom.LibraryBrowserSection = LibraryBrowserSection;
HelperPaneCustom.LibraryBrowserSubSection = LibraryBrowserSubSection;
HelperPaneCustom.Panels = Panels;
HelperPaneCustom.PanelTab = PanelTab;
HelperPaneCustom.PanelView = PanelView;
HelperPaneCustom.Arrow = Arrow;
HelperPaneCustom.Loader = Loader;

export default HelperPaneCustom;
