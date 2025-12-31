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
import { Typography, LinkButton, Codicon, TextArea } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ParamItem } from './ParamItem';
import { QueryParameter, HeaderParameter } from './Types';
import { CodeTextArea } from '../Components/CodeTextArea/CodeTextArea';

interface InputProps {
    onQueryParamsChange?: (params: QueryParameter[]) => void;
    onHeadersChange?: (headers: HeaderParameter[]) => void;
    onBodyChange?: (body: string) => void;
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

export const Input: React.FC<InputProps> = ({ 
    onQueryParamsChange,
    onHeadersChange,
    onBodyChange 
}) => {
    const [queryParams, setQueryParams] = useState<QueryParameter[]>([]);
    const [headers, setHeaders] = useState<HeaderParameter[]>([
        {
            id: '1',
            key: 'Content-Type',
            value: 'application/json',
            enabled: true
        }
    ]);
    const [body, setBody] = useState<string>('{\n  "currency": "usd",\n  "coin": "bitcoin"\n}');

    const addQueryParam = () => {
        const newParam: QueryParameter = {
            id: Date.now().toString(),
            key: '',
            value: '',
            enabled: true
        };
        const updatedParams = [...queryParams, newParam];
        setQueryParams(updatedParams);
        onQueryParamsChange?.(updatedParams);
    };

    const updateQueryParam = (id: string, key: string, value: string) => {
        const updatedParams = queryParams.map(param =>
            param.id === id ? { ...param, key, value } : param
        );
        setQueryParams(updatedParams);
        onQueryParamsChange?.(updatedParams);
    };

    const deleteQueryParam = (id: string) => {
        const updatedParams = queryParams.filter(param => param.id !== id);
        setQueryParams(updatedParams);
        onQueryParamsChange?.(updatedParams);
    };

    const addHeader = () => {
        const newHeader: HeaderParameter = {
            id: Date.now().toString(),
            key: '',
            value: '',
            enabled: true
        };
        const updatedHeaders = [...headers, newHeader];
        setHeaders(updatedHeaders);
        onHeadersChange?.(updatedHeaders);
    };

    const updateHeader = (id: string, key: string, value: string) => {
        const updatedHeaders = headers.map(header =>
            header.id === id ? { ...header, key, value } : header
        );
        setHeaders(updatedHeaders);
        onHeadersChange?.(updatedHeaders);
    };

    const deleteHeader = (id: string) => {
        const updatedHeaders = headers.filter(header => header.id !== id);
        setHeaders(updatedHeaders);
        onHeadersChange?.(updatedHeaders);
    };

    const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setBody(e.target.value);
        onBodyChange?.(e.target.value);
    };

    return (
        <Container>
            {/* Query Parameters Section */}
            <Section>
                <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                    Query Parameter
                </Typography>
                {queryParams.map(param => (
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
                {headers.map(header => (
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
                    value={body}
                    onChange={handleBodyChange}
                    placeholder="Enter request body..."
                />
            </Section>
        </Container>
    );
};
