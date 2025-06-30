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
import React, { ReactNode, useEffect, useState } from 'react';
import styled from "@emotion/styled";
import { Codicon } from '@wso2/ui-toolkit';

export interface TreeViewProps {
    id: string;
    content?: string | ReactNode;
    children?: ReactNode;
    rootTreeView?: boolean;
    selectedId?: string;
    disableClick?: boolean;
    sx?: any;
    onSelect?: (id: string) => void;
    collapseByDefault?: boolean;
    onEdit?: (e: any) => void;
    onDelete?: (id: string) => void;
}

interface TreeContainerProps {
    isRootTreeView: boolean;
    sx?: any;
    isExpanded?: boolean;
}
const TreeContainer = styled.div<TreeContainerProps>`
    width: 100%;
    &:hover {
        background-color: ${(props: TreeContainerProps) => props.isExpanded ? "var(--vscode-editorHoverWidget-background)" : "var(--vscode-list-hoverBackground)"};
    };
    ${(props: TreeContainerProps) => props.sx}
`;

interface IconContainerProps {
    isCollapsed: boolean;
    isSelected?: boolean;
    isExpanded?: boolean;
}
const IconContainer = styled.div<IconContainerProps>`
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: center;
    padding-top: 3px;
    background-color: ${(props: IconContainerProps) => props.isSelected ? "var(--vscode-editorHoverWidget-background)" : "transparent"};
     &:hover {
        background-color: var(--vscode-list-hoverBackground);
    };
    width: 100%;
`;
const EmptyContainer = styled.div`
    width: 14px;
`;

const ContentContainer = styled.div`
    width: 100%;
    display: flex;
    height: 25px;
    justify-content: space-between;
    align-items: center;
    & > div {
        display: none;
    };
    &:hover > div {
        display: flex;
    };
`

const EditIconContainer = styled.div`
    width: 15px;
    height: 20px;
    cursor: pointer;
    border-radius: 5px;
    align-content: center;
    padding: 1px 5px 1px 5px;
    margin-top: 2px;
    color: var(--vscode-list-deemphasizedForeground);
    &:hover, &.active {
        background-color: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-editor-foreground);
    }
    & img {
        width: 20px;
    }
`;

export const TreeView: React.FC<TreeViewProps> = (props: TreeViewProps) => {
    const { id, content, children, rootTreeView: isRootTreeView, onSelect, selectedId, disableClick = false, sx, collapseByDefault = false, onEdit, onDelete } = props
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = (e?: any) => {
        e?.stopPropagation();
        if (!disableClick) {
            setIsExpanded(!isExpanded);
        }
    };

    const handleSelect = (sId: string) => {
        if (!disableClick) {
            if (onSelect) {
                onSelect(sId);
            }

            toggleExpand();
        }
    }

    const handleDelete = () => {
        if (onDelete) {
            onDelete(id);
        }
    }

    const handleEdit = (e: any) => {
        if (onDelete) {
            onEdit(e);
        }
    }

    useEffect(() => {
        const hasSelectedChild = (children: ReactNode): boolean => {
            return React.Children.toArray(children).some((child: any) => {
                // Check if the child matches the selectedId
                if (child?.props?.id === selectedId) {
                    return true;
                }
                // Recursively check if the child has its own children
                return child?.props?.children && hasSelectedChild(child.props.children);
            });
        };

        // Expand if this TreeView is selected or contains the selected item
        if (!collapseByDefault && (selectedId === id || (children && hasSelectedChild(children)))) {
            setIsExpanded(true);
        }
    }, [selectedId, id, children, collapseByDefault]);

    return (
        <TreeContainer isRootTreeView={isRootTreeView} sx={sx} isExpanded={isExpanded}>
            <IconContainer
                style={{ cursor: 'pointer', paddingLeft: '10px' }}
                isCollapsed={!isExpanded}
                isSelected={selectedId === id}
                onClick={() => handleSelect(id)}
                isExpanded={isExpanded}>
                {React.Children.count(children) === 0 ?
                    <EmptyContainer /> :
                    <Codicon name={isExpanded ? "chevron-down" : "chevron-right"} onClick={toggleExpand}/>
                }
                <ContentContainer>
                    {content}
                    <div style={{marginRight: '7px'}}>
                        {onEdit && (
                            <EditIconContainer
                                onClick={handleEdit}
                                className="edit-icon">
                                <Codicon name="edit" iconSx={{ fontSize: 15 }} />
                            </EditIconContainer>
                        )}
                        {onDelete && (
                            <EditIconContainer
                                onClick={handleDelete}
                                className="delete-icon">
                                <Codicon name="trash" iconSx={{ fontSize: 15 }} />
                            </EditIconContainer>
                        )}
                    </div>
                </ContentContainer>
            </IconContainer>
            {isExpanded && (
                <div style={{ paddingLeft: '10px' }}>
                    {children}
                </div>
            )}
        </TreeContainer>
    );
};
