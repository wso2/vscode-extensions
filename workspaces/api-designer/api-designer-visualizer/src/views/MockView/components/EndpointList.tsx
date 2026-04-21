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
import styled from '@emotion/styled';
import { Button, Codicon, SearchBox } from '@wso2/ui-toolkit';
import { getMethodColor } from '../../../utils/formUtils';

const ListContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ListHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
`;

const ListTitle = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-weight: 600;
`;

const SearchContainer = styled.div`
    margin-bottom: 12px;
`;

const PathItem = styled.div`
    padding: 0;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-sideBar-border);
    border-radius: 4px;
    margin-bottom: 4px;
    overflow: hidden;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    position: relative;
    
    &:last-child {
        margin-bottom: 0;
    }
    
    &:hover {
        .endpoint-actions {
            opacity: 1;
        }
    }
`;

const PathHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    cursor: pointer;
    position: relative;
    
    &:focus-visible {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: -2px;
    }
`;

const MethodBadge = styled.span<{ method: string }>`
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    padding: 3px 8px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    min-width: 55px;
    text-align: center;
    background-color: ${(props: { method: string }) => getMethodColor(props.method)};
    color: #ffffff;
    flex-shrink: 0;
`;

const PathText = styled.div`
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    color: var(--vscode-sideBar-foreground);
    flex: 1;
    word-break: break-all;
`;

const EndpointActions = styled.div`
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    align-items: center;
    opacity: 0;
    transition: opacity 0.15s ease;
    z-index: 1;
`;

const EmptyState = styled.div`
    padding: 24px;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    font-size: 13px;
`;

interface Endpoint {
    method: string;
    path: string;
}

interface EndpointListProps {
    endpoints: Endpoint[];
    baseUrl?: string;
    onCopyUrl?: (url: string) => void;
}

export const EndpointList: React.FC<EndpointListProps> = ({
    endpoints,
    baseUrl,
    onCopyUrl,
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredEndpoints = React.useMemo(() => {
        if (!searchQuery) return endpoints;
        const query = searchQuery.toLowerCase();
        return endpoints.filter(ep => 
            ep.method.toLowerCase().includes(query) ||
            ep.path.toLowerCase().includes(query)
        );
    }, [endpoints, searchQuery]);

    const handleCopyUrl = (endpoint: Endpoint) => {
        if (baseUrl && onCopyUrl) {
            const url = `${baseUrl}${endpoint.path}`;
            onCopyUrl(url);
        }
    };

    if (endpoints.length === 0) {
        return (
            <EmptyState>
                <Codicon name="info" sx={{ fontSize: 16, marginBottom: 8 }} />
                <div>No endpoints available</div>
            </EmptyState>
        );
    }

    return (
        <ListContainer>
            <ListHeader>
                <ListTitle>Available Endpoints ({filteredEndpoints.length})</ListTitle>
            </ListHeader>
            
            {endpoints.length > 5 && (
                <SearchContainer>
                    <SearchBox
                        placeholder="Search endpoints..."
                        value={searchQuery}
                        onChange={(value) => setSearchQuery(value)}
                    />
                </SearchContainer>
            )}
            
            {filteredEndpoints.map((endpoint, index) => (
                <PathItem key={index}>
                    <PathHeader>
                        <MethodBadge method={endpoint.method}>
                            {endpoint.method}
                        </MethodBadge>
                        <PathText>{endpoint.path}</PathText>
                        {baseUrl && (
                            <EndpointActions className="endpoint-actions">
                                <Button
                                    appearance="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyUrl(endpoint);
                                    }}
                                    tooltip="Copy URL"
                                >
                                    <Codicon name="copy" />
                                </Button>
                            </EndpointActions>
                        )}
                    </PathHeader>
                </PathItem>
            ))}
        </ListContainer>
    );
};
