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

import React from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/css";
import { TodoItem } from "@wso2/mi-core/lib/rpc-types/agent-mode/types";

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`;

const TodoListContainer = styled.div`
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 6px;
    padding: 8px 10px;
    margin: 8px 0;
    font-family: var(--vscode-font-family);
    font-size: 12px;
`;

const TodoHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding-bottom: 6px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground);
`;

const StatusIndicator = styled.span<{ status: 'active' | 'completed' | 'pending' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    font-size: 12px;
    color: ${(props: { status: 'active' | 'completed' | 'pending' }) =>
        props.status === 'active'
            ? 'var(--vscode-testing-iconPassed)'
            : props.status === 'completed'
                ? 'var(--vscode-testing-iconPassed)'
                : 'var(--vscode-descriptionForeground)'
    };
`;

const TodoList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 180px;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: var(--vscode-scrollbarSlider-background);
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background-color: var(--vscode-scrollbarSlider-hoverBackground);
    }
`;

const TodoItemRow = styled.div<{ status: string }>`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 3px 6px;
    border-radius: 4px;
    transition: background-color 0.1s ease;
    background-color: ${(props: { status: string }) =>
        props.status === 'in_progress'
            ? 'var(--vscode-list-hoverBackground)'
            : 'transparent'
    };

    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

const CheckboxIcon = styled.span<{ status: string }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    margin-top: 1px;
    font-size: 14px;

    color: ${(props: { status: string }) =>
        props.status === 'completed'
            ? 'var(--vscode-testing-iconPassed)'
            : props.status === 'in_progress'
                ? 'var(--vscode-progressBar-background)'
                : 'var(--vscode-descriptionForeground)'
    };

    ${(props: { status: string }) =>
        props.status === 'in_progress' &&
        `animation: ${spin} 1s linear infinite;`
    }
`;

const TodoText = styled.span<{ status: string }>`
    flex: 1;
    line-height: 1.3;
    color: ${(props: { status: string }) =>
        props.status === 'completed'
            ? 'var(--vscode-disabledForeground)'
            : props.status === 'in_progress'
                ? 'var(--vscode-foreground)'
                : 'var(--vscode-foreground)'
    };
    text-decoration: ${(props: { status: string }) =>
        props.status === 'completed' ? 'line-through' : 'none'
    };
    opacity: ${(props: { status: string }) =>
        props.status === 'completed' ? 0.7 : 1
    };
`;

const TaskCount = styled.span`
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
    font-weight: 400;
`;

interface TodoListSegmentProps {
    items: TodoItem[];
    status: 'active' | 'completed' | 'pending';
}

const TodoListSegment: React.FC<TodoListSegmentProps> = ({ items, status }) => {
    const completedCount = items.filter(item => item.status === 'completed').length;
    const totalCount = items.length;

    const getIcon = (itemStatus: string) => {
        switch (itemStatus) {
            case 'completed':
                return <span className="codicon codicon-pass-filled" />;
            case 'in_progress':
                return <span className="codicon codicon-loading" />;
            default:
                return <span className="codicon codicon-circle-large-outline" />;
        }
    };

    const getHeaderIcon = () => {
        if (status === 'active') {
            return <span className="codicon codicon-tasklist" />;
        } else if (status === 'completed') {
            return <span className="codicon codicon-pass" />;
        }
        return <span className="codicon codicon-checklist" />;
    };

    return (
        <TodoListContainer>
            <TodoHeader>
                <StatusIndicator status={status}>
                    {getHeaderIcon()}
                </StatusIndicator>
                <span>Tasks</span>
                <TaskCount>({completedCount}/{totalCount})</TaskCount>
            </TodoHeader>
            <TodoList>
                {items.map((item, index) => (
                    <TodoItemRow key={index} status={item.status}>
                        <CheckboxIcon status={item.status}>
                            {getIcon(item.status)}
                        </CheckboxIcon>
                        <TodoText status={item.status}>
                            {item.status === 'in_progress' ? item.activeForm : item.content}
                        </TodoText>
                    </TodoItemRow>
                ))}
            </TodoList>
        </TodoListContainer>
    );
};

export default TodoListSegment;
