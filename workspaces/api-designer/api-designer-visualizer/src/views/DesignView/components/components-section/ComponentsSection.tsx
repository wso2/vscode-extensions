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

import React, { useState, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon } from '@wso2/ui-toolkit';
import { ValidationData } from '../api-header/MetricsOverview';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';
import { useAIAvailability } from '../../../../hooks/useAIAvailability';
import { AIButton } from '../../../../components/ai/AIButton';
import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';
import { ComponentTypeGroup } from './ComponentTypeGroup';
import { getComponentTypeLabel, getComponentTypeIcon } from './componentUtils';

export type ComponentType = 'schemas' | 'parameters' | 'headers' | 'requestBodies' | 'responses' | 'securitySchemes' | 'examples' | 'links' | 'callbacks';

export interface ComponentItem {
    type: ComponentType;
    name: string;
    data: any;
}

export interface ComponentsSectionProps {
    components?: {
        schemas?: Record<string, any>;
        parameters?: Record<string, any>;
        headers?: Record<string, any>;
        requestBodies?: Record<string, any>;
        responses?: Record<string, any>;
        securitySchemes?: Record<string, any>;
        examples?: Record<string, any>;
        links?: Record<string, any>;
        callbacks?: Record<string, any>;
    };
    validationData?: ValidationData | null;
    onComponentClick: (type: ComponentType, name: string, data: any) => void;
    onComponentRemove: (type: ComponentType, name: string) => void;
    onAddComponent: (type: ComponentType) => void;
    onAddComponentType?: () => void;
}

const Section = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 16px 18px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    user-select: none;
    position: relative;
    z-index: 10002;
    
    &:hover {
        opacity: 0.9;
    }
`;

const SectionHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ToggleIcon = styled.span<{ isCollapsed: boolean }>`
    display: inline-block;
    transition: transform 0.2s ease;
    transform: ${(props: { isCollapsed: boolean }) => props.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'};
    font-size: 12px;
    color: var(--vscode-icon-foreground);
    opacity: 0.7;
`;

const SectionTitle = styled.h2`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    letter-spacing: 0.5px;
`;

const SectionCount = styled.span`
    font-size: 11px;
    font-weight: 400;
    font-family: var(--vscode-font-family);
    color: var(--vscode-descriptionForeground);
    margin-left: 8px;
`;

const AddButtonWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
    z-index: 10003;
`;

const MenuDropdown = styled.div<{ $alignStart?: boolean }>`
    position: absolute;
    top: 100%;
    right: ${(p: { $alignStart?: boolean }) => (p.$alignStart ? 'auto' : '0')};
    left: ${(p: { $alignStart?: boolean }) => (p.$alignStart ? '0' : 'auto')};
    margin-top: 4px;
    background: var(--vscode-menu-background);
    border: 1px solid var(--vscode-menu-border);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 10004;
    min-width: 200px;
    padding: 4px;
    overflow: hidden;
`;

const MenuItem = styled.div`
    padding: 6px 12px;
    cursor: pointer;
    font-size: 13px;
    line-height: 18px;
    color: var(--vscode-foreground);
    border-radius: 3px;
    transition: background 0.1s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    
    &:hover {
        background: var(--vscode-list-hoverBackground);
    }
`;

const ComponentGroups = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 32px;
    text-align: center;
    border: 1px dashed var(--vscode-panel-border);
    border-radius: 4px;
    background: var(--vscode-editorWidget-background);
`;

const EmptyIcon = styled.div`
    font-size: 32px;
    color: var(--vscode-icon-foreground);
    opacity: 0.4;
    margin-bottom: 12px;
`;

const EmptyText = styled.div`
    font-size: 14px;
    font-weight: 500;
    color: var(--vscode-foreground);
    margin-bottom: 6px;
`;

const EmptyStateMenuAnchor = styled.div`
    position: relative;
    display: inline-block;
`;

const EmptySubtext = styled.div`
    font-size: 12px;
    line-height: 16px;
    color: var(--vscode-descriptionForeground);
    opacity: 0.8;
    max-width: 300px;
    margin-bottom: 20px;
    display: block;
    margin-left: auto;
    margin-right: auto;
`;

export const ComponentsSection: React.FC<ComponentsSectionProps> = ({
    components,
    validationData,
    onComponentClick,
    onComponentRemove,
    onAddComponent,
    onAddComponentType
}) => {
    const isAIAvailable = useAIAvailability();
    // AI Prompt hook
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openAIChat',
            data: { context, prompt }
        });
    });

    // Flatten all components into a grouped list
    const componentGroups: Array<{ type: ComponentType; items: ComponentItem[] }> = [];
    
    const componentTypes: ComponentType[] = ['schemas', 'parameters', 'headers', 'requestBodies', 'responses', 'securitySchemes', 'examples', 'links', 'callbacks'];
    
    if (components) {
        componentTypes.forEach((type) => {
            const items = components[type];
            if (items && Object.keys(items).length > 0) {
                componentGroups.push({
                    type,
                    items: Object.entries(items).map(([name, data]) => ({
                        type,
                        name,
                        data
                    }))
                });
            }
        });
    }

    const totalComponents = componentGroups.reduce((sum, group) => sum + group.items.length, 0);
    const [isExpanded, setIsExpanded] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
        componentGroups.reduce((acc, group) => ({ ...acc, [group.type]: true }), {})
    );
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [showEmptyStateMenu, setShowEmptyStateMenu] = useState(false);
    const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());

    const menuRef = useRef<HTMLDivElement>(null);
    const emptyStateMenuRef = useRef<HTMLDivElement>(null);

    const toggleGroup = (type: ComponentType) => {
        setExpandedGroups(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const allComponentTypes: ComponentType[] = ['schemas', 'parameters', 'headers', 'requestBodies', 'responses', 'securitySchemes', 'examples', 'links', 'callbacks'];

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowAddMenu(false);
            }
            if (emptyStateMenuRef.current && !emptyStateMenuRef.current.contains(event.target as Node)) {
                setShowEmptyStateMenu(false);
            }
        };

        if (showAddMenu || showEmptyStateMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAddMenu, showEmptyStateMenu]);

    return (
        <Section>
            <SectionHeader onClick={() => setIsExpanded(!isExpanded)}>
                <SectionHeaderLeft>
                    <Codicon 
                        name={isExpanded ? 'chevron-down' : 'chevron-right'} 
                        sx={{ fontSize: '14px', color: 'var(--vscode-foreground)', opacity: 0.7 }} 
                    />
                    <Codicon name="symbol-class" sx={{ fontSize: '16px', opacity: 0.8 }} />
                    <SectionTitle>Components</SectionTitle>
                    <SectionCount>{totalComponents}</SectionCount>
                </SectionHeaderLeft>
                <AddButtonWrapper ref={menuRef}>
                    <AIButton
                        
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            showPrompt(
                                JSON.stringify({ components }),
                                '/components',
                                'Add a new reusable component (schema, parameter, response, etc.)',
                                'Add Component with AI',
                                'Describe the component you want to add/edit...',
                                e
                            );
                        }}
                        title="Edit Component with AI"
                    />
                    <Button 
                        appearance="icon" 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onAddComponentType) {
                                onAddComponentType();
                            } else {
                                setShowAddMenu(!showAddMenu);
                                setShowEmptyStateMenu(false);
                            }
                        }} 
                        tooltip="Add Component Type"
                    >
                        <Codicon name="add" sx={{ fontSize: '16px' }} />
                    </Button>
                    {showAddMenu && !onAddComponentType && (
                        <MenuDropdown onClick={(e) => e.stopPropagation()}>
                            {allComponentTypes.map((type) => (
                                <MenuItem
                                    key={type}
                                    onClick={() => {
                                        onAddComponent(type);
                                        setShowAddMenu(false);
                                    }}
                                >
                                    <Codicon 
                                        name={getComponentTypeIcon(type)} 
                                        sx={{ fontSize: '14px', opacity: 0.8 }} 
                                    />
                                    {getComponentTypeLabel(type)}
                                </MenuItem>
                            ))}
                        </MenuDropdown>
                    )}
                </AddButtonWrapper>
            </SectionHeader>
            {isExpanded && (
                <>
                    {componentGroups.length > 0 ? (
                        <ComponentGroups>
                        {componentGroups.map((group) => (
                                <ComponentTypeGroup
                                    key={group.type}
                                    type={group.type}
                                    items={group.items}
                                    isExpanded={expandedGroups[group.type] || false}
                                    validationData={validationData}
                                    expandedComponents={expandedComponents}
                                    onToggle={() => toggleGroup(group.type)}
                                    onItemClick={(item) => onComponentClick(item.type, item.name, item.data)}
                                    onItemRemove={onComponentRemove}
                                    onAddComponent={onAddComponent}
                                    onAIPrompt={showPrompt}
                                    onToggleComponent={(key: string) => {
                                        setExpandedComponents(prev => {
                                            const next = new Set(prev);
                                            if (next.has(key)) {
                                                next.delete(key);
                                            } else {
                                                next.add(key);
                                            }
                                            return next;
                                        });
                                    }}
                                />
                        ))}
                        </ComponentGroups>
                    ) : (
                        <EmptyState>
                            <EmptyIcon>
                                <Codicon name="symbol-class" sx={{ fontSize: '32px' }} />
                            </EmptyIcon>
                            <EmptyText>No components defined</EmptyText>
                            <EmptySubtext>
                                Add reusable components like schemas, parameters, and responses
                            </EmptySubtext>
                            <EmptyStateMenuAnchor ref={emptyStateMenuRef}>
                                <Button 
                                    appearance="secondary" 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onAddComponentType) {
                                            onAddComponentType();
                                        } else {
                                            setShowEmptyStateMenu(!showEmptyStateMenu);
                                            setShowAddMenu(false);
                                        }
                                    }}
                                    sx={{
                                        fontSize: '13px',
                                        padding: '6px 14px'
                                    }}
                                >
                                    <Codicon name="add" sx={{ marginRight: '6px', fontSize: '14px' }} />
                                    Add Component Type
                                </Button>
                                {showEmptyStateMenu && !onAddComponentType && (
                                    <MenuDropdown
                                        $alignStart
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {allComponentTypes.map((type) => (
                                            <MenuItem
                                                key={type}
                                                onClick={() => {
                                                    onAddComponent(type);
                                                    setShowEmptyStateMenu(false);
                                                }}
                                            >
                                                <Codicon 
                                                    name={getComponentTypeIcon(type)} 
                                                    sx={{ fontSize: '14px', opacity: 0.8 }} 
                                                />
                                                {getComponentTypeLabel(type)}
                                            </MenuItem>
                                        ))}
                                    </MenuDropdown>
                                )}
                            </EmptyStateMenuAnchor>
                        </EmptyState>
                    )}
                </>
            )}
            <InlineChat />
        </Section>
    );
};
