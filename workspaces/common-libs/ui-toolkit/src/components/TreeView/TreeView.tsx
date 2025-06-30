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
import { Codicon } from '../Codicon/Codicon';

export interface TreeViewProps {
    id: string;
    content?: string | ReactNode;
    children?: ReactNode;
    rootTreeView?: boolean;
    selectedId?: string;
    disableClick?: boolean;
    sx?: any;
    onSelect?: (id: string) => void;
    expandByDefault?: boolean;
    treeViewElementSX?: any;
}

interface TreeContainerProps {
    isRootTreeView: boolean;
    sx?: any;
}
const TreeContainer = styled.div<TreeContainerProps>`
    padding-left: ${(props: TreeContainerProps) => props.isRootTreeView ? 0 : "20px"};
    ${(props: TreeContainerProps) => props.sx}
`;

interface IconContainerProps {
    isCollapsed: boolean;
    isSelected?: boolean;
}
const IconContainer = styled.div<IconContainerProps>`
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: center;
    padding-top: 3px;
    background-color: ${(props: IconContainerProps) => props.isSelected ? "var(--vscode-editorHoverWidget-background)" : "transparent"};
    &:hover {
        background-color: var(--vscode-editorHoverWidget-background);
    }
`;
const EmptyContainer = styled.div`
    width: 14px;
`;

export const TreeView: React.FC<TreeViewProps> = (props: TreeViewProps) => {
    const { id, content, children, rootTreeView: isRootTreeView, onSelect, selectedId, disableClick = false, sx, expandByDefault = false, treeViewElementSX } = props
    const [isExpanded, setIsExpanded] = useState(expandByDefault);

    const toggleExpand = (sId: string) => {
        if (!disableClick) {
            if (onSelect) {
                onSelect(sId);
            }
            setIsExpanded(!isExpanded);
        }
    };

    const handleSelect = (sId: string) => {
        if (onSelect) {
            onSelect(sId);
        }
    };

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
    
        if ((selectedId === id || (children && hasSelectedChild(children))) && expandByDefault !== false) {
            setIsExpanded(true);
        }
    }, [selectedId, id, children, expandByDefault]);

    return (
        <TreeContainer isRootTreeView={isRootTreeView} sx={sx}>
            <div onClick={() => toggleExpand(id)} style={treeViewElementSX}>
                <IconContainer isCollapsed={!isExpanded} isSelected={selectedId === id}>
                    {React.Children.count(children) === 0 ? <EmptyContainer /> : <Codicon name={isExpanded ? "chevron-down" : "chevron-right"} />} 
                    {content}
                </IconContainer>
            </div>
            {isExpanded && (
                <div>
                    {React.Children.map(children, child =>
                        React.cloneElement(child as React.ReactElement<any>, {
                            selectedId: selectedId,
                            disableClick: disableClick,
                            onSelect: handleSelect,
                        })
                    )}
                </div>
            )}
        </TreeContainer>
    );
};
