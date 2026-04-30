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

import { ThemeColors, Button, Codicon } from "@wso2/ui-toolkit";
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
    text-overflow: ellipsis;
    max-width: 100%;
    letter-spacing: 0.01em;
`;

const TryButton = styled(Button)`
    border-radius: 6px;
    border: 1px solid transparent;
    transition: border-color 0.15s ease, transform 0.1s ease, background-color 0.15s ease;
    &:hover {
        border-color: var(--vscode-focusBorder);
        background-color: rgba(255,255,255,0.05);
    }
    &:active {
        transform: scale(0.98);
    }
`;

const TitleLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
`;

const HomeButton = styled(Button)`
    border-radius: 6px;
    border: 1px solid transparent;
    flex-shrink: 0;
    transition: border-color 0.15s ease, background-color 0.15s ease;
    &:hover {
        border-color: var(--vscode-focusBorder);
        background-color: rgba(255,255,255,0.05);
    }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface WorkflowTitleBarProps {
    workflowId: string;
    onTry: () => void;
    onHome?: () => void;
}

export function WorkflowTitleBar({ workflowId, onTry, onHome }: WorkflowTitleBarProps) {
    return (
        <TitleBar>
            <TitleLeft>
                {onHome && (
                    <span title="Go to Overview">
                        <HomeButton
                            appearance="secondary"
                            buttonSx={{
                                backgroundColor: "transparent",
                                color: "var(--vscode-foreground)",
                                boxShadow: "none",
                            }}
                            onClick={onHome}
                        >
                            <Codicon name="home" />
                        </HomeButton>
                    </span>
                )}
                <TitleName title={workflowId}>{workflowId}</TitleName>
            </TitleLeft>
            <TryButton
                appearance="secondary"
                buttonSx={{
                    backgroundColor: "transparent",
                    color: "var(--vscode-foreground)",
                    border: "none",
                    boxShadow: "none",
                }}
                onClick={onTry}
            >
                ▶ Try with AI
            </TryButton>
        </TitleBar>
    );
}
