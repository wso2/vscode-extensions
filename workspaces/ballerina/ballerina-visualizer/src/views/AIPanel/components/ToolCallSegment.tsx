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

import { keyframes } from "@emotion/css";
import styled from "@emotion/styled";
import React, { useState } from "react";
import { Collapse } from "react-collapse";

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

export const Spinner = styled.span`
    display: inline-block;
    margin-right: 8px;
    font-size: 14px;
    animation: ${spin} 1s linear infinite;
`;

const CheckIcon = styled.span`
    display: inline-block;
    margin-right: 8px;
    font-size: 14px;
`;

const ActionButton = styled.button`
    background: transparent;
    border: none;
    color: var(--vscode-foreground);
    cursor: pointer;
    padding: 4px 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    font-size: 14px;
    margin-left: 4px;
    
    &:hover {
        background-color: var(--vscode-toolbar-hoverBackground);
    }
    
    &:active {
        background-color: var(--vscode-toolbar-activeBackground);
    }
`;

const ToolCallContainer = styled.pre`
    background-color: var(--vscode-textCodeBlock-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 8px 12px;
    margin: 8px 0;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    color: var(--vscode-editor-foreground);
    white-space: pre-wrap;
    overflow-x: auto;
`;

const ToolCallLine = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const ToolCallContent = styled.div`
    display: flex;
    align-items: center;
    flex: 1;
`;

const ActionButtonsContainer = styled.div`
    display: flex;
    align-items: center;
    margin-left: 8px;
`;

const ExpandedContent = styled.div`
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--vscode-panel-border);
`;

const JsonContainer = styled.pre`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
    padding: 8px;
    margin: 0;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    color: var(--vscode-editor-foreground);
    white-space: pre-wrap;
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
`;

const JsonLabel = styled.div`
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 4px;
    font-family: var(--vscode-editor-font-family);
`;

type CustomActionButton = {
    type: 'custom';
    icon: string;
    onClick: () => void;
    title?: string;
};

type JsonViewerActionButton = {
    type: 'json-viewer';
    data: Record<string, any>;
    label?: string;
    title?: string;
};

export type ActionButtonConfig = CustomActionButton | JsonViewerActionButton;

interface ToolCallSegmentProps {
    text: string;
    loading: boolean;
    failed?: boolean;
    actionButtons?: ActionButtonConfig[];
}

const ToolCallSegment: React.FC<ToolCallSegmentProps> = ({ text, loading, failed, actionButtons }) => {
    const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

    const toggleExpanded = (index: number) => {
        setExpandedSections((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const handleActionClick = (button: ActionButtonConfig, index: number) => {
        if (button.type === 'json-viewer') {
            toggleExpanded(index);
        } else if (button.type === 'custom') {
            button.onClick();
        }
    };

    const getActionIcon = (button: ActionButtonConfig, index: number): string => {
        if (button.type === 'json-viewer') {
            return expandedSections.has(index) ? 'codicon-chevron-down' : 'codicon-chevron-right';
        }
        return button.icon;
    };

    const renderJsonContent = (button: JsonViewerActionButton) => {
        try {
            const jsonString = JSON.stringify(button.data, null, 2);
            return (
                <ExpandedContent>
                    {button.label && <JsonLabel>{button.label}</JsonLabel>}
                    <JsonContainer>{jsonString}</JsonContainer>
                </ExpandedContent>
            );
        } catch (error) {
            return (
                <ExpandedContent>
                    <JsonContainer>Error displaying JSON: {String(error)}</JsonContainer>
                </ExpandedContent>
            );
        }
    };

    return (
        <ToolCallContainer>
            <ToolCallLine>
                <ToolCallContent>
                    {loading ? (
                        <Spinner className="codicon codicon-loading spin" role="img"></Spinner>
                    ) : (
                        <CheckIcon
                            className={`codicon ${failed ? "codicon-chrome-close" : "codicon-check"}`}
                            role="img"
                        ></CheckIcon>
                    )}
                    <span>{text}</span>
                </ToolCallContent>
                {actionButtons && actionButtons.length > 0 && (
                    <ActionButtonsContainer>
                        {actionButtons.map((button, index) => (
                            <ActionButton
                                key={index}
                                onClick={() => handleActionClick(button, index)}
                                title={button.title}
                                aria-label={button.title}
                            >
                                <span className={`codicon ${getActionIcon(button, index)}`} role="img"></span>
                            </ActionButton>
                        ))}
                    </ActionButtonsContainer>
                )}
            </ToolCallLine>
            {actionButtons && actionButtons.map((button, index) => (
                button.type === 'json-viewer' && (
                    <Collapse key={`collapse-${index}`} isOpened={expandedSections.has(index)}>
                        {renderJsonContent(button)}
                    </Collapse>
                )
            ))}
        </ToolCallContainer>
    );
};

export default ToolCallSegment;
