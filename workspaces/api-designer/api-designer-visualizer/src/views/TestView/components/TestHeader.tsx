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

import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, Dropdown, OptionProps, Badge } from '@wso2/ui-toolkit';
import { TestEnvironment } from '@wso2/api-designer-core';

const HeaderContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--vscode-panel-border);
    gap: 16px;
    flex-shrink: 0;
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const EnvironmentGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 200px;
`;

const EnvironmentLabel = styled.label`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
`;

const BaseUrlGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    gap: 8px;
    flex: 1;
    min-width: 0;
`;

const BaseUrlLabel = styled.label`
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    white-space: nowrap;
`;

const BaseUrlInput = styled.input`
    width: 100%;
    min-width: 0;
    padding: 6px 10px;
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    color: var(--vscode-input-foreground);
    font-size: 13px;
    font-family: var(--vscode-font-family);
    
    &:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: -1px;
    }
`;

const MockServerBadge = styled(Badge)`
    font-size: 10px;
    padding: 2px 6px;
    background: var(--vscode-editorGutter-addedBackground);
    color: var(--vscode-button-foreground);
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
    
    &:hover {
        opacity: 0.8;
    }
`;

const DropdownContainer = styled.div`
    position: relative;
    display: flex;
`;

const MockServerAction = styled.div`
    cursor: pointer;
`;

const MockServerActiveBadge = styled(Badge)`
    font-size: 10px;
    padding: 2px 6px;
    background: var(--vscode-editorGutter-addedBackground);
    white-space: nowrap;
    display: flex;
    align-items: center;
`;

const RunDropdownToggleButton = styled(Button)`
    padding: 0 8px;
    min-width: auto;
    border-left: none;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
`;

const DropdownMenu = styled.div`
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 240px;
    background: var(--vscode-dropdown-background);
    border: 1px solid var(--vscode-dropdown-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    overflow: hidden;
`;

const MenuItem = styled.div<{ isSelected?: boolean }>`
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: ${(props: { isSelected?: boolean }) => props.isSelected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)'};
    background: ${(props: { isSelected?: boolean }) => props.isSelected ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'};
    transition: background 0.15s ease;
    
    &:hover {
        background: ${(props: { isSelected?: boolean }) => props.isSelected ? 'var(--vscode-list-activeSelectionBackground)' : 'var(--vscode-list-hoverBackground)'};
    }
`;

const MenuItemIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    color: var(--vscode-icon-foreground);
`;

const MenuItemText = styled.div`
    flex: 1;
`;

const MenuItemDescription = styled.div<{ isSelected?: boolean }>`
    font-size: 11px;
    color: ${(props: { isSelected?: boolean }) => props.isSelected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-descriptionForeground)'};
    opacity: ${(props: { isSelected?: boolean }) => props.isSelected ? 0.8 : 1};
    margin-top: 2px;
`;

interface TestHeaderProps {
    environments: TestEnvironment[];
    selectedEnvironment: TestEnvironment | undefined;
    onSelectEnvironment: (env: TestEnvironment | undefined) => void;
    baseUrl: string;
    onBaseUrlChange: (url: string) => void;
    mockServerUrl?: string;
    onUseMockServer?: () => void;
    onRunAll: (parallel: boolean) => void;
    isRunning: boolean;
    hasTests: boolean;
    disabled?: boolean;
    runButtonLabel?: string;
}

export const TestHeader: React.FC<TestHeaderProps> = ({
    environments,
    selectedEnvironment,
    onSelectEnvironment,
    baseUrl,
    onBaseUrlChange,
    mockServerUrl,
    onUseMockServer,
    onRunAll,
    isRunning,
    hasTests,
    disabled = false,
    runButtonLabel = 'Run All'
}) => {
    const [isRunOpen, setIsRunOpen] = useState(false);
    const [runMode, setRunMode] = useState<'sequential' | 'parallel'>('sequential');
    const runRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (runRef.current && !runRef.current.contains(event.target as Node)) {
                setIsRunOpen(false);
            }
        };

        if (isRunOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isRunOpen]);

    const environmentOptions: OptionProps[] = [
        { content: 'No Environment', value: '' },
        ...environments.map(env => ({ content: env.name, value: env.id }))
    ];

    const handleEnvironmentChange = (value: string) => {
        if (value === '') {
            onSelectEnvironment(undefined);
        } else {
            const env = environments.find(e => e.id === value);
            if (env) {
                onSelectEnvironment(env);
                if (env.baseUrl) {
                    onBaseUrlChange(env.baseUrl);
                }
            }
        }
    };

    const handleRun = () => {
        onRunAll(runMode === 'parallel');
        setIsRunOpen(false);
    };

    return (
        <HeaderContainer>
            <HeaderLeft>
                <EnvironmentGroup>
                    <EnvironmentLabel>Environment:</EnvironmentLabel>
                    <Dropdown
                        id="environment-selector"
                        items={environmentOptions}
                        value={selectedEnvironment?.id || ''}
                        onValueChange={handleEnvironmentChange}
                        disabled={disabled}
                        sx={{ minWidth: '160px' }}
                    />
                </EnvironmentGroup>

                <BaseUrlGroup>
                    <BaseUrlLabel>Base URL:</BaseUrlLabel>
                    <BaseUrlInput
                        type="text"
                        value={baseUrl}
                        onChange={(e) => onBaseUrlChange(e.target.value)}
                        placeholder="http://localhost:4010"
                        disabled={disabled}
                    />
                    {mockServerUrl && mockServerUrl !== baseUrl && onUseMockServer && (
                        <MockServerAction onClick={onUseMockServer}>
                            <MockServerBadge>
                                <Codicon name="server-process" sx={{ fontSize: '10px', marginRight: '4px' }} />
                                Use Mock Server
                            </MockServerBadge>
                        </MockServerAction>
                    )}
                    {mockServerUrl && mockServerUrl === baseUrl && (
                        <MockServerActiveBadge>
                            <Codicon name="server-process" sx={{ fontSize: '10px', marginRight: '4px' }} />
                            Mock Server Active
                        </MockServerActiveBadge>
                    )}
                </BaseUrlGroup>
            </HeaderLeft>

            <HeaderRight>
                {hasTests && (
                    <DropdownContainer ref={runRef}>
                        <Button
                            appearance="primary"
                            onClick={handleRun}
                            disabled={disabled || isRunning}
                        >
                            <Codicon name={isRunning ? "loading" : "run-all"} sx={{ marginRight: 6 }} />
                            {isRunning ? 'Running...' : runButtonLabel}
                        </Button>
                        <RunDropdownToggleButton
                            appearance="primary"
                            onClick={() => setIsRunOpen(!isRunOpen)}
                            disabled={disabled || isRunning}
                        >
                            <Codicon name={isRunOpen ? "chevron-up" : "chevron-down"} />
                        </RunDropdownToggleButton>

                        {isRunOpen && (
                            <DropdownMenu>
                                <MenuItem 
                                    isSelected={runMode === 'sequential'}
                                    onClick={() => {
                                        setRunMode('sequential');
                                        handleRun();
                                    }}
                                >
                                    <MenuItemIcon>
                                        <Codicon name="list-ordered" />
                                    </MenuItemIcon>
                                    <MenuItemText>
                                        <div>Run Sequential</div>
                                        <MenuItemDescription isSelected={runMode === 'sequential'}>
                                            Execute tests one by one
                                        </MenuItemDescription>
                                    </MenuItemText>
                                    {runMode === 'sequential' && (
                                        <Codicon name="check" />
                                    )}
                                </MenuItem>
                                <MenuItem 
                                    isSelected={runMode === 'parallel'}
                                    onClick={() => {
                                        setRunMode('parallel');
                                        handleRun();
                                    }}
                                >
                                    <MenuItemIcon>
                                        <Codicon name="layers" />
                                    </MenuItemIcon>
                                    <MenuItemText>
                                        <div>Run Parallel</div>
                                        <MenuItemDescription isSelected={runMode === 'parallel'}>
                                            Execute tests simultaneously
                                        </MenuItemDescription>
                                    </MenuItemText>
                                    {runMode === 'parallel' && (
                                        <Codicon name="check" />
                                    )}
                                </MenuItem>
                            </DropdownMenu>
                        )}
                    </DropdownContainer>
                )}
            </HeaderRight>
        </HeaderContainer>
    );
};

