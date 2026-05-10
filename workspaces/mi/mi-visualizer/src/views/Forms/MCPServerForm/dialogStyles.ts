/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import styled from '@emotion/styled';

export const DialogOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

export const DialogContent = styled.div`
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 20px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

export const DialogField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
`;

export const DialogButtonGroup = styled.div`
    display: flex;
    gap: 10px;
    justify-content: space-between;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid var(--vscode-panel-border);
`;

// Common form inputs
export const CustomInput = styled.input`
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    border: 1px solid var(--vscode-input-border);
    padding: 4px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-family: inherit;
    &:focus { outline: none; border-color: var(--vscode-focusBorder); }
`;

export const StdInput = styled.input`
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    padding: 6px 8px;
    border-radius: 3px;
    font-size: 13px;
    font-family: inherit;
    width: 100%;
    box-sizing: border-box;
    &:focus { outline: none; border-color: var(--vscode-focusBorder); }
`;

export const SchemaTextarea = styled.textarea`
    flex: 1;
    min-height: 80px;
    padding: 6px 8px;
    font-size: 12px;
    font-family: var(--vscode-editor-font-family, monospace);
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    border-radius: 3px;
    resize: vertical;
    box-sizing: border-box;
    &:focus { outline: none; border-color: var(--vscode-focusBorder); }
`;

// Common list components
export const ItemsList = styled.div`
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    max-height: 400px;
    overflow-y: auto;
    padding: 8px 0;
`;

export const ListItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    &:last-child { border-bottom: none; }
    &:hover { background: var(--vscode-list-hoverBackground); }
`;

export const ListItemHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    user-select: none;
`;

export const ItemCheckbox = styled.input`
    cursor: pointer;
    accent-color: var(--vscode-focusBorder);
    margin-top: 2px;
`;

export const SelectAllRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: var(--vscode-list-activeSelectionBackground);
    cursor: pointer;
    user-select: none;
`;

// Common layout components
export const FlexRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

export const FlexRowStart = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
`;

export const CustomInputsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: 26px;
`;

export const DialogTitle = styled.div`
    text-align: center;
    margin-bottom: 20px;
    font-size: 16px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
`;
