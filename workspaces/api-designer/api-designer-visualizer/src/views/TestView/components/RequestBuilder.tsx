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

import React from 'react';
import styled from '@emotion/styled';
import { Button, Codicon, TextField, Dropdown, OptionProps } from '@wso2/ui-toolkit';
import { TestRequest, HttpMethod, TestParameter } from '@wso2/api-designer-core';
import { VariableExtractorEditor } from './VariableExtractorEditor';

const BuilderContainer = styled.div`
    background: var(--vscode-editor-background);
    padding: 16px 20px;
`;

const RequestLine = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const MethodSelect = styled.div`
    min-width: 120px;
`;

const UrlInput = styled.div`
    flex: 1;
`;

const TabContainer = styled.div`
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--vscode-panel-border);
`;

const TabList = styled.div`
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

interface TabButtonProps {
    active: boolean;
}

const TabButton = styled.button<TabButtonProps>`
    padding: 8px 16px;
    background: ${(props: TabButtonProps) => props.active ? 'var(--vscode-tab-activeBackground)' : 'transparent'};
    border: none;
    border-bottom: 2px solid ${(props: TabButtonProps) => props.active ? 'var(--vscode-focusBorder)' : 'transparent'};
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 13px;
    
    &:hover {
        background: var(--vscode-tab-hoverBackground);
    }
`;

const ParamsTable = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ParamRow = styled.div`
    display: grid;
    grid-template-columns: 30px 1fr 1fr 40px;
    gap: 8px;
    align-items: center;
`;

const HeaderRow = styled.div`
    display: grid;
    grid-template-columns: 30px 1fr 1fr 40px;
    gap: 8px;
    align-items: center;
`;

const AddButton = styled.button`
    padding: 8px 12px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-button-border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    
    &:hover {
        background: var(--vscode-button-secondaryHoverBackground);
    }
`;

const DeleteButton = styled.button`
    background: transparent;
    border: none;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
        color: var(--vscode-errorForeground);
    }
`;

const EmptyStateText = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
    padding: 16px;
    text-align: center;
`;

const AccentCheckbox = styled.input`
    accent-color: var(--vscode-button-background);
`;

const BodyEditor = styled.textarea`
    width: 100%;
    min-height: 200px;
    padding: 12px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    resize: vertical;
    
    &:focus {
        outline: none;
        border-color: var(--vscode-focusBorder);
    }
`;

interface RequestBuilderProps {
    request: TestRequest;
    onRequestChange: (request: TestRequest) => void;
    onExecute: () => void;
    isExecuting: boolean;
}

const methods: OptionProps[] = [
    { content: 'GET', value: 'GET' },
    { content: 'POST', value: 'POST' },
    { content: 'PUT', value: 'PUT' },
    { content: 'PATCH', value: 'PATCH' },
    { content: 'DELETE', value: 'DELETE' },
    { content: 'HEAD', value: 'HEAD' },
    { content: 'OPTIONS', value: 'OPTIONS' }
];

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
    request,
    onRequestChange,
    onExecute,
    isExecuting
}) => {
    const [activeTab, setActiveTab] = React.useState<'params' | 'headers' | 'body' | 'extract'>('params');
    const [headerEntries, setHeaderEntries] = React.useState<Array<{ key: string; value: string; enabled: boolean }>>(
        Object.entries(request.headers || {}).map(([key, value]) => ({ key, value, enabled: true }))
    );

    const handleMethodChange = (value: string) => {
        onRequestChange({ ...request, method: value as HttpMethod });
    };

    const handlePathChange = (value: string) => {
        onRequestChange({ ...request, path: value });
    };

    const handleBodyChange = (value: string) => {
        onRequestChange({ ...request, body: value });
    };

    const handleAddParam = () => {
        const newParams = [...(request.parameters || [])];
        newParams.push({ name: '', value: '', in: 'query', type: 'query' } as TestParameter);
        onRequestChange({ ...request, parameters: newParams });
    };

    const handleDeleteParam = (index: number) => {
        const newParams = [...(request.parameters || [])];
        newParams.splice(index, 1);
        onRequestChange({ ...request, parameters: newParams });
    };

    const handleParamChange = (index: number, field: 'name' | 'value', value: string) => {
        const newParams = [...(request.parameters || [])];
        newParams[index] = { ...newParams[index], [field]: value };
        onRequestChange({ ...request, parameters: newParams });
    };

    const handleAddHeader = () => {
        setHeaderEntries([...headerEntries, { key: '', value: '', enabled: true }]);
    };

    const handleDeleteHeader = (index: number) => {
        const newHeaders = headerEntries.filter((_, i) => i !== index);
        setHeaderEntries(newHeaders);
        updateRequestHeaders(newHeaders);
    };

    const handleHeaderChange = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
        const newHeaders = [...headerEntries];
        if (field === 'enabled') {
            newHeaders[index].enabled = value as boolean;
        } else {
            newHeaders[index][field] = value as string;
        }
        setHeaderEntries(newHeaders);
        updateRequestHeaders(newHeaders);
    };

    const updateRequestHeaders = (headers: Array<{ key: string; value: string; enabled: boolean }>) => {
        const headersObj: Record<string, string> = {};
        headers.forEach(h => {
            if (h.enabled && h.key.trim()) {
                headersObj[h.key] = h.value;
            }
        });
        onRequestChange({ ...request, headers: headersObj });
    };

    // Sync headerEntries when request changes externally
    React.useEffect(() => {
        const entries = Object.entries(request.headers || {}).map(([key, value]) => ({ 
            key, 
            value, 
            enabled: true 
        }));
        setHeaderEntries(entries);
    }, [request.id]); // Only update when request ID changes (different request selected)

    return (
        <BuilderContainer>
            <RequestLine>
                <MethodSelect>
                    <Dropdown
                        id="method-selector"
                        items={methods}
                        value={request.method}
                        onValueChange={handleMethodChange}
                    />
                </MethodSelect>
                <UrlInput>
                    <TextField
                        value={request.path}
                        onChange={(e) => handlePathChange(e.target.value)}
                        placeholder="/api/endpoint"
                    />
                </UrlInput>
                <Button
                    appearance="primary"
                    onClick={onExecute}
                    disabled={isExecuting}
                >
                    {isExecuting ? (
                        <>
                            <Codicon name="loading" sx={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />
                            Sending...
                        </>
                    ) : (
                        <>
                            <Codicon name="play" sx={{ marginRight: 6 }} />
                            Send
                        </>
                    )}
                </Button>
            </RequestLine>

            <TabContainer>
                <TabList>
                    <TabButton active={activeTab === 'params'} onClick={() => setActiveTab('params')}>
                        Params {request.parameters.length > 0 && `(${request.parameters.length})`}
                    </TabButton>
                    <TabButton active={activeTab === 'headers'} onClick={() => setActiveTab('headers')}>
                        Headers {Object.keys(request.headers).length > 0 && `(${Object.keys(request.headers).length})`}
                    </TabButton>
                    <TabButton active={activeTab === 'body'} onClick={() => setActiveTab('body')}>
                        Body
                    </TabButton>
                    <TabButton active={activeTab === 'extract'} onClick={() => setActiveTab('extract')}>
                        Extract Variables
                    </TabButton>
                </TabList>

                {activeTab === 'params' && (
                    <div>
                        <ParamsTable>
                            {request.parameters.length === 0 ? (
                                <EmptyStateText>
                                    No parameters defined. Click "Add Parameter" to add one.
                                </EmptyStateText>
                            ) : (
                                request.parameters.map((param, index) => (
                                    <ParamRow key={index}>
                                        <AccentCheckbox
                                            type="checkbox"
                                            checked={true}
                                            disabled
                                        />
                                        <TextField
                                            value={param.name}
                                            onChange={(e) => handleParamChange(index, 'name', e.target.value)}
                                            placeholder="Key"
                                        />
                                        <TextField
                                            value={param.value}
                                            onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                                            placeholder="Value"
                                        />
                                        <DeleteButton
                                            onClick={() => handleDeleteParam(index)}
                                            title="Delete parameter"
                                        >
                                            <Codicon name="trash" />
                                        </DeleteButton>
                                    </ParamRow>
                                ))
                            )}
                        </ParamsTable>
                        <AddButton onClick={handleAddParam}>
                            <Codicon name="add" />
                            Add Parameter
                        </AddButton>
                    </div>
                )}

                {activeTab === 'headers' && (
                    <div>
                        <ParamsTable>
                            {headerEntries.length === 0 ? (
                                <EmptyStateText>
                                    No headers defined. Click "Add Header" to add one.
                                </EmptyStateText>
                            ) : (
                                headerEntries.map((header, index) => (
                                    <HeaderRow key={index}>
                                        <AccentCheckbox
                                            type="checkbox"
                                            checked={header.enabled}
                                            onChange={(e) => handleHeaderChange(index, 'enabled', e.target.checked)}
                                        />
                                        <TextField
                                            value={header.key}
                                            onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                                            placeholder="Header name (e.g., Authorization)"
                                        />
                                        <TextField
                                            value={header.value}
                                            onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                                            placeholder="Header value"
                                        />
                                        <DeleteButton
                                            onClick={() => handleDeleteHeader(index)}
                                            title="Delete header"
                                        >
                                            <Codicon name="trash" />
                                        </DeleteButton>
                                    </HeaderRow>
                                ))
                            )}
                        </ParamsTable>
                        <AddButton onClick={handleAddHeader}>
                            <Codicon name="add" />
                            Add Header
                        </AddButton>
                    </div>
                )}

                {activeTab === 'body' && (
                    <BodyEditor
                        value={request.body || ''}
                        onChange={(e) => handleBodyChange(e.target.value)}
                        placeholder="Request body (JSON, XML, etc.)"
                    />
                )}
                
                {activeTab === 'extract' && (
                    <VariableExtractorEditor
                        extractions={request.extractVariables || []}
                        onChange={(extractions) => 
                            onRequestChange({ ...request, extractVariables: extractions })
                        }
                    />
                )}
            </TabContainer>
        </BuilderContainer>
    );
};

