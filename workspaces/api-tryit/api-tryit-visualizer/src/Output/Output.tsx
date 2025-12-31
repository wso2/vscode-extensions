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
import { Typography } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ResponseHeaderItem } from './ResponseHeaderItem';
import { ApiResponse } from '@wso2/api-tryit-core';

interface OutputProps {
    response?: ApiResponse;
}

const Container = styled.div`
    padding: 16px 0 16px 0;
    width: 100%;
`;

const Section = styled.div`
    margin-bottom: 24px;
`;

const StatusCodeContainer = styled.div`
    margin-bottom: 20px;
`;

const StatusCode = styled.div<{ statusCode: number }>`
    display: inline-block;
    padding: 6px 0;
    // border-radius: 4px;
    font-family: var(--vscode-editor-font-family);
    font-size: 16px;
    font-weight: 600;
    color: ${props => {
        if (props.statusCode >= 200 && props.statusCode < 300) {
            return 'var(--vscode-testing-iconPassed, #73C991)';
        } else if (props.statusCode >= 300 && props.statusCode < 400) {
            return 'var(--vscode-editorWarning-foreground, #CCA700)';
        } else if (props.statusCode >= 400) {
            return 'var(--vscode-errorForeground, #F48771)';
        }
        return 'var(--vscode-foreground)';
    }};
    // color: var(--vscode-editor-background, #1e1e1e);
`;

const ResponseBodyContainer = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 12px;
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
`;

const CodeBlock = styled.pre`
    margin: 0;
    color: var(--vscode-editor-foreground);
    white-space: pre-wrap;
    word-wrap: break-word;
`;

const EmptyState = styled.div`
    padding: 40px 20px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
`;

const formatJson = (jsonString: string): string => {
    try {
        const parsed = JSON.parse(jsonString);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return jsonString;
    }
};

export const Output: React.FC<OutputProps> = ({ response }) => {
    if (!response) {
        return (
            <Container>
                <EmptyState>
                    <Typography variant="body2" sx={{ opacity: 0.6 }}>
                        Response will appear here after sending a request...
                    </Typography>
                </EmptyState>
            </Container>
        );
    }

    return (
        <Container>
            {/* Status Code Section */}
            <StatusCodeContainer>
                <Typography variant="subtitle2" sx={{ margin: '0 0 8px 0' }}>
                    Status Code
                </Typography>
                <StatusCode statusCode={response.statusCode}>
                    {response.statusCode}
                </StatusCode>
            </StatusCodeContainer>

            {/* Response Headers Section */}
            <Section>
                <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                    Response Headers
                </Typography>
                {response.headers.map((header, index) => (
                    <ResponseHeaderItem
                        key={index}
                        keyName={header.key}
                        value={header.value}
                    />
                ))}
            </Section>

            {/* Response Body Section */}
            <Section>
                <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                    Response Body
                </Typography>
                <ResponseBodyContainer>
                    <CodeBlock>{formatJson(response.body)}</CodeBlock>
                </ResponseBodyContainer>
            </Section>
        </Container>
    );
};
