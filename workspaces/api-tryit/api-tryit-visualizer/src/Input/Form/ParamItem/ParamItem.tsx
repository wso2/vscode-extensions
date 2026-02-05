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
import { AutoComplete, Codicon } from '@wso2/ui-toolkit';
import { TextField } from '../../../Components/TextField/TextField';

interface ParamItemProps {
    id: string;
    keyValue: string;
    value: string;
    keyItems?: string[];
    valueItems?: string[];
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
    id,
    keyValue,
    value,
    keyItems,
    valueItems,
    onKeyChange,
    onValueChange,
    onDelete
}) => {
    return (
        <ItemContainer>
            {keyItems && keyItems.length > 0 ? (
                <AutoComplete
                    identifier={`value-${keyValue}-${id}`}
                    value={keyValue}
                    onValueChange={onKeyChange}
                    items={keyItems}
                    allowItemCreate={true}
                    sx={{ flex: 1 }}
                />
            ) : (
                <TextField
                    id={`key-${keyValue}-${id}`}
                    value={keyValue}
                    onTextChange={onKeyChange}
                    placeholder="Key"
                    sx={{ flex: 1 }}
                />
            )}
            {valueItems && valueItems.length > 0 ? (
                <AutoComplete
                    identifier={`value-${value}-${id}`}
                    value={value}
                    onValueChange={onValueChange}
                    items={valueItems}
                    sx={{ flex: 1 }}
                />
            ) : (
                <TextField
                    id={`value-${keyValue}-${id}`}
                    value={value}
                    onTextChange={onValueChange}
                    placeholder="Value"
                    sx={{ flex: 1 }}
                />
            )}
            <DeleteIconWrapper onClick={onDelete}>
                <Codicon name="trash" />
            </DeleteIconWrapper>
        </ItemContainer>
    );
};
