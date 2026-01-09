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
    padding: 16px 0 16px 0;
`;

const Section = styled.div`
    margin-bottom: 24px;
`;

const AddButtonWrapper = styled.div`
    margin-top: 8px;
`;

const ModeToggleContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 16px;
    gap: 8px;
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

type InputMode = 'code' | 'form';

export const Input: React.FC<InputProps> = ({ 
    request,
    onRequestChange
}) => {
    const [mode, setMode] = useState<InputMode>('code');

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
            {/* Mode Toggle */}
            <ModeToggleContainer>
                <ModeButton 
                    isActive={mode === 'code'} 
                    onClick={() => setMode('code')}
                    title="Code mode - edit as text"
                >
                    <Codicon name="code" />
                    Code
                </ModeButton>
                <ModeButton 
                    isActive={mode === 'form'} 
                    onClick={() => setMode('form')}
                    title="Form mode - structured editor"
                >
                    <Codicon name="list-unordered" />
                    Form
                </ModeButton>
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
                            sx={{ width: '100%' }}
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
