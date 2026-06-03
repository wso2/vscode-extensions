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

export const CustomInputsContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-left: 26px;
`;
