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
import styled from '@emotion/styled';

interface ResponseHeaderItemProps {
    keyName: string;
    value: string;
}

const ItemContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    margin-bottom: 8px;
`;

const KeyLabel = styled.div`
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    font-size: 13px;
    min-width: 150px;
    opacity: 0.9;
`;

const ValueLabel = styled.div`
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    font-size: 13px;
    flex: 1;
`;

export const ResponseHeaderItem: React.FC<ResponseHeaderItemProps> = ({
    keyName,
    value
}) => {
    return (
        <ItemContainer>
            <KeyLabel>{keyName}</KeyLabel>
            <ValueLabel>{value}</ValueLabel>
        </ItemContainer>
    );
};
