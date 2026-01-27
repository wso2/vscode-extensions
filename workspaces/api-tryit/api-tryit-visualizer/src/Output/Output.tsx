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
import { Typography, SyntaxHighlighter } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { ResponseHeaderItem } from './ResponseHeaderItem';
import { ApiResponse } from '@wso2/api-tryit-core';

interface OutputProps {
    response?: ApiResponse;
}

const Container = styled.div`
    padding: 16px 0 16px 0;
    width: 100%;
    max-height: calc(100vh - 215px);
    overflow-y: auto;
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

const HeadersTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    background-color: var(--vscode-editor-background);
    overflow: hidden;
`;

const TableHeader = styled.thead`
    background-color: var(--vscode-tab-inactiveBackground, rgba(255, 255, 255, 0.05));
    border-bottom: 2px solid var(--vscode-panel-border);
`;

const HeaderCell = styled.th`
    color: var(--vscode-foreground);
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    font-weight: 700;
    padding: 10px 12px;
    text-align: left;
    opacity: 1;
    border-right: 2px solid var(--vscode-panel-border);
    background-color: var(--vscode-tab-inactiveBackground, rgba(255, 255, 255, 0.08));

    &:last-child {
        border-right: none;
    }
`;

const TableBody = styled.tbody``;

const EmptyHeadersState = styled.div`
    padding: 20px 12px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    font-size: 13px;
`;

const ResponseBodyContainer = styled.div`
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 12px;
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    overflow-x: auto;
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

const getLanguageFromContentType = (contentType?: string): string => {
    if (!contentType) return 'plaintext';
    
    const type = contentType.toLowerCase();
    if (type.includes('application/json') || type.includes('json')) {
        return 'json';
    } else if (type.includes('application/xml') || type.includes('text/xml') || type.includes('xml')) {
        return 'xml';
    } else if (type.includes('text/html') || type.includes('html')) {
        return 'html';
    } else if (type.includes('text/plain')) {
        return 'plaintext';
    } else if (type.includes('application/javascript') || type.includes('text/javascript')) {
        return 'javascript';
    } else if (type.includes('text/css')) {
        return 'css';
    } else if (type.includes('application/yaml') || type.includes('text/yaml')) {
        return 'yaml';
    }
    return 'plaintext';
};

const formatJson = (jsonString: string): string => {
    try {
        const parsed = JSON.parse(jsonString);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return jsonString;
    }
};

const formatXml = (xmlString: string): string => {
    try {
        // Handle XML declaration and add newlines between all tags
        let formatted = xmlString
            .replace(/\?>\s*</g, '?>\n<')  // Newline after XML declaration
            .replace(/>\s*</g, '>\n<')     // Newline between closing and opening tags
            .replace(/  +/g, ' ')           // Clean up extra spaces
            .trim();
        
        // Add proper indentation
        let indent = 0;
        let lines = formatted.split('\n');
        let result = lines.map(line => {
            line = line.trim();
            if (!line) return '';
            
            // Don't indent XML declaration
            if (line.startsWith('<?')) {
                return line;
            }
            
            // Decrease indent for closing tags
            if (line.startsWith('</')) {
                indent = Math.max(0, indent - 1);
            }
            
            let indented = '  '.repeat(indent) + line;
            
            // Increase indent for opening tags (but not self-closing or complete inline elements)
            if (line.startsWith('<') && !line.startsWith('</') && !line.startsWith('<?') && !line.endsWith('/>') && !line.includes('</')) {
                indent++;
            }
            
            return indented;
        }).filter(line => line.length > 0).join('\n');
        
        return result;
    } catch {
        return xmlString;
    }
};

const highlightContent = (content: string, response: ApiResponse): React.ReactNode => {
    // Get content-type from response headers
    const contentTypeHeader = response.headers.find(
        h => h.key.toLowerCase() === 'content-type'
    );
    const contentType = contentTypeHeader?.value;
    const language = getLanguageFromContentType(contentType);

    let formattedCode = content;

    if (language === 'json') {
        try {
            const parsed = JSON.parse(content);
            formattedCode = JSON.stringify(parsed, null, 2);
        } catch {
            // Keep original content if JSON parsing fails
        }
    } else if (language === 'xml') {
        formattedCode = formatXml(content);
    }
    
    return (
        <SyntaxHighlighter
            sx={{ padding: 0, backgroundColor: 'transparent' }}
            code={formattedCode}
            language={language === 'plaintext' ? 'markup' : language}
        />
    );
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
                    Response Headers ({response.headers.length})
                </Typography>
                {response.headers.length > 0 ? (
                    <>
                        <HeadersTable>
                        <TableHeader>
                            <tr>
                                <HeaderCell>Header Name</HeaderCell>
                                <HeaderCell>Value</HeaderCell>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {response.headers.map((header, index) => (
                                <ResponseHeaderItem
                                    key={index}
                                    keyName={header.key}
                                    value={header.value}
                                />
                            ))}
                        </TableBody>
                    </HeadersTable>
                    </>
                ) : (
                    <EmptyHeadersState>
                        No response headers available
                    </EmptyHeadersState>
                )}
            </Section>

            {/* Response Body Section */}
            <Section>
                <Typography variant="subtitle2" sx={{ margin: '0 0 12px 0' }}>
                    Response Body
                </Typography>
                <ResponseBodyContainer>
                    {highlightContent(response.body, response)}
                </ResponseBodyContainer>
            </Section>
        </Container>
    );
};
