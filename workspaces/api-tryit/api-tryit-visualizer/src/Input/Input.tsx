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

import React, { useState } from 'react';
import { Typography, LinkButton, Codicon, Button } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ParamItem } from './ParamItem';
import { QueryParameter, HeaderParameter, ApiRequest } from '@wso2/api-tryit-core';
import { CodeTextArea } from '../Components/CodeTextArea/CodeTextArea';
import { CodeInput } from './CodeInput';

interface InputProps {
    request: ApiRequest;
    onRequestChange?: (request: ApiRequest) => void;
}

const Container = styled.div`
    width: 100%;
`;

const Section = styled.div`
    margin-bottom: 12px;
`;

const AddButtonWrapper = styled.div`
    margin-top: 4px;
    margin-left: 4px;
`;

const ModeToggleContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 16px;
    gap: 8px;
`;

const ToggleButton = styled.button<{ isCodeMode: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border: 1px solid var(--vscode-panel-border);
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    font-size: 12px;
    border-radius: 4px;
    transition: all 0.2s ease;
    
    &:hover {
        background-color: var(--vscode-button-hoverBackground);
        color: var(--vscode-button-foreground);
    }
    
    .toggle-text {
        font-weight: 500;
    }
`;

const HelpButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    
    &:hover {
        background: var(--vscode-toolbar-hoverBackground);
        color: var(--vscode-foreground);
    }
    
    .codicon {
        font-size: 16px;
    }
`;

const HelpTooltip = styled.div<{ show: boolean }>`
    display: ${props => props.show ? 'block' : 'none'};
    position: absolute;
    top: 32px;
    right: 0;
    width: 350px;
    padding: 12px 16px;
    background: var(--vscode-editorHoverWidget-background);
    border: 1px solid var(--vscode-editorHoverWidget-border);
    border-radius: 6px;
    color: var(--vscode-editorHoverWidget-foreground);
    font-size: 12px;
    line-height: 1.6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    text-align: left;
    
    strong {
        color: var(--vscode-textLink-activeForeground);
        font-weight: 600;
    }
`;

const CodeHint = styled.code`
    background-color: var(--vscode-textCodeBlock-background);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);
    font-size: 11px;
    font-weight: 500;
    border: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.2));
    color: var(--vscode-textPreformat-foreground);
`;

const ModeButton = styled.button<{ isActive: boolean }>`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid var(--vscode-panel-border);
    background-color: ${({ isActive }) => 
        isActive ? 'var(--vscode-button-background)' : 'var(--vscode-editor-background)'};
    color: ${({ isActive }) => 
        isActive ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)'};
    cursor: pointer;
    font-size: 12px;
    border-radius: 4px;
    transition: all 0.15s ease;
    
    &:hover {
        background-color: ${({ isActive }) => 
            isActive ? 'var(--vscode-button-hoverBackground)' : 'var(--vscode-list-hoverBackground)'};
    }
    
    &:first-of-type {
        border-radius: 4px 0 0 4px;
        border-right: none;
    }
    
    &:last-of-type {
        border-radius: 0 4px 4px 0;
    }
`;

const SlidingToggle = styled.div<{ isCodeMode: boolean }>`
    position: relative;
    display: flex;
    width: 140px;
    height: 32px;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 16px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.2s ease;
`;

const ToggleBackground = styled.div<{ isCodeMode: boolean }>`
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 100%;
    background-color: var(--vscode-button-background);
    border-radius: 15px;
    transition: transform 0.2s ease;
    transform: translateX(${({ isCodeMode }) => isCodeMode ? '0%' : '100%'});
`;

const ToggleOption = styled.div<{ isActive: boolean }>`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
    color: ${({ isActive }) => 
        isActive ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)'};
    z-index: 1;
    transition: color 0.2s ease;
    user-select: none;
`;

type InputMode = 'code' | 'form';

export const Input: React.FC<InputProps> = ({ 
    request,
    onRequestChange
}) => {
    const [mode, setMode] = useState<InputMode>('code');
    const [showHelp, setShowHelp] = useState(false);

    // Safety check to ensure request object exists with required properties
    if (!request) {
        return <Container><Typography>Loading...</Typography></Container>;
    }

    const addQueryParam = () => {
        const newParam: QueryParameter = {
            id: Date.now().toString(),
            key: '',
            value: '',
            enabled: true
        };
        const updatedRequest = {
            ...request,
            queryParameters: [...(request.queryParameters || []), newParam]
        };
        onRequestChange?.(updatedRequest);
    };

    const updateQueryParam = (id: string, key: string, value: string) => {
        const updatedRequest = {
            ...request,
            queryParameters: (request.queryParameters || []).map(param =>
                param.id === id ? { ...param, key, value } : param
            )
        };
        onRequestChange?.(updatedRequest);
    };

    const deleteQueryParam = (id: string) => {
        const updatedRequest = {
            ...request,
            queryParameters: (request.queryParameters || []).filter(param => param.id !== id)
        };
        onRequestChange?.(updatedRequest);
    };

    const addHeader = () => {
        const newHeader: HeaderParameter = {
            id: Date.now().toString(),
            key: '',
            value: '',
            enabled: true
        };
        const updatedRequest = {
            ...request,
            headers: [...(request.headers || []), newHeader]
        };
        onRequestChange?.(updatedRequest);
    };

    const updateHeader = (id: string, key: string, value: string) => {
        const updatedRequest = {
            ...request,
            headers: (request.headers || []).map(header =>
                header.id === id ? { ...header, key, value } : header
            )
        };
        onRequestChange?.(updatedRequest);
    };

    const deleteHeader = (id: string) => {
        const updatedRequest = {
            ...request,
            headers: (request.headers || []).filter(header => header.id !== id)
        };
        onRequestChange?.(updatedRequest);
    };

    const handleBodyChange = (value: string) => {
        const updatedRequest = {
            ...request,
            body: value
        };
        onRequestChange?.(updatedRequest);
    };

    return (
        <Container>
            {/* Mode Toggle and Help */}
            <ModeToggleContainer>
                {mode === 'code' && (
                    <HelpButton
                        onMouseEnter={() => setShowHelp(true)}
                        onMouseLeave={() => setShowHelp(false)}
                        onClick={() => setShowHelp(!showHelp)}
                        title="Show help"
                    >
                        <Codicon sx={{height: 'unset', width: 'unset'}} iconSx={{fontSize: 24, marginTop: 4}} name="question" />
                        <HelpTooltip show={showHelp}>
                            <strong>Write your request with auto-completions:</strong><br/>
                            • <CodeHint>key=value</CodeHint> for query parameters<br/>
                            • <CodeHint>Header-Name: value</CodeHint> for headers<br/>
                            • Prefix with <CodeHint>//</CodeHint> to disable a line<br/>
                            • Press <CodeHint>Cmd+Space</CodeHint> or <CodeHint>Cmd+/</CodeHint> for suggestions
                        </HelpTooltip>
                    </HelpButton>
                )}
                <SlidingToggle 
                    isCodeMode={mode === 'code'}
                    onClick={() => setMode(mode === 'code' ? 'form' : 'code')}
                    title={mode === 'code' ? 'Switch to Form mode' : 'Switch to Code mode'}
                >
                    <ToggleBackground isCodeMode={mode === 'code'} />
                    <ToggleOption isActive={mode === 'code'}>
                        <Codicon name="code" />
                        Code
                    </ToggleOption>
                    <ToggleOption isActive={mode === 'form'}>
                        <Codicon name="list-unordered" />
                        Form
                    </ToggleOption>
                </SlidingToggle>
            </ModeToggleContainer>

            {mode === 'code' ? (
                <CodeInput request={request} onRequestChange={onRequestChange} />
            ) : (
                <>
                    {/* Query Parameters Section */}
                    <Section>
                        <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                            Query Parameter
                        </Typography>
                        {(request.queryParameters || []).map(param => (
                            <ParamItem
                                key={param.id}
                                keyValue={param.key}
                                value={param.value}
                                onKeyChange={(key) => updateQueryParam(param.id, key, param.value)}
                                onValueChange={(value) => updateQueryParam(param.id, param.key, value)}
                                onDelete={() => deleteQueryParam(param.id)}
                            />
                        ))}
                        <AddButtonWrapper>
                            <LinkButton onClick={addQueryParam}>
                                <Codicon name="add" />
                                Query Parameter
                            </LinkButton>
                        </AddButtonWrapper>
                    </Section>

                    {/* Headers Section */}
                    <Section>
                        <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                            Header
                        </Typography>
                        {(request.headers || []).map(header => (
                            <ParamItem
                                key={header.id}
                                keyValue={header.key}
                                value={header.value}
                                onKeyChange={(key) => updateHeader(header.id, key, header.value)}
                                onValueChange={(value) => updateHeader(header.id, header.key, value)}
                                onDelete={() => deleteHeader(header.id)}
                            />
                        ))}
                        <AddButtonWrapper>
                            <LinkButton onClick={addHeader}>
                                <Codicon name="add" />
                                Header
                            </LinkButton>
                        </AddButtonWrapper>
                    </Section>

                    {/* Body Section */}
                    <Section>
                        <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                            Body
                        </Typography>
                        <CodeTextArea
                            id="body-textarea"
                            resize="vertical"
                            growRange={{ start: 5, offset: 10 }}
                            sx={{ width: '100%', padding: '0 4px' }}
                            value={request.body || ''}
                            onChange={(e: any) => handleBodyChange(e.target.value)}
                            placeholder="Enter request body..."
                        />
                    </Section>
                </>
            )}
        </Container>
    );
};
