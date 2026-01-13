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
import { Codicon, TextField } from '@wso2/ui-toolkit';

interface ParamItemProps {
    keyValue: string;
    value: string;
    onKeyChange: (key: string) => void;
    onValueChange: (value: string) => void;
    onDelete: () => void;
}

const ItemContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px;
    background-color: var(--vscode-editor-background);
    // margin-bottom: 8px;
`;

const DeleteIconWrapper = styled.div`
    cursor: pointer;
    color: var(--vscode-foreground);
    opacity: 0.7;
    display: flex;
    align-items: center;
    
    &:hover {
        opacity: 1;
        color: var(--vscode-errorForeground);
    }
`;

export const ParamItem: React.FC<ParamItemProps> = ({
    keyValue,
    value,
    onKeyChange,
    onValueChange,
    onDelete
}) => {
    return (
        <ItemContainer>
            <TextField
                id={`key-${keyValue}`}
                value={keyValue}
                onTextChange={onKeyChange}
                placeholder="Key"
                sx={{ flex: 1 }}
            />
            <TextField
                id={`value-${keyValue}`}
                value={value}
                onTextChange={onValueChange}
                placeholder="Value"
                sx={{ flex: 1 }}
            />
            <DeleteIconWrapper onClick={onDelete}>
                <Codicon name="trash" />
            </DeleteIconWrapper>
        </ItemContainer>
    );
};
