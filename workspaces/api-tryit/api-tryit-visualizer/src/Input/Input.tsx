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
            .map(p => p.value ? `${p.key}: ${p.value}` : p.key)
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
                const [key, value] = line.split(':').map(s => s.trim());
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
                    />
                    <Typography variant="h3" sx={{ margin: '16px 0' }}>
                        Headers
                    </Typography>
                    <InputEditor
                        height='calc((100vh - 420px) / 3)'
                        onChange={handleHeadersChange}
                        value={formatHeaders(request.headers)}
                    />
                    <Typography variant="h3" sx={{ margin: '16px 0' }}>
                        Body
                    </Typography>
                    <InputEditor
                        height='calc((100vh - 420px) / 3)'
                        onChange={handleBodyChange}
                        value={request.body || ''}
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
