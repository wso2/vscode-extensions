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

import React, { useEffect, useState } from "react";
import {
    Button,
    Codicon,
    ProgressRing,
    SearchBox,
    SidePanelBody,
    Switch,
    TextArea,
    ThemeColors,
    Tooltip,
} from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { BackIcon, CloseIcon, LogIcon } from "../../resources";
import { Category, Item, Node } from "./types";
import { cloneDeep, debounce } from "lodash";
import { GroupListSkeleton } from "../Skeletons";
import GroupList from "../GroupList";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { getExpandedCategories, setExpandedCategories, getDefaultExpandedState } from "../../utils/localStorage";
import { getCategoryConfig, shouldShowEmptyCategory, shouldUseConnectionContainer, getCategoryActions, CategoryAction } from "./categoryConfig";

namespace S {
    export const Container = styled.div<{}>`
        width: 100%;
    `;

    export const HeaderContainer = styled.div<{}>`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 16px;
    `;

    export const PanelBody = styled(SidePanelBody)`
        height: calc(100vh - 100px);
        padding-top: 0;
    `;

    export const StyledSearchInput = styled(SearchBox)`
        height: 30px;
    `;

    export const CategoryRow = styled.div<{ showBorder?: boolean }>`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
        width: 100%;
        margin-top: 0;
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
    `;

    export const Row = styled.div<{}>`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
        margin-bottom: 4px;
        width: 100%;
    `;

    export const LeftAlignRow = styled(Row)`
        justify-content: flex-start;
    `;

    export const Grid = styled.div<{ columns: number }>`
        display: grid;
        grid-template-columns: repeat(${({ columns }) => columns}, minmax(0, 1fr));
        gap: 8px;
        width: 100%;
        margin-top: 8px;
        margin-bottom: 12px;
    `;

    export const Title = styled.div<{}>`
        font-size: 14px;
        font-family: GilmerBold;
        white-space: nowrap;
        &:first {
            margin-top: 0;
        }
    `;

    export const SubTitle = styled.div<{}>`
        font-size: 12px;
        opacity: 0.9;
    `;

    export const BodyText = styled.div<{}>`
        font-size: 11px;
        opacity: 0.5;
    `;

    export const Component = styled.div<{ enabled?: boolean }>`
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
        padding: 5px;
        border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
        border-radius: 5px;
        height: 36px;
        cursor: ${({ enabled }) => (enabled ? "pointer" : "not-allowed")};
        font-size: 14px;
        min-width: 160px;
        max-width: 100%;
        ${({ enabled }) => !enabled && "opacity: 0.5;"}
        &:hover {
            ${({ enabled }) =>
                enabled &&
                `
                background-color: ${ThemeColors.PRIMARY_CONTAINER};
                border: 1px solid ${ThemeColors.HIGHLIGHT};
            `}
        }
    `;

    export const ComponentTitle = styled.div`
        white-space: nowrap;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        word-break: break-word;
    `;

    export const IconContainer = styled.div`
        padding: 0 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        & svg {
            height: 16px;
            width: 16px;
        }
    `;

    export const HorizontalLine = styled.hr`
        width: 100%;
        border: 0;
        border-top: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    `;

    export const BackButton = styled(Button)`
        /* position: absolute;
        right: 10px; */
        border-radius: 5px;
    `;

    export const CloseButton = styled(Button)`
        position: absolute;
        right: 10px;
        border-radius: 5px;
    `;

    export const HighlightedButton = styled.div`
        margin-top: 10px;
        margin-bottom: 12px;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 8px;
        padding: 6px 2px;
        color: ${ThemeColors.PRIMARY};
        border: 1px dashed ${ThemeColors.PRIMARY};
        border-radius: 5px;
        cursor: pointer;
        &:hover {
            border: 1px solid ${ThemeColors.PRIMARY};
            background-color: ${ThemeColors.PRIMARY_CONTAINER};
        }
    `;

    export const AiContainer = styled.div`
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        width: 100%;
        margin-top: 20px;
    `;

    export const AdvancedSubcategoryContainer = styled.div`
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-top: 8px;
    `;

    export const AdvancedSubcategoryHeader = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 4px 12px;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;

        &:hover {
            background-color: ${ThemeColors.PRIMARY_CONTAINER};
        }

        &:hover > div:first-of-type {
            opacity: 1;
            color: ${ThemeColors.PRIMARY};
        }
    `;

    export const AdvancedSubTitle = styled.div`
        font-size: 12px;
        opacity: 0.7;
        color: ${ThemeColors.ON_SURFACE_VARIANT};
        transition: all 0.2s ease;
    `;

    export const CategoryHeader = styled.div<{ fullWidth?: boolean }>`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: -webkit-fill-available;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        border-radius: 5px;
        margin: ${({ fullWidth }) => fullWidth ? '0 -12px' : '0'};
        
        &:hover {
            background-color: ${ThemeColors.PRIMARY_CONTAINER};
        }
    `;

    export const CategoryCard = styled.div<{ hasBackground?: boolean }>`
        background-color: ${({ hasBackground }) => hasBackground ? `rgba(255, 255, 255, 0.02)` : 'transparent'};
        border-radius: 5px;
        padding: ${({ hasBackground }) => hasBackground ? '0 12px' : '0'};
        margin-bottom: 16px;
        border: ${({ hasBackground }) => hasBackground ? `1px solid ${ThemeColors.OUTLINE_VARIANT}` : 'none'};
        transition: all 0.2s ease;
        
        &:hover {
            ${({ hasBackground }) => hasBackground && `
                background-color: rgba(255, 255, 255, 0.04);
            `}
        }
    `;

    export const ChevronIcon = styled.div<{ isExpanded: boolean }>`
        transition: transform 0.2s ease;
        transform: ${({ isExpanded }) => isExpanded ? 'rotate(-90deg)' : 'rotate(90deg)'};
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    export const CategorySeparator = styled.div`
        width: 100%;
        height: 1px;
        background-color: ${ThemeColors.OUTLINE_VARIANT};
        margin: 16px 0;
    `;
}

interface NodeListProps {
    categories: Category[];
    showAiPanel?: boolean;
    title?: string;
    onSelect: (id: string, metadata?: any) => void;
    onSearchTextChange?: (text: string) => void;
    onAddConnection?: () => void;
    onAddFunction?: () => void;
    onAdd?: () => void;
    addButtonLabel?: string;
    onBack?: () => void;
    onClose?: () => void;
    searchPlaceholder?: string;
}

export function NodeList(props: NodeListProps) {
    const {
        categories,
        showAiPanel,
        title,
        onSelect,
        onSearchTextChange,
        onAddConnection,
        onAddFunction,
        onAdd,
        addButtonLabel,
        onBack,
        onClose,
        searchPlaceholder,
    } = props;

    const [searchText, setSearchText] = useState<string>("");
    const [showGeneratePanel, setShowGeneratePanel] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [expandedMoreSections, setExpandedMoreSections] = useState<Record<string, boolean>>({});
    const [expandedCategories, setExpandedCategoriesState] = useState<Record<string, boolean>>({});
    const { rpcClient } = useRpcContext();
    const [isNPSupported, setIsNPSupported] = useState(false);

    useEffect(() => {
        rpcClient
            .getCommonRpcClient()
            .isNPSupported()
            .then((supported) => {
                setIsNPSupported(supported);
            });
    }, []);

    // Initialize expanded categories state from localStorage
    useEffect(() => {
        if (categories && categories.length > 0) {
            const categoryTitles = categories.map(cat => cat.title);
            const storedState = getExpandedCategories();
            const defaultState = getDefaultExpandedState(categoryTitles);
            
            // Merge stored state with defaults, prioritizing stored state
            const mergedState = { ...defaultState, ...storedState };
            setExpandedCategoriesState(mergedState);
        }
    }, [categories]);

    useEffect(() => {
        if (onSearchTextChange) {
            setIsSearching(true);
            debouncedSearch(searchText);
            return () => debouncedSearch.cancel();
        }
    }, [searchText]);

    const handleSearch = (text: string) => {
        onSearchTextChange(text);
    };

    const debouncedSearch = debounce(handleSearch, 1100);

    const handleOnSearch = (text: string) => {
        setSearchText(text);
    };

    const handleBackClick = () => {
        setSearchText("");
        onBack();
    }

    useEffect(() => {
        setIsSearching(false);
    }, [categories]);

    const toggleMoreSection = (sectionKey: string) => {
        setExpandedMoreSections((prev) => ({
            ...prev,
            [sectionKey]: !prev[sectionKey],
        }));
    };

    const toggleCategory = (categoryTitle: string) => {
        const newExpandedState = {
            ...expandedCategories,
            [categoryTitle]: !expandedCategories[categoryTitle],
        };
        setExpandedCategoriesState(newExpandedState);
        setExpandedCategories(newExpandedState);
    };

    const handleAddNode = (node: Node, category?: string) => {
        if (node.enabled) {
            onSelect(node.id, { node: node.metadata, category });
        }
    };

    const handleAddConnection = () => {
        if (onAddConnection) {
            onAddConnection();
        }
    };

    const handleAddFunction = () => {
        if (onAddFunction) {
            onAddFunction();
        }
    };

    const handleAdd = () => {
        if (onAdd) {
            onAdd();
        }
    };

    const getNodesContainer = (items: (Node | Category)[], parentCategoryTitle?: string) => {
        const safeItems = items.filter((item) => item != null);
        const nodes = safeItems.filter((item): item is Node => "id" in item && !("title" in item));
        const subcategories = safeItems.filter((item): item is Category => "title" in item && "items" in item);

        return (
            <>
                <S.Grid columns={2}>
                    {nodes.map((node, index) => {
                        if (["NP_FUNCTION"].includes(node.id) && !isNPSupported) {
                            return;
                        }

                        return (
                            <Tooltip 
                                content={node.description} 
                                sx={{ 
                                    maxWidth: "280px",
                                    whiteSpace: "normal",
                                    wordWrap: "break-word",
                                    overflowWrap: "break-word"
                                }}
                            >
                                <S.Component
                                    key={node.id + index}
                                    enabled={node.enabled}
                                    onClick={() => handleAddNode(node)}
                                >
                                    <S.IconContainer>{node.icon || <LogIcon />}</S.IconContainer>
                                    <S.ComponentTitle
                                        ref={(el) => {
                                            if (el && el.scrollWidth > el.clientWidth) {
                                                el.style.fontSize = "13px";
                                                el.style.wordBreak = "break-word";
                                                el.style.whiteSpace = "nowrap";
                                            }
                                        }}
                                    >
                                        {node.label}
                                    </S.ComponentTitle>
                                </S.Component>
                            </Tooltip>
                        );
                    })}
                </S.Grid>
                {subcategories.map((subcategory, index) => {
                    const isMoreSubcategory = subcategory.title === "More";

                    if (isMoreSubcategory) {
                        const sectionKey = `${parentCategoryTitle}-${subcategory.title}`;
                        const isExpanded = expandedMoreSections[sectionKey] || searchText?.length > 0;

                        return (
                            <S.AdvancedSubcategoryContainer key={subcategory.title + index}>
                                <S.AdvancedSubcategoryHeader onClick={() => toggleMoreSection(sectionKey)}>
                                    <S.AdvancedSubTitle>{subcategory.title}</S.AdvancedSubTitle>
                                    <Button
                                        appearance="icon"
                                        sx={{
                                            transition: "all 0.2s ease",
                                            "&:hover": {
                                                backgroundColor: "transparent !important",
                                            },
                                        }}
                                    >
                                        <Codicon name={isExpanded ? "chevron-up" : "chevron-down"} />
                                    </Button>
                                </S.AdvancedSubcategoryHeader>
                                {isExpanded && <div>{getNodesContainer(subcategory.items, parentCategoryTitle)}</div>}
                            </S.AdvancedSubcategoryContainer>
                        );
                    } else {
                        return (
                            <S.CategoryRow key={subcategory.title + index} showBorder={false}>
                                <S.Row>
                                    <Tooltip content={subcategory.description}>
                                        <S.SubTitle>{subcategory.title}</S.SubTitle>
                                    </Tooltip>
                                </S.Row>
                                {subcategory.items &&
                                    subcategory.items.length > 0 &&
                                    getNodesContainer(subcategory.items, parentCategoryTitle)}
                            </S.CategoryRow>
                        );
                    }
                })}
            </>
        );
    };

    const getConnectionContainer = (categories: Category[]) => (
        <S.Grid columns={1}>
            {categories.map((category, index) =>
                category.isLoading ? (
                    <GroupListSkeleton key={"skeleton" + index} />
                ) : (
                    <GroupList
                        key={category.title + index + "tooltip"}
                        category={category}
                        expand={searchText?.length > 0}
                        onSelect={handleAddNode}
                    />
                ))
            }
        </S.Grid>
    );

    const getCategoryContainer = (groups: Category[], isSubCategory = false, parentCategoryTitle?: string) => {
        const callFunctionNode = groups
            .flatMap((group) => group?.items || [])
            .filter((item) => item != null)
            .find((item) => "id" in item && item.id === "FUNCTION");
        
        // Configuration for special categories
        const categoryConfig = {
            "Connections": { hasBackground: false },
            "Statement": { hasBackground: true, showSeparatorBefore: true }, // Show separator before Statement
            "AI": { hasBackground: true, targetPosition: 3 }, // 4th position (0-indexed)
            "Control": { hasBackground: true },
            "Error Handling": { hasBackground: true },
            "Concurrency": { hasBackground: true },
            "Logging": { hasBackground: true },
            "Model Providers": { hasBackground: false },
            "Embedding Providers": { hasBackground: false },
            "Vector Knowledge Bases": { hasBackground: false },
            "Vector Stores": { hasBackground: false },
            "Data Loaders": { hasBackground: false },
            "Chunkers": { hasBackground: false },
        };
        
        // Reorder categories to move AI as 4th category
        const reorderedGroups = [...groups];
        const aiCategoryIndex = reorderedGroups.findIndex(group => group.title === "AI");
        if (aiCategoryIndex !== -1 && aiCategoryIndex < 3) {
            const aiCategory = reorderedGroups.splice(aiCategoryIndex, 1)[0];
            reorderedGroups.splice(3, 0, aiCategory);
        }
        
        const content = (
            <>
                {reorderedGroups.map((group, index) => {
                    const categoryActions = getCategoryActions(group.title, title);
                    const config = categoryConfig[group.title] || { hasBackground: true };
                    const shouldShowSeparator = config.showSeparatorBefore;
                    const isLoggingCategory = group.title === "Logging";
                    
                    // Hide categories that don't have items, except for special categories that can add items
                    if (!group || !group.items || group.items.length === 0) {
                        // Only show empty categories if they have add functionality
                        if (!shouldShowEmptyCategory(group.title)) {
                            return null;
                        }
                    }
                    if (searchText && (!group.items || group.items.length === 0)) {
                        return null;
                    }
                    // skip current integration category if onAddFunction is not provided and items are empty
                    if (!onAddFunction && group.title === "Current Integration" && (!group.items || group.items.length === 0)) {
                        return null;
                    }

                    const isCategoryExpanded = shouldExpandAll || expandedCategories[group.title] !== false;

                    return (
                        <React.Fragment key={group.title + index}>
                            {shouldShowSeparator && <S.CategorySeparator />}
                            <S.CategoryCard hasBackground={config.hasBackground && !isSubCategory}>
                                <S.CategoryRow showBorder={false}>
                                    {!isSubCategory ? (
                                        <S.CategoryHeader fullWidth={config.hasBackground && !isSubCategory} onClick={() => toggleCategory(group.title)}>
                                            <S.Row style={{ margin: 0, cursor: 'pointer' }}>
                                                <S.Title>{group.title}</S.Title>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {categoryActions.map((action, actionIndex) => {
                                                        const handlers = {
                                                            onAddConnection: handleAddConnection,
                                                            onAddFunction: handleAddFunction,
                                                            onAdd: handleAdd
                                                        };
                                                        
                                                        const handler = handlers[action.handlerKey];
                                                        const propsHandler = props[action.handlerKey];
                                                        
                                                        // Only render if the handler exists in props
                                                        if (!propsHandler || !handler) return null;
                                                        
                                                        const tooltipText = action.tooltip || addButtonLabel || "";
                                                        
                                                        return (
                                                            <Tooltip key={`${group.title}-${actionIndex}`} content={tooltipText}>
                                                                <Button
                                                                    appearance="icon"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handler();
                                                                    }}
                                                                >
                                                                    <Codicon name="add" />
                                                                </Button>
                                                            </Tooltip>
                                                        );
                                                    })}
                                                    <Tooltip content={isCategoryExpanded ? "Collapse" : "Expand"}>
                                                        <S.ChevronIcon isExpanded={isCategoryExpanded}>
                                                            <Codicon name="chevron-right" />
                                                        </S.ChevronIcon>
                                                    </Tooltip>
                                                </div>
                                            </S.Row>
                                        </S.CategoryHeader>
                                    ) : (
                                        <S.Row>
                                            <Tooltip content={group.description}>
                                                <S.SubTitle>{group.title}</S.SubTitle>
                                            </Tooltip>
                                        </S.Row>
                                    )}
                                    {isCategoryExpanded && (
                                        <>
                                            {(!group.items || group.items.length === 0) &&
                                                !searchText &&
                                                !isSearching &&
                                                categoryActions.map((action, actionIndex) => {
                                                    const handlers = {
                                                        onAddConnection: handleAddConnection,
                                                        onAddFunction: handleAddFunction,
                                                        onAdd: handleAdd
                                                    };
                                                    
                                                    const handler = handlers[action.handlerKey];
                                                    const propsHandler = props[action.handlerKey];
                                                    
                                                    // Only render if the handler exists in props
                                                    if (!propsHandler || !handler) return null;
                                                    
                                                    const buttonLabel = action.emptyStateLabel || addButtonLabel || "Add";
                                                    
                                                    return (
                                                        <S.HighlightedButton 
                                                            key={`empty-${group.title}-${actionIndex}`}
                                                            onClick={handler}
                                                        >
                                                            <Codicon name="add" iconSx={{ fontSize: 12 }} />
                                                            {buttonLabel}
                                                        </S.HighlightedButton>
                                                    );
                                                })}
                                            {group.items &&
                                            group.items.length > 0 &&
                                            // 1. If parent group uses connection container and ALL items don't have id, use getConnectionContainer
                                            shouldUseConnectionContainer(group.title) &&
                                            group.items.filter((item) => item != null).every((item) => !("id" in item))
                                                ? getConnectionContainer(group.items as Category[])
                                                : // 2. If ALL items don't have id (all are categories), use getCategoryContainer
                                                group.items.filter((item) => item != null).every((item) => !("id" in item))
                                                ? getCategoryContainer(
                                                      group.items as Category[],
                                                      true,
                                                      !isSubCategory ? group.title : parentCategoryTitle
                                                  )
                                                : // 3. Otherwise (has items with id or mixed), use getNodesContainer
                                                  getNodesContainer(
                                                      group.items as (Node | Category)[],
                                                      !isSubCategory ? group.title : parentCategoryTitle
                                                  )}
                                            {/* Add Show More Functions under Logging category */}
                                            {isLoggingCategory && callFunctionNode && isCategoryExpanded && (
                                                <S.AdvancedSubcategoryContainer key={"showMoreFunctions"} style={{ marginBottom: "12px" }}>
                                                    <S.AdvancedSubcategoryHeader onClick={() => handleAddNode(callFunctionNode as Node)}>
                                                        <S.AdvancedSubTitle>Show More Functions</S.AdvancedSubTitle>
                                                        <Button
                                                            appearance="icon"
                                                            sx={{
                                                                transition: "all 0.2s ease",
                                                                "&:hover": {
                                                                    backgroundColor: "transparent !important",
                                                                },
                                                            }}
                                                        >
                                                            <Codicon name="chevron-right" />
                                                        </Button>
                                                    </S.AdvancedSubcategoryHeader>
                                                </S.AdvancedSubcategoryContainer>
                                            )}
                                        </>
                                    )}
                                </S.CategoryRow>
                            </S.CategoryCard>
                        </React.Fragment>
                    );
                })}
            </>
        );

        const isEmpty = React.Children.toArray(content.props.children).every((child) => child === null);
        return isEmpty && searchText ? <div style={{ paddingTop: "10px" }}>No matching results found</div> : content;
    };

    // filter out category items based on search text
    const filterItems = (items: Item[]): Item[] => {
        if (!items) return [];

        return items
            .filter((item) => item != null)
            .map((item) => {
                if ("items" in item && "title" in item) {
                    // This is a Category (like "More")
                    const filteredItems = filterItems(item.items);
                    const categoryMatches =
                        item.title.toLowerCase().includes(searchText.toLowerCase()) ||
                        (item.description?.toLowerCase() || "").includes(searchText.toLowerCase());

                    // Keep the category if it matches or has matching items
                    if (categoryMatches || filteredItems.length > 0) {
                        return {
                            ...item,
                            items: filteredItems,
                        };
                    }
                    return null;
                } else if ("id" in item && "label" in item) {
                    // This is a Node
                    const lowerCaseTitle = item.label.toLowerCase();
                    const lowerCaseDescription = item.description?.toLowerCase() || "";
                    const lowerCaseSearchText = searchText.toLowerCase();
                    if (
                        lowerCaseTitle.includes(lowerCaseSearchText) ||
                        lowerCaseDescription.includes(lowerCaseSearchText)
                    ) {
                        return item;
                    }
                    return null;
                }
                return null;
            })
            .filter(Boolean) as Item[];
    };

    const filteredCategories = cloneDeep(categories).map((category) => {
        if (!category || !category.items || onSearchTextChange) {
            return category;
        }
        category.items = filterItems(category.items) || [];
        return category;
    });

    // When searching, expand all categories
    const shouldExpandAll = searchText && searchText.length > 0;

    return (
        <S.Container>
            <S.HeaderContainer>
                <S.Row>
                    {showAiPanel && (
                        <Switch
                            leftLabel="Search"
                            rightLabel="Generate"
                            checked={showGeneratePanel}
                            checkedColor={ThemeColors.PRIMARY}
                            enableTransition={true}
                            onChange={() => {
                                setShowGeneratePanel(!showGeneratePanel);
                            }}
                            sx={{
                                margin: "auto",
                                zIndex: "2",
                                border: "unset",
                            }}
                            disabled={false}
                        />
                    )}
                    {onBack && title && (
                        <S.LeftAlignRow>
                            <S.BackButton appearance="icon" onClick={handleBackClick}>
                                <BackIcon />
                            </S.BackButton>
                            {title}
                        </S.LeftAlignRow>
                    )}
                    {onClose && (
                        <S.CloseButton appearance="icon" onClick={onClose}>
                            <CloseIcon />
                        </S.CloseButton>
                    )}
                </S.Row>
                {!showGeneratePanel && (
                    <S.Row>
                        <S.StyledSearchInput
                            value={searchText}
                            placeholder={searchPlaceholder || "Search"}
                            autoFocus={true}
                            onChange={handleOnSearch}
                            size={60}
                        />
                    </S.Row>
                )}
            </S.HeaderContainer>
            {isSearching && (
                <S.PanelBody>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                        <ProgressRing />
                    </div>
                </S.PanelBody>
            )}
            {!showGeneratePanel && !isSearching && (
                <S.PanelBody>{getCategoryContainer(filteredCategories)}</S.PanelBody>
            )}
            {showAiPanel && showGeneratePanel && (
                <S.PanelBody>
                    <S.AiContainer>
                        <S.Title>Describe what you want you want to do</S.Title>
                        <TextArea
                            rows={10}
                            placeholder={
                                "E.g. I need to add functionality to validate user input before saving to the database."
                            }
                            sx={{ width: "100%" }}
                        ></TextArea>
                        <Button>Generate</Button>
                    </S.AiContainer>
                </S.PanelBody>
            )}
        </S.Container>
    );
}

export default NodeList;
