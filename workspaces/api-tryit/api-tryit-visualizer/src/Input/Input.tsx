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
import { CodeInput } from './CodeInput/CodeInput';
import { InputEditor } from './InputEditor/InputEditor';

type InputMode = 'code' | 'form';

interface InputProps {
    request: ApiRequest;
    onRequestChange?: (request: ApiRequest) => void;
    mode?: InputMode;
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

export const Input: React.FC<InputProps> = ({ 
    request,
    onRequestChange,
    mode = 'code'
}) => {

    // Safety check to ensure request object exists with required properties
    if (!request) {
        return <Container><Typography>Loading...</Typography></Container>;
    }

    // Code lenses for Query Parameters editor
    const queryParamsCodeLenses = React.useMemo(() => [
        {
            id: 'add-query-param',
            title: '$(add) Add Query Parameter',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                const lineCount = model.getLineCount();
                const lastLineLength = model.getLineLength(lineCount);
                const textToInsert = model.getValue() ? '\nkey=value' : 'key=value';
                
                editor.executeEdits('add-query-param', [{
                    range: {
                        startLineNumber: lineCount,
                        startColumn: lastLineLength + 1,
                        endLineNumber: lineCount,
                        endColumn: lastLineLength + 1
                    },
                    text: textToInsert
                }]);
                
                // Move cursor to the new line
                setTimeout(() => {
                    editor.setPosition({ lineNumber: model.getLineCount(), column: 1 });
                    editor.focus();
                }, 0);
            }
        },
        {
            id: 'generate-query-params',
            title: '$(wand) Generate',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                console.log('Generate query parameters');
                // Placeholder for AI generation
            }
        }
    ], []);

    // Code lenses for Headers editor
    const headersCodeLenses = React.useMemo(() => [
        {
            id: 'add-header',
            title: '$(add) Add Header',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                const lineCount = model.getLineCount();
                const lastLineLength = model.getLineLength(lineCount);
                const textToInsert = model.getValue() ? '\nContent-Type: application/json' : 'Content-Type: application/json';
                
                editor.executeEdits('add-header', [{
                    range: {
                        startLineNumber: lineCount,
                        startColumn: lastLineLength + 1,
                        endLineNumber: lineCount,
                        endColumn: lastLineLength + 1
                    },
                    text: textToInsert
                }]);
                
                // Move cursor to the new line
                setTimeout(() => {
                    editor.setPosition({ lineNumber: model.getLineCount(), column: 1 });
                    editor.focus();
                }, 0);
            }
        },
        {
            id: 'generate-headers',
            title: '$(wand) Generate',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                console.log('Generate headers');
                // Placeholder for AI generation
            }
        }
    ], []);

    // Code lenses for Body editor
    const bodyCodeLenses = React.useMemo(() => [
        {
            id: 'add-body',
            title: '$(add) Add Body',
            shouldShow: (model: any) => !model.getValue().trim(),
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                const sampleBody = '{\n  "key": "value"\n}';
                
                editor.executeEdits('add-body', [{
                    range: model.getFullModelRange(),
                    text: sampleBody
                }]);
                
                setTimeout(() => {
                    editor.setPosition({ lineNumber: 2, column: 3 });
                    editor.focus();
                }, 0);
            }
        },
        {
            id: 'format-body',
            title: '$(symbol-keyword) Format',
            shouldShow: (model: any) => {
                const value = model.getValue().trim();
                if (!value) return false;
                try {
                    JSON.parse(value);
                    return true;
                } catch {
                    return false;
                }
            },
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                try {
                    const value = model.getValue();
                    const formatted = JSON.stringify(JSON.parse(value), null, 2);
                    
                    editor.executeEdits('format-body', [{
                        range: model.getFullModelRange(),
                        text: formatted
                    }]);
                } catch (error) {
                    console.error('Failed to format JSON:', error);
                }
            }
        },
        {
            id: 'generate-body',
            title: '$(wand) Generate',
            shouldShow: (model: any) => true,
            getLineNumber: (model: any) => 1,
            onExecute: (editor: any, model: any) => {
                console.log('Generate body');
                // Placeholder for AI generation
            }
        }
    ], []);

    const addQueryParam = () => {
        const newParam: QueryParameter = {
            id: Date.now().toString(),
            key: '',
            value: ''
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
            value: ''
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

    const handleBodyChange = (value: string | undefined) => {
        const updatedRequest = {
            ...request,
            body: value || ''
        };
        onRequestChange?.(updatedRequest);
    };

    const formatQueryParameters = (params: QueryParameter[] | undefined): string => {
        if (!Array.isArray(params)) return '';
        return params
            .filter(p => p.key || p.value)
            .map(p => p.value ? `${p.key}=${p.value}` : p.key)
            .join('\n');
    };

    const formatHeaders = (headers: HeaderParameter[] | undefined): string => {
        if (!Array.isArray(headers)) return '';
        return headers
            .filter(h => h.key || h.value)
            .map(h => h.value ? `${h.key}: ${h.value}` : h.key)
            .join('\n');
    };

    const parseQueryParameters = (text: string): QueryParameter[] => {
        if (!text.trim()) return [];
        return text.split('\n')
            .filter(line => line.trim())
            .map((line, index) => {
                const [key, value] = line.split('=').map(s => s.trim());
                return {
                    id: Date.now().toString() + index,
                    key: key || '',
                    value: value || ''
                };
            });
    };

    const parseHeaders = (text: string): HeaderParameter[] => {
        if (!text.trim()) return [];
        return text.split('\n')
            .filter(line => line.trim())
            .map((line, index) => {
                const [key, value] = line.split(':').map(s => s.trim());
                return {
                    id: Date.now().toString() + index,
                    key: key || '',
                    value: value || ''
                };
            });
    };

    const handleQueryParametersChange = (value: string | undefined) => {
        const updatedRequest = {
            ...request,
            queryParameters: parseQueryParameters(value || '')
        };
        onRequestChange?.(updatedRequest);
    };

    const handleHeadersChange = (value: string | undefined) => {
        const updatedRequest = {
            ...request,
            headers: parseHeaders(value || '')
        };
        onRequestChange?.(updatedRequest);
    };

    return (
        <Container>
            {mode === 'code' ? (
                <>
                    <Typography variant="h3" sx={{ marginBottom: '16px' }}>
                        Query Parameters
                    </Typography>
                    <InputEditor
                        height='calc((100vh - 420px) / 3)'
                        onChange={handleQueryParametersChange}
                        value={formatQueryParameters(request.queryParameters)}
                        codeLenses={queryParamsCodeLenses}
                    />
                    <Typography variant="h3" sx={{ margin: '16px 0' }}>
                        Headers
                    </Typography>
                    <InputEditor
                        height='calc((100vh - 420px) / 3)'
                        onChange={handleHeadersChange}
                        value={formatHeaders(request.headers)}
                        codeLenses={headersCodeLenses}
                    />
                    <Typography variant="h3" sx={{ margin: '16px 0' }}>
                        Body
                    </Typography>
                    <InputEditor
                        height='calc((100vh - 420px) / 3)'
                        onChange={handleBodyChange}
                        value={request.body || ''}
                        codeLenses={bodyCodeLenses}
                    />
                </>
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
