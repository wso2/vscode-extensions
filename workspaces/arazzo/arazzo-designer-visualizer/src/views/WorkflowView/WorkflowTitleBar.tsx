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

import { ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";
import { MODERN } from '../../constants';

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------

const TitleBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background-color: ${MODERN ? ThemeColors.SURFACE_DIM : 'var(--vscode-sideBar-background)'};
    border-bottom: 1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.2));
    flex-shrink: 0;
    z-index: 100;
    position: relative;
    min-height: 38px;
`;

const TitleName = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60%;
    letter-spacing: 0.01em;
`;

const TryButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    font-family: var(--vscode-font-family);
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    flex-shrink: 0;
    transition: background-color 0.15s ease, transform 0.1s ease;
    &:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
    &:active {
        opacity: 0.9;
        transform: scale(0.98);
    }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface WorkflowTitleBarProps {
    workflowId: string;
    onTry: () => void;
}

export function WorkflowTitleBar({ workflowId, onTry }: WorkflowTitleBarProps) {
    return (
        <TitleBar>
            <TitleName title={workflowId}>{workflowId}</TitleName>
            <TryButton onClick={onTry}>▶ Try</TryButton>
        </TitleBar>
    );
}
