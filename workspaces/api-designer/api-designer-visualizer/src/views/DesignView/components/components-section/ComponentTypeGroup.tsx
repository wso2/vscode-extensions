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

import React from 'react';
import styled from '@emotion/styled';
import { Button, Codicon } from '@wso2/ui-toolkit';
import { ComponentType, ComponentItem } from './ComponentsSection';
import { ValidationData } from '../api-header/MetricsOverview';
import { getComponentTypeLabel, getComponentTypeIcon } from './componentUtils';
import { ComponentItemCard } from './ComponentItemCard';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { AIButton } from '../../../../components/ai/AIButton';

const ComponentGroup = styled.div``;

const GroupHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
`;

const GroupHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    user-select: none;
    
    &:hover {
        opacity: 0.9;
    }
`;

const GroupTitle = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    line-height: 20px;
`;

const GroupCount = styled.span`
    font-size: 10px;
    font-weight: 500;
    font-family: var(--vscode-font-family);
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 1px 5px;
    border-radius: 3px;
    line-height: 14px;
    margin-left: 4px;
`;

const ComponentList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const AddButtonWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
`;

export interface ComponentTypeGroupProps {
    type: ComponentType;
    items: ComponentItem[];
    isExpanded: boolean;
    validationData?: ValidationData | null;
    expandedComponents: Set<string>;
    onToggle: () => void;
    onItemClick: (item: ComponentItem) => void;
    onItemRemove: (type: ComponentType, name: string) => void;
    onAddComponent: (type: ComponentType) => void;
    onAIPrompt: (context: string, path: string, defaultPrompt: string, title: string, placeholder: string, event: React.MouseEvent) => void;
    onToggleComponent: (key: string) => void;
}

export const ComponentTypeGroup: React.FC<ComponentTypeGroupProps> = ({
    type,
    items,
    isExpanded,
    validationData,
    expandedComponents,
    onToggle,
    onItemClick,
    onItemRemove,
    onAddComponent,
    onAIPrompt,
    onToggleComponent
}) => {
    const isAIAvailable = useAIAvailability();
    return (
        <ComponentGroup>
            <GroupHeader>
                <GroupHeaderLeft onClick={onToggle}>
                    <Codicon 
                        name={isExpanded ? 'chevron-down' : 'chevron-right'} 
                        sx={{ fontSize: '14px', color: 'var(--vscode-foreground)', opacity: 0.7 }} 
                    />
                    <Codicon 
                        name={getComponentTypeIcon(type)} 
                        sx={{ fontSize: '14px', opacity: 0.8 }} 
                    />
                    <GroupTitle>{getComponentTypeLabel(type)}</GroupTitle>
                    <GroupCount>{items.length}</GroupCount>
                </GroupHeaderLeft>
                <AddButtonWrapper>
                    <AIButton
                        
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onAIPrompt(
                                JSON.stringify({ 
                                    componentType: type,
                                    existingComponents: items.map(i => i.name)
                                }),
                                `/components/${type}`,
                                `Add a new ${getComponentTypeLabel(type)}`,
                                `Add ${getComponentTypeLabel(type)}`,
                                `Describe the ${getComponentTypeLabel(type)} you want to add/edit...`,
                                e
                            );
                        }}
                        title={`Edit ${getComponentTypeLabel(type)} with AI`}
                    />
                    <Button
                        appearance="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddComponent(type);
                        }}
                        tooltip={`Add ${getComponentTypeLabel(type)}`}
                    >
                        <Codicon name="add" sx={{ fontSize: '14px' }} />
                    </Button>
                </AddButtonWrapper>
            </GroupHeader>
            {isExpanded && (
                <ComponentList>
                    {items.map((item) => {
                        const key = `${item.type}-${item.name}`;
                        return (
                            <ComponentItemCard
                                key={key}
                                item={item}
                                validationData={validationData}
                                isExpanded={expandedComponents.has(key)}
                                onToggle={() => onToggleComponent(key)}
                                onEdit={() => onItemClick(item)}
                                onRemove={() => onItemRemove(item.type, item.name)}
                                onAIPrompt={onAIPrompt}
                            />
                        );
                    })}
                </ComponentList>
            )}
        </ComponentGroup>
    );
};

