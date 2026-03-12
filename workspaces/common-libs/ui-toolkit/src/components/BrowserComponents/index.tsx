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

import styled from '@emotion/styled';
import { ThemeColors } from '../../styles/Theme';

export const BrowserContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: ${ThemeColors.SURFACE_DIM};
`;

export const BrowserSearchContainer = styled.div`
    position: sticky;
    top: 0;
    background-color: var(--vscode-dropdown-background);
    z-index: 1;
    padding: 8px 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
`;

export const BrowserContentArea = styled.div`
    padding: 16px;
    overflow-y: auto;
    flex: 1 1 0;
`;

export const BrowserSectionContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
`;

export const BrowserSectionBody = styled.div<{ columns?: number }>`
    display: grid;
    gap: 8px;
    grid-template-columns: ${({ columns }: { columns?: number }) =>
        columns && columns > 1 ? `repeat(${columns}, minmax(0, 1fr))` : '1fr'};
`;

export const BrowserItemContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    cursor: pointer;
    border-radius: 4px;
    min-width: 0;
    overflow: hidden;
    width: 100%;
    box-sizing: border-box;
    
    &:hover {
        background-color: var(--vscode-list-hoverBackground);
    }
`;

export const BrowserItemLabel = styled.span`
    font-size: 13px;
    color: var(--vscode-editor-foreground);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
`;

export const BrowserLoaderContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
`;

export const BrowserEmptyMessage = styled.div`
    color: var(--vscode-descriptionForeground);
    font-style: italic;
    padding: 8px;
`;
