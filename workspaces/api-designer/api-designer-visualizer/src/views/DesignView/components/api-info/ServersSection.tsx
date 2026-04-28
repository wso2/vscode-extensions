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
import { Button, Badge, Codicon, Typography, Divider } from '@wso2/ui-toolkit';
import { useAIPrompt } from '../../../../hooks/useAIPrompt';

import { postMessage as postVSCodeMessage } from '../../../../utils/vscode-api';

export interface Server {
    url: string;
    description?: string;
}

export interface ServersSectionProps {
    servers: Server[];
    onAddServer: () => void;
    onEditServer: (index: number) => void;
    onRemoveServer: (index: number) => void;
}

const Section = styled.div`
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 16px 18px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    margin-bottom: 20px;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const SectionHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
    
    &:hover {
        opacity: 0.9;
    }
`;

const ToggleIcon = styled.span<{ isCollapsed: boolean }>`
    display: inline-block;
    transition: transform 0.2s ease;
    transform: ${(props: { isCollapsed: boolean }) => props.isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'};
    font-size: 12px;
    color: var(--vscode-icon-foreground);
    opacity: 0.7;
`;

const SectionTitle = styled.h2`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const SectionCount = styled.span`
    font-size: 11px;
    font-weight: 400;
    font-family: var(--vscode-font-family);
    color: var(--vscode-descriptionForeground);
    margin-left: 8px;
`;

const AddButtonWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const ServerList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ServerItem = styled.div`
    padding: 12px 14px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-sideBar-border);
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    display: flex;
    align-items: center;
    gap: 12px;
    
    &:hover {
        border-color: var(--vscode-focusBorder);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        transform: translateY(-1px);
    }
    
    &:focus-visible {
        outline: 2px solid var(--vscode-focusBorder);
        outline-offset: 2px;
    }
`;

const ServerContent = styled.div`
    flex: 1;
    min-width: 0;
`;

const ServerUrl = styled.div`
    font-family: var(--vscode-editor-font-family);
    font-size: 13px;
    color: var(--vscode-textLink-foreground);
    word-break: break-all;
    margin-bottom: 4px;
    line-height: 18px;
`;

const ServerDesc = styled.div`
    font-size: 12px;
    font-family: var(--vscode-font-family);
    color: var(--vscode-descriptionForeground);
    line-height: 16px;
    opacity: 0.8;
`;

const DeleteButtonWrapper = styled.div`
    flex-shrink: 0;
    opacity: 0.6;
    transition: opacity 0.15s ease;
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
        opacity: 1;
    }
`;

const ServerInlineAIPill = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-button-border);
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 0.8;
    }
`;

export const ServersSection: React.FC<ServersSectionProps> = ({
    servers,
    onAddServer,
    onEditServer,
    onRemoveServer
}) => {
    // AI Prompt hook
    const { showPrompt, InlineChat } = useAIPrompt((context, prompt) => {
        postVSCodeMessage({
            command: 'openAIChat',
            data: { context, prompt }
        });
    });
    const [isExpanded, setIsExpanded] = useState(true);

    if (servers.length === 0) {
        return null;
    }

    return (
        <Section>
            <SectionHeader>
                <SectionHeaderLeft onClick={() => setIsExpanded(!isExpanded)}>
                    <ToggleIcon isCollapsed={!isExpanded}>▼</ToggleIcon>
                    <Codicon name="server" sx={{ fontSize: '16px', opacity: 0.8 }} />
                    <SectionTitle>Servers</SectionTitle>
                    <SectionCount>{servers.length}</SectionCount>
                </SectionHeaderLeft>
                <AddButtonWrapper>
                    <Button 
                        appearance="icon" 
                        onClick={onAddServer} 
                        tooltip="Add Server"
                    >
                        <Codicon name="add" sx={{ fontSize: '16px' }} />
                </Button>
                </AddButtonWrapper>
            </SectionHeader>
            {isExpanded && (
                <>
                    <Divider sx={{ marginBottom: '12px', opacity: 0.3 }} />
                    <ServerList>
                {servers.map((server, index) => (
                            <ServerItem
                        key={index}
                        onClick={() => onEditServer(index)}
                                role="button"
                                tabIndex={0}
                            >
                                <ServerContent>
                                    <ServerUrl>{server.url}</ServerUrl>
                                    {server.description && (
                                        <ServerDesc>{server.description}</ServerDesc>
                                    )}
                                </ServerContent>
                                <DeleteButtonWrapper>
                                    <ServerInlineAIPill
                                        onClick={(e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            showPrompt(
                                                JSON.stringify(server),
                                                `/servers[${index}]`,
                                                `Improve server: ${server.url}`,
                                                'Improve Server',
                                                'Describe how you want to improve this server...',
                                                e
                                            );
                                        }}
                                        title="Edit with AI"
                                    >
                                        <Codicon name="sparkle" sx={{ fontSize: '12px' }} />
                                        <span>Edit with AI</span>
                                    </ServerInlineAIPill>
                        <Button
                            appearance="icon"
                                        tooltip="Delete Server"
                                        onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onRemoveServer(index);
                            }}
                        >
                                        <Codicon name="trash" sx={{ fontSize: '14px' }} />
                        </Button>
                                </DeleteButtonWrapper>
                            </ServerItem>
                ))}
                    </ServerList>
                </>
            )}
            <InlineChat />
        </Section>
    );
};
