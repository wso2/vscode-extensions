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

import React, { ReactNode } from 'react';
import styled from '@emotion/styled';

export interface TabView {
    id: string;
    name: string;
    icon?: React.ReactNode;
}

export interface TabPanelProps {
    views: TabView[];
    currentViewId: string;
    onViewChange: (tabId: string) => void;
    children: ReactNode;
    childrenSx?: React.CSSProperties;
}

const TabContainer = styled.div`
    display: flex;
    border-bottom: 1px solid var(--vscode-editorIndentGuide-background, #e0e0e0);
    background-color: var(--vscode-editorGroupHeader-tabsBackground, #f3f3f3);
    width: 100%;
    min-height: 35px;
    overflow: hidden;
    box-shadow: inset 0 -1px 0 var(--vscode-editorGroup-border, #e7e7e7);
`;

const TabButton = styled.button<{ isActive: boolean }>`
    flex: 1;
    padding: 10px 16px;
    border: none;
    background-color: ${(props: { isActive: boolean }) => props.isActive
        ? 'var(--vscode-tab-activeBackground, #ffffff)'
        : 'var(--vscode-tab-inactiveBackground, #ececec)'};
    color: var(--vscode-tab-activeForeground, #333333);
    border-right: 1px solid var(--vscode-tab-border, #f3f3f3);
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${(props: { isActive: boolean }) => props.isActive ? '500' : '400'};
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    position: relative;
    
    /* Active tab indicator */
    ${({ isActive }: { isActive: boolean }) => isActive && `
        &:after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background-color: var(--vscode-focusBorder, #007acc);
        }
    `}

    &:hover {
        background-color: ${(props: { isActive: boolean }) => props.isActive
        ? 'var(--vscode-tab-activeBackground, #ffffff)'
        : 'var(--vscode-list-hoverBackground, #f5f5f5)'};
        color: var(--vscode-tab-activeForeground, #333333);
    }

    &:first-of-type {
        border-left: 1px solid var(--vscode-tab-border, #f3f3f3);
    }

    &:last-of-type {
        border-right: none;
    }
`;

const TabContent = styled.div`
    background-color: var(--vscode-editor-background, #ffffff);
    color: var(--vscode-editor-foreground, #333333);
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
`;

const ChildrenContainer = styled.div<{ sx?: React.CSSProperties }>`
    ${(props: { sx?: React.CSSProperties }) => props.sx || {}}
`;

export const TabPanel: React.FC<TabPanelProps> = ({
    views,
    currentViewId,
    onViewChange,
    children,
    childrenSx
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <TabContainer>
                {views.map(view => (
                    <TabButton
                        key={view.id}
                        isActive={currentViewId === view.id}
                        onClick={() => onViewChange(view.id)}
                    >
                        {view.icon}
                        {view.name}
                    </TabButton>
                ))}
            </TabContainer>
            <TabContent>
                <ChildrenContainer sx={childrenSx}>
                    {React.Children.map(children, child => {
                        if (React.isValidElement(child) && child.props.id === currentViewId) {
                            return child;
                        }
                        return null;
                    })}
                </ChildrenContainer>
            </TabContent>
        </div>
    );
};
